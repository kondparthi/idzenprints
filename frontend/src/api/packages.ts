import { apiClient } from "./client";
import type { Package, PackageInput } from "@/types/subscription";

export async function listPackages(): Promise<Package[]> {
  const { data } = await apiClient.get<Package[]>("/packages");
  return data;
}

export async function getPackage(id: string): Promise<Package> {
  const { data } = await apiClient.get<Package>(`/packages/${id}`);
  return data;
}

export async function listPackagesForMemberType(memberTypeId: string): Promise<Package[]> {
  const { data } = await apiClient.get<Package[]>(`/packages/by-member-type/${memberTypeId}`);
  return data;
}

export async function createPackage(input: PackageInput): Promise<Package> {
  const { data } = await apiClient.post<Package>("/packages", input);
  return data;
}

export async function updatePackage(id: string, input: Partial<PackageInput>): Promise<Package> {
  const { data } = await apiClient.put<Package>(`/packages/${id}`, input);
  return data;
}

export async function deletePackage(id: string): Promise<void> {
  await apiClient.delete(`/packages/${id}`);
}
