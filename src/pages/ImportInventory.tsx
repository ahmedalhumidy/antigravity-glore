import { useState } from 'react';
import * as XLSX from 'xlsx';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Upload, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

interface ParsedItem {
  shelf: string;
  code: string;
  name: string;
  barcode: string | null;
  adet: number;
  set: number;
}

interface AggregatedProduct {
  name: string;
  barcode: string | null;
  totalAdet: number;
  totalSet: number;
  primaryShelf: string;
}

export default function ImportInventory() {
  const [status, setStatus] = useState<'idle' | 'parsing' | 'importing' | 'done' | 'error'>('idle');
  const [progress, setProgress] = useState(0);
  const [log, setLog] = useState<string[]>([]);
  const [stats, setStats] = useState({ shelves: 0, updated: 0, created: 0, errors: 0 });

  const addLog = (msg: string) => setLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);

  const parseXlsx = async (): Promise<ParsedItem[]> => {
    addLog('Dosya indiriliyor...');
    const response = await fetch('/imports/inventory.xlsx');
    const buffer = await response.arrayBuffer();
    
    addLog('Excel dosyası ayrıştırılıyor...');
    const workbook = XLSX.read(buffer, { type: 'array' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];

    let currentShelf = 'Genel';
    const items: ParsedItem[] = [];

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length === 0) continue;

      const colA = String(row[0] || '').trim();
      const colB = String(row[1] || '').trim();
      const colC = String(row[2] || '').trim();
      const colE = row[4]; // adet
      const colF = row[5]; // set
      const colG = String(row[6] || '').trim();

      // Check if this is a shelf header (has value in colA, no code in colB)
      if (colA && !colB) {
        // Normalize shelf name: remove extra spaces
        const normalized = colA.replace(/\s+/g, '').trim();
        if (/^[A-Z]-\d+\(\d+\)$/.test(normalized) || /^[A-Z]-\d+\s*\(\d+\)$/.test(colA.trim())) {
          currentShelf = colA.replace(/\s+/g, '').trim();
          // Normalize formats like "D-5 (6)" to "D-5(6)"
          currentShelf = currentShelf.replace(/\s*\(\s*/g, '(').replace(/\s*\)\s*/g, ')');
        }
        continue;
      }

      // Check if this is a product row (has numeric code)
      if (colB && /^\d+$/.test(colB) && colC) {
        const adet = typeof colE === 'number' ? colE : parseInt(String(colE)) || 0;
        const set = typeof colF === 'number' ? colF : parseInt(String(colF)) || 0;
        
        let barcode: string | null = null;
        if (colG && colG !== 'Barkod Yok' && colG.length > 3) {
          // Clean up scientific notation barcodes
          if (colG.includes('E+') || colG.includes('e+')) {
            try {
              barcode = BigInt(Math.round(parseFloat(colG))).toString();
            } catch {
              barcode = colG;
            }
          } else {
            barcode = colG.replace(/[^0-9]/g, '');
          }
        }

        if (adet > 0 || set > 0) {
          items.push({
            shelf: currentShelf,
            code: colB,
            name: colC,
            barcode,
            adet,
            set,
          });
        }
      }
    }

    addLog(`${items.length} ürün satırı ayrıştırıldı`);
    return items;
  };

  const aggregateProducts = (items: ParsedItem[]): Map<string, AggregatedProduct> => {
    const map = new Map<string, AggregatedProduct>();

    for (const item of items) {
      const existing = map.get(item.code);
      if (existing) {
        existing.totalAdet += item.adet;
        existing.totalSet += item.set;
        if (item.barcode && !existing.barcode) {
          existing.barcode = item.barcode;
        }
      } else {
        map.set(item.code, {
          name: item.name,
          barcode: item.barcode,
          totalAdet: item.adet,
          totalSet: item.set,
          primaryShelf: item.shelf,
        });
      }
    }

    return map;
  };

  const runImport = async () => {
    setStatus('parsing');
    setLog([]);
    setProgress(0);
    setStats({ shelves: 0, updated: 0, created: 0, errors: 0 });

    try {
      // 1. Parse xlsx
      const items = await parseXlsx();
      if (items.length === 0) {
        addLog('Hiç ürün bulunamadı!');
        setStatus('error');
        return;
      }

      // 2. Extract unique shelves
      const uniqueShelves = [...new Set(items.map(i => i.shelf).filter(Boolean))];
      addLog(`${uniqueShelves.length} benzersiz raf bulundu`);

      // 3. Create shelves
      setStatus('importing');
      const { data: existingShelves } = await supabase.from('shelves').select('id, name');
      const existingShelfNames = new Set((existingShelves || []).map(s => s.name));
      
      const newShelves = uniqueShelves.filter(s => !existingShelfNames.has(s));
      if (newShelves.length > 0) {
        const { error } = await supabase.from('shelves').insert(
          newShelves.map(name => ({ name }))
        );
        if (error) {
          addLog(`Raf ekleme hatası: ${error.message}`);
        } else {
          addLog(`${newShelves.length} yeni raf oluşturuldu`);
        }
      } else {
        addLog('Tüm raflar zaten mevcut');
      }
      setStats(prev => ({ ...prev, shelves: newShelves.length }));
      setProgress(10);

      // 4. Aggregate products by code
      const productMap = aggregateProducts(items);
      addLog(`${productMap.size} benzersiz ürün kodu bulundu`);

      // 5. Get existing products
      const { data: existingProducts } = await supabase
        .from('products')
        .select('id, urun_kodu, urun_adi, barkod, mevcut_stok, set_stok, raf_konum')
        .eq('is_deleted', false);

      const existingByCode = new Map((existingProducts || []).map(p => [p.urun_kodu, p]));
      addLog(`Veritabanında ${existingByCode.size} mevcut ürün bulundu`);

      // 6. Process products
      let updated = 0;
      let created = 0;
      let errors = 0;
      const totalProducts = productMap.size;
      let processed = 0;

      // Batch process: updates
      const updateBatch: Array<{ id: string; updates: Record<string, any> }> = [];
      const insertBatch: Array<Record<string, any>> = [];

      for (const [code, data] of productMap) {
        const existing = existingByCode.get(code);

        if (existing) {
          const updates: Record<string, any> = {};
          
          // Update name if different
          if (data.name && data.name !== existing.urun_adi) {
            updates.urun_adi = data.name;
          }
          // Update barcode if we have one and it's different
          if (data.barcode && data.barcode !== existing.barkod) {
            updates.barkod = data.barcode;
          }
          // Update stock
          updates.mevcut_stok = data.totalAdet;
          updates.set_stok = data.totalSet;
          updates.raf_konum = data.primaryShelf;

          updateBatch.push({ id: existing.id, updates });
        } else {
          insertBatch.push({
            urun_kodu: code,
            urun_adi: data.name,
            barkod: data.barcode,
            raf_konum: data.primaryShelf,
            mevcut_stok: data.totalAdet,
            acilis_stok: 0,
            toplam_giris: 0,
            toplam_cikis: 0,
            set_stok: data.totalSet,
            min_stok: 0,
            uyari: false,
          });
        }
      }

      // Execute updates
      addLog(`${updateBatch.length} ürün güncellenecek...`);
      for (let i = 0; i < updateBatch.length; i++) {
        const { id, updates } = updateBatch[i];
        const { error } = await supabase.from('products').update(updates).eq('id', id);
        if (error) {
          errors++;
          if (errors <= 5) addLog(`Güncelleme hatası (${id}): ${error.message}`);
        } else {
          updated++;
        }
        processed++;
        setProgress(10 + Math.round((processed / totalProducts) * 80));
      }

      // Execute inserts in batches of 50
      addLog(`${insertBatch.length} yeni ürün eklenecek...`);
      for (let i = 0; i < insertBatch.length; i += 50) {
        const batch = insertBatch.slice(i, i + 50);
        const { error } = await supabase.from('products').insert(batch as any);
        if (error) {
          errors += batch.length;
          addLog(`Ekleme hatası: ${error.message}`);
        } else {
          created += batch.length;
        }
        processed += batch.length;
        setProgress(10 + Math.round((processed / totalProducts) * 80));
      }

      setProgress(100);
      setStats({ shelves: newShelves.length, updated, created, errors });
      addLog(`İşlem tamamlandı! ${updated} güncellendi, ${created} eklendi, ${errors} hata`);
      setStatus('done');
    } catch (err: any) {
      addLog(`Kritik hata: ${err.message}`);
      setStatus('error');
    }
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5" />
              Envanter İçe Aktarma
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Bu işlem Excel dosyasından rafları oluşturur, yeni ürünleri ekler, mevcut ürünlerin
              isimlerini, barkodlarını ve stok miktarlarını günceller.
            </p>

            <Button
              onClick={runImport}
              disabled={status === 'parsing' || status === 'importing'}
              className="w-full"
              size="lg"
            >
              {status === 'parsing' || status === 'importing' ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> İşleniyor...</>
              ) : status === 'done' ? (
                <><CheckCircle className="w-4 h-4 mr-2" /> Tekrar Çalıştır</>
              ) : (
                <><Upload className="w-4 h-4 mr-2" /> İçe Aktarmayı Başlat</>
              )}
            </Button>

            {(status === 'parsing' || status === 'importing') && (
              <Progress value={progress} className="w-full" />
            )}

            {status === 'done' && (
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="p-3 bg-green-50 dark:bg-green-950 rounded-lg">
                  <div className="font-bold text-green-700 dark:text-green-400">{stats.shelves}</div>
                  <div className="text-muted-foreground">Yeni Raf</div>
                </div>
                <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
                  <div className="font-bold text-blue-700 dark:text-blue-400">{stats.updated}</div>
                  <div className="text-muted-foreground">Güncellenen</div>
                </div>
                <div className="p-3 bg-purple-50 dark:bg-purple-950 rounded-lg">
                  <div className="font-bold text-purple-700 dark:text-purple-400">{stats.created}</div>
                  <div className="text-muted-foreground">Yeni Ürün</div>
                </div>
                <div className="p-3 bg-red-50 dark:bg-red-950 rounded-lg">
                  <div className="font-bold text-red-700 dark:text-red-400">{stats.errors}</div>
                  <div className="text-muted-foreground">Hata</div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {log.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">İşlem Günlüğü</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-muted rounded-lg p-3 max-h-80 overflow-y-auto font-mono text-xs space-y-0.5">
                {log.map((line, i) => (
                  <div key={i} className={line.includes('hata') || line.includes('Hata') ? 'text-red-500' : ''}>
                    {line}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}