import { memberApiClient } from "./memberClient";
import { getDeviceId, getDeviceName } from "@/utils/deviceId";
import type { CurrentMember, MemberDashboard, MemberRegisterInput, RegisterResponse } from "@/types/memberAuth";

export async function registerMember(input: MemberRegisterInput): Promise<RegisterResponse> {
  const { data } = await memberApiClient.post<RegisterResponse>("/auth/member/register", {
    ...input,
    device_id: getDeviceId(),
    device_name: getDeviceName(),
  });
  return data;
}

export async function loginMember(loginId: string, password: string): Promise<string> {
  const { data } = await memberApiClient.post<{ access_token: string }>("/auth/member/login", {
    login_id: loginId,
    password,
    device_id: getDeviceId(),
    device_name: getDeviceName(),
  });
  return data.access_token;
}

export async function logoutMember(): Promise<void> {
  await memberApiClient.post("/auth/member/logout", { device_id: getDeviceId() });
}

export async function fetchCurrentMember(): Promise<CurrentMember> {
  const { data } = await memberApiClient.get<CurrentMember>("/auth/member/me");
  return data;
}

export async function fetchMemberDashboard(): Promise<MemberDashboard> {
  const { data } = await memberApiClient.get<MemberDashboard>("/auth/member/dashboard");
  return data;
}

export interface ConsumeServiceResult {
  already_processed: boolean;
  credits_remaining: number;
  pdf_used: number;
  transaction_id: string;
}

export async function consumeService(cardTypeId: string, quantity = 1): Promise<ConsumeServiceResult> {
  // A fresh, client-generated id per attempt — the backend uses this to
  // refuse a double-charge if this exact request is somehow replayed
  // (e.g. a double-click before the button disables, or a network retry).
  const referenceId = crypto.randomUUID();
  const { data } = await memberApiClient.post<ConsumeServiceResult>("/auth/member/consume", {
    card_type_id: cardTypeId,
    quantity,
    reference_id: referenceId,
  });
  return data;
}
