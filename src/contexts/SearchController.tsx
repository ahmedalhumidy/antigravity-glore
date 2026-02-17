import { createContext, useContext, useState, useCallback, useRef, useEffect, useMemo, ReactNode } from 'react';
import { Product } from '@/types/stock';
import { supabase } from '@/integrations/supabase/client';
import { globalSearch, SearchResult } from '@/lib/globalSearch';
import { toast } from 'sonner';

/* ── Recent Products (localStorage) ── */
const RECENTS_KEY = 'search_recent_products';
const MAX_RECENTS = 8;

interface RecentProduct {
  id: string;
  name: string;
  code: string;
  stock: number;
}

function getRecents(): RecentProduct[] {
  try {
    return JSON.parse(localStorage.getItem(RECENTS_KEY) || '[]');
  } catch { return []; }
}

function pushRecent(p: RecentProduct) {
  const list = getRecents().filter(r => r.id !== p.id);
  list.unshift(p);
  if (list.length > MAX_RECENTS) list.length = MAX_RECENTS;
  try { localStorage.setItem(RECENTS_KEY, JSON.stringify(list)); } catch {}
}

/* ── Types ── */
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
  recentProducts: RecentProduct[];
}

interface SearchControllerActions {
  setQuery: (text: string) => void;
  openDropdown: () => void;
  closeDropdown: () => void;
  openProduct: (id: string, prefill?: Partial<Product>) => void;
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

/* ── Barcode detection ── */
function isBarcodeQuery(q: string): boolean {
  return /^\d{6,}$/.test(q.trim());
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
  const [recentProducts, setRecentProducts] = useState<RecentProduct[]>(getRecents);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const requestIdRef = useRef(0);
  const searchIdRef = useRef(0);

  // Debounced search with barcode auto-open
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
    const isBarcode = isBarcodeQuery(trimmed);
    const delay = isBarcode ? 100 : 250; // faster for barcodes
    const searchId = ++searchIdRef.current;

    setLastAction('search:pending:' + trimmed);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await globalSearch(trimmed);
        // Anti-race
        if (searchIdRef.current !== searchId) return;

        setResults(res);
        setIsOpen(true);
        setLastAction('search:done:' + res.length);

        // Barcode auto-open: if numeric query and exactly 1 product with exact barcode match
        if (isBarcode && res.length > 0) {
          const exactMatches = res.filter(
            r => r.type === 'product' && (r as any).barcode === trimmed
          );
          if (exactMatches.length === 1) {
            // Auto-open immediately
            setLastAction('barcode:auto-open:' + exactMatches[0].id);
            openProductInternal(exactMatches[0].id);
            return;
          }
        }
      } catch (err: any) {
        if (searchIdRef.current !== searchId) return;
        console.error('[SearchController] search error:', err);
        setLastError(err?.message || 'search failed');
        setLastAction('search:error');
        toast.error('Arama hatası');
        setResults([]);
      } finally {
        if (searchIdRef.current === searchId) setLoading(false);
      }
    }, delay);

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query]); // eslint-disable-line react-hooks/exhaustive-deps

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

  const openProductInternal = useCallback((id: string, prefill?: Partial<Product>) => {
    console.log('[SearchController] openProduct:', id);
    setLastAction('openProduct:start:' + id);
    setLastError('');

    // 1) Close palette immediately
    setIsOpen(false);
    setQueryState('');
    setResults([]);

    // 2) Open drawer immediately (skeleton/prefill)
    const reqId = ++requestIdRef.current;
    setDrawerLoading(true);
    setDrawerOpen(true);
    setSelectedProduct(prefill ? ({ ...prefill, id } as Product) : null);

    // 3) Fetch full product
    supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (requestIdRef.current !== reqId) return;

        if (error) {
          console.error('[SearchController] fetch error:', error);
          setLastError(error.message);
          setLastAction('openProduct:error');
          toast.error('Ürün yüklenemedi: ' + error.message);
          setDrawerOpen(false);
          setDrawerLoading(false);
          return;
        }

        if (!data) {
          setLastError('no data');
          setLastAction('openProduct:error:nodata');
          toast.error('Ürün bulunamadı');
          setDrawerOpen(false);
          setDrawerLoading(false);
          return;
        }

        const mapped = mapRow(data);
        setSelectedProduct(mapped);
        setDrawerLoading(false);
        setLastAction('openProduct:success:' + data.id);

        // Push to recents
        pushRecent({ id: mapped.id, name: mapped.urunAdi, code: mapped.urunKodu, stock: mapped.mevcutStok });
        setRecentProducts(getRecents());
      });
  }, []);

  const openProduct = useCallback((id: string, prefill?: Partial<Product>) => {
    openProductInternal(id, prefill);
  }, [openProductInternal]);

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
      lastAction, lastError, providerId, recentProducts,
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
      <div style={{ fontWeight: 'bold', marginBottom: 4, color: '#ff0' }}>🔍 Debug (pid: {ctx.providerId})</div>
      <div>query: "{ctx.query}"</div>
      <div>isOpen: {String(ctx.isOpen)} | results: {ctx.results.length}</div>
      <div>drawerOpen: {String(ctx.drawerOpen)} | loading: {String(ctx.drawerLoading)}</div>
      <div>product: {ctx.selectedProduct?.id?.slice(0, 8) || 'null'}</div>
      <div style={{ color: '#0ff' }}>action: {ctx.lastAction}</div>
      <div style={{ color: '#f55' }}>error: {ctx.lastError || 'none'}</div>
      <div style={{ marginTop: 6, display: 'flex', gap: 4 }}>
        <button onClick={() => ctx.closeDrawer()} style={{ background: '#333', color: '#fff', border: 'none', padding: '3px 6px', borderRadius: 4, cursor: 'pointer' }}>Close</button>
        <button onClick={() => { ctx.closeDropdown(); ctx.closeDrawer(); }} style={{ background: '#333', color: '#fff', border: 'none', padding: '3px 6px', borderRadius: 4, cursor: 'pointer' }}>Reset</button>
        <button
          onClick={() => {
            if (ctx.results.length > 0) ctx.openProduct(ctx.results[0].id);
            else toast.info('No results');
          }}
          style={{ background: '#063', color: '#fff', border: 'none', padding: '3px 6px', borderRadius: 4, cursor: 'pointer' }}
        >Test 1st</button>
      </div>
    </div>
  );
}
