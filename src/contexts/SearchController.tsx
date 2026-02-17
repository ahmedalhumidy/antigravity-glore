import { createContext, useContext, useState, useCallback, useRef, useEffect, useMemo, ReactNode } from 'react';
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
  lastAction: string;
  lastError: string;
  providerId: string;
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
  const providerId = useMemo(() => Math.random().toString(16).slice(2, 8), []);
  const [query, setQueryState] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [lastAction, setLastAction] = useState('init');
  const [lastError, setLastError] = useState('');
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
    setLastAction('search:pending:' + trimmed);
    debounceRef.current = setTimeout(async () => {
      try {
        console.log('[SearchController] searching:', trimmed);
        const res = await globalSearch(trimmed);
        console.log('[SearchController] results:', res.length);
        setResults(res);
        setIsOpen(true);
        setLastAction('search:done:' + res.length);
      } catch (err: any) {
        console.error('[SearchController] search error:', err);
        setLastError(err?.message || 'search failed');
        setLastAction('search:error');
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
    setLastAction('closeDropdown');
  }, []);

  const openProduct = useCallback((id: string) => {
    console.log('[SearchController] openProduct:', id);
    setLastAction('openProduct:start:' + id);
    setLastError('');

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
    supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .maybeSingle()
      .then(({ data, error }) => {
        // Anti-race: only apply if this is still the latest request
        if (requestIdRef.current !== reqId) {
          console.log('[SearchController] stale request ignored');
          return;
        }

        if (error) {
          console.error('[SearchController] openProduct fetch error:', error);
          setLastError(error.message);
          setLastAction('openProduct:error');
          toast.error('Ürün yüklenemedi: ' + error.message);
          setDrawerOpen(false);
          setDrawerLoading(false);
          return;
        }

        if (!data) {
          console.error('[SearchController] openProduct: no data returned');
          setLastError('no data');
          setLastAction('openProduct:error:nodata');
          toast.error('Ürün bulunamadı');
          setDrawerOpen(false);
          setDrawerLoading(false);
          return;
        }

        console.log('[SearchController] product loaded:', data.urun_adi);
        setSelectedProduct(mapRow(data));
        setDrawerLoading(false);
        setLastAction('openProduct:success:' + data.id);
      });
  }, []);

  const closeDrawer = useCallback(() => {
    setDrawerOpen(false);
    setSelectedProduct(null);
    setDrawerLoading(false);
    setLastAction('closeDrawer');
  }, []);

  const clear = useCallback(() => {
    setQueryState('');
    setResults([]);
    setIsOpen(false);
    setLoading(false);
    setLastAction('clear');
  }, []);

  return (
    <SearchControllerContext.Provider value={{
      query, results, loading, isOpen, selectedProduct, drawerOpen, drawerLoading,
      lastAction, lastError, providerId,
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

/* ── Debug Overlay ── */
export function SearchDebugOverlay() {
  const ctx = useSearchController();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try { setVisible(localStorage.getItem('DEBUG_SEARCH') === '1'); } catch {}
    const handler = () => {
      try { setVisible(localStorage.getItem('DEBUG_SEARCH') === '1'); } catch {}
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, []);

  if (!visible) return null;

  return (
    <div
      style={{
        position: 'fixed', bottom: 16, right: 16, zIndex: 99999,
        background: 'rgba(0,0,0,0.88)', color: '#0f0', fontSize: 11,
        fontFamily: 'monospace', padding: 10, borderRadius: 8,
        maxWidth: 320, pointerEvents: 'auto',
      }}
    >
      <div style={{ fontWeight: 'bold', marginBottom: 4, color: '#ff0' }}>🔍 Search Debug (pid: {ctx.providerId})</div>
      <div>query: "{ctx.query}"</div>
      <div>isOpen: {String(ctx.isOpen)}</div>
      <div>results: {ctx.results.length}</div>
      <div>loading: {String(ctx.loading)}</div>
      <div>drawerOpen: {String(ctx.drawerOpen)}</div>
      <div>drawerLoading: {String(ctx.drawerLoading)}</div>
      <div>selectedProduct: {ctx.selectedProduct?.id?.slice(0, 8) || 'null'}</div>
      <div style={{ color: '#0ff' }}>lastAction: {ctx.lastAction}</div>
      <div style={{ color: '#f55' }}>lastError: {ctx.lastError || 'none'}</div>
      <div style={{ marginTop: 6, display: 'flex', gap: 4 }}>
        <button onClick={() => ctx.closeDrawer()} style={{ background: '#333', color: '#fff', border: 'none', padding: '3px 6px', borderRadius: 4, cursor: 'pointer' }}>Close Drawer</button>
        <button onClick={() => { ctx.closeDropdown(); ctx.closeDrawer(); }} style={{ background: '#333', color: '#fff', border: 'none', padding: '3px 6px', borderRadius: 4, cursor: 'pointer' }}>Reset All</button>
        <button
          onClick={() => {
            if (ctx.results.length > 0) ctx.openProduct(ctx.results[0].id);
            else toast.info('No results to test');
          }}
          style={{ background: '#063', color: '#fff', border: 'none', padding: '3px 6px', borderRadius: 4, cursor: 'pointer' }}
        >Test 1st</button>
        <button
          onClick={() => {
            // Force open drawer directly
            // We can't call setDrawerOpen directly, so use openProduct with a known ID
            toast.info('Use "Test 1st" with results, or type a query first');
          }}
          style={{ background: '#630', color: '#fff', border: 'none', padding: '3px 6px', borderRadius: 4, cursor: 'pointer' }}
        >Open Drawer</button>
      </div>
    </div>
  );
}
