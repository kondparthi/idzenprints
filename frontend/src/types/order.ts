export type OrderStatus = "new" | "processing" | "ready" | "printed" | "completed" | "cancelled";

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  new: "New",
  processing: "Processing",
  ready: "Ready",
  printed: "Printed",
  completed: "Completed",
  cancelled: "Cancelled",
};

export const ORDER_STATUSES: OrderStatus[] = ["new", "processing", "ready", "printed", "completed", "cancelled"];

export interface Order {
  id: string;
  customer_id: string;
  card_type_id: string;
  template_id: string | null;
  quantity: number;
  status: OrderStatus;
  created_by: string | null;
}

export interface OrderInput {
  customer_id: string;
  card_type_id: string;
  template_id?: string;
  quantity: number;
}
