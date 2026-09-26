import { useEffect, useState } from "react";
import { listPackagesForMemberType } from "@/api/packages";
import { createSubscription } from "@/api/subscriptions";
import type { Package } from "@/types/subscription";
import "./ConfirmDialog.css";

interface AssignPlanModalProps {
  memberId: string;
  memberName: string;
  memberTypeId: string;
  onClose: () => void;
  onAssigned: () => void;
}

export default function AssignPlanModal({ memberId, memberName, memberTypeId, onClose, onAssigned }: AssignPlanModalProps) {
  const [packages, setPackages] = useState<Package[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [activateNow, setActivateNow] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listPackagesForMemberType(memberTypeId).then((pkgs) => {
      setPackages(pkgs);
      if (pkgs.length > 0) setSelectedId(pkgs[0].id);
    });
  }, [memberTypeId]);

  async function handleAssign() {
    if (!selectedId) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await createSubscription(memberId, selectedId, activateNow ? "active" : "pending_approval");
      onAssigned();
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Couldn't assign that plan.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="confirm-overlay" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="confirm-panel card-panel" onClick={(e) => e.stopPropagation()}>
        <h3 style={{ marginTop: 0 }}>Assign a plan to {memberName}</h3>

        {packages.length === 0 ? (
          <p className="empty-state">No packages are set up for this member's type yet.</p>
        ) : (
          <>
            <div className="field">
              <label htmlFor="planSelect">Package</label>
              <select id="planSelect" value={selectedId} onChange={(e) => setSelectedId(e.target.value)}>
                {packages.map((pkg) => (
                  <option key={pkg.id} value={pkg.id}>
                    {pkg.name} — ₹{pkg.price} — {pkg.credits} credits
                  </option>
                ))}
              </select>
            </div>
            <label style={{ display: "flex", alignItems: "center", gap: 8, margin: "12px 0" }}>
              <input type="checkbox" checked={activateNow} onChange={(e) => setActivateNow(e.target.checked)} />
              Activate immediately (skip pending approval)
            </label>
          </>
        )}

        {error && <p className="error-text">{error}</p>}

        <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
          <button className="btn btn-primary" onClick={handleAssign} disabled={isSubmitting || !selectedId}>
            {isSubmitting ? "Assigning…" : "Assign plan"}
          </button>
          <button className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
