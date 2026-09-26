import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useMemberAuth } from "@/auth/MemberAuthContext";
import { fetchMemberDashboard } from "@/api/memberAuth";
import { MEMBER_SIDEBAR } from "@/config/memberSidebar";
import NavIcon from "@/components/NavIcon";
import SearchModal from "@/components/SearchModal";
import idzenIcon from "@/assets/brand/idzen-icon.png";
import "@/layouts/AppLayout.css";
import "./MemberLayout.css";

export default function MemberLayout() {
  const { member, logout } = useMemberAuth();
  const navigate = useNavigate();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [credits, setCredits] = useState<number | null>(null);

  useEffect(() => {
    function refreshCredits() {
      fetchMemberDashboard().then((data) => {
        setCredits(data.subscription ? data.subscription.credits_remaining : 0);
      });
    }
    refreshCredits();
    window.addEventListener("idzen:credits-changed", refreshCredits);
    return () => window.removeEventListener("idzen:credits-changed", refreshCredits);
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
        <nav className="app-nav member-nav">
          {MEMBER_SIDEBAR.map((section, idx) => (
            <div key={idx} className="member-nav-section">
              {section.heading && <span className="member-nav-section-heading">{section.heading}</span>}
              {section.items.map((item) => (
                <NavLink
                  key={item.slug}
                  to={item.route ?? `/member/section/${item.slug}`}
                  end={Boolean(item.route)}
                  className={({ isActive }) => "app-nav-link" + (isActive ? " active" : "")}
                >
                  <NavIcon name={item.icon} />
                  {item.label}
                  {item.badge === "new" && <span className="member-nav-badge">NEW</span>}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
      </aside>
      <div className="app-main">
        <header className="app-topbar member-topbar">
          <div className="member-topbar-marquee">
            <span className="member-topbar-marquee-track">
              Welcome to IDZEN Prints — free registration, real credits, real cards. Explore Govt. Services, Print
              Services, and more from the sidebar.
            </span>
          </div>

          <div className="member-topbar-actions">
            <button className="member-topbar-icon-btn member-topbar-search-btn" onClick={() => setIsSearchOpen(true)} aria-label="Search">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="7" />
                <path d="M21 21l-4.35-4.35" />
              </svg>
            </button>

            <button className="member-topbar-icon-btn" aria-label="Notifications">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 8a6 6 0 1112 0c0 5 2 6 2 6H4s2-1 2-6zM9.5 18a2.5 2.5 0 005 0" />
              </svg>
              <span className="member-topbar-badge">0</span>
            </button>

            <button className="member-topbar-icon-btn" aria-label="Messages">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
              </svg>
              <span className="member-topbar-badge">0</span>
            </button>

            <div className="member-topbar-wallet-chip">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 12V8H6a2 2 0 010-4h12v4M4 6v12a2 2 0 002 2h14v-4M18 12a2 2 0 100 4 2 2 0 000-4z" />
              </svg>
              {credits ?? "—"}
            </div>
          </div>

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

      <SearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </div>
  );
}
