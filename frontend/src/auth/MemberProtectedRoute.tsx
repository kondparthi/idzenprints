import { Navigate, Outlet } from "react-router-dom";
import { useMemberAuth } from "./MemberAuthContext";

export default function MemberProtectedRoute() {
  const { member, isLoading } = useMemberAuth();

  if (isLoading) {
    return <div className="route-loading">Loading…</div>;
  }

  if (!member) {
    return <Navigate to="/member/login" replace />;
  }

  return <Outlet />;
}
