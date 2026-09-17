import { apiClient } from "./client";
import type { OrderStatus } from "@/types/order";

export interface RecentOrder {
  id: string;
  customer_id: string;
  status: OrderStatus;
  quantity: number;
  created_at: string;
}

export interface DashboardSummary {
  total_customers: number;
  todays_orders: number;
  pending_orders: number;
  completed_orders: number;
  total_cards_generated: number;
  recent_orders: RecentOrder[];
}

export async function fetchDashboardSummary(): Promise<DashboardSummary> {
  const { data } = await apiClient.get<DashboardSummary>("/dashboard/summary");
  return data;
}
