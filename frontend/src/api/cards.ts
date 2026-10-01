import { apiClient } from "./client";
import type { GeneratedCard } from "@/types/generatedCard";

export async function previewCard(customerId: string, templateId: string, side: "front" | "back" = "front"): Promise<string> {
  const response = await apiClient.post(
    "/cards/preview",
    { customer_id: customerId, template_id: templateId },
    { params: { side }, responseType: "blob" }
  );
  return URL.createObjectURL(response.data as Blob);
}

export async function generateCard(customerId: string, templateId: string): Promise<GeneratedCard> {
  const { data } = await apiClient.post<GeneratedCard>("/cards/generate", {
    customer_id: customerId,
    template_id: templateId,
  });
  return data;
}

export async function listGeneratedCards(customerId: string): Promise<GeneratedCard[]> {
  const { data } = await apiClient.get<GeneratedCard[]>("/cards", { params: { customer_id: customerId } });
  return data;
}

export async function regenerateCard(cardId: string): Promise<GeneratedCard> {
  const { data } = await apiClient.post<GeneratedCard>(`/cards/${cardId}/regenerate`);
  return data;
}

/**
 * Downloads a generated card format by fetching it as a blob (the endpoint
 * requires an Authorization header, so a plain <a href> can't be used) and
 * triggering a browser save via a temporary link.
 */
export async function downloadCard(
  cardId: string,
  format: "pdf" | "png" | "jpg",
  filename: string,
  side: "front" | "back" = "front"
): Promise<void> {
  const response = await apiClient.get(`/cards/${cardId}/download`, {
    params: { format, side },
    responseType: "blob",
  });
  const url = URL.createObjectURL(response.data as Blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = side === "back" ? `${filename}_back.${format}` : `${filename}.${format}`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
