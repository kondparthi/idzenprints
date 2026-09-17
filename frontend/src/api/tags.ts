import { apiClient } from "./client";
import type { Tag } from "@/types/product";

export async function listTags(): Promise<Tag[]> {
  const { data } = await apiClient.get<Tag[]>("/tags");
  return data;
}

export async function createTag(name: string): Promise<Tag> {
  const { data } = await apiClient.post<Tag>("/tags", { name });
  return data;
}
