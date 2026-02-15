import { useState } from 'react';
import { Eye, FileText, ShoppingCart, Plus, Minus, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useQuoteCartContext } from '../context/QuoteCartContext';
import type { StoreProduct } from '../types';

interface Props {
  item: StoreProduct;
  onQuickView?: (item: StoreProduct) => void;
}

export function MagazaProductCard({ item, onQuickView }: Props) {
  const { addItem } = useQuoteCartContext();
  const [qty, setQty] = useState(item.min_qty || 1);

  const title = item.title_override || item.product?.urun_adi || '';
  const sku = item.product?.urun_kodu || '';
  const barcode = item.product?.barkod || '';
  const images = (item.product?.images as string[]) || [];
  const mainImage = images[0] || '';
  const stock = item.product?.mevcut_stok || 0;
  const outOfStock = stock <= 0;
  const hasPrice = item.price != null && item.price > 0;
  const category = item.category || item.product?.category || '';

  // Badge logic
  const getBadge = () => {
    if (item.badge === 'İndirim' || (item.compare_price && item.price && item.compare_price > item.price))
      return { label: 'İndirim', cls: 'bg-[hsl(38_92%_50%)] text-[hsl(215_25%_8%)]' };
    if (item.badge === 'Yeni') return { label: 'Yeni', cls: 'bg-[hsl(199_89%_48%)] text-white' };
    if (outOfStock) return { label: 'Tükendi', cls: 'bg-[hsl(0_62%_50%)] text-white' };
    if (item.badge === 'Özel') return { label: 'Özel', cls: 'bg-[hsl(270_60%_55%)] text-white' };
    return null;
  };

  const stockBadge = outOfStock
    ? { label: 'Tükendi', cls: 'bg-[hsl(0_62%_50%/0.8)] text-white' }
    : { label: 'Stokta', cls: 'bg-[hsl(142_76%_36%/0.8)] text-white' };

  const badge = getBadge();

  const handleAddQuote = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addItem({
      id: item.id,
      type: 'store',
      title,
      image: mainImage || '/placeholder.svg',
      price: item.price || undefined,
      quantity: qty,
      product_id: item.product_id,
    });
  };

  const adjustQty = (e: React.MouseEvent, delta: number) => {
    e.preventDefault();
    e.stopPropagation();
    setQty(prev => {
      let next = prev + delta * (item.order_step || 1);
      if (next < (item.min_qty || 1)) next = item.min_qty || 1;
      if (item.max_qty && next > item.max_qty) next = item.max_qty;
      return next;
    });
  };

  const handleQuickView = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onQuickView?.(item);
  };

  return (
    <div className="group relative flex flex-col rounded-xl overflow-hidden border border-[hsl(215_25%_18%)] bg-[hsl(215_25%_12%/0.6)] backdrop-blur-md transition-all duration-300 hover:border-[hsl(24_95%_53%/0.4)] hover:shadow-[0_8px_32px_-8px_hsl(24_95%_53%/0.15)] hover:-translate-y-1">
      {/* Image area */}
      <div className="relative aspect-square overflow-hidden bg-[hsl(215_25%_8%)]">
        {mainImage ? (
          <img
            src={mainImage}
            alt={title}
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-[hsl(215_25%_14%)] to-[hsl(215_25%_8%)]">
            <Package className="w-12 h-12 text-[hsl(215_15%_30%)]" />
          </div>
        )}

        {/* Status badge top-left */}
        <Badge className={`absolute top-2 left-2 ${stockBadge.cls} text-[10px] px-2 py-0.5 backdrop-blur-sm`}>
          {stockBadge.label}
        </Badge>

        {/* Promo badge (İndirim, Yeni, etc.) */}
        {badge && badge.label !== 'Tükendi' && (
          <Badge className={`absolute top-2 right-2 ${badge.cls} text-[10px] px-2 py-0.5`}>
            {badge.label}
            {item.compare_price && item.price && item.compare_price > item.price && (
              <> %{Math.round((1 - item.price / item.compare_price) * 100)}</>
            )}
          </Badge>
        )}

        {/* Category chip top-right if no promo badge */}
        {!badge && category && (
          <Badge className="absolute top-2 right-2 bg-[hsl(215_25%_18%/0.8)] text-[hsl(210_20%_75%)] text-[10px] px-2 py-0.5 backdrop-blur-sm">
            {category}
          </Badge>
        )}

        {/* Quick view overlay */}
        <button
          onClick={handleQuickView}
          className="absolute inset-0 flex items-center justify-center bg-[hsl(215_25%_8%/0.5)] opacity-0 group-hover:opacity-100 transition-opacity duration-300 cursor-pointer"
        >
          <div className="bg-[hsl(215_25%_14%/0.9)] backdrop-blur-sm rounded-full p-3 border border-[hsl(215_25%_22%)]">
            <Eye className="w-5 h-5 text-[hsl(210_20%_90%)]" />
          </div>
        </button>
      </div>

      {/* Body */}
      <div className="p-3 flex flex-col flex-1 gap-1.5">
        {/* SKU + barcode */}
        <div className="flex items-center gap-1">
          <p className="text-[10px] text-[hsl(215_15%_45%)] font-mono uppercase tracking-wider">{sku}</p>
          {barcode && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="text-[10px] text-[hsl(215_15%_35%)] cursor-help">⫶</span>
                </TooltipTrigger>
                <TooltipContent side="top" className="bg-[hsl(215_25%_14%)] text-[hsl(210_20%_90%)] border-[hsl(215_25%_22%)]">
                  <p className="font-mono text-xs">{barcode}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>

        {/* Title */}
        <h3 className="text-sm font-semibold text-[hsl(210_20%_92%)] line-clamp-2 leading-tight">{title}</h3>

        {/* Price */}
        <div className="mt-auto pt-2">
          {hasPrice ? (
            <div className="flex items-baseline gap-2">
              <span className="text-lg font-bold text-[hsl(24_95%_53%)]">
                ₺{item.price!.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
              </span>
              {item.compare_price && item.compare_price > item.price! && (
                <span className="text-xs text-[hsl(215_15%_45%)] line-through">
                  ₺{item.compare_price.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                </span>
              )}
            </div>
          ) : (
            <span className="text-sm font-semibold text-[hsl(24_95%_53%)]">Teklif Alınız</span>
          )}
        </div>

        {/* Qty + CTA */}
        <div className="flex flex-col gap-2 mt-2" onClick={e => e.preventDefault()}>
          {/* Qty stepper */}
          <div className="flex items-center border border-[hsl(215_25%_22%)] rounded-lg overflow-hidden bg-[hsl(215_25%_14%)]">
            <button onClick={e => adjustQty(e, -1)} className="px-2.5 py-1.5 hover:bg-[hsl(215_25%_18%)] transition-colors min-w-[44px] flex justify-center">
              <Minus className="w-3.5 h-3.5 text-[hsl(210_20%_70%)]" />
            </button>
            <span className="px-3 py-1.5 text-sm font-semibold min-w-[2.5rem] text-center text-[hsl(210_20%_90%)] border-x border-[hsl(215_25%_22%)]">{qty}</span>
            <button onClick={e => adjustQty(e, 1)} className="px-2.5 py-1.5 hover:bg-[hsl(215_25%_18%)] transition-colors min-w-[44px] flex justify-center">
              <Plus className="w-3.5 h-3.5 text-[hsl(210_20%_70%)]" />
            </button>
          </div>

          {/* Primary CTA */}
          {(!outOfStock && item.allow_cart !== false) ? (
            <Button
              size="sm"
              className="w-full text-xs h-9 bg-[hsl(24_95%_53%)] hover:bg-[hsl(24_95%_48%)] text-white font-semibold"
              onClick={handleAddQuote}
            >
              <ShoppingCart className="w-3.5 h-3.5 mr-1" />
              Sepete Ekle
            </Button>
          ) : (
            item.allow_quote !== false && (
              <Button
                size="sm"
                className="w-full text-xs h-9 bg-[hsl(24_95%_53%)] hover:bg-[hsl(24_95%_48%)] text-white font-semibold"
                onClick={handleAddQuote}
              >
                <FileText className="w-3.5 h-3.5 mr-1" />
                {outOfStock ? 'Talep Oluştur' : 'Teklif Al'}
              </Button>
            )
          )}

          {/* Secondary CTA */}
          {item.allow_quote !== false && !outOfStock && item.allow_cart !== false && (
            <Button
              size="sm"
              variant="outline"
              className="w-full text-xs h-9 border-[hsl(215_25%_22%)] text-[hsl(210_20%_75%)] hover:bg-[hsl(215_25%_18%)] hover:text-[hsl(210_20%_90%)]"
              onClick={handleAddQuote}
            >
              <FileText className="w-3.5 h-3.5 mr-1" />
              Teklif Al
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
