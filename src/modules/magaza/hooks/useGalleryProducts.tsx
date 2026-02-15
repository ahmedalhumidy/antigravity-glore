import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { GalleryProduct } from '../types';

export function useGalleryProducts() {
  const { data: products = [], isLoading } = useQuery({
    queryKey: ['gallery-products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gallery_products')
        .select('*')
        .eq('visible', true)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      return (data || []) as GalleryProduct[];
    },
    staleTime: 2 * 60 * 1000,
  });

  return { products, isLoading };
}

export function useAllGalleryProducts() {
  const { data: products = [], isLoading, refetch } = useQuery({
    queryKey: ['admin-gallery-products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gallery_products')
        .select('*')
        .order('sort_order', { ascending: true });

      if (error) throw error;
      return (data || []) as GalleryProduct[];
    },
  });

  return { products, isLoading, refetch };
}
