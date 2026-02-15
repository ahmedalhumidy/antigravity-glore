import { useState, useMemo, useEffect } from 'react';
import { GalleryProductCard } from '../components/GalleryProductCard';
import { GalleryViewer } from '../components/GalleryViewer';
import { useGalleryProducts } from '../hooks/useGalleryProducts';
import { useQuoteCartContext } from '../context/QuoteCartContext';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, Image, Sparkles, Eye, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';

const PAGE_SIZE = 24;

export default function GaleriPage() {
  const { products, isLoading } = useGalleryProducts();
  const { items: cartItems } = useQuoteCartContext();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

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

  const visible = filtered.slice(0, visibleCount);
  const hasMore = visibleCount < filtered.length;

  useEffect(() => { setVisibleCount(PAGE_SIZE); }, [search, category]);

  return (
    <div className="min-h-screen relative">
      {/* Full-page dark gradient background */}
      <div className="fixed inset-0 bg-gradient-to-br from-[hsl(215_30%_8%)] via-[hsl(215_25%_11%)] to-[hsl(220_20%_14%)]" />

      {/* Content */}
      <div className="relative z-10">

        {/* Hero Section */}
        <section className="relative py-16 md:py-24 text-center">
          <div className="container mx-auto px-4">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[hsl(0_0%_100%/0.06)] border border-[hsl(0_0%_100%/0.08)] mb-6">
              <Sparkles className="w-3.5 h-3.5 text-[hsl(38_92%_50%)]" />
              <span className="text-xs text-[hsl(210_20%_70%)] font-medium tracking-widest uppercase">Premium Koleksiyon</span>
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white tracking-tight mb-4">
              Ürün Galerisi
            </h1>
            <p className="text-[hsl(210_20%_50%)] text-lg md:text-xl font-light tracking-wide">
              İlham Al • Keşfet • Talep Gönder
            </p>

            {/* Search */}
            <div className="mt-10 max-w-lg mx-auto relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[hsl(215_15%_35%)]" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Ürün ara..."
                className="w-full h-12 pl-12 pr-4 rounded-full bg-[hsl(0_0%_100%/0.06)] border border-[hsl(0_0%_100%/0.08)] text-white placeholder:text-[hsl(215_15%_35%)] focus:outline-none focus:border-[hsl(0_0%_100%/0.2)] focus:bg-[hsl(0_0%_100%/0.08)] transition-all text-sm"
              />
            </div>

            {/* Trust chips */}
            <div className="mt-8 flex flex-wrap justify-center gap-4">
              {[
                { icon: Eye, label: 'Görsel Katalog' },
                { icon: Sparkles, label: 'İlham Koleksiyonu' },
                { icon: Send, label: 'Kolay Talep' },
              ].map(({ icon: Icon, label }) => (
                <div key={label} className="flex items-center gap-1.5 text-[hsl(210_20%_45%)] text-xs">
                  <Icon className="w-3.5 h-3.5" />
                  <span>{label}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Sticky Category Bar */}
        <div className="sticky top-14 z-40 border-y border-[hsl(0_0%_100%/0.06)] bg-[hsl(215_25%_10%/0.85)] backdrop-blur-md">
          <div className="container mx-auto px-4 py-3">
            <div className="flex items-center gap-4">
              <div className="flex-1 flex items-center gap-2 overflow-x-auto scrollbar-hide">
                <button
                  onClick={() => setCategory('all')}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
                    category === 'all'
                      ? 'bg-white text-[hsl(215_25%_10%)]'
                      : 'bg-[hsl(0_0%_100%/0.07)] text-[hsl(210_20%_55%)] hover:bg-[hsl(0_0%_100%/0.12)] hover:text-white'
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
                        ? 'bg-white text-[hsl(215_25%_10%)]'
                        : 'bg-[hsl(0_0%_100%/0.07)] text-[hsl(210_20%_55%)] hover:bg-[hsl(0_0%_100%/0.12)] hover:text-white'
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
              <span className="text-xs text-[hsl(210_20%_40%)] whitespace-nowrap">{filtered.length} ürün</span>
            </div>
          </div>
        </div>

        {/* Content Grid */}
        <main className="container mx-auto px-4 py-10">
          {isLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton
                  key={i}
                  className={`rounded-2xl bg-[hsl(215_25%_16%)] ${i % 5 === 0 ? 'row-span-2 aspect-[3/4]' : 'aspect-[4/5]'}`}
                />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-24">
              <Image className="w-16 h-16 text-[hsl(215_15%_25%)] mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2 text-white">Sonuç bulunamadı</h2>
              <p className="text-[hsl(210_20%_45%)] mb-6">Aradığınız kriterlere uygun ürün bulunamadı.</p>
              <button
                onClick={() => { setSearch(''); setCategory('all'); }}
                className="px-5 py-2 rounded-full bg-[hsl(0_0%_100%/0.08)] text-white text-sm font-medium hover:bg-[hsl(0_0%_100%/0.14)] transition-colors"
              >
                Filtreleri Sıfırla
              </button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 auto-rows-auto">
                {visible.map((p, i) => (
                  <GalleryProductCard key={p.id} item={p} featured={i % 7 === 0} onOpen={() => setViewerIndex(i)} />
                ))}
              </div>

              {hasMore && (
                <div className="flex justify-center mt-8">
                  <Button
                    variant="outline"
                    onClick={() => setVisibleCount(prev => prev + PAGE_SIZE)}
                    className="px-8 h-10 border-[hsl(215_25%_22%)] text-[hsl(210_20%_75%)] hover:bg-[hsl(215_25%_18%)]"
                  >
                    Daha Fazla Yükle ({filtered.length - visibleCount} kalan)
                  </Button>
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {viewerIndex !== null && (
        <GalleryViewer
          products={filtered}
          initialIndex={viewerIndex}
          onClose={() => setViewerIndex(null)}
        />
      )}
    </div>
  );
}
