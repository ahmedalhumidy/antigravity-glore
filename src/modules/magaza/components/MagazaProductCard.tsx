import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingCart, FileText, Plus, Minus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { useQuoteCartContext } from '../context/QuoteCartContext';
import type { StoreProduct } from '../types';

const badgeColors: Record<string, string> = {
  'Yeni': 'bg-emerald-500 text-white',
  'İndirim': 'bg-red-500 text-white',
  'Özel': 'bg-violet-500 text-white',
  'Tükendi': 'bg-muted text-muted-foreground',
};

interface Props {
  item: StoreProduct;
}

export function MagazaProductCard({ item }: Props) {
  const { addItem } = useQuoteCartContext();
  const [qty, setQty] = useState(item.min_qty || 1);

  const title = item.title_override || item.product?.urun_adi || '';
  const sku = item.product?.urun_kodu || '';
  const desc = item.description_override || item.product?.product_description || '';
  const images = (item.product?.images as string[]) || [];
  const mainImage = images[0] || '/placeholder.svg';
  const stock = item.product?.mevcut_stok || 0;
  const outOfStock = stock <= 0;
  const badgeClass = item.badge ? (badgeColors[item.badge] || 'bg-primary text-primary-foreground') : '';

  const handleAddQuote = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addItem({
      id: item.id,
      type: 'store',
      title,
      image: mainImage,
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

  return (
    <Link to={`/magaza/urun/${item.slug}`}>
      <Card className="group overflow-hidden border border-border hover:shadow-lg transition-all duration-300 h-full flex flex-col">
        {/* Image */}
        <div className="relative aspect-square bg-muted overflow-hidden">
          <img
            src={mainImage}
            alt={title}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
          {item.badge && (
            <Badge className={`absolute top-2 left-2 ${badgeClass} text-xs px-2 py-0.5`}>
              {item.badge}
            </Badge>
          )}
          {item.compare_price && item.price && item.compare_price > item.price && (
            <Badge className="absolute top-2 right-2 bg-red-500 text-white text-xs px-2 py-0.5">
              %{Math.round((1 - item.price / item.compare_price) * 100)}
            </Badge>
          )}
        </div>

        <CardContent className="p-3 flex flex-col flex-1 gap-1.5">
          {/* SKU */}
          <p className="text-[10px] text-muted-foreground font-mono uppercase">{sku}</p>

          {/* Title */}
          <h3 className="text-sm font-semibold text-foreground line-clamp-2 leading-tight">{title}</h3>

          {/* Description */}
          {desc && <p className="text-xs text-muted-foreground line-clamp-2">{desc}</p>}

          {/* Stock indicator */}
          {item.show_stock && (
            <p className={`text-xs font-medium ${outOfStock ? 'text-destructive' : 'text-emerald-600'}`}>
              {outOfStock ? 'Stokta Yok' : `Stokta: ${stock}`}
            </p>
          )}
          {!item.show_stock && outOfStock && (
            <p className="text-xs font-medium text-destructive">Stokta Yok</p>
          )}

          {/* Price */}
          <div className="mt-auto pt-2">
            {item.price != null && (
              <div className="flex items-baseline gap-2">
                <span className="text-lg font-bold text-foreground">
                  ₺{item.price.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                </span>
                {item.compare_price && item.compare_price > (item.price || 0) && (
                  <span className="text-sm text-muted-foreground line-through">
                    ₺{item.compare_price.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Quantity + Buttons */}
          <div className="flex items-center gap-2 mt-2" onClick={e => e.preventDefault()}>
            <div className="flex items-center border border-border rounded-lg overflow-hidden">
              <button onClick={e => adjustQty(e, -1)} className="px-2 py-1 hover:bg-muted transition-colors">
                <Minus className="w-3 h-3" />
              </button>
              <span className="px-3 py-1 text-sm font-medium min-w-[2rem] text-center">{qty}</span>
              <button onClick={e => adjustQty(e, 1)} className="px-2 py-1 hover:bg-muted transition-colors">
                <Plus className="w-3 h-3" />
              </button>
            </div>

            {item.allow_quote && (
              <Button
                size="sm"
                variant={outOfStock && !item.allow_cart ? 'default' : 'outline'}
                className="flex-1 text-xs h-8"
                onClick={handleAddQuote}
              >
                <FileText className="w-3 h-3 mr-1" />
                {outOfStock ? 'Talep Oluştur' : 'Teklif Al'}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
