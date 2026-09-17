import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { listCustomers } from "@/api/customers";
import { uploadDocument } from "@/api/documents";
import FileDropzone from "@/components/FileDropzone";
import { DOCUMENT_TYPE_LABELS, type DocumentType } from "@/types/document";
import type { Customer } from "@/types/customer";
import "./DocumentUpload.css";

const DOCUMENT_TYPES = Object.keys(DOCUMENT_TYPE_LABELS) as DocumentType[];

export default function DocumentUpload() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [customerId, setCustomerId] = useState(searchParams.get("customer_id") ?? "");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [documentType, setDocumentType] = useState<DocumentType>("aadhaar");
  const [file, setFile] = useState<File | null>(null);
  const [backFile, setBackFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listCustomers("", 1, 100).then((result) => setCustomers(result.items));
  }, []);

  async function handleSubmit() {
    if (!customerId || !file) {
      setError("Choose a customer and a file before uploading.");
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      const document = await uploadDocument(customerId, documentType, file, backFile);
      navigate(`/documents/${document.id}`);
    } catch {
      setError("Upload failed. Check the file and try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="upload-page">
      <h1>Upload document</h1>

      <div className="card-panel upload-form">
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
          <label htmlFor="documentType">Document type</label>
          <select
            id="documentType"
            value={documentType}
            onChange={(e) => setDocumentType(e.target.value as DocumentType)}
          >
            {DOCUMENT_TYPES.map((type) => (
              <option key={type} value={type}>
                {DOCUMENT_TYPE_LABELS[type]}
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <label>Front side {documentType === "aadhaar" ? "(required)" : ""}</label>
          <FileDropzone accept=".jpg,.jpeg,.png,.pdf" selectedFile={file} onFileSelected={setFile} />
        </div>

        <div className="field">
          <label>Back side (optional)</label>
          <p className="upload-hint">
            For Aadhaar, the address is usually only printed on the back — add it here so it gets picked up too.
          </p>
          <FileDropzone accept=".jpg,.jpeg,.png,.pdf" selectedFile={backFile} onFileSelected={setBackFile} />
        </div>

        {error && <p className="error-text">{error}</p>}

        <div className="upload-actions">
          <button className="btn btn-secondary" onClick={() => navigate("/customers")}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "Uploading…" : "Upload"}
          </button>
        </div>
      </div>
    </div>
  );
}
