import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Promotion {
  id: string;
  name: string;
  description: string | null;
  promotion_type: string;
  code: string | null;
  discount_type: string;
  discount_value: number;
  min_order_amount: number | null;
  max_discount_amount: number | null;
  usage_limit: number | null;
  usage_count: number | null;
  starts_at: string | null;
  expires_at: string | null;
  is_active: boolean | null;
  category: string | null;
  store_id: string | null;
  conditions: any;
  created_at: string | null;
  updated_at: string | null;
}

export type PromotionInsert = Omit<Promotion, 'id' | 'created_at' | 'updated_at'>;

export function calculateDiscount(price: number, promo: Promotion) {
  if (!price || price <= 0) return { discount: 0, finalPrice: price };

  let discount = promo.discount_type === 'percentage'
    ? price * (promo.discount_value / 100)
    : promo.discount_value;

  if (promo.max_discount_amount && discount > promo.max_discount_amount) {
    discount = promo.max_discount_amount;
  }

  const finalPrice = Math.max(0, price - discount);
  return { discount: Math.round(discount * 100) / 100, finalPrice: Math.round(finalPrice * 100) / 100 };
}

export function isPromotionValid(promo: Promotion): boolean {
  if (!promo.is_active) return false;
  const now = new Date();
  if (promo.starts_at && new Date(promo.starts_at) > now) return false;
  if (promo.expires_at && new Date(promo.expires_at) < now) return false;
  if (promo.usage_limit != null && (promo.usage_count || 0) >= promo.usage_limit) return false;
  return true;
}

export function usePromotions() {
  const queryClient = useQueryClient();

  const { data: promotions = [], isLoading } = useQuery({
    queryKey: ['admin:promotions:list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('promotion_rules')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Promotion[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (promo: PromotionInsert) => {
      const { error } = await supabase.from('promotion_rules').insert(promo as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin:promotions:list'] });
      queryClient.invalidateQueries({ queryKey: ['active-promotions'] });
      toast.success('Kampanya oluşturuldu');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...data }: Partial<Promotion> & { id: string }) => {
      const { error } = await supabase.from('promotion_rules').update(data as any).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin:promotions:list'] });
      queryClient.invalidateQueries({ queryKey: ['active-promotions'] });
      toast.success('Kampanya güncellendi');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('promotion_rules').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin:promotions:list'] });
      queryClient.invalidateQueries({ queryKey: ['active-promotions'] });
      toast.success('Kampanya silindi');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from('promotion_rules').update({ is_active } as any).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin:promotions:list'] });
      queryClient.invalidateQueries({ queryKey: ['active-promotions'] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  return {
    promotions,
    isLoading,
    createPromotion: createMutation.mutateAsync,
    updatePromotion: updateMutation.mutateAsync,
    deletePromotion: deleteMutation.mutateAsync,
    togglePromotion: toggleMutation.mutateAsync,
    creating: createMutation.isPending,
    updating: updateMutation.isPending,
  };
}

export function useActivePromotions() {
  return useQuery({
    queryKey: ['active-promotions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('promotion_rules')
        .select('*')
        .eq('is_active', true);
      if (error) throw error;
      return (data as Promotion[]).filter(isPromotionValid);
    },
    staleTime: 60_000,
  });
}

export function useValidateCoupon() {
  return useMutation({
    mutationFn: async (code: string) => {
      const { data, error } = await supabase
        .from('promotion_rules')
        .select('*')
        .eq('code', code.toUpperCase())
        .eq('is_active', true)
        .single();
      if (error || !data) throw new Error('Geçersiz kupon kodu');
      const promo = data as Promotion;
      if (!isPromotionValid(promo)) throw new Error('Bu kupon süresi dolmuş veya kullanım limiti aşılmış');
      return promo;
    },
  });
}
