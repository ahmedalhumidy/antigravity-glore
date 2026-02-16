
-- Create production_units table
CREATE TABLE public.production_units (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  barcode text NOT NULL UNIQUE,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  current_stage_id uuid NOT NULL REFERENCES public.production_stages(id),
  status text NOT NULL DEFAULT 'waiting',
  last_move_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Index for stage lookups
CREATE INDEX idx_production_units_stage ON public.production_units(current_stage_id);
CREATE INDEX idx_production_units_barcode ON public.production_units(barcode);

-- Enable RLS
ALTER TABLE public.production_units ENABLE ROW LEVEL SECURITY;

-- Authenticated users can view
CREATE POLICY "Authenticated users can view production units"
  ON public.production_units FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Staff can insert
CREATE POLICY "Staff can insert production units"
  ON public.production_units FOR INSERT
  WITH CHECK (has_permission(auth.uid(), 'stock_movements.create'::permission_type));

-- Staff can update
CREATE POLICY "Staff can update production units"
  ON public.production_units FOR UPDATE
  USING (has_permission(auth.uid(), 'stock_movements.create'::permission_type));

-- Admins can delete
CREATE POLICY "Admins can delete production units"
  ON public.production_units FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));
