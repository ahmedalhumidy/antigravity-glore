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
  ORDER BY
    CASE
      WHEN lower(urun_kodu) = lower(query) THEN 0
      WHEN lower(barkod) = lower(query) THEN 0
      WHEN lower(public.immutable_unaccent(urun_adi)) ILIKE lower(public.immutable_unaccent(query)) || '%' THEN 1
      WHEN lower(urun_kodu) ILIKE lower(query) || '%' THEN 1
      ELSE 2
    END,
    urun_adi
  LIMIT 80;
$$;