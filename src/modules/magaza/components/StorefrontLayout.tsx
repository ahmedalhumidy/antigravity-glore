import { useEffect, useRef, useState, useCallback } from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom';
import { Store, Image, ShoppingCart, Search } from 'lucide-react';
import { useQuoteCartContext } from '../context/QuoteCartContext';

const scrollPositions = new Map<string, number>();

export function StorefrontLayout() {
  const location = useLocation();
  const { itemCount } = useQuoteCartContext();
  const contentRef = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState<'enter' | 'visible' | 'exit'>('visible');
  const prevPath = useRef(location.pathname);

  const isGaleri = location.pathname.startsWith('/galeri');
  const isMagaza = location.pathname === '/magaza';

  // Save scroll on unmount / route change
  const saveScroll = useCallback(() => {
    scrollPositions.set(prevPath.current, window.scrollY);
  }, []);

  // Route change animation
  useEffect(() => {
    if (prevPath.current === location.pathname) return;

    saveScroll();
    setPhase('exit');

    const exitTimer = setTimeout(() => {
      prevPath.current = location.pathname;
      setPhase('enter');

      // Restore scroll for new route
      const saved = scrollPositions.get(location.pathname);
      requestAnimationFrame(() => {
        window.scrollTo(0, saved || 0);
      });

      const enterTimer = setTimeout(() => setPhase('visible'), 160);
      return () => clearTimeout(enterTimer);
    }, 120);

    return () => clearTimeout(exitTimer);
  }, [location.pathname, saveScroll]);

  // Save scroll on unmount
  useEffect(() => {
    return () => { saveScroll(); };
  }, [saveScroll]);

  const contentStyles: Record<string, React.CSSProperties> = {
    exit: { opacity: 0, transform: 'translateY(6px)', transition: 'opacity 120ms ease-out, transform 120ms ease-out' },
    enter: { opacity: 0, transform: 'translateY(12px)', transition: 'none' },
    visible: { opacity: 1, transform: 'translateY(0)', transition: 'opacity 160ms ease-out, transform 160ms ease-out' },
  };

  return (
    <div className="min-h-screen">
      {/* ===== PERSISTENT SHARED NAV ===== */}
      <nav className="sticky top-0 z-50 border-b border-[hsl(0_0%_100%/0.06)] bg-[hsl(215_25%_8%/0.92)] backdrop-blur-xl">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-8">
            {/* Brand */}
            <Link to="/magaza" className="flex items-center gap-2">
              <Store className="w-5 h-5 text-[hsl(142_76%_46%)]" />
              <span className="text-base font-bold text-[hsl(210_20%_95%)]">Mağaza</span>
            </Link>

            {/* Mode tabs */}
            <div className="hidden md:flex items-center gap-1 bg-[hsl(0_0%_100%/0.04)] rounded-lg p-0.5">
              <Link
                to="/magaza"
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ${
                  isMagaza
                    ? 'bg-[hsl(0_0%_100%/0.1)] text-white shadow-sm'
                    : 'text-[hsl(215_15%_55%)] hover:text-[hsl(210_20%_80%)]'
                }`}
              >
                <Store className="w-3.5 h-3.5" />
                Ürünler
              </Link>
              <Link
                to="/galeri"
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ${
                  isGaleri
                    ? 'bg-[hsl(0_0%_100%/0.1)] text-white shadow-sm'
                    : 'text-[hsl(215_15%_55%)] hover:text-[hsl(210_20%_80%)]'
                }`}
              >
                <Image className="w-3.5 h-3.5" />
                Galeri
              </Link>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Link
              to="/magaza/sepet"
              className="relative p-2 text-[hsl(215_15%_55%)] hover:text-[hsl(210_20%_85%)] transition-colors"
            >
              <ShoppingCart className="w-5 h-5" />
              {itemCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-[hsl(142_76%_46%)] text-[hsl(215_25%_8%)] text-[10px] font-bold flex items-center justify-center">
                  {itemCount}
                </span>
              )}
            </Link>
          </div>
        </div>

        {/* Mobile mode tabs */}
        <div className="md:hidden flex border-t border-[hsl(0_0%_100%/0.04)]">
          <Link
            to="/magaza"
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors ${
              isMagaza ? 'text-white bg-[hsl(0_0%_100%/0.06)]' : 'text-[hsl(215_15%_50%)]'
            }`}
          >
            <Store className="w-3.5 h-3.5" />
            Ürünler
          </Link>
          <Link
            to="/galeri"
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors ${
              isGaleri ? 'text-white bg-[hsl(0_0%_100%/0.06)]' : 'text-[hsl(215_15%_50%)]'
            }`}
          >
            <Image className="w-3.5 h-3.5" />
            Galeri
          </Link>
        </div>
      </nav>

      {/* ===== ANIMATED CONTENT ===== */}
      <div ref={contentRef} style={contentStyles[phase]}>
        <Outlet />
      </div>
    </div>
  );
}
