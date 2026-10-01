import { apiClient } from "./client";
import type { PrintBucketItem } from "@/types/printBucket";

export async function listBucket(): Promise<PrintBucketItem[]> {
  const { data } = await apiClient.get<PrintBucketItem[]>("/print-bucket");
  return data;
}

export async function addToBucket(generatedCardId: string): Promise<PrintBucketItem> {
  const { data } = await apiClient.post<PrintBucketItem>("/print-bucket", { generated_card_id: generatedCardId });
  return data;
}

export async function removeFromBucket(itemId: string): Promise<void> {
  await apiClient.delete(`/print-bucket/${itemId}`);
}

/**
 * Renders the selected bucket items as one multi-page A4 PDF (4 cards per
 * page — fronts on top, matching backs below) and triggers a browser save.
 */
export async function printBucketSheet(itemIds: string[], paperSize = "a4"): Promise<void> {
  const response = await apiClient.post(
    "/print-bucket/print",
    { item_ids: itemIds, paper_size: paperSize },
    { responseType: "blob" }
  );
  const url = URL.createObjectURL(response.data as Blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `print-bucket-${paperSize}.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
