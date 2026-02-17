import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Product } from '@/types/stock';

function mapRow(p: any): Product {
  return {
    id: p.id,
    urunKodu: p.urun_kodu,
    urunAdi: p.urun_adi,
    rafKonum: p.raf_konum,
    barkod: p.barkod || undefined,
    acilisStok: p.acilis_stok,
    toplamGiris: p.toplam_giris,
    toplamCikis: p.toplam_cikis,
    mevcutStok: p.mevcut_stok,
    setStok: p.set_stok || 0,
    minStok: p.min_stok,
    uyari: p.uyari,
    sonIslemTarihi: p.son_islem_tarihi || undefined,
    not: p.notes || undefined,
    category: p.category || undefined,
  };
}

export function useProductSearch(searchQuery: string) {
  const [searchResults, setSearchResults] = useState<Product[] | null>(null);
  const [searching, setSearching] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const search = useCallback(async (query: string) => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setSearchResults(null);
      setSearching(false);
      return;
    }

    // Cancel previous request
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setSearching(true);
    try {
      const { data, error } = await supabase.rpc('search_products', { query: trimmed });
      
      if (controller.signal.aborted) return;
      
      if (error) {
        console.error('[ProductSearch] RPC error:', error);
        setSearchResults([]);
      } else {
        setSearchResults((data || []).map(mapRow));
      }
    } catch (err: any) {
      if (err?.name === 'AbortError') return;
      console.error('[ProductSearch] Error:', err);
      setSearchResults([]);
    } finally {
      if (!controller.signal.aborted) setSearching(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    
    const trimmed = searchQuery.trim();
    if (trimmed.length < 2) {
      setSearchResults(null);
      setSearching(false);
      return;
    }

    setSearching(true);
    debounceRef.current = setTimeout(() => search(trimmed), 250);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchQuery, search]);

  const clearSearch = useCallback(() => {
    setSearchResults(null);
    setSearching(false);
    if (abortRef.current) abortRef.current.abort();
  }, []);

  return { searchResults, searching, clearSearch };
}
