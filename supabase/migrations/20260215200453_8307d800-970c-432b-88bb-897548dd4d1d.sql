
-- =============================================
-- STORE PRODUCTS (commercial layer on warehouse)
-- =============================================
CREATE TABLE public.store_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  slug text UNIQUE NOT NULL,
  visible boolean DEFAULT false,
  title_override text,
  description_override text,
  price numeric(12,2),
  compare_price numeric(12,2),
  currency text DEFAULT 'TRY',
  badge text,
  allow_quote boolean DEFAULT true,
  allow_cart boolean DEFAULT true,
  show_stock boolean DEFAULT false,
  min_qty int DEFAULT 1,
  max_qty int,
  order_step int DEFAULT 1,
  sort_order int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.store_products ENABLE ROW LEVEL SECURITY;

-- Public can view visible store products
CREATE POLICY "Anyone can view visible store products"
  ON public.store_products FOR SELECT
  USING (visible = true);

-- Admin/Manager full access
CREATE POLICY "Admins can manage store products"
  ON public.store_products FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

CREATE INDEX idx_store_products_product_id ON public.store_products(product_id);
CREATE INDEX idx_store_products_slug ON public.store_products(slug);
CREATE INDEX idx_store_products_visible ON public.store_products(visible);

-- =============================================
-- GALLERY PRODUCTS (independent promotional catalog)
-- =============================================
CREATE TABLE public.gallery_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  slug text UNIQUE,
  description text,
  images jsonb DEFAULT '[]'::jsonb,
  price_hint numeric(12,2),
  category text,
  tags text[],
  visible boolean DEFAULT false,
  sort_order int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.gallery_products ENABLE ROW LEVEL SECURITY;

-- Public can view visible gallery products
CREATE POLICY "Anyone can view visible gallery products"
  ON public.gallery_products FOR SELECT
  USING (visible = true);

-- Admin/Manager full access
CREATE POLICY "Admins can manage gallery products"
  ON public.gallery_products FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

-- =============================================
-- QUOTE REQUESTS
-- =============================================
CREATE TABLE public.quote_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid,
  name text NOT NULL,
  phone text,
  email text,
  company text,
  notes text,
  status text DEFAULT 'new',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.quote_requests ENABLE ROW LEVEL SECURITY;

-- Anyone can create quote requests (public form)
CREATE POLICY "Anyone can create quote requests"
  ON public.quote_requests FOR INSERT
  WITH CHECK (true);

-- Users can view their own quotes
CREATE POLICY "Users can view their own quotes"
  ON public.quote_requests FOR SELECT
  USING (customer_id = auth.uid());

-- Admin/Manager can manage all quotes
CREATE POLICY "Admins can manage all quotes"
  ON public.quote_requests FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

-- =============================================
-- QUOTE REQUEST ITEMS
-- =============================================
CREATE TABLE public.quote_request_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id uuid NOT NULL REFERENCES public.quote_requests(id) ON DELETE CASCADE,
  product_id uuid,
  gallery_id uuid,
  quantity int DEFAULT 1,
  unit text DEFAULT 'adet',
  note text
);

ALTER TABLE public.quote_request_items ENABLE ROW LEVEL SECURITY;

-- Anyone can insert quote items (public form)
CREATE POLICY "Anyone can create quote items"
  ON public.quote_request_items FOR INSERT
  WITH CHECK (true);

-- Users can view their own quote items
CREATE POLICY "Users can view their own quote items"
  ON public.quote_request_items FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.quote_requests qr 
    WHERE qr.id = quote_request_items.quote_id 
    AND qr.customer_id = auth.uid()
  ));

-- Admin/Manager can manage all quote items
CREATE POLICY "Admins can manage all quote items"
  ON public.quote_request_items FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

CREATE INDEX idx_quote_items_quote_id ON public.quote_request_items(quote_id);
