import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface MoveInput {
  unitId: string;
  fromStageId: string;
  toStageId: string;
  quantity: number;
  operator: string;
  note?: string;
}

export function useProductionMove() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: MoveInput) => {
      const { data, error } = await supabase
        .from('production_moves' as any)
        .insert({
          unit_id: input.unitId,
          from_stage_id: input.fromStageId,
          to_stage_id: input.toStageId,
          quantity: input.quantity,
          operator: input.operator,
          note: input.note || null,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_data, variables) => {
      toast.success('Birim başarıyla taşındı');
      queryClient.invalidateQueries({ queryKey: ['production-units', variables.fromStageId] });
      queryClient.invalidateQueries({ queryKey: ['production-units', variables.toStageId] });
    },
    onError: (error: any) => {
      toast.error('Taşıma hatası: ' + (error.message || 'Bilinmeyen hata'));
    },
  });
}
