import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { deleteCustomer, listCustomers } from "@/api/customers";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import ConfirmDialog from "@/components/ConfirmDialog";
import type { Customer } from "@/types/customer";
import "./Customers.css";

export default function Customers() {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [pendingDelete, setPendingDelete] = useState<Customer | null>(null);
  const pageSize = 20;

  async function refresh() {
    setIsLoading(true);
    try {
      const result = await listCustomers(debouncedSearch, page, pageSize);
      setCustomers(result.items);
      setTotal(result.total);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, page]);

  async function handleDeleteConfirmed() {
    if (!pendingDelete) return;
    await deleteCustomer(pendingDelete.id);
    setPendingDelete(null);
    refresh();
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div>
      <div className="customers-header">
        <h1>Customers</h1>
        <Link to="/customers/new" className="btn btn-primary">
          Add customer
        </Link>
      </div>

      <input
        className="customers-search"
        type="search"
        placeholder="Search by name or mobile…"
        value={search}
        onChange={(e) => {
          setPage(1);
          setSearch(e.target.value);
        }}
      />

      <div className="card-panel customers-table-panel">
        {isLoading ? (
          <p className="empty-state">Loading customers…</p>
        ) : customers.length === 0 ? (
          <p className="empty-state">
            No customers found. Add a customer to start creating cards for them.
          </p>
        ) : (
          <table className="customers-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Mobile</th>
                <th>Email</th>
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {customers.map((customer) => (
                <tr key={customer.id}>
                  <td>{customer.name}</td>
                  <td>{customer.mobile}</td>
                  <td>{customer.email || "—"}</td>
                  <td className="customers-row-actions">
                    <Link to={`/customers/${customer.id}`}>Edit</Link>
                    <button
                      className="link-danger"
                      onClick={() => setPendingDelete(customer)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {totalPages > 1 && (
        <div className="customers-pagination">
          <button
            className="btn btn-secondary"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Previous
          </button>
          <span>
            Page {page} of {totalPages}
          </span>
          <button
            className="btn btn-secondary"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </button>
        </div>
      )}

      {pendingDelete && (
        <ConfirmDialog
          title="Delete customer"
          message={`Delete ${pendingDelete.name}? This cannot be undone.`}
          confirmLabel="Delete"
          onConfirm={handleDeleteConfirmed}
          onCancel={() => setPendingDelete(null)}
        />
      )}
    </div>
  );
}
