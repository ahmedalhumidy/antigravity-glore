import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ProductionStage {
  id: string;
  code: string;
  name: string;
  order_index: number;
  stage_type: 'process' | 'machine' | 'storage';
  created_at: string;
}

export function useProductionStage(code: string) {
  return useQuery({
    queryKey: ['production-stage', code],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('production_stages' as any)
        .select('*')
        .eq('code', code)
        .single();
      if (error) throw error;
      return data as unknown as ProductionStage;
    },
  });
}

export function useProductionStages() {
  return useQuery({
    queryKey: ['production-stages'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('production_stages' as any)
        .select('*')
        .order('order_index');
      if (error) throw error;
      return data as unknown as ProductionStage[];
    },
  });
}
