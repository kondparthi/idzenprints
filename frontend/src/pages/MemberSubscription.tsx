import { useEffect, useState } from "react";
import { fetchMemberDashboard, requestSubscription } from "@/api/memberAuth";
import { listAvailablePackages } from "@/api/public";
import { SUBSCRIPTION_STATUS_LABELS, type Package, type SubscriptionStatus } from "@/types/subscription";
import type { MemberDashboard } from "@/types/memberAuth";
import "./MemberDashboard.css";

export default function MemberSubscription() {
  const [data, setData] = useState<MemberDashboard | null>(null);
  const [packages, setPackages] = useState<Package[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [requestedId, setRequestedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchMemberDashboard()
      .then((dashboard) => {
        setData(dashboard);
        if (!dashboard.subscription) {
          return listAvailablePackages(dashboard.member.member_type.id).then(setPackages);
        }
      })
      .finally(() => setIsLoading(false));
  }, []);

  async function handleRequest(pkg: Package) {
    setError(null);
    try {
      await requestSubscription(pkg.id);
      setRequestedId(pkg.id);
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Couldn't request that plan right now.");
    }
  }

  if (isLoading) return <p className="empty-state">Loading…</p>;

  if (!data?.subscription) {
    return (
      <div>
        <h1>My subscription</h1>
        <p className="dashboard-subtitle">
          You're on a free account — choose a plan below to unlock credits and card generation.
        </p>

        {requestedId ? (
          <div className="member-status-banner member-status-banner-info">
            Your plan request has been sent — our team will review and activate it shortly.
          </div>
        ) : (
          <>
            {error && <p className="error-text">{error}</p>}
            {packages.length === 0 ? (
              <p className="empty-state">No plans are available for your account type yet — contact support.</p>
            ) : (
              <div className="plan-card-grid">
                {packages.map((pkg) => (
                  <div key={pkg.id} className="card-panel plan-card">
                    <h2 style={{ marginTop: 0 }}>{pkg.name}</h2>
                    <p className="plan-card-price">₹{pkg.price}</p>
                    <ul className="plan-card-features">
                      <li>{pkg.credits} credits</li>
                      <li>{pkg.pdf_generation_limit} PDF generations</li>
                      <li>{pkg.license_days} days license</li>
                      <li>{pkg.device_limit} device{pkg.device_limit === 1 ? "" : "s"}</li>
                    </ul>
                    <button className="btn btn-primary" onClick={() => handleRequest(pkg)}>
                      Request this plan
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    );
  }

  const sub = data.subscription;

  return (
    <div>
      <h1>My subscription</h1>

      <div className="card-panel" style={{ maxWidth: 480 }}>
        <dl className="extracted-details-list">
          <div className="extracted-details-row">
            <dt>Package</dt>
            <dd>{sub.package_name}</dd>
          </div>
          <div className="extracted-details-row">
            <dt>Status</dt>
            <dd>{SUBSCRIPTION_STATUS_LABELS[sub.status as SubscriptionStatus] ?? sub.status}</dd>
          </div>
          <div className="extracted-details-row">
            <dt>License period</dt>
            <dd>
              {sub.start_date} – {sub.expiry_date}
            </dd>
          </div>
          <div className="extracted-details-row">
            <dt>Days remaining</dt>
            <dd>{sub.days_remaining}</dd>
          </div>
          <div className="extracted-details-row">
            <dt>Credits</dt>
            <dd>
              {sub.credits_remaining} / {sub.credits_allocated}
            </dd>
          </div>
          <div className="extracted-details-row">
            <dt>PDF generations</dt>
            <dd>
              {sub.pdf_used} / {sub.pdf_limit} used
            </dd>
          </div>
          <div className="extracted-details-row">
            <dt>Included services</dt>
            <dd>{sub.services.map((s) => s.name).join(", ") || "—"}</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
