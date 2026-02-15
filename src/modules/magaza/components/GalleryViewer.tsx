import { useState, useEffect, useCallback, useRef } from 'react';
import { X, ChevronLeft, ChevronRight, Send, Image as ImageIcon } from 'lucide-react';
import { useQuoteCartContext } from '../context/QuoteCartContext';
import type { GalleryProduct } from '../types';

interface Props {
  products: GalleryProduct[];
  initialIndex: number;
  onClose: () => void;
}

export function GalleryViewer({ products, initialIndex, onClose }: Props) {
  const [index, setIndex] = useState(initialIndex);
  const [visible, setVisible] = useState(false);
  const [direction, setDirection] = useState<'left' | 'right' | null>(null);
  const { addItem } = useQuoteCartContext();
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const item = products[index];
  const images = (item?.images as string[]) || [];
  const mainImage = images[0] || '';
  const hasImage = !!mainImage && mainImage !== '/placeholder.svg';

  // Enter animation
  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const close = useCallback(() => {
    setVisible(false);
    setTimeout(onClose, 250);
  }, [onClose]);

  const goPrev = useCallback(() => {
    if (index > 0) { setDirection('right'); setIndex(i => i - 1); }
  }, [index]);

  const goNext = useCallback(() => {
    if (index < products.length - 1) { setDirection('left'); setIndex(i => i + 1); }
  }, [index, products.length]);

  // Reset direction after transition
  useEffect(() => {
    if (direction) {
      const t = setTimeout(() => setDirection(null), 300);
      return () => clearTimeout(t);
    }
  }, [direction, index]);

  // Keyboard
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowLeft') goPrev();
      if (e.key === 'ArrowRight') goNext();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [close, goPrev, goNext]);

  // Touch gestures
  const onTouchStart = (e: React.TouchEvent) => {
    touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart.current) return;
    const dx = e.changedTouches[0].clientX - touchStart.current.x;
    const dy = e.changedTouches[0].clientY - touchStart.current.y;
    if (Math.abs(dy) > 80 && Math.abs(dy) > Math.abs(dx)) { close(); return; }
    if (Math.abs(dx) > 50) { dx > 0 ? goPrev() : goNext(); }
    touchStart.current = null;
  };

  const handleQuote = () => {
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
    <div
      ref={containerRef}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      className={`fixed inset-0 z-[100] flex items-center justify-center transition-all duration-250 ease-out ${
        visible ? 'opacity-100' : 'opacity-0'
      }`}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-[hsl(215_30%_6%/0.92)] backdrop-blur-xl"
        onClick={close}
      />

      {/* Close */}
      <button
        onClick={close}
        className="absolute top-4 right-4 z-50 p-2.5 rounded-full bg-[hsl(0_0%_100%/0.08)] text-[hsl(0_0%_100%/0.6)] hover:bg-[hsl(0_0%_100%/0.14)] hover:text-white transition-colors"
      >
        <X className="w-5 h-5" />
      </button>

      {/* Counter */}
      <span className="absolute top-5 left-5 z-50 text-xs text-[hsl(0_0%_100%/0.35)] font-medium tabular-nums">
        {index + 1} / {products.length}
      </span>

      {/* Nav arrows */}
      {index > 0 && (
        <button
          onClick={goPrev}
          className="absolute left-3 md:left-6 z-50 p-2.5 rounded-full bg-[hsl(0_0%_100%/0.08)] text-[hsl(0_0%_100%/0.6)] hover:bg-[hsl(0_0%_100%/0.14)] hover:text-white transition-colors"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
      )}
      {index < products.length - 1 && (
        <button
          onClick={goNext}
          className="absolute right-3 md:right-6 z-50 p-2.5 rounded-full bg-[hsl(0_0%_100%/0.08)] text-[hsl(0_0%_100%/0.6)] hover:bg-[hsl(0_0%_100%/0.14)] hover:text-white transition-colors"
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      )}

      {/* Content */}
      <div
        onClick={e => e.stopPropagation()}
        className={`relative z-40 flex flex-col md:flex-row items-center gap-6 md:gap-10 max-w-5xl w-full mx-4 transition-all duration-250 ease-out ${
          visible ? 'scale-100 translate-y-0' : 'scale-90 translate-y-8'
        }`}
      >
        {/* Image */}
        <div className="flex-1 max-h-[70vh] md:max-h-[80vh] aspect-[3/4] relative rounded-2xl overflow-hidden shadow-2xl bg-[hsl(215_25%_12%)] border border-[hsl(0_0%_100%/0.06)]">
          {hasImage ? (
            <img
              src={mainImage}
              alt={item.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center gap-4 bg-gradient-to-br from-[hsl(215_25%_14%)] to-[hsl(215_25%_20%)]">
              <div className="w-24 h-24 rounded-2xl bg-[hsl(0_0%_100%/0.05)] flex items-center justify-center">
                <ImageIcon className="w-12 h-12 text-[hsl(215_15%_35%)]" />
              </div>
              <span className="text-sm text-[hsl(215_15%_40%)]">Görsel henüz eklenmedi</span>
            </div>
          )}
          {/* Vignette */}
          {hasImage && (
            <div className="absolute inset-0 pointer-events-none" style={{
              background: 'radial-gradient(ellipse at center, transparent 60%, hsl(0 0% 0% / 0.3) 100%)',
            }} />
          )}
        </div>

        {/* Info panel */}
        <div className="md:w-72 flex flex-col gap-4 text-center md:text-left">
          {item.category && (
            <span className="text-[10px] tracking-widest uppercase text-[hsl(38_92%_50%)] font-semibold">
              {item.category}
            </span>
          )}
          <h2 className="text-2xl md:text-3xl font-bold text-white leading-tight">
            {item.title}
          </h2>
          {item.description && (
            <p className="text-[hsl(210_20%_55%)] text-sm leading-relaxed">
              {item.description}
            </p>
          )}
          <button
            onClick={handleQuote}
            className="mt-2 inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors"
          >
            <Send className="w-4 h-4" />
            Talep Gönder
          </button>
        </div>
      </div>
    </div>
  );
}
