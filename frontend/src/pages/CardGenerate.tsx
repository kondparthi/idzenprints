import { useEffect, useRef, useState } from "react";
import type { DragEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { listCustomers } from "@/api/customers";
import { listCardTypes } from "@/api/cardTypes";
import { listTemplates } from "@/api/templates";
import { downloadCard, generateCard, getBoxImageDataUrl, previewCard, type FieldImageOverrides } from "@/api/cards";
import { listCustomerDetailsForCustomer, updateCustomerDetails } from "@/api/customerDetails";
import type { Customer } from "@/types/customer";
import type { CardType } from "@/types/cardType";
import type { Template } from "@/types/template";
import type { GeneratedCard } from "@/types/generatedCard";
import type { CustomerDetails, CustomerDetailsInput } from "@/types/document";
import { templateHasBackSide } from "@/types/template";
import { findDraggableElements, isPointInBoxes, type DraggableElementBox } from "@/utils/fieldPlacement";
import "./CardGenerate.css";

type Side = "front" | "back";

/** "front:el_123" — the key used throughout for box image state, locks,
 * and the drag payload, so a box is always identified together with
 * which side of the card it's on. */
function boxKey(side: Side, elementId: string): string {
  return `${side}:${elementId}`;
}

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

  // Confirm-by-image: before printing, staff drag a server-rendered
  // snapshot of each card box onto its spot on the preview. Dropping it
  // correctly both confirms the placement AND locks that exact image in —
  // from then on the box uses this picture, not a fresh text render, for
  // the preview and the printed card, so whatever staff saw and dragged is
  // exactly what ends up on the card.
  const [boxImages, setBoxImages] = useState<Record<string, string>>({});
  const [lockedBoxes, setLockedBoxes] = useState<Set<string>>(new Set());
  const [dragBoxKey, setDragBoxKey] = useState<string | null>(null);
  const [dropFlash, setDropFlash] = useState<{ key: string; ok: boolean; side: Side } | null>(null);
  const frontImgRef = useRef<HTMLImageElement | null>(null);
  const backImgRef = useRef<HTMLImageElement | null>(null);

  // Inline text correction: fixing a field (e.g. OCR-garbled address_local)
  // right here, instead of having to navigate to the Document Detail page
  // and come back. This edits the text itself — separate from drag-to-verify,
  // which only checks where a field lands, never what it says.
  const [editingKey, setEditingKey] = useState<keyof CustomerDetails | null>(null);
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
    setLockedBoxes(new Set());
    setBoxImages({});
  }, [cardTypeId]);

  // A different template changes which boxes even appear on the card, and
  // any earlier preview is now stale — the confirmation has to start over.
  useEffect(() => {
    setPreviewUrl(null);
    setBackPreviewUrl(null);
    setLockedBoxes(new Set());
    setBoxImages({});
  }, [templateId]);

  // The step the app was missing: show what OCR extracted (and whether an
  // operator has verified it) for the selected customer, so it's visible
  // *before* generating a card, not just substituted invisibly at render time.
  useEffect(() => {
    setExtractedDetails(null);
    setHasCheckedDetails(false);
    setLockedBoxes(new Set());
    setBoxImages({});
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

  // Only fields that actually have a value are worth asking staff to
  // confirm — an empty field has nothing to snapshot (the completeness
  // problem is a separate, earlier check). One row per template element,
  // not per field: a box can combine several fields in one block (e.g.
  // name + name_local + dob + gender stacked in one text box), and the
  // snapshot image is always of the whole box.
  const filledKeys = DETAIL_FIELDS.filter((f) => extractedDetails && (extractedDetails[f.key] as string | null)).map(
    (f) => f.key as string
  );
  const frontBoxes: DraggableElementBox[] = selectedTemplate
    ? findDraggableElements(selectedTemplate.elements, filledKeys)
    : [];
  const backBoxes: DraggableElementBox[] = selectedTemplate
    ? findDraggableElements(selectedTemplate.back_elements, filledKeys)
    : [];
  const allBoxKeys = [
    ...frontBoxes.map((b) => boxKey("front", b.elementId)),
    ...backBoxes.map((b) => boxKey("back", b.elementId)),
  ];
  const verificationRequired = allBoxKeys.length > 0;
  const confirmedBoxCount = allBoxKeys.filter((key) => lockedBoxes.has(key)).length;
  const allBoxesLocked = verificationRequired && confirmedBoxCount === allBoxKeys.length;
  const canGenerate = !verificationRequired || allBoxesLocked;

  function fieldLabelsForElement(elementId: string, side: Side): string {
    const elements = side === "front" ? selectedTemplate?.elements : selectedTemplate?.back_elements;
    const el = elements?.find((e) => e.id === elementId);
    const text = el?.type === "text" ? el.text : el?.type === "qrcode" || el?.type === "barcode" ? el.value : "";
    return DETAIL_FIELDS.filter((f) => text.includes(`{{${f.key}}}`))
      .map((f) => f.label)
      .join(", ");
  }

  // Once a preview exists, fetch a fresh server-rendered snapshot for every
  // box that doesn't have one yet — so there's always a correct, current
  // thumbnail ready to drag, without re-fetching ones already in hand.
  useEffect(() => {
    if (!previewUrl || !customerId || !templateId) return;
    const missing: { side: Side; elementId: string }[] = [];
    for (const b of frontBoxes) {
      if (!(boxKey("front", b.elementId) in boxImages)) missing.push({ side: "front", elementId: b.elementId });
    }
    for (const b of backBoxes) {
      if (!(boxKey("back", b.elementId) in boxImages)) missing.push({ side: "back", elementId: b.elementId });
    }
    if (missing.length === 0) return;
    let cancelled = false;
    Promise.all(
      missing.map(({ side, elementId }) =>
        getBoxImageDataUrl(customerId, templateId, side, elementId)
          .then((url) => [boxKey(side, elementId), url] as const)
          .catch(() => null)
      )
    ).then((results) => {
      if (cancelled) return;
      const updates = Object.fromEntries(results.filter((r): r is readonly [string, string] => r !== null));
      if (Object.keys(updates).length) setBoxImages((prev) => ({ ...prev, ...updates }));
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previewUrl, customerId, templateId, extractedDetails]);

  /** Builds the field_image_overrides payload from a set of locked box
   * keys (defaults to the current lockedBoxes state) — sent to both
   * preview (so what's on screen is pixel-identical to what prints) and
   * generate. Takes an explicit set so a just-added lock can be included
   * immediately, without waiting on React to re-render with the new
   * lockedBoxes state first. */
  function buildOverrides(lockedKeys: Set<string> = lockedBoxes): FieldImageOverrides | undefined {
    if (lockedKeys.size === 0) return undefined;
    const overrides: FieldImageOverrides = {};
    for (const key of lockedKeys) {
      const [side, elementId] = key.split(":");
      const image = boxImages[key];
      if (!image) continue;
      overrides[side] = overrides[side] || {};
      overrides[side][elementId] = image;
    }
    return overrides;
  }

  /** The single place that actually fetches and sets the preview images —
   * always server-rendered with whatever overrides are passed in, so the
   * screen never shows a locked box twice (once baked server-side, once
   * drawn again client-side): there is exactly one rendered source. */
  async function fetchAndSetPreview(overrides?: FieldImageOverrides) {
    const selected = templates.find((t) => t.id === templateId);
    const hasBack = selected ? templateHasBackSide(selected) : false;
    const [url, backUrl] = await Promise.all([
      previewCard(customerId, templateId, "front", overrides),
      hasBack ? previewCard(customerId, templateId, "back", overrides) : Promise.resolve(null),
    ]);
    setPreviewUrl(url);
    setBackPreviewUrl(backUrl);
  }

  async function handlePreview() {
    if (!customerId || !templateId) {
      setError("Choose a customer and a template first.");
      return;
    }
    setError(null);
    setIsPreviewing(true);
    try {
      await fetchAndSetPreview(buildOverrides());
    } catch {
      setError("Couldn't render a preview. Make sure the customer has verified details.");
    } finally {
      setIsPreviewing(false);
    }
  }

  function handleBoxDragStart(side: Side, elementId: string) {
    return (e: DragEvent<HTMLElement>) => {
      const key = boxKey(side, elementId);
      e.dataTransfer.setData("text/plain", key);
      e.dataTransfer.effectAllowed = "copy";
      setDragBoxKey(key);
    };
  }

  function handleBoxDragEnd() {
    setDragBoxKey(null);
  }

  function handleDragOverPreview(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
  }

  function handleDropOnSide(side: Side) {
    return async (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      const key = e.dataTransfer.getData("text/plain") || dragBoxKey;
      setDragBoxKey(null);
      if (!key || !selectedTemplate) return;
      const [dragSide, elementId] = key.split(":");
      if (dragSide !== side) {
        setDropFlash({ key, ok: false, side });
        window.setTimeout(() => setDropFlash(null), 1400);
        return;
      }

      const imgEl = side === "front" ? frontImgRef.current : backImgRef.current;
      if (!imgEl) return;
      const rect = imgEl.getBoundingClientRect();
      const xMm = ((e.clientX - rect.left) / rect.width) * selectedTemplate.width_mm;
      const yMm = ((e.clientY - rect.top) / rect.height) * selectedTemplate.height_mm;

      const boxList = side === "front" ? frontBoxes : backBoxes;
      const box = boxList.find((b) => b.elementId === elementId);
      const ok = box ? isPointInBoxes([box], xMm, yMm) : false;
      if (ok) {
        const nextLocked = new Set(lockedBoxes).add(key);
        setLockedBoxes(nextLocked);
        // Re-render the preview right away with this box's snapshot now
        // baked in server-side — the only way to show the locked result
        // without a second, separately-positioned copy drawn on top of
        // the first (that mismatch was the source of the ghosted/doubled
        // text seen earlier).
        setIsPreviewing(true);
        try {
          await fetchAndSetPreview(buildOverrides(nextLocked));
        } catch {
          setError("Locked, but couldn't refresh the preview — click Preview to refresh it manually.");
        } finally {
          setIsPreviewing(false);
        }
      }
      setDropFlash({ key, ok, side });
      window.setTimeout(() => setDropFlash(null), 1400);
    };
  }

  function startEditingField(field: keyof CustomerDetails) {
    setEditingKey(field);
    setEditValue((extractedDetails?.[field] as string | null) ?? "");
  }

  function cancelEditingField() {
    setEditingKey(null);
    setEditValue("");
  }

  async function saveEditingField() {
    if (!editingKey || !extractedDetails) return;
    setIsSavingEdit(true);
    try {
      const savedKey = editingKey;
      const updated = await updateCustomerDetails(extractedDetails.id, {
        [savedKey]: editValue,
      } as CustomerDetailsInput);
      setExtractedDetails(updated);
      // The text changed, so any box that renders this field is now stale —
      // drop its old snapshot and lock so it gets re-rendered and has to be
      // re-confirmed before the card can be generated again.
      const token = `{{${savedKey}}}`;
      const staleKeys = new Set<string>();
      for (const el of selectedTemplate?.elements ?? []) {
        const text = el.type === "text" ? el.text : el.type === "qrcode" || el.type === "barcode" ? el.value : "";
        if (text.includes(token)) staleKeys.add(boxKey("front", el.id));
      }
      for (const el of selectedTemplate?.back_elements ?? []) {
        const text = el.type === "text" ? el.text : el.type === "qrcode" || el.type === "barcode" ? el.value : "";
        if (text.includes(token)) staleKeys.add(boxKey("back", el.id));
      }
      if (staleKeys.size) {
        setLockedBoxes((prev) => {
          const next = new Set(prev);
          staleKeys.forEach((k) => next.delete(k));
          return next;
        });
        setBoxImages((prev) => {
          const next = { ...prev };
          staleKeys.forEach((k) => delete next[k]);
          return next;
        });
      }
      setEditingKey(null);
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
      const card = await generateCard(customerId, templateId, buildOverrides());
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

            {verificationRequired && !allBoxesLocked && (
              <p className="field-hint">
                Drag each snapshot in "Confirm card content" below onto its spot on the preview to lock it in —{" "}
                {confirmedBoxCount} of {allBoxKeys.length} confirmed. Generate card unlocks once all are checked.
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
                          <dd>
                            <span className="detail-value-text">{value || "—"}</span>
                            <button
                              type="button"
                              className="detail-edit-btn"
                              title="Edit this field's text"
                              onClick={() => startEditingField(field.key)}
                            >
                              <i className="bi bi-pencil"></i>
                            </button>
                          </dd>
                        </div>
                      );
                    })}
                  </dl>

                  {previewUrl && (
                    <div className="box-confirm-panel">
                      <h3>Confirm card content</h3>
                      {!verificationRequired ? (
                        <p className="field-hint">
                          Nothing on this template uses the extracted data, or none of it is filled in — nothing to confirm.
                        </p>
                      ) : (
                        <>
                          <p className="field-hint">
                            Drag each snapshot onto its spot on the card — once dropped correctly, that exact picture
                            is what prints, so a text edit afterwards won't change what's on the card.
                          </p>
                          {([
                            ["front", frontBoxes],
                            ["back", backBoxes],
                          ] as [Side, DraggableElementBox[]][])
                            .filter(([, boxes]) => boxes.length > 0)
                            .map(([side, boxes]) => (
                              <div key={side} className="box-confirm-side">
                                <p className="box-confirm-side-label">{side === "front" ? "Front" : "Back"}</p>
                                <div className="box-confirm-list">
                                  {boxes.map((b) => {
                                    const key = boxKey(side, b.elementId);
                                    const isLocked = lockedBoxes.has(key);
                                    const imgSrc = boxImages[key];
                                    return (
                                      <div key={key} className={"box-confirm-item " + (isLocked ? "box-confirm-locked" : "")}>
                                        {imgSrc ? (
                                          <img
                                            src={imgSrc}
                                            alt={fieldLabelsForElement(b.elementId, side)}
                                            className="box-confirm-thumb"
                                            draggable={!isLocked}
                                            onDragStart={handleBoxDragStart(side, b.elementId)}
                                            onDragEnd={handleBoxDragEnd}
                                            title={isLocked ? "Locked in" : "Drag onto the card to confirm & lock"}
                                          />
                                        ) : (
                                          <span className="box-confirm-thumb-loading">…</span>
                                        )}
                                        <span className="box-confirm-fields">{fieldLabelsForElement(b.elementId, side)}</span>
                                        {isLocked && <span className="detail-verified-badge">✓ Locked</span>}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            ))}
                        </>
                      )}
                    </div>
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
                  {dragBoxKey &&
                    selectedTemplate &&
                    dragBoxKey.startsWith("front:") &&
                    (() => {
                      const b = frontBoxes.find((box) => boxKey("front", box.elementId) === dragBoxKey);
                      if (!b) return null;
                      return (
                        <div className="card-preview-targets">
                          <div
                            className="card-preview-target-box"
                            style={{
                              left: `${(b.x / selectedTemplate.width_mm) * 100}%`,
                              top: `${(b.y / selectedTemplate.height_mm) * 100}%`,
                              width: `${(b.width / selectedTemplate.width_mm) * 100}%`,
                              height: `${(b.height / selectedTemplate.height_mm) * 100}%`,
                            }}
                          />
                        </div>
                      );
                    })()}
                </div>
                {dropFlash && dropFlash.side === "front" && (
                  <p className={"drop-flash " + (dropFlash.ok ? "drop-flash-ok" : "drop-flash-fail")}>
                    {dropFlash.ok
                      ? `✓ ${fieldLabelsForElement(dropFlash.key.split(":")[1], "front")} confirmed`
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
                    {dragBoxKey &&
                      selectedTemplate &&
                      dragBoxKey.startsWith("back:") &&
                      (() => {
                        const b = backBoxes.find((box) => boxKey("back", box.elementId) === dragBoxKey);
                        if (!b) return null;
                        return (
                          <div className="card-preview-targets">
                            <div
                              className="card-preview-target-box"
                              style={{
                                left: `${(b.x / selectedTemplate.width_mm) * 100}%`,
                                top: `${(b.y / selectedTemplate.height_mm) * 100}%`,
                                width: `${(b.width / selectedTemplate.width_mm) * 100}%`,
                                height: `${(b.height / selectedTemplate.height_mm) * 100}%`,
                              }}
                            />
                          </div>
                        );
                      })()}
                  </div>
                  {dropFlash && dropFlash.side === "back" && (
                    <p className={"drop-flash " + (dropFlash.ok ? "drop-flash-ok" : "drop-flash-fail")}>
                      {dropFlash.ok
                        ? `✓ ${fieldLabelsForElement(dropFlash.key.split(":")[1], "back")} confirmed`
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
