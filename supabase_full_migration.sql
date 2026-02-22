-- ============================================================
-- DELUXXS / GLORE - Complete Database Migration
-- Updated: 2026-02-22
-- This script contains EVERYTHING needed to replicate the
-- database on a fresh Supabase project.
-- ============================================================

-- ============================================================
-- STEP 0: EXTENSIONS
-- ============================================================

CREATE EXTENSION IF NOT EXISTS unaccent SCHEMA public;
CREATE EXTENSION IF NOT EXISTS pg_trgm SCHEMA public;

-- ============================================================
-- STEP 1: ENUMS
-- ============================================================

DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM (
    'admin', 'employee', 'manager', 'staff', 'viewer', 'merchant', 'customer'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.permission_type AS ENUM (
    'products.view', 'products.create', 'products.update', 'products.delete',
    'stock_movements.view', 'stock_movements.create',
    'users.view', 'users.manage',
    'logs.view', 'reports.view',
    'settings.view', 'settings.manage',
    'security.view'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- STEP 2: FUNCTIONS (before tables, some are used in triggers)
-- ============================================================

CREATE OR REPLACE FUNCTION public.update_updated_at_trigger()
  RETURNS trigger LANGUAGE plpgsql
  SET search_path TO 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
  RETURNS trigger LANGUAGE plpgsql
  SET search_path TO 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_order_number()
  RETURNS text LANGUAGE plpgsql
  SET search_path TO 'public'
AS $$
DECLARE
  new_number text;
  prefix text := 'GL';
  current_date_str text := to_char(now(), 'YYMMDD');
  random_suffix text := lpad(floor(random() * 10000)::text, 4, '0');
BEGIN
  new_number := prefix || current_date_str || random_suffix;
  RETURN new_number;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_order_number()
  RETURNS trigger LANGUAGE plpgsql
  SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.order_number IS NULL OR NEW.order_number = '' THEN
    NEW.order_number := public.generate_order_number();
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
  RETURNS boolean LANGUAGE sql
  STABLE SECURITY DEFINER
  SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.has_permission(_user_id uuid, _permission permission_type)
  RETURNS boolean LANGUAGE sql
  STABLE SECURITY DEFINER
  SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.role_permissions rp ON ur.role = rp.role
    WHERE ur.user_id = _user_id AND rp.permission = _permission
  )
$$;

CREATE OR REPLACE FUNCTION public.get_user_role(_user_id uuid)
  RETURNS app_role LANGUAGE sql
  STABLE SECURITY DEFINER
  SET search_path TO 'public'
AS $$
  SELECT role FROM public.user_roles WHERE user_id = _user_id LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
  RETURNS trigger LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'staff');

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_last_sign_in()
  RETURNS trigger LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.profiles
  SET last_sign_in = now()
  WHERE user_id = NEW.id;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_product_stock()
  RETURNS trigger LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.movement_type = 'giris' THEN
    UPDATE public.products SET
      mevcut_stok = mevcut_stok + NEW.quantity,
      set_stok = set_stok + COALESCE(NEW.set_quantity, 0),
      toplam_giris = toplam_giris + NEW.quantity,
      son_islem_tarihi = NEW.movement_date,
      uyari = (mevcut_stok + NEW.quantity) < min_stok,
      updated_at = now()
    WHERE id = NEW.product_id;
  ELSE
    UPDATE public.products SET
      mevcut_stok = mevcut_stok - NEW.quantity,
      set_stok = GREATEST(0, set_stok - COALESCE(NEW.set_quantity, 0)),
      toplam_cikis = toplam_cikis + NEW.quantity,
      son_islem_tarihi = NEW.movement_date,
      uyari = (mevcut_stok - NEW.quantity) < min_stok,
      updated_at = now()
    WHERE id = NEW.product_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.log_product_activity()
  RETURNS trigger LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.product_activity_log (product_id, action_type, performed_by, new_values)
    VALUES (NEW.id, 'created', auth.uid(), to_jsonb(NEW));
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.is_deleted = true AND OLD.is_deleted = false THEN
      INSERT INTO public.product_activity_log (product_id, action_type, performed_by, old_values)
      VALUES (NEW.id, 'archived', auth.uid(), to_jsonb(OLD));
    ELSIF NEW.is_deleted = false AND OLD.is_deleted = true THEN
      INSERT INTO public.product_activity_log (product_id, action_type, performed_by, new_values)
      VALUES (NEW.id, 'restored', auth.uid(), to_jsonb(NEW));
    ELSE
      INSERT INTO public.product_activity_log (product_id, action_type, performed_by, old_values, new_values)
      VALUES (NEW.id, 'updated', auth.uid(), to_jsonb(OLD), to_jsonb(NEW));
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_production_move()
  RETURNS trigger LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.production_units
  SET current_stage_id = NEW.to_stage_id,
      last_move_at = now()
  WHERE id = NEW.unit_id;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.immutable_unaccent(text)
  RETURNS text LANGUAGE sql
  IMMUTABLE PARALLEL SAFE STRICT
  SET search_path TO 'public'
AS $$
  SELECT public.unaccent($1);
$$;

CREATE OR REPLACE FUNCTION public.get_dashboard_stats()
  RETURNS TABLE(total_products bigint, total_stock bigint, low_stock_count bigint)
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

CREATE OR REPLACE FUNCTION public.get_shelf_product_counts()
  RETURNS TABLE(raf_konum text, product_count bigint)
  LANGUAGE sql STABLE SECURITY DEFINER
  SET search_path TO 'public'
AS $$
  SELECT raf_konum, COUNT(*) as product_count
  FROM products
  WHERE is_deleted = false
  GROUP BY raf_konum;
$$;

CREATE OR REPLACE FUNCTION public.rebuild_search_text_batch(codes text[])
  RETURNS void LANGUAGE plpgsql
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

-- search_products with stock-priority ordering
CREATE OR REPLACE FUNCTION public.search_products(query text)
  RETURNS SETOF public.products
  LANGUAGE sql STABLE SECURITY DEFINER
  SET search_path TO 'public'
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
    CASE WHEN mevcut_stok > 0 THEN 0 ELSE 1 END,
    urun_adi
  LIMIT 80;
$$;

-- ============================================================
-- STEP 3: TABLES
-- ============================================================

