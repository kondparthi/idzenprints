import { apiClient } from "./client";
import type { CardType, CardTypeInput } from "@/types/cardType";

export async function listCardTypes(): Promise<CardType[]> {
  const { data } = await apiClient.get<CardType[]>("/card-types");
  return data;
}

export async function createCardType(input: CardTypeInput): Promise<CardType> {
  const { data } = await apiClient.post<CardType>("/card-types", input);
  return data;
}

export async function updateCardType(id: string, input: Partial<CardTypeInput>): Promise<CardType> {
  const { data } = await apiClient.put<CardType>(`/card-types/${id}`, input);
  return data;
}

export async function deleteCardType(id: string): Promise<void> {
  await apiClient.delete(`/card-types/${id}`);
}
