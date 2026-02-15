import { useState, useMemo } from 'react';
import { MagazaHeader } from '../components/MagazaHeader';
import { MagazaProductCard } from '../components/MagazaProductCard';
import { useStoreProducts } from '../hooks/useStoreProducts';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Package } from 'lucide-react';

export default function MagazaPage() {
  const { products, isLoading } = useStoreProducts();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [sort, setSort] = useState('sort_order');

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

    if (search.trim()) {
      const q = search.toLowerCase();
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

    if (sort === 'price_asc') list.sort((a, b) => (a.price || 0) - (b.price || 0));
    else if (sort === 'price_desc') list.sort((a, b) => (b.price || 0) - (a.price || 0));
    else if (sort === 'newest') list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    // default: sort_order already applied

    return list;
  }, [products, search, category, sort]);

  return (
    <div className="min-h-screen bg-background">
      <MagazaHeader searchQuery={search} onSearchChange={setSearch} />

      <main className="container mx-auto px-4 py-6">
        {/* Category Chips */}
        {categories.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <button
              onClick={() => setCategory('all')}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                category === 'all'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              }`}
            >
              Tümü
            </button>
            {categories.map(c => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  category === c
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        )}

        {/* Sort + Count */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <Select value={sort} onValueChange={setSort}>
            <SelectTrigger className="w-[160px] h-9">
              <SelectValue placeholder="Sıralama" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="sort_order">Varsayılan</SelectItem>
              <SelectItem value="newest">En Yeni</SelectItem>
              <SelectItem value="price_asc">Fiyat ↑</SelectItem>
              <SelectItem value="price_desc">Fiyat ↓</SelectItem>
            </SelectContent>
          </Select>

          <span className="text-sm text-muted-foreground ml-auto">{filtered.length} ürün</span>
        </div>

        {/* Grid */}
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {Array.from({ length: 10 }).map((_, i) => (
              <Skeleton key={i} className="aspect-[3/4] rounded-xl" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <Package className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Ürün bulunamadı</h2>
            <p className="text-muted-foreground">Arama veya filtre kriterlerinizi değiştirin.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {filtered.map(p => (
              <MagazaProductCard key={p.id} item={p} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
