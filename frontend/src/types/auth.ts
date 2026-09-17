export type UserRole = "super_admin" | "admin" | "operator" | "designer";

export interface CurrentUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  is_active: boolean;
}
