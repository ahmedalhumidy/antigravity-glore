import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { Upload, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
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

export default function ImportBarcodeCatalog() {
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState<ImportLog[]>([]);
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const logEndRef = useRef<HTMLDivElement>(null);

  const addLog = (message: string, type: ImportLog['type'] = 'info') => {
    setLogs(prev => [...prev, { message, type }]);
  };

  const startImport = async () => {
    setImporting(true);
    setLogs([]);
    setSummary(null);
    setProgress(0);

    const stats: ImportSummary = { created: 0, updated: 0, skipped: 0, errors: 0, total: 0 };

    try {
      addLog('Excel dosyası okunuyor...');
      const response = await fetch('/imports/barcode-catalog.xlsx');
      const arrayBuffer = await response.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });

      // Skip header row
      const dataRows = rows.slice(1);
      addLog(`Toplam ${dataRows.length} satır bulundu.`);

      // Filter: active + has valid barcode
      const validRows = dataRows.filter(row => {
        const kullanim = String(row[0] || '').trim();
        const barkod = String(row[3] || '').trim();
        return kullanim === 'Kullanımda' && barkod && barkod !== 'Barkod Yok' && barkod.length > 3;
      });

      stats.total = validRows.length;
      addLog(`${validRows.length} aktif ve barkodlu ürün filtrelendi.`);

      // Fetch existing product codes for matching
      addLog('Mevcut ürünler kontrol ediliyor...');
      const { data: existingProducts } = await supabase
        .from('products')
        .select('id, urun_kodu, barkod')
        .eq('is_deleted', false);

      const existingMap = new Map<string, { id: string; barkod: string | null }>();
      (existingProducts || []).forEach(p => {
        existingMap.set(p.urun_kodu, { id: p.id, barkod: p.barkod });
      });

      addLog(`Veritabanında ${existingMap.size} mevcut ürün bulundu.`);

      // Process in batches
      const batchSize = 50;
      const totalBatches = Math.ceil(validRows.length / batchSize);

      for (let i = 0; i < validRows.length; i += batchSize) {
        const batch = validRows.slice(i, i + batchSize);
        const batchNum = Math.floor(i / batchSize) + 1;

        const toInsert: any[] = [];
        const toUpdate: { id: string; barkod: string }[] = [];

        for (const row of batch) {
          const urunKodu = String(row[1] || '').trim();
          const urunAdi = String(row[2] || '').trim();
          const barkod = String(row[3] || '').trim();
          const anaBirim = String(row[8] || '').trim();
          // Price not needed - skip to avoid numeric overflow
          const ozelKod = String(row[13] || '').trim();

          if (!urunKodu || !urunAdi) {
            stats.skipped++;
            continue;
          }

          const existing = existingMap.get(urunKodu);

          if (existing) {
            // Update barcode if different
            if (existing.barkod !== barkod) {
              toUpdate.push({ id: existing.id, barkod });
              stats.updated++;
            } else {
              stats.skipped++;
            }
          } else {
            toInsert.push({
              urun_kodu: urunKodu,
              urun_adi: urunAdi,
              barkod: barkod,
              raf_konum: 'Genel',
              mevcut_stok: 0,
              acilis_stok: 0,
              toplam_giris: 0,
              toplam_cikis: 0,
              min_stok: 0,
              set_stok: 0,
              uyari: false,
              category: ozelKod || null,
              sale_price: null,
            });
            stats.created++;
          }
        }

        // Execute batch inserts
        if (toInsert.length > 0) {
          const { error } = await supabase.from('products').insert(toInsert);
          if (error) {
            addLog(`Batch ${batchNum}: Ekleme hatası - ${error.message}`, 'error');
            stats.errors += toInsert.length;
            stats.created -= toInsert.length;
          }
        }

        // Execute batch updates
        for (const upd of toUpdate) {
          const { error } = await supabase
            .from('products')
            .update({ barkod: upd.barkod })
            .eq('id', upd.id);
          if (error) {
            stats.errors++;
            stats.updated--;
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
            Excel dosyasından ürün barkodlarını veritabanına yükler. Mevcut ürünlerin barkodları güncellenir, yeni ürünler stok=0 ile eklenir.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
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
                  <CheckCircle className="w-4 h-4 text-success" />
                  <span>Eklenen: <strong>{summary.created}</strong></span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-blue-500" />
                  <span>Güncellenen: <strong>{summary.updated}</strong></span>
                </div>
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-muted-foreground" />
                  <span>Atlanan: <strong>{summary.skipped}</strong></span>
                </div>
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-destructive" />
                  <span>Hata: <strong>{summary.errors}</strong></span>
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
