import { useEffect, useState } from "react";
import { listActiveCardTypes } from "@/api/public";
import {
  uploadDocument,
  processDocument,
  updateDocumentDetails,
  listTemplatesForCardType,
  previewCard,
  generateCard,
  triggerCardDownload,
} from "@/api/memberCards";
import type { DocumentType, CustomerDetails } from "@/types/document";
import type { Template } from "@/types/template";
import type { GeneratedCard } from "@/types/generatedCard";
import "./CardGenerationWizard.css";

interface CardGenerationWizardProps {
  documentType: DocumentType;
  cardTypeName: string;
  title: string;
}

const STEPS = ["Upload", "Details", "Theme", "Preview", "Generate"];

export default function CardGenerationWizard({ documentType, cardTypeName, title }: CardGenerationWizardProps) {
  const [step, setStep] = useState(0);
  const [cardTypeId, setCardTypeId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  // Step 1: upload
  const [frontFile, setFrontFile] = useState<File | null>(null);
  const [backFile, setBackFile] = useState<File | null>(null);
  const [pdfPassword, setPdfPassword] = useState("");
  const [needsPassword, setNeedsPassword] = useState(false);
  const [documentId, setDocumentId] = useState<string | null>(null);

  // Step 2: bilingual details
  const [details, setDetails] = useState<CustomerDetails | null>(null);

  // Step 3: theme
  const [templates, setTemplates] = useState<Template[]>([]);
  const [templateId, setTemplateId] = useState<string | null>(null);

  // Step 4: preview
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Step 5: generated
  const [card, setCard] = useState<GeneratedCard | null>(null);

  useEffect(() => {
    listActiveCardTypes().then((types) => {
      const match = types.find((t) => t.name === cardTypeName);
      if (match) setCardTypeId(match.id);
      else setError(`"${cardTypeName}" isn't configured yet — contact support.`);
    });
  }, [cardTypeName]);

  async function handleUpload() {
    if (!frontFile && !documentId) return;
    setIsBusy(true);
    setError(null);
    try {
      let docId = documentId;
      if (!docId) {
        const doc = await uploadDocument(documentType, frontFile!, backFile ?? undefined);
        docId = doc.id;
        setDocumentId(docId);
      }
      const extracted = await processDocument(docId, pdfPassword || undefined);
      setDetails(extracted);
      setNeedsPassword(false);
      setStep(1);
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      if (typeof detail === "object" && detail?.reason_code === "pdf_password_required") {
        setNeedsPassword(true);
        setError(pdfPassword ? "That password didn't work — try again." : "This PDF is password-protected — enter the password below.");
      } else {
        const message = typeof detail === "object" ? detail?.message : detail;
        setError(message || "Couldn't upload or read that document.");
      }
    } finally {
      setIsBusy(false);
    }
  }

  async function handleSaveDetails() {
    if (!documentId || !details) return;
    setIsBusy(true);
    setError(null);
    try {
      const saved = await updateDocumentDetails(documentId, {
        name: details.name ?? undefined,
        name_local: details.name_local ?? undefined,
        dob: details.dob ?? undefined,
        gender: details.gender ?? undefined,
        address: details.address ?? undefined,
        address_local: details.address_local ?? undefined,
        document_number: details.document_number ?? undefined,
        vid_number: details.vid_number ?? undefined,
      });
      setDetails(saved);
      if (cardTypeId) {
        const list = await listTemplatesForCardType(cardTypeId);
        setTemplates(list);
        if (list.length > 0) setTemplateId(list[0].id);
      }
      setStep(2);
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Couldn't save those details.");
    } finally {
      setIsBusy(false);
    }
  }

  async function handleShowPreview() {
    if (!documentId || !templateId) return;
    setIsBusy(true);
    setError(null);
    try {
      const url = await previewCard(documentId, templateId);
      setPreviewUrl(url);
      setStep(3);
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Couldn't build a preview.");
    } finally {
      setIsBusy(false);
    }
  }

  async function handleGenerate() {
    if (!documentId || !templateId || !cardTypeId) return;
    setIsBusy(true);
    setError(null);
    try {
      const generated = await generateCard(documentId, templateId, cardTypeId);
      setCard(generated);
      setStep(4);
      window.dispatchEvent(new Event("idzen:credits-changed"));
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      const message = typeof detail === "object" ? detail?.message : detail;
      setError(message || "Couldn't generate that card.");
    } finally {
      setIsBusy(false);
    }
  }

  async function handleDownload() {
    if (!card) return;
    await triggerCardDownload(card.id, `${cardTypeName.replace(/\s+/g, "_")}.pdf`);
  }

  return (
    <div>
      <h1>{title}</h1>

      <div className="wizard-steps">
        {STEPS.map((label, idx) => (
          <div key={label} className={"wizard-step" + (idx === step ? " is-active" : idx < step ? " is-done" : "")}>
            <span className="wizard-step-dot">{idx < step ? "✓" : idx + 1}</span>
            {label}
          </div>
        ))}
      </div>

      {error && <p className="error-text">{error}</p>}

      {step === 0 && (
        <div className="card-panel wizard-panel">
          <h2 style={{ marginTop: 0 }}>Upload your {cardTypeName} document</h2>
          <div className="field">
            <label htmlFor="frontFile">Front side</label>
            <input id="frontFile" type="file" accept="image/*,.pdf" onChange={(e) => setFrontFile(e.target.files?.[0] ?? null)} />
          </div>
          <div className="field">
            <label htmlFor="backFile">
              Back side (optional — only if the address isn't already visible on the front, e.g. a physical card's
              back. Skip this if you're uploading a single e-Aadhaar PDF or an image that already shows everything.)
            </label>
            <input id="backFile" type="file" accept="image/*,.pdf" onChange={(e) => setBackFile(e.target.files?.[0] ?? null)} />
          </div>
          {needsPassword && (
            <div className="field">
              <label htmlFor="pdfPassword">PDF password</label>
              <input
                id="pdfPassword"
                type="password"
                value={pdfPassword}
                onChange={(e) => setPdfPassword(e.target.value)}
                placeholder="Enter the password for this PDF"
                autoFocus
              />
            </div>
          )}
          <button className="btn btn-primary" disabled={(!frontFile && !documentId) || isBusy} onClick={handleUpload}>
            {isBusy ? "Uploading & reading…" : needsPassword ? "Try again" : "Upload & continue"}
          </button>
        </div>
      )}

      {step === 1 && details && (
        <div className="card-panel wizard-panel">
          <h2 style={{ marginTop: 0 }}>Review the extracted details</h2>
          <p className="dashboard-subtitle">
            Automatic reading isn't always perfect — check and correct anything before continuing.
          </p>
          <div className="field-row">
            <div className="field">
              <label htmlFor="name">Name (English)</label>
              <input id="name" value={details.name ?? ""} onChange={(e) => setDetails({ ...details, name: e.target.value })} />
            </div>
            <div className="field">
              <label htmlFor="nameLocal">Name (regional language)</label>
              <input id="nameLocal" value={details.name_local ?? ""} onChange={(e) => setDetails({ ...details, name_local: e.target.value })} />
            </div>
          </div>
          <div className="field-row">
            <div className="field">
              <label htmlFor="dob">Date of birth</label>
              <input id="dob" value={details.dob ?? ""} onChange={(e) => setDetails({ ...details, dob: e.target.value })} />
            </div>
            <div className="field">
              <label htmlFor="gender">Gender</label>
              <input id="gender" value={details.gender ?? ""} onChange={(e) => setDetails({ ...details, gender: e.target.value })} />
            </div>
          </div>
          <div className="field">
            <label htmlFor="address">Address (English)</label>
            <textarea id="address" rows={2} value={details.address ?? ""} onChange={(e) => setDetails({ ...details, address: e.target.value })} />
          </div>
          <div className="field">
            <label htmlFor="addressLocal">Address (regional language)</label>
            <textarea id="addressLocal" rows={2} value={details.address_local ?? ""} onChange={(e) => setDetails({ ...details, address_local: e.target.value })} />
          </div>
          <div className="field">
            <label htmlFor="docNumber">Document number</label>
            <input id="docNumber" value={details.document_number ?? ""} onChange={(e) => setDetails({ ...details, document_number: e.target.value })} />
          </div>
          <button className="btn btn-primary" disabled={isBusy} onClick={handleSaveDetails}>
            {isBusy ? "Saving…" : "Save & choose a theme"}
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="card-panel wizard-panel">
          <h2 style={{ marginTop: 0 }}>Choose a theme</h2>
          {templates.length === 0 ? (
            <p className="empty-state">No themes are available for this card yet — contact support.</p>
          ) : (
            <div className="theme-grid">
              {templates.map((tpl) => (
                <button
                  key={tpl.id}
                  type="button"
                  className={"theme-card" + (templateId === tpl.id ? " is-selected" : "")}
                  onClick={() => setTemplateId(tpl.id)}
                >
                  {tpl.name}
                </button>
              ))}
            </div>
          )}
          <button className="btn btn-primary" disabled={!templateId || isBusy} onClick={handleShowPreview} style={{ marginTop: 16 }}>
            {isBusy ? "Building preview…" : "Preview card"}
          </button>
        </div>
      )}

      {step === 3 && previewUrl && (
        <div className="card-panel wizard-panel">
          <h2 style={{ marginTop: 0 }}>Preview</h2>
          <img src={previewUrl} alt="Card preview" className="wizard-preview-image" />
          <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
            <button className="btn btn-secondary" onClick={() => setStep(2)}>
              Back to themes
            </button>
            <button className="btn btn-primary" disabled={isBusy} onClick={handleGenerate}>
              {isBusy ? "Generating…" : "Generate card"}
            </button>
          </div>
        </div>
      )}

      {step === 4 && card && (
        <div className="card-panel wizard-panel wizard-panel-success">
          <span className="section-placeholder-icon" style={{ margin: "0 auto var(--space-4)" }}>✓</span>
          <h2 style={{ marginTop: 0 }}>Your card is ready</h2>
          <p className="dashboard-subtitle">1 credit was deducted from your account.</p>
          <button className="btn btn-primary" onClick={handleDownload}>
            Download PDF
          </button>
        </div>
      )}
    </div>
  );
}
