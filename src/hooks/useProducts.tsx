import { useState, useEffect, useCallback } from 'react';
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

export function useProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(0);

  const hasMore = products.length < totalCount;

  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error, count } = await supabase
        .from('products')
        .select('*', { count: 'exact' })
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })
        .range(0, PAGE_SIZE - 1);

      if (error) throw error;

      setTotalCount(count ?? 0);
      setCurrentPage(0);
      setProducts((data || []).map(mapRow));
    } catch (error) {
      console.error('Error fetching products:', error);
      toast.error('Ürünler yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Realtime subscription for live updates across sessions
  useEffect(() => {
    const channel = supabase
      .channel('products-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'products',
        },
        () => {
          // Debounce: re-fetch products when any change happens
          fetchProducts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchProducts]);

  const loadMore = useCallback(async () => {
    if (loadingMore) return;
    try {
      setLoadingMore(true);
      const nextPage = currentPage + 1;
      const from = nextPage * PAGE_SIZE;

      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })
        .range(from, from + PAGE_SIZE - 1);

      if (error) throw error;

      const mapped = (data || []).map(mapRow);
      setProducts(prev => [...prev, ...mapped]);
      setCurrentPage(nextPage);
    } catch (error) {
      console.error('Error loading more products:', error);
      toast.error('Daha fazla ürün yüklenirken hata oluştu');
    } finally {
      setLoadingMore(false);
    }
  }, [currentPage, loadingMore]);

  const addProduct = async (productData: Omit<Product, 'id'>) => {
    try {
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

      const newProduct = mapRow(data);
      setProducts(prev => [newProduct, ...prev]);
      setTotalCount(prev => prev + 1);
      toast.success('Yeni ürün eklendi');
      return newProduct;
    } catch (error) {
      console.error('Error adding product:', error);
      toast.error('Ürün eklenirken hata oluştu');
      return null;
    }
  };

  const updateProduct = async (productData: Product) => {
    try {
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

      setProducts(prev => prev.map(p => p.id === productData.id ? productData : p));
      toast.success('Ürün güncellendi');
      return true;
    } catch (error) {
      console.error('Error updating product:', error);
      toast.error('Ürün güncellenirken hata oluştu');
      return false;
    }
  };

  const deleteProduct = async (id: string) => {
    try {
      const { error } = await supabase
        .from('products')
        .update({
          is_deleted: true,
          deleted_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;

      const product = products.find(p => p.id === id);
      setProducts(prev => prev.filter(p => p.id !== id));
      setTotalCount(prev => prev - 1);
      toast.success(`${product?.urunAdi || 'Ürün'} arşivlendi`);
      return true;
    } catch (error) {
      console.error('Error archiving product:', error);
      toast.error('Ürün arşivlenirken hata oluştu');
      return false;
    }
  };

  const refreshProducts = () => {
    fetchProducts();
  };

  return {
    products,
    loading,
    loadingMore,
    totalCount,
    hasMore,
    loadMore,
    addProduct,
    updateProduct,
    deleteProduct,
    refreshProducts,
    setProducts,
  };
}
