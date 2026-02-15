import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Eye, Send, Image as ImageIcon } from 'lucide-react';
import { useQuoteCartContext } from '../context/QuoteCartContext';
import type { GalleryProduct } from '../types';

interface Props {
  item: GalleryProduct;
  featured?: boolean;
}

export function GalleryProductCard({ item, featured }: Props) {
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
      className={`group block rounded-2xl overflow-hidden relative transition-shadow duration-300 hover:shadow-[0_16px_48px_-8px_hsl(0_0%_0%/0.5)] ${
        featured ? 'row-span-2' : ''
      }`}
    >
      {/* Full-bleed image */}
      <div className={`relative w-full overflow-hidden ${featured ? 'aspect-[3/4]' : 'aspect-[4/5]'}`}>
        {hasImage ? (
          <>
            {!imgLoaded && <div className="absolute inset-0 bg-[hsl(215_25%_14%)] animate-pulse" />}
            <img
              src={mainImage}
              alt={item.title}
              loading="lazy"
              onLoad={() => setImgLoaded(true)}
              className={`w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-105 ${imgLoaded ? 'opacity-100' : 'opacity-0'}`}
            />
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[hsl(215_25%_16%)] to-[hsl(215_25%_22%)]">
            <ImageIcon className="w-12 h-12 text-[hsl(215_15%_30%)]" />
          </div>
        )}

        {/* Permanent bottom gradient for text readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-[hsl(0_0%_0%/0.7)] via-[hsl(0_0%_0%/0.15)] to-transparent pointer-events-none" />

        {/* Category badge top-left */}
        {item.category && (
          <span className="absolute top-3 left-3 text-[10px] px-2.5 py-1 rounded-full bg-[hsl(0_0%_100%/0.12)] text-[hsl(0_0%_100%/0.8)] font-medium backdrop-blur-sm border border-[hsl(0_0%_100%/0.08)]">
            {item.category}
          </span>
        )}

        {/* Title overlay bottom-left */}
        <div className="absolute bottom-0 left-0 right-0 p-4 z-10">
          <h3 className={`font-bold text-white line-clamp-2 leading-snug ${featured ? 'text-xl' : 'text-base'}`}>
            {item.title}
          </h3>
          {item.description && (
            <p className="text-[hsl(0_0%_100%/0.6)] text-xs line-clamp-1 mt-1">
              {item.description}
            </p>
          )}
        </div>

        {/* Hover overlay with buttons */}
        <div className="absolute inset-0 bg-[hsl(0_0%_0%/0.5)] opacity-0 group-hover:opacity-100 transition-opacity duration-200 ease-out flex items-center justify-center gap-3 z-20">
          <span className="flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-[hsl(0_0%_100%/0.95)] text-[hsl(215_25%_10%)] text-xs font-semibold translate-y-3 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-200 ease-out delay-[50ms]">
            <Eye className="w-3.5 h-3.5" />
            İncele
          </span>
          <button
            onClick={handleQuote}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-primary text-primary-foreground text-xs font-semibold translate-y-3 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-200 ease-out delay-100 hover:bg-primary/90"
          >
            <Send className="w-3.5 h-3.5" />
            Talep Gönder
          </button>
        </div>
      </div>
    </Link>
  );
}
