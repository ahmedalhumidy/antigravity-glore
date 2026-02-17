import { supabase } from '@/integrations/supabase/client';

export interface SearchResultProduct {
  id: string;
  type: 'product';
  name: string;
  code: string;
  barcode?: string;
  stock: number;
  shelf: string;
}

export interface SearchResultShelf {
  id: string;
  type: 'shelf';
  name: string;
  description?: string;
}

export type SearchResult = SearchResultProduct | SearchResultShelf;

let searchCache: Map<string, { results: SearchResult[]; timestamp: number }> = new Map();
const CACHE_TTL = 30_000; // 30 seconds

export async function globalSearch(query: string): Promise<SearchResult[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  // Check cache
  const cached = searchCache.get(trimmed);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.results;
  }

  const pattern = `%${trimmed}%`;

  const [productsRes, shelvesRes] = await Promise.all([
    supabase.rpc('search_products', { query: trimmed }),
    supabase
      .from('shelves')
      .select('id, name, description')
      .ilike('name', pattern)
      .limit(5),
  ]);

  const results: SearchResult[] = [];

  if (productsRes.data) {
    productsRes.data.forEach((p: any) => {
      results.push({
        id: p.id,
        type: 'product',
        name: p.urun_adi,
        code: p.urun_kodu,
        barcode: p.barkod || undefined,
        stock: p.mevcut_stok,
        shelf: p.raf_konum,
      });
    });
  }

  if (shelvesRes.data) {
    shelvesRes.data.forEach(s => {
      results.push({
        id: s.id,
        type: 'shelf',
        name: s.name,
        description: s.description || undefined,
      });
    });
  }

  searchCache.set(trimmed, { results, timestamp: Date.now() });
  return results;
}

export async function findByBarcode(barcode: string): Promise<{ type: 'product' | 'shelf' | 'unknown'; id?: string; data?: any }> {
  const trimmed = barcode.trim();
  if (!trimmed) return { type: 'unknown' };

  // Check products first
  const { data: product } = await supabase
    .from('products')
    .select('id, urun_adi, urun_kodu, barkod')
    .eq('is_deleted', false)
    .or(`barkod.eq.${trimmed},urun_kodu.eq.${trimmed}`)
    .limit(1)
    .maybeSingle();

  if (product) return { type: 'product', id: product.id, data: product };

  // Check shelves
  const { data: shelf } = await supabase
    .from('shelves')
    .select('id, name')
    .eq('name', trimmed)
    .limit(1)
    .maybeSingle();

  if (shelf) return { type: 'shelf', id: shelf.id, data: shelf };

  return { type: 'unknown' };
}

export function clearSearchCache() {
  searchCache.clear();
}
