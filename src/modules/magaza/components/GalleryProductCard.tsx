import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Eye, Send, Image as ImageIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useQuoteCartContext } from '../context/QuoteCartContext';
import type { GalleryProduct } from '../types';

interface Props {
  item: GalleryProduct;
}

export function GalleryProductCard({ item }: Props) {
  const { addItem } = useQuoteCartContext();
  const [imgLoaded, setImgLoaded] = useState(false);
  const images = item.images || [];
  const mainImage = images[0] || '';
  const hasImage = !!mainImage && mainImage !== '/placeholder.svg';

  const handleQuote = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addItem({
      id: item.id,
      type: 'gallery',
      title: item.title,
      image: mainImage || '/placeholder.svg',
      price: item.price_hint || undefined,
      gallery_id: item.id,
    });
  };

  return (
    <Link
      to={`/galeri/urun/${item.slug || item.id}`}
      className="group block rounded-2xl overflow-hidden border border-border bg-card transition-all duration-300 hover:shadow-[0_12px_40px_-12px_hsl(0_0%_0%/0.3)] hover:border-[hsl(0_0%_100%/0.12)]"
    >
      {/* Image Area — ~70% */}
      <div className="relative aspect-[4/5] overflow-hidden bg-muted">
        {hasImage ? (
          <>
            {/* Blur placeholder */}
            {!imgLoaded && (
              <div className="absolute inset-0 bg-muted animate-pulse" />
            )}
            <img
              src={mainImage}
              alt={item.title}
              loading="lazy"
              onLoad={() => setImgLoaded(true)}
              className={`w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 ${imgLoaded ? 'opacity-100' : 'opacity-0'}`}
            />
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted to-secondary">
            <ImageIcon className="w-12 h-12 text-muted-foreground/40" />
          </div>
        )}

        {/* Category badge */}
        {item.category && (
          <Badge className="absolute top-3 left-3 bg-[hsl(0_0%_0%/0.6)] text-white text-[10px] px-2.5 py-0.5 font-medium border-0 backdrop-blur-sm">
            {item.category}
          </Badge>
        )}

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-[hsl(0_0%_0%/0.55)] opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-3">
          <span className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-[hsl(0_0%_100%/0.95)] text-[hsl(215_25%_10%)] text-xs font-semibold transition-transform duration-300 translate-y-2 group-hover:translate-y-0">
            <Eye className="w-3.5 h-3.5" />
            İncele
          </span>
          <button
            onClick={handleQuote}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-primary text-primary-foreground text-xs font-semibold transition-transform duration-300 translate-y-2 group-hover:translate-y-0 hover:bg-primary/90"
          >
            <Send className="w-3.5 h-3.5" />
            Talep Gönder
          </button>
        </div>
      </div>

      {/* Body — ~30% */}
      <div className="p-4 space-y-2">
        <h3 className="text-base font-semibold text-foreground line-clamp-2 leading-snug">
          {item.title}
        </h3>
        {item.description && (
          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
            {item.description}
          </p>
        )}

        {/* Tags */}
        {item.tags && item.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 pt-1">
            {item.tags.slice(0, 3).map(tag => (
              <span
                key={tag}
                className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Mobile CTA (visible on touch devices) */}
        <button
          onClick={handleQuote}
          className="w-full mt-3 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-semibold transition-colors hover:bg-primary/90 lg:hidden"
        >
          <Send className="w-3.5 h-3.5" />
          Talep Gönder
        </button>
      </div>
    </Link>
  );
}
