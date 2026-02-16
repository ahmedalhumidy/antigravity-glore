
-- Create production_stages table
CREATE TABLE public.production_stages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  order_index integer NOT NULL DEFAULT 0,
  stage_type text NOT NULL DEFAULT 'process',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.production_stages ENABLE ROW LEVEL SECURITY;

-- Everyone authenticated can view
CREATE POLICY "Authenticated users can view production stages"
  ON public.production_stages FOR SELECT
  USING (true);

-- Admins can manage
CREATE POLICY "Admins can manage production stages"
  ON public.production_stages FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Insert default records
INSERT INTO public.production_stages (code, name, order_index, stage_type) VALUES
  ('BASKI', 'Baskı', 1, 'process'),
  ('KESIM', 'Kesim', 2, 'process'),
  ('FIRIN', 'Fırınlar', 3, 'machine'),
  ('ZIMPARA', 'Zımpara', 4, 'process'),
  ('DEKOR', 'Dekor', 5, 'process'),
  ('TUNEL', 'Tünel Fırın', 6, 'machine'),
  ('PAKET', 'Paketleme', 7, 'process'),
  ('DABO', 'Dabo', 8, 'storage');
