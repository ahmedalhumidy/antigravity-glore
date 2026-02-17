import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { Upload, CheckCircle, AlertCircle, Loader2, FileUp, XCircle } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import * as XLSX from 'xlsx';

interface ImportLog {
  message: string;
  type: 'info' | 'success' | 'error' | 'warning';
}

interface ImportSummary {
  created: number;
  updated: number;
  duplicateBarcodes: number;
  invalidBarcodes: number;
  movedBarcodes: number;
  total: number;
}

function normalizeColumnName(name: string): string {
  return name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[_\s]+/g, ' ').trim();
}

function findColumnIndex(headers: string[], possibleNames: string[]): number {
  const normalized = headers.map(h => h ? normalizeColumnName(String(h)) : '');
  const targets = possibleNames.map(normalizeColumnName);
  for (const t of targets) {
    const idx = normalized.indexOf(t);
    if (idx !== -1) return idx;
  }
  for (const t of targets) {
    const idx = normalized.findIndex(h => h.includes(t));
    if (idx !== -1) return idx;
  }
  return -1;
}

export default function ImportBarcodeCatalog() {
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState<ImportLog[]>([]);
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [customFile, setCustomFile] = useState<File | null>(null);
  const logEndRef = useRef<HTMLDivElement>(null);

  const addLog = (message: string, type: ImportLog['type'] = 'info') => {
    setLogs(prev => [...prev, { message, type }]);
  };

  const startImport = async () => {
    if (!customFile) return;
    setImporting(true);
    setLogs([]);
    setSummary(null);
    setProgress(0);

    const stats: ImportSummary = { created: 0, updated: 0, duplicateBarcodes: 0, invalidBarcodes: 0, movedBarcodes: 0, total: 0 };

    try {
      addLog(`Dosya okunuyor: ${customFile.name}`);
      const arrayBuffer = await customFile.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });

      if (rows.length < 2) {
        addLog('Dosyada yeterli veri bulunamadı.', 'error');
        setImporting(false);
        return;
      }

      const headerRow = rows[0].map((h: any) => String(h || ''));
      const colKodu = findColumnIndex(headerRow, ['urun kodu', 'ürün kodu', 'product code', 'code']);
      const colAdi = findColumnIndex(headerRow, ['urun adi', 'ürün adı', 'product name', 'name']);
      const colBarkod = findColumnIndex(headerRow, ['barkod', 'barcode', 'ean']);

      if (colKodu === -1 || colAdi === -1) {
        addLog('Gerekli sütunlar bulunamadı: "Ürün Kodu" ve "Ürün Adı" sütunları gerekli.', 'error');
        addLog(`Bulunan başlıklar: ${headerRow.join(', ')}`, 'info');
        setImporting(false);
        return;
      }

      addLog(`Sütunlar tespit edildi → Kod: ${colKodu}, Ad: ${colAdi}, Barkod: ${colBarkod >= 0 ? colBarkod : 'yok'}`);

      // Parse all rows
      const dataRows = rows.slice(1);
      const seenBarcodes = new Map<string, number>();
      const validItems: { urunKodu: string; urunAdi: string; barkod: string | null }[] = [];

      for (let i = 0; i < dataRows.length; i++) {
        const row = dataRows[i];
        const urunKodu = String(row[colKodu] || '').trim();
        const urunAdi = String(row[colAdi] || '').trim();
        let barkod = colBarkod >= 0 ? String(row[colBarkod] || '').trim() : '';

        if (!urunKodu || !urunAdi) continue;

        // Validate barcode
        if (barkod && (barkod === 'Barkod Yok' || barkod.length < 4)) {
          stats.invalidBarcodes++;
          barkod = '';
        }

        // Check duplicate barcodes within file
        if (barkod) {
          if (seenBarcodes.has(barkod)) {
            stats.duplicateBarcodes++;
            addLog(`Satır ${i + 2}: Tekrar barkod "${barkod}" → barkod atlandı`, 'warning');
            barkod = '';
          } else {
            seenBarcodes.set(barkod, i);
          }
        }

        validItems.push({ urunKodu, urunAdi, barkod: barkod || null });
      }

      stats.total = validItems.length;
      addLog(`${validItems.length} geçerli ürün bulundu.`);

      // Fetch existing product codes to distinguish create vs update
      const existingCodes = new Set<string>();
      let from = 0;
      while (true) {
        const { data } = await supabase
          .from('products')
          .select('urun_kodu')
          .eq('is_deleted', false)
          .range(from, from + 999);
        if (!data || data.length === 0) break;
        data.forEach(p => existingCodes.add(p.urun_kodu));
        if (data.length < 1000) break;
        from += 1000;
      }

      // Fetch existing barcode→product_code mapping to detect barcode conflicts
      const existingBarcodeMap = new Map<string, string>(); // barcode → urun_kodu
      from = 0;
      while (true) {
        const { data } = await supabase
          .from('products')
          .select('urun_kodu, barkod')
          .eq('is_deleted', false)
          .not('barkod', 'is', null)
          .range(from, from + 999);
        if (!data || data.length === 0) break;
        data.forEach(p => {
          if (p.barkod) existingBarcodeMap.set(p.barkod, p.urun_kodu);
        });
        if (data.length < 1000) break;
        from += 1000;
      }

      addLog(`Mevcut ${existingCodes.size} ürün ve ${existingBarcodeMap.size} barkod tespit edildi.`);

      // Phase 1: Clear barcodes that need to move to a different product
      const barcodesToMove: { barcode: string; fromKodu: string; toKodu: string }[] = [];
      for (const item of validItems) {
        if (!item.barkod) continue;
        const currentOwner = existingBarcodeMap.get(item.barkod);
        if (currentOwner && currentOwner !== item.urunKodu) {
          barcodesToMove.push({ barcode: item.barkod, fromKodu: currentOwner, toKodu: item.urunKodu });
        }
      }

      if (barcodesToMove.length > 0) {
        addLog(`${barcodesToMove.length} barkod başka ürünlerden taşınacak...`, 'warning');
        // Clear barcodes from old owners in batches
        const moveBatchSize = 50;
        for (let i = 0; i < barcodesToMove.length; i += moveBatchSize) {
          const batch = barcodesToMove.slice(i, i + moveBatchSize);
          const kodusToClean = batch.map(b => b.fromKodu);
          const { error } = await supabase
            .from('products')
            .update({ barkod: null })
            .in('urun_kodu', kodusToClean)
            .eq('is_deleted', false);
          if (error) {
            addLog(`Barkod taşıma hatası: ${error.message}`, 'error');
          } else {
            stats.movedBarcodes += batch.length;
            for (const b of batch) {
              addLog(`Barkod "${b.barcode}": ${b.fromKodu} → ${b.toKodu}`, 'info');
            }
          }
        }
      }

      // Phase 2: Batch upsert using ON CONFLICT (urun_kodu)
      const batchSize = 50;
      const totalBatches = Math.ceil(validItems.length / batchSize);

      for (let i = 0; i < validItems.length; i += batchSize) {
        const batch = validItems.slice(i, i + batchSize);
        const batchNum = Math.floor(i / batchSize) + 1;

        const upsertBatch = batch.map(item => ({
          urun_kodu: item.urunKodu,
          urun_adi: item.urunAdi,
          barkod: item.barkod,
          raf_konum: 'Genel',
          mevcut_stok: 0,
          acilis_stok: 0,
          toplam_giris: 0,
          toplam_cikis: 0,
          min_stok: 0,
          set_stok: 0,
          uyari: false,
        }));

        // Count creates vs updates
        for (const item of batch) {
          if (existingCodes.has(item.urunKodu)) {
            stats.updated++;
          } else {
            stats.created++;
            existingCodes.add(item.urunKodu);
          }
        }

        const { error } = await supabase
          .from('products')
          .upsert(upsertBatch, { onConflict: 'urun_kodu', ignoreDuplicates: false })
          .select('id');

        if (error) {
          addLog(`Batch ${batchNum}: Hata - ${error.message}`, 'error');
        }

        const pct = Math.round(((i + batch.length) / validItems.length) * 100);
        setProgress(pct);

        if (batchNum % 5 === 0 || batchNum === totalBatches) {
          addLog(`Batch ${batchNum}/${totalBatches} tamamlandı (${pct}%)`, 'info');
        }
      }

      addLog('İşlem tamamlandı!', 'success');
      setSummary(stats);
    } catch (err: any) {
      addLog(`Kritik hata: ${err.message}`, 'error');
    } finally {
      setImporting(false);
      setProgress(100);
    }
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8 max-w-3xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Ürün Kataloğu İçe Aktarma
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Excel dosyasından ürün kataloğunu yükler. Sadece ürün kodu, adı ve barkod aktarılır. Stok veya raf kaydı oluşturulmaz.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="file-input">Excel Dosyası Seçin</Label>
            <div className="flex items-center gap-3">
              <Input
                id="file-input"
                type="file"
                accept=".xlsx,.xls"
                onChange={(e) => setCustomFile(e.target.files?.[0] || null)}
                className="flex-1"
              />
              {customFile && (
                <Button variant="ghost" size="sm" onClick={() => setCustomFile(null)}>Temizle</Button>
              )}
            </div>
            {customFile && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <FileUp className="w-3 h-3" /> {customFile.name}
              </p>
            )}
          </div>

          <Button onClick={startImport} disabled={importing || !customFile} size="lg" className="w-full">
            {importing ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> İçe aktarılıyor...</>
            ) : (
              <><Upload className="w-4 h-4" /> Kataloğu İçe Aktar</>
            )}
          </Button>

          {(importing || progress > 0) && (
            <div className="space-y-1">
              <Progress value={progress} className="h-3" />
              <p className="text-xs text-muted-foreground text-right">{progress}%</p>
            </div>
          )}

          {summary && (
            <Card className="border-primary/30 bg-primary/5">
              <CardContent className="pt-4 grid grid-cols-2 gap-3 text-sm">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span>Yeni eklenen: <strong>{summary.created}</strong></span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-blue-500" />
                  <span>Güncellenen: <strong>{summary.updated}</strong></span>
                </div>
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-yellow-500" />
                  <span>Tekrar barkod: <strong>{summary.duplicateBarcodes}</strong></span>
                </div>
                <div className="flex items-center gap-2">
                  <XCircle className="w-4 h-4 text-destructive" />
                  <span>Geçersiz barkod: <strong>{summary.invalidBarcodes}</strong></span>
                </div>
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-orange-500" />
                  <span>Taşınan barkod: <strong>{summary.movedBarcodes}</strong></span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-muted-foreground" />
                  <span>Toplam: <strong>{summary.total}</strong></span>
                </div>
              </CardContent>
            </Card>
          )}

          {logs.length > 0 && (
            <ScrollArea className="h-48 border rounded-md p-3 bg-muted/30">
              <div className="space-y-1 text-xs font-mono">
                {logs.map((log, i) => (
                  <div key={i} className={
                    log.type === 'error' ? 'text-destructive' :
                    log.type === 'success' ? 'text-green-600' :
                    log.type === 'warning' ? 'text-yellow-500' :
                    'text-muted-foreground'
                  }>{log.message}</div>
                ))}
                <div ref={logEndRef} />
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