-- 3.1 Organizations
CREATE TABLE IF NOT EXISTS public.organizations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL DEFAULT 'GLORE',
  currency text NOT NULL DEFAULT 'TRY',
  timezone text NOT NULL DEFAULT 'Europe/Istanbul',
  date_format text NOT NULL DEFAULT 'DD.MM.YYYY',
  default_min_stock integer NOT NULL DEFAULT 5,
  default_warning_threshold integer NOT NULL DEFAULT 10,
  is_active boolean NOT NULL DEFAULT true,
  logo_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 3.2 Profiles
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE,
  full_name text NOT NULL,
  avatar_url text,
  phone text,
  user_type text DEFAULT 'customer',
  is_disabled boolean NOT NULL DEFAULT false,
  last_sign_in timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 3.3 User Roles
CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  role app_role NOT NULL DEFAULT 'employee'
);

-- 3.4 Role Permissions
CREATE TABLE IF NOT EXISTS public.role_permissions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  role app_role NOT NULL,
  permission permission_type NOT NULL
);

-- 3.5 Stores
CREATE TABLE IF NOT EXISTS public.stores (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id uuid NOT NULL,
  store_name text NOT NULL,
  store_slug text NOT NULL UNIQUE,
  logo_url text,
  description text,
  contact_email text,
  contact_phone text,
  address text,
  city text,
  is_verified boolean DEFAULT false,
  is_active boolean DEFAULT true,
  commission_rate numeric DEFAULT 10.00,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 3.6 Shelves
CREATE TABLE IF NOT EXISTS public.shelves (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  description text,
  zone text,
  capacity integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 3.7 Products
CREATE TABLE IF NOT EXISTS public.products (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  urun_kodu text NOT NULL,
  urun_adi text NOT NULL,
  barkod text,
  raf_konum text NOT NULL,
  acilis_stok integer NOT NULL DEFAULT 0,
  toplam_giris integer NOT NULL DEFAULT 0,
  toplam_cikis integer NOT NULL DEFAULT 0,
  mevcut_stok integer NOT NULL DEFAULT 0,
  set_stok integer NOT NULL DEFAULT 0,
  min_stok integer NOT NULL DEFAULT 5,
  uyari boolean NOT NULL DEFAULT false,
  son_islem_tarihi date,
  notes text,
  is_deleted boolean NOT NULL DEFAULT false,
  deleted_at timestamptz,
  deleted_by uuid,
  -- Marketplace fields
  store_id uuid,
  price numeric DEFAULT 0,
  sale_price numeric,
  is_published boolean DEFAULT false,
  images jsonb DEFAULT '[]'::jsonb,
  product_description text,
  category text,
  weight numeric DEFAULT 0,
  -- Search field
  search_text text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 3.8 Stock Movements
CREATE TABLE IF NOT EXISTS public.stock_movements (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id uuid NOT NULL,
  movement_type text NOT NULL,
  quantity integer NOT NULL,
  set_quantity integer NOT NULL DEFAULT 0,
  movement_date date NOT NULL DEFAULT CURRENT_DATE,
  movement_time time NOT NULL DEFAULT CURRENT_TIME,
  handled_by text NOT NULL,
  notes text,
  shelf_id uuid,
  created_by uuid,
  is_deleted boolean NOT NULL DEFAULT false,
  deleted_at timestamptz,
  deleted_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT stock_movements_quantity_check CHECK (quantity >= 0 AND (quantity > 0 OR set_quantity > 0))
);

-- 3.9 Product Activity Log
CREATE TABLE IF NOT EXISTS public.product_activity_log (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id uuid NOT NULL,
  action_type text NOT NULL,
  performed_by uuid,
  old_values jsonb,
  new_values jsonb,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 3.10 Product Media
CREATE TABLE IF NOT EXISTS public.product_media (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id uuid NOT NULL,
  url text NOT NULL,
  media_type text NOT NULL DEFAULT 'image',
  alt_text text,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- 3.11 Audit Logs
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  action_type text NOT NULL,
  performed_by uuid,
  target_user_id uuid,
  target_product_id uuid,
  details jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 3.12 Notifications
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  type text NOT NULL DEFAULT 'info',
  category text NOT NULL DEFAULT 'system',
  action_url text,
  metadata jsonb DEFAULT '{}'::jsonb,
  is_read boolean NOT NULL DEFAULT false,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 3.13 Login Attempts
CREATE TABLE IF NOT EXISTS public.login_attempts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid,
  email text NOT NULL,
  success boolean NOT NULL DEFAULT false,
  ip_address text,
  user_agent text,
  failure_reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 3.14 User Sessions
CREATE TABLE IF NOT EXISTS public.user_sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  session_token text NOT NULL,
  ip_address text,
  user_agent text,
  is_active boolean NOT NULL DEFAULT true,
  expires_at timestamptz,
  last_activity timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 3.15 System Settings
CREATE TABLE IF NOT EXISTS public.system_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  setting_key text NOT NULL,
  setting_value jsonb NOT NULL DEFAULT '{}'::jsonb,
  organization_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 3.16 Feature Flags
CREATE TABLE IF NOT EXISTS public.feature_flags (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  module_key text NOT NULL,
  module_name text NOT NULL,
  description text,
  is_enabled boolean NOT NULL DEFAULT false,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 3.17 Custom Field Definitions
CREATE TABLE IF NOT EXISTS public.custom_field_definitions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  field_key text NOT NULL,
  field_label text NOT NULL,
  field_type text NOT NULL DEFAULT 'text',
  entity_type text NOT NULL DEFAULT 'product',
  is_required boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  display_order integer NOT NULL DEFAULT 0,
  default_value text,
  placeholder text,
  options jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 3.18 Custom Field Values
CREATE TABLE IF NOT EXISTS public.custom_field_values (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  field_definition_id uuid NOT NULL,
  entity_id uuid NOT NULL,
  entity_type text NOT NULL DEFAULT 'product',
  value jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 3.19 Automation Rules
CREATE TABLE IF NOT EXISTS public.automation_rules (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  description text,
  trigger_type text NOT NULL,
  action_type text NOT NULL,
  condition_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  action_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT false,
  execution_count integer NOT NULL DEFAULT 0,
  last_executed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 3.20 Automation Log
CREATE TABLE IF NOT EXISTS public.automation_log (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  rule_id uuid NOT NULL,
  result text NOT NULL DEFAULT 'success',
  error_message text,
  trigger_data jsonb,
  executed_at timestamptz NOT NULL DEFAULT now()
);

-- 3.21 Workflow Definitions
CREATE TABLE IF NOT EXISTS public.workflow_definitions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  description text,
  entity_type text NOT NULL DEFAULT 'stock_movement',
  is_active boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 3.22 Workflow Steps
CREATE TABLE IF NOT EXISTS public.workflow_steps (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workflow_id uuid NOT NULL,
  name text NOT NULL,
  step_order integer DEFAULT 0,
  is_initial boolean DEFAULT false,
  is_final boolean DEFAULT false,
  requires_approval boolean DEFAULT false,
  approval_role text,
  color text DEFAULT '#6366f1',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 3.23 Workflow Transitions
CREATE TABLE IF NOT EXISTS public.workflow_transitions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workflow_id uuid NOT NULL,
  from_step_id uuid NOT NULL,
  to_step_id uuid NOT NULL,
  condition_label text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 3.24 Workflow Instances
CREATE TABLE IF NOT EXISTS public.workflow_instances (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workflow_id uuid NOT NULL,
  entity_id uuid NOT NULL,
  entity_type text NOT NULL,
  current_step_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'active',
  started_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 3.25 Workflow Instance History
CREATE TABLE IF NOT EXISTS public.workflow_instance_history (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  instance_id uuid NOT NULL,
  from_step_id uuid,
  to_step_id uuid NOT NULL,
  action text NOT NULL DEFAULT 'transition',
  performed_by uuid,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 3.26 Addresses
CREATE TABLE IF NOT EXISTS public.addresses (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  label text DEFAULT 'home',
  full_name text NOT NULL,
  phone text NOT NULL,
  city text NOT NULL,
  district text,
  street_address text NOT NULL,
  postal_code text,
  is_default boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 3.27 Shipping Carriers
CREATE TABLE IF NOT EXISTS public.shipping_carriers (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  logo_url text,
  tracking_url_template text,
  is_active boolean DEFAULT true,
  base_fee numeric DEFAULT 0,
  per_kg_fee numeric DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 3.28 Shipping Zones
CREATE TABLE IF NOT EXISTS public.shipping_zones (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  carrier_id uuid,
  city text NOT NULL,
  delivery_days integer DEFAULT 3,
  fee_override numeric,
  created_at timestamptz DEFAULT now()
);

-- 3.29 Cart Items
CREATE TABLE IF NOT EXISTS public.cart_items (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  product_id uuid,
  quantity integer NOT NULL DEFAULT 1,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 3.30 Wishlist
CREATE TABLE IF NOT EXISTS public.wishlist (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  product_id uuid,
  created_at timestamptz DEFAULT now()
);

-- 3.31 Orders
CREATE TABLE IF NOT EXISTS public.orders (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_number text NOT NULL DEFAULT '',
  customer_id uuid NOT NULL,
  shipping_address_id uuid,
  status text DEFAULT 'pending',
  payment_method text,
  payment_status text DEFAULT 'pending',
  shipping_method text DEFAULT 'courier',
  carrier_id uuid,
  tracking_number text,
  subtotal numeric DEFAULT 0,
  shipping_fee numeric DEFAULT 0,
  total_amount numeric DEFAULT 0,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 3.32 Order Items
CREATE TABLE IF NOT EXISTS public.order_items (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id uuid,
  product_id uuid,
  store_id uuid,
  quantity integer NOT NULL DEFAULT 1,
  unit_price numeric NOT NULL,
  total_price numeric NOT NULL,
  status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now()
);

-- 3.33 Order Notes
CREATE TABLE IF NOT EXISTS public.order_notes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id uuid NOT NULL,
  user_id uuid NOT NULL,
  note text NOT NULL,
  is_internal boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- 3.34 Payments
CREATE TABLE IF NOT EXISTS public.payments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id uuid,
  method text NOT NULL,
  amount numeric NOT NULL,
  status text DEFAULT 'pending',
  transaction_id text,
  receipt_url text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 3.35 Reviews
CREATE TABLE IF NOT EXISTS public.reviews (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id uuid,
  customer_id uuid NOT NULL,
  order_id uuid,
  rating integer NOT NULL,
  comment text,
  is_verified_purchase boolean DEFAULT false,
  is_approved boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 3.36 Review Votes
CREATE TABLE IF NOT EXISTS public.review_votes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  review_id uuid NOT NULL,
  user_id uuid NOT NULL,
  vote_type text NOT NULL DEFAULT 'helpful',
  created_at timestamptz DEFAULT now()
);

-- 3.37 Promotion Rules
CREATE TABLE IF NOT EXISTS public.promotion_rules (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  description text,
  promotion_type text NOT NULL DEFAULT 'coupon',
  discount_type text NOT NULL DEFAULT 'percentage',
  discount_value numeric NOT NULL DEFAULT 0,
  code text,
  category text,
  store_id uuid,
  min_order_amount numeric DEFAULT 0,
  max_discount_amount numeric,
  usage_limit integer,
  usage_count integer DEFAULT 0,
  starts_at timestamptz,
  expires_at timestamptz,
  is_active boolean DEFAULT true,
  conditions jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 3.38 Scan Logs
CREATE TABLE IF NOT EXISTS public.scan_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  barcode text NOT NULL,
  product_id uuid,
  user_id uuid,
  result text NOT NULL DEFAULT 'found',
  scanned_at timestamptz NOT NULL DEFAULT now()
);

-- 3.39 Store Products (Storefront layer)
CREATE TABLE IF NOT EXISTS public.store_products (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id uuid NOT NULL,
  slug text NOT NULL,
  visible boolean DEFAULT false,
  price numeric,
  compare_price numeric,
  title_override text,
  description_override text,
  category text,
  badge text,
  currency text DEFAULT 'TRY',
  allow_quote boolean DEFAULT true,
  allow_cart boolean DEFAULT true,
  show_stock boolean DEFAULT false,
  min_qty integer DEFAULT 1,
  max_qty integer,
  order_step integer DEFAULT 1,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- 3.40 Gallery Products
CREATE TABLE IF NOT EXISTS public.gallery_products (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  slug text,
  description text,
  category text,
  images jsonb DEFAULT '[]'::jsonb,
  tags text[],
  price_hint numeric,
  visible boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- 3.41 Quote Requests
CREATE TABLE IF NOT EXISTS public.quote_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  phone text,
  email text,
  company text,
  notes text,
  customer_id uuid,
  status text DEFAULT 'new',
  created_at timestamptz DEFAULT now()
);

-- 3.42 Quote Request Items
CREATE TABLE IF NOT EXISTS public.quote_request_items (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quote_id uuid NOT NULL,
  product_id uuid,
  gallery_id uuid,
  quantity integer DEFAULT 1,
  unit text DEFAULT 'adet',
  note text
);

-- 3.43 Production Stages
CREATE TABLE IF NOT EXISTS public.production_stages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code text NOT NULL,
  name text NOT NULL,
  stage_type text NOT NULL DEFAULT 'process',
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 3.44 Production Units
CREATE TABLE IF NOT EXISTS public.production_units (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  barcode text NOT NULL,
  product_id uuid,
  current_stage_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'waiting',
  last_move_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 3.45 Production Moves
CREATE TABLE IF NOT EXISTS public.production_moves (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  unit_id uuid NOT NULL,
  from_stage_id uuid NOT NULL,
  to_stage_id uuid NOT NULL,
  operator text NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- STEP 4: FOREIGN KEYS
-- ============================================================

-- Profiles
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- User Roles
ALTER TABLE public.user_roles
  ADD CONSTRAINT user_roles_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Products
ALTER TABLE public.products
  ADD CONSTRAINT products_deleted_by_fkey FOREIGN KEY (deleted_by) REFERENCES public.profiles(user_id);
ALTER TABLE public.products
  ADD CONSTRAINT products_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id);

-- Stock Movements
ALTER TABLE public.stock_movements
  ADD CONSTRAINT stock_movements_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id);
ALTER TABLE public.stock_movements
  ADD CONSTRAINT stock_movements_shelf_id_fkey FOREIGN KEY (shelf_id) REFERENCES public.shelves(id);
ALTER TABLE public.stock_movements
  ADD CONSTRAINT stock_movements_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(user_id);
ALTER TABLE public.stock_movements
  ADD CONSTRAINT stock_movements_deleted_by_fkey FOREIGN KEY (deleted_by) REFERENCES public.profiles(user_id);

-- Product Activity Log
ALTER TABLE public.product_activity_log
  ADD CONSTRAINT product_activity_log_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id);
ALTER TABLE public.product_activity_log
  ADD CONSTRAINT product_activity_log_performed_by_fkey FOREIGN KEY (performed_by) REFERENCES public.profiles(user_id);

-- Product Media
ALTER TABLE public.product_media
  ADD CONSTRAINT product_media_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id);

-- Audit Logs
ALTER TABLE public.audit_logs
  ADD CONSTRAINT audit_logs_performed_by_fkey FOREIGN KEY (performed_by) REFERENCES public.profiles(user_id);

-- Notifications
ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(user_id);

-- Login Attempts
ALTER TABLE public.login_attempts
  ADD CONSTRAINT login_attempts_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(user_id);

-- User Sessions
ALTER TABLE public.user_sessions
  ADD CONSTRAINT user_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(user_id);

-- System Settings
ALTER TABLE public.system_settings
  ADD CONSTRAINT system_settings_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id);

-- Custom Field Values
ALTER TABLE public.custom_field_values
  ADD CONSTRAINT custom_field_values_field_definition_id_fkey FOREIGN KEY (field_definition_id) REFERENCES public.custom_field_definitions(id);

-- Automation Log
ALTER TABLE public.automation_log
  ADD CONSTRAINT automation_log_rule_id_fkey FOREIGN KEY (rule_id) REFERENCES public.automation_rules(id);

-- Workflow Steps
ALTER TABLE public.workflow_steps
  ADD CONSTRAINT workflow_steps_workflow_id_fkey FOREIGN KEY (workflow_id) REFERENCES public.workflow_definitions(id);

-- Workflow Transitions
ALTER TABLE public.workflow_transitions
  ADD CONSTRAINT workflow_transitions_workflow_id_fkey FOREIGN KEY (workflow_id) REFERENCES public.workflow_definitions(id);
ALTER TABLE public.workflow_transitions
  ADD CONSTRAINT workflow_transitions_from_step_id_fkey FOREIGN KEY (from_step_id) REFERENCES public.workflow_steps(id);
ALTER TABLE public.workflow_transitions
  ADD CONSTRAINT workflow_transitions_to_step_id_fkey FOREIGN KEY (to_step_id) REFERENCES public.workflow_steps(id);

-- Workflow Instances
ALTER TABLE public.workflow_instances
  ADD CONSTRAINT workflow_instances_workflow_id_fkey FOREIGN KEY (workflow_id) REFERENCES public.workflow_definitions(id);
ALTER TABLE public.workflow_instances
  ADD CONSTRAINT workflow_instances_current_step_id_fkey FOREIGN KEY (current_step_id) REFERENCES public.workflow_steps(id);

-- Workflow Instance History
ALTER TABLE public.workflow_instance_history
  ADD CONSTRAINT workflow_instance_history_instance_id_fkey FOREIGN KEY (instance_id) REFERENCES public.workflow_instances(id);
ALTER TABLE public.workflow_instance_history
  ADD CONSTRAINT workflow_instance_history_from_step_id_fkey FOREIGN KEY (from_step_id) REFERENCES public.workflow_steps(id);
ALTER TABLE public.workflow_instance_history
  ADD CONSTRAINT workflow_instance_history_to_step_id_fkey FOREIGN KEY (to_step_id) REFERENCES public.workflow_steps(id);

-- Shipping Zones
ALTER TABLE public.shipping_zones
  ADD CONSTRAINT shipping_zones_carrier_id_fkey FOREIGN KEY (carrier_id) REFERENCES public.shipping_carriers(id);

-- Cart Items
ALTER TABLE public.cart_items
  ADD CONSTRAINT cart_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id);

-- Wishlist
ALTER TABLE public.wishlist
  ADD CONSTRAINT wishlist_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id);

-- Orders
ALTER TABLE public.orders
  ADD CONSTRAINT orders_shipping_address_id_fkey FOREIGN KEY (shipping_address_id) REFERENCES public.addresses(id);
ALTER TABLE public.orders
  ADD CONSTRAINT orders_carrier_id_fkey FOREIGN KEY (carrier_id) REFERENCES public.shipping_carriers(id);

-- Order Items
ALTER TABLE public.order_items
  ADD CONSTRAINT order_items_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id);
ALTER TABLE public.order_items
  ADD CONSTRAINT order_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id);
ALTER TABLE public.order_items
  ADD CONSTRAINT order_items_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id);

-- Order Notes
ALTER TABLE public.order_notes
  ADD CONSTRAINT order_notes_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id);

-- Payments
ALTER TABLE public.payments
  ADD CONSTRAINT payments_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id);

-- Reviews
ALTER TABLE public.reviews
  ADD CONSTRAINT reviews_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id);
ALTER TABLE public.reviews
  ADD CONSTRAINT reviews_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id);

-- Review Votes
ALTER TABLE public.review_votes
  ADD CONSTRAINT review_votes_review_id_fkey FOREIGN KEY (review_id) REFERENCES public.reviews(id);

-- Promotion Rules
ALTER TABLE public.promotion_rules
  ADD CONSTRAINT promotion_rules_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id);

-- Scan Logs
ALTER TABLE public.scan_logs
  ADD CONSTRAINT scan_logs_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id);

-- Store Products
ALTER TABLE public.store_products
  ADD CONSTRAINT store_products_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id);

-- Quote Request Items
ALTER TABLE public.quote_request_items
  ADD CONSTRAINT quote_request_items_quote_id_fkey FOREIGN KEY (quote_id) REFERENCES public.quote_requests(id);

-- Production Units
ALTER TABLE public.production_units
  ADD CONSTRAINT production_units_current_stage_id_fkey FOREIGN KEY (current_stage_id) REFERENCES public.production_stages(id);
ALTER TABLE public.production_units
  ADD CONSTRAINT production_units_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id);

