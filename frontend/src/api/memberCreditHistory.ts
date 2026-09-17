import { memberApiClient } from "./memberClient";
import type { CreditTransaction, PdfUsageRecord } from "@/types/creditLedger";

export async function fetchOwnCreditHistory(): Promise<CreditTransaction[]> {
  const { data } = await memberApiClient.get<CreditTransaction[]>("/auth/member/credit-history");
  return data;
}

export async function fetchOwnPdfUsageHistory(): Promise<PdfUsageRecord[]> {
  const { data } = await memberApiClient.get<PdfUsageRecord[]>("/auth/member/pdf-usage-history");
  return data;
}
