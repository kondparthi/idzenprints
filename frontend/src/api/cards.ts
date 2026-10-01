import { apiClient } from "./client";
import type { GeneratedCard } from "@/types/generatedCard";

// side -> template element id -> data: URI PNG. A staff-confirmed "this
// box is correct, use exactly this image" snapshot (see getBoxImageDataUrl),
// sent to preview/generate so the locked image — not a fresh text render —
// is what actually ends up on screen and on the printed card.
export type FieldImageOverrides = Record<string, Record<string, string>>;

export async function previewCard(
  customerId: string,
  templateId: string,
  side: "front" | "back" = "front",
  fieldImageOverrides?: FieldImageOverrides
): Promise<string> {
  const response = await apiClient.post(
    "/cards/preview",
    { customer_id: customerId, template_id: templateId, field_image_overrides: fieldImageOverrides ?? undefined },
    { params: { side }, responseType: "blob" }
  );
  return URL.createObjectURL(response.data as Blob);
}

/** Renders one template element on its own, as a small PNG, and returns it
 * as a data: URI — small enough to keep in React state and send back
 * verbatim as a field_image_overrides entry once the operator drags it
 * onto the matching spot on the card. */
export async function getBoxImageDataUrl(
  customerId: string,
  templateId: string,
  side: "front" | "back",
  elementId: string
): Promise<string> {
  const response = await apiClient.post(
    "/cards/box-image",
    { customer_id: customerId, template_id: templateId, side, element_id: elementId },
    { responseType: "arraybuffer" }
  );
  const base64 = btoa(new Uint8Array(response.data as ArrayBuffer).reduce((s, b) => s + String.fromCharCode(b), ""));
  return `data:image/png;base64,${base64}`;
}

export async function generateCard(
  customerId: string,
  templateId: string,
  fieldImageOverrides?: FieldImageOverrides
): Promise<GeneratedCard> {
  const { data } = await apiClient.post<GeneratedCard>("/cards/generate", {
    customer_id: customerId,
    template_id: templateId,
    field_image_overrides: fieldImageOverrides ?? undefined,
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
