import { apiClient } from "./client";
import type { MemberType, MemberTypeInput } from "@/types/subscription";

export async function listMemberTypes(): Promise<MemberType[]> {
  const { data } = await apiClient.get<MemberType[]>("/member-types");
  return data;
}

export async function createMemberType(input: MemberTypeInput): Promise<MemberType> {
  const { data } = await apiClient.post<MemberType>("/member-types", input);
  return data;
}

export async function updateMemberType(id: string, input: Partial<MemberTypeInput>): Promise<MemberType> {
  const { data } = await apiClient.put<MemberType>(`/member-types/${id}`, input);
  return data;
}

export async function deleteMemberType(id: string): Promise<void> {
  await apiClient.delete(`/member-types/${id}`);
}

export async function setDefaultMemberType(id: string): Promise<MemberType> {
  const { data } = await apiClient.post<MemberType>(`/member-types/${id}/set-default`);
  return data;
}
