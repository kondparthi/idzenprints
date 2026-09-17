import { apiClient } from "./client";
import type { Brand, BrandInput } from "@/types/product";

export async function listBrands(): Promise<Brand[]> {
  const { data } = await apiClient.get<Brand[]>("/brands");
  return data;
}

export async function createBrand(input: BrandInput): Promise<Brand> {
  const { data } = await apiClient.post<Brand>("/brands", input);
  return data;
}

export async function updateBrand(id: string, input: Partial<BrandInput>): Promise<Brand> {
  const { data } = await apiClient.put<Brand>(`/brands/${id}`, input);
  return data;
}

export async function deleteBrand(id: string): Promise<void> {
  await apiClient.delete(`/brands/${id}`);
}
