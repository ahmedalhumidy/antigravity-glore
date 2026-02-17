import { useState, useRef, useEffect, useCallback } from 'react';
import { Search, Package, MapPin, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { globalSearch, SearchResult } from '@/lib/globalSearch';
import { cn } from '@/lib/utils';
import { Product } from '@/types/stock';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface HeaderSearchProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  products: Product[];
  onProductFound: (product: Product) => void;
  onViewProduct?: (id: string) => void;
}

export function HeaderSearch({ searchQuery, onSearchChange, products, onProductFound, onViewProduct }: HeaderSearchProps) {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const doSearch = useCallback(async (q: string) => {
    if (q.length < 2) {
      setResults([]);
      setShowDropdown(false);
      return;
    }
    setSearching(true);
    try {
      const res = await globalSearch(q);
      setResults(res);
      setShowDropdown(res.length > 0);
      setSelectedIndex(-1);
    } finally {
      setSearching(false);
    }
  }, []);

  const handleChange = (value: string) => {
    onSearchChange(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(value), 300);
  };

  const handleSelect = async (result: SearchResult) => {
    setShowDropdown(false);
    onSearchChange('');
    setResults([]);

    try {
      if (result.type === 'product') {
        let product = products.find(p => p.id === result.id);
        if (!product) {
          console.log('[HeaderSearch] Fetching product from DB:', result.id);
          const { data, error } = await supabase
            .from('products')
            .select('*')
            .eq('id', result.id)
            .maybeSingle();
          if (error) {
            console.error('[HeaderSearch] DB fetch error:', error);
            toast({ title: 'Ürün bilgisi alınamadı', description: error.message, variant: 'destructive' });
            return;
          }
          if (data) {
            product = {
              id: data.id,
              urunKodu: data.urun_kodu,
              urunAdi: data.urun_adi,
              rafKonum: data.raf_konum,
              barkod: data.barkod || undefined,
              acilisStok: data.acilis_stok,
              toplamGiris: data.toplam_giris,
              toplamCikis: data.toplam_cikis,
              mevcutStok: data.mevcut_stok,
              setStok: data.set_stok || 0,
              minStok: data.min_stok,
              uyari: data.uyari,
              sonIslemTarihi: data.son_islem_tarihi || undefined,
              not: data.notes || undefined,
              category: data.category || undefined,
            };
          }
        }
        if (product) {
          if (onViewProduct) {
            onViewProduct(product.id);
          } else {
            onProductFound(product);
          }
        } else {
          console.warn('[HeaderSearch] Product not found:', result.id);
          toast({ title: 'Ürün bulunamadı', variant: 'destructive' });
        }
      } else {
        navigate('/locations');
      }
    } catch (err) {
      console.error('[HeaderSearch] handleSelect error:', err);
      toast({ title: 'Bir hata oluştu', variant: 'destructive' });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showDropdown) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(i => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && selectedIndex >= 0) {
      e.preventDefault();
      handleSelect(results[selectedIndex]);
    } else if (e.key === 'Escape') {
      setShowDropdown(false);
    }
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const productResults = results.filter(r => r.type === 'product') as Extract<SearchResult, { type: 'product' }>[];
  const shelfResults = results.filter(r => r.type === 'shelf') as Extract<SearchResult, { type: 'shelf' }>[];

  let flatIndex = -1;

  return (
    <div ref={containerRef} className="relative flex-1 max-w-md mx-2 md:mx-4">
      <div className="relative flex items-center">
        <Search className="absolute left-3 w-4 h-4 text-muted-foreground pointer-events-none z-10" />
        <Input
          type="text"
          placeholder="Ürün, raf, barkod ara..."
          value={searchQuery}
          onChange={(e) => handleChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => results.length > 0 && setShowDropdown(true)}
          className="h-9 md:h-10 text-sm w-full pl-10 bg-secondary/50 border-transparent focus:border-primary focus:bg-card transition-all duration-200 rounded-lg"
        />
        {searchQuery && (
          <button
            onClick={() => { onSearchChange(''); setResults([]); setShowDropdown(false); }}
            className="absolute right-3 p-0.5 rounded hover:bg-muted"
          >
            <X className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
        )}
      </div>

      {/* Dropdown */}
      {showDropdown && (
        <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-popover border border-border rounded-lg shadow-lg overflow-hidden">
          {productResults.length > 0 && (
            <div>
              <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground bg-muted/50">Ürünler</div>
              {productResults.map(r => {
                flatIndex++;
                const idx = flatIndex;
                return (
                  <button
                    key={r.id}
                   onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); handleSelect(r); }}
                    className={cn(
                      'w-full text-left px-3 py-2 flex items-center gap-2 hover:bg-accent/50 transition-colors text-sm',
                      selectedIndex === idx && 'bg-accent/50'
                    )}
                  >
                    <Package className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium">{r.name}</div>
                      <div className="text-xs text-muted-foreground truncate">{r.code} {r.barcode ? `• ${r.barcode}` : ''} • Stok: {r.stock}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {shelfResults.length > 0 && (
            <div>
              <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground bg-muted/50">Raflar</div>
              {shelfResults.map(r => {
                flatIndex++;
                const idx = flatIndex;
                return (
                  <button
                    key={r.id}
                   onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); handleSelect(r); }}
                    className={cn(
                      'w-full text-left px-3 py-2 flex items-center gap-2 hover:bg-accent/50 transition-colors text-sm',
                      selectedIndex === idx && 'bg-accent/50'
                    )}
                  >
                    <MapPin className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <span className="truncate">{r.name}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
