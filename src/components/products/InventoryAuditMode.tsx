import { useState, useMemo, useCallback } from 'react';
import { Product } from '@/types/stock';
import { ClipboardCheck, Check, X, AlertTriangle, ArrowRight, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface InventoryAuditModeProps {
    products: Product[];
    onComplete: () => void;
    onClose: () => void;
}

interface AuditEntry {
    productId: string;
    expectedStock: number;
    actualStock: number | null;
    status: 'pending' | 'matched' | 'discrepancy';
}

export function InventoryAuditMode({ products, onComplete, onClose }: InventoryAuditModeProps) {
    const [entries, setEntries] = useState<Map<string, AuditEntry>>(() => {
        const map = new Map<string, AuditEntry>();
        products.forEach(p => {
            map.set(p.id, {
                productId: p.id,
                expectedStock: p.mevcutStok,
                actualStock: null,
                status: 'pending',
            });
        });
        return map;
    });
    const [currentIndex, setCurrentIndex] = useState(0);
    const [inputValue, setInputValue] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const sortedProducts = useMemo(() =>
        [...products].sort((a, b) => a.rafKonum.localeCompare(b.rafKonum, 'tr')),
        [products]
    );

    const currentProduct = sortedProducts[currentIndex];
    const currentEntry = currentProduct ? entries.get(currentProduct.id) : undefined;

    const stats = useMemo(() => {
        let counted = 0, matched = 0, discrepancies = 0;
        entries.forEach(e => {
            if (e.actualStock !== null) {
                counted++;
                if (e.actualStock === e.expectedStock) matched++;
                else discrepancies++;
            }
        });
        return { counted, matched, discrepancies, total: entries.size };
    }, [entries]);

    const handleCount = useCallback(() => {
        const actual = parseInt(inputValue);
        if (isNaN(actual) || actual < 0) {
            toast.error('Geçerli bir sayı girin');
            return;
        }

        setEntries(prev => {
            const next = new Map(prev);
            const entry = next.get(currentProduct.id)!;
            next.set(currentProduct.id, {
                ...entry,
                actualStock: actual,
                status: actual === entry.expectedStock ? 'matched' : 'discrepancy',
            });
            return next;
        });

        setInputValue('');
        if (currentIndex < sortedProducts.length - 1) {
            setCurrentIndex(prev => prev + 1);
        }
    }, [inputValue, currentProduct, currentIndex, sortedProducts.length]);

    const handleSkip = () => {
        if (currentIndex < sortedProducts.length - 1) {
            setCurrentIndex(prev => prev + 1);
            setInputValue('');
        }
    };

    const handleSubmitAudit = async () => {
        setIsSubmitting(true);
        const discrepancies: { product: Product; expected: number; actual: number }[] = [];

        entries.forEach((entry, productId) => {
            if (entry.status === 'discrepancy' && entry.actualStock !== null) {
                const product = products.find(p => p.id === productId);
                if (product) {
                    discrepancies.push({
                        product,
                        expected: entry.expectedStock,
                        actual: entry.actualStock,
                    });
                }
            }
        });

        // Update stock for discrepancies
        for (const d of discrepancies) {
            const diff = d.actual - d.expected;
            try {
                // Record a stock movement for the adjustment
                await supabase.from('stock_movements').insert({
                    product_id: d.product.id,
                    movement_type: diff > 0 ? 'giris' : 'cikis',
                    quantity: Math.abs(diff),
                    movement_date: new Date().toISOString().split('T')[0],
                    handled_by: 'Envanter Sayımı',
                    notes: `Envanter sayım düzeltmesi (Beklenen: ${d.expected}, Sayılan: ${d.actual})`,
                });

                await supabase.from('products')
                    .update({ mevcut_stok: d.actual })
                    .eq('id', d.product.id);
            } catch (err) {
                console.error('Audit update error:', err);
            }
        }

        setIsSubmitting(false);
        toast.success(`Sayım tamamlandı. ${discrepancies.length} düzeltme yapıldı.`);
        onComplete();
    };

    const progress = (stats.counted / stats.total) * 100;

    return (
        <div className="fixed inset-0 z-[100] bg-background flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card">
                <div className="flex items-center gap-2.5">
                    <ClipboardCheck className="w-5 h-5 text-primary" />
                    <h2 className="text-base font-semibold">Envanter Sayımı</h2>
                </div>
                <Button variant="ghost" size="sm" onClick={onClose}>Kapat</Button>
            </div>

            {/* Progress */}
            <div className="px-4 py-2 bg-muted/30 border-b border-border">
                <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs text-muted-foreground">
                        {stats.counted} / {stats.total} sayıldı
                    </span>
                    <div className="flex items-center gap-3 text-xs">
                        <span className="flex items-center gap-1 text-success">
                            <Check className="w-3 h-3" /> {stats.matched}
                        </span>
                        <span className="flex items-center gap-1 text-destructive">
                            <AlertTriangle className="w-3 h-3" /> {stats.discrepancies}
                        </span>
                    </div>
                </div>
                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                        className="h-full rounded-full bg-primary transition-all duration-300"
                        style={{ width: `${progress}%` }}
                    />
                </div>
            </div>

            {/* Current product */}
            {currentProduct && (
                <div className="flex-1 flex flex-col items-center justify-center px-6">
                    <div className="w-full max-w-sm space-y-6">
                        {/* Product info */}
                        <div className="text-center">
                            <p className="text-xs text-muted-foreground font-mono mb-1">{currentProduct.urunKodu}</p>
                            <h3 className="text-xl font-bold text-foreground">{currentProduct.urunAdi}</h3>
                            <p className="text-sm text-muted-foreground mt-1">📍 {currentProduct.rafKonum}</p>
                        </div>

                        {/* Expected vs Count */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="bg-muted/50 rounded-xl p-4 text-center">
                                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Beklenen</p>
                                <p className="text-3xl font-bold text-foreground mt-1">{currentProduct.mevcutStok}</p>
                            </div>
                            <div className={cn(
                                'rounded-xl p-4 text-center border-2',
                                currentEntry?.status === 'matched' ? 'border-success bg-success/5' :
                                    currentEntry?.status === 'discrepancy' ? 'border-destructive bg-destructive/5' :
                                        'border-primary/20 bg-primary/5'
                            )}>
                                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Sayılan</p>
                                {currentEntry?.actualStock !== null ? (
                                    <p className="text-3xl font-bold text-foreground mt-1">{currentEntry?.actualStock}</p>
                                ) : (
                                    <Input
                                        type="number"
                                        value={inputValue}
                                        onChange={(e) => setInputValue(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleCount()}
                                        className="text-center text-2xl font-bold h-12 mt-1 border-0 bg-transparent"
                                        placeholder="—"
                                        autoFocus
                                        style={{ fontSize: '28px' }}
                                    />
                                )}
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2">
                            {currentEntry?.actualStock === null ? (
                                <>
                                    <Button onClick={handleCount} className="flex-1 gap-1.5" disabled={!inputValue}>
                                        <Check className="w-4 h-4" />
                                        Say
                                    </Button>
                                    <Button variant="outline" onClick={handleSkip} className="gap-1.5">
                                        <ArrowRight className="w-4 h-4" />
                                        Atla
                                    </Button>
                                </>
                            ) : (
                                <>
                                    <Button
                                        variant="outline"
                                        onClick={() => {
                                            setEntries(prev => {
                                                const next = new Map(prev);
                                                next.set(currentProduct.id, { ...next.get(currentProduct.id)!, actualStock: null, status: 'pending' });
                                                return next;
                                            });
                                        }}
                                        className="flex-1 gap-1.5"
                                    >
                                        <RotateCcw className="w-4 h-4" />
                                        Tekrar Say
                                    </Button>
                                    {currentIndex < sortedProducts.length - 1 && (
                                        <Button onClick={() => { setCurrentIndex(prev => prev + 1); setInputValue(''); }} className="gap-1.5">
                                            <ArrowRight className="w-4 h-4" />
                                            Sonraki
                                        </Button>
                                    )}
                                </>
                            )}
                        </div>

                        {/* Product counter */}
                        <p className="text-xs text-muted-foreground text-center">
                            Ürün {currentIndex + 1} / {sortedProducts.length}
                        </p>
                    </div>
                </div>
            )}

            {/* Footer: Submit button when all counted */}
            {stats.counted === stats.total && (
                <div className="px-4 py-4 border-t border-border bg-card">
                    <Button onClick={handleSubmitAudit} className="w-full gap-1.5" disabled={isSubmitting}>
                        <ClipboardCheck className="w-4 h-4" />
                        {isSubmitting ? 'Kaydediliyor...' : `Sayımı Tamamla (${stats.discrepancies} düzeltme)`}
                    </Button>
                </div>
            )}
        </div>
    );
}
