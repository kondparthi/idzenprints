import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useMemberAuth } from "@/auth/MemberAuthContext";
import { fetchMemberDashboard } from "@/api/memberAuth";
import type { DashboardService } from "@/types/memberAuth";
import idzenIcon from "@/assets/brand/idzen-icon.png";
import "@/layouts/AppLayout.css";
import "./MemberLayout.css";

export default function MemberLayout() {
  const { member, logout } = useMemberAuth();
  const navigate = useNavigate();
  const [services, setServices] = useState<DashboardService[]>([]);

  useEffect(() => {
    // The sidebar's service list must reflect actual entitlements (spec
    // section 17) — refetched from the dashboard endpoint, never a
    // static list, so a package change immediately changes what's shown
    // on next load.
    fetchMemberDashboard().then((data) => {
      if (data.subscription) setServices(data.subscription.services);
    });
  }, []);

  async function handleLogout() {
    await logout();
    navigate("/member/login", { replace: true });
  }

  const initials = (member?.full_name ?? "?")
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="app-shell">
      <aside className="app-sidebar">
        <div className="app-sidebar-brand">
          <img src={idzenIcon} alt="IDZEN" className="app-sidebar-logo-mark" />
          IDZEN
        </div>
        <nav className="app-nav">
          <NavLink to="/member/dashboard" end className={({ isActive }) => "app-nav-link" + (isActive ? " active" : "")}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 13h6V4H4v9zM14 20h6v-9h-6v9zM4 20h6v-4H4v4zM14 10h6V4h-6v6" />
            </svg>
            Dashboard
          </NavLink>
          <NavLink to="/member/subscription" className={({ isActive }) => "app-nav-link" + (isActive ? " active" : "")}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
            </svg>
            My Subscription
          </NavLink>
          <NavLink to="/member/credit-history" className={({ isActive }) => "app-nav-link" + (isActive ? " active" : "")}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 8v4l3 3M3 12a9 9 0 1018 0 9 9 0 00-18 0z" />
            </svg>
            Credit History
          </NavLink>
          <NavLink to="/member/profile" className={({ isActive }) => "app-nav-link" + (isActive ? " active" : "")}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z" />
            </svg>
            Profile
          </NavLink>

          {services.length > 0 && (
            <div className="member-sidebar-services">
              <span className="member-sidebar-services-heading">Cards</span>
              {services.map((s) => (
                <span key={s.id} className="member-sidebar-service-item">
                  {s.name}
                </span>
              ))}
            </div>
          )}
        </nav>
      </aside>
      <div className="app-main">
        <header className="app-topbar">
          <div />
          <div className="app-topbar-user">
            <button className="app-user-trigger" onClick={handleLogout}>
              <span className="avatar">{initials}</span>
              <span className="app-user-trigger-text">
                <span className="app-user-name">{member?.full_name}</span>
                <span className="app-topbar-role">{member?.member_type.name}</span>
              </span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="app-user-chevron">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        </header>
        <main className="app-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
