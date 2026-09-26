import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchMemberDashboard, consumeService } from "@/api/memberAuth";
import type { MemberDashboard as MemberDashboardData } from "@/types/memberAuth";
import ServiceIcon, { getServiceColor } from "@/components/ServiceIcon";
import ShowcaseSection, { type ShowcaseItem } from "@/components/ShowcaseSection";
import "./MemberDashboard.css";

const STATUS_MESSAGES: Record<string, { label: string; tone: string; message: string }> = {
  pending_approval: {
    label: "Pending approval",
    tone: "badge-warning",
    message: "Your plan is awaiting approval. You'll be able to generate cards once it's activated.",
  },
  active: { label: "Active", tone: "badge-success", message: "" },
  expired: {
    label: "Expired",
    tone: "badge-danger",
    message: "Your plan has expired. Renew to continue generating cards.",
  },
  suspended: {
    label: "Suspended",
    tone: "badge-danger",
    message: "Your account has been suspended. Contact support for more information.",
  },
  cancelled: { label: "Cancelled", tone: "badge-neutral", message: "Your plan has been cancelled." },
};

// TEMPORARY placeholder catalog — shown for free accounts with no active
// plan yet, so the dashboard has something real to look at instead of an
// empty page. This needs to become a real API call (GET /api/public
// active services) once the backend/admin side of this redesign is
// built — flagged here rather than silently left as a TODO no one can see.
const PLACEHOLDER_SERVICES = [
  { id: "aadhaar-pvc", name: "Aadhaar PVC", credit_cost: 1, tag: "Smart Card", usageCount: 20 },
  { id: "fsc-ration", name: "FSC / Ration Card", credit_cost: 1, tag: "Downloads", usageCount: 4 },
  { id: "employee-id", name: "Employee ID", credit_cost: 2, tag: "With Photo", usageCount: 3 },
  { id: "student-id", name: "Student ID", credit_cost: 1, tag: "Smart Card", usageCount: 3 },
  { id: "visiting-card", name: "Visiting Card", credit_cost: 1, tag: "Custom Print", usageCount: 2 },
  { id: "custom-card", name: "Custom Card", credit_cost: 2, tag: "Design Your Own", usageCount: 1 },
];

// Dummy showcase content — placeholder labels/counts matching the
// reference dashboard's five sections, purely for visual design.
// None of this is real service or usage data yet.
const TOP_USED: ShowcaseItem[] = [
  { icon: "fingerprint", label: "Aadhaar PVC", tag: "Smart Card", count: 20, color: "#1F6FA8" },
  { icon: "creditCard", label: "Find DL", tag: "D L Number", count: 4, color: "#8A5A1F" },
  { icon: "shield", label: "Advance Ayushman", tag: "Smart Card", count: 4, color: "#1F7A3D" },
  { icon: "bank", label: "Telangana Ration", tag: "With Photo", count: 3, color: "#1F6FA8" },
  { icon: "creditCard", label: "Ayushman Card PVC", tag: "Smart Card", count: 3, color: "#5B3A8A" },
  { icon: "printer", label: "AP New - Correction", tag: "Smart Card", count: 2, color: "#C9601F" },
  { icon: "creditCard", label: "Know PAN Link", tag: "Mask PAN", count: 1, color: "#A83E5C" },
  { icon: "bank", label: "Telangana DL", tag: "Smart Card", count: 1, color: "#1F6FA8" },
];

const TRENDING: ShowcaseItem[] = [
  { icon: "shield", label: "Telangana Rajeev", tag: "Smart Card", color: "#1F7A3D" },
  { icon: "bank", label: "Telangana Ration", tag: "With Photo", color: "#1F6FA8" },
  { icon: "printer", label: "Telangana New", tag: "New One", color: "#8A5A1F" },
  { icon: "bell", label: "Update Mobile No.", tag: "Biometric", color: "#5B3A8A" },
  { icon: "user", label: "Voter Services", tag: "Voter One", color: "#C9601F" },
  { icon: "fingerprint", label: "Aadhaar PVC", tag: "Smart Card", color: "#1F6FA8" },
  { icon: "user", label: "Voter Mobile No.", tag: "Offline", color: "#A83E5C" },
  { icon: "creditCard", label: "E-PAN", tag: "Download", color: "#1F6FA8" },
];

const REVENUE_SERVICES: ShowcaseItem[] = [
  { icon: "bank", label: "AP Rice Card", tag: "Smart Card", color: "#8A5A1F" },
  { icon: "printer", label: "AP New - Correction", tag: "Smart Card", color: "#8A5A1F" },
  { icon: "truck", label: "Vehicle RC", tag: "Downloads", color: "#C0392B" },
  { icon: "truck", label: "All India Vehicle", tag: "Smart Card", color: "#5B3A8A" },
  { icon: "user", label: "Voter Services", tag: "Voter One", color: "#1F7A3D" },
  { icon: "creditCard", label: "E-PAN", tag: "Download", color: "#1F6FA8" },
  { icon: "user", label: "Voter Mobile No.", tag: "Offline", color: "#A83E5C" },
  { icon: "bell", label: "Update Mobile No.", tag: "Biometric", color: "#1F7A3D" },
];

