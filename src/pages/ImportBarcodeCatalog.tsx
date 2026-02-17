import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { Upload, CheckCircle, AlertCircle, Loader2, FileUp } from 'lucide-react';
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
  skipped: number;
  errors: number;
  total: number;
}

// --- Flexible column detection ---

function normalizeColumnName(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[_\s]+/g, ' ')
    .trim();
}

function findColumnIndex(headers: string[], possibleNames: string[]): number {
  const normalizedHeaders = headers.map(h => h ? normalizeColumnName(String(h)) : '');
  const normalizedNames = possibleNames.map(normalizeColumnName);

  for (const name of normalizedNames) {
    const idx = normalizedHeaders.indexOf(name);
    if (idx !== -1) return idx;
  }
  for (const name of normalizedNames) {
    const idx = normalizedHeaders.findIndex(h => h.startsWith(name));
    if (idx !== -1) return idx;
  }
  for (const name of normalizedNames) {
    const idx = normalizedHeaders.findIndex(h => h.includes(name));
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

  const readWorkbook = async (): Promise<XLSX.WorkBook | null> => {
    try {
      if (customFile) {
        addLog(`Dosya okunuyor: ${customFile.name}`);
        const arrayBuffer = await customFile.arrayBuffer();
        return XLSX.read(arrayBuffer, { type: 'array' });
      } else {
        addLog('Varsayılan katalog dosyası okunuyor...');
        const response = await fetch('/imports/barcode-catalog.xlsx');
        const arrayBuffer = await response.arrayBuffer();
        return XLSX.read(arrayBuffer, { type: 'array' });
      }
    } catch (err: any) {
      addLog(`Dosya okuma hatası: ${err.message}`, 'error');
      return null;
    }
  };

  const startImport = async () => {
    setImporting(true);
    setLogs([]);
    setSummary(null);
    setProgress(0);

    const stats: ImportSummary = { created: 0, updated: 0, skipped: 0, errors: 0, total: 0 };

    try {
      const workbook = await readWorkbook();
      if (!workbook) {
        setImporting(false);
        return;
      }

      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });

      if (rows.length < 2) {
        addLog('Dosyada yeterli veri bulunamadı.', 'error');
        setImporting(false);
        return;
      }

      // Detect columns flexibly
      const headerRow = rows[0].map((h: any) => String(h || ''));
      const colKullanim = findColumnIndex(headerRow, ['kullanim', 'kullanım', 'durum', 'status']);
      const colUrunKodu = findColumnIndex(headerRow, ['urun kodu', 'ürün kodu', 'product code', 'code']);
      const colUrunAdi = findColumnIndex(headerRow, ['urun adi', 'ürün adı', 'product name', 'name']);
      const colBarkod = findColumnIndex(headerRow, ['barkod', 'barcode', 'ean']);
      const colOzelKod = findColumnIndex(headerRow, ['ozel kod', 'özel kod', 'special code', 'kategori', 'category']);

      if (colUrunKodu === -1 || colUrunAdi === -1) {
        addLog('Gerekli sütunlar bulunamadı: "Ürün Kodu" ve "Ürün Adı" sütunları gerekli.', 'error');
        addLog(`Bulunan başlıklar: ${headerRow.join(', ')}`, 'info');
        setImporting(false);
        return;
      }

      addLog(`Sütunlar: Kod=${colUrunKodu}, Ad=${colUrunAdi}, Barkod=${colBarkod}, Kullanım=${colKullanim}, Kategori=${colOzelKod}`);

      const dataRows = rows.slice(1);
      addLog(`Toplam ${dataRows.length} satır bulundu.`);

      // Filter: active + has valid barcode (if kullanim column exists)
      const validRows = dataRows.filter(row => {
        if (colKullanim !== -1) {
          const kullanim = String(row[colKullanim] || '').trim();
          if (kullanim && kullanim !== 'Kullanımda') return false;
        }
        const barkod = colBarkod !== -1 ? String(row[colBarkod] || '').trim() : '';
        const urunKodu = String(row[colUrunKodu] || '').trim();
        // Must have product code; barcode is optional
        return urunKodu.length > 0 && (colBarkod === -1 || (barkod && barkod !== 'Barkod Yok' && barkod.length > 3));
      });

      stats.total = validRows.length;
      addLog(`${validRows.length} geçerli ürün filtrelendi.`);

      const batchSize = 50;
      const totalBatches = Math.ceil(validRows.length / batchSize);

      for (let i = 0; i < validRows.length; i += batchSize) {
        const batch = validRows.slice(i, i + batchSize);
        const batchNum = Math.floor(i / batchSize) + 1;

        const upsertBatch: any[] = [];

        for (const row of batch) {
          const urunKodu = String(row[colUrunKodu] || '').trim();
          const urunAdi = String(row[colUrunAdi] || '').trim();
          const barkod = colBarkod !== -1 ? String(row[colBarkod] || '').trim() : '';
          const ozelKod = colOzelKod !== -1 ? String(row[colOzelKod] || '').trim() : '';

          if (!urunKodu || !urunAdi) {
            stats.skipped++;
            continue;
          }

          upsertBatch.push({
            urun_kodu: urunKodu,
            urun_adi: urunAdi,
            barkod: barkod || null,
            raf_konum: 'Genel',
            mevcut_stok: 0,
            acilis_stok: 0,
            toplam_giris: 0,
            toplam_cikis: 0,
            min_stok: 0,
            set_stok: 0,
            uyari: false,
            category: ozelKod || null,
          });
        }

        if (upsertBatch.length > 0) {
          const { error, data } = await supabase
            .from('products')
            .upsert(upsertBatch, {
              onConflict: 'urun_kodu',
              ignoreDuplicates: false,
            })
            .select('id');

          if (error) {
            addLog(`Batch ${batchNum}: Hata - ${error.message}`, 'error');
            stats.errors += upsertBatch.length;
          } else {
            // Upsert doesn't distinguish created vs updated, count all as processed
            stats.updated += (data?.length || 0);
          }
        }

        const pct = Math.round(((i + batch.length) / validRows.length) * 100);
        setProgress(pct);

        if (batchNum % 5 === 0 || batchNum === totalBatches) {
          addLog(`Batch ${batchNum}/${totalBatches} tamamlandı (${pct}%)`, 'info');
        }
      }

      addLog(`İşlem tamamlandı!`, 'success');
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
            Barkod Kataloğu İçe Aktarma
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Excel dosyasından ürün barkodlarını veritabanına yükler. Mevcut ürünler güncellenir (upsert), yeni ürünler stok=0 ile eklenir.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="file-input">Excel Dosyası Seçin (opsiyonel)</Label>
            <div className="flex items-center gap-3">
              <Input
                id="file-input"
                type="file"
                accept=".xlsx,.xls"
                onChange={(e) => setCustomFile(e.target.files?.[0] || null)}
                className="flex-1"
              />
              {customFile && (
                <Button variant="ghost" size="sm" onClick={() => setCustomFile(null)}>
                  Temizle
                </Button>
              )}
            </div>
            {customFile ? (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <FileUp className="w-3 h-3" />
                Seçilen: {customFile.name}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                Dosya seçilmezse varsayılan katalog (barcode-catalog.xlsx) kullanılır.
              </p>
            )}
          </div>

          <Button
            onClick={startImport}
            disabled={importing}
            size="lg"
            className="w-full"
          >
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
            <Card className="border-success/30 bg-success/5">
              <CardContent className="pt-4 grid grid-cols-2 gap-3 text-sm">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-blue-500" />
                  <span>İşlenen: <strong>{summary.updated}</strong></span>
                </div>
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-muted-foreground" />
                  <span>Atlanan: <strong>{summary.skipped}</strong></span>
                </div>
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-destructive" />
                  <span>Hata: <strong>{summary.errors}</strong></span>
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
                  <div
                    key={i}
                    className={
                      log.type === 'error' ? 'text-destructive' :
                      log.type === 'success' ? 'text-success' :
                      log.type === 'warning' ? 'text-yellow-500' :
                      'text-muted-foreground'
                    }
                  >
                    {log.message}
                  </div>
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
