import { createContext, useContext, useState, useCallback, useRef, useEffect, ReactNode } from 'react';
import { Product } from '@/types/stock';
import { supabase } from '@/integrations/supabase/client';
import { globalSearch, SearchResult } from '@/lib/globalSearch';
import { toast } from 'sonner';

interface SearchControllerState {
  query: string;
  results: SearchResult[];
  loading: boolean;
  isOpen: boolean;
  selectedProduct: Product | null;
  drawerOpen: boolean;
  drawerLoading: boolean;
}

interface SearchControllerActions {
  setQuery: (text: string) => void;
  openDropdown: () => void;
  closeDropdown: () => void;
  openProduct: (id: string) => void;
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
  const [drawerLoading, setDrawerLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const requestIdRef = useRef(0);

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
      try {
        console.log('[SearchController] searching:', trimmed);
        const res = await globalSearch(trimmed);
        console.log('[SearchController] results:', res.length);
        setResults(res);
        setIsOpen(true);
      } catch (err) {
        console.error('[SearchController] search error:', err);
        toast.error('Arama hatası');
        setResults([]);
      } finally {
        setLoading(false);
      }
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

  const openProduct = useCallback((id: string) => {
    // 1) Close dropdown immediately
    setIsOpen(false);
    setQueryState('');
    setResults([]);

    // 2) Open drawer immediately (skeleton state)
    const reqId = ++requestIdRef.current;
    setDrawerLoading(true);
    setDrawerOpen(true);
    setSelectedProduct(null);

    // 3) Fetch product
    console.log('[SearchController] openProduct:', id);
    supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .maybeSingle()
      .then(({ data, error }) => {
        // Anti-race: only apply if this is still the latest request
        if (requestIdRef.current !== reqId) return;

        if (error || !data) {
          console.error('[SearchController] openProduct fetch error:', error);
          toast.error('Ürün yüklenemedi');
          setDrawerOpen(false);
          setDrawerLoading(false);
          return;
        }

        console.log('[SearchController] product loaded:', data.urun_adi);
        setSelectedProduct(mapRow(data));
        setDrawerLoading(false);
      });
  }, []);

  const closeDrawer = useCallback(() => {
    setDrawerOpen(false);
    setSelectedProduct(null);
    setDrawerLoading(false);
  }, []);

  const clear = useCallback(() => {
    setQueryState('');
    setResults([]);
    setIsOpen(false);
    setLoading(false);
  }, []);

  return (
    <SearchControllerContext.Provider value={{
      query, results, loading, isOpen, selectedProduct, drawerOpen, drawerLoading,
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
