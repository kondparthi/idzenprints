import { apiClient } from "./client";
import type { CreditTransaction, PdfUsageRecord } from "@/types/creditLedger";

export async function listCreditTransactions(subscriptionId: string): Promise<CreditTransaction[]> {
  const { data } = await apiClient.get<CreditTransaction[]>(`/subscriptions/${subscriptionId}/credit-transactions`);
  return data;
}

export async function listPdfUsage(subscriptionId: string): Promise<PdfUsageRecord[]> {
  const { data } = await apiClient.get<PdfUsageRecord[]>(`/subscriptions/${subscriptionId}/pdf-usage`);
  return data;
}

export async function adjustCredits(subscriptionId: string, amount: number, description: string): Promise<CreditTransaction> {
  const { data } = await apiClient.post<CreditTransaction>(`/subscriptions/${subscriptionId}/credit-adjustment`, {
    amount,
    description,
  });
  return data;
}
