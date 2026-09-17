import { apiClient } from "./client";

export interface ReportSummary {
  total_orders: number;
  orders_by_status: Record<string, number>;
  orders_by_card_type: { card_type: string; count: number }[];
  orders_by_operator: { operator: string; count: number }[];
  daily_orders: { date: string; count: number }[];
  cards_generated: number;
}

export async function fetchReportSummary(dateFrom?: string, dateTo?: string): Promise<ReportSummary> {
  const { data } = await apiClient.get<ReportSummary>("/reports/summary", {
    params: { date_from: dateFrom || undefined, date_to: dateTo || undefined },
  });
  return data;
}

export async function downloadOrdersCsv(dateFrom?: string, dateTo?: string): Promise<void> {
  const response = await apiClient.get("/reports/orders", {
    params: { date_from: dateFrom || undefined, date_to: dateTo || undefined, format: "csv" },
    responseType: "blob",
  });
  const url = URL.createObjectURL(response.data as Blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "orders_report.csv";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
