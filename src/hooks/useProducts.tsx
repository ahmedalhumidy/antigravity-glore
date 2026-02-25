import { useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Product } from '@/types/stock';
import { toast } from 'sonner';

const PAGE_SIZE = 50;

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

// Shared query key — every call to useProducts shares the same cache
const PRODUCTS_QUERY_KEY = ['products'];

async function fetchProductsPage(page: number) {
  const from = page * PAGE_SIZE;
  const { data, error, count } = await supabase
    .from('products')
    .select('*', { count: 'exact' })
    .eq('is_deleted', false)
    .order('created_at', { ascending: false })
    .range(from, from + PAGE_SIZE - 1);

  if (error) throw error;
  return { rows: (data || []).map(mapRow), totalCount: count ?? 0 };
}

export function useProducts() {
  const queryClient = useQueryClient();

  // ─── Main query (page 0) ───
  const {
    data,
    isLoading: loading,
  } = useQuery({
    queryKey: PRODUCTS_QUERY_KEY,
    queryFn: () => fetchProductsPage(0),
    staleTime: 60_000,
  });

  const products = data?.rows ?? [];
  const totalCount = data?.totalCount ?? 0;

  // ─── Pagination (load-more) ───
  const {
    data: infiniteData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage: loadingMore,
  } = useInfiniteQuery({
    queryKey: [...PRODUCTS_QUERY_KEY, 'infinite'],
    queryFn: ({ pageParam = 1 }) => fetchProductsPage(pageParam),
    getNextPageParam: (lastPage, allPages) => {
      const loaded = allPages.length * PAGE_SIZE;
      return loaded < lastPage.totalCount ? allPages.length : undefined;
    },
    initialPageParam: 1,
    enabled: false, // only fetched on-demand via loadMore()
  });

  // Combine first page from main query with subsequent pages from infinite query
  const allProducts = infiniteData
    ? [...products, ...infiniteData.pages.flatMap(p => p.rows)]
    : products;

  const hasMore = allProducts.length < totalCount;

  const loadMore = useCallback(() => {
    fetchNextPage();
  }, [fetchNextPage]);

  // ─── Realtime subscription: invalidate cache on changes ───
  useEffect(() => {
    const channel = supabase
      .channel('products-realtime-tq')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'products' },
        () => {
          queryClient.invalidateQueries({ queryKey: PRODUCTS_QUERY_KEY });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  // ─── Mutations ───

  const addMutation = useMutation({
    mutationFn: async (productData: Omit<Product, 'id'>) => {
      const { data, error } = await supabase
        .from('products')
        .insert({
          urun_kodu: productData.urunKodu,
          urun_adi: productData.urunAdi,
          raf_konum: productData.rafKonum,
          barkod: productData.barkod || null,
          acilis_stok: productData.acilisStok,
          toplam_giris: productData.toplamGiris,
          toplam_cikis: productData.toplamCikis,
          mevcut_stok: productData.mevcutStok,
          set_stok: productData.setStok || 0,
          min_stok: productData.minStok,
          uyari: productData.uyari,
          notes: productData.not || null,
        })
        .select()
        .single();

      if (error) throw error;
      return mapRow(data);
    },
    onSuccess: (newProduct) => {
      queryClient.setQueryData(PRODUCTS_QUERY_KEY, (old: any) =>
        old ? { ...old, rows: [newProduct, ...old.rows], totalCount: old.totalCount + 1 } : old,
      );
      toast.success('Yeni ürün eklendi');
    },
    onError: (error) => {
      console.error('Error adding product:', error);
      toast.error('Ürün eklenirken hata oluştu');
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (productData: Product) => {
      const { error } = await supabase
        .from('products')
        .update({
          urun_kodu: productData.urunKodu,
          urun_adi: productData.urunAdi,
          raf_konum: productData.rafKonum,
          barkod: productData.barkod || null,
          acilis_stok: productData.acilisStok,
          toplam_giris: productData.toplamGiris,
          toplam_cikis: productData.toplamCikis,
          mevcut_stok: productData.mevcutStok,
          set_stok: productData.setStok || 0,
          min_stok: productData.minStok,
          uyari: productData.uyari,
          notes: productData.not || null,
        })
        .eq('id', productData.id);

      if (error) throw error;
      return productData;
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(PRODUCTS_QUERY_KEY, (old: any) =>
        old ? { ...old, rows: old.rows.map((p: Product) => p.id === updated.id ? updated : p) } : old,
      );
      toast.success('Ürün güncellendi');
    },
    onError: (error) => {
      console.error('Error updating product:', error);
      toast.error('Ürün güncellenirken hata oluştu');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('products')
        .update({
          is_deleted: true,
          deleted_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;
      return id;
    },
    onSuccess: (id) => {
      const product = allProducts.find(p => p.id === id);
      queryClient.setQueryData(PRODUCTS_QUERY_KEY, (old: any) =>
        old ? { ...old, rows: old.rows.filter((p: Product) => p.id !== id), totalCount: old.totalCount - 1 } : old,
      );
      toast.success(`${product?.urunAdi || 'Ürün'} arşivlendi`);
    },
    onError: (error) => {
      console.error('Error archiving product:', error);
      toast.error('Ürün arşivlenirken hata oluştu');
    },
  });

  // ─── Stable wrapper functions (same API as before) ───

  const addProduct = useCallback(
    async (productData: Omit<Product, 'id'>) => {
      try {
        return await addMutation.mutateAsync(productData);
      } catch {
        return null;
      }
    },
    [addMutation],
  );

  const updateProduct = useCallback(
    async (productData: Product) => {
      try {
        await updateMutation.mutateAsync(productData);
        return true;
      } catch {
        return false;
      }
    },
    [updateMutation],
  );

  const deleteProduct = useCallback(
    async (id: string) => {
      try {
        await deleteMutation.mutateAsync(id);
        return true;
      } catch {
        return false;
      }
    },
    [deleteMutation],
  );

  const refreshProducts = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: PRODUCTS_QUERY_KEY });
  }, [queryClient]);

  return {
    products: allProducts,
    loading,
    loadingMore,
    totalCount,
    hasMore,
    loadMore,
    addProduct,
    updateProduct,
    deleteProduct,
    refreshProducts,
    setProducts: () => { }, // no-op — managed by TanStack Query cache now
  };
}
