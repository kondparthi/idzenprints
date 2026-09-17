import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/auth/AuthContext";
import { fetchDashboardSummary, type DashboardSummary } from "@/api/dashboard";
import { ORDER_STATUS_LABELS, type OrderStatus } from "@/types/order";
import "./Dashboard.css";

const QUICK_ACTIONS = [
  {
    label: "Create New Card",
    to: "/cards/new",
    icon: <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2M12 12v4m-2-2h4" />,
    accent: true,
  },
  {
    label: "Customers",
    to: "/customers",
    icon: <path d="M17 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8z" />,
  },
  {
    label: "Orders",
    to: "/orders",
    icon: <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 13l2 2 4-4" />,
  },
  {
    label: "Templates",
    to: "/templates",
    icon: <path d="M4 4h7v7H4zM13 4h7v7h-7zM13 13h7v7h-7zM4 13h7v7H4z" />,
  },
  {
    label: "Reports",
    to: "/reports",
    icon: <path d="M3 3v18h18M8 17V9M13 17V5M18 17v-6" />,
  },
];

const STAT_ICONS: Record<string, JSX.Element> = {
  "Total customers": <path d="M17 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8z" />,
  "Today's orders": <path d="M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z" />,
  "Pending orders": <circle cx="12" cy="12" r="9" />,
  "Completed orders": <path d="M20 6L9 17l-5-5" />,
  "Cards generated": <path d="M3 6h18v12H3zM3 10h18" />,
};

export default function Dashboard() {
  const { user } = useAuth();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchDashboardSummary()
      .then(setSummary)
      .finally(() => setIsLoading(false));
  }, []);

  const stats = [
    { label: "Total customers", value: summary?.total_customers },
    { label: "Today's orders", value: summary?.todays_orders },
    { label: "Pending orders", value: summary?.pending_orders },
    { label: "Completed orders", value: summary?.completed_orders },
    { label: "Cards generated", value: summary?.total_cards_generated },
  ];

  const firstName = user?.name?.split(" ")[0];

  return (
    <div>
      <h1>{firstName ? `Welcome back, ${firstName}` : "Dashboard"}</h1>
      <p className="dashboard-subtitle">Here's what's happening across your card orders today.</p>

      <div className="stat-grid">
        {stats.map((stat) => (
          <div key={stat.label} className="stat-tile card-panel">
            <div className="stat-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                {STAT_ICONS[stat.label]}
              </svg>
            </div>
            <div className="stat-value">{isLoading ? "—" : stat.value}</div>
            <div className="stat-label">{stat.label}</div>
          </div>
        ))}
      </div>

      <h2 className="section-heading">Quick actions</h2>
      <div className="quick-actions">
        {QUICK_ACTIONS.map((action) => (
          <Link key={action.to} to={action.to} className={"quick-action" + (action.accent ? " quick-action-accent" : "")}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              {action.icon}
            </svg>
            {action.label}
          </Link>
        ))}
      </div>

      <h2 className="section-heading">Recent orders</h2>
      <div className="card-panel recent-orders-panel">
        {summary?.recent_orders?.length ? (
          <ul className="recent-orders-list">
            {summary.recent_orders.map((order) => (
              <li key={order.id}>
                <Link to={`/customers/${order.customer_id}`} className="recent-orders-id">
                  Order {order.id.slice(0, 8)}
                </Link>
                <span className={"badge " + statusBadgeClass(order.status)}>{ORDER_STATUS_LABELS[order.status]}</span>
                <span className="recent-orders-meta">
                  Qty {order.quantity} · {new Date(order.created_at).toLocaleDateString()}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="empty-state">No orders yet — create one from the Orders page.</p>
        )}
      </div>
    </div>
  );
}

function statusBadgeClass(status: OrderStatus): string {
  if (status === "completed") return "badge-success";
  if (status === "cancelled") return "badge-danger";
  if (status === "new") return "badge-accent";
  return "badge-warning";
}
