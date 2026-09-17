import { useEffect, useState, type FormEvent } from "react";
import {
  createProductCategory,
  deleteProductCategory,
  listProductCategories,
  updateProductCategory,
} from "@/api/productCategories";
import ConfirmDialog from "@/components/ConfirmDialog";
import type { ProductCategory } from "@/types/product";
import "./CardTypes.css";

export default function ProductCategories() {
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [name, setName] = useState("");
  const [parentId, setParentId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<ProductCategory | null>(null);

  async function refresh() {
    setCategories(await listProductCategories());
  }

  useEffect(() => {
    refresh();
  }, []);

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) return;
    setIsSubmitting(true);
    try {
      await createProductCategory({ name: name.trim(), parent_id: parentId || null });
      setName("");
      setParentId("");
      refresh();
    } finally {
      setIsSubmitting(false);
    }
  }

  async function toggleActive(category: ProductCategory) {
    await updateProductCategory(category.id, { is_active: !category.is_active });
    refresh();
  }

  async function handleDeleteConfirmed() {
    if (!pendingDelete) return;
    await deleteProductCategory(pendingDelete.id);
    setPendingDelete(null);
    refresh();
  }

  const topLevelCategories = categories.filter((c) => !c.parent_id);

  function categoryLabel(category: ProductCategory): string {
    return category.parent_id ? `— ${category.name}` : category.name;
  }

  function parentName(id: string | null): string {
    if (!id) return "—";
    return categories.find((c) => c.id === id)?.name ?? "—";
  }

  // Sort so each parent is immediately followed by its own children.
  const sortedCategories = [
    ...topLevelCategories.flatMap((parent) => [
      parent,
      ...categories.filter((c) => c.parent_id === parent.id),
    ]),
  ];

  return (
    <div>
      <h1>Product categories</h1>

      <form className="card-panel card-type-form" onSubmit={handleCreate}>
        <div className="field-row">
          <div className="field">
            <label htmlFor="categoryName">Name</label>
            <input id="categoryName" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="field">
            <label htmlFor="parentCategory">Parent category (optional — leave blank for a top-level category)</label>
            <select id="parentCategory" value={parentId} onChange={(e) => setParentId(e.target.value)}>
              <option value="">No parent (top-level)</option>
              {topLevelCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <button className="btn btn-primary" type="submit" disabled={isSubmitting}>
          Add category
        </button>
      </form>

      <div className="card-panel card-types-table-panel">
        <table className="customers-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Parent</th>
              <th>Slug</th>
              <th>Status</th>
              <th aria-label="Actions" />
            </tr>
          </thead>
          <tbody>
            {sortedCategories.map((c) => (
              <tr key={c.id}>
                <td>{categoryLabel(c)}</td>
                <td>{parentName(c.parent_id)}</td>
                <td>{c.slug}</td>
                <td>{c.is_active ? "Active" : "Inactive"}</td>
                <td className="customers-row-actions">
                  <button className="link-action" onClick={() => toggleActive(c)}>
                    {c.is_active ? "Deactivate" : "Activate"}
                  </button>
                  <button className="link-danger" onClick={() => setPendingDelete(c)}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {categories.length === 0 && <p className="empty-state">No categories yet — add one above.</p>}
      </div>

      {pendingDelete && (
        <ConfirmDialog
          title="Delete category"
          message={`Delete "${pendingDelete.name}"? Products using it will keep their reference but this category won't be selectable for new ones.`}
          confirmLabel="Delete"
          onConfirm={handleDeleteConfirmed}
          onCancel={() => setPendingDelete(null)}
        />
      )}
    </div>
  );
}
