import { apiClient } from "./client";
import type { MemberSession } from "@/types/memberSession";

export async function listMemberSessions(memberId: string): Promise<MemberSession[]> {
  const { data } = await apiClient.get<MemberSession[]>(`/members/${memberId}/sessions`);
  return data;
}

export async function revokeMemberSession(memberId: string, sessionId: string): Promise<MemberSession> {
  const { data } = await apiClient.post<MemberSession>(`/members/${memberId}/sessions/${sessionId}/revoke`);
  return data;
}
