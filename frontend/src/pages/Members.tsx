import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { listMembers, reassignMemberType, updateMemberStatus } from "@/api/members";
import { listMemberTypes } from "@/api/memberTypes";
import AssignPlanModal from "@/components/AssignPlanModal";
import type { MemberListItem } from "@/types/member";
import type { MemberType } from "@/types/subscription";
import "./MemberTypes.css";

const STATUS_LABEL: Record<string, string> = {
  pending_approval: "Pending approval",
  active: "Active",
  expired: "Expired",
  suspended: "Suspended",
  cancelled: "Cancelled",
};

export default function Members() {
  const [members, setMembers] = useState<MemberListItem[]>([]);
  const [memberTypes, setMemberTypes] = useState<MemberType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [assigningTo, setAssigningTo] = useState<MemberListItem | null>(null);

  function refresh() {
    return Promise.all([listMembers(), listMemberTypes()]).then(([m, mt]) => {
      setMembers(m);
      setMemberTypes(mt);
    });
  }

  useEffect(() => {
    refresh().finally(() => setIsLoading(false));
  }, []);

  async function handleTypeChange(member: MemberListItem, newTypeId: string) {
    setSavingId(member.id);
    try {
      await reassignMemberType(member.id, newTypeId);
      await refresh();
    } finally {
      setSavingId(null);
    }
  }

  async function handleToggleActive(member: MemberListItem) {
    setSavingId(member.id);
    try {
      await updateMemberStatus(member.id, !member.is_active);
      await refresh();
    } finally {
      setSavingId(null);
    }
  }

  if (isLoading) return <p className="empty-state">Loading…</p>;

  return (
    <div>
      <h1>Members</h1>
      <p className="dashboard-subtitle">
        Everyone who's registered — free accounts and active subscribers alike. Reassign a member's type, or
        deactivate an account, directly from this list.
      </p>

      {members.length === 0 ? (
        <p className="empty-state">No members have registered yet.</p>
      ) : (
        <table className="customers-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>User ID</th>
              <th>Contact</th>
              <th>Member type</th>
              <th>Plan</th>
              <th>Status</th>
              <th>Registered</th>
              <th aria-label="Actions" />
            </tr>
          </thead>
          <tbody>
            {members.map((member) => (
              <tr key={member.id}>
                <td>{member.full_name}</td>
                <td>{member.login_id}</td>
                <td>
                  <div>{member.email}</div>
                  <div className="dashboard-subtitle" style={{ margin: 0 }}>
                    {member.phone}
                  </div>
                </td>
                <td>
                  <select
                    value={member.member_type.id}
                    disabled={savingId === member.id}
                    onChange={(e) => handleTypeChange(member, e.target.value)}
                  >
                    {memberTypes.map((mt) => (
                      <option key={mt.id} value={mt.id}>
                        {mt.name}
                      </option>
                    ))}
                  </select>
                </td>
                <td>
                  {member.has_subscription ? (
                    <span className="badge badge-success">{STATUS_LABEL[member.subscription_status ?? ""] ?? "Active"}</span>
                  ) : (
                    <button className="link-action" onClick={() => setAssigningTo(member)}>
                      Assign Plan
                    </button>
                  )}
                </td>
                <td>
                  <span className={"badge " + (member.is_active ? "badge-success" : "badge-danger")}>
                    {member.is_active ? "Active" : "Deactivated"}
                  </span>
                </td>
                <td>{new Date(member.created_at).toLocaleDateString()}</td>
                <td className="customers-row-actions">
                  <Link className="link-action" to={`/members/${member.id}/sessions`}>
                    Sessions
                  </Link>
                  <button className="link-danger" disabled={savingId === member.id} onClick={() => handleToggleActive(member)}>
                    {member.is_active ? "Deactivate" : "Activate"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {assigningTo && (
        <AssignPlanModal
          memberId={assigningTo.id}
          memberName={assigningTo.full_name}
          memberTypeId={assigningTo.member_type.id}
          onClose={() => setAssigningTo(null)}
          onAssigned={() => {
            setAssigningTo(null);
            refresh();
          }}
        />
      )}
    </div>
  );
}
