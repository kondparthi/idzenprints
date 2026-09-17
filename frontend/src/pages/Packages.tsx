import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { deletePackage, listPackages, updatePackage } from "@/api/packages";
import ConfirmDialog from "@/components/ConfirmDialog";
import type { Package } from "@/types/subscription";
import "./Products.css";

export default function Packages() {
  const [packages, setPackages] = useState<Package[]>([]);
  const [pendingDelete, setPendingDelete] = useState<Package | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    setPackages(await listPackages());
  }

  useEffect(() => {
    refresh();
  }, []);

  async function toggleActive(pkg: Package) {
    await updatePackage(pkg.id, { is_active: !pkg.is_active });
    refresh();
  }

  async function handleDeleteConfirmed() {
    if (!pendingDelete) return;
    setError(null);
    try {
      await deletePackage(pendingDelete.id);
      setPendingDelete(null);
      refresh();
    } catch (err: any) {
      setPendingDelete(null);
      if (err?.response?.status === 409) {
        setError("Can't delete — members are already subscribed to this package. Deactivate it instead.");
      } else {
        setError("Could not delete this package.");
      }
    }
  }

  return (
    <div>
      <div className="products-header">
        <h1>Packages</h1>
        <Link to="/packages/new" className="btn btn-primary">
          Add package
        </Link>
      </div>

      {error && <p className="error-text">{error}</p>}

      <div className="data-table-panel">
        {packages.length === 0 ? (
          <p className="data-table-empty">No packages yet.</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Package</th>
                <th>Price</th>
                <th>Credits</th>
                <th>License</th>
                <th>Devices</th>
                <th>PDF limit</th>
                <th>Member types</th>
                <th>Subscribers</th>
                <th>Status</th>
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {packages.map((pkg) => (
                <tr key={pkg.id}>
                  <td>
                    <Link to={`/packages/${pkg.id}`} className="products-name-link">
                      {pkg.name}
                    </Link>
                  </td>
                  <td>₹{pkg.price}</td>
                  <td>{pkg.credits}</td>
                  <td>{pkg.license_days} days</td>
                  <td>{pkg.device_limit}</td>
                  <td>{pkg.pdf_generation_limit}</td>
                  <td>{pkg.member_types.map((mt) => mt.name).join(", ") || "—"}</td>
                  <td>{pkg.subscriber_count}</td>
                  <td>
                    <span className={"badge " + (pkg.is_active ? "badge-success" : "badge-neutral")}>
                      {pkg.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="customers-row-actions">
                    <button className="link-action" onClick={() => toggleActive(pkg)}>
                      {pkg.is_active ? "Deactivate" : "Activate"}
                    </button>
                    <button className="link-danger" onClick={() => setPendingDelete(pkg)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {pendingDelete && (
        <ConfirmDialog
          title="Delete package"
          message={`Delete "${pendingDelete.name}"?`}
          confirmLabel="Delete"
          onConfirm={handleDeleteConfirmed}
          onCancel={() => setPendingDelete(null)}
        />
      )}
    </div>
  );
}
