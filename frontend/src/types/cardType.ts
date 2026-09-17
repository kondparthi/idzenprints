export interface CardType {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  credit_cost: number;
}

export interface CardTypeInput {
  name: string;
  description?: string;
  is_active?: boolean;
  credit_cost?: number;
}
