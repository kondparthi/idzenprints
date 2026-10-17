/**
 * Member-portal Print bucket / Print cards. Same shapes as the staff API
 * (see printApi.ts) but against /auth/member/print — a member's own
 * private library and bucket. Downloading a PDF costs credits, so those
 * calls send a fresh request_id (a double-click can't charge twice),
 * surface the server's message on 402/403, and tell the header to
 * refresh the credit balance.
 */
import { isAxiosError } from "axios";
import { memberApiClient } from "./memberClient";
import { ApiMessageError, type PrintBucketApi, type PrintCardsApi } from "./printApi";
import { downloadCardBlob } from "./memberCards";
import type { CardType } from "@/types/cardType";
import type { PrintBucketItem } from "@/types/printBucket";
import type { PrintSheetItem, UploadedCard } from "@/types/uploadedCard";

const BASE = "/auth/member/print";

export interface MemberPrintAccess {
  allowed: boolean;
  credit_cost: number;
}

/** Turns {detail: {message, reason_code}} (also inside a blob body) into an ApiMessageError. */
async function toApiError(err: unknown): Promise<unknown> {
  if (!isAxiosError(err) || !err.response) return err;
  let data = err.response.data as unknown;
  if (data instanceof Blob) {
    try {
      data = JSON.parse(await data.text());
    } catch {
      return err;
    }
  }
  const detail = (data as { detail?: unknown } | undefined)?.detail;
  if (typeof detail === "string" && detail) return new ApiMessageError(detail);
  if (detail && typeof detail === "object" && "message" in detail) {
    const d = detail as { message: string; reason_code?: string };
    return new ApiMessageError(d.message, d.reason_code);
  }
  return err;
}

async function wrap<T>(call: Promise<T>): Promise<T> {
  try {
    return await call;
  } catch (err) {
    throw await toApiError(err);
  }
}

export function newRequestId(): string {
  return crypto.randomUUID();
}

function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function getPrintAccess(): Promise<MemberPrintAccess> {
  return wrap(memberApiClient.get<MemberPrintAccess>(`${BASE}/access`).then((r) => r.data));
}

export const memberPrintCardsApi: PrintCardsApi = {
  listCardTypes: () => wrap(memberApiClient.get<CardType[]>(`${BASE}/card-types`).then((r) => r.data)),
  listUploadedCards: () => wrap(memberApiClient.get<UploadedCard[]>(`${BASE}/uploaded-cards`).then((r) => r.data)),
  createUploadedCard: (cardTypeId, name, front, back) => {
    const form = new FormData();
    form.append("card_type_id", cardTypeId);
    form.append("name", name);
    form.append("front_file", front);
    if (back) form.append("back_file", back);
    return wrap(memberApiClient.post<UploadedCard>(`${BASE}/uploaded-cards`, form).then((r) => r.data));
  },
  createUploadedCardFromLetter: (cardTypeId, name, letter, password) => {
    const form = new FormData();
    form.append("card_type_id", cardTypeId);
    form.append("name", name);
    form.append("letter_file", letter);
    if (password) form.append("pdf_password", password);
    return wrap(memberApiClient.post<UploadedCard>(`${BASE}/uploaded-cards`, form).then((r) => r.data));
  },
  deleteUploadedCard: (id) => wrap(memberApiClient.delete(`${BASE}/uploaded-cards/${id}`).then(() => undefined)),
  getUploadedCardImageUrl: async (id, side = "front") => {
    const r = await memberApiClient.get(`${BASE}/uploaded-cards/${id}/image`, { params: { side }, responseType: "blob" });
    return URL.createObjectURL(r.data as Blob);
  },
  previewUploadedCardSheet: async (items: PrintSheetItem[], paperSize = "a4") => {
    const r = await wrap(
      memberApiClient.post<{ pages: string[] }>(`${BASE}/print-sheet/preview`, { items, paper_size: paperSize })
    );
    return r.data.pages.map((b64) => `data:image/png;base64,${b64}`);
  },
  printUploadedCardSheet: async (items: PrintSheetItem[], paperSize = "a4") => {
    const r = await wrap(
      memberApiClient.post(
        `${BASE}/print-sheet`,
        { items, paper_size: paperSize, request_id: newRequestId() },
        { responseType: "blob" }
      )
    );
    saveBlob(r.data as Blob, `card-sheet-${paperSize}.pdf`);
    window.dispatchEvent(new Event("idzen:credits-changed"));
  },
};

export const memberPrintBucketApi: PrintBucketApi = {
  listBucket: () => wrap(memberApiClient.get<PrintBucketItem[]>(`${BASE}/bucket`).then((r) => r.data)),
  removeFromBucket: (itemId) => wrap(memberApiClient.delete(`${BASE}/bucket/${itemId}`).then(() => undefined)),
  printBucketSheet: async (itemIds, paperSize = "a4") => {
    const r = await wrap(
      memberApiClient.post(
        `${BASE}/bucket/print`,
        { item_ids: itemIds, paper_size: paperSize, request_id: newRequestId() },
        { responseType: "blob" }
      )
    );
    saveBlob(r.data as Blob, `print-bucket-${paperSize}.pdf`);
    window.dispatchEvent(new Event("idzen:credits-changed"));
  },
  getCardImageUrl: async (cardId, side = "front") =>
    URL.createObjectURL(await downloadCardBlob(cardId, "png", side)),
  addToBucket: (generatedCardId) =>
    wrap(memberApiClient.post<PrintBucketItem>(`${BASE}/bucket`, { generated_card_id: generatedCardId }).then((r) => r.data)),
};
