
-- Add capacity and zone to shelves
ALTER TABLE public.shelves ADD COLUMN IF NOT EXISTS capacity integer DEFAULT NULL;
ALTER TABLE public.shelves ADD COLUMN IF NOT EXISTS zone text DEFAULT NULL;

-- Create scan_logs table for scan history
CREATE TABLE IF NOT EXISTS public.scan_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  barcode text NOT NULL,
  result text NOT NULL DEFAULT 'found',
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  user_id uuid,
  scanned_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.scan_logs ENABLE ROW LEVEL SECURITY;

-- Policies for scan_logs
CREATE POLICY "Authenticated users can view scan logs"
  ON public.scan_logs FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert scan logs"
  ON public.scan_logs FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
