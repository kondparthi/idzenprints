export interface MemberSession {
  id: string;
  member_id: string;
  device_id: string;
  device_name: string | null;
  ip_address: string | null;
  user_agent: string | null;
  login_at: string;
  last_activity_at: string | null;
  logout_at: string | null;
  status: "active" | "logged_out" | "revoked";
}
