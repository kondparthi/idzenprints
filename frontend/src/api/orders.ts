import { apiClient } from "./client";
import type { Order, OrderInput, OrderStatus } from "@/types/order";

export async function listOrders(filters?: { customerId?: string; status?: OrderStatus }): Promise<Order[]> {
  const { data } = await apiClient.get<Order[]>("/orders", {
    params: { customer_id: filters?.customerId, status: filters?.status },
  });
  return data;
}

export async function createOrder(input: OrderInput): Promise<Order> {
  const { data } = await apiClient.post<Order>("/orders", input);
  return data;
}

export async function updateOrderStatus(id: string, status: OrderStatus): Promise<Order> {
  const { data } = await apiClient.put<Order>(`/orders/${id}/status`, { status });
  return data;
}
