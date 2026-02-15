import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MagazaProductCard } from '../components/MagazaProductCard';
import { QuickViewModal } from '../components/QuickViewModal';
import { useStoreProducts } from '../hooks/useStoreProducts';
import { useQuoteCartContext } from '../context/QuoteCartContext';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Search, Package, ShoppingCart, User, Store, Loader2 } from 'lucide-react';
import type { StoreProduct } from '../types';

const PAGE_SIZE = 30;

export default function MagazaPage() {
  const { products, isLoading } = useStoreProducts();
  const { itemCount } = useQuoteCartContext();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [quickViewItem, setQuickViewItem] = useState<StoreProduct | null>(null);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout>>();

  const handleSearchChange = useCallback((val: string) => {
    setSearch(val);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => setDebouncedSearch(val), 250);
  }, []);

  useEffect(() => () => { if (searchTimerRef.current) clearTimeout(searchTimerRef.current); }, []);

  const categories = useMemo(() => {
    const cats = new Set<string>();
    products.forEach(p => {
      const cat = p.category || p.product?.category;
      if (cat) cats.add(cat);
    });
    return Array.from(cats).sort();
  }, [products]);

  const inStockCount = useMemo(() => products.filter(p => (p.product?.mevcut_stok || 0) > 0).length, [products]);

  const filtered = useMemo(() => {
    let list = [...products];

    if (debouncedSearch.trim()) {
      const q = debouncedSearch.toLowerCase();
      list = list.filter(p => {
        const title = (p.title_override || p.product?.urun_adi || '').toLowerCase();
        const sku = (p.product?.urun_kodu || '').toLowerCase();
        const barcode = (p.product?.barkod || '').toLowerCase();
        return title.includes(q) || sku.includes(q) || barcode.includes(q);
      });
    }

    if (category !== 'all') {
      list = list.filter(p => (p.category || p.product?.category) === category);
    }

    return list;
  }, [products, debouncedSearch, category]);

  const visible = filtered.slice(0, visibleCount);
  const hasMore = visibleCount < filtered.length;

  useEffect(() => { setVisibleCount(PAGE_SIZE); }, [debouncedSearch, category]);

  const isSearching = search !== debouncedSearch;

  return (
    <div className="min-h-screen bg-[hsl(215_25%_6%)] text-[hsl(210_20%_92%)]">
      {/* ========== TOP NAV ========== */}
      <nav className="border-b border-[hsl(215_25%_14%)] bg-[hsl(215_25%_8%)]">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link to="/magaza" className="flex items-center gap-2">
              <Store className="w-5 h-5 text-[hsl(142_76%_46%)]" />
              <span className="text-base font-bold text-[hsl(210_20%_95%)]">Magaza</span>
            </Link>
            <div className="hidden md:flex items-center gap-6">
              <Link to="/" className="text-sm text-[hsl(215_15%_55%)] hover:text-[hsl(210_20%_85%)] transition-colors">Ana Sayfa</Link>
              <Link to="/galeri" className="text-sm text-[hsl(215_15%_55%)] hover:text-[hsl(210_20%_85%)] transition-colors">Galeri</Link>
              <Link to="/" className="text-sm text-[hsl(215_15%_55%)] hover:text-[hsl(210_20%_85%)] transition-colors">Depo</Link>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/magaza/sepet')} className="relative p-2 text-[hsl(215_15%_55%)] hover:text-[hsl(210_20%_85%)] transition-colors">
              <ShoppingCart className="w-5 h-5" />
              {itemCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-[hsl(142_76%_46%)] text-[hsl(215_25%_8%)] text-[10px] font-bold flex items-center justify-center">{itemCount}</span>
              )}
            </button>
            <button className="p-2 text-[hsl(215_15%_55%)] hover:text-[hsl(210_20%_85%)] transition-colors">
              <User className="w-5 h-5" />
            </button>
          </div>
        </div>
      </nav>

      {/* ========== HEADER ========== */}
      <div className="container mx-auto px-4 py-8">
        <div className="bg-[hsl(215_25%_10%)] rounded-2xl border border-[hsl(215_25%_16%)] p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[hsl(215_25%_16%)] flex items-center justify-center">
                <Store className="w-5 h-5 text-[hsl(142_76%_46%)]" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-[hsl(210_20%_95%)]">Magaza</h1>
                <p className="text-sm text-[hsl(215_15%_45%)]">{inStockCount} ürün stokta mevcut</p>
              </div>
            </div>
            <div className="w-full md:max-w-sm relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[hsl(215_15%_35%)]" />
              {isSearching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[hsl(215_15%_45%)] animate-spin" />}
              <input
                placeholder="Ürün ara... (isim, SKU veya barkod)"
                value={search}
                onChange={e => handleSearchChange(e.target.value)}
                className="w-full h-10 pl-10 pr-10 rounded-lg bg-[hsl(215_25%_14%)] border border-[hsl(215_25%_20%)] text-sm text-[hsl(210_20%_90%)] placeholder:text-[hsl(215_15%_35%)] focus:outline-none focus:border-[hsl(215_15%_30%)] transition-colors"
              />
            </div>
          </div>
        </div>
      </div>

      {/* ========== SECTION HEADER ========== */}
      <div className="container mx-auto px-4 mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 overflow-x-auto scrollbar-hide pb-1">
            <button
              onClick={() => setCategory('all')}
              className={`flex-shrink-0 text-sm font-medium transition-colors ${category === 'all' ? 'text-[hsl(210_20%_95%)]' : 'text-[hsl(215_15%_45%)] hover:text-[hsl(210_20%_75%)]'}`}
            >
              Tüm Ürünler
            </button>
            {categories.map(c => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={`flex-shrink-0 text-sm font-medium transition-colors whitespace-nowrap ${category === c ? 'text-[hsl(210_20%_95%)]' : 'text-[hsl(215_15%_45%)] hover:text-[hsl(210_20%_75%)]'}`}
              >
                {c}
              </button>
            ))}
          </div>
          <span className="text-sm text-[hsl(215_15%_40%)] flex-shrink-0 ml-4">{filtered.length} ürün</span>
        </div>
      </div>

      {/* ========== CONTENT ========== */}
      <main className="container mx-auto px-4 pb-8">
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="rounded-xl overflow-hidden border border-[hsl(215_25%_16%)] bg-[hsl(215_25%_10%)]">
                <Skeleton className="aspect-[4/3] bg-[hsl(215_25%_14%)]" />
                <div className="p-3 space-y-2">
                  <Skeleton className="h-4 w-full bg-[hsl(215_25%_14%)]" />
                  <Skeleton className="h-3 w-24 bg-[hsl(215_25%_14%)]" />
                  <div className="flex items-center justify-between pt-2">
                    <Skeleton className="h-4 w-12 bg-[hsl(215_25%_14%)]" />
                    <Skeleton className="h-8 w-24 bg-[hsl(215_25%_14%)]" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-24">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-[hsl(215_25%_14%)] flex items-center justify-center border border-[hsl(215_25%_20%)]">
              <Package className="w-8 h-8 text-[hsl(215_15%_30%)]" />
            </div>
            <h2 className="text-lg font-semibold text-[hsl(210_20%_85%)] mb-1">Sonuç bulunamadı</h2>
            <p className="text-sm text-[hsl(215_15%_45%)] mb-4">Arama veya filtre kriterlerinizi değiştirin.</p>
            <Button
              variant="outline"
              onClick={() => { setSearch(''); setDebouncedSearch(''); setCategory('all'); }}
              className="border-[hsl(215_25%_22%)] text-[hsl(210_20%_75%)] hover:bg-[hsl(215_25%_18%)]"
            >
              Filtreleri Sıfırla
            </Button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {visible.map(p => (
                <MagazaProductCard key={p.id} item={p} onQuickView={setQuickViewItem} />
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

      <QuickViewModal item={quickViewItem} open={!!quickViewItem} onClose={() => setQuickViewItem(null)} />
    </div>
  );
}
