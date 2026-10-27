import { isAxiosError } from "axios";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { listCardTypes } from "@/api/cardTypes";
import { createCustomer, updateCustomer } from "@/api/customers";
import { processDocument, uploadDocument } from "@/api/documents";
import { updateCustomerDetails } from "@/api/customerDetails";
import { listTemplates } from "@/api/templates";
import { downloadCard, generateCard, previewCard } from "@/api/cards";
import { addToBucket } from "@/api/printBucket";
import { learnTelugu, toTelugu } from "@/api/translation";
import {
  DEFAULT_PRINT_OPTIONS, PRINT_LAYOUTS, downloadPrintSheet, openPrintSheet, previewPrintSheet,
  type PrintSheetOptions,
} from "@/api/printSheet";
import { usePrintBucket } from "@/print-bucket/PrintBucketContext";
import { validateAadhaarDetails, type ValidationResult } from "@/utils/cardValidation";
import { templateHasBackSide, type Template } from "@/types/template";
import type { CardType } from "@/types/cardType";
import type { CustomerDetails, DocumentType } from "@/types/document";
import type { GeneratedCard } from "@/types/generatedCard";
import "./CardGenerationWizard.css";
import "./QuickCard.css";

const STEPS = ["Create new card", "Upload file", "Validate", "Select theme", "Preview", "Edit", "Generate"];
const S = { CREATE: 0, UPLOAD: 1, VALIDATE: 2, THEME: 3, PREVIEW: 4, EDIT: 5, GENERATE: 6 } as const;

type Fields = Pick<
  CustomerDetails,
  | "name" | "name_local" | "dob" | "gender" | "address" | "address_local"
  | "document_number" | "vid_number" | "issue_date" | "details_as_on"
>;

function errorMessage(err: unknown, fallback: string): string {
  if (isAxiosError(err)) {
    const detail = err.response?.data?.detail;
    if (typeof detail === "string" && detail) return detail;
    if (detail && typeof detail === "object" && "message" in detail) return String(detail.message);
  }
  return fallback;
}

function documentTypeFor(cardType: CardType | undefined): DocumentType {
  const name = (cardType?.name ?? "").toLowerCase();
  return name.includes("ration") || name.includes("fsc") ? "fsc" : "aadhaar";
}

