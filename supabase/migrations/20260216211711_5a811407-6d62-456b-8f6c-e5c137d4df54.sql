
-- Create production_moves table
CREATE TABLE public.production_moves (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  unit_id uuid NOT NULL REFERENCES public.production_units(id),
  from_stage_id uuid NOT NULL REFERENCES public.production_stages(id),
  to_stage_id uuid NOT NULL REFERENCES public.production_stages(id),
  quantity integer NOT NULL DEFAULT 1,
  operator text NOT NULL,
  note text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_production_moves_unit ON public.production_moves(unit_id);
CREATE INDEX idx_production_moves_created ON public.production_moves(created_at DESC);

ALTER TABLE public.production_moves ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view production moves"
  ON public.production_moves FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Staff can insert production moves"
  ON public.production_moves FOR INSERT
  WITH CHECK (has_permission(auth.uid(), 'stock_movements.create'::permission_type));

-- Trigger: auto-update production_units on move insert
CREATE OR REPLACE FUNCTION public.handle_production_move()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.production_units
  SET current_stage_id = NEW.to_stage_id,
      last_move_at = now()
  WHERE id = NEW.unit_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_production_move_update_unit
  AFTER INSERT ON public.production_moves
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_production_move();