-- Production Moves
ALTER TABLE public.production_moves
  ADD CONSTRAINT production_moves_unit_id_fkey FOREIGN KEY (unit_id) REFERENCES public.production_units(id);
ALTER TABLE public.production_moves
  ADD CONSTRAINT production_moves_from_stage_id_fkey FOREIGN KEY (from_stage_id) REFERENCES public.production_stages(id);
ALTER TABLE public.production_moves
  ADD CONSTRAINT production_moves_to_stage_id_fkey FOREIGN KEY (to_stage_id) REFERENCES public.production_stages(id);

-- ============================================================
-- STEP 5: ENABLE RLS ON ALL TABLES
-- ============================================================

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shelves ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_field_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_field_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_transitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_instance_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipping_carriers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipping_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wishlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promotion_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scan_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gallery_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quote_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quote_request_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.production_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.production_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.production_moves ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- STEP 6: RLS POLICIES
-- ============================================================

-- ========== ORGANIZATIONS ==========
CREATE POLICY "Admins can manage organizations" ON public.organizations FOR ALL
  USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Authenticated users can view organizations" ON public.organizations FOR SELECT
  USING (true);

-- ========== PROFILES ==========
CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE
  USING (auth.uid() = user_id);
CREATE POLICY "Users with permission can view all profiles" ON public.profiles FOR SELECT
  USING (has_permission(auth.uid(), 'users.view') OR auth.uid() = user_id);
