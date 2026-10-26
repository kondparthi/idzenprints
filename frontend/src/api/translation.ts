import { apiClient } from "./client";

export interface TeluguConversion {
  name_local: string;
  address_local: string;
}

/** English -> Telugu (offline on the server). Also applies words the team
 * has corrected before. */
export async function toTelugu(input: { name?: string | null; address?: string | null }): Promise<TeluguConversion> {
  const { data } = await apiClient.post<TeluguConversion>("/translation/telugu", input);
  return data;
}

/** Tells the server which Telugu words an operator fixed, so the same
 * word is converted correctly next time. */
export async function learnTelugu(input: {
  name?: string | null;
  name_local?: string | null;
  address?: string | null;
  address_local?: string | null;
}): Promise<number> {
  const { data } = await apiClient.post<{ learned: number }>("/translation/telugu/learn", input);
  return data.learned;
}
