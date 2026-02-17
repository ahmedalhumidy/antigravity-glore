
-- Add unique partial index on barcode (only non-null, non-deleted)
CREATE UNIQUE INDEX IF NOT EXISTS idx_products_unique_barcode 
ON public.products(barkod) 
WHERE barkod IS NOT NULL AND is_deleted = false;