CREATE POLICY "Users with permission can delete profiles" ON public.profiles FOR DELETE
  USING (has_permission(auth.uid(), 'users.manage'));

-- ========== USER ROLES ==========
CREATE POLICY "Users can view their own roles" ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "Users with permission can view all user roles" ON public.user_roles FOR SELECT
  USING (has_permission(auth.uid(), 'users.view') OR auth.uid() = user_id);
CREATE POLICY "Users with permission can insert user roles" ON public.user_roles FOR INSERT
  WITH CHECK (has_permission(auth.uid(), 'users.manage'));
CREATE POLICY "Users with permission can update user roles" ON public.user_roles FOR UPDATE
  USING (has_permission(auth.uid(), 'users.manage'));
CREATE POLICY "Users with permission can delete user roles" ON public.user_roles FOR DELETE
  USING (has_permission(auth.uid(), 'users.manage'));

-- ========== ROLE PERMISSIONS ==========
CREATE POLICY "Authenticated users can view role permissions" ON public.role_permissions FOR SELECT
  USING (true);

-- ========== STORES ==========
CREATE POLICY "Anyone can view active stores" ON public.stores FOR SELECT
  USING (is_active = true);
CREATE POLICY "Merchants can manage their own stores" ON public.stores FOR ALL
  USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE POLICY "Admins can manage all stores" ON public.stores FOR ALL
  USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

