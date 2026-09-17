import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { createCustomer, getCustomer, updateCustomer } from "@/api/customers";
import { listDocuments } from "@/api/documents";
import { downloadCard, listGeneratedCards, regenerateCard } from "@/api/cards";
import { listCustomerDetailsForCustomer } from "@/api/customerDetails";
import { DOCUMENT_TYPE_LABELS, type CustomerDetails, type DocumentRecord } from "@/types/document";
import type { GeneratedCard } from "@/types/generatedCard";
import "./CustomerForm.css";

const STATUS_LABELS: Record<string, string> = {
  uploaded: "Uploaded",
  processing: "Processing…",
  processed: "Processed",
  failed: "Failed",
};

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

export default function CustomerForm() {
  const { id } = useParams();
  const isEditMode = Boolean(id);
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [isLoading, setIsLoading] = useState(isEditMode);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [generatedCards, setGeneratedCards] = useState<GeneratedCard[]>([]);
  const [extractedDetails, setExtractedDetails] = useState<CustomerDetails | null>(null);

  useEffect(() => {
    if (!id) return;
    getCustomer(id)
      .then((customer) => {
        setName(customer.name);
        setMobile(customer.mobile);
        setEmail(customer.email ?? "");
        setAddress(customer.address ?? "");
      })
      .finally(() => setIsLoading(false));
    listDocuments(id, 1, 50).then((result) => setDocuments(result.items));
    listGeneratedCards(id).then(setGeneratedCards);
    listCustomerDetailsForCustomer(id).then((all) => {
      const verified = all.find((d) => d.is_verified);
      setExtractedDetails(verified ?? all[0] ?? null);
    });
  }, [id]);

  async function handleRegenerate(cardId: string) {
    await regenerateCard(cardId);
    if (id) listGeneratedCards(id).then(setGeneratedCards);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const payload = { name, mobile, email: email || undefined, address: address || undefined };
      if (isEditMode && id) {
        await updateCustomer(id, payload);
      } else {
        await createCustomer(payload);
      }
      navigate("/customers");
    } catch {
      setError("Could not save this customer. Check the details and try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return <p className="empty-state">Loading customer…</p>;
  }

  return (
    <div className="customer-form-page">
      <h1>{isEditMode ? "Edit customer" : "Add customer"}</h1>

      <form className="card-panel customer-form" onSubmit={handleSubmit}>
        <div className="field">
          <label htmlFor="name">Name</label>
          <input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>

        <div className="field">
          <label htmlFor="mobile">Mobile</label>
          <input id="mobile" value={mobile} onChange={(e) => setMobile(e.target.value)} required />
        </div>

        <div className="field">
          <label htmlFor="email">Email (optional)</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div className="field">
          <label htmlFor="address">Address (optional)</label>
          <textarea
            id="address"
            rows={3}
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />
        </div>

        {error && <p className="error-text">{error}</p>}

        <div className="customer-form-actions">
          <button type="button" className="btn btn-secondary" onClick={() => navigate("/customers")}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
            {isSubmitting ? "Saving…" : "Save customer"}
          </button>
        </div>
      </form>

      {isEditMode && id && (
        <div className="customer-documents">
          <div className="customer-documents-header">
            <h2>Extracted details</h2>
            {extractedDetails && (
              <span className={"badge " + (extractedDetails.is_verified ? "badge-success" : "badge-warning")}>
                {extractedDetails.is_verified ? "Verified" : "Not yet verified"}
              </span>
            )}
          </div>

          {extractedDetails ? (
            <div className="card-panel extracted-details-summary">
              <dl className="extracted-details-list">
                {DETAIL_FIELDS.map((field) => (
                  <div key={field.key} className="extracted-details-row">
                    <dt>{field.label}</dt>
                    <dd>{(extractedDetails[field.key] as string) || "—"}</dd>
                  </div>
                ))}
              </dl>
              {extractedDetails.document_id && (
                <Link to={`/documents/${extractedDetails.document_id}`} className="btn-ghost-link">
                  {extractedDetails.is_verified ? "Edit extracted details" : "Review & verify details"}
                </Link>
              )}
            </div>
          ) : (
            <p className="empty-state">
              No document has been scanned for this customer yet — upload one below to extract details for the card.
            </p>
          )}
        </div>
      )}

      {isEditMode && id && (
        <div className="customer-documents">
          <div className="customer-documents-header">
            <h2>Documents</h2>
            <Link to={`/documents/upload?customer_id=${id}`} className="btn btn-secondary">
              Upload document
            </Link>
          </div>

          {documents.length === 0 ? (
            <p className="empty-state">No documents uploaded for this customer yet.</p>
          ) : (
            <ul className="customer-documents-list">
              {documents.map((doc) => (
                <li key={doc.id}>
                  <Link to={`/documents/${doc.id}`}>{doc.original_filename}</Link>
                  <span className="customer-documents-meta">
                    {DOCUMENT_TYPE_LABELS[doc.document_type]} · {STATUS_LABELS[doc.status]}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {isEditMode && id && (
        <div className="customer-documents">
          <div className="customer-documents-header">
            <h2>Generated cards</h2>
            <Link to={`/cards/new?customer_id=${id}`} className="btn btn-secondary">
              Generate card
            </Link>
          </div>

          {generatedCards.length === 0 ? (
            <p className="empty-state">No cards generated for this customer yet.</p>
          ) : (
            <ul className="customer-documents-list">
              {generatedCards.map((card) => (
                <li key={card.id}>
                  <span>{name || "Card"}</span>
                  <span className="customer-documents-meta customer-cards-actions">
                    {card.pdf_path && (
                      <button className="link-action" onClick={() => downloadCard(card.id, "pdf", name)}>
                        PDF
                      </button>
                    )}
                    {card.png_path && (
                      <button className="link-action" onClick={() => downloadCard(card.id, "png", name)}>
                        PNG
                      </button>
                    )}
                    {card.jpg_path && (
                      <button className="link-action" onClick={() => downloadCard(card.id, "jpg", name)}>
                        JPG
                      </button>
                    )}
                    <button className="link-action" onClick={() => handleRegenerate(card.id)}>
                      Regenerate
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
