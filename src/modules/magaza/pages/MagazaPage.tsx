import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MagazaProductCard } from '../components/MagazaProductCard';
import { QuickViewModal } from '../components/QuickViewModal';
import { useStoreProducts } from '../hooks/useStoreProducts';
import { useQuoteCartContext } from '../context/QuoteCartContext';
import { useSystemSettings } from '@/hooks/useSystemSettings';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Search, Package, Zap, ShieldCheck, Layers, FileText, Loader2 } from 'lucide-react';
import type { StoreProduct } from '../types';

const PAGE_SIZE = 30;

export default function MagazaPage() {
  const { products, isLoading } = useStoreProducts();
  const { itemCount } = useQuoteCartContext();
  const { organization } = useSystemSettings();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [sort, setSort] = useState('sort_order');
  const [onlyInStock, setOnlyInStock] = useState(false);
  const [onlyDiscount, setOnlyDiscount] = useState(false);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [quickViewItem, setQuickViewItem] = useState<StoreProduct | null>(null);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout>>();

  const companyName = organization?.name || 'GLORE';

  // Debounce search
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

    if (onlyInStock) {
      list = list.filter(p => (p.product?.mevcut_stok || 0) > 0);
    }

    if (onlyDiscount) {
      list = list.filter(p => p.compare_price && p.price && p.compare_price > p.price);
    }

    if (sort === 'price_asc') list.sort((a, b) => (a.price || 0) - (b.price || 0));
    else if (sort === 'price_desc') list.sort((a, b) => (b.price || 0) - (a.price || 0));
    else if (sort === 'newest') list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return list;
  }, [products, debouncedSearch, category, sort, onlyInStock, onlyDiscount]);

  const visible = filtered.slice(0, visibleCount);
  const hasMore = visibleCount < filtered.length;

  // Reset visible count on filter change
  useEffect(() => { setVisibleCount(PAGE_SIZE); }, [debouncedSearch, category, sort, onlyInStock, onlyDiscount]);

  const isSearching = search !== debouncedSearch;

  return (
    <div className="min-h-screen bg-[hsl(215_25%_6%)] text-[hsl(210_20%_92%)]">
      {/* ========== LUXURY HEADER ========== */}
      <header className="relative overflow-hidden">
        {/* Noise + gradient bg */}
        <div className="absolute inset-0 bg-gradient-to-br from-[hsl(215_30%_10%)] via-[hsl(215_25%_8%)] to-[hsl(220_30%_6%)]" />
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\' opacity=\'1\'/%3E%3C/svg%3E")' }} />

        <div className="relative container mx-auto px-4 py-8 pb-6">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
            {/* Left: Title */}
            <div>
              <Link to="/magaza" className="inline-block mb-1">
                <span className="text-2xl md:text-3xl font-extrabold tracking-tight text-[hsl(210_20%_95%)]">{companyName}</span>
              </Link>
              <h1 className="text-lg md:text-xl font-bold text-[hsl(24_95%_53%)]">Mağaza</h1>
              <p className="text-sm text-[hsl(215_15%_50%)] mt-1">Toptan & Perakende • Teklif ile Sipariş</p>
            </div>

            {/* Right: Search */}
            <div className="w-full md:max-w-md">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[hsl(215_15%_40%)]" />
                {isSearching && <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[hsl(24_95%_53%)] animate-spin" />}
                <input
                  placeholder="Ürün ara... (isim, kod, barkod)"
                  value={search}
                  onChange={e => handleSearchChange(e.target.value)}
                  className="w-full h-11 pl-11 pr-10 rounded-xl bg-[hsl(215_25%_12%)] border border-[hsl(215_25%_18%)] text-[hsl(210_20%_90%)] placeholder:text-[hsl(215_15%_35%)] focus:outline-none focus:border-[hsl(24_95%_53%/0.5)] focus:ring-1 focus:ring-[hsl(24_95%_53%/0.3)] transition-all text-sm"
                />
              </div>
            </div>
          </div>

          {/* Trust chips */}
          <div className="flex flex-wrap gap-2 mt-5">
            {[
              { icon: Zap, label: 'Hızlı Teklif' },
              { icon: ShieldCheck, label: 'Güvenli Stok' },
              { icon: Layers, label: 'Toplu Sipariş' },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[hsl(215_25%_14%)] border border-[hsl(215_25%_20%)] text-xs text-[hsl(210_20%_70%)]">
                <Icon className="w-3.5 h-3.5 text-[hsl(24_95%_53%)]" />
                {label}
              </div>
            ))}
          </div>
        </div>
      </header>

      {/* ========== STICKY CONTROL BAR ========== */}
      <div className="sticky top-0 z-40 bg-[hsl(215_25%_8%)/0.95] backdrop-blur-lg border-b border-[hsl(215_25%_16%)]">
        <div className="container mx-auto px-4 py-3">
          {/* Categories - scrollable */}
          {categories.length > 0 && (
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4" style={{ WebkitOverflowScrolling: 'touch' }}>
              <button
                onClick={() => setCategory('all')}
                className={`flex-shrink-0 px-3.5 py-1.5 rounded-full text-xs font-medium transition-colors min-h-[36px] ${
                  category === 'all'
                    ? 'bg-[hsl(24_95%_53%)] text-white'
                    : 'bg-[hsl(215_25%_14%)] text-[hsl(210_20%_65%)] hover:bg-[hsl(215_25%_18%)] hover:text-[hsl(210_20%_80%)] border border-[hsl(215_25%_20%)]'
                }`}
              >
                Tümü
              </button>
              {categories.map(c => (
                <button
                  key={c}
                  onClick={() => setCategory(c)}
                  className={`flex-shrink-0 px-3.5 py-1.5 rounded-full text-xs font-medium transition-colors min-h-[36px] ${
                    category === c
                      ? 'bg-[hsl(24_95%_53%)] text-white'
                      : 'bg-[hsl(215_25%_14%)] text-[hsl(210_20%_65%)] hover:bg-[hsl(215_25%_18%)] hover:text-[hsl(210_20%_80%)] border border-[hsl(215_25%_20%)]'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          )}

          {/* Sort + Toggles + Count */}
          <div className="flex flex-wrap items-center gap-3 mt-2">
            <Select value={sort} onValueChange={setSort}>
              <SelectTrigger className="w-[140px] h-9 bg-[hsl(215_25%_14%)] border-[hsl(215_25%_20%)] text-[hsl(210_20%_80%)] text-xs">
                <SelectValue placeholder="Sıralama" />
              </SelectTrigger>
              <SelectContent className="bg-[hsl(215_25%_12%)] border-[hsl(215_25%_20%)]">
                <SelectItem value="sort_order">Varsayılan</SelectItem>
                <SelectItem value="newest">En Yeni</SelectItem>
                <SelectItem value="price_asc">Fiyat ↑</SelectItem>
                <SelectItem value="price_desc">Fiyat ↓</SelectItem>
              </SelectContent>
            </Select>

            <label className="flex items-center gap-2 cursor-pointer min-h-[44px]">
              <Switch checked={onlyInStock} onCheckedChange={setOnlyInStock} className="scale-90" />
              <span className="text-xs text-[hsl(210_20%_65%)]">Sadece Stokta</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer min-h-[44px]">
              <Switch checked={onlyDiscount} onCheckedChange={setOnlyDiscount} className="scale-90" />
              <span className="text-xs text-[hsl(210_20%_65%)]">Sadece İndirim</span>
            </label>

            <span className="text-xs text-[hsl(215_15%_45%)] ml-auto">{filtered.length} ürün</span>
          </div>
        </div>
      </div>

      {/* ========== CONTENT ========== */}
      <main className="container mx-auto px-4 py-6">
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="rounded-xl overflow-hidden border border-[hsl(215_25%_18%)] bg-[hsl(215_25%_12%/0.6)]">
                <Skeleton className="aspect-square bg-[hsl(215_25%_14%)]" />
                <div className="p-3 space-y-2">
                  <Skeleton className="h-3 w-16 bg-[hsl(215_25%_14%)]" />
                  <Skeleton className="h-4 w-full bg-[hsl(215_25%_14%)]" />
                  <Skeleton className="h-4 w-3/4 bg-[hsl(215_25%_14%)]" />
                  <Skeleton className="h-6 w-20 bg-[hsl(215_25%_14%)] mt-3" />
                  <Skeleton className="h-9 w-full bg-[hsl(215_25%_14%)]" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-24">
            <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-[hsl(215_25%_14%)] flex items-center justify-center border border-[hsl(215_25%_20%)]">
              <Package className="w-10 h-10 text-[hsl(215_15%_35%)]" />
            </div>
            <h2 className="text-xl font-semibold text-[hsl(210_20%_85%)] mb-2">Sonuç bulunamadı</h2>
            <p className="text-sm text-[hsl(215_15%_45%)] mb-6">Arama veya filtre kriterlerinizi değiştirin.</p>
            <Button
              variant="outline"
              onClick={() => { setSearch(''); setDebouncedSearch(''); setCategory('all'); setOnlyInStock(false); setOnlyDiscount(false); }}
              className="border-[hsl(215_25%_22%)] text-[hsl(210_20%_75%)] hover:bg-[hsl(215_25%_18%)]"
            >
              Filtreleri Sıfırla
            </Button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {visible.map(p => (
                <MagazaProductCard key={p.id} item={p} onQuickView={setQuickViewItem} />
              ))}
            </div>

            {hasMore && (
              <div className="flex justify-center mt-8">
                <Button
                  variant="outline"
                  onClick={() => setVisibleCount(prev => prev + PAGE_SIZE)}
                  className="px-8 h-11 border-[hsl(215_25%_22%)] text-[hsl(210_20%_75%)] hover:bg-[hsl(215_25%_18%)] hover:text-[hsl(210_20%_90%)]"
                >
                  Daha Fazla Yükle ({filtered.length - visibleCount} kalan)
                </Button>
              </div>
            )}
          </>
        )}
      </main>

      {/* ========== FLOATING CART ========== */}
      {itemCount > 0 && (
        <button
          onClick={() => navigate('/magaza/sepet')}
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-5 py-3 rounded-full bg-[hsl(24_95%_53%)] text-white font-semibold shadow-[0_8px_32px_-4px_hsl(24_95%_53%/0.4)] hover:bg-[hsl(24_95%_48%)] transition-all min-h-[48px]"
        >
          <FileText className="w-5 h-5" />
          Sepet ({itemCount})
        </button>
      )}

      {/* ========== QUICK VIEW ========== */}
      <QuickViewModal item={quickViewItem} open={!!quickViewItem} onClose={() => setQuickViewItem(null)} />
    </div>
  );
}
