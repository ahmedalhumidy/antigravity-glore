import { useState, useMemo } from 'react';
import { MagazaHeader } from '../components/MagazaHeader';
import { GalleryProductCard } from '../components/GalleryProductCard';
import { useGalleryProducts } from '../hooks/useGalleryProducts';

import { Skeleton } from '@/components/ui/skeleton';
import { Image } from 'lucide-react';

export default function GaleriPage() {
  const { products, isLoading } = useGalleryProducts();
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
      list = list.filter(p => p.title.toLowerCase().includes(q) || (p.description || '').toLowerCase().includes(q));
    }
    if (category !== 'all') list = list.filter(p => p.category === category);
    return list;
  }, [products, search, category]);

  return (
    <div className="min-h-screen bg-background">
      <MagazaHeader searchQuery={search} onSearchChange={setSearch} />

      <main className="container mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold mb-4">Galeri</h1>

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

        <div className="flex items-center mb-6">
          <span className="text-sm text-muted-foreground ml-auto">{filtered.length} ürün</span>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="aspect-[3/4] rounded-xl" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <Image className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Galeri boş</h2>
            <p className="text-muted-foreground">Henüz galeri ürünü eklenmemiş.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {filtered.map(p => <GalleryProductCard key={p.id} item={p} />)}
          </div>
        )}
      </main>
    </div>
  );
}
