import type { CardType } from "./cardType";

export interface MemberType {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  is_active: boolean;
  is_default: boolean;
  services: CardType[];
}

export interface MemberTypeInput {
  name: string;
  description?: string;
  is_active?: boolean;
  is_default?: boolean;
  service_ids?: string[];
}

export interface Package {
  id: string;
  name: string;
  slug: string;
  price: string;
  credits: number;
  license_days: number;
  device_limit: number;
  pdf_generation_limit: number;
  is_active: boolean;
  member_types: MemberType[];
  services: CardType[];
  subscriber_count: number;
}

export interface PackageInput {
  name: string;
  price: string;
  credits: number;
  license_days: number;
  device_limit: number;
  pdf_generation_limit: number;
  is_active?: boolean;
  member_type_ids?: string[];
  service_ids?: string[];
}

export type SubscriptionStatus = "pending_approval" | "active" | "expired" | "suspended" | "cancelled";

export const SUBSCRIPTION_STATUS_LABELS: Record<SubscriptionStatus, string> = {
  pending_approval: "Pending approval",
  active: "Active",
  expired: "Expired",
  suspended: "Suspended",
  cancelled: "Cancelled",
};

export interface Subscription {
  id: string;
  member_id: string;
  member_name: string;
  member_login_id: string;
  package_id: string;
  package_name: string;
  member_type_id: string;
  member_type_name: string;
  start_date: string;
  expiry_date: string;
  credits_allocated: number;
  credits_remaining: number;
  pdf_limit: number;
  pdf_used: number;
  status: SubscriptionStatus;
}
