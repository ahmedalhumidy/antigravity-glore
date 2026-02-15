import { FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { useQuoteCartContext } from '../context/QuoteCartContext';
import type { GalleryProduct } from '../types';

interface Props {
  item: GalleryProduct;
}

export function GalleryProductCard({ item }: Props) {
  const { addItem } = useQuoteCartContext();
  const images = item.images || [];
  const mainImage = images[0] || '/placeholder.svg';

  const handleQuote = () => {
    addItem({
      id: item.id,
      type: 'gallery',
      title: item.title,
      image: mainImage,
      price: item.price_hint || undefined,
      gallery_id: item.id,
    });
  };

  return (
    <Card className="group overflow-hidden border border-border hover:shadow-lg transition-all duration-300 h-full flex flex-col">
      <div className="relative aspect-square bg-muted overflow-hidden">
        <img
          src={mainImage}
          alt={item.title}
          loading="lazy"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        {item.category && (
          <Badge variant="secondary" className="absolute top-2 left-2 text-xs">
            {item.category}
          </Badge>
        )}
      </div>

      <CardContent className="p-3 flex flex-col flex-1 gap-1.5">
        <h3 className="text-sm font-semibold text-foreground line-clamp-2">{item.title}</h3>
        {item.description && <p className="text-xs text-muted-foreground line-clamp-2">{item.description}</p>}

        {item.tags && item.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {item.tags.slice(0, 3).map(tag => (
              <Badge key={tag} variant="outline" className="text-[10px] px-1.5 py-0">
                {tag}
              </Badge>
            ))}
          </div>
        )}

        {item.price_hint != null && (
          <p className="text-lg font-bold text-foreground mt-auto pt-2">
            ₺{item.price_hint.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
          </p>
        )}

        <Button size="sm" className="w-full mt-2 text-xs h-8" onClick={handleQuote}>
          <FileText className="w-3 h-3 mr-1" />
          Teklif Al
        </Button>
      </CardContent>
    </Card>
  );
}
