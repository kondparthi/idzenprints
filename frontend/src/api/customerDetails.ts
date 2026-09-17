import { apiClient } from "./client";
import type { CustomerDetails, CustomerDetailsInput } from "@/types/document";

export async function getCustomerDetails(id: string): Promise<CustomerDetails> {
  const { data } = await apiClient.get<CustomerDetails>(`/customer-details/${id}`);
  return data;
}

export async function listCustomerDetailsForCustomer(customerId: string): Promise<CustomerDetails[]> {
  const { data } = await apiClient.get<CustomerDetails[]>(`/customer-details/by-customer/${customerId}`);
  return data;
}

export async function updateCustomerDetails(
  id: string,
  input: CustomerDetailsInput
): Promise<CustomerDetails> {
  const { data } = await apiClient.put<CustomerDetails>(`/customer-details/${id}`, input);
  return data;
}
