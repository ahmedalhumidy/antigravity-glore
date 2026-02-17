
CREATE OR REPLACE FUNCTION public.rebuild_search_text_batch(codes text[])
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.products
  SET search_text = lower(public.immutable_unaccent(
    coalesce(urun_adi, '') || ' ' || coalesce(urun_kodu, '') || ' ' || coalesce(barkod, '')
  ))
  WHERE urun_kodu = ANY(codes)
    AND is_deleted = false;
END;
$$;
