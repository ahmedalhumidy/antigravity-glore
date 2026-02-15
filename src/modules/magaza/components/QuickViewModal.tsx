import { useState } from 'react';
import { X, Minus, Plus, FileText, ShoppingCart, Package } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useQuoteCartContext } from '../context/QuoteCartContext';
import type { StoreProduct } from '../types';

interface Props {
  item: StoreProduct | null;
  open: boolean;
  onClose: () => void;
}

export function QuickViewModal({ item, open, onClose }: Props) {
  const { addItem } = useQuoteCartContext();
  const [qty, setQty] = useState(1);

  if (!item) return null;

  const title = item.title_override || item.product?.urun_adi || '';
  const sku = item.product?.urun_kodu || '';
  const desc = item.description_override || item.product?.product_description || '';
  const images = (item.product?.images as string[]) || [];
  const mainImage = images[0] || '';
  const stock = item.product?.mevcut_stok || 0;
  const outOfStock = stock <= 0;
  const hasPrice = item.price != null && item.price > 0;

  const adjustQty = (delta: number) => {
    setQty(prev => {
      let next = prev + delta * (item.order_step || 1);
      if (next < (item.min_qty || 1)) next = item.min_qty || 1;
      if (item.max_qty && next > item.max_qty) next = item.max_qty;
      return next;
    });
  };

  const handleAddQuote = () => {
    addItem({
      id: item.id,
      type: 'store',
      title,
      image: mainImage || '/placeholder.svg',
      price: item.price || undefined,
      quantity: qty,
      product_id: item.product_id,
    });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden bg-[hsl(215_25%_10%)] border-[hsl(215_25%_18%)] text-[hsl(210_20%_95%)]">
        <DialogTitle className="sr-only">{title}</DialogTitle>
        <div className="grid grid-cols-1 sm:grid-cols-2">
          {/* Image */}
          <div className="aspect-square bg-[hsl(215_25%_8%)] flex items-center justify-center overflow-hidden">
            {mainImage ? (
              <img src={mainImage} alt={title} className="w-full h-full object-cover" />
            ) : (
              <div className="flex flex-col items-center gap-2 text-[hsl(215_15%_40%)]">
                <Package className="w-16 h-16" />
                <span className="text-sm">Görsel Yok</span>
              </div>
            )}
          </div>

          {/* Details */}
          <div className="p-6 flex flex-col gap-4">
            <div>
              <p className="text-xs text-[hsl(215_15%_50%)] font-mono uppercase tracking-wider mb-1">{sku}</p>
              <h2 className="text-xl font-bold leading-tight">{title}</h2>
            </div>

            {desc && <p className="text-sm text-[hsl(215_15%_55%)] line-clamp-3">{desc}</p>}

            {/* Stock */}
            <div>
              {outOfStock ? (
                <Badge className="bg-[hsl(0_62%_50%)] text-white text-xs">Tükendi</Badge>
              ) : (
                <Badge className="bg-[hsl(142_76%_36%)] text-white text-xs">Stokta</Badge>
              )}
            </div>

            {/* Price */}
            <div>
              {hasPrice ? (
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-[hsl(24_95%_53%)]">
                    ₺{item.price!.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                  </span>
                  {item.compare_price && item.compare_price > item.price! && (
                    <span className="text-sm text-[hsl(215_15%_45%)] line-through">
                      ₺{item.compare_price.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                    </span>
                  )}
                </div>
              ) : (
                <span className="text-lg font-semibold text-[hsl(24_95%_53%)]">Teklif Alınız</span>
              )}
            </div>

            {/* Qty */}
            <div className="flex items-center gap-3">
              <div className="flex items-center border border-[hsl(215_25%_22%)] rounded-lg overflow-hidden bg-[hsl(215_25%_14%)]">
                <button onClick={() => adjustQty(-1)} className="px-3 py-2 hover:bg-[hsl(215_25%_18%)] transition-colors min-w-[44px] flex justify-center">
                  <Minus className="w-4 h-4" />
                </button>
                <span className="px-4 py-2 text-sm font-semibold min-w-[3rem] text-center border-x border-[hsl(215_25%_22%)]">{qty}</span>
                <button onClick={() => adjustQty(1)} className="px-3 py-2 hover:bg-[hsl(215_25%_18%)] transition-colors min-w-[44px] flex justify-center">
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* CTAs */}
            <div className="flex flex-col gap-2 mt-auto">
              {(!outOfStock && item.allow_cart !== false) ? (
                <Button onClick={handleAddQuote} className="w-full h-11 bg-[hsl(24_95%_53%)] hover:bg-[hsl(24_95%_48%)] text-white font-semibold">
                  <ShoppingCart className="w-4 h-4 mr-2" />
                  Sepete Ekle
                </Button>
              ) : (
                item.allow_quote !== false && (
                  <Button onClick={handleAddQuote} className="w-full h-11 bg-[hsl(24_95%_53%)] hover:bg-[hsl(24_95%_48%)] text-white font-semibold">
                    <FileText className="w-4 h-4 mr-2" />
                    {outOfStock ? 'Talep Oluştur' : 'Teklif Al'}
                  </Button>
                )
              )}
              {item.allow_quote !== false && !outOfStock && item.allow_cart !== false && (
                <Button onClick={handleAddQuote} variant="outline" className="w-full h-11 border-[hsl(215_25%_22%)] text-[hsl(210_20%_85%)] hover:bg-[hsl(215_25%_18%)]">
                  <FileText className="w-4 h-4 mr-2" />
                  Teklif Al
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
