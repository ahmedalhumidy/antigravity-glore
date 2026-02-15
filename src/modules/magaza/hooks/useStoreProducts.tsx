import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { StoreProduct } from '../types';

export function useStoreProducts() {
  const { data: products = [], isLoading } = useQuery({
    queryKey: ['store-products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('store_products')
        .select(`
          *,
          product:products!store_products_product_id_fkey(
            id, urun_adi, urun_kodu, barkod, mevcut_stok, set_stok, raf_konum, images, category, product_description
          )
        `)
        .eq('visible', true)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      return (data || []) as unknown as StoreProduct[];
    },
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
        .select(`
          *,
          product:products!store_products_product_id_fkey(
            id, urun_adi, urun_kodu, barkod, mevcut_stok, set_stok, raf_konum, images, category, product_description
          )
        `)
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
    queryFn: async () => {
      const { data, error } = await supabase
        .from('store_products')
        .select(`
          *,
          product:products!store_products_product_id_fkey(
            id, urun_adi, urun_kodu, barkod, mevcut_stok, set_stok, raf_konum, images, category, product_description
          )
        `)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      return (data || []) as unknown as StoreProduct[];
    },
  });

  return { products, isLoading, refetch };
}
