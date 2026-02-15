import { Package, ShoppingCart } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useQuoteCartContext } from '../context/QuoteCartContext';
import type { StoreProduct } from '../types';

interface Props {
  item: StoreProduct;
  onQuickView?: (item: StoreProduct) => void;
}

export function MagazaProductCard({ item, onQuickView }: Props) {
  const { addItem } = useQuoteCartContext();

  const title = item.title_override || item.product?.urun_adi || '';
  const sku = item.product?.urun_kodu || '';
  const images = (item.product?.images as string[]) || [];
  const mainImage = images[0] || '';
  const stock = item.product?.mevcut_stok || 0;
  const outOfStock = stock <= 0;
  const category = item.category || item.product?.category || 'Kategorisiz';

  // Status badge
  const getStatusBadge = () => {
    if (outOfStock) return { label: 'Tükendi', cls: 'bg-[hsl(0_62%_50%)] text-white' };
    if (item.badge === 'Yeni' || item.badge === 'Son 1') return { label: item.badge, cls: 'bg-[hsl(142_76%_36%)] text-white' };
    if (item.badge === 'İndirim') return { label: 'İndirim', cls: 'bg-[hsl(38_92%_50%)] text-[hsl(215_25%_8%)]' };
    return { label: 'Stokta', cls: 'bg-[hsl(142_76%_36%)] text-white' };
  };

  const statusBadge = getStatusBadge();

  const handleAddQuote = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addItem({
      id: item.id,
      type: 'store',
      title,
      image: mainImage || '/placeholder.svg',
      price: item.price || undefined,
      quantity: item.min_qty || 1,
      product_id: item.product_id,
    });
  };

  const handleClick = () => {
    onQuickView?.(item);
  };

  return (
    <div
      onClick={handleClick}
      className="group relative flex flex-col rounded-xl overflow-hidden border border-[hsl(215_25%_16%)] bg-[hsl(215_25%_10%)] transition-all duration-200 hover:border-[hsl(215_25%_24%)] cursor-pointer"
    >
      {/* Image area */}
      <div className="relative aspect-[4/3] overflow-hidden bg-[hsl(215_25%_8%)]">
        {mainImage ? (
          <img src={mainImage} alt={title} loading="lazy" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package className="w-10 h-10 text-[hsl(215_15%_25%)]" />
          </div>
        )}

        {/* Out of stock overlay text */}
        {outOfStock && !mainImage && (
          <span className="absolute inset-0 flex items-center justify-center text-sm font-medium text-[hsl(0_62%_55%)]">Tükendi</span>
        )}

        {/* Status badge top-left */}
        <Badge className={`absolute top-2 left-2 ${statusBadge.cls} text-[10px] px-2 py-0.5 font-medium`}>
          {statusBadge.label}
        </Badge>

        {/* Category badge top-right */}
        <Badge className="absolute top-2 right-2 bg-[hsl(215_25%_18%/0.9)] text-[hsl(210_20%_65%)] text-[10px] px-2 py-0.5 font-normal border-0">
          {category}
        </Badge>
      </div>

      {/* Body */}
      <div className="p-3 flex flex-col flex-1">
        <h3 className="text-sm font-medium text-[hsl(210_20%_90%)] line-clamp-2 leading-snug mb-1">{title}</h3>
        <p className="text-[11px] text-[hsl(215_15%_40%)] font-mono mb-3">{sku}</p>

        {/* Bottom row */}
        <div className="mt-auto flex items-center justify-between">
          <span className="text-sm text-[hsl(210_20%_80%)]">
            <span className="font-semibold">{stock}</span>
            <span className="text-[hsl(215_15%_45%)] ml-1 text-xs">adet</span>
          </span>

          <button
            onClick={handleAddQuote}
            disabled={outOfStock && item.allow_quote === false}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[hsl(199_89%_48%)] hover:bg-[hsl(199_89%_42%)] text-white text-xs font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed min-h-[32px]"
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            Sepete Ekle
          </button>
        </div>
      </div>
    </div>
  );
}
