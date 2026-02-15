import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { GalleryProduct } from '../types';

async function fetchAllGallery(visibleOnly: boolean): Promise<GalleryProduct[]> {
  const all: GalleryProduct[] = [];
  const batchSize = 1000;
  let offset = 0;
  let hasMore = true;

  while (hasMore) {
    let q = supabase
      .from('gallery_products')
      .select('*')
      .order('sort_order', { ascending: true })
      .range(offset, offset + batchSize - 1);

    if (visibleOnly) q = q.eq('visible', true);

    const { data, error } = await q;
    if (error) throw error;
    if (data && data.length > 0) {
      all.push(...(data as GalleryProduct[]));
      offset += batchSize;
      hasMore = data.length === batchSize;
    } else {
      hasMore = false;
    }
  }
  return all;
}

export function useGalleryProducts() {
  const { data: products = [], isLoading } = useQuery({
    queryKey: ['gallery-products'],
    queryFn: () => fetchAllGallery(true),
    staleTime: 2 * 60 * 1000,
  });
  return { products, isLoading };
}

export function useAllGalleryProducts() {
  const { data: products = [], isLoading, refetch } = useQuery({
    queryKey: ['admin-gallery-products'],
    queryFn: () => fetchAllGallery(false),
  });
  return { products, isLoading, refetch };
}
