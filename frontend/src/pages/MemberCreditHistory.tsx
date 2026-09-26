import { useEffect, useState } from "react";
import { fetchOwnCreditHistory, fetchOwnPdfUsageHistory } from "@/api/memberCreditHistory";
import type { CreditTransaction, PdfUsageRecord } from "@/types/creditLedger";
import "./MemberDashboard.css";

export default function MemberCreditHistory() {
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [usage, setUsage] = useState<PdfUsageRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([fetchOwnCreditHistory(), fetchOwnPdfUsageHistory()])
      .then(([txns, u]) => {
        setTransactions(txns);
        setUsage(u);
      })
      .catch((err: any) => {
        // A 404 here just means "no subscription yet" — a free account
        // with nothing to show, not a failure. Anything else is a real
        // error and should say so, rather than silently looking
        // identical to "no data" (the empty-array initial state would
        // otherwise mask a genuine failure as if nothing were wrong).
        if (err?.response?.status !== 404) {
          setError("Couldn't load your credit history right now.");
        }
      })
      .finally(() => setIsLoading(false));
  }, []);

  function typeBadgeClass(type: string): string {
    if (type === "credit" || type === "refund") return "badge-success";
    if (type === "debit" || type === "expiry") return "badge-danger";
    return "badge-warning";
  }

  if (isLoading) return <p className="empty-state">Loading…</p>;
  if (error) return <p className="error-text">{error}</p>;

  return (
    <div>
      <h1>Credit history</h1>

      <div className="card-panel" style={{ marginBottom: 24 }}>
        {transactions.length === 0 ? (
          <p className="empty-state">No transactions yet.</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Amount</th>
                <th>Balance after</th>
                <th>Description</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((t) => (
                <tr key={t.id}>
                  <td>{new Date(t.created_at).toLocaleDateString()}</td>
                  <td>
                    <span className={"badge " + typeBadgeClass(t.transaction_type)}>{t.transaction_type}</span>
                  </td>
                  <td>
                    {t.amount >= 0 ? "+" : ""}
                    {t.amount}
                  </td>
                  <td>{t.balance_after}</td>
                  <td>{t.description || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <h2 className="section-heading">PDF generations</h2>
      <div className="card-panel">
        {usage.length === 0 ? (
          <p className="empty-state">No PDF generations yet.</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Service</th>
                <th>Quantity</th>
              </tr>
            </thead>
            <tbody>
              {usage.map((u) => (
                <tr key={u.id}>
                  <td>{new Date(u.created_at).toLocaleDateString()}</td>
                  <td>{u.card_type_name}</td>
                  <td>{u.quantity}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
