/**
 * Unauthenticated endpoints for the public registration flow — uses the
 * plain member client (no token needed, but keeps the base URL/config
 * consistent) rather than the staff apiClient, since a visitor filling
 * out the registration form has no session at all yet.
 */
import { memberApiClient } from "./memberClient";
import type { MemberType, Package } from "@/types/subscription";

export async function listActiveMemberTypes(): Promise<MemberType[]> {
  const { data } = await memberApiClient.get<MemberType[]>("/public/member-types");
  return data;
}

export async function listAvailablePackages(memberTypeId: string): Promise<Package[]> {
  const { data } = await memberApiClient.get<Package[]>(`/public/packages/by-member-type/${memberTypeId}`);
  return data;
}
