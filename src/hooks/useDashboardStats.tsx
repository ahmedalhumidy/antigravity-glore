import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface DashboardStats {
  total_products: number;
  total_stock: number;
  low_stock_count: number;
}

export const useDashboardStats = () => {
  return useQuery({
    queryKey: ['dashboardStats'],
    queryFn: async (): Promise<DashboardStats> => {
      const { data, error } = await supabase.rpc('get_dashboard_stats');
      if (error) throw error;
      const row = (data as any)?.[0];
      return {
        total_products: Number(row?.total_products ?? 0),
        total_stock: Number(row?.total_stock ?? 0),
        low_stock_count: Number(row?.low_stock_count ?? 0),
      };
    },
    staleTime: 1000 * 60 * 2,
  });
};
