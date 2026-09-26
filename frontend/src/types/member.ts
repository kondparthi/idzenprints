export interface MemberListItem {
  id: string;
  full_name: string;
  login_id: string;
  email: string;
  phone: string;
  member_type: { id: string; name: string };
  is_active: boolean;
  created_at: string;
  has_subscription: boolean;
  subscription_status: string | null;
}
