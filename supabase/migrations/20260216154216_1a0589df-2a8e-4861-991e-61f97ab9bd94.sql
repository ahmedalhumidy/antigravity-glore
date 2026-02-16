-- Enable realtime for stock_movements and product_activity_log
ALTER PUBLICATION supabase_realtime ADD TABLE public.stock_movements;
ALTER PUBLICATION supabase_realtime ADD TABLE public.product_activity_log;