import { apiClient } from "./client";
import type { Template, TemplateInput } from "@/types/template";

export async function listTemplates(cardTypeId?: string): Promise<Template[]> {
  const { data } = await apiClient.get<Template[]>("/templates", {
    params: cardTypeId ? { card_type_id: cardTypeId } : undefined,
  });
  return data;
}

export async function getTemplate(id: string): Promise<Template> {
  const { data } = await apiClient.get<Template>(`/templates/${id}`);
  return data;
}

export async function createTemplate(input: TemplateInput): Promise<Template> {
  const { data } = await apiClient.post<Template>("/templates", input);
  return data;
}

export async function updateTemplate(id: string, input: Partial<TemplateInput & { is_active: boolean }>): Promise<Template> {
  const { data } = await apiClient.put<Template>(`/templates/${id}`, input);
  return data;
}

export async function duplicateTemplate(id: string): Promise<Template> {
  const { data } = await apiClient.post<Template>(`/templates/${id}/duplicate`);
  return data;
}

export async function deleteTemplate(id: string): Promise<void> {
  await apiClient.delete(`/templates/${id}`);
}

export type TemplateSide = "front" | "back";

export async function uploadTemplateBackground(id: string, file: File, side: TemplateSide = "front"): Promise<Template> {
  const formData = new FormData();
  formData.append("file", file);
  const { data } = await apiClient.post<Template>(`/templates/${id}/background`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
    params: { side },
  });
  return data;
}

export async function fetchTemplateBackgroundUrl(id: string, side: TemplateSide = "front"): Promise<string> {
  const response = await apiClient.get(`/templates/${id}/background/file`, {
    responseType: "blob",
    params: { side },
  });
  return URL.createObjectURL(response.data as Blob);
}