-- ========== SHELVES ==========
CREATE POLICY "Authenticated users can view shelves" ON public.shelves FOR SELECT
  USING (true);
CREATE POLICY "Users with permission can insert shelves" ON public.shelves FOR INSERT
  WITH CHECK (has_permission(auth.uid(), 'products.create'));
CREATE POLICY "Users with permission can update shelves" ON public.shelves FOR UPDATE
  USING (has_permission(auth.uid(), 'products.update'));
CREATE POLICY "Users with permission can delete shelves" ON public.shelves FOR DELETE
  USING (has_permission(auth.uid(), 'products.delete'));

-- ========== PRODUCTS ==========
CREATE POLICY "Authenticated users can view products" ON public.products FOR SELECT
  USING (true);
CREATE POLICY "Users with permission can insert products" ON public.products FOR INSERT
  WITH CHECK (has_permission(auth.uid(), 'products.create'));
CREATE POLICY "Users with permission can update products" ON public.products FOR UPDATE
  USING (has_permission(auth.uid(), 'products.update'));
CREATE POLICY "Users with permission can delete products" ON public.products FOR DELETE
  USING (has_permission(auth.uid(), 'products.delete'));

-- ========== STOCK MOVEMENTS ==========
CREATE POLICY "Authenticated users can view movements" ON public.stock_movements FOR SELECT
  USING (true);
CREATE POLICY "Users with permission can insert movements" ON public.stock_movements FOR INSERT
  WITH CHECK (has_permission(auth.uid(), 'stock_movements.create'));
CREATE POLICY "Users with permission can update movements" ON public.stock_movements FOR UPDATE
  USING (has_permission(auth.uid(), 'stock_movements.create'));
CREATE POLICY "Users with permission can delete movements" ON public.stock_movements FOR DELETE
  USING (has_role(auth.uid(), 'admin'));

-- ========== PRODUCT ACTIVITY LOG ==========
CREATE POLICY "Users with permission can view product activity" ON public.product_activity_log FOR SELECT
  USING (has_permission(auth.uid(), 'products.view'));
CREATE POLICY "Users with product permission can insert activity" ON public.product_activity_log FOR INSERT
  WITH CHECK (has_permission(auth.uid(), 'products.update') OR has_permission(auth.uid(), 'products.create'));

-- ========== PRODUCT MEDIA ==========
CREATE POLICY "Anyone can view product media" ON public.product_media FOR SELECT
  USING (true);
CREATE POLICY "Product managers can manage media" ON public.product_media FOR ALL
  USING (has_permission(auth.uid(), 'products.update')) WITH CHECK (has_permission(auth.uid(), 'products.update'));

-- ========== AUDIT LOGS ==========
CREATE POLICY "Users with permission can view audit logs" ON public.audit_logs FOR SELECT
  USING (has_permission(auth.uid(), 'logs.view'));
CREATE POLICY "Users with permission can insert audit logs" ON public.audit_logs FOR INSERT
  WITH CHECK (has_permission(auth.uid(), 'logs.view'));

-- ========== NOTIFICATIONS ==========
CREATE POLICY "Users can view their own notifications" ON public.notifications FOR SELECT
  USING (user_id = auth.uid());
CREATE POLICY "Users can update their own notifications" ON public.notifications FOR UPDATE
  USING (user_id = auth.uid());
