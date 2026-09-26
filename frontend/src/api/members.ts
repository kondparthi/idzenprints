import { apiClient } from "./client";
import type { MemberListItem } from "@/types/member";

export async function listMembers(): Promise<MemberListItem[]> {
  const { data } = await apiClient.get<MemberListItem[]>("/members");
  return data;
}

export async function reassignMemberType(memberId: string, memberTypeId: string): Promise<MemberListItem> {
  const { data } = await apiClient.patch<MemberListItem>(`/members/${memberId}/member-type`, {
    member_type_id: memberTypeId,
  });
  return data;
}

export async function updateMemberStatus(memberId: string, isActive: boolean): Promise<MemberListItem> {
  const { data } = await apiClient.patch<MemberListItem>(`/members/${memberId}/status`, { is_active: isActive });
  return data;
}
