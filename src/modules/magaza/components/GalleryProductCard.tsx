import { useState, useRef } from 'react';
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
  const cardRef = useRef<HTMLAnchorElement>(null);
  const [shine, setShine] = useState({ x: 50, y: 50 });
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

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    setShine({
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
    });
  };

  return (
    <Link
      ref={cardRef}
      to={`/galeri/urun/${item.slug || item.id}`}
      onMouseMove={handleMouseMove}
      className={`group/card block rounded-2xl overflow-hidden relative transition-all duration-300 hover:shadow-[0_20px_60px_-12px_hsl(0_0%_0%/0.6)] ${
        featured ? 'row-span-2' : ''
      }`}
    >
      <div className={`relative w-full overflow-hidden ${featured ? 'aspect-[3/4]' : 'aspect-[4/5]'}`}>
        {/* Image — dimmed by default, brightens on hover */}
        {hasImage ? (
          <>
            {!imgLoaded && <div className="absolute inset-0 bg-[hsl(215_25%_14%)] animate-pulse" />}
            <img
              src={mainImage}
              alt={item.title}
              loading="lazy"
              onLoad={() => setImgLoaded(true)}
              className={`w-full h-full object-cover brightness-[0.7] group-hover/card:brightness-100 transition-all duration-500 ease-out group-hover/card:scale-105 ${
                imgLoaded ? 'opacity-100' : 'opacity-0'
              }`}
            />
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[hsl(215_25%_16%)] to-[hsl(215_25%_22%)]">
            <ImageIcon className="w-12 h-12 text-[hsl(215_15%_30%)]" />
          </div>
        )}

        {/* Vignette */}
        <div className="absolute inset-0 pointer-events-none" style={{
          background: 'radial-gradient(ellipse at center, transparent 50%, hsl(0 0% 0% / 0.35) 100%)',
        }} />

        {/* Bottom gradient for text */}
        <div className="absolute inset-0 bg-gradient-to-t from-[hsl(0_0%_0%/0.75)] via-[hsl(0_0%_0%/0.2)] to-transparent pointer-events-none" />

        {/* Hover gradient overlay — fades in */}
        <div className="absolute inset-0 bg-gradient-to-t from-[hsl(0_0%_0%/0.8)] via-[hsl(0_0%_0%/0.4)] to-[hsl(0_0%_0%/0.15)] opacity-0 group-hover/card:opacity-100 transition-opacity duration-300 pointer-events-none" />

        {/* Luxury light reflection — follows mouse */}
        <div
          className="absolute inset-0 opacity-0 group-hover/card:opacity-100 transition-opacity duration-300 pointer-events-none"
          style={{
            background: `radial-gradient(circle 200px at ${shine.x}% ${shine.y}%, hsl(0 0% 100% / 0.08), transparent 70%)`,
          }}
        />

        {/* Category badge */}
        {item.category && (
          <span className="absolute top-3 left-3 z-10 text-[10px] px-2.5 py-1 rounded-full bg-[hsl(0_0%_100%/0.1)] text-[hsl(0_0%_100%/0.75)] font-medium backdrop-blur-sm border border-[hsl(0_0%_100%/0.06)]">
            {item.category}
          </span>
        )}

        {/* Title — bottom-left, scales up on hover */}
        <div className="absolute bottom-0 left-0 right-0 p-4 z-10 transition-all duration-300">
          <h3 className={`font-bold text-white line-clamp-2 leading-snug transition-all duration-300 group-hover/card:translate-y-[-4px] ${
            featured ? 'text-lg group-hover/card:text-xl' : 'text-sm group-hover/card:text-base'
          }`}>
            {item.title}
          </h3>
          {/* Subtitle — hidden by default, fades in on hover */}
          {item.description && (
            <p className="text-[hsl(0_0%_100%/0.55)] text-xs line-clamp-1 mt-1 opacity-0 translate-y-1 group-hover/card:opacity-100 group-hover/card:translate-y-0 transition-all duration-300 delay-75">
              {item.description}
            </p>
          )}
        </div>

        {/* Hover buttons — slide up + fade in */}
        <div className="absolute inset-0 flex items-center justify-center gap-3 z-20 pointer-events-none opacity-0 group-hover/card:opacity-100 transition-opacity duration-200">
          <span className="pointer-events-auto flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-[hsl(0_0%_100%/0.95)] text-[hsl(215_25%_10%)] text-xs font-semibold translate-y-4 group-hover/card:translate-y-0 transition-transform duration-300 ease-out delay-[50ms]">
            <Eye className="w-3.5 h-3.5" />
            İncele
          </span>
          <button
            onClick={handleQuote}
            className="pointer-events-auto flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-primary text-primary-foreground text-xs font-semibold translate-y-4 group-hover/card:translate-y-0 transition-transform duration-300 ease-out delay-100 hover:bg-primary/90"
          >
            <Send className="w-3.5 h-3.5" />
            Talep Gönder
          </button>
        </div>
      </div>
    </Link>
  );
}
