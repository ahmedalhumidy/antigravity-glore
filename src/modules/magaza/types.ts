export interface StoreProduct {
  id: string;
  product_id: string;
  slug: string;
  visible: boolean;
  title_override: string | null;
  description_override: string | null;
  price: number | null;
  compare_price: number | null;
  currency: string;
  badge: string | null;
  allow_quote: boolean;
  allow_cart: boolean;
  show_stock: boolean;
  min_qty: number;
  max_qty: number | null;
  order_step: number;
  category: string | null;
  sort_order: number;
  created_at: string;
  // Joined from products table
  product?: {
    id: string;
    urun_adi: string;
    urun_kodu: string;
    barkod: string | null;
    mevcut_stok: number;
    set_stok: number;
    raf_konum: string;
    images: any;
    category: string | null;
    product_description: string | null;
  };
}

export interface GalleryProduct {
  id: string;
  title: string;
  slug: string | null;
  description: string | null;
  images: string[];
  price_hint: number | null;
  category: string | null;
  tags: string[] | null;
  visible: boolean;
  sort_order: number;
  created_at: string;
}

export interface QuoteRequest {
  id: string;
  customer_id: string | null;
  name: string;
  phone: string | null;
  email: string | null;
  company: string | null;
  notes: string | null;
  status: string;
  created_at: string;
  items?: QuoteRequestItem[];
}

export interface QuoteRequestItem {
  id: string;
  quote_id: string;
  product_id: string | null;
  gallery_id: string | null;
  quantity: number;
  unit: string;
  note: string | null;
}

export interface QuoteCartItem {
  id: string; // store_product or gallery_product id
  type: 'store' | 'gallery';
  title: string;
  image?: string;
  price?: number;
  quantity: number;
  unit: string;
  note: string;
  product_id?: string; // real product_id for store items
  gallery_id?: string; // gallery_product id for gallery items
}
