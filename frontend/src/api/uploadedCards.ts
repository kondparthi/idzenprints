import { apiClient } from "./client";
import type { PrintSheetItem, UploadedCard } from "@/types/uploadedCard";

export async function listUploadedCards(cardTypeId?: string): Promise<UploadedCard[]> {
  const { data } = await apiClient.get<UploadedCard[]>("/uploaded-cards", {
    params: cardTypeId ? { card_type_id: cardTypeId } : undefined,
  });
  return data;
}

export async function createUploadedCard(
  cardTypeId: string,
  name: string,
  frontFile: File,
  backFile?: File | null
): Promise<UploadedCard> {
  const form = new FormData();
  form.append("card_type_id", cardTypeId);
  form.append("name", name);
  form.append("front_file", frontFile);
  if (backFile) form.append("back_file", backFile);
  const { data } = await apiClient.post<UploadedCard>("/uploaded-cards", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

export async function deleteUploadedCard(id: string): Promise<void> {
  await apiClient.delete(`/uploaded-cards/${id}`);
}

/**
 * Fetches an uploaded card's front/back image as a blob URL for inline
 * display (the endpoint requires an Authorization header, so a plain
 * <img src> pointing straight at it won't work). Caller should revoke the
 * URL when done with it to avoid leaking blob memory.
 */
export async function getUploadedCardImageUrl(id: string, side: "front" | "back" = "front"): Promise<string> {
  const response = await apiClient.get(`/uploaded-cards/${id}/image`, {
    params: { side },
    responseType: "blob",
  });
  return URL.createObjectURL(response.data as Blob);
}

/**
 * Renders the same layout as printUploadedCardSheet but as PNG page
 * images (data: URIs) instead of a PDF — for an on-screen "this is what
 * will print" preview before committing to the download.
 */
export async function previewUploadedCardSheet(items: PrintSheetItem[], paperSize = "a4"): Promise<string[]> {
  const { data } = await apiClient.post<{ pages: string[] }>("/uploaded-cards/print-sheet/preview", {
    items,
    paper_size: paperSize,
  });
  return data.pages.map((base64) => `data:image/png;base64,${base64}`);
}

/**
 * Renders the selected library cards (each with its own copy count) as one
 * multi-page PDF — front and back side by side in an auto-tiled grid sized
 * to the chosen paper — and triggers a browser save.
 */
export async function printUploadedCardSheet(items: PrintSheetItem[], paperSize = "a4"): Promise<void> {
  const response = await apiClient.post(
    "/uploaded-cards/print-sheet",
    { items, paper_size: paperSize },
    { responseType: "blob" }
  );
  const url = URL.createObjectURL(response.data as Blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `card-sheet-${paperSize}.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
