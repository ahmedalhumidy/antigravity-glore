import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { StoreProduct } from '../types';

const STORE_SELECT = `
  *,
  product:products!store_products_product_id_fkey(
    id, urun_adi, urun_kodu, barkod, mevcut_stok, set_stok, raf_konum, images, category, product_description
  )
`;

async function fetchAllStore(visibleOnly: boolean): Promise<StoreProduct[]> {
  const all: StoreProduct[] = [];
  const batchSize = 1000;
  let offset = 0;
  let hasMore = true;

  while (hasMore) {
    let q = supabase
      .from('store_products')
      .select(STORE_SELECT)
      .order('sort_order', { ascending: true })
      .range(offset, offset + batchSize - 1);

    if (visibleOnly) q = q.eq('visible', true);

    const { data, error } = await q;
    if (error) throw error;
    if (data && data.length > 0) {
      all.push(...(data as unknown as StoreProduct[]));
      offset += batchSize;
      hasMore = data.length === batchSize;
    } else {
      hasMore = false;
    }
  }
  return all;
}

export function useStoreProducts() {
  const { data: products = [], isLoading } = useQuery({
    queryKey: ['store-products'],
    queryFn: () => fetchAllStore(true),
    staleTime: 2 * 60 * 1000,
  });
  return { products, isLoading };
}

export function useStoreProductBySlug(slug: string) {
  const { data: product, isLoading } = useQuery({
    queryKey: ['store-product', slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('store_products')
        .select(STORE_SELECT)
        .eq('slug', slug)
        .eq('visible', true)
        .single();

      if (error) throw error;
      return data as unknown as StoreProduct;
    },
    enabled: !!slug,
  });

  return { product, isLoading };
}

export function useAllStoreProducts() {
  const { data: products = [], isLoading, refetch } = useQuery({
    queryKey: ['admin-store-products'],
    queryFn: () => fetchAllStore(false),
  });

  return { products, isLoading, refetch };
}
