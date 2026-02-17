import { useEffect, useRef, useCallback, useState } from 'react';
import { createPortal } from 'react-dom';
import { Search, ChevronRight, Clock, X, Package } from 'lucide-react';
import { useSearchController } from '@/contexts/SearchController';
import { useIsMobile } from '@/hooks/use-mobile';
import { Z } from '@/lib/layers';
import { cn } from '@/lib/utils';

/**
 * SearchPalette — renders search results as:
 * - Desktop: fixed dropdown positioned under the input
 * - Mobile: bottom sheet with drag-to-close
 */
interface SearchPaletteProps {
  anchorRef: React.RefObject<HTMLDivElement>;
  onShelfSelect?: (id: string, name: string) => void;
}

export function SearchPalette({ anchorRef, onShelfSelect }: SearchPaletteProps) {
  const search = useSearchController();
  const isMobile = useIsMobile();
  const sheetRef = useRef<HTMLDivElement>(null);
  const dragStartY = useRef(0);
  const [dragOffset, setDragOffset] = useState(0);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 0 });

  const isCommandMode = search.query.startsWith('>');
  const hasQuery = search.query.trim().length >= 2;
  const showResults = search.isOpen && !isCommandMode && (search.results.length > 0 || search.loading);
  const showRecents = search.isOpen && !isCommandMode && !hasQuery && search.recentProducts.length > 0;
  const showPalette = showResults || showRecents;

  // Calculate dropdown position for desktop
  useEffect(() => {
    if (!isMobile && showPalette && anchorRef.current) {
      const rect = anchorRef.current.getBoundingClientRect();
      setDropdownPos({ top: rect.bottom + 4, left: rect.left, width: rect.width });
    }
  }, [showPalette, isMobile, search.query, anchorRef]);

  // Hardened click handler factory
  const makeHandlers = useCallback((action: () => void) => ({
    onPointerDownCapture: (e: React.PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();
      action();
    },
    onPointerDown: (e: React.PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();
      action();
    },
    onClick: (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      action();
    },
    onTouchEnd: (e: React.TouchEvent) => {
      e.preventDefault();
      e.stopPropagation();
      action();
    },
  }), []);

  const handleProductSelect = useCallback((id: string) => {
    search.openProduct(id);
  }, [search]);

  const handleShelfSelect = useCallback((id: string, name: string) => {
    search.closeDropdown();
    onShelfSelect?.(id, name);
  }, [search, onShelfSelect]);

  // Mobile drag-to-close
  const handleTouchStart = (e: React.TouchEvent) => {
    dragStartY.current = e.touches[0].clientY;
    setDragOffset(0);
  };
  const handleTouchMove = (e: React.TouchEvent) => {
    const dy = e.touches[0].clientY - dragStartY.current;
    if (dy > 0) setDragOffset(dy);
  };
  const handleTouchEnd = () => {
    if (dragOffset > 100) {
      search.closeDropdown();
    }
    setDragOffset(0);
  };

  if (!showPalette) return null;

  const productResults = search.results.filter(r => r.type === 'product');
  const shelfResults = search.results.filter(r => r.type === 'shelf');

  const resultsList = (
    <div className="max-h-80 overflow-y-auto overscroll-contain" style={{ WebkitOverflowScrolling: 'touch' }}>
      {/* Loading skeleton */}
      {search.loading && search.results.length === 0 && (
        <div className="p-3 space-y-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex items-center gap-2.5 animate-pulse">
              <div className="w-8 h-8 rounded-lg bg-muted" />
              <div className="flex-1 space-y-1">
                <div className="h-3 bg-muted rounded w-3/4" />
                <div className="h-2.5 bg-muted rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Recent products (empty query) */}
      {showRecents && (
        <div>
          <div className="px-3 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider bg-muted/30 flex items-center gap-1">
            <Clock className="w-3 h-3" /> Son Görüntülenen
          </div>
          {search.recentProducts.map(r => (
            <button
              key={r.id}
              type="button"
              role="option"
              className="flex items-center gap-2.5 w-full px-3 py-2.5 text-left hover:bg-muted/50 active:bg-muted/70 transition-colors min-h-[44px]"
              style={{ touchAction: 'manipulation' }}
              {...makeHandlers(() => handleProductSelect(r.id))}
            >
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Package className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{r.name}</p>
                <p className="text-[11px] text-muted-foreground">{r.code} · Stok: {r.stock}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            </button>
          ))}
        </div>
      )}

      {/* Product results */}
      {productResults.length > 0 && (
        <div>
          <div className="px-3 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider bg-muted/30">
            Ürünler ({productResults.length})
          </div>
          {productResults.map(r => (
            <button
              key={r.id}
              type="button"
              role="option"
              className="flex items-center gap-2.5 w-full px-3 py-2.5 text-left hover:bg-muted/50 active:bg-muted/70 transition-colors min-h-[44px]"
              style={{ touchAction: 'manipulation' }}
              {...makeHandlers(() => handleProductSelect(r.id))}
            >
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-bold text-primary">{r.name.charAt(0)}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{r.name}</p>
                <p className="text-[11px] text-muted-foreground">
                  {r.type === 'product' && `${r.code} · Stok: ${r.stock}`}
                </p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            </button>
          ))}
        </div>
      )}

      {/* Shelf results */}
      {shelfResults.length > 0 && (
        <div>
          <div className="px-3 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider bg-muted/30">
            Raflar
          </div>
          {shelfResults.map(r => (
            <button
              key={r.id}
              type="button"
              role="option"
              className="flex items-center gap-2.5 w-full px-3 py-2.5 text-left hover:bg-muted/50 active:bg-muted/70 transition-colors min-h-[44px]"
              style={{ touchAction: 'manipulation' }}
              {...makeHandlers(() => handleShelfSelect(r.id, r.name))}
            >
              <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-bold text-accent">{r.name.charAt(0)}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{r.name}</p>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* No results */}
      {!search.loading && hasQuery && search.results.length === 0 && (
        <div className="px-4 py-6 text-center">
          <Search className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Sonuç bulunamadı</p>
          <p className="text-xs text-muted-foreground/60 mt-0.5">"{search.query}" için eşleşme yok</p>
        </div>
      )}
    </div>
  );

  // ── MOBILE: Bottom Sheet ──
  if (isMobile) {
    return createPortal(
      <>
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm animate-in fade-in-0 duration-200"
          style={{ zIndex: Z.paletteBackdrop, pointerEvents: 'auto' }}
          onClick={(e) => { if (e.target === e.currentTarget) search.closeDropdown(); }}
        />
        {/* Bottom Sheet */}
        <div
          ref={sheetRef}
          className="fixed inset-x-0 bottom-0 bg-popover border-t border-border rounded-t-2xl shadow-2xl animate-in slide-in-from-bottom-10 duration-300"
          style={{
            zIndex: Z.palette,
            pointerEvents: 'auto',
            transform: dragOffset > 0 ? `translateY(${dragOffset}px)` : undefined,
            transition: dragOffset > 0 ? 'none' : 'transform 0.3s ease',
            maxHeight: '70vh',
            paddingBottom: 'env(safe-area-inset-bottom, 0px)',
          }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* Drag handle */}
          <div className="flex justify-center py-2">
            <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
          </div>
          {/* Search summary */}
          <div className="px-3 pb-2 flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground">
              {search.loading ? 'Aranıyor...' : `${search.results.length} sonuç`}
            </p>
            <button
              onClick={() => search.closeDropdown()}
              className="p-1.5 rounded-full hover:bg-muted active:scale-95 transition-transform"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
          {resultsList}
        </div>
      </>,
      document.body
    );
  }

  // ── DESKTOP: Fixed dropdown ──
  return createPortal(
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0"
        style={{ zIndex: Z.paletteBackdrop, pointerEvents: 'auto' }}
        onClick={(e) => { if (e.target === e.currentTarget) search.closeDropdown(); }}
      />
      {/* Dropdown */}
      <div
        className="fixed bg-popover border border-border rounded-xl shadow-2xl overflow-hidden animate-in fade-in-0 zoom-in-95 duration-150"
        style={{
          zIndex: Z.palette,
          pointerEvents: 'auto',
          top: dropdownPos.top,
          left: dropdownPos.left,
          width: Math.max(dropdownPos.width, 360),
          maxWidth: 'calc(100vw - 32px)',
        }}
      >
        {resultsList}
      </div>
    </>,
    document.body
  );
}
