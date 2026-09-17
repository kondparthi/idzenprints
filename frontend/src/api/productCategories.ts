import { apiClient } from "./client";
import type { ProductCategory, ProductCategoryInput } from "@/types/product";

export async function listProductCategories(): Promise<ProductCategory[]> {
  const { data } = await apiClient.get<ProductCategory[]>("/product-categories");
  return data;
}

export async function createProductCategory(input: ProductCategoryInput): Promise<ProductCategory> {
  const { data } = await apiClient.post<ProductCategory>("/product-categories", input);
  return data;
}

export async function updateProductCategory(id: string, input: Partial<ProductCategoryInput>): Promise<ProductCategory> {
  const { data } = await apiClient.put<ProductCategory>(`/product-categories/${id}`, input);
  return data;
}

export async function deleteProductCategory(id: string): Promise<void> {
  await apiClient.delete(`/product-categories/${id}`);
}
