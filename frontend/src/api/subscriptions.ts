import { apiClient } from "./client";
import type { Subscription, SubscriptionStatus } from "@/types/subscription";

export async function listSubscriptions(status?: SubscriptionStatus): Promise<Subscription[]> {
  const { data } = await apiClient.get<Subscription[]>("/subscriptions", { params: { status: status || undefined } });
  return data;
}

export async function setSubscriptionStatus(id: string, status: SubscriptionStatus): Promise<Subscription> {
  const { data } = await apiClient.put<Subscription>(`/subscriptions/${id}/status`, { status });
  return data;
}
