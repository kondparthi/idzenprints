import { useEffect, useState } from "react";
import { downloadOrdersCsv, fetchReportSummary, type ReportSummary } from "@/api/reports";
import { ORDER_STATUS_LABELS } from "@/types/order";
import "./Reports.css";

export default function Reports() {
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [summary, setSummary] = useState<ReportSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  async function refresh() {
    setIsLoading(true);
    try {
      setSummary(await fetchReportSummary(dateFrom || undefined, dateTo || undefined));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      <h1>Reports</h1>

      <div className="card-panel reports-filters">
        <div className="field">
          <label htmlFor="dateFrom">From</label>
          <input id="dateFrom" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="dateTo">To</label>
          <input id="dateTo" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
        </div>
        <button className="btn btn-secondary" onClick={refresh}>
          Apply
        </button>
        <button className="btn btn-primary" onClick={() => downloadOrdersCsv(dateFrom || undefined, dateTo || undefined)}>
          Export CSV
        </button>
      </div>

      {isLoading || !summary ? (
        <p className="empty-state">Loading report…</p>
      ) : (
        <>
          <div className="stat-grid">
            <div className="stat-tile card-panel">
              <div className="stat-value">{summary.total_orders}</div>
              <div className="stat-label">Total orders</div>
            </div>
            <div className="stat-tile card-panel">
              <div className="stat-value">{summary.cards_generated}</div>
              <div className="stat-label">Cards generated</div>
            </div>
            <div className="stat-tile card-panel">
              <div className="stat-value">{summary.orders_by_status.completed ?? 0}</div>
              <div className="stat-label">Completed orders</div>
            </div>
            <div className="stat-tile card-panel">
              <div className="stat-value">
                {summary.total_orders - (summary.orders_by_status.completed ?? 0) - (summary.orders_by_status.cancelled ?? 0)}
              </div>
              <div className="stat-label">Pending orders</div>
            </div>
          </div>

          <div className="reports-breakdown-grid">
            <div className="card-panel">
              <h2>By status</h2>
              <table className="reports-table">
                <tbody>
                  {Object.entries(summary.orders_by_status).map(([status, count]) => (
                    <tr key={status}>
                      <td>{ORDER_STATUS_LABELS[status as keyof typeof ORDER_STATUS_LABELS] ?? status}</td>
                      <td className="reports-count">{count}</td>
                    </tr>
                  ))}
                  {Object.keys(summary.orders_by_status).length === 0 && (
                    <tr>
                      <td colSpan={2} className="empty-state">
                        No orders in this range.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="card-panel">
              <h2>By card type</h2>
              <table className="reports-table">
                <tbody>
                  {summary.orders_by_card_type.map((row) => (
                    <tr key={row.card_type}>
                      <td>{row.card_type}</td>
                      <td className="reports-count">{row.count}</td>
                    </tr>
                  ))}
                  {summary.orders_by_card_type.length === 0 && (
                    <tr>
                      <td colSpan={2} className="empty-state">
                        No orders in this range.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="card-panel">
              <h2>By operator</h2>
              <table className="reports-table">
                <tbody>
                  {summary.orders_by_operator.map((row) => (
                    <tr key={row.operator}>
                      <td>{row.operator}</td>
                      <td className="reports-count">{row.count}</td>
                    </tr>
                  ))}
                  {summary.orders_by_operator.length === 0 && (
                    <tr>
                      <td colSpan={2} className="empty-state">
                        No orders in this range.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="card-panel">
              <h2>Daily orders</h2>
              <table className="reports-table">
                <tbody>
                  {summary.daily_orders.map((row) => (
                    <tr key={row.date}>
                      <td>{row.date}</td>
                      <td className="reports-count">{row.count}</td>
                    </tr>
                  ))}
                  {summary.daily_orders.length === 0 && (
                    <tr>
                      <td colSpan={2} className="empty-state">
                        No orders in this range.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
