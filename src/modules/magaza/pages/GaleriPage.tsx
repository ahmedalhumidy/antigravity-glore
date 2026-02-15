import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { GalleryProductCard } from '../components/GalleryProductCard';
import { useGalleryProducts } from '../hooks/useGalleryProducts';
import { useQuoteCartContext } from '../context/QuoteCartContext';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, Image, Sparkles, Eye, Send } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function GaleriPage() {
  const { products, isLoading } = useGalleryProducts();
  const { items: cartItems } = useQuoteCartContext();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');

  const categories = useMemo(() => {
    const cats = new Set<string>();
    products.forEach(p => { if (p.category) cats.add(p.category); });
    return Array.from(cats).sort();
  }, [products]);

  const filtered = useMemo(() => {
    let list = [...products];
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(p =>
        p.title.toLowerCase().includes(q) ||
        (p.description || '').toLowerCase().includes(q) ||
        (p.tags || []).some(t => t.toLowerCase().includes(q))
      );
    }
    if (category !== 'all') list = list.filter(p => p.category === category);
    return list;
  }, [products, search, category]);

  return (
    <div className="min-h-screen bg-background">
      {/* Top Nav */}
      <nav className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link to="/galeri" className="text-lg font-bold text-foreground tracking-tight">
              Galeri
            </Link>
            <Link to="/magaza" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Mağaza
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <Link
              to="/magaza/sepet"
              className="relative text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Talepler
              {cartItems.length > 0 && (
                <span className="absolute -top-1.5 -right-3 w-4 h-4 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center font-bold">
                  {cartItems.length}
                </span>
              )}
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[hsl(215_30%_10%)] via-[hsl(215_25%_14%)] to-[hsl(220_20%_18%)]" />
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`
        }} />
        <div className="relative container mx-auto px-4 py-16 md:py-24 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[hsl(0_0%_100%/0.08)] border border-[hsl(0_0%_100%/0.1)] mb-6">
            <Sparkles className="w-3.5 h-3.5 text-[hsl(38_92%_50%)]" />
            <span className="text-xs text-[hsl(210_20%_80%)] font-medium tracking-wide">PREMIUM KOLEKSİYON</span>
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white tracking-tight mb-4">
            Ürün Galerisi
          </h1>
          <p className="text-[hsl(210_20%_65%)] text-lg md:text-xl font-light tracking-wide">
            İlham Al • Keşfet • Talep Gönder
          </p>

          {/* Search */}
          <div className="mt-10 max-w-lg mx-auto relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[hsl(215_15%_40%)]" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Ürün ara..."
              className="w-full h-12 pl-12 pr-4 rounded-full bg-[hsl(0_0%_100%/0.07)] border border-[hsl(0_0%_100%/0.1)] text-white placeholder:text-[hsl(215_15%_40%)] focus:outline-none focus:border-[hsl(0_0%_100%/0.25)] focus:bg-[hsl(0_0%_100%/0.1)] transition-all text-sm"
            />
          </div>

          {/* Trust chips */}
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <div className="flex items-center gap-1.5 text-[hsl(210_20%_60%)] text-xs">
              <Eye className="w-3.5 h-3.5" />
              <span>Görsel Katalog</span>
            </div>
            <span className="text-[hsl(215_15%_25%)]">•</span>
            <div className="flex items-center gap-1.5 text-[hsl(210_20%_60%)] text-xs">
              <Sparkles className="w-3.5 h-3.5" />
              <span>İlham Koleksiyonu</span>
            </div>
            <span className="text-[hsl(215_15%_25%)]">•</span>
            <div className="flex items-center gap-1.5 text-[hsl(210_20%_60%)] text-xs">
              <Send className="w-3.5 h-3.5" />
              <span>Kolay Talep</span>
            </div>
          </div>
        </div>
      </section>

      {/* Category + Controls */}
      <div className="sticky top-14 z-40 border-b border-border bg-background/95 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center gap-4">
            <div className="flex-1 flex items-center gap-2 overflow-x-auto scrollbar-hide">
              <button
                onClick={() => setCategory('all')}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
                  category === 'all'
                    ? 'bg-foreground text-background'
                    : 'bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                }`}
              >
                Tümü
              </button>
              {categories.map(c => (
                <button
                  key={c}
                  onClick={() => setCategory(c)}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
                    category === c
                      ? 'bg-foreground text-background'
                      : 'bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
            <span className="text-xs text-muted-foreground whitespace-nowrap">{filtered.length} ürün</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <main className="container mx-auto px-4 py-8">
        {isLoading ? (
          <div className="columns-1 sm:columns-2 lg:columns-3 gap-6 space-y-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton
                key={i}
                className="rounded-2xl break-inside-avoid"
                style={{ height: `${280 + (i % 3) * 80}px` }}
              />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-24">
            <Image className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2 text-foreground">Sonuç bulunamadı</h2>
            <p className="text-muted-foreground mb-6">Aradığınız kriterlere uygun ürün bulunamadı.</p>
            <button
              onClick={() => { setSearch(''); setCategory('all'); }}
              className="px-5 py-2 rounded-full bg-muted text-foreground text-sm font-medium hover:bg-accent transition-colors"
            >
              Filtreleri Sıfırla
            </button>
          </div>
        ) : (
          <div className="columns-1 sm:columns-2 lg:columns-3 gap-6 space-y-6">
            {filtered.map(p => (
              <div key={p.id} className="break-inside-avoid">
                <GalleryProductCard item={p} />
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
