
-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS unaccent SCHEMA public;
CREATE EXTENSION IF NOT EXISTS pg_trgm SCHEMA public;

-- Create immutable wrapper for unaccent (needed for generated columns)
CREATE OR REPLACE FUNCTION public.immutable_unaccent(text)
RETURNS text
LANGUAGE sql
IMMUTABLE PARALLEL SAFE STRICT
SET search_path = 'public'
AS $$
  SELECT public.unaccent($1);
$$;

-- Add generated search_text column using immutable wrapper
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS search_text text
GENERATED ALWAYS AS (
  lower(
    public.immutable_unaccent(
      coalesce(urun_adi, '') || ' ' ||
      coalesce(urun_kodu, '') || ' ' ||
      coalesce(barkod, '')
    )
  )
) STORED;

-- Create trigram GIN index for fast ILIKE searches
CREATE INDEX IF NOT EXISTS idx_products_search_trgm
ON public.products USING gin (search_text public.gin_trgm_ops);

-- Create RPC search function
CREATE OR REPLACE FUNCTION public.search_products(query text)
RETURNS SETOF public.products
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT *
  FROM public.products
  WHERE is_deleted = false
    AND search_text ILIKE '%' || lower(public.immutable_unaccent(query)) || '%'
  ORDER BY urun_adi
  LIMIT 50;
$$;
