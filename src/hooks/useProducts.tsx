import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Product } from '@/types/stock';
import { toast } from 'sonner';

export function useProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProducts = async () => {
    try {
      // Fetch all products (Supabase default limit is 1000, we may have more)
      let allData: any[] = [];
      let from = 0;
      const pageSize = 1000;
      
      while (true) {
        const { data, error: fetchError } = await supabase
          .from('products')
          .select('*')
          .eq('is_deleted', false)
          .order('created_at', { ascending: false })
          .range(from, from + pageSize - 1);

        if (fetchError) throw fetchError;
        if (!data || data.length === 0) break;
        
        allData = allData.concat(data);
        if (data.length < pageSize) break;
        from += pageSize;
      }

      const data = allData;

      if (data.length === 0) {
        setProducts([]);
        return;
      }

      const mappedProducts: Product[] = (data || []).map(p => ({
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
      }));

      setProducts(mappedProducts);
    } catch (error) {
      console.error('Error fetching products:', error);
      toast.error('Ürünler yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

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

      const newProduct: Product = {
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
      };

      setProducts(prev => [newProduct, ...prev]);
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
      // Soft delete - set is_deleted to true
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
      toast.success(`${product?.urunAdi || 'Ürün'} arşivlendi`);
      return true;
    } catch (error) {
      console.error('Error archiving product:', error);
      toast.error('Ürün arşivlenirken hata oluştu');
      return false;
    }
  };

  const refreshProducts = () => {
    setLoading(true);
    fetchProducts();
  };

  return {
    products,
    loading,
    addProduct,
    updateProduct,
    deleteProduct,
    refreshProducts,
    setProducts,
  };
}
