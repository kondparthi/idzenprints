import { useEffect, useState } from "react";
import { fetchMemberDashboard, consumeService } from "@/api/memberAuth";
import type { MemberDashboard as MemberDashboardData } from "@/types/memberAuth";
import "./MemberDashboard.css";

const STATUS_MESSAGES: Record<string, { label: string; tone: string; message: string }> = {
  pending_approval: {
    label: "Pending approval",
    tone: "badge-warning",
    message: "Your subscription is awaiting Super Admin approval. You'll be able to generate cards once it's activated.",
  },
  active: { label: "Active", tone: "badge-success", message: "" },
  expired: {
    label: "Expired",
    tone: "badge-danger",
    message: "Your subscription has expired. Renew your package to continue generating cards.",
  },
  suspended: {
    label: "Suspended",
    tone: "badge-danger",
    message: "Your subscription has been suspended. Contact support for more information.",
  },
  cancelled: {
    label: "Cancelled",
    tone: "badge-neutral",
    message: "Your subscription has been cancelled.",
  },
};

export default function MemberDashboard() {
  const [data, setData] = useState<MemberDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; isError: boolean } | null>(null);
  const [pendingServiceId, setPendingServiceId] = useState<string | null>(null);

  function loadDashboard() {
    return fetchMemberDashboard()
      .then(setData)
      .finally(() => setIsLoading(false));
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  function showToast(message: string, isError: boolean) {
    setToast({ message, isError });
    setTimeout(() => setToast(null), 3500);
  }

  async function handleCreateCard(serviceId: string, serviceName: string) {
    setPendingServiceId(serviceId);
    try {
      const result = await consumeService(serviceId);
      showToast(
        `${serviceName}: 1 credit deducted, ${result.credits_remaining} remaining. (Card design & PDF export come in a later update — this confirms the access-control and credit deduction work correctly.)`,
        false
      );
      // Refresh so the stat tiles and remaining-credits figures reflect
      // the actual new balance, not stale numbers from before the spend.
      await loadDashboard();
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      const message = typeof detail === "object" ? detail?.message : detail;
      showToast(message || "Couldn't generate that card right now.", true);
    } finally {
      setPendingServiceId(null);
    }
  }

  if (isLoading) {
    return <p className="empty-state">Loading your dashboard…</p>;
  }

  if (!data || !data.subscription) {
    return <p className="empty-state">No subscription found on this account.</p>;
  }

  const { member, subscription } = data;
  const statusInfo = STATUS_MESSAGES[subscription.status] ?? STATUS_MESSAGES.pending_approval;
  const firstName = member.full_name.split(" ")[0];
  const creditsPercent = subscription.credits_allocated
    ? Math.round((subscription.credits_remaining / subscription.credits_allocated) * 100)
    : 0;

  return (
    <div className="member-dashboard">
      <div className="member-dashboard-header">
        <div>
          <h1>Welcome, {firstName}</h1>
          <p className="dashboard-subtitle">
            {member.member_type.name} · {subscription.package_name} package
          </p>
        </div>
        <span className={"badge " + statusInfo.tone}>{statusInfo.label}</span>
      </div>

      {statusInfo.message && <div className="member-status-banner">{statusInfo.message}</div>}

      <div className="member-stat-grid">
        <div className="card-panel member-stat-tile">
          <div className="member-stat-value">{subscription.credits_remaining}</div>
          <div className="member-stat-label">Available Credits</div>
          <div className="member-stat-sub">of {subscription.credits_allocated} ({creditsPercent}% remaining)</div>
        </div>
        <div className="card-panel member-stat-tile">
          <div className="member-stat-value">{subscription.pdf_limit - subscription.pdf_used}</div>
          <div className="member-stat-label">PDF Remaining</div>
          <div className="member-stat-sub">of {subscription.pdf_limit} generations</div>
        </div>
        <div className="card-panel member-stat-tile">
          <div className="member-stat-value">{subscription.days_remaining}</div>
          <div className="member-stat-label">License Remaining</div>
          <div className="member-stat-sub">
            {subscription.start_date} – {subscription.expiry_date}
          </div>
        </div>
        <div className="card-panel member-stat-tile">
          <div className="member-stat-value">{subscription.services.length}</div>
          <div className="member-stat-label">Active Services</div>
          <div className="member-stat-sub">included in your package</div>
        </div>
      </div>

      <h2 className="section-heading">Your services</h2>
      {subscription.services.length === 0 ? (
        <p className="empty-state">Your package doesn't include any active services yet.</p>
      ) : (
        <div className="member-service-grid">
          {subscription.services.map((service) => (
            <div key={service.id} className="card-panel member-service-card">
              <h3>{service.name}</h3>
              <p className="member-service-cost">
                {service.credit_cost} credit{service.credit_cost === 1 ? "" : "s"}
              </p>
              <button
                className="btn btn-primary"
                disabled={pendingServiceId === service.id}
                onClick={() => handleCreateCard(service.id, service.name)}
              >
                {pendingServiceId === service.id ? "Generating…" : "Create Card"}
              </button>
            </div>
          ))}
        </div>
      )}

      {toast && (
        <div className={"member-toast" + (toast.isError ? " is-error" : "")}>{toast.message}</div>
      )}
    </div>
  );
}
