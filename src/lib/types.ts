export type AppRole = "admin" | "editor" | "customer";
export type OrderStatus = "pendiente" | "confirmado" | "en_preparacion" | "listo" | "enviado" | "entregado" | "cancelado";
export type PaymentStatus = "pendiente" | "en_proceso" | "aprobado" | "rechazado" | "cancelado" | "expirado" | "reembolsado";
export type PaymentMethod = "mercadopago_pse" | "transferencia" | "whatsapp";
export type StockStatus = "disponible" | "agotado" | "bajo_pedido";
export type ProductKind = "galleta_personalizada" | "alfajor" | "caja" | "estandar";

export interface Media {
  id: string;
  bucket: string;
  path: string;
  alt: string;
  folder: string;
  width: number | null;
  height: number | null;
  mime: string | null;
  size_bytes: number | null;
  blur_data: string | null;
  is_stock: boolean;
  source_name: string | null;
  source_url: string | null;
  author: string | null;
  license: string | null;
  created_at: string;
}

/** Imagen lista para renderizar. */
export interface ImageRef {
  id: string;
  url: string;
  alt: string;
  width: number;
  height: number;
  blur: string | null;
  isStock: boolean;
}

export type CustomFieldType = "text" | "textarea" | "select" | "color" | "date" | "number" | "image";

export interface CustomizationField {
  key: string;
  label: string;
  type: CustomFieldType;
  required: boolean;
  options?: string[];
  placeholder?: string;
  help?: string;
  maxLength?: number;
  min?: number;
  max?: number;
}

export interface Category {
  id: string;
  slug: string;
  name: string;
  description: string;
  image_id: string | null;
  sort: number;
  is_active: boolean;
  seo_title: string | null;
  seo_description: string | null;
  image?: ImageRef | null;
  product_count?: number;
}

export interface Variant {
  id: string;
  product_id: string;
  name: string;
  options: Record<string, string>;
  price: number;
  compare_at_price: number | null;
  sku: string | null;
  is_active: boolean;
  stock_quantity: number | null;
  sort: number;
}

export interface Product {
  id: string;
  slug: string;
  name: string;
  short_description: string;
  description: string;
  category_id: string | null;
  kind: ProductKind;
  price: number;
  compare_at_price: number | null;
  is_active: boolean;
  is_featured: boolean;
  stock_status: StockStatus;
  track_inventory: boolean;
  stock_quantity: number | null;
  min_quantity: number;
  max_quantity: number;
  quantity_step: number;
  quantity_label: string;
  prep_days_min: number;
  prep_days_max: number;
  prep_time_text: string;
  customization_fields: CustomizationField[];
  tags: string[];
  seo_title: string | null;
  seo_description: string | null;
  is_sample: boolean;
  sort: number;
  created_at: string;
  updated_at: string;
  category?: Pick<Category, "id" | "slug" | "name"> | null;
  images?: ImageRef[];
  variants?: Variant[];
}

export interface DeliveryMethod {
  id: string;
  name: string;
  description: string;
  price: number;
  price_note: string;
  requires_address: boolean;
  is_active: boolean;
  is_sample: boolean;
  sort: number;
}

export interface Section {
  id: string;
  page: string;
  type: string;
  label: string;
  variant: string;
  sort: number;
  is_enabled: boolean;
  content: Record<string, unknown>;
}

export interface OrderItem {
  id: string;
  product_id: string | null;
  variant_id: string | null;
  product_name: string;
  variant_name: string | null;
  unit_price: number;
  quantity: number;
  line_total: number;
  customization: Record<string, string>;
  reference_image_path: string | null;
}

export interface Order {
  id: string;
  number: string;
  public_token: string;
  customer_id: string | null;
  user_id: string | null;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  address: string;
  city: string;
  neighborhood: string;
  desired_date: string | null;
  delivery_method_name: string;
  delivery_fee: number;
  notes: string;
  subtotal: number;
  discount: number;
  total: number;
  coupon_code: string | null;
  status: OrderStatus;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  payer: Record<string, unknown>;
  admin_notes: string;
  created_at: string;
  updated_at: string;
  items?: OrderItem[];
}
