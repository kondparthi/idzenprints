export type ProductType = "simple" | "variable";
export type ProductStatus = "draft" | "published" | "private" | "out_of_stock";
export type ProductVisibility = "visible" | "catalog_only" | "search_only" | "hidden";
export type TaxStatus = "taxable" | "shipping_only" | "none";
export type TaxClass = "standard" | "reduced_rate" | "zero_rate";

export const PRODUCT_STATUS_LABELS: Record<ProductStatus, string> = {
  draft: "Draft",
  published: "Published",
  private: "Private",
  out_of_stock: "Out of stock",
};

export const PRODUCT_VISIBILITY_LABELS: Record<ProductVisibility, string> = {
  visible: "Visible (listings + search)",
  catalog_only: "Catalog only (hidden from search)",
  search_only: "Search only (hidden from listings)",
  hidden: "Hidden (direct link only)",
};

export const TAX_STATUS_LABELS: Record<TaxStatus, string> = {
  taxable: "Taxable",
  shipping_only: "Shipping only",
  none: "None",
};

export const TAX_CLASS_LABELS: Record<TaxClass, string> = {
  standard: "Standard",
  reduced_rate: "Reduced rate",
  zero_rate: "Zero rate",
};

export type StockStatus = "in_stock" | "out_of_stock" | "on_backorder";
export type Backorders = "no" | "notify" | "yes";

export const STOCK_STATUS_LABELS: Record<StockStatus, string> = {
  in_stock: "In stock",
  out_of_stock: "Out of stock",
  on_backorder: "On backorder",
};

export const BACKORDERS_LABELS: Record<Backorders, string> = {
  no: "Do not allow",
  notify: "Allow, but notify customer",
  yes: "Allow",
};

export interface InventoryFields {
  manage_stock: boolean;
  stock_quantity: number | null;
  stock_status: StockStatus;
  low_stock_threshold: number | null;
  backorders: Backorders;
}

export interface InventoryFieldsInput {
  manage_stock?: boolean;
  stock_quantity?: number | null;
  stock_status?: StockStatus;
  low_stock_threshold?: number | null;
  backorders?: Backorders;
}

export interface InventoryAdjustment {
  id: string;
  product_id: string;
  variant_id: string | null;
  previous_quantity: number;
  new_quantity: number;
  change_quantity: number;
  reason: string | null;
  adjusted_by: string | null;
}

export interface StockAdjustmentInput {
  variant_id?: string | null;
  quantity?: number;
  delta?: number;
  reason?: string;
}

export interface PricingFields {
  regular_price: string | null;
  sale_price: string | null;
  sale_start_date: string | null;
  sale_end_date: string | null;
  cost_price: string | null;
  tax_status: TaxStatus;
  tax_class: TaxClass;
  min_quantity: number | null;
  max_quantity: number | null;
}

export interface PricingFieldsInput {
  regular_price?: string | null;
  sale_price?: string | null;
  sale_start_date?: string | null;
  sale_end_date?: string | null;
  cost_price?: string | null;
  tax_status?: TaxStatus;
  tax_class?: TaxClass;
  min_quantity?: number | null;
  max_quantity?: number | null;
}

export interface ProductCustomerPrice {
  id: string;
  product_id: string;
  customer_id: string;
  price: string;
}

export interface ProductBulkPricingTier {
  id: string;
  product_id: string;
  min_quantity: number;
  max_quantity: number | null;
  price: string;
}

export interface EffectivePrice {
  price: string;
  source: "customer_specific" | "bulk_tier" | "sale" | "regular";
}

export interface ProductCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  parent_id: string | null;
  is_active: boolean;
}

export interface ProductCategoryInput {
  name: string;
  description?: string;
  parent_id?: string | null;
  is_active?: boolean;
}

export interface Brand {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
}

export interface BrandInput {
  name: string;
  is_active?: boolean;
}

export interface Tag {
  id: string;
  name: string;
  slug: string;
}

export interface ProductImage {
  id: string;
  product_id: string;
  original_filename: string;
  mime_type: string | null;
  is_primary: boolean;
  sort_order: number;
}

export interface ProductVariant extends PricingFields, InventoryFields {
  id: string;
  product_id: string;
  sku: string;
  attribute_values: Record<string, string>;
  is_active: boolean;
}

export interface ProductVariantInput extends PricingFieldsInput, InventoryFieldsInput {
  sku: string;
  attribute_values: Record<string, string>;
  is_active?: boolean;
}

export interface Product extends PricingFields, InventoryFields {
  id: string;
  name: string;
  sku: string;
  description: string | null;
  short_description: string | null;
  category_id: string | null;
  brand_id: string | null;
  product_type: ProductType;
  status: ProductStatus;
  visibility: ProductVisibility;
  is_featured: boolean;
  tags: Tag[];
  images: ProductImage[];
  variants: ProductVariant[];
}

export interface ProductInput extends PricingFieldsInput, InventoryFieldsInput {
  name: string;
  sku: string;
  description?: string;
  short_description?: string;
  category_id?: string | null;
  brand_id?: string | null;
  product_type: ProductType;
  status: ProductStatus;
  visibility: ProductVisibility;
  is_featured: boolean;
  tag_ids: string[];
}
