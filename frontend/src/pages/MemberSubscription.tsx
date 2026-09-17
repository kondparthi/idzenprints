import { useEffect, useState } from "react";
import { fetchMemberDashboard } from "@/api/memberAuth";
import { SUBSCRIPTION_STATUS_LABELS, type SubscriptionStatus } from "@/types/subscription";
import type { MemberDashboard } from "@/types/memberAuth";
import "./MemberDashboard.css";

export default function MemberSubscription() {
  const [data, setData] = useState<MemberDashboard | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchMemberDashboard()
      .then(setData)
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) return <p className="empty-state">Loading…</p>;
  if (!data || !data.subscription) return <p className="empty-state">No subscription found.</p>;

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
