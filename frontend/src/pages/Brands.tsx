import { useEffect, useState, type FormEvent } from "react";
import { createBrand, deleteBrand, listBrands, updateBrand } from "@/api/brands";
import ConfirmDialog from "@/components/ConfirmDialog";
import type { Brand } from "@/types/product";
import "./CardTypes.css";

export default function Brands() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [name, setName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Brand | null>(null);

  async function refresh() {
    setBrands(await listBrands());
  }

  useEffect(() => {
    refresh();
  }, []);

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) return;
    setIsSubmitting(true);
    try {
      await createBrand({ name: name.trim() });
      setName("");
      refresh();
    } finally {
      setIsSubmitting(false);
    }
  }

  async function toggleActive(brand: Brand) {
    await updateBrand(brand.id, { is_active: !brand.is_active });
    refresh();
  }

  async function handleDeleteConfirmed() {
    if (!pendingDelete) return;
    await deleteBrand(pendingDelete.id);
    setPendingDelete(null);
    refresh();
  }

  return (
    <div>
      <h1>Brands</h1>

      <form className="card-panel card-type-form" onSubmit={handleCreate}>
        <div className="field-row">
          <div className="field">
            <label htmlFor="brandName">Name</label>
            <input id="brandName" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
        </div>
        <button className="btn btn-primary" type="submit" disabled={isSubmitting}>
          Add brand
        </button>
      </form>

      <div className="card-panel card-types-table-panel">
        <table className="customers-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Slug</th>
              <th>Status</th>
              <th aria-label="Actions" />
            </tr>
          </thead>
          <tbody>
            {brands.map((b) => (
              <tr key={b.id}>
                <td>{b.name}</td>
                <td>{b.slug}</td>
                <td>{b.is_active ? "Active" : "Inactive"}</td>
                <td className="customers-row-actions">
                  <button className="link-action" onClick={() => toggleActive(b)}>
                    {b.is_active ? "Deactivate" : "Activate"}
                  </button>
                  <button className="link-danger" onClick={() => setPendingDelete(b)}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {brands.length === 0 && <p className="empty-state">No brands yet — add one above.</p>}
      </div>

      {pendingDelete && (
        <ConfirmDialog
          title="Delete brand"
          message={`Delete "${pendingDelete.name}"? Products using it will keep their reference but this brand won't be selectable for new ones.`}
          confirmLabel="Delete"
          onConfirm={handleDeleteConfirmed}
          onCancel={() => setPendingDelete(null)}
        />
      )}
    </div>
  );
}
