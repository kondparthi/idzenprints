import { useEffect, useState, type FormEvent } from "react";
import { createMemberType, deleteMemberType, listMemberTypes, updateMemberType } from "@/api/memberTypes";
import { listCardTypes } from "@/api/cardTypes";
import ConfirmDialog from "@/components/ConfirmDialog";
import type { CardType } from "@/types/cardType";
import type { MemberType } from "@/types/subscription";
import "./CardTypes.css";
import "./MemberTypes.css";

export default function MemberTypes() {
  const [memberTypes, setMemberTypes] = useState<MemberType[]>([]);
  const [services, setServices] = useState<CardType[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<MemberType | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    setMemberTypes(await listMemberTypes());
  }

  useEffect(() => {
    refresh();
    listCardTypes().then(setServices);
  }, []);

  function toggleService(id: string) {
    setSelectedServiceIds((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]));
  }

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) return;
    setIsSubmitting(true);
    try {
      await createMemberType({ name: name.trim(), description: description.trim() || undefined, service_ids: selectedServiceIds });
      setName("");
      setDescription("");
      setSelectedServiceIds([]);
      refresh();
    } finally {
      setIsSubmitting(false);
    }
  }

  async function toggleActive(memberType: MemberType) {
    await updateMemberType(memberType.id, { is_active: !memberType.is_active });
    refresh();
  }

  async function handleDeleteConfirmed() {
    if (!pendingDelete) return;
    setError(null);
    try {
      await deleteMemberType(pendingDelete.id);
      setPendingDelete(null);
      refresh();
    } catch (err: any) {
      setPendingDelete(null);
      if (err?.response?.status === 409) {
        setError(`Can't delete — members are already registered under this type. Deactivate it instead.`);
      } else {
        setError("Could not delete this member type.");
      }
    }
  }

  return (
    <div>
      <h1>Member types</h1>
      <p className="dashboard-subtitle">Meeseva, Internet Cafe, Individual, Company — who your subscribers are.</p>

      <form className="card-panel card-type-form" onSubmit={handleCreate}>
        <div className="field-row">
          <div className="field">
            <label htmlFor="mtName">Name</label>
            <input id="mtName" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="field">
            <label htmlFor="mtDescription">Description (optional)</label>
            <input id="mtDescription" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
        </div>

        <div className="field">
          <label>Available services</label>
          <div className="member-type-service-picker">
            {services.map((s) => (
              <label key={s.id} className="member-type-service-option">
                <input type="checkbox" checked={selectedServiceIds.includes(s.id)} onChange={() => toggleService(s.id)} />
                {s.name}
              </label>
            ))}
          </div>
        </div>

        <button className="btn btn-primary" type="submit" disabled={isSubmitting}>
          Add member type
        </button>
      </form>

      {error && <p className="error-text">{error}</p>}

      <div className="card-panel card-types-table-panel">
        <table className="customers-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Services</th>
              <th>Status</th>
              <th aria-label="Actions" />
            </tr>
          </thead>
          <tbody>
            {memberTypes.map((mt) => (
              <tr key={mt.id}>
                <td>{mt.name}</td>
                <td>{mt.services.length ? mt.services.map((s) => s.name).join(", ") : "—"}</td>
                <td>{mt.is_active ? "Active" : "Inactive"}</td>
                <td className="customers-row-actions">
                  <button className="link-action" onClick={() => toggleActive(mt)}>
                    {mt.is_active ? "Deactivate" : "Activate"}
                  </button>
                  <button className="link-danger" onClick={() => setPendingDelete(mt)}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {memberTypes.length === 0 && <p className="empty-state">No member types yet — add one above.</p>}
      </div>

      {pendingDelete && (
        <ConfirmDialog
          title="Delete member type"
          message={`Delete "${pendingDelete.name}"?`}
          confirmLabel="Delete"
          onConfirm={handleDeleteConfirmed}
          onCancel={() => setPendingDelete(null)}
        />
      )}
    </div>
  );
}
