import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { listMemberSessions, revokeMemberSession } from "@/api/memberSessions";
import type { MemberSession } from "@/types/memberSession";
import "./Products.css";

export default function MemberSessions() {
  const { memberId } = useParams();
  const [searchParams] = useSearchParams();
  const memberName = searchParams.get("name");
  const [sessions, setSessions] = useState<MemberSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  async function refresh() {
    if (!memberId) return;
    setIsLoading(true);
    try {
      setSessions(await listMemberSessions(memberId));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [memberId]);

  async function handleRevoke(sessionId: string) {
    if (!memberId) return;
    await revokeMemberSession(memberId, sessionId);
    refresh();
  }

  function statusBadgeClass(status: string): string {
    if (status === "active") return "badge-success";
    if (status === "revoked") return "badge-danger";
    return "badge-neutral";
  }

  return (
    <div>
      <h1>Device sessions{memberName ? ` — ${memberName}` : ""}</h1>
      <p className="dashboard-subtitle">
        Every device this member has logged in from. Revoking an active session signs it out immediately, even if
        it's mid-request.
      </p>

      <div className="data-table-panel">
        {isLoading ? (
          <p className="data-table-empty">Loading…</p>
        ) : sessions.length === 0 ? (
          <p className="data-table-empty">No sessions yet for this member.</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Device</th>
                <th>IP address</th>
                <th>Logged in</th>
                <th>Last activity</th>
                <th>Status</th>
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {sessions.map((s) => (
                <tr key={s.id}>
                  <td>{s.device_name || s.device_id}</td>
                  <td>{s.ip_address || "—"}</td>
                  <td>{new Date(s.login_at).toLocaleString()}</td>
                  <td>{s.last_activity_at ? new Date(s.last_activity_at).toLocaleString() : "—"}</td>
                  <td>
                    <span className={"badge " + statusBadgeClass(s.status)}>{s.status}</span>
                  </td>
                  <td className="customers-row-actions">
                    {s.status === "active" && (
                      <button className="link-danger" onClick={() => handleRevoke(s.id)}>
                        Revoke
                      </button>
                    )}
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