CREATE POLICY "Managers can insert notifications" ON public.notifications FOR INSERT
  WITH CHECK (has_permission(auth.uid(), 'users.manage') OR user_id = auth.uid());

-- ========== LOGIN ATTEMPTS ==========
CREATE POLICY "Admins can view login attempts" ON public.login_attempts FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

-- ========== USER SESSIONS ==========
CREATE POLICY "Users can view their own sessions" ON public.user_sessions FOR SELECT
  USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can manage their own sessions" ON public.user_sessions FOR ALL
  USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'))
  WITH CHECK (user_id = auth.uid() OR has_role(auth.uid(), 'admin'));

-- ========== SYSTEM SETTINGS ==========
CREATE POLICY "Authenticated users can view system settings" ON public.system_settings FOR SELECT
  USING (true);
CREATE POLICY "Admins can manage system settings" ON public.system_settings FOR ALL
  USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

-- ========== FEATURE FLAGS ==========
CREATE POLICY "Authenticated users can view feature flags" ON public.feature_flags FOR SELECT
  USING (true);
CREATE POLICY "Admins can manage feature flags" ON public.feature_flags FOR ALL
  USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

-- ========== CUSTOM FIELD DEFINITIONS ==========
CREATE POLICY "Authenticated users can view field definitions" ON public.custom_field_definitions FOR SELECT
  USING (true);
CREATE POLICY "Admins can manage field definitions" ON public.custom_field_definitions FOR ALL
  USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

-- ========== CUSTOM FIELD VALUES ==========
CREATE POLICY "Users with product view can read field values" ON public.custom_field_values FOR SELECT
  USING (has_permission(auth.uid(), 'products.view'));
CREATE POLICY "Users with product create can insert field values" ON public.custom_field_values FOR INSERT
  WITH CHECK (has_permission(auth.uid(), 'products.create') OR has_permission(auth.uid(), 'products.update'));
CREATE POLICY "Users with product update can update field values" ON public.custom_field_values FOR UPDATE
  USING (has_permission(auth.uid(), 'products.update'));
CREATE POLICY "Users with product delete can delete field values" ON public.custom_field_values FOR DELETE
  USING (has_permission(auth.uid(), 'products.delete'));

-- ========== AUTOMATION RULES ==========
CREATE POLICY "Anyone can view automation rules" ON public.automation_rules FOR SELECT
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admins can manage automation rules" ON public.automation_rules FOR ALL
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'));

-- ========== AUTOMATION LOG ==========
CREATE POLICY "Anyone can view automation log" ON public.automation_log FOR SELECT
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "System can insert automation log" ON public.automation_log FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- ========== WORKFLOW DEFINITIONS ==========
CREATE POLICY "Anyone can view active workflows" ON public.workflow_definitions FOR SELECT
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admins can manage workflow definitions" ON public.workflow_definitions FOR ALL
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'));

-- ========== WORKFLOW STEPS ==========
CREATE POLICY "Anyone can view workflow steps" ON public.workflow_steps FOR SELECT
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admins can manage workflow steps" ON public.workflow_steps FOR ALL
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'));

-- ========== WORKFLOW TRANSITIONS ==========
CREATE POLICY "Anyone can view workflow transitions" ON public.workflow_transitions FOR SELECT
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admins can manage workflow transitions" ON public.workflow_transitions FOR ALL
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'));

-- ========== WORKFLOW INSTANCES ==========
CREATE POLICY "Anyone can view workflow instances" ON public.workflow_instances FOR SELECT
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can create workflow instances" ON public.workflow_instances FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Admins can manage workflow instances" ON public.workflow_instances FOR UPDATE
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'));

-- ========== WORKFLOW INSTANCE HISTORY ==========
CREATE POLICY "Anyone can view workflow history" ON public.workflow_instance_history FOR SELECT
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can add workflow history" ON public.workflow_instance_history FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- ========== ADDRESSES ==========
CREATE POLICY "Users can manage their own addresses" ON public.addresses FOR ALL
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Admins can view all addresses" ON public.addresses FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

-- ========== SHIPPING CARRIERS ==========
CREATE POLICY "Anyone can view active carriers" ON public.shipping_carriers FOR SELECT
  USING (is_active = true);
CREATE POLICY "Admins can manage carriers" ON public.shipping_carriers FOR ALL
  USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

-- ========== SHIPPING ZONES ==========
CREATE POLICY "Anyone can view shipping zones" ON public.shipping_zones FOR SELECT
  USING (true);
CREATE POLICY "Admins can manage shipping zones" ON public.shipping_zones FOR ALL
  USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

-- ========== CART ITEMS ==========
CREATE POLICY "Users can manage their own cart" ON public.cart_items FOR ALL
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ========== WISHLIST ==========
CREATE POLICY "Users can manage their own wishlist" ON public.wishlist FOR ALL
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ========== ORDERS ==========
CREATE POLICY "Customers can view their own orders" ON public.orders FOR SELECT
  USING (customer_id = auth.uid());
CREATE POLICY "Customers can create orders" ON public.orders FOR INSERT
  WITH CHECK (customer_id = auth.uid());
CREATE POLICY "Merchants can view orders with their products" ON public.orders FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM order_items oi JOIN stores s ON oi.store_id = s.id
    WHERE oi.order_id = orders.id AND s.owner_id = auth.uid()
  ));
CREATE POLICY "Staff can manage all orders" ON public.orders FOR ALL
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'staff'))
  WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'));

-- ========== ORDER ITEMS ==========
CREATE POLICY "Customers can view their order items" ON public.order_items FOR SELECT
  USING (EXISTS (SELECT 1 FROM orders o WHERE o.id = order_items.order_id AND o.customer_id = auth.uid()));
CREATE POLICY "Merchants can view their order items" ON public.order_items FOR SELECT
  USING (EXISTS (SELECT 1 FROM stores s WHERE s.id = order_items.store_id AND s.owner_id = auth.uid()));
CREATE POLICY "Merchants can update their order items" ON public.order_items FOR UPDATE
  USING (EXISTS (SELECT 1 FROM stores s WHERE s.id = order_items.store_id AND s.owner_id = auth.uid()));
CREATE POLICY "Admins can manage all order items" ON public.order_items FOR ALL
  USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

-- ========== ORDER NOTES ==========
CREATE POLICY "Customers can view their non-internal notes" ON public.order_notes FOR SELECT
  USING (NOT is_internal AND EXISTS (SELECT 1 FROM orders WHERE orders.id = order_notes.order_id AND orders.customer_id = auth.uid()));
CREATE POLICY "Customers can add notes to their orders" ON public.order_notes FOR INSERT
  WITH CHECK (user_id = auth.uid() AND NOT is_internal AND EXISTS (SELECT 1 FROM orders WHERE orders.id = order_notes.order_id AND orders.customer_id = auth.uid()));
