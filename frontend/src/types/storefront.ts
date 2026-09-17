export interface PublicProductListItem {
  id: string;
  name: string;
  short_description: string | null;
  regular_price: string | null;
  sale_price: string | null;
  primary_image_id: string | null;
  in_stock: boolean;
  is_featured: boolean;
  category_id: string | null;
  brand_id: string | null;
}

export interface PublicVariant {
  id: string;
  sku: string;
  attribute_values: Record<string, string>;
  regular_price: string | null;
  sale_price: string | null;
  in_stock: boolean;
}

export interface PublicProductImage {
  id: string;
  is_primary: boolean;
}

export interface PublicProductDetail {
  id: string;
  name: string;
  description: string | null;
  short_description: string | null;
  sku: string;
  regular_price: string | null;
  sale_price: string | null;
  product_type: "simple" | "variable";
  in_stock: boolean;
  category_id: string | null;
  brand_id: string | null;
  images: PublicProductImage[];
  variants: PublicVariant[];
}

export interface CartItem {
  productId: string;
  variantId: string | null;
  name: string;
  variantLabel: string | null;
  unitPrice: string;
  quantity: number;
  imageId: string | null;
}

export type PaymentMethod = "cod" | "phonepe";

export interface GuestOrderInput {
  guest_name: string;
  guest_phone: string;
  guest_email: string;
  billing_address: string;
  shipping_address: string;
  payment_method: PaymentMethod;
  items: { product_id: string; variant_id?: string | null; quantity: number }[];
}

export interface GuestOrderItem {
  id: string;
  product_id: string;
  variant_id: string | null;
  product_name: string;
  variant_label: string | null;
  unit_price: string;
  quantity: number;
  line_total: string;
}

export interface GuestOrder {
  id: string;
  order_number: string;
  guest_name: string;
  guest_phone: string;
  guest_email: string;
  billing_address: string;
  shipping_address: string;
  payment_method: string;
  payment_status: string;
  status: string;
  subtotal: string;
  total: string;
  items: GuestOrderItem[];
}
