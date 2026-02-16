import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { addToOfflineQueue, isOnline } from '@/lib/offlineSync';

export interface StockMovementInput {
  productId: string;
  type: 'giris' | 'cikis';
  quantity: number;
  setQuantity?: number;
  date: string;
  time: string;
  note?: string;
  shelfId?: string;
}

export interface ShelfTransferInput {
  productId: string;
  fromShelfName: string;
  toShelfId: string;
  toShelfName: string;
  note?: string;
}

export interface StockMovementResult {
  id: string;
  productId: string;
  productName: string;
  type: 'giris' | 'cikis';
  quantity: number;
  setQuantity: number;
  date: string;
  time?: string;
  handledBy: string;
  note?: string;
  shelfId?: string;
  shelfName?: string;
}

/**
 * Unified Stock Service - Single source of truth for all stock operations
 * All stock modifications MUST go through this service to ensure consistency
 * between stock_movements table and product stock levels
 */
export const stockService = {
  /**
   * Create a stock movement and automatically update product stock levels
   * This is the ONLY way to modify stock - ensures all movements are recorded
   */
  async createMovement(input: StockMovementInput): Promise<StockMovementResult | null> {
    // Check if offline - queue the action
    if (!isOnline()) {
      addToOfflineQueue({
        type: 'stock_movement',
        data: {
          productId: input.productId,
          type: input.type,
          quantity: input.quantity,
          setQuantity: input.setQuantity || 0,
          date: input.date,
          time: input.time,
          note: input.note,
          shelfId: input.shelfId,
        },
      });

      toast.info('Çevrimdışı - işlem sıraya eklendi', {
        description: 'İnternet bağlantısı sağlandığında otomatik senkronize edilecek',
      });
      return null;
    }

    try {
      // Get current user session
      const { data: session } = await supabase.auth.getSession();
      const userId = session.session?.user.id;

      if (!userId) {
        toast.error('Oturum bulunamadı. Lütfen tekrar giriş yapın.');
        return null;
      }

      // Fetch the user's profile name server-side to prevent impersonation
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('user_id', userId)
        .single();

      if (profileError || !profile) {
        toast.error('Kullanıcı profili bulunamadı');
        return null;
      }

      // Validate stock for exit operations
      if (input.type === 'cikis') {
        const { data: product } = await supabase
          .from('products')
          .select('mevcut_stok, set_stok, urun_adi')
          .eq('id', input.productId)
          .single();

        if (product) {
          if (input.quantity > product.mevcut_stok) {
            toast.error(`Yetersiz stok: Mevcut ${product.mevcut_stok}, Talep ${input.quantity}`);
            return null;
          }
          if ((input.setQuantity || 0) > product.set_stok) {
            toast.error(`Yetersiz set stok: Mevcut ${product.set_stok}, Talep ${input.setQuantity}`);
            return null;
          }
        }
      }

      // Create the movement record - the trigger will update product stock
      const { data: newMovement, error } = await supabase
        .from('stock_movements')
        .insert({
          product_id: input.productId,
          movement_type: input.type,
          quantity: input.quantity,
          set_quantity: input.setQuantity || 0,
          movement_date: input.date,
          movement_time: input.time,
          handled_by: profile.full_name,
          notes: input.note || null,
          created_by: userId,
          shelf_id: input.shelfId || null,
        })
        .select('*, products(urun_adi), shelves(name)')
        .single();

      if (error) throw error;

      const result: StockMovementResult = {
        id: newMovement.id,
        productId: newMovement.product_id,
        productName: (newMovement.products as any)?.urun_adi || 'Bilinmeyen Ürün',
        type: newMovement.movement_type as 'giris' | 'cikis',
        quantity: newMovement.quantity,
        setQuantity: newMovement.set_quantity || 0,
        date: newMovement.movement_date,
        time: newMovement.movement_time?.slice(0, 5) || undefined,
        handledBy: newMovement.handled_by,
        note: newMovement.notes || undefined,
        shelfId: newMovement.shelf_id || undefined,
        shelfName: (newMovement.shelves as any)?.name || undefined,
      };

      const setInfo = (input.setQuantity || 0) > 0 ? ` + ${input.setQuantity} set` : '';
      toast.success(
        input.type === 'giris'
          ? `${input.quantity} adet${setInfo} stok girişi yapıldı`
          : `${input.quantity} adet${setInfo} stok çıkışı yapıldı`
      );

      return result;
    } catch (error) {
      console.error('Error creating stock movement:', error);
      toast.error('Hareket eklenirken hata oluştu');
      return null;
    }
  },

  /**
   * Transfer a product from one shelf to another
   * Updates the product's raf_konum and logs the activity
   */
  async transferShelf(input: ShelfTransferInput): Promise<boolean> {
    try {
      const { data: session } = await supabase.auth.getSession();
      const userId = session.session?.user.id;

      if (!userId) {
        toast.error('Oturum bulunamadı. Lütfen tekrar giriş yapın.');
        return false;
      }

      // Update product location
      const { error: updateError } = await supabase
        .from('products')
        .update({ raf_konum: input.toShelfName })
        .eq('id', input.productId);

      if (updateError) throw updateError;

      // Log the transfer in product_activity_log
      const { error: logError } = await supabase
        .from('product_activity_log')
        .insert({
          product_id: input.productId,
          action_type: 'transfer',
          performed_by: userId,
          old_values: { raf_konum: input.fromShelfName },
          new_values: { raf_konum: input.toShelfName },
          note: input.note || `Raf transferi: ${input.fromShelfName} → ${input.toShelfName}`,
        });

      if (logError) {
        console.error('Error logging transfer:', logError);
      }

      toast.success(`Transfer başarılı: ${input.fromShelfName} → ${input.toShelfName}`);
      return true;
    } catch (error) {
      console.error('Error transferring shelf:', error);
      toast.error('Transfer işlemi başarısız oldu');
      return false;
    }
  },

  /**
   * Fetch all stock movements with product and shelf information
   */
  async fetchMovements(): Promise<StockMovementResult[]> {
    try {
      const { data, error } = await supabase
        .from('stock_movements')
        .select('*, products(urun_adi), shelves(name)')
        .eq('is_deleted', false)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map(m => ({
        id: m.id,
        productId: m.product_id,
        productName: (m.products as any)?.urun_adi || 'Bilinmeyen Ürün',
        type: m.movement_type as 'giris' | 'cikis',
        quantity: m.quantity,
        setQuantity: m.set_quantity || 0,
        date: m.movement_date,
        time: m.movement_time?.slice(0, 5) || undefined,
        handledBy: m.handled_by,
        note: m.notes || undefined,
        shelfId: m.shelf_id || undefined,
        shelfName: (m.shelves as any)?.name || undefined,
      }));
    } catch (error) {
      console.error('Error fetching movements:', error);
      toast.error('Hareketler yüklenirken hata oluştu');
      return [];
    }
  },

  /**
   * Get stock summary per shelf for a specific product
   */
  async getShelfStockSummary(shelfId?: string): Promise<{
    shelfId: string;
    shelfName: string;
    totalMevcutStok: number;
    totalSetStok: number;
    productCount: number;
  }[]> {
    try {
      // Get all products grouped by their shelf location
      const { data: products, error } = await supabase
        .from('products')
        .select('id, mevcut_stok, set_stok, raf_konum')
        .eq('is_deleted', false);

      if (error) throw error;

      const { data: shelves } = await supabase
        .from('shelves')
        .select('id, name');

      // Build shelf summary
      const shelfMap: Record<string, {
        shelfId: string;
        shelfName: string;
        totalMevcutStok: number;
        totalSetStok: number;
        productCount: number;
      }> = {};

      (products || []).forEach(p => {
        const shelf = (shelves || []).find(s => s.name === p.raf_konum);
        if (shelf) {
          if (!shelfMap[shelf.id]) {
            shelfMap[shelf.id] = {
              shelfId: shelf.id,
              shelfName: shelf.name,
              totalMevcutStok: 0,
              totalSetStok: 0,
              productCount: 0,
            };
          }
          shelfMap[shelf.id].totalMevcutStok += p.mevcut_stok;
          shelfMap[shelf.id].totalSetStok += p.set_stok;
          shelfMap[shelf.id].productCount += 1;
        }
      });

      let results = Object.values(shelfMap);
      
      if (shelfId) {
        results = results.filter(s => s.shelfId === shelfId);
      }

      return results;
    } catch (error) {
      console.error('Error getting shelf stock summary:', error);
      return [];
    }
  },

  /**
   * Get movement statistics for reports
   */
  async getMovementStats(filters?: {
    dateFrom?: string;
    dateTo?: string;
    productId?: string;
    shelfId?: string;
  }): Promise<{
    totalIn: number;
    totalOut: number;
    totalSetIn: number;
    totalSetOut: number;
    movementCount: number;
  }> {
    try {
      let query = supabase
        .from('stock_movements')
        .select('movement_type, quantity, set_quantity')
        .eq('is_deleted', false);

      if (filters?.dateFrom) {
        query = query.gte('movement_date', filters.dateFrom);
      }
      if (filters?.dateTo) {
        query = query.lte('movement_date', filters.dateTo);
      }
      if (filters?.productId) {
        query = query.eq('product_id', filters.productId);
      }
      if (filters?.shelfId) {
        query = query.eq('shelf_id', filters.shelfId);
      }

      const { data, error } = await query;

      if (error) throw error;

      const stats = (data || []).reduce(
        (acc, m) => {
          if (m.movement_type === 'giris') {
            acc.totalIn += m.quantity;
            acc.totalSetIn += m.set_quantity || 0;
          } else {
            acc.totalOut += m.quantity;
            acc.totalSetOut += m.set_quantity || 0;
          }
          acc.movementCount += 1;
          return acc;
        },
        { totalIn: 0, totalOut: 0, totalSetIn: 0, totalSetOut: 0, movementCount: 0 }
      );

      return stats;
    } catch (error) {
      console.error('Error getting movement stats:', error);
      return { totalIn: 0, totalOut: 0, totalSetIn: 0, totalSetOut: 0, movementCount: 0 };
    }
  },
};
