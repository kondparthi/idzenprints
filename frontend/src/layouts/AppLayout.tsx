import { useEffect, useRef, useState } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "@/auth/AuthContext";
import { usePrintBucket } from "@/print-bucket/PrintBucketContext";
import idzenIcon from "@/assets/brand/idzen-icon.png";
import "./AppLayout.css";

const NAV_ITEMS = [
  {
    to: "/dashboard",
    label: "Dashboard",
    end: true,
    icon: <path d="M4 13h6V4H4v9zM14 20h6v-9h-6v9zM4 20h6v-4H4v4zM14 10h6V4h-6v6" />,
  },
  {
    to: "/customers",
    label: "Customers",
    icon: <path d="M17 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />,
  },
  {
    to: "/members",
    label: "Members",
    icon: <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8zM17 9l2 2 3-4" />,
  },
  {
    to: "/orders",
    label: "Orders",
    icon: <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2M9 13l2 2 4-4" />,
  },
  {
    to: "/card-types",
    label: "Card Types",
    icon: <path d="M2 7a2 2 0 012-2h16a2 2 0 012 2v10a2 2 0 01-2 2H4a2 2 0 01-2-2V7zM2 10h20M6 15h4" />,
  },
  {
    to: "/templates",
    label: "Templates",
    icon: <path d="M4 4h7v7H4zM13 4h7v7h-7zM13 13h7v7h-7zM4 13h7v7H4z" />,
  },
  {
    to: "/reports",
    label: "Reports",
    icon: <path d="M3 3v18h18M8 17V9M13 17V5M18 17v-6" />,
  },
  {
    to: "/products",
    label: "Products",
    icon: <path d="M20.59 13.41L13.42 20.58a2 2 0 01-2.83 0L2.5 12.5V2.5h10L20.59 10.59a2 2 0 010 2.82zM7 7h.01" />,
  },
  {
    to: "/product-categories",
    label: "Categories",
    icon: <path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z" />,
  },
  {
    to: "/brands",
    label: "Brands",
    icon: <path d="M12 2l2.4 5.5L20 8.3l-4 3.9.9 5.8L12 15.9l-4.9 2.1.9-5.8-4-3.9 5.6-.8z" />,
  },
  {
    to: "/member-types",
    label: "Member Types",
    icon: <path d="M17 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />,
  },
  {
    to: "/packages",
    label: "Packages",
    icon: <path d="M20.59 13.41L13.42 20.58a2 2 0 01-2.83 0L2.5 12.5V2.5h10L20.59 10.59a2 2 0 010 2.82zM7 7h.01" />,
  },
  {
    to: "/subscriptions",
    label: "Subscriptions",
    icon: <path d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />,
  },
];

export default function AppLayout() {
  const { user, logout } = useAuth();
  const { count: bucketCount } = usePrintBucket();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const initials = (user?.name ?? "?")
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  async function handleLogout() {
    setIsMenuOpen(false);
    await logout();
    navigate("/login", { replace: true });
  }

  return (
    <div className="app-shell">
      <aside className="app-sidebar">
        <div className="app-sidebar-brand">
          <img src={idzenIcon} alt="IDZEN" className="app-sidebar-logo-mark" />
          IDZEN
        </div>
        <nav className="app-nav">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => "app-nav-link" + (isActive ? " active" : "")}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                {item.icon}
              </svg>
              {item.label}
            </NavLink>
          ))}
          <NavLink to="/print-bucket" className={({ isActive }) => "app-nav-link" + (isActive ? " active" : "")}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 2l1.5 5M18 2l-1.5 5M3.5 7h17l-1.6 12.2a2 2 0 01-2 1.8H7.1a2 2 0 01-2-1.8L3.5 7zM9 11v5M15 11v5" />
            </svg>
            Print bucket
            {bucketCount > 0 && <span className="app-nav-badge">{bucketCount}</span>}
          </NavLink>
        </nav>
      </aside>
      <div className="app-main">
        <header className="app-topbar">
          <div />
          <div className="app-topbar-user" ref={menuRef}>
            <button className="app-user-trigger" onClick={() => setIsMenuOpen((v) => !v)}>
              <span className="avatar">{initials}</span>
              <span className="app-user-trigger-text">
                <span className="app-user-name">{user?.name}</span>
                <span className="app-topbar-role">{user?.role.replace("_", " ")}</span>
              </span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="app-user-chevron">
                <path d="M6 9l6 6 6-6" />
              </svg>
            </button>

            {isMenuOpen && (
              <div className="app-user-menu">
                <Link to="/profile" className="app-user-menu-item" onClick={() => setIsMenuOpen(false)}>
                  Profile
                </Link>
                <Link to="/change-password" className="app-user-menu-item" onClick={() => setIsMenuOpen(false)}>
                  Change password
                </Link>
                <button className="app-user-menu-item app-user-menu-danger" onClick={handleLogout}>
                  Log out
                </button>
              </div>
            )}
          </div>
        </header>
        <main className="app-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
