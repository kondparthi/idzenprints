import { apiClient } from "./client";
import type { PaginatedResponse } from "@/types/customer";
import type {
  Product,
  ProductBulkPricingTier,
  ProductCustomerPrice,
  ProductImage,
  ProductInput,
  ProductStatus,
  ProductVariant,
  ProductVariantInput,
  EffectivePrice,
  InventoryAdjustment,
  StockAdjustmentInput,
} from "@/types/product";

export async function listProducts(filters?: {
  search?: string;
  status?: ProductStatus;
  categoryId?: string;
  brandId?: string;
  page?: number;
  pageSize?: number;
}): Promise<PaginatedResponse<Product>> {
  const { data } = await apiClient.get<PaginatedResponse<Product>>("/products", {
    params: {
      search: filters?.search || undefined,
      status: filters?.status || undefined,
      category_id: filters?.categoryId || undefined,
      brand_id: filters?.brandId || undefined,
      page: filters?.page ?? 1,
      page_size: filters?.pageSize ?? 20,
    },
  });
  return data;
}

export async function getProduct(id: string): Promise<Product> {
  const { data } = await apiClient.get<Product>(`/products/${id}`);
  return data;
}

export async function createProduct(input: ProductInput): Promise<Product> {
  const { data } = await apiClient.post<Product>("/products", input);
  return data;
}

export async function updateProduct(id: string, input: Partial<ProductInput>): Promise<Product> {
  const { data } = await apiClient.put<Product>(`/products/${id}`, input);
  return data;
}

export async function setProductStatus(id: string, status: ProductStatus): Promise<Product> {
  const { data } = await apiClient.put<Product>(`/products/${id}/status`, { status });
  return data;
}

export async function duplicateProduct(id: string): Promise<Product> {
  const { data } = await apiClient.post<Product>(`/products/${id}/duplicate`);
  return data;
}

export async function deleteProduct(id: string): Promise<void> {
  await apiClient.delete(`/products/${id}`);
}

export async function addProductImage(productId: string, file: File, isPrimary: boolean): Promise<ProductImage> {
  const formData = new FormData();
  formData.append("file", file);
  const { data } = await apiClient.post<ProductImage>(
    `/products/${productId}/images?is_primary=${isPrimary}`,
    formData,
    { headers: { "Content-Type": "multipart/form-data" } }
  );
  return data;
}

export async function fetchProductImageUrl(productId: string, imageId: string): Promise<string> {
  const response = await apiClient.get(`/products/${productId}/images/${imageId}/file`, { responseType: "blob" });
  return URL.createObjectURL(response.data as Blob);
}

export async function setPrimaryProductImage(productId: string, imageId: string): Promise<ProductImage> {
  const { data } = await apiClient.put<ProductImage>(`/products/${productId}/images/${imageId}/primary`);
  return data;
}

export async function deleteProductImage(productId: string, imageId: string): Promise<void> {
  await apiClient.delete(`/products/${productId}/images/${imageId}`);
}

export async function addProductVariant(productId: string, input: ProductVariantInput): Promise<ProductVariant> {
  const { data } = await apiClient.post<ProductVariant>(`/products/${productId}/variants`, input);
  return data;
}

export async function updateProductVariant(
  productId: string,
  variantId: string,
  input: ProductVariantInput
): Promise<ProductVariant> {
  const { data } = await apiClient.put<ProductVariant>(`/products/${productId}/variants/${variantId}`, input);
  return data;
}

export async function deleteProductVariant(productId: string, variantId: string): Promise<void> {
  await apiClient.delete(`/products/${productId}/variants/${variantId}`);
}

// ---------- Customer-specific pricing ----------

export async function listCustomerPrices(productId: string): Promise<ProductCustomerPrice[]> {
  const { data } = await apiClient.get<ProductCustomerPrice[]>(`/products/${productId}/customer-prices`);
  return data;
}

export async function setCustomerPrice(productId: string, customerId: string, price: string): Promise<ProductCustomerPrice> {
  const { data } = await apiClient.put<ProductCustomerPrice>(`/products/${productId}/customer-prices`, {
    customer_id: customerId,
    price,
  });
  return data;
}

export async function deleteCustomerPrice(productId: string, priceId: string): Promise<void> {
  await apiClient.delete(`/products/${productId}/customer-prices/${priceId}`);
}

// ---------- Bulk pricing tiers ----------

export async function listBulkTiers(productId: string): Promise<ProductBulkPricingTier[]> {
  const { data } = await apiClient.get<ProductBulkPricingTier[]>(`/products/${productId}/bulk-pricing`);
  return data;
}

export async function addBulkTier(
  productId: string,
  input: { min_quantity: number; max_quantity: number | null; price: string }
): Promise<ProductBulkPricingTier> {
  const { data } = await apiClient.post<ProductBulkPricingTier>(`/products/${productId}/bulk-pricing`, input);
  return data;
}

export async function deleteBulkTier(productId: string, tierId: string): Promise<void> {
  await apiClient.delete(`/products/${productId}/bulk-pricing/${tierId}`);
}

// ---------- Effective price ----------

export async function getEffectivePrice(
  productId: string,
  options?: { quantity?: number; customerId?: string; variantId?: string }
): Promise<EffectivePrice> {
  const { data } = await apiClient.get<EffectivePrice>(`/products/${productId}/effective-price`, {
    params: {
      quantity: options?.quantity ?? 1,
      customer_id: options?.customerId || undefined,
      variant_id: options?.variantId || undefined,
    },
  });
  return data;
}

// ---------- Inventory / stock ----------

export async function adjustStock(productId: string, input: StockAdjustmentInput): Promise<InventoryAdjustment> {
  const { data } = await apiClient.post<InventoryAdjustment>(`/products/${productId}/stock/adjust`, input);
  return data;
}

export async function listInventoryHistory(productId: string): Promise<InventoryAdjustment[]> {
  const { data } = await apiClient.get<InventoryAdjustment[]>(`/products/${productId}/inventory-history`);
  return data;
}
