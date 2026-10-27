/**
 * The Quick card page is shared by staff and members. This adapter hides
 * the differences: staff create a customer and work by customer id;
 * members work on their own implicit customer by document id, and cards
 * cost credits.
 */
import { memberApiClient } from "./memberClient";
import { createCustomer, updateCustomer } from "./customers";
import { uploadDocument as staffUpload, processDocument as staffProcess } from "./documents";
import { listTemplates } from "./templates";
import { downloadCard, generateCard as staffGenerate, previewCard as staffPreview } from "./cards";
import { addToBucket as staffAddToBucket } from "./printBucket";
import { listCardTypes as staffListCardTypes } from "./cardTypes";
import { listActiveCardTypes } from "./public";
import {
  uploadDocument as memberUpload, processDocument as memberProcess, listTemplatesForCardType,
  previewCard as memberPreview, generateCard as memberGenerate, triggerCardDownload,
} from "./memberCards";
import { memberPrintBucketApi } from "./memberPrint";
import {
  downloadPrintSheet, openPrintSheet, previewPrintSheet, type PrintSheetOptions,
} from "./printSheet";
import type { CardType } from "@/types/cardType";
import type { CustomerDetails, DocumentType } from "@/types/document";
import type { GeneratedCard } from "@/types/generatedCard";
import type { Template } from "@/types/template";

export interface QuickCtx {
  docId: string;
  customerId: string | null;
}

export interface QuickCardApi {
  mode: "staff" | "member";
  showMobile: boolean;
  bucketPath: string;
  listCardTypes(): Promise<CardType[]>;
  upload(a: { docType: DocumentType; file: File; back: File | null; mobile: string }): Promise<QuickCtx>;
  process(ctx: QuickCtx, password: string): Promise<CustomerDetails>;
  listTemplates(cardTypeId: string): Promise<Template[]>;
  preview(ctx: QuickCtx, templateId: string, side: "front" | "back"): Promise<string>;
  generate(ctx: QuickCtx, templateId: string, cardTypeId: string): Promise<GeneratedCard>;
  download(cardId: string, filename: string, format: "png" | "jpg" | "pdf"): Promise<void>;
  addToBucket(cardId: string): Promise<void>;
  sheetPreview(cardId: string, o: PrintSheetOptions): Promise<string[]>;
  sheetPdf(cardId: string, o: PrintSheetOptions, filename: string): Promise<void>;
  sheetOpen(cardId: string, o: PrintSheetOptions): Promise<void>;
}

export const staffQuickApi: QuickCardApi = {
  mode: "staff",
  showMobile: true,
  bucketPath: "/print-bucket",
  listCardTypes: () => staffListCardTypes().then((t) => t.filter((x) => x.is_active)),
  async upload({ docType, file, back, mobile }) {
    const customer = await createCustomer({ name: "Quick card", mobile: mobile.trim() || "0000000000" });
    const doc = await staffUpload(customer.id, docType, file, back);
    return { docId: doc.id, customerId: customer.id };
  },
  async process(ctx, password) {
    const details = await staffProcess(ctx.docId, { password: password || undefined, englishToTelugu: true });
    const name = (details.name ?? "").trim();
    if (name && ctx.customerId) await updateCustomer(ctx.customerId, { name, address: details.address || undefined });
    return details;
  },
  listTemplates: (id) => listTemplates(id).then((t) => t.filter((x) => x.is_active)),
  preview: (ctx, templateId, side) => staffPreview(ctx.customerId!, templateId, side),
  generate: (ctx, templateId) => staffGenerate(ctx.customerId!, templateId),
  download: (cardId, filename, format) => downloadCard(cardId, format, filename) as Promise<void>,
  addToBucket: (cardId) => staffAddToBucket(cardId).then(() => undefined),
  sheetPreview: previewPrintSheet,
  sheetPdf: downloadPrintSheet,
  sheetOpen: openPrintSheet,
};

async function memberSheetPdfBlob(cardId: string, o: PrintSheetOptions): Promise<Blob> {
  const r = await memberApiClient.post(`/auth/member/cards/${cardId}/print-sheet/pdf`, o, { responseType: "blob" });
  return r.data as Blob;
}

export const memberQuickApi: QuickCardApi = {
  mode: "member",
  showMobile: false,
  bucketPath: "/member/print-bucket",
  listCardTypes: () => listActiveCardTypes(),
  async upload({ docType, file, back }) {
    const doc = await memberUpload(docType, file, back ?? undefined);
    return { docId: doc.id, customerId: null };
  },
  process: (ctx, password) => memberProcess(ctx.docId, password || undefined),
  listTemplates: (id) => listTemplatesForCardType(id),
  preview: (ctx, templateId, side) => memberPreview(ctx.docId, templateId, side),
  generate: async (ctx, templateId, cardTypeId) => {
    const card = await memberGenerate(ctx.docId, templateId, cardTypeId);
    window.dispatchEvent(new Event("idzen:credits-changed"));
    return card;
  },
  download: (cardId, filename, format) => triggerCardDownload(cardId, `${filename}.${format}`, format),
  addToBucket: async (cardId) => {
    await memberPrintBucketApi.addToBucket?.(cardId);
  },
  async sheetPreview(cardId, o) {
    const { data } = await memberApiClient.post<{ pages: string[] }>(`/auth/member/cards/${cardId}/print-sheet/preview`, o);
    return data.pages;
  },
  async sheetPdf(cardId, o, filename) {
    const url = URL.createObjectURL(await memberSheetPdfBlob(cardId, o));
    const a = document.createElement("a");
    a.href = url;
    a.download = `${filename}.pdf`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  },
  async sheetOpen(cardId, o) {
    window.open(URL.createObjectURL(await memberSheetPdfBlob(cardId, o)), "_blank");
  },
};
