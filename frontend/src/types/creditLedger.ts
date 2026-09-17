export interface CreditTransaction {
  id: string;
  subscription_id: string;
  transaction_type: "credit" | "debit" | "refund" | "adjustment" | "expiry";
  amount: number;
  balance_after: number;
  reference_type: string | null;
  reference_id: string | null;
  description: string | null;
  created_by: string | null;
  created_at: string;
}

export interface PdfUsageRecord {
  id: string;
  subscription_id: string;
  order_id: string | null;
  card_type_id: string;
  card_type_name: string;
  quantity: number;
  created_at: string;
}
