import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ProductionUnit {
  id: string;
  barcode: string;
  product_id: string | null;
  current_stage_id: string;
  status: 'waiting' | 'processing' | 'completed' | 'hold';
  last_move_at: string;
  created_at: string;
  product?: { urun_adi: string; urun_kodu: string } | null;
}

export function useProductionUnits(stageId: string | undefined) {
  return useQuery({
    queryKey: ['production-units', stageId],
    enabled: !!stageId,
    refetchInterval: 10000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('production_units' as any)
        .select('*, product:products(urun_adi, urun_kodu)')
        .eq('current_stage_id', stageId!)
        .order('last_move_at', { ascending: false });
      if (error) throw error;
      return data as unknown as ProductionUnit[];
    },
  });
}
