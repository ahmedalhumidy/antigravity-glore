
CREATE OR REPLACE FUNCTION public.get_dashboard_stats()
RETURNS TABLE(
  total_products bigint,
  total_stock bigint,
  low_stock_count bigint
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    COUNT(*) as total_products,
    COALESCE(SUM(mevcut_stok), 0) as total_stock,
    COUNT(*) FILTER (WHERE mevcut_stok < min_stok) as low_stock_count
  FROM products 
  WHERE is_deleted = false;
$$;