CREATE POLICY "Staff can view all order notes" ON public.order_notes FOR SELECT
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'staff'));
CREATE POLICY "Staff can add any notes" ON public.order_notes FOR INSERT
  WITH CHECK (user_id = auth.uid() AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'staff')));

-- ========== PAYMENTS ==========
CREATE POLICY "Customers can view their payments" ON public.payments FOR SELECT
  USING (EXISTS (SELECT 1 FROM orders o WHERE o.id = payments.order_id AND o.customer_id = auth.uid()));
CREATE POLICY "Admins can manage all payments" ON public.payments FOR ALL
  USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

-- ========== REVIEWS ==========
CREATE POLICY "Anyone can view approved reviews" ON public.reviews FOR SELECT
  USING (is_approved = true);
CREATE POLICY "Users can create their own reviews" ON public.reviews FOR INSERT
  WITH CHECK (customer_id = auth.uid());
CREATE POLICY "Users can update their own reviews" ON public.reviews FOR UPDATE
  USING (customer_id = auth.uid());
CREATE POLICY "Admins can manage all reviews" ON public.reviews FOR ALL
  USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

-- ========== REVIEW VOTES ==========
CREATE POLICY "Anyone can view review votes" ON public.review_votes FOR SELECT
  USING (true);
CREATE POLICY "Users can manage their own votes" ON public.review_votes FOR ALL
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ========== PROMOTION RULES ==========
CREATE POLICY "Anyone can view active promotions" ON public.promotion_rules FOR SELECT
  USING (is_active = true);
CREATE POLICY "Admins can manage all promotions" ON public.promotion_rules FOR ALL
  USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Merchants can manage their store promotions" ON public.promotion_rules FOR ALL
  USING (store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid()))
  WITH CHECK (store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid()));

-- ========== SCAN LOGS ==========
CREATE POLICY "Authenticated users can insert scan logs" ON public.scan_logs FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can view scan logs" ON public.scan_logs FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- ========== STORE PRODUCTS ==========
CREATE POLICY "Anyone can view visible store products" ON public.store_products FOR SELECT
  USING (visible = true);
CREATE POLICY "Admins can manage store products" ON public.store_products FOR ALL
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'))
  WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'));

-- ========== GALLERY PRODUCTS ==========
CREATE POLICY "Anyone can view visible gallery products" ON public.gallery_products FOR SELECT
  USING (visible = true);
CREATE POLICY "Admins can manage gallery products" ON public.gallery_products FOR ALL
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'))
  WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'));

-- ========== QUOTE REQUESTS ==========
CREATE POLICY "Anyone can create quote requests" ON public.quote_requests FOR INSERT
  WITH CHECK (true);
CREATE POLICY "Users can view their own quotes" ON public.quote_requests FOR SELECT
  USING (customer_id = auth.uid());
CREATE POLICY "Admins can manage all quotes" ON public.quote_requests FOR ALL
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'))
  WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'));

-- ========== QUOTE REQUEST ITEMS ==========
CREATE POLICY "Anyone can create quote items" ON public.quote_request_items FOR INSERT
  WITH CHECK (true);
CREATE POLICY "Users can view their own quote items" ON public.quote_request_items FOR SELECT
  USING (EXISTS (SELECT 1 FROM quote_requests qr WHERE qr.id = quote_request_items.quote_id AND qr.customer_id = auth.uid()));
CREATE POLICY "Admins can manage all quote items" ON public.quote_request_items FOR ALL
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'))
  WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'));

-- ========== PRODUCTION STAGES ==========
CREATE POLICY "Authenticated users can view production stages" ON public.production_stages FOR SELECT
  USING (true);
CREATE POLICY "Admins can manage production stages" ON public.production_stages FOR ALL
  USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

-- ========== PRODUCTION UNITS ==========
CREATE POLICY "Authenticated users can view production units" ON public.production_units FOR SELECT
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "Staff can manage production units" ON public.production_units FOR ALL
  USING (has_permission(auth.uid(), 'stock_movements.create'))
  WITH CHECK (has_permission(auth.uid(), 'stock_movements.create'));

-- ========== PRODUCTION MOVES ==========
CREATE POLICY "Authenticated users can view production moves" ON public.production_moves FOR SELECT
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "Staff can insert production moves" ON public.production_moves FOR INSERT
  WITH CHECK (has_permission(auth.uid(), 'stock_movements.create'));

-- ============================================================
-- STEP 7: TRIGGERS
-- ============================================================

-- Auto-update updated_at timestamps
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_shelves_updated_at BEFORE UPDATE ON public.shelves
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_system_settings_updated_at BEFORE UPDATE ON public.system_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_feature_flags_updated_at BEFORE UPDATE ON public.feature_flags
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_custom_field_definitions_updated_at BEFORE UPDATE ON public.custom_field_definitions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_custom_field_values_updated_at BEFORE UPDATE ON public.custom_field_values
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_automation_rules_updated_at BEFORE UPDATE ON public.automation_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_workflow_definitions_updated_at BEFORE UPDATE ON public.workflow_definitions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_workflow_instances_updated_at BEFORE UPDATE ON public.workflow_instances
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_stores_updated_at BEFORE UPDATE ON public.stores
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_reviews_updated_at BEFORE UPDATE ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_promotion_rules_updated_at BEFORE UPDATE ON public.promotion_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_addresses_updated_at BEFORE UPDATE ON public.addresses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_shipping_carriers_updated_at BEFORE UPDATE ON public.shipping_carriers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Stock movement trigger - auto-update product stock
CREATE TRIGGER update_product_stock_on_movement
  AFTER INSERT ON public.stock_movements
  FOR EACH ROW EXECUTE FUNCTION public.update_product_stock();

-- Product activity log trigger
CREATE TRIGGER log_product_changes
  AFTER INSERT OR UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.log_product_activity();

-- Order number auto-generation trigger
CREATE TRIGGER set_order_number_trigger
  BEFORE INSERT ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.set_order_number();

-- Production move trigger - auto-update unit stage
CREATE TRIGGER handle_production_move_trigger
  AFTER INSERT ON public.production_moves
  FOR EACH ROW EXECUTE FUNCTION public.handle_production_move();

-- Auth triggers (run these in Supabase Dashboard > SQL Editor)
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TRIGGER on_auth_user_login
  AFTER UPDATE OF last_sign_in_at ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.update_last_sign_in();

-- ============================================================
-- STEP 8: STORAGE BUCKETS
-- ============================================================

INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public) VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for avatars
CREATE POLICY "Avatar images are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatar"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own avatar"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own avatar"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Storage policies for product images
CREATE POLICY "Product images are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'product-images');

CREATE POLICY "Staff can upload product images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'product-images' AND auth.uid() IS NOT NULL);

CREATE POLICY "Staff can update product images"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'product-images' AND auth.uid() IS NOT NULL);

CREATE POLICY "Staff can delete product images"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'product-images' AND auth.uid() IS NOT NULL);

-- ============================================================
-- STEP 9: SEED DATA
-- ============================================================

-- 9.1 Role Permissions
INSERT INTO public.role_permissions (role, permission) VALUES
  -- Admin (full access)
  ('admin', 'products.view'), ('admin', 'products.create'), ('admin', 'products.update'), ('admin', 'products.delete'),
  ('admin', 'stock_movements.view'), ('admin', 'stock_movements.create'),
  ('admin', 'users.view'), ('admin', 'users.manage'),
  ('admin', 'logs.view'), ('admin', 'reports.view'),
  ('admin', 'settings.view'), ('admin', 'settings.manage'), ('admin', 'security.view'),
  -- Manager
  ('manager', 'products.view'), ('manager', 'products.create'), ('manager', 'products.update'), ('manager', 'products.delete'),
  ('manager', 'stock_movements.view'), ('manager', 'stock_movements.create'),
  ('manager', 'logs.view'), ('manager', 'reports.view'), ('manager', 'settings.view'),
  -- Staff
  ('staff', 'products.view'), ('staff', 'stock_movements.view'), ('staff', 'stock_movements.create'),
  -- Viewer
  ('viewer', 'products.view'), ('viewer', 'stock_movements.view'),
  -- Merchant
  ('merchant', 'products.view'), ('merchant', 'products.create'), ('merchant', 'products.update'),
  ('merchant', 'stock_movements.view'), ('merchant', 'stock_movements.create'), ('merchant', 'reports.view'),
  -- Customer
  ('customer', 'products.view')
ON CONFLICT DO NOTHING;

-- 9.2 Organization
INSERT INTO public.organizations (name, currency, timezone, date_format, default_min_stock, default_warning_threshold)
VALUES ('GLORE', 'TRY', 'Europe/Istanbul', 'DD.MM.YYYY', 5, 10)
ON CONFLICT DO NOTHING;

-- 9.3 Shipping Carriers (Turkish carriers)
INSERT INTO public.shipping_carriers (name, base_fee, per_kg_fee, tracking_url_template, is_active) VALUES
  ('Yurtiçi Kargo', 45.00, 5.00, 'https://www.yurticikargo.com/tr/online-servisler/gonderi-sorgula?code={tracking}', true),
  ('Aras Kargo', 40.00, 4.50, 'https://www.araskargo.com.tr/trs/tuiKargoTakip.aspx?kargo_takip_no={tracking}', true),
  ('MNG Kargo', 42.00, 4.75, 'https://www.mngkargo.com.tr/gonderi-takip/?code={tracking}', true),
  ('PTT Kargo', 35.00, 4.00, 'https://gonderitakip.ptt.gov.tr/?barkod={tracking}', true),
  ('Sürat Kargo', 38.00, 4.25, 'https://www.suratkargo.com.tr/gonderi-takip?barkod={tracking}', true)
ON CONFLICT DO NOTHING;

-- 9.4 Feature Flags
INSERT INTO public.feature_flags (module_key, module_name, description, is_enabled, config) VALUES
  ('audit_enhanced', 'Gelişmiş Denetim', 'Detaylı denetim günlüğü ve izleme', true, '{}'),
  ('automation', 'Otomasyon', 'Otomatik tetikleyiciler ve kurallar', true, '{}'),
  ('control_center', 'Kontrol Merkezi', 'Sistem modüllerinin yönetim paneli', true, '{}'),
  ('dynamic_forms', 'Dinamik Formlar', 'Özelleştirilebilir ürün formları', true, '{}'),
  ('offline_enhanced', 'Gelişmiş Çevrimdışı', 'Gelişmiş çevrimdışı senkronizasyon', true, '{}'),
  ('rbac_enhanced', 'Gelişmiş Yetkilendirme', 'Detaylı rol ve izin yönetimi sistemi', true, '{}'),
  ('scan_session', 'Tarama Oturumu (Scan Session)', 'Profesyonel toplu tarama oturumu', true, '{"allowNegativeStock":false,"cooldownMs":1500,"defaultInputMethod":"camera","defaultScanTarget":"units"}'),
  ('store_module', 'Mağaza Modülü', 'Profesyonel e-ticaret mağaza arayüzü', true, '{}'),
  ('workflows', 'İş Akışları', 'Sipariş ve hareket durumu yönetimi', true, '{}')
ON CONFLICT DO NOTHING;

-- 9.5 Production Stages
INSERT INTO public.production_stages (code, name, stage_type, order_index) VALUES
  ('baski', 'Baskı', 'process', 1),
  ('kesim', 'Kesim', 'process', 2),
  ('firinlar', 'Fırınlar', 'process', 3),
  ('zimpara', 'Zımpara', 'process', 4),
  ('dekor', 'Dekor', 'process', 5),
  ('tunel_firin', 'Tünel Fırın', 'process', 6),
  ('paketleme', 'Paketleme', 'process', 7),
  ('dabo', 'Dabo', 'process', 8)
ON CONFLICT DO NOTHING;

-- ============================================================
-- STEP 10: INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_products_search_text ON public.products USING gin (search_text gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_products_urun_kodu ON public.products (urun_kodu);
CREATE INDEX IF NOT EXISTS idx_products_barkod ON public.products (barkod);
CREATE INDEX IF NOT EXISTS idx_products_is_deleted ON public.products (is_deleted);
CREATE INDEX IF NOT EXISTS idx_stock_movements_product_id ON public.stock_movements (product_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_date ON public.stock_movements (movement_date);

-- ============================================================
-- STEP 11: REALTIME (Optional)
-- ============================================================

-- Uncomment below if you want realtime on specific tables:
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.stock_movements;

-- ============================================================
-- DONE! Your database is now fully configured.
-- 
-- NEXT STEPS:
-- 1. Create a new Supabase project at https://supabase.com
-- 2. Run this SQL in your Supabase project's SQL Editor
-- 3. Update your .env file with new project credentials:
--    VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
--    VITE_SUPABASE_PUBLISHABLE_KEY=your_anon_key
-- 4. Generate new types: npx supabase gen types typescript
-- 5. Deploy to Vercel:
--    - Push code to GitHub
--    - Import repo in Vercel
--    - Add env vars: VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY
-- ============================================================
