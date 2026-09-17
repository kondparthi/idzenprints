import type { MemberType } from "./subscription";

export interface MemberRegisterInput {
  full_name: string;
  phone: string;
  email: string;
  login_id: string;
  password: string;
  member_type_id: string;
  package_id: string;
  agree_terms: boolean;
  agree_privacy: boolean;
  device_id?: string;
  device_name?: string;
}

export interface CurrentMember {
  id: string;
  full_name: string;
  phone: string;
  email: string;
  login_id: string;
  is_active: boolean;
  member_type: MemberType;
}

export interface RegisterResponse {
  member: CurrentMember;
  subscription_status: string;
  access_token: string;
  token_type: string;
}

export interface DashboardService {
  id: string;
  name: string;
  credit_cost: number;
}

export interface DashboardSubscription {
  package_name: string;
  status: string;
  start_date: string;
  expiry_date: string;
  days_remaining: number;
  credits_allocated: number;
  credits_remaining: number;
  pdf_limit: number;
  pdf_used: number;
  services: DashboardService[];
}

export interface MemberDashboard {
  member: CurrentMember;
  subscription: DashboardSubscription | null;
}
