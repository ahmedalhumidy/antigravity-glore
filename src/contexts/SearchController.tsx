import { createContext, useContext, useState, useCallback, useRef, useEffect, ReactNode } from 'react';
import { Product } from '@/types/stock';
import { supabase } from '@/integrations/supabase/client';
import { globalSearch, SearchResult, findByBarcode } from '@/lib/globalSearch';

interface SearchControllerState {
  query: string;
  results: SearchResult[];
  loading: boolean;
  isOpen: boolean;
  selectedProduct: Product | null;
  drawerOpen: boolean;
}

interface SearchControllerActions {
  setQuery: (text: string) => void;
  openDropdown: () => void;
  closeDropdown: () => void;
  openProduct: (id: string) => Promise<void>;
  closeDrawer: () => void;
  clear: () => void;
}

type SearchController = SearchControllerState & SearchControllerActions;

const SearchControllerContext = createContext<SearchController | null>(null);

function mapRow(data: any): Product {
  return {
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

export function SearchControllerProvider({ children }: { children: ReactNode }) {
  const [query, setQueryState] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResults([]);
      if (!trimmed) setIsOpen(false);
      setLoading(false);
      return;
    }

    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      const res = await globalSearch(trimmed);
      setResults(res);
      setIsOpen(true);
      setLoading(false);
    }, 250);

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query]);

  const setQuery = useCallback((text: string) => {
    setQueryState(text);
    if (text.trim().length >= 2) setIsOpen(true);
  }, []);

  const openDropdown = useCallback(() => setIsOpen(true), []);
  const closeDropdown = useCallback(() => {
    setIsOpen(false);
    setQueryState('');
    setResults([]);
  }, []);

  const openProduct = useCallback(async (id: string) => {
    // Close search immediately
    setIsOpen(false);
    setQueryState('');
    setResults([]);

    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error || !data) {
        console.error('[SearchController] openProduct error:', error);
        return;
      }

      setSelectedProduct(mapRow(data));
      setDrawerOpen(true);
    } catch (err) {
      console.error('[SearchController] openProduct error:', err);
    }
  }, []);

  const closeDrawer = useCallback(() => {
    setDrawerOpen(false);
    setSelectedProduct(null);
  }, []);

  const clear = useCallback(() => {
    setQueryState('');
    setResults([]);
    setIsOpen(false);
    setLoading(false);
  }, []);

  return (
    <SearchControllerContext.Provider value={{
      query, results, loading, isOpen, selectedProduct, drawerOpen,
      setQuery, openDropdown, closeDropdown, openProduct, closeDrawer, clear,
    }}>
      {children}
    </SearchControllerContext.Provider>
  );
}

export function useSearchController() {
  const ctx = useContext(SearchControllerContext);
  if (!ctx) throw new Error('useSearchController must be used inside SearchControllerProvider');
  return ctx;
}
