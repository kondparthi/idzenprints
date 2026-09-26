import { memberApiClient } from "./memberClient";
import type { DocumentRecord, DocumentType, CustomerDetails, CustomerDetailsInput } from "@/types/document";
import type { Template } from "@/types/template";
import type { GeneratedCard } from "@/types/generatedCard";

export async function uploadDocument(
  documentType: DocumentType,
  file: File,
  backFile?: File
): Promise<DocumentRecord> {
  const form = new FormData();
  form.append("document_type", documentType);
  form.append("file", file);
  if (backFile) form.append("back_file", backFile);
  const { data } = await memberApiClient.post<DocumentRecord>("/auth/member/cards/documents", form);
  return data;
}

export async function processDocument(documentId: string, password?: string): Promise<CustomerDetails> {
  const { data } = await memberApiClient.post<CustomerDetails>(`/auth/member/cards/documents/${documentId}/process`, {
    password: password || undefined,
  });
  return data;
}

export async function getDocumentDetails(documentId: string): Promise<CustomerDetails> {
  const { data } = await memberApiClient.get<CustomerDetails>(`/auth/member/cards/documents/${documentId}/details`);
  return data;
}

export async function updateDocumentDetails(documentId: string, input: CustomerDetailsInput): Promise<CustomerDetails> {
  const { data } = await memberApiClient.patch<CustomerDetails>(
    `/auth/member/cards/documents/${documentId}/details`,
    input
  );
  return data;
}

export async function listTemplatesForCardType(cardTypeId: string): Promise<Template[]> {
  const { data } = await memberApiClient.get<Template[]>("/auth/member/cards/templates", {
    params: { card_type_id: cardTypeId },
  });
  return data;
}

export async function previewCard(documentId: string, templateId: string): Promise<string> {
  const { data } = await memberApiClient.post(
    "/auth/member/cards/preview",
    null,
    { params: { document_id: documentId, template_id: templateId }, responseType: "blob" }
  );
  return URL.createObjectURL(data as Blob);
}

export async function generateCard(documentId: string, templateId: string, cardTypeId: string): Promise<GeneratedCard> {
  const { data } = await memberApiClient.post<GeneratedCard>(
    "/auth/member/cards/generate",
    null,
    { params: { document_id: documentId, template_id: templateId, card_type_id: cardTypeId } }
  );
  return data;
}

export async function downloadCardBlob(cardId: string, format: "pdf" | "png" | "jpg" = "pdf"): Promise<Blob> {
  const { data } = await memberApiClient.get(`/auth/member/cards/${cardId}/download`, {
    params: { format },
    responseType: "blob",
  });
  return data as Blob;
}

/** Triggers an actual browser download — a plain <a href> to the API
 * URL wouldn't carry the member's auth token, so this fetches the
 * file through the authenticated client first, then hands the
 * browser a local blob URL to save. */
export async function triggerCardDownload(cardId: string, filename: string, format: "pdf" | "png" | "jpg" = "pdf") {
  const blob = await downloadCardBlob(cardId, format);
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
