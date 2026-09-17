import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { listSubscriptions, setSubscriptionStatus } from "@/api/subscriptions";
import { SUBSCRIPTION_STATUS_LABELS, type Subscription, type SubscriptionStatus } from "@/types/subscription";
import "./Products.css";

const STATUS_OPTIONS: SubscriptionStatus[] = ["pending_approval", "active", "expired", "suspended", "cancelled"];

export default function Subscriptions() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [statusFilter, setStatusFilter] = useState<SubscriptionStatus | "">("");
  const [isLoading, setIsLoading] = useState(true);

  async function refresh() {
    setIsLoading(true);
    try {
      setSubscriptions(await listSubscriptions(statusFilter || undefined));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  async function handleStatusChange(subscription: Subscription, newStatus: SubscriptionStatus) {
    await setSubscriptionStatus(subscription.id, newStatus);
    refresh();
  }

  function statusBadgeClass(status: SubscriptionStatus): string {
    if (status === "active") return "badge-success";
    if (status === "expired" || status === "cancelled") return "badge-danger";
    if (status === "suspended") return "badge-warning";
    return "badge-neutral";
  }

  return (
    <div>
      <h1>Subscriptions</h1>
      <p className="dashboard-subtitle">Member subscriptions across every package — approve, suspend, or cancel here.</p>

      <div className="products-filters">
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as SubscriptionStatus | "")}>
          <option value="">All statuses</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {SUBSCRIPTION_STATUS_LABELS[s]}
            </option>
          ))}
        </select>
      </div>

      <div className="data-table-panel">
        {isLoading ? (
          <p className="data-table-empty">Loading…</p>
        ) : subscriptions.length === 0 ? (
          <p className="data-table-empty">
            No subscriptions yet — they'll appear here once members register (a later phase).
          </p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Member</th>
                <th>Member type</th>
                <th>Package</th>
                <th>License</th>
                <th>Credits</th>
                <th>PDF usage</th>
                <th>Status</th>
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {subscriptions.map((sub) => (
                <tr key={sub.id}>
                  <td>
                    {sub.member_name}
                    <div className="subscription-login-id">{sub.member_login_id}</div>
                  </td>
                  <td>{sub.member_type_name}</td>
                  <td>{sub.package_name}</td>
                  <td>
                    {sub.start_date} — {sub.expiry_date}
                  </td>
                  <td>
                    {sub.credits_remaining}/{sub.credits_allocated}
                  </td>
                  <td>
                    {sub.pdf_used}/{sub.pdf_limit}
                  </td>
                  <td>
                    <select
                      className={"subscription-status-select badge " + statusBadgeClass(sub.status)}
                      value={sub.status}
                      onChange={(e) => handleStatusChange(sub, e.target.value as SubscriptionStatus)}
                    >
                      {STATUS_OPTIONS.map((s) => (
                        <option key={s} value={s}>
                          {SUBSCRIPTION_STATUS_LABELS[s]}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="customers-row-actions">
                    <Link className="link-action" to={`/subscriptions/${sub.id}/ledger?name=${encodeURIComponent(sub.member_name)}`}>
                      Ledger
                    </Link>
                    <Link className="link-action" to={`/members/${sub.member_id}/sessions?name=${encodeURIComponent(sub.member_name)}`}>
                      Sessions
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
