import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { listCardTypes } from "@/api/cardTypes";
import { createTemplate, deleteTemplate, duplicateTemplate, listTemplates, updateTemplate } from "@/api/templates";
import ConfirmDialog from "@/components/ConfirmDialog";
import type { CardType } from "@/types/cardType";
import type { Template } from "@/types/template";
import "./Templates.css";

export default function Templates() {
  const navigate = useNavigate();
  const [cardTypes, setCardTypes] = useState<CardType[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [name, setName] = useState("");
  const [cardTypeId, setCardTypeId] = useState("");
  const [widthMm, setWidthMm] = useState(85.6);
  const [heightMm, setHeightMm] = useState(53.98);
  const [dpi, setDpi] = useState(300);
  // Mandatory — an admin must say up front whether this card needs a
  // back design at all, so "Create & open designer" is disabled until
  // one of the two is picked (see the radio group below).
  const [cardSides, setCardSides] = useState<"single" | "double" | "">("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Template | null>(null);

  async function refresh() {
    setTemplates(await listTemplates());
  }

  useEffect(() => {
    listCardTypes().then((types) => {
      setCardTypes(types);
      if (types.length > 0) setCardTypeId(types[0].id);
    });
    refresh();
  }, []);

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    if (!name.trim() || !cardTypeId || !cardSides) return;
    setIsSubmitting(true);
    try {
      const template = await createTemplate({
        name: name.trim(),
        card_type_id: cardTypeId,
        width_mm: widthMm,
        height_mm: heightMm,
        dpi,
        elements: [],
        back_elements: [],
      });
      // Carries the admin's choice into the designer so it knows whether
      // to nudge them toward the Back tab — the template itself stays
      // single- or double-sided based on what actually ends up on the
      // back, not this flag, so nothing is locked in by this choice.
      navigate(`/templates/${template.id}/design?sides=${cardSides}`);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function toggleActive(template: Template) {
    await updateTemplate(template.id, { is_active: !template.is_active });
    refresh();
  }

  async function handleDuplicate(template: Template) {
    await duplicateTemplate(template.id);
    refresh();
  }

  async function handleDeleteConfirmed() {
    if (!pendingDelete) return;
    await deleteTemplate(pendingDelete.id);
    setPendingDelete(null);
    refresh();
  }

  function cardTypeName(id: string): string {
    return cardTypes.find((ct) => ct.id === id)?.name ?? id;
  }

  return (
    <div>
      <h1>Templates</h1>

      <form className="card-panel template-create-form" onSubmit={handleCreate}>
        <h2>New template</h2>
        <div className="field-row">
          <div className="field">
            <label htmlFor="tName">Name</label>
            <input id="tName" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="field">
            <label htmlFor="tCardType">Card type</label>
            <select id="tCardType" value={cardTypeId} onChange={(e) => setCardTypeId(e.target.value)} required>
              {cardTypes.map((ct) => (
                <option key={ct.id} value={ct.id}>
                  {ct.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="field-row">
          <div className="field">
            <label htmlFor="tWidth">Width (mm)</label>
            <input
              id="tWidth"
              type="number"
              step="0.01"
              value={widthMm}
              onChange={(e) => setWidthMm(Number(e.target.value))}
            />
          </div>
          <div className="field">
            <label htmlFor="tHeight">Height (mm)</label>
            <input
              id="tHeight"
              type="number"
              step="0.01"
              value={heightMm}
              onChange={(e) => setHeightMm(Number(e.target.value))}
            />
          </div>
          <div className="field">
            <label htmlFor="tDpi">DPI</label>
            <input id="tDpi" type="number" value={dpi} onChange={(e) => setDpi(Number(e.target.value))} />
          </div>
        </div>
        <div className="field">
          <label>
            Card sides <span className="required-mark">*</span>
          </label>
          <div className="card-sides-options">
            <label className="card-sides-option">
              <input
                type="radio"
                name="cardSides"
                value="single"
                checked={cardSides === "single"}
                onChange={() => setCardSides("single")}
                required
              />
              Single side only
            </label>
            <label className="card-sides-option">
              <input
                type="radio"
                name="cardSides"
                value="double"
                checked={cardSides === "double"}
                onChange={() => setCardSides("double")}
                required
              />
              Front &amp; back (double side)
            </label>
          </div>
          {!cardSides && <p className="field-hint">Pick one to continue — this just opens the designer on the right tab; you can still add or skip the back later.</p>}
        </div>
        <button className="btn btn-primary" type="submit" disabled={isSubmitting || !cardTypeId || !cardSides}>
          {isSubmitting ? "Creating…" : "Create & open designer"}
        </button>
      </form>

      <div className="card-panel templates-table-panel">
        <table className="customers-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Card type</th>
              <th>Size</th>
              <th>Status</th>
              <th aria-label="Actions" />
            </tr>
          </thead>
          <tbody>
            {templates.map((t) => (
              <tr key={t.id}>
                <td>
                  <Link to={`/templates/${t.id}/design`}>{t.name}</Link>
                </td>
                <td>{cardTypeName(t.card_type_id)}</td>
                <td>
                  {t.width_mm}×{t.height_mm}mm @ {t.dpi}dpi
                </td>
                <td>{t.is_active ? "Active" : "Inactive"}</td>
                <td className="customers-row-actions">
                  <button className="link-action" onClick={() => handleDuplicate(t)}>
                    Duplicate
                  </button>
                  <button className="link-action" onClick={() => toggleActive(t)}>
                    {t.is_active ? "Deactivate" : "Activate"}
                  </button>
                  <button className="link-danger" onClick={() => setPendingDelete(t)}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {templates.length === 0 && <p className="empty-state">No templates yet — create one above.</p>}
      </div>

      {pendingDelete && (
        <ConfirmDialog
          title="Delete template"
          message={`Delete "${pendingDelete.name}"? This cannot be undone.`}
          confirmLabel="Delete"
          onConfirm={handleDeleteConfirmed}
          onCancel={() => setPendingDelete(null)}
        />
      )}
    </div>
  );
}
