import { apiClient } from "./client";
import type { DocumentRecord, DocumentType } from "@/types/document";
import type { CustomerDetails } from "@/types/document";
import type { PaginatedResponse } from "@/types/customer";

export async function uploadDocument(
  customerId: string,
  documentType: DocumentType,
  file: File,
  backFile?: File | null
): Promise<DocumentRecord> {
  const formData = new FormData();
  formData.append("customer_id", customerId);
  formData.append("document_type", documentType);
  formData.append("file", file);
  if (backFile) {
    formData.append("back_file", backFile);
  }
  const { data } = await apiClient.post<DocumentRecord>("/documents/upload", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

export async function listDocuments(
  customerId: string | undefined,
  page: number,
  pageSize = 20
): Promise<PaginatedResponse<DocumentRecord>> {
  const { data } = await apiClient.get<PaginatedResponse<DocumentRecord>>("/documents", {
    params: { customer_id: customerId, page, page_size: pageSize },
  });
  return data;
}

export async function getDocument(id: string): Promise<DocumentRecord> {
  const { data } = await apiClient.get<DocumentRecord>(`/documents/${id}`);
  return data;
}

export async function deleteDocument(id: string): Promise<void> {
  await apiClient.delete(`/documents/${id}`);
}

export async function processDocument(id: string): Promise<CustomerDetails> {
  const { data } = await apiClient.post<CustomerDetails>(`/documents/${id}/process`);
  return data;
}

/**
 * The file endpoint requires an Authorization header, so it can't be used
 * directly as an <img>/<iframe> src. Fetch it as a blob and hand back an
 * object URL instead; callers must revokeObjectURL it when done.
 */
export async function fetchDocumentFileUrl(id: string): Promise<string> {
  const response = await apiClient.get(`/documents/${id}/file`, { responseType: "blob" });
  return URL.createObjectURL(response.data as Blob);
}

export async function fetchDocumentBackFileUrl(id: string): Promise<string> {
  const response = await apiClient.get(`/documents/${id}/back-file`, { responseType: "blob" });
  return URL.createObjectURL(response.data as Blob);
}