export default function QuickCard() {
  const { refresh: refreshBucketCount } = usePrintBucket();
  const [step, setStep] = useState<number>(S.CREATE);
  const [error, setError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  // 1 — create
  const [cardTypes, setCardTypes] = useState<CardType[]>([]);
  const [cardTypeId, setCardTypeId] = useState("");
  const [mobile, setMobile] = useState("");

  // 2 — upload
  const [frontFile, setFrontFile] = useState<File | null>(null);
  const [backFile, setBackFile] = useState<File | null>(null);
  const [password, setPassword] = useState("");
  const [needsPassword, setNeedsPassword] = useState(false);
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [documentId, setDocumentId] = useState<string | null>(null);
  const [detailsId, setDetailsId] = useState<string | null>(null);

  // 3/6 — details (shared by the validate and edit steps)
  const [fields, setFields] = useState<Fields | null>(null);
  // The Telugu the converter last produced — used to tell "operator typed
  // this Telugu" (learn from it) from "converter produced this" (safe to
  // overwrite when the English changes).
  const [auto, setAuto] = useState({ name_local: "", address_local: "" });

  // 4 — theme, 5 — preview
  const [templates, setTemplates] = useState<Template[]>([]);
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [backPreviewUrl, setBackPreviewUrl] = useState<string | null>(null);

  // 7 — generate
  const [card, setCard] = useState<GeneratedCard | null>(null);
  const [bucketState, setBucketState] = useState<"idle" | "adding" | "added">("idle");

  // print workspace
  const [printOpts, setPrintOpts] = useState<PrintSheetOptions>(DEFAULT_PRINT_OPTIONS);
  const [sheetPages, setSheetPages] = useState<string[]>([]);
  const [sheetIdx, setSheetIdx] = useState(0);
  const [sheetBusy, setSheetBusy] = useState(false);
  const layoutInfo = PRINT_LAYOUTS.find((l) => l.id === printOpts.layout) ?? PRINT_LAYOUTS[0];
  function setOpt<K extends keyof PrintSheetOptions>(key: K, value: PrintSheetOptions[K]) {
    setPrintOpts((prev) => ({ ...prev, [key]: value }));
  }

  useEffect(() => {
    if (!card) return;
    let cancelled = false;
    setSheetBusy(true);
    const t = setTimeout(() => {
      previewPrintSheet(card.id, printOpts)
        .then((pages) => { if (!cancelled) { setSheetPages(pages); setSheetIdx((i) => Math.min(i, pages.length - 1)); } })
        .catch((err) => { if (!cancelled) setError(errorMessage(err, "Couldn't build the print preview.")); })
        .finally(() => { if (!cancelled) setSheetBusy(false); });
    }, 350);
    return () => { cancelled = true; clearTimeout(t); };
  }, [card, printOpts]);

  const urlsToRevoke = useRef<string[]>([]);
  useEffect(() => () => urlsToRevoke.current.forEach((u) => URL.revokeObjectURL(u)), []);

  useEffect(() => {
    listCardTypes().then((types) => {
      const active = types.filter((t) => t.is_active);
      setCardTypes(active);
      const aadhaar = active.find((t) => t.name.toLowerCase().includes("aadhaar"));
      setCardTypeId((aadhaar ?? active[0])?.id ?? "");
    });
  }, []);

  const cardType = cardTypes.find((t) => t.id === cardTypeId);
  const selectedTemplate = templates.find((t) => t.id === templateId);
  const validation: ValidationResult[] = useMemo(() => (fields ? validateAadhaarDetails(fields) : []), [fields]);
  const errorCount = validation.filter((v) => v.level === "error").length;
  const warnCount = validation.filter((v) => v.level === "warn").length;

  function setField<K extends keyof Fields>(key: K, value: string) {
    setFields((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  // ---- Telugu ------------------------------------------------------------

  async function convertTelugu(which: "both" | "name" | "address" = "both") {
    if (!fields) return;
    try {
      const t = await toTelugu({ name: fields.name, address: fields.address });
      setFields((prev) =>
        prev
          ? {
              ...prev,
              name_local: which === "address" ? prev.name_local : t.name_local,
              address_local: which === "name" ? prev.address_local : t.address_local,
            }
          : prev
      );
      setAuto((prev) => ({
        name_local: which === "address" ? prev.name_local : t.name_local,
        address_local: which === "name" ? prev.address_local : t.address_local,
      }));
    } catch (err) {
      setError(errorMessage(err, "Couldn't convert to Telugu."));
    }
  }

  /** When the English name/address is edited, refresh its Telugu — but only
   * if the operator hasn't hand-edited that Telugu themselves. */
  async function refreshTeluguIfAuto(which: "name" | "address") {
    if (!fields) return;
    const key = which === "name" ? "name_local" : "address_local";
    if (fields[key] !== auto[key] && (fields[key] ?? "") !== "") return;
    await convertTelugu(which);
  }

  // ---- steps -------------------------------------------------------------

  async function handleStart() {
    if (!cardTypeId) return;
    setError(null);
    setStep(S.UPLOAD);
  }

  async function handleUpload() {
    if (!frontFile) return;
    setIsBusy(true);
    setError(null);
    try {
      let custId = customerId;
      let docId = documentId;
      if (!custId) {
        const customer = await createCustomer({ name: "Quick card", mobile: mobile.trim() || "0000000000" });
        custId = customer.id;
        setCustomerId(custId);
      }
      if (!docId) {
        const doc = await uploadDocument(custId, documentTypeFor(cardType), frontFile, backFile);
        docId = doc.id;
        setDocumentId(docId);
      }
      const details = await processDocument(docId, { password: password || undefined, englishToTelugu: true });
      setDetailsId(details.id);
      const read: Fields = {
        name: details.name ?? "", name_local: details.name_local ?? "", dob: details.dob ?? "",
        gender: details.gender ?? "", address: details.address ?? "", address_local: details.address_local ?? "",
        document_number: details.document_number ?? "", vid_number: details.vid_number ?? "",
        issue_date: details.issue_date ?? "", details_as_on: details.details_as_on ?? "",
      };
      setFields(read);
      setAuto({ name_local: read.name_local ?? "", address_local: read.address_local ?? "" });
      setNeedsPassword(false);
      setStep(S.VALIDATE);
    } catch (err) {
      const detail = isAxiosError(err) ? err.response?.data?.detail : null;
      if (detail && typeof detail === "object" && detail.reason_code === "pdf_password_required") {
        setNeedsPassword(true);
        setError(password ? "That password didn't work — try again." : "This PDF is locked — enter its password below.");
      } else {
        setError(errorMessage(err, "Couldn't upload or read that file."));
      }
    } finally {
      setIsBusy(false);
    }
  }

  /** Saves the details (and teaches the converter any Telugu the operator
   * fixed by hand). */
  async function saveDetails(): Promise<boolean> {
    if (!fields || !detailsId || !customerId) return false;
    try {
      await updateCustomerDetails(detailsId, {
        name: fields.name ?? "", name_local: fields.name_local ?? "", dob: fields.dob ?? "",
        gender: fields.gender ?? "", address: fields.address ?? "", address_local: fields.address_local ?? "",
        document_number: fields.document_number ?? "", vid_number: fields.vid_number ?? "",
        issue_date: fields.issue_date ?? "", details_as_on: fields.details_as_on ?? "",
      });
      if (fields.name?.trim()) {
        await updateCustomer(customerId, { name: fields.name.trim(), address: fields.address ?? undefined });
      }
      const nameEdited = (fields.name_local ?? "") !== auto.name_local;
      const addressEdited = (fields.address_local ?? "") !== auto.address_local;
      if (nameEdited || addressEdited) {
        await learnTelugu({
          name: nameEdited ? fields.name : null,
          name_local: nameEdited ? fields.name_local : null,
          address: addressEdited ? fields.address : null,
          address_local: addressEdited ? fields.address_local : null,
        });
        setAuto({ name_local: fields.name_local ?? "", address_local: fields.address_local ?? "" });
      }
      return true;
    } catch (err) {
      setError(errorMessage(err, "Couldn't save those details."));
      return false;
    }
  }

  async function handleValidated() {
    setIsBusy(true);
    setError(null);
    try {
      if (!(await saveDetails())) return;
      if (cardTypeId) {
        const all = await listTemplates(cardTypeId);
        const active = all.filter((t) => t.is_active);
        setTemplates(active);
        if (!templateId && active.length > 0) setTemplateId(active[0].id);
      }
      setStep(S.THEME);
    } finally {
      setIsBusy(false);
    }
  }

  async function buildPreview(): Promise<boolean> {
    if (!customerId || !templateId || !selectedTemplate) return false;
    try {
      const [front, back] = await Promise.all([
        previewCard(customerId, templateId, "front"),
        templateHasBackSide(selectedTemplate) ? previewCard(customerId, templateId, "back") : Promise.resolve(null),
      ]);
      urlsToRevoke.current.push(front, ...(back ? [back] : []));
      setPreviewUrl(front);
      setBackPreviewUrl(back);
      return true;
    } catch (err) {
      setError(errorMessage(err, "Couldn't build a preview."));
      return false;
    }
  }

  async function handleShowPreview() {
    setIsBusy(true);
    setError(null);
    try {
      if (await buildPreview()) setStep(S.PREVIEW);
    } finally {
      setIsBusy(false);
    }
  }

  async function handleSaveEdit() {
    setIsBusy(true);
    setError(null);
    try {
      if (!(await saveDetails())) return;
      if (await buildPreview()) setStep(S.PREVIEW);
    } finally {
      setIsBusy(false);
    }
  }

  async function handleGenerate() {
    if (!customerId || !templateId) return;
    setIsBusy(true);
    setError(null);
    try {
      setCard(await generateCard(customerId, templateId));
    } catch (err) {
      setError(errorMessage(err, "Couldn't generate that card."));
    } finally {
      setIsBusy(false);
    }
  }

  async function handleAddToBucket() {
    if (!card) return;
    setBucketState("adding");
    try {
      await addToBucket(card.id);
      setBucketState("added");
      refreshBucketCount();
    } catch (err) {
      setBucketState("idle");
      setError(errorMessage(err, "Couldn't add to the print bucket."));
    }
  }

  function startOver() {
    setStep(S.CREATE); setError(null); setFrontFile(null); setBackFile(null); setPassword(""); setNeedsPassword(false);
    setCustomerId(null); setDocumentId(null); setDetailsId(null); setFields(null); setPreviewUrl(null);
    setBackPreviewUrl(null); setCard(null); setBucketState("idle"); setMobile("");
  }

  // ---- shared form -------------------------------------------------------

  const detailsForm = fields && (
    <div className="quick-form">
      <div className="field-row">
        <div className="field">
          <label htmlFor="q-name">Name (English)</label>
          <input id="q-name" value={fields.name ?? ""} onChange={(e) => setField("name", e.target.value)} onBlur={() => refreshTeluguIfAuto("name")} />
        </div>
        <div className="field">
          <label htmlFor="q-name-local">Name (Telugu)</label>
          <input id="q-name-local" value={fields.name_local ?? ""} onChange={(e) => setField("name_local", e.target.value)} />
        </div>
      </div>
      <div className="field-row">
        <div className="field">
          <label htmlFor="q-dob">Date of birth (dd/mm/yyyy)</label>
          <input id="q-dob" value={fields.dob ?? ""} onChange={(e) => setField("dob", e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="q-gender">Gender</label>
          <select id="q-gender" value={fields.gender ?? ""} onChange={(e) => setField("gender", e.target.value)}>
            <option value="">Select…</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Transgender">Transgender</option>
          </select>
        </div>
      </div>
      <div className="field">
        <label htmlFor="q-address">Address (English)</label>
        <textarea id="q-address" rows={3} value={fields.address ?? ""} onChange={(e) => setField("address", e.target.value)} onBlur={() => refreshTeluguIfAuto("address")} />
      </div>
      <div className="field">
        <label htmlFor="q-address-local">Address (Telugu)</label>
        <textarea id="q-address-local" rows={3} value={fields.address_local ?? ""} onChange={(e) => setField("address_local", e.target.value)} />
      </div>
      <button type="button" className="btn btn-secondary btn-sm" onClick={() => convertTelugu("both")}>
        Convert English → Telugu again
      </button>
      <p className="field-hint">
        Telugu is built from the English. If you fix a Telugu word by hand, it is remembered and used automatically next time.
      </p>
      <div className="field-row" style={{ marginTop: 12 }}>
        <div className="field">
          <label htmlFor="q-number">Aadhaar number</label>
          <input id="q-number" value={fields.document_number ?? ""} onChange={(e) => setField("document_number", e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="q-vid">VID</label>
          <input id="q-vid" value={fields.vid_number ?? ""} onChange={(e) => setField("vid_number", e.target.value)} />
        </div>
      </div>
      <div className="field-row">
        <div className="field">
          <label htmlFor="q-issued">Aadhaar no. issued</label>
          <input id="q-issued" value={fields.issue_date ?? ""} onChange={(e) => setField("issue_date", e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="q-ason">Details as on</label>
          <input id="q-ason" value={fields.details_as_on ?? ""} onChange={(e) => setField("details_as_on", e.target.value)} />
        </div>
      </div>
    </div>
  );

  return (
    <div>
      <h1>Quick card</h1>
      <p className="dashboard-subtitle">Upload an Aadhaar file, check it, pick a theme and generate — all on one page.</p>

      <div className="wizard-steps">
        {STEPS.map((label, idx) => (
          <div key={label} className={"wizard-step" + (idx === step ? " is-active" : idx < step ? " is-done" : "")}>
            <span className="wizard-step-dot">{idx < step ? "✓" : idx + 1}</span>
            {label}
          </div>
        ))}
      </div>

      {error && <p className="error-text">{error}</p>}

      {step === S.CREATE && (
        <div className="card-panel wizard-panel">
          <h2 style={{ marginTop: 0 }}>Create new card</h2>
          <div className="field">
            <label htmlFor="q-type">Card type</label>
            <select id="q-type" value={cardTypeId} onChange={(e) => setCardTypeId(e.target.value)}>
              {cardTypes.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="q-mobile">Customer mobile (optional)</label>
            <input id="q-mobile" value={mobile} onChange={(e) => setMobile(e.target.value)} inputMode="numeric" />
          </div>
          <button className="btn btn-primary" disabled={!cardTypeId} onClick={handleStart}>
            Start
          </button>
        </div>
      )}

      {step === S.UPLOAD && (
        <div className="card-panel wizard-panel">
          <h2 style={{ marginTop: 0 }}>Upload the {cardType?.name ?? "document"}</h2>
          <div className="field">
            <label htmlFor="q-file">PDF, JPG or PNG</label>
            <input id="q-file" type="file" accept="application/pdf,image/png,image/jpeg" onChange={(e) => setFrontFile(e.target.files?.[0] ?? null)} />
          </div>
          <div className="field">
            <label htmlFor="q-back">Back side (optional — only if the address isn't in the first file)</label>
            <input id="q-back" type="file" accept="application/pdf,image/png,image/jpeg" onChange={(e) => setBackFile(e.target.files?.[0] ?? null)} />
          </div>
          <div className="field">
            <label htmlFor="q-pass">PDF password (only if the PDF is locked)</label>
            <input id="q-pass" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoFocus={needsPassword} placeholder="e.g. MALG1961" />
            <p className="field-hint">e-Aadhaar PDFs: first 4 letters of the name in CAPITALS + birth year.</p>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn btn-secondary" onClick={() => setStep(S.CREATE)} disabled={isBusy}>Back</button>
            <button className="btn btn-primary" disabled={!frontFile || isBusy} onClick={handleUpload}>
              {isBusy ? "Uploading & reading…" : needsPassword ? "Try again" : "Upload & read"}
            </button>
          </div>
        </div>
      )}

      {step === S.VALIDATE && fields && (
        <div className="card-panel wizard-panel quick-wide">
          <h2 style={{ marginTop: 0 }}>Check the details</h2>
          <div className="quick-columns">
            {detailsForm}
            <div className="quick-checks">
              <h3 style={{ marginTop: 0 }}>Validation</h3>
              <ul className="quick-check-list">
                {validation.map((v) => (
                  <li key={v.field} className={"quick-check quick-check-" + v.level}>
                    <span className="quick-check-icon">{v.level === "ok" ? "✓" : v.level === "warn" ? "!" : "✕"}</span>
                    <span>
                      <strong>{v.label}</strong>
                      <br />
                      <span className="field-hint">{v.message}</span>
                    </span>
                  </li>
                ))}
              </ul>
              <p className={errorCount ? "error-text" : "field-hint"}>
                {errorCount ? `${errorCount} problem${errorCount === 1 ? "" : "s"} to fix before continuing.` : warnCount ? `${warnCount} warning${warnCount === 1 ? "" : "s"} — you can still continue.` : "All checks passed."}
              </p>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
            <button className="btn btn-secondary" onClick={() => setStep(S.UPLOAD)} disabled={isBusy}>Back</button>
            <button className="btn btn-primary" disabled={errorCount > 0 || isBusy} onClick={handleValidated}>
              {isBusy ? "Saving…" : "Save & select theme"}
            </button>
          </div>
        </div>
      )}

      {step === S.THEME && (
        <div className="card-panel wizard-panel">
          <h2 style={{ marginTop: 0 }}>Select theme</h2>
          {templates.length === 0 ? (
            <p className="empty-state">No active themes for this card type yet. Create one under Templates.</p>
          ) : (
            <div className="theme-grid">
              {templates.map((tpl) => (
                <button key={tpl.id} type="button" className={"theme-card" + (templateId === tpl.id ? " is-selected" : "")} onClick={() => setTemplateId(tpl.id)}>
                  {tpl.name}
                </button>
              ))}
            </div>
          )}
          <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
            <button className="btn btn-secondary" onClick={() => setStep(S.VALIDATE)} disabled={isBusy}>Back</button>
            <button className="btn btn-primary" disabled={!templateId || isBusy} onClick={handleShowPreview}>
              {isBusy ? "Building preview…" : "Preview card"}
            </button>
          </div>
        </div>
      )}

      {step === S.PREVIEW && previewUrl && (
        <div className="qc-workspace">
          <aside className="card-panel qc-side">
            <h3 className="qc-side-title">Configuration</h3>
            <div className="field"><label>Card type</label><div className="qc-static">{cardType?.name}</div></div>
            <div className="field"><label>Theme</label><div className="qc-static">{selectedTemplate?.name}</div></div>
            <div className="field"><label>Customer</label><div className="qc-static">{fields?.name}</div></div>
            <button className="btn btn-secondary btn-sm" onClick={() => setStep(S.THEME)}>Change theme</button>
            <button className="btn btn-secondary btn-sm" onClick={() => setStep(S.EDIT)}>Edit card</button>
          </aside>
          <section className="qc-main">
            <h2 className="qc-main-title">Extracted card</h2>
            <div className="qc-cards">
              <div className="qc-card-pane">
                <span className="qc-badge">FRONT</span>
                <img src={previewUrl} alt="Card preview — front" />
              </div>
              <div className="qc-card-pane">
                <span className="qc-badge">BACK</span>
                {backPreviewUrl ? <img src={backPreviewUrl} alt="Card preview — back" /> : <p className="field-hint">This theme has no back side.</p>}
              </div>
            </div>
          </section>
          <aside className="card-panel qc-side">
            <h3 className="qc-side-title">Next</h3>
            <button className="btn btn-primary" onClick={() => setStep(S.GENERATE)}>Looks good — go to print</button>
            <p className="field-hint">Not right? Use “Edit card” to fix any detail, then come back here.</p>
          </aside>
        </div>
      )}

      {step === S.EDIT && previewUrl && (
        <div className="card-panel wizard-panel quick-wide">
          <h2 style={{ marginTop: 0 }}>Edit the card</h2>
          <div className="quick-columns">
            {detailsForm}
            <div className="wizard-preview-sides">
              <div className="wizard-preview-side">
                {backPreviewUrl && <p className="wizard-preview-side-label">Front</p>}
                <img src={previewUrl} alt="Card preview — front" className="wizard-preview-image" />
              </div>
              {backPreviewUrl && (
                <div className="wizard-preview-side">
                  <p className="wizard-preview-side-label">Back</p>
                  <img src={backPreviewUrl} alt="Card preview — back" className="wizard-preview-image" />
                </div>
              )}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 16, flexWrap: "wrap" }}>
            <button className="btn btn-secondary" onClick={() => setStep(S.PREVIEW)} disabled={isBusy}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSaveEdit} disabled={errorCount > 0 || isBusy}>
              {isBusy ? "Saving…" : "Save & refresh preview"}
            </button>
            {errorCount > 0 && <span className="error-text">Fix {errorCount} problem{errorCount === 1 ? "" : "s"} first.</span>}
          </div>
        </div>
      )}

      {step === S.GENERATE && !card && (
        <div className="card-panel wizard-panel wizard-panel-success">
          <h2 style={{ marginTop: 0 }}>Generate card</h2>
          <p className="dashboard-subtitle">{fields?.name} · {selectedTemplate?.name}</p>
          <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
            <button className="btn btn-secondary" onClick={() => setStep(S.PREVIEW)} disabled={isBusy}>Back</button>
            <button className="btn btn-primary" onClick={handleGenerate} disabled={isBusy}>
              {isBusy ? "Generating…" : "Generate card"}
            </button>
          </div>
        </div>
      )}

      {step === S.GENERATE && card && (
        <div className="qc-workspace qc-print">
          <aside className="card-panel qc-side">
            <h3 className="qc-side-title">Print settings</h3>
            <div className="field">
              <label htmlFor="p-layout">Print layout</label>
              <select id="p-layout" value={printOpts.layout} onChange={(e) => setPrintOpts((p) => ({ ...p, layout: e.target.value, copies: 1, side: "both" }))}>
                {PRINT_LAYOUTS.map((l) => <option key={l.id} value={l.id}>{l.label}</option>)}
              </select>
            </div>
            {layoutInfo.sides && (
              <div className="field">
                <label>Card side</label>
                <div className="qc-toggle-row">
                  {(["front", "back"] as const).map((sd) => (
                    <button key={sd} type="button" className={"qc-toggle" + ((printOpts.side === sd || (printOpts.side === "both" && sd === "front")) ? " is-on" : "")} onClick={() => setOpt("side", sd)}>
                      {sd === "front" ? "Front" : "Back"}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="qc-toggle-row">
              <button type="button" className={"qc-toggle" + (printOpts.border ? " is-on" : "")} onClick={() => setOpt("border", !printOpts.border)}>Border</button>
              <button type="button" className={"qc-toggle" + (printOpts.mirror ? " is-on" : "")} onClick={() => setOpt("mirror", !printOpts.mirror)}>Mirror</button>
            </div>
            {layoutInfo.maxCopies > 1 && (
              <div className="field">
                <label htmlFor="p-copies">Copies on sheet (max {layoutInfo.maxCopies})</label>
                <input id="p-copies" type="number" min={1} max={layoutInfo.maxCopies} value={printOpts.copies} onChange={(e) => setOpt("copies", Math.max(1, Math.min(layoutInfo.maxCopies, Number(e.target.value) || 1)))} />
              </div>
            )}
            <div className="field">
              <label htmlFor="p-gap">Gap between cards: {printOpts.gap_mm} mm</label>
              <input id="p-gap" type="range" min={0} max={12} step={0.5} value={printOpts.gap_mm} onChange={(e) => setOpt("gap_mm", Number(e.target.value))} />
            </div>
            <p className="field-hint">Paper: {layoutInfo.paper}</p>
            <button className="btn btn-primary" onClick={() => downloadPrintSheet(card.id, printOpts, `${fields?.name ?? "card"}-${printOpts.layout}`).catch((e) => setError(errorMessage(e, "Couldn't download the PDF.")))}>Download PDF</button>
            <button className="btn btn-secondary" onClick={() => openPrintSheet(card.id, printOpts).catch((e) => setError(errorMessage(e, "Couldn't open the PDF.")))}>Print now</button>
            <hr className="qc-rule" />
            <div className="qc-toggle-row">
              <button className="btn btn-ghost btn-sm" onClick={() => downloadCard(card.id, "png", `${fields?.name ?? "card"}`)}>PNG</button>
              <button className="btn btn-ghost btn-sm" onClick={() => downloadCard(card.id, "jpg", `${fields?.name ?? "card"}`)}>JPG</button>
              {bucketState === "added" ? (
                <Link to="/print-bucket" className="btn btn-ghost btn-sm">In bucket</Link>
              ) : (
                <button className="btn btn-ghost btn-sm" onClick={handleAddToBucket} disabled={bucketState === "adding"}>Add to bucket</button>
              )}
            </div>
            <button className="btn btn-ghost btn-sm" onClick={startOver}>Create another card</button>
          </aside>

          <section className="qc-main">
            <h2 className="qc-main-title">Print preview &amp; setup guide</h2>
            {sheetPages.length > 1 && (
              <div className="qc-toggle-row" style={{ marginBottom: 8 }}>
                {sheetPages.map((_, i) => (
                  <button key={i} type="button" className={"qc-toggle" + (i === sheetIdx ? " is-on" : "")} onClick={() => setSheetIdx(i)}>
                    {sheetPages.length === 2 ? (i === 0 ? "Page 1 (fronts)" : "Page 2 (backs)") : `Page ${i + 1}`}
                  </button>
                ))}
              </div>
            )}
            <div className={"qc-sheet" + (sheetBusy ? " is-busy" : "")}>
              {sheetPages[sheetIdx] ? <img src={sheetPages[sheetIdx]} alt="Print sheet preview" /> : <p className="field-hint">Building preview…</p>}
            </div>
          </section>

          <aside className="qc-side">
            <div className="card-panel">
              <div className="qc-side-head">
                <h3 className="qc-side-title">Alignment</h3>
                <button className="btn btn-ghost btn-sm" onClick={() => setPrintOpts((p) => ({ ...p, dx_mm: 0, dy_mm: 0, zoom: 100, rotation: 0 }))}>Reset all</button>
              </div>
              <div className="field">
                <label>Zoom: {printOpts.zoom}%</label>
                <input type="range" min={80} max={120} value={printOpts.zoom} onChange={(e) => setOpt("zoom", Number(e.target.value))} />
              </div>
              <div className="field">
                <label>Rotation: {printOpts.rotation}°</label>
                <input type="range" min={-5} max={5} step={0.1} value={printOpts.rotation} onChange={(e) => setOpt("rotation", Number(e.target.value))} />
              </div>
              <div className="qc-nudge">
                <span>Nudge (0.5 mm)</span>
                <div className="qc-nudge-pad">
                  <button onClick={() => setOpt("dy_mm", printOpts.dy_mm - 0.5)} aria-label="Up">▲</button>
                  <button onClick={() => setOpt("dx_mm", printOpts.dx_mm - 0.5)} aria-label="Left">◀</button>
                  <button onClick={() => setOpt("dx_mm", printOpts.dx_mm + 0.5)} aria-label="Right">▶</button>
                  <button onClick={() => setOpt("dy_mm", printOpts.dy_mm + 0.5)} aria-label="Down">▼</button>
                </div>
                <span className="field-hint">X: {printOpts.dx_mm} mm · Y: {printOpts.dy_mm} mm</span>
              </div>
            </div>
            <div className="card-panel" style={{ marginTop: 12 }}>
              <h3 className="qc-side-title">Printer settings guide</h3>
              <dl className="qc-guide">
                {layoutInfo.guide.map(([k, v]) => (
                  <div key={k}><dt>{k}</dt><dd>{v}</dd></div>
                ))}
              </dl>
              <p className="qc-warn">Ensure “Fit to page” is OFF (100% actual size) in the print dialog.</p>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
