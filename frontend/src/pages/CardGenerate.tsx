import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { listCustomers } from "@/api/customers";
import { listCardTypes } from "@/api/cardTypes";
import { listTemplates } from "@/api/templates";
import { downloadCard, generateCard, previewCard } from "@/api/cards";
import { listCustomerDetailsForCustomer } from "@/api/customerDetails";
import type { Customer } from "@/types/customer";
import type { CardType } from "@/types/cardType";
import type { Template } from "@/types/template";
import type { GeneratedCard } from "@/types/generatedCard";
import type { CustomerDetails } from "@/types/document";
import "./CardGenerate.css";

const DETAIL_FIELDS: { key: keyof CustomerDetails; label: string }[] = [
  { key: "name", label: "Name" },
  { key: "name_local", label: "Name (regional script)" },
  { key: "dob", label: "Date of birth" },
  { key: "gender", label: "Gender" },
  { key: "document_number", label: "Document number" },
  { key: "vid_number", label: "VID number" },
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
  const [generatedCard, setGeneratedCard] = useState<GeneratedCard | null>(null);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    setGeneratedCard(null);
  }, [cardTypeId]);

  // The step the app was missing: show what OCR extracted (and whether an
  // operator has verified it) for the selected customer, so it's visible
  // *before* generating a card, not just substituted invisibly at render time.
  useEffect(() => {
    setExtractedDetails(null);
    setHasCheckedDetails(false);
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

  async function handlePreview() {
    if (!customerId || !templateId) {
      setError("Choose a customer and a template first.");
      return;
    }
    setError(null);
    setIsPreviewing(true);
    try {
      const url = await previewCard(customerId, templateId);
      setPreviewUrl(url);
    } catch {
      setError("Couldn't render a preview. Make sure the customer has verified details.");
    } finally {
      setIsPreviewing(false);
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
              <button className="btn btn-primary" onClick={handleGenerate} disabled={isGenerating}>
                {isGenerating ? "Generating…" : "Generate card"}
              </button>
            </div>

            {generatedCard && (
              <div className="card-generate-downloads">
                <p className="verified-note">Generated — download below.</p>
                <div className="card-generate-actions">
                  <button className="btn btn-secondary" onClick={() => downloadCard(generatedCard.id, "pdf", customerName())}>
                    Download PDF
                  </button>
                  <button className="btn btn-secondary" onClick={() => downloadCard(generatedCard.id, "png", customerName())}>
                    Download PNG
                  </button>
                  <button className="btn btn-secondary" onClick={() => downloadCard(generatedCard.id, "jpg", customerName())}>
                    Download JPG
                  </button>
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
                    {DETAIL_FIELDS.map((field) => (
                      <div key={field.key} className="extracted-details-row">
                        <dt>{field.label}</dt>
                        <dd>{(extractedDetails[field.key] as string) || "—"}</dd>
                      </div>
                    ))}
                  </dl>
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
            <img src={previewUrl} alt="Card preview" className="card-preview-image" />
          ) : (
            <p className="empty-state">Choose a customer and template, then click Preview.</p>
          )}
        </div>
      </div>
    </div>
  );
}