const NEW_SERVICES: ShowcaseItem[] = [
  { icon: "printer", label: "T N Birth Certificate", tag: "Instant", color: "#1F6FA8" },
  { icon: "printer", label: "T N Birth Certificate", tag: "Instant", color: "#1F6FA8" },
  { icon: "shield", label: "Veh Insurance", tag: "Download", color: "#5B3A8A" },
  { icon: "shield", label: "EHS Health Card", tag: "Andhra Pradesh", color: "#1F7A3D" },
  { icon: "tag", label: "Student Bus Pass", tag: "Karnataka", color: "#8A5A1F" },
  { icon: "user", label: "Voter - Mobile", tag: "Online", color: "#1F7A3D" },
  { icon: "bell", label: "Link Mobile Number", tag: "No eSign", color: "#5B3A8A" },
];

const MISSING_OPPORTUNITIES: ShowcaseItem[] = [
  { icon: "user", label: "Voter Services", tag: "Voter One Solut…", color: "#1F6FA8" },
  { icon: "creditCard", label: "E-PAN Cards", tag: "Services", color: "#1F6FA8" },
  { icon: "truck", label: "Vehicle RC Services", tag: "Downloads", color: "#C0392B" },
  { icon: "bank", label: "Ration Card Services", tag: "Ration Services", color: "#8A5A1F" },
  { icon: "bell", label: "Update Mobile No.", tag: "No eSign - Instant", color: "#1F7A3D" },
  { icon: "bell", label: "Link Mobile Number", tag: "No eSign", color: "#5B3A8A" },
  { icon: "user", label: "Voter ID New", tag: "Without OTP", color: "#1F6FA8" },
  { icon: "globe", label: "Address Update", tag: "OTP Based", color: "#A83E5C" },
];

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

  async function handleCreateCard(serviceId: string, serviceName: string, hasPlan: boolean) {
    if (!hasPlan) {
      showToast("Activate a plan to start generating cards — this is a preview of what's available.", true);
      return;
    }
    setPendingServiceId(serviceId);
    try {
      const result = await consumeService(serviceId);
      showToast(`${serviceName}: 1 credit deducted, ${result.credits_remaining} remaining.`, false);
      window.dispatchEvent(new Event("idzen:credits-changed"));
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

  if (!data) {
    return <p className="empty-state">Couldn't load your dashboard right now.</p>;
  }

  const { member, subscription } = data;
  const firstName = member.full_name.split(" ")[0];
  const hasPlan = Boolean(subscription);
  const statusInfo = subscription ? STATUS_MESSAGES[subscription.status] ?? STATUS_MESSAGES.pending_approval : null;
  const creditsPercent =
    subscription && subscription.credits_allocated
      ? Math.round((subscription.credits_remaining / subscription.credits_allocated) * 100)
      : 0;
  const services = subscription ? subscription.services : PLACEHOLDER_SERVICES;

  return (
    <div className="member-dashboard">
      <div className="member-dashboard-header">
        <div>
          <h1>Welcome, {firstName}</h1>
          <p className="dashboard-subtitle">
            {member.member_type.name}
            {subscription ? ` · ${subscription.package_name} plan` : " · Free account"}
          </p>
        </div>
        {statusInfo && <span className={"badge " + statusInfo.tone}>{statusInfo.label}</span>}
      </div>

      {statusInfo?.message && <div className="member-status-banner">{statusInfo.message}</div>}
      {!hasPlan && (
        <div className="member-status-banner member-status-banner-info">
          You're on a free account with no active plan yet. Browse what's available below, then activate a plan to
          start generating cards.
        </div>
      )}

      <div className="wallet-card-row">
        <div className="wallet-card wallet-card-credits">
          <div className="wallet-card-icon">₹</div>
          <div className="wallet-card-body">
            <div className="wallet-card-value">{hasPlan ? subscription!.credits_remaining : 0}</div>
            <div className="wallet-card-label">Credits Wallet</div>
            <div className="wallet-card-sub">
              {hasPlan ? `of ${subscription!.credits_allocated} (${creditsPercent}% left)` : "No active plan"}
            </div>
          </div>
        </div>
        <div className="wallet-card wallet-card-pdf">
          <div className="wallet-card-icon">📄</div>
          <div className="wallet-card-body">
            <div className="wallet-card-value">{hasPlan ? subscription!.pdf_limit - subscription!.pdf_used : 0}</div>
            <div className="wallet-card-label">PDF Remaining</div>
            <div className="wallet-card-sub">{hasPlan ? `of ${subscription!.pdf_limit} generations` : "No active plan"}</div>
          </div>
        </div>
        <div className="wallet-card wallet-card-license">
          <div className="wallet-card-icon">📅</div>
          <div className="wallet-card-body">
            <div className="wallet-card-value">{hasPlan ? subscription!.days_remaining : "—"}</div>
            <div className="wallet-card-label">License Days</div>
            <div className="wallet-card-sub">
              {hasPlan ? `${subscription!.start_date} – ${subscription!.expiry_date}` : "No active plan"}
            </div>
          </div>
        </div>
        <div className="wallet-card wallet-card-services">
          <div className="wallet-card-icon">🧩</div>
          <div className="wallet-card-body">
            <div className="wallet-card-value">{services.length}</div>
            <div className="wallet-card-label">{hasPlan ? "Active Services" : "Available Services"}</div>
            <div className="wallet-card-sub">{hasPlan ? "included in your plan" : "activate a plan to use these"}</div>
          </div>
        </div>
      </div>

      <div className="promo-banner-row">
        <div className="promo-banner promo-banner-primary">
          <div className="promo-banner-icon">👥</div>
          <div>
            <h3>{hasPlan ? "Need more credits?" : "Get started"}</h3>
            <p>{hasPlan ? "Top up your wallet to keep generating cards without interruption." : "Activate a plan to unlock card generation for your account."}</p>
          </div>
          <Link to="/member/subscription" className="btn btn-primary promo-banner-btn">
            {hasPlan ? "Top Up" : "View Plans"}
          </Link>
        </div>
        <div className="promo-banner promo-banner-secondary">
          <div className="promo-banner-icon">🎧</div>
          <div>
            <h3>Need Help?</h3>
            <p>Our support team is here for anything from account setup to card design questions.</p>
          </div>
          <a href="#contact" className="btn btn-secondary promo-banner-btn">
            Contact Support
          </a>
        </div>
      </div>

      <div className="quick-access-panel">
        <div className="quick-access-panel-header">
          <h2>
            <span className="quick-access-panel-icon">⚡</span>
            {hasPlan ? "Your Services" : "Quick Access"}
          </h2>
          <span className="quick-access-panel-tag">{hasPlan ? "Included In Your Plan" : "Personal Quick Links"}</span>
        </div>
        {services.length === 0 ? (
          <p className="empty-state">Your plan doesn't include any active services yet.</p>
        ) : (
          <div className="service-tile-grid">
            {services.map((service) => {
              const tag: string | undefined = (service as { tag?: string }).tag;
              const usageCount: number | undefined = (service as { usageCount?: number }).usageCount;
              const color = getServiceColor(service.name);
              return (
                <button
                  key={service.id}
                  type="button"
                  className={"service-tile" + (!hasPlan ? " service-tile-locked" : "")}
                  disabled={pendingServiceId === service.id}
                  onClick={() => handleCreateCard(service.id, service.name, hasPlan)}
                >
                  <span className="service-tile-icon-frame" style={{ borderColor: color }}>
                    <ServiceIcon name={service.name} className="service-tile-icon" />
                    {usageCount !== undefined && <span className="service-tile-count-badge">{usageCount}</span>}
                  </span>
                  <span className="service-tile-name">{service.name}</span>
                  <span className="service-tile-tag">{tag ?? `${service.credit_cost} credit${service.credit_cost === 1 ? "" : "s"}`}</span>
                  <span className={"service-tile-status " + (hasPlan ? "is-active" : "is-locked")}>
                    {pendingServiceId === service.id ? "Generating…" : hasPlan ? "Create Card" : "Activate to use"}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <ShowcaseSection emoji="⚡" title="Top 8 Used By Me" pill="Personal Quick Links" tint="mint" items={TOP_USED} />
      <ShowcaseSection emoji="🔥" title="Trending in TG" pill="Competitor Usage" tint="mint" items={TRENDING} />
      <ShowcaseSection
        emoji="📈"
        title="All India Revenue Services"
        pill="Multi-State Demand"
        tint="peach"
        items={REVENUE_SERVICES}
      />
      <ShowcaseSection emoji="🆕" title="New Services" pill="Start Early" tint="lavender" items={NEW_SERVICES} />
      <ShowcaseSection
        emoji="💰"
        title="You Are Missing These Opportunities"
        pill="Popular in your state, not used by you"
        tint="gray"
        items={MISSING_OPPORTUNITIES}
      />

      {toast && <div className={"member-toast" + (toast.isError ? " is-error" : "")}>{toast.message}</div>}
    </div>
  );
}
