CREATE OR REPLACE FUNCTION get_shelf_product_counts()
RETURNS TABLE(raf_konum text, product_count bigint)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT raf_konum, COUNT(*) as product_count
  FROM products
  WHERE is_deleted = false
  GROUP BY raf_konum;
$$;