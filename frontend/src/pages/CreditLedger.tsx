import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { adjustCredits, listCreditTransactions, listPdfUsage } from "@/api/creditLedger";
import type { CreditTransaction, PdfUsageRecord } from "@/types/creditLedger";
import "./Products.css";
import "./ProductForm.css";

export default function CreditLedger() {
  const { subscriptionId } = useParams();
  const [searchParams] = useSearchParams();
  const memberName = searchParams.get("name");

  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [usage, setUsage] = useState<PdfUsageRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function refresh() {
    if (!subscriptionId) return;
    setIsLoading(true);
    try {
      const [txns, pdfUsage] = await Promise.all([
        listCreditTransactions(subscriptionId),
        listPdfUsage(subscriptionId),
      ]);
      setTransactions(txns);
      setUsage(pdfUsage);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subscriptionId]);

  async function handleAdjust() {
    if (!subscriptionId || !amount || !reason.trim()) return;
    setError(null);
    setIsSubmitting(true);
    try {
      await adjustCredits(subscriptionId, Number(amount), reason.trim());
      setAmount("");
      setReason("");
      refresh();
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Could not apply this adjustment.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function typeBadgeClass(type: string): string {
    if (type === "credit" || type === "refund") return "badge-success";
    if (type === "debit" || type === "expiry") return "badge-danger";
    return "badge-warning"; // adjustment
  }

  return (
    <div>
      <h1>Credit ledger{memberName ? ` — ${memberName}` : ""}</h1>
      <p className="dashboard-subtitle">
        Every credit change for this subscription, in order — nothing here ever updates the balance without a matching
        row.
      </p>

      <div className="card-panel product-form" style={{ maxWidth: 520, marginBottom: "var(--space-5)" }}>
        <h3 className="product-section-heading" style={{ marginTop: 0 }}>Adjust credits</h3>
        <div className="field-row">
          <div className="field">
            <label htmlFor="adjAmount">Amount (+ to add, − to deduct)</label>
            <input id="adjAmount" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="e.g. 10 or -5" />
          </div>
        </div>
        <div className="field">
          <label htmlFor="adjReason">Reason</label>
          <input id="adjReason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Goodwill top-up for support ticket #42" />
        </div>
        {error && <p className="error-text">{error}</p>}
        <button className="btn btn-primary" onClick={handleAdjust} disabled={isSubmitting}>
          {isSubmitting ? "Applying…" : "Apply adjustment"}
        </button>
      </div>

      <h2 className="section-heading">Transaction history</h2>
      <div className="data-table-panel" style={{ marginBottom: "var(--space-5)" }}>
        {isLoading ? (
          <p className="data-table-empty">Loading…</p>
        ) : transactions.length === 0 ? (
          <p className="data-table-empty">No transactions yet.</p>
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
                  <td>{new Date(t.created_at).toLocaleString()}</td>
                  <td>
                    <span className={"badge " + typeBadgeClass(t.transaction_type)}>{t.transaction_type}</span>
                  </td>
                  <td className={t.amount >= 0 ? "product-stock-change-up" : "product-stock-change-down"}>
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

      <h2 className="section-heading">PDF generation history</h2>
      <div className="data-table-panel">
        {usage.length === 0 ? (
          <p className="data-table-empty">No PDF generations yet.</p>
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
                  <td>{new Date(u.created_at).toLocaleString()}</td>
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
