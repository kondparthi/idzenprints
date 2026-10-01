import { useEffect, useRef, useState } from "react";
import type { DragEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { listCustomers } from "@/api/customers";
import { listCardTypes } from "@/api/cardTypes";
import { listTemplates } from "@/api/templates";
import { downloadCard, generateCard, previewCard } from "@/api/cards";
import { listCustomerDetailsForCustomer, updateCustomerDetails } from "@/api/customerDetails";
import type { Customer } from "@/types/customer";
import type { CardType } from "@/types/cardType";
import type { Template } from "@/types/template";
import type { GeneratedCard } from "@/types/generatedCard";
import type { CustomerDetails, CustomerDetailsInput } from "@/types/document";
import { templateHasBackSide } from "@/types/template";
import { findFieldBoxes, isPointInBoxes, type FieldBox } from "@/utils/fieldPlacement";
import "./CardGenerate.css";

const DETAIL_FIELDS: { key: keyof CustomerDetails; label: string }[] = [
  { key: "name", label: "Name" },
  { key: "name_local", label: "Name (regional script)" },
  { key: "dob", label: "Date of birth" },
  { key: "gender", label: "Gender" },
  { key: "document_number", label: "Document number" },
  { key: "vid_number", label: "VID number" },
  { key: "issue_date", label: "Aadhaar no. issued" },
  { key: "details_as_on", label: "Details as on" },
  { key: "address", label: "Address" },
  { key: "address_local", label: "Address (regional script)" },
];

export default function CardGenerate() {
  const [searchParams] = useSearchParams();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [cardTypes, setCardTypes] = useState<CardType[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);

  const [customerId, setCustomerId] = useState(searchParams.get("customer_id") ?? "");
  const [cardTypeId, setCardTypeId] = useState("");
  const [templateId, setTemplateId] = useState("");

  const [extractedDetails, setExtractedDetails] = useState<CustomerDetails | null>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [hasCheckedDetails, setHasCheckedDetails] = useState(false);

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [backPreviewUrl, setBackPreviewUrl] = useState<string | null>(null);
  const [generatedCard, setGeneratedCard] = useState<GeneratedCard | null>(null);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Drag-to-verify: before printing, staff drag each extracted field onto
  // the rendered card to confirm it's actually showing up in the right
  // spot — catches a wrong template, a stale preview, or OCR data that
  // silently didn't make it onto the card, before it goes to print.
  const [verifiedFields, setVerifiedFields] = useState<Set<string>>(new Set());
  const [dragKey, setDragKey] = useState<string | null>(null);
  const [dropFlash, setDropFlash] = useState<{ key: string; ok: boolean; side: "front" | "back" } | null>(null);
  const frontImgRef = useRef<HTMLImageElement | null>(null);
  const backImgRef = useRef<HTMLImageElement | null>(null);

  // Inline text correction: fixing a field (e.g. OCR-garbled address_local)
  // right here, instead of having to navigate to the Document Detail page
  // and come back. This edits the text itself — separate from drag-to-verify,
  // which only checks where a field lands, never what it says.
  const [editingKey, setEditingKey] = useState<keyof CustomerDetails | null>(null);
  const [editingSide, setEditingSide] = useState<"front" | "back" | null>(null);
  const [editValue, setEditValue] = useState("");
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  useEffect(() => {
    listCustomers("", 1, 100).then((r) => setCustomers(r.items));
    listCardTypes().then(setCardTypes);
  }, []);

  useEffect(() => {
    if (!cardTypeId) {
      setTemplates([]);
      return;
    }
    listTemplates(cardTypeId).then((all) => setTemplates(all.filter((t) => t.is_active)));
  }, [cardTypeId]);

  useEffect(() => {
    setTemplateId("");
    setPreviewUrl(null);
    setBackPreviewUrl(null);
    setGeneratedCard(null);
    setVerifiedFields(new Set());
  }, [cardTypeId]);

  // A different template changes which fields even appear on the card, and
  // any earlier preview is now stale — the verification has to start over.
  useEffect(() => {
    setPreviewUrl(null);
    setBackPreviewUrl(null);
    setVerifiedFields(new Set());
  }, [templateId]);

  // The step the app was missing: show what OCR extracted (and whether an
  // operator has verified it) for the selected customer, so it's visible
  // *before* generating a card, not just substituted invisibly at render time.
  useEffect(() => {
    setExtractedDetails(null);
    setHasCheckedDetails(false);
    setVerifiedFields(new Set());
    if (!customerId) return;

    setIsLoadingDetails(true);
    listCustomerDetailsForCustomer(customerId)
      .then((all) => {
        const verified = all.find((d) => d.is_verified);
        setExtractedDetails(verified ?? all[0] ?? null);
      })
      .finally(() => {
        setIsLoadingDetails(false);
        setHasCheckedDetails(true);
      });
  }, [customerId]);

  const selectedTemplate = templates.find((t) => t.id === templateId) ?? null;

  const frontBoxesByField: Record<string, FieldBox[]> = {};
  const backBoxesByField: Record<string, FieldBox[]> = {};
  if (selectedTemplate) {
    for (const field of DETAIL_FIELDS) {
      frontBoxesByField[field.key] = findFieldBoxes(selectedTemplate.elements, field.key);
      backBoxesByField[field.key] = findFieldBoxes(selectedTemplate.back_elements, field.key);
    }
  }

  // Only fields that actually have a value AND actually appear somewhere on
  // this template are worth asking staff to confirm — a field the template
  // doesn't use can't be dragged onto it, and an empty field has nothing to
  // verify (the completeness problem is a separate, earlier check).
  const draggableFieldKeys = DETAIL_FIELDS.filter(
    (field) =>
      extractedDetails &&
      (extractedDetails[field.key] as string | null) &&
      (frontBoxesByField[field.key]?.length ?? 0) + (backBoxesByField[field.key]?.length ?? 0) > 0
  ).map((field) => field.key as string);
  const verificationRequired = draggableFieldKeys.length > 0;
  const confirmedFieldCount = draggableFieldKeys.filter((key) => verifiedFields.has(key)).length;
  const allFieldsVerified = verificationRequired && confirmedFieldCount === draggableFieldKeys.length;
  const canGenerate = !verificationRequired || allFieldsVerified;

  async function handlePreview() {
    if (!customerId || !templateId) {
      setError("Choose a customer and a template first.");
      return;
    }
    setError(null);
    setIsPreviewing(true);
    setVerifiedFields(new Set());
    try {
      const selected = templates.find((t) => t.id === templateId);
      const hasBack = selected ? templateHasBackSide(selected) : false;
      const [url, backUrl] = await Promise.all([
        previewCard(customerId, templateId, "front"),
        hasBack ? previewCard(customerId, templateId, "back") : Promise.resolve(null),
      ]);
      setPreviewUrl(url);
      setBackPreviewUrl(backUrl);
    } catch {
      setError("Couldn't render a preview. Make sure the customer has verified details.");
    } finally {
      setIsPreviewing(false);
    }
  }

  function handleFieldDragStart(key: string) {
    return (e: DragEvent<HTMLElement>) => {
      e.dataTransfer.setData("text/plain", key);
      e.dataTransfer.effectAllowed = "copy";
      setDragKey(key);
    };
  }

  function handleFieldDragEnd() {
    setDragKey(null);
  }

  function handleDragOverPreview(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
  }

  function handleDropOnSide(side: "front" | "back") {
    return (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      const key = e.dataTransfer.getData("text/plain") || dragKey;
      setDragKey(null);
      if (!key || !selectedTemplate) return;

      const imgEl = side === "front" ? frontImgRef.current : backImgRef.current;
      if (!imgEl) return;
      const rect = imgEl.getBoundingClientRect();
      const xMm = ((e.clientX - rect.left) / rect.width) * selectedTemplate.width_mm;
      const yMm = ((e.clientY - rect.top) / rect.height) * selectedTemplate.height_mm;

      const boxes = side === "front" ? frontBoxesByField[key] : backBoxesByField[key];
      const ok = isPointInBoxes(boxes ?? [], xMm, yMm);
      if (ok) {
        setVerifiedFields((prev) => new Set(prev).add(key));
      }
      setDropFlash({ key, ok, side });
      window.setTimeout(() => setDropFlash(null), 1400);
    };
  }

  function startEditingField(field: keyof CustomerDetails, side: "front" | "back" | null = null) {
    setEditingKey(field);
    setEditingSide(side);
    setEditValue((extractedDetails?.[field] as string | null) ?? "");
  }

  function cancelEditingField() {
    setEditingKey(null);
    setEditingSide(null);
    setEditValue("");
  }

  async function saveEditingField() {
    if (!editingKey || !extractedDetails) return;
    setIsSavingEdit(true);
    try {
      const updated = await updateCustomerDetails(extractedDetails.id, {
        [editingKey]: editValue,
      } as CustomerDetailsInput);
      setExtractedDetails(updated);
      // The text changed, so any earlier drag-confirmation for this field no
      // longer proves anything — and if a preview is already on screen, it's
      // now showing the old text, so re-render it with the correction.
      setVerifiedFields((prev) => {
        const next = new Set(prev);
        next.delete(editingKey);
        return next;
      });
      setEditingKey(null);
      setEditingSide(null);
      setEditValue("");
      if (previewUrl) {
        await handlePreview();
      }
    } catch {
      setError("Couldn't save that correction. Try again.");
    } finally {
      setIsSavingEdit(false);
    }
  }

  async function handleGenerate() {
    if (!customerId || !templateId) {
      setError("Choose a customer and a template first.");
      return;
    }
    setError(null);
    setIsGenerating(true);
    try {
      const card = await generateCard(customerId, templateId);
      setGeneratedCard(card);
    } catch {
      setError("Card generation failed.");
    } finally {
      setIsGenerating(false);
    }
  }

  function customerName(): string {
    return customers.find((c) => c.id === customerId)?.name ?? "card";
  }

  // Click-to-edit directly on the card: an invisible hotspot over wherever a
  // field actually renders, so staff can fix text (type or paste Telugu
  // straight in) right where they see it's wrong, instead of hunting for the
  // matching row in the Extracted details list below.
  function renderFieldHotspots(side: "front" | "back") {
    if (!selectedTemplate) return null;
    const boxesByField = side === "front" ? frontBoxesByField : backBoxesByField;
    return DETAIL_FIELDS.filter((f) => (boxesByField[f.key]?.length ?? 0) > 0).flatMap((field) =>
      boxesByField[field.key].map((b, i) => (
        <div
          key={`${field.key}-${i}`}
          className="card-preview-hotspot"
          title={`Click to edit ${field.label}`}
          onClick={() => startEditingField(field.key, side)}
          style={{
            left: `${(b.x / selectedTemplate.width_mm) * 100}%`,
            top: `${(b.y / selectedTemplate.height_mm) * 100}%`,
            width: `${(b.width / selectedTemplate.width_mm) * 100}%`,
            height: `${(b.height / selectedTemplate.height_mm) * 100}%`,
          }}
        />
      ))
    );
  }

  function renderEditPopover(side: "front" | "back") {
    if (!editingKey || editingSide !== side || !selectedTemplate) return null;
    const boxesByField = side === "front" ? frontBoxesByField : backBoxesByField;
    const box = boxesByField[editingKey]?.[0];
    if (!box) return null;

    const field = DETAIL_FIELDS.find((f) => f.key === editingKey);
    const isMultiline = editingKey === "address" || editingKey === "address_local";
    const topPct = (box.y / selectedTemplate.height_mm) * 100;
    const leftPct = Math.min((box.x / selectedTemplate.width_mm) * 100, 60);
    const openBelow = topPct < 55;

    return (
      <div
        className={"card-preview-popover " + (openBelow ? "card-preview-popover-below" : "card-preview-popover-above")}
        style={{ left: `${leftPct}%`, top: `${topPct}%` }}
      >
        <div className="card-preview-popover-label">{field?.label}</div>
        {isMultiline ? (
          <textarea rows={3} autoFocus value={editValue} onChange={(e) => setEditValue(e.target.value)} />
        ) : (
          <input type="text" autoFocus value={editValue} onChange={(e) => setEditValue(e.target.value)} />
        )}
        <div className="detail-edit-actions">
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={cancelEditingField}
            disabled={isSavingEdit}
          >
            Cancel
          </button>
          <button type="button" className="btn btn-primary btn-sm" onClick={saveEditingField} disabled={isSavingEdit}>
            {isSavingEdit ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="card-generate-page">
      <h1>Generate card</h1>

      <div className="card-generate-grid">
        <div>
          <div className="card-panel card-generate-form">
            <div className="field">
              <label htmlFor="customer">Customer</label>
              <select id="customer" value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
                <option value="">Select a customer…</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} — {c.mobile}
                  </option>
                ))}
              </select>
            </div>

            <div className="field">
              <label htmlFor="cardType">Card type</label>
              <select id="cardType" value={cardTypeId} onChange={(e) => setCardTypeId(e.target.value)}>
                <option value="">Select a card type…</option>
                {cardTypes.map((ct) => (
                  <option key={ct.id} value={ct.id}>
                    {ct.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="field">
              <label htmlFor="template">Template</label>
              <select
                id="template"
                value={templateId}
                onChange={(e) => setTemplateId(e.target.value)}
                disabled={!cardTypeId}
              >
                <option value="">Select a template…</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>

            {error && <p className="error-text">{error}</p>}

            <div className="card-generate-actions">
              <button className="btn btn-secondary" onClick={handlePreview} disabled={isPreviewing}>
                {isPreviewing ? "Rendering…" : "Preview"}
              </button>
              <button className="btn btn-primary" onClick={handleGenerate} disabled={isGenerating || !canGenerate}>
                {isGenerating ? "Generating…" : "Generate card"}
              </button>
            </div>

            {verificationRequired && !allFieldsVerified && (
              <p className="field-hint">
                Drag each extracted field below onto its spot on the preview to confirm it's correct — {confirmedFieldCount}{" "}
                of {draggableFieldKeys.length} confirmed. Generate card unlocks once all are checked.
              </p>
            )}

            {generatedCard && (
              <div className="card-generate-downloads">
                <p className="verified-note">
                  Generated — download below.
                  {generatedCard.back_png_path && " The PDF has both the front and back as two pages."}
                </p>
                <div className="card-generate-actions">
                  <button className="btn btn-secondary" onClick={() => downloadCard(generatedCard.id, "pdf", customerName())}>
                    Download PDF
                  </button>
                  <button className="btn btn-secondary" onClick={() => downloadCard(generatedCard.id, "png", customerName())}>
                    Download PNG (front)
                  </button>
                  <button className="btn btn-secondary" onClick={() => downloadCard(generatedCard.id, "jpg", customerName())}>
                    Download JPG (front)
                  </button>
                  {generatedCard.back_png_path && (
                    <>
                      <button className="btn btn-secondary" onClick={() => downloadCard(generatedCard.id, "png", customerName(), "back")}>
                        Download PNG (back)
                      </button>
                      <button className="btn btn-secondary" onClick={() => downloadCard(generatedCard.id, "jpg", customerName(), "back")}>
                        Download JPG (back)
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          {customerId && (
            <div className="card-panel extracted-details-panel">
              <div className="extracted-details-header">
                <h2>Extracted details</h2>
                {extractedDetails && (
                  <span className={"badge " + (extractedDetails.is_verified ? "badge-success" : "badge-warning")}>
                    {extractedDetails.is_verified ? "Verified" : "Not yet verified"}
                  </span>
                )}
              </div>

              {isLoadingDetails ? (
                <p className="empty-state">Loading…</p>
              ) : extractedDetails ? (
                <>
                  <dl className="extracted-details-list">
                    {DETAIL_FIELDS.map((field) => {
                      const value = extractedDetails[field.key] as string | null;
                      const isDraggable = previewUrl && draggableFieldKeys.includes(field.key);
                      const isVerified = verifiedFields.has(field.key);
                      const isEditing = editingKey === field.key;
                      const isMultiline = field.key === "address" || field.key === "address_local";

                      if (isEditing) {
                        return (
                          <div key={field.key} className="extracted-details-row extracted-details-row-editing">
                            <dt>{field.label}</dt>
                            <dd className="detail-edit-form">
                              {isMultiline ? (
                                <textarea
                                  rows={3}
                                  autoFocus
                                  value={editValue}
                                  onChange={(e) => setEditValue(e.target.value)}
                                />
                              ) : (
                                <input
                                  type="text"
                                  autoFocus
                                  value={editValue}
                                  onChange={(e) => setEditValue(e.target.value)}
                                />
                              )}
                              <div className="detail-edit-actions">
                                <button
                                  type="button"
                                  className="btn btn-secondary btn-sm"
                                  onClick={cancelEditingField}
                                  disabled={isSavingEdit}
                                >
                                  Cancel
                                </button>
                                <button
                                  type="button"
                                  className="btn btn-primary btn-sm"
                                  onClick={saveEditingField}
                                  disabled={isSavingEdit}
                                >
                                  {isSavingEdit ? "Saving…" : "Save"}
                                </button>
                              </div>
                            </dd>
                          </div>
                        );
                      }

                      return (
                        <div key={field.key} className="extracted-details-row">
                          <dt>{field.label}</dt>
                          <dd
                            draggable={Boolean(isDraggable) && !isVerified}
                            onDragStart={isDraggable ? handleFieldDragStart(field.key) : undefined}
                            onDragEnd={isDraggable ? handleFieldDragEnd : undefined}
                            className={
                              (isDraggable ? "detail-draggable " : "") + (isVerified ? "detail-verified" : "")
                            }
                            title={isDraggable ? "Drag onto the card preview to confirm it's in the right place" : undefined}
                          >
                            <span className="detail-value-text">{value || "—"}</span>
                            <button
                              type="button"
                              className="detail-edit-btn"
                              title="Edit this field's text"
                              onClick={() => startEditingField(field.key)}
                            >
                              <i className="bi bi-pencil"></i>
                            </button>
                            {isVerified && <span className="detail-verified-badge">✓ Confirmed</span>}
                          </dd>
                        </div>
                      );
                    })}
                  </dl>
                  {previewUrl && !verificationRequired && (
                    <p className="field-hint">No draggable fields to confirm — nothing on this template uses the extracted data, or none of it is filled in.</p>
                  )}
                  {!extractedDetails.is_verified && (
                    <p className="extracted-details-warning">
                      These details haven't been verified by an operator yet — double-check them before generating.
                    </p>
                  )}
                  {extractedDetails.document_id && (
                    <Link to={`/documents/${extractedDetails.document_id}`} className="btn-ghost-link">
                      {extractedDetails.is_verified ? "Edit extracted details" : "Review & verify details"}
                    </Link>
                  )}
                </>
              ) : (
                hasCheckedDetails && (
                  <>
                    <p className="empty-state">
                      No document has been uploaded and scanned for this customer yet — the card will generate with
                      whatever basic info is on their customer record only.
                    </p>
                    <Link to={`/documents/upload?customer_id=${customerId}`} className="btn btn-secondary">
                      Upload document to extract details
                    </Link>
                  </>
                )
              )}
            </div>
          )}
        </div>

        <div className="card-panel card-preview-panel">
          {previewUrl ? (
            <div className="card-preview-sides">
              <div className="card-preview-side">
                {backPreviewUrl && <p className="card-preview-side-label">Front</p>}
                <div
                  className="card-preview-dropzone"
                  onDragOver={handleDragOverPreview}
                  onDrop={handleDropOnSide("front")}
                >
                  <img
                    ref={frontImgRef}
                    src={previewUrl}
                    alt="Card preview — front"
                    className="card-preview-image"
                  />
                  {dragKey && selectedTemplate && (frontBoxesByField[dragKey]?.length ?? 0) > 0 && (
                    <div className="card-preview-targets">
                      {frontBoxesByField[dragKey].map((b, i) => (
                        <div
                          key={i}
                          className="card-preview-target-box"
                          style={{
                            left: `${(b.x / selectedTemplate.width_mm) * 100}%`,
                            top: `${(b.y / selectedTemplate.height_mm) * 100}%`,
                            width: `${(b.width / selectedTemplate.width_mm) * 100}%`,
                            height: `${(b.height / selectedTemplate.height_mm) * 100}%`,
                          }}
                        />
                      ))}
                    </div>
                  )}
                  {!dragKey && <div className="card-preview-hotspots">{renderFieldHotspots("front")}</div>}
                  {renderEditPopover("front")}
                </div>
                {dropFlash && dropFlash.side === "front" && (
                  <p className={"drop-flash " + (dropFlash.ok ? "drop-flash-ok" : "drop-flash-fail")}>
                    {dropFlash.ok
                      ? `✓ ${DETAIL_FIELDS.find((f) => f.key === dropFlash.key)?.label} confirmed`
                      : "Not placed correctly — try again"}
                  </p>
                )}
              </div>
              {backPreviewUrl && (
                <div className="card-preview-side">
                  <p className="card-preview-side-label">Back</p>
                  <div
                    className="card-preview-dropzone"
                    onDragOver={handleDragOverPreview}
                    onDrop={handleDropOnSide("back")}
                  >
                    <img
                      ref={backImgRef}
                      src={backPreviewUrl}
                      alt="Card preview — back"
                      className="card-preview-image"
                    />
                    {dragKey && selectedTemplate && (backBoxesByField[dragKey]?.length ?? 0) > 0 && (
                      <div className="card-preview-targets">
                        {backBoxesByField[dragKey].map((b, i) => (
                          <div
                            key={i}
                            className="card-preview-target-box"
                            style={{
                              left: `${(b.x / selectedTemplate.width_mm) * 100}%`,
                              top: `${(b.y / selectedTemplate.height_mm) * 100}%`,
                              width: `${(b.width / selectedTemplate.width_mm) * 100}%`,
                              height: `${(b.height / selectedTemplate.height_mm) * 100}%`,
                            }}
                          />
                        ))}
                      </div>
                    )}
                    {!dragKey && <div className="card-preview-hotspots">{renderFieldHotspots("back")}</div>}
                    {renderEditPopover("back")}
                  </div>
                  {dropFlash && dropFlash.side === "back" && (
                    <p className={"drop-flash " + (dropFlash.ok ? "drop-flash-ok" : "drop-flash-fail")}>
                      {dropFlash.ok
                        ? `✓ ${DETAIL_FIELDS.find((f) => f.key === dropFlash.key)?.label} confirmed`
                        : "Not placed correctly — try again"}
                    </p>
                  )}
                </div>
              )}
            </div>
          ) : (
            <p className="empty-state">Choose a customer and template, then click Preview.</p>
          )}
        </div>
      </div>
    </div>
  );
}
