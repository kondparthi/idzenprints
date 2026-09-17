import { useEffect, useState, type FormEvent } from "react";
import { createCardType, deleteCardType, listCardTypes, updateCardType } from "@/api/cardTypes";
import ConfirmDialog from "@/components/ConfirmDialog";
import type { CardType } from "@/types/cardType";
import "./CardTypes.css";

export default function CardTypes() {
  const [cardTypes, setCardTypes] = useState<CardType[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [creditCost, setCreditCost] = useState("1");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<CardType | null>(null);

  async function refresh() {
    setCardTypes(await listCardTypes());
  }

  useEffect(() => {
    refresh();
  }, []);

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) return;
    setIsSubmitting(true);
    try {
      await createCardType({
        name: name.trim(),
        description: description.trim() || undefined,
        credit_cost: creditCost ? Number(creditCost) : 1,
      });
      setName("");
      setDescription("");
      setCreditCost("1");
      refresh();
    } finally {
      setIsSubmitting(false);
    }
  }

  async function updateCreditCost(cardType: CardType, value: string) {
    const cost = Number(value);
    if (Number.isNaN(cost) || cost < 0) return;
    await updateCardType(cardType.id, { credit_cost: cost });
    refresh();
  }

  async function toggleActive(cardType: CardType) {
    await updateCardType(cardType.id, { is_active: !cardType.is_active });
    refresh();
  }

  async function handleDeleteConfirmed() {
    if (!pendingDelete) return;
    await deleteCardType(pendingDelete.id);
    setPendingDelete(null);
    refresh();
  }

  return (
    <div>
      <h1>Card types</h1>
      <p className="dashboard-subtitle">
        These double as your subscription "Services" — the credit cost here is what a member's subscription is
        debited when they generate one of these cards.
      </p>

      <form className="card-panel card-type-form" onSubmit={handleCreate}>
        <div className="field-row">
          <div className="field">
            <label htmlFor="ctName">Name</label>
            <input id="ctName" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="field">
            <label htmlFor="ctDescription">Description (optional)</label>
            <input id="ctDescription" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="ctCreditCost">Credit cost</label>
            <input
              id="ctCreditCost"
              type="number"
              min="0"
              value={creditCost}
              onChange={(e) => setCreditCost(e.target.value)}
            />
          </div>
        </div>
        <button className="btn btn-primary" type="submit" disabled={isSubmitting}>
          Add card type
        </button>
      </form>

      <div className="card-panel card-types-table-panel">
        <table className="customers-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Description</th>
              <th>Credit cost</th>
              <th>Status</th>
              <th aria-label="Actions" />
            </tr>
          </thead>
          <tbody>
            {cardTypes.map((ct) => (
              <tr key={ct.id}>
                <td>{ct.name}</td>
                <td>{ct.description || "—"}</td>
                <td>
                  <input
                    type="number"
                    min="0"
                    className="card-type-credit-input"
                    defaultValue={ct.credit_cost}
                    onBlur={(e) => updateCreditCost(ct, e.target.value)}
                  />
                </td>
                <td>{ct.is_active ? "Active" : "Inactive"}</td>
                <td className="customers-row-actions">
                  <button className="link-action" onClick={() => toggleActive(ct)}>
                    {ct.is_active ? "Deactivate" : "Activate"}
                  </button>
                  <button className="link-danger" onClick={() => setPendingDelete(ct)}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pendingDelete && (
        <ConfirmDialog
          title="Delete card type"
          message={`Delete "${pendingDelete.name}"? Templates using it will keep their reference but this type won't be selectable for new ones.`}
          confirmLabel="Delete"
          onConfirm={handleDeleteConfirmed}
          onCancel={() => setPendingDelete(null)}
        />
      )}
    </div>
  );
}
