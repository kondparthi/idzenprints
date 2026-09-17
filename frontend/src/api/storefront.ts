/**
 * Public storefront API — reuses memberApiClient's axios instance
 * purely for its base-URL config; these endpoints need no auth at all,
 * and a member token being present/absent makes no difference to them.
 */
import { memberApiClient } from "./memberClient";
import type { GuestOrder, GuestOrderInput, PublicProductDetail, PublicProductListItem } from "@/types/storefront";

export async function listStoreProducts(params?: {
  search?: string;
  categoryId?: string;
  brandId?: string;
  page?: number;
}): Promise<PublicProductListItem[]> {
  const { data } = await memberApiClient.get<PublicProductListItem[]>("/storefront/products", {
    params: {
      search: params?.search || undefined,
      category_id: params?.categoryId || undefined,
      brand_id: params?.brandId || undefined,
      page: params?.page ?? 1,
    },
  });
  return data;
}

export async function getStoreProduct(productId: string): Promise<PublicProductDetail> {
  const { data } = await memberApiClient.get<PublicProductDetail>(`/storefront/products/${productId}`);
  return data;
}

export function storeProductImageUrl(productId: string, imageId: string): string {
  const base = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000/api";
  return `${base}/storefront/products/${productId}/images/${imageId}/file`;
}

export async function placeGuestOrder(input: GuestOrderInput): Promise<GuestOrder> {
  const { data } = await memberApiClient.post<GuestOrder>("/storefront/orders", input);
  return data;
}

export async function lookupGuestOrder(orderNumber: string, guestPhone: string): Promise<GuestOrder> {
  const { data } = await memberApiClient.post<GuestOrder>("/storefront/orders/lookup", {
    order_number: orderNumber,
    guest_phone: guestPhone,
  });
  return data;
}
