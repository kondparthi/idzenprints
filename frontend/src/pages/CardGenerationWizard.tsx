import { useEffect, useState } from "react";
import { listActiveCardTypes } from "@/api/public";
import {
  uploadDocument,
  processDocument,
  listTemplatesForCardType,
  previewCard,
  generateCard,
  triggerCardDownload,
} from "@/api/memberCards";
import type { DocumentType } from "@/types/document";
import { templateHasBackSide, type Template } from "@/types/template";
import type { GeneratedCard } from "@/types/generatedCard";
import { Link } from "react-router-dom";
import { memberPrintBucketApi } from "@/api/memberPrint";
import "./CardGenerationWizard.css";

interface CardGenerationWizardProps {
  documentType: DocumentType;
  cardTypeName: string;
  title: string;
}

const STEPS = ["Upload file", "Select theme", "Preview", "Generate"];

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

  // Step 3: theme
  const [templates, setTemplates] = useState<Template[]>([]);
  const [templateId, setTemplateId] = useState<string | null>(null);

  // Step 4: preview — back preview only exists when the chosen theme has
  // a back design (templateHasBackSide); otherwise this stays null and
  // the UI just shows the front.
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [backPreviewUrl, setBackPreviewUrl] = useState<string | null>(null);

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
      await processDocument(docId, pdfPassword || undefined);
      setNeedsPassword(false);
      if (cardTypeId) {
        const list = await listTemplatesForCardType(cardTypeId);
        setTemplates(list);
        if (list.length > 0) setTemplateId(list[0].id);
      }
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

  async function handleShowPreview() {
    if (!documentId || !templateId) return;
    setIsBusy(true);
    setError(null);
    try {
      const selectedTemplate = templates.find((t) => t.id === templateId);
      const hasBack = selectedTemplate ? templateHasBackSide(selectedTemplate) : false;
      const [url, backUrl] = await Promise.all([
        previewCard(documentId, templateId, "front"),
        hasBack ? previewCard(documentId, templateId, "back") : Promise.resolve(null),
      ]);
      setPreviewUrl(url);
      setBackPreviewUrl(backUrl);
      setStep(2);
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
      setStep(3);
      window.dispatchEvent(new Event("idzen:credits-changed"));
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      const message = typeof detail === "object" ? detail?.message : detail;
      setError(message || "Couldn't generate that card.");
    } finally {
      setIsBusy(false);
    }
  }

  const [bucketState, setBucketState] = useState<"idle" | "adding" | "added">("idle");
  const [bucketError, setBucketError] = useState<string | null>(null);

  async function handleAddToBucket() {
    if (!card || !memberPrintBucketApi.addToBucket) return;
    setBucketError(null);
    setBucketState("adding");
    try {
      await memberPrintBucketApi.addToBucket(card.id);
      setBucketState("added");
    } catch (err) {
      setBucketState("idle");
      setBucketError(
        err instanceof Error && err.name === "ApiMessageError"
          ? err.message
          : "Couldn't add this card to your print bucket."
      );
    }
  }

  async function handleDownload() {
    if (!card) return;
    // The PDF already has both pages (front, then back) when the theme
    // has a back design — a single file is what gets printed.
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
            {isBusy ? "Uploading & reading…" : needsPassword ? "Try again" : "Upload & read"}
          </button>
        </div>
      )}

      {step === 1 && (
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

      {step === 2 && previewUrl && (
        <div className="card-panel wizard-panel">
          <h2 style={{ marginTop: 0 }}>Preview</h2>
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
          <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
            <button className="btn btn-secondary" onClick={() => setStep(1)}>
              Back to themes
            </button>
            <button className="btn btn-primary" disabled={isBusy} onClick={handleGenerate}>
              {isBusy ? "Generating…" : "Generate card"}
            </button>
          </div>
        </div>
      )}

      {step === 3 && card && (
        <div className="card-panel wizard-panel wizard-panel-success">
          <span className="section-placeholder-icon" style={{ margin: "0 auto var(--space-4)" }}>✓</span>
          <h2 style={{ marginTop: 0 }}>Your card is ready</h2>
          <p className="dashboard-subtitle">
            1 credit was deducted from your account.
            {card.back_png_path && " Your PDF includes both the front and back of the card."}
          </p>
          <button className="btn btn-primary" onClick={handleDownload}>
            Download PDF
          </button>{" "}
          {bucketState === "added" ? (
            <Link to="/member/print-bucket" className="btn btn-secondary">
              Added — open Print bucket
            </Link>
          ) : (
            <button className="btn btn-secondary" onClick={handleAddToBucket} disabled={bucketState === "adding"}>
              {bucketState === "adding" ? "Adding…" : "Add to print bucket"}
            </button>
          )}
          {bucketError && <p className="error-text">{bucketError}</p>}
        </div>
      )}
    </div>
  );
}
