import { useState, useCallback, useRef } from 'react';
import * as XLSX from 'xlsx';
import { Upload, FileSpreadsheet, AlertTriangle, CheckCircle, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface BulkImportModalProps {
    open: boolean;
    onClose: () => void;
    onComplete: () => void;
}

interface ImportRow {
    urunKodu: string;
    urunAdi: string;
    barkod?: string;
    rafKonum: string;
    acilisStok: number;
    minStok: number;
    not?: string;
}

interface ImportResult {
    total: number;
    success: number;
    errors: { row: number; error: string }[];
}

const TEMPLATE_COLUMNS = [
    'Ürün Kodu',
    'Ürün Adı',
    'Barkod',
    'Raf Konum',
    'Açılış Stok',
    'Min Stok',
    'Not',
];

export function BulkImportModal({ open, onClose, onComplete }: BulkImportModalProps) {
    const [step, setStep] = useState<'upload' | 'preview' | 'importing' | 'done'>('upload');
    const [rows, setRows] = useState<ImportRow[]>([]);
    const [result, setResult] = useState<ImportResult | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const fileRef = useRef<HTMLInputElement>(null);

    const parseFile = useCallback((file: File) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target?.result as ArrayBuffer);
                const workbook = XLSX.read(data, { type: 'array' });
                const sheet = workbook.Sheets[workbook.SheetNames[0]];
                const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);

                const parsed: ImportRow[] = json.map((row) => ({
                    urunKodu: String(row['Ürün Kodu'] || row['urunKodu'] || ''),
                    urunAdi: String(row['Ürün Adı'] || row['urunAdi'] || ''),
                    barkod: row['Barkod'] || row['barkod'] ? String(row['Barkod'] || row['barkod']) : undefined,
                    rafKonum: String(row['Raf Konum'] || row['rafKonum'] || 'Genel'),
                    acilisStok: Number(row['Açılış Stok'] || row['acilisStok'] || 0),
                    minStok: Number(row['Min Stok'] || row['minStok'] || 5),
                    not: row['Not'] || row['not'] ? String(row['Not'] || row['not']) : undefined,
                })).filter(r => r.urunKodu && r.urunAdi);

                if (parsed.length === 0) {
                    toast.error('Dosyada geçerli ürün bulunamadı');
                    return;
                }

                setRows(parsed);
                setStep('preview');
            } catch (err) {
                toast.error('Dosya okunamadı. Lütfen geçerli bir Excel/CSV dosyası yükleyin.');
            }
        };
        reader.readAsArrayBuffer(file);
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files[0];
        if (file) parseFile(file);
    }, [parseFile]);

    const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) parseFile(file);
    }, [parseFile]);

    const handleImport = async () => {
        setStep('importing');
        const errors: { row: number; error: string }[] = [];
        let success = 0;

        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            try {
                const { error } = await supabase.from('products').insert({
                    urun_kodu: row.urunKodu,
                    urun_adi: row.urunAdi,
                    barkod: row.barkod || null,
                    raf_konum: row.rafKonum,
                    acilis_stok: row.acilisStok,
                    mevcut_stok: row.acilisStok,
                    min_stok: row.minStok,
                    toplam_giris: 0,
                    toplam_cikis: 0,
                    not: row.not || null,
                });
                if (error) throw error;
                success++;
            } catch (err: any) {
                errors.push({
                    row: i + 2,
                    error: err.message?.includes('duplicate')
                        ? `${row.urunKodu} zaten mevcut`
                        : err.message || 'Bilinmeyen hata',
                });
            }
        }

        setResult({ total: rows.length, success, errors });
        setStep('done');
        if (success > 0) onComplete();
    };

    const downloadTemplate = () => {
        const ws = XLSX.utils.aoa_to_sheet([
            TEMPLATE_COLUMNS,
            ['URN-001', 'Örnek Ürün', '8690000000001', 'A-01', 100, 10, 'Açıklama'],
        ]);
        ws['!cols'] = TEMPLATE_COLUMNS.map(() => ({ wch: 18 }));
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Ürünler');
        XLSX.writeFile(wb, 'urun-import-sablonu.xlsx');
    };

    const handleClose = () => {
        setStep('upload');
        setRows([]);
        setResult(null);
        onClose();
    };

    if (!open) return null;

    return (
        <>
            <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm animate-fade-in" onClick={handleClose} />
            <div className="fixed inset-0 z-[101] flex items-center justify-center p-4 pointer-events-none">
                <div className="pointer-events-auto w-full max-w-xl bg-card border border-border rounded-2xl shadow-2xl animate-slide-up overflow-hidden">
                    {/* Header */}
                    <div className="flex items-center justify-between px-6 py-4 border-b border-border">
                        <div className="flex items-center gap-2.5">
                            <div className="p-1.5 rounded-lg bg-primary/10">
                                <FileSpreadsheet className="w-4 h-4 text-primary" />
                            </div>
                            <h2 className="text-base font-semibold">Toplu Ürün İçe Aktarma</h2>
                        </div>
                        <button onClick={handleClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
                            <X className="w-4 h-4 text-muted-foreground" />
                        </button>
                    </div>

                    <div className="p-6">
                        {step === 'upload' && (
                            <div className="space-y-4">
                                <div
                                    className={cn(
                                        'border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer',
                                        isDragging ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                                    )}
                                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                                    onDragLeave={() => setIsDragging(false)}
                                    onDrop={handleDrop}
                                    onClick={() => fileRef.current?.click()}
                                >
                                    <Upload className="w-10 h-10 text-muted-foreground/50 mx-auto mb-3" />
                                    <p className="text-sm font-medium text-foreground">
                                        Dosyayı sürükleyip bırakın veya tıklayın
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Excel (.xlsx, .xls) veya CSV formatı desteklenir
                                    </p>
                                    <input
                                        ref={fileRef}
                                        type="file"
                                        accept=".xlsx,.xls,.csv"
                                        className="hidden"
                                        onChange={handleFileChange}
                                    />
                                </div>
                                <Button variant="outline" size="sm" onClick={downloadTemplate} className="w-full gap-1.5">
                                    <FileSpreadsheet className="w-4 h-4" />
                                    Şablon İndir
                                </Button>
                            </div>
                        )}

                        {step === 'preview' && (
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <p className="text-sm font-medium">{rows.length} ürün bulundu</p>
                                    <Button variant="ghost" size="sm" onClick={() => setStep('upload')}>Geri</Button>
                                </div>
                                <div className="max-h-64 overflow-auto rounded-lg border border-border">
                                    <table className="w-full text-xs">
                                        <thead>
                                            <tr className="bg-muted/50 border-b border-border">
                                                <th className="text-left px-3 py-2 font-medium">#</th>
                                                <th className="text-left px-3 py-2 font-medium">Kod</th>
                                                <th className="text-left px-3 py-2 font-medium">Ürün Adı</th>
                                                <th className="text-right px-3 py-2 font-medium">Stok</th>
                                                <th className="text-left px-3 py-2 font-medium">Raf</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {rows.slice(0, 50).map((r, i) => (
                                                <tr key={i} className="border-b border-border last:border-0">
                                                    <td className="px-3 py-1.5 text-muted-foreground">{i + 1}</td>
                                                    <td className="px-3 py-1.5 font-mono">{r.urunKodu}</td>
                                                    <td className="px-3 py-1.5">{r.urunAdi}</td>
                                                    <td className="px-3 py-1.5 text-right">{r.acilisStok}</td>
                                                    <td className="px-3 py-1.5">{r.rafKonum}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                    {rows.length > 50 && (
                                        <p className="text-center text-xs text-muted-foreground py-2">
                                            ... ve {rows.length - 50} ürün daha
                                        </p>
                                    )}
                                </div>
                                <Button onClick={handleImport} className="w-full gap-1.5">
                                    <Upload className="w-4 h-4" />
                                    {rows.length} Ürünü İçe Aktar
                                </Button>
                            </div>
                        )}

                        {step === 'importing' && (
                            <div className="flex flex-col items-center gap-4 py-8">
                                <Loader2 className="w-8 h-8 text-primary animate-spin" />
                                <p className="text-sm text-muted-foreground">Ürünler içe aktarılıyor...</p>
                            </div>
                        )}

                        {step === 'done' && result && (
                            <div className="space-y-4">
                                <div className="flex flex-col items-center gap-3 py-4">
                                    {result.errors.length === 0 ? (
                                        <CheckCircle className="w-12 h-12 text-success" />
                                    ) : (
                                        <AlertTriangle className="w-12 h-12 text-warning" />
                                    )}
                                    <div className="text-center">
                                        <p className="font-semibold text-foreground">
                                            {result.success} / {result.total} ürün başarıyla eklendi
                                        </p>
                                        {result.errors.length > 0 && (
                                            <p className="text-sm text-muted-foreground mt-1">
                                                {result.errors.length} hata oluştu
                                            </p>
                                        )}
                                    </div>
                                </div>
                                {result.errors.length > 0 && (
                                    <div className="max-h-32 overflow-auto rounded-lg border border-destructive/20 bg-destructive/5 p-3">
                                        {result.errors.map((err, i) => (
                                            <p key={i} className="text-xs text-destructive">
                                                Satır {err.row}: {err.error}
                                            </p>
                                        ))}
                                    </div>
                                )}
                                <Button onClick={handleClose} className="w-full">Kapat</Button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}
