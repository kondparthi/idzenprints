import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  deleteDocument,
  fetchDocumentBackFileUrl,
  fetchDocumentFileUrl,
  getDocument,
  processDocument,
} from "@/api/documents";
import { listCustomerDetailsForCustomer, updateCustomerDetails } from "@/api/customerDetails";
import ConfirmDialog from "@/components/ConfirmDialog";
import { DOCUMENT_TYPE_LABELS, type CustomerDetails, type DocumentRecord } from "@/types/document";
import "./DocumentDetail.css";

const STATUS_LABELS: Record<string, string> = {
  uploaded: "Uploaded",
  processing: "Processing…",
  processed: "Processed",
  failed: "Failed",
};

export default function DocumentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [document, setDocument] = useState<DocumentRecord | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [backPreviewUrl, setBackPreviewUrl] = useState<string | null>(null);
  const [details, setDetails] = useState<CustomerDetails | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showRawText, setShowRawText] = useState(false);
  const [rawTextCopied, setRawTextCopied] = useState(false);

  async function loadDocument() {
    if (!id) return;
    const doc = await getDocument(id);
    setDocument(doc);

    const url = await fetchDocumentFileUrl(id);
    setPreviewUrl(url);

    if (doc.has_back) {
      const backUrl = await fetchDocumentBackFileUrl(id);
      setBackPreviewUrl(backUrl);
    }

    if (doc.status === "processed") {
      const allDetails = await listCustomerDetailsForCustomer(doc.customer_id);
      const matching = allDetails.find((d) => d.document_id === doc.id) ?? null;
      setDetails(matching);
    }
  }

  useEffect(() => {
    loadDocument();
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      if (backPreviewUrl) URL.revokeObjectURL(backPreviewUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function handleProcess() {
    if (!id) return;
    setIsProcessing(true);
    setError(null);
    try {
      const result = await processDocument(id);
      setDetails(result);
      const doc = await getDocument(id);
      setDocument(doc);
    } catch {
      setError("OCR processing failed. You can still fill in the details by hand below.");
      const doc = await getDocument(id);
      setDocument(doc);
    } finally {
      setIsProcessing(false);
    }
  }

  async function handleSaveDetails(markVerified: boolean) {
    if (!details) return;
    setIsSaving(true);
    try {
      const updated = await updateCustomerDetails(details.id, {
        name: details.name ?? undefined,
        name_local: details.name_local ?? undefined,
        dob: details.dob ?? undefined,
        gender: details.gender ?? undefined,
        address: details.address ?? undefined,
        address_local: details.address_local ?? undefined,
        document_number: details.document_number ?? undefined,
        vid_number: details.vid_number ?? undefined,
        issue_date: details.issue_date ?? undefined,
        details_as_on: details.details_as_on ?? undefined,
        fp_shop_no: details.fp_shop_no ?? undefined,
        village: details.village ?? undefined,
        mandal: details.mandal ?? undefined,
        district: details.district ?? undefined,
        is_verified: markVerified,
      });
      setDetails(updated);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeleteConfirmed() {
    if (!id) return;
    await deleteDocument(id);
    navigate("/customers");
  }

  if (!document) {
    return <p className="empty-state">Loading document…</p>;
  }

  return (
    <div className="document-detail-page">
      <div className="document-detail-header">
        <div>
          <h1>{document.original_filename}</h1>
          <p className="document-meta">
            {DOCUMENT_TYPE_LABELS[document.document_type]} · {(document.file_size / 1024).toFixed(0)} KB ·{" "}
            <span className={`status-badge status-${document.status}`}>
              {STATUS_LABELS[document.status]}
            </span>
          </p>
        </div>
        <button className="link-danger" onClick={() => setShowDeleteConfirm(true)}>
          Delete document
        </button>
      </div>

      <div className="document-detail-grid">
        <div className="card-panel document-preview">
          <div className="document-preview-sides">
            <div className="document-preview-side">
              {document.has_back && <span className="document-preview-label">Front</span>}
              {previewUrl && document.mime_type === "application/pdf" ? (
                <iframe title="Document front" src={previewUrl} className="document-preview-frame" />
              ) : previewUrl ? (
                <img src={previewUrl} alt="Document front" className="document-preview-image" />
              ) : (
                <p className="empty-state">Loading preview…</p>
              )}
            </div>

            {document.has_back && (
              <div className="document-preview-side">
                <span className="document-preview-label">Back</span>
                {backPreviewUrl && document.back_mime_type === "application/pdf" ? (
                  <iframe title="Document back" src={backPreviewUrl} className="document-preview-frame" />
                ) : backPreviewUrl ? (
                  <img src={backPreviewUrl} alt="Document back" className="document-preview-image" />
                ) : (
                  <p className="empty-state">Loading preview…</p>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="card-panel document-form">
          {document.status !== "processed" ? (
            <>
              <p>
                {document.status === "failed"
                  ? "OCR processing failed for this document. You can retry, or fill in the details by hand once you continue."
                  : "Run OCR to pull Name, DOB, Gender, Address, Document Number, and VID out of this file — in English and the regional script where present. You'll be able to correct anything it gets wrong."}
              </p>
              {document.processing_error && (
                <p className="error-text">{document.processing_error}</p>
              )}
              {error && <p className="error-text">{error}</p>}
              <button className="btn btn-primary" onClick={handleProcess} disabled={isProcessing}>
                {isProcessing ? "Processing…" : "Run OCR"}
              </button>
            </>
          ) : details ? (
            <>
              <h2>Extracted details</h2>
              <p className="document-form-hint">
                Correct anything OCR missed or got wrong before generating a card.
              </p>

              {document.ocr_raw_text && (
                <div className="raw-ocr-panel">
                  <button
                    type="button"
                    className="link-toggle"
                    onClick={() => setShowRawText((v) => !v)}
                  >
                    {showRawText ? "Hide" : "View"} raw OCR text
                  </button>
                  {showRawText && (
                    <div className="raw-ocr-box">
                      <div className="raw-ocr-box-actions">
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={async () => {
                            if (!document.ocr_raw_text) return;
                            await navigator.clipboard.writeText(document.ocr_raw_text);
                            setRawTextCopied(true);
                            window.setTimeout(() => setRawTextCopied(false), 1500);
                          }}
                        >
                          {rawTextCopied ? "Copied!" : "Copy"}
                        </button>
                      </div>
                      <pre className="raw-ocr-text">{document.ocr_raw_text}</pre>
                    </div>
                  )}
                </div>
              )}

              {document.document_type === "fsc" ? (
                <>
                  <div className="field">
                    <label htmlFor="headOfFamily">Head of the Family</label>
                    <input
                      id="headOfFamily"
                      value={details.name ?? ""}
                      onChange={(e) => setDetails({ ...details, name: e.target.value })}
                    />
                  </div>

                  <div className="field">
                    <label htmlFor="rationCardNo">Ration Card No.</label>
                    <input
                      id="rationCardNo"
                      value={details.document_number ?? ""}
                      onChange={(e) => setDetails({ ...details, document_number: e.target.value })}
                    />
                  </div>

                  <div className="field">
                    <label htmlFor="fpShopNo">FP Shop No.</label>
                    <input
                      id="fpShopNo"
                      value={details.fp_shop_no ?? ""}
                      onChange={(e) => setDetails({ ...details, fp_shop_no: e.target.value })}
                    />
                  </div>

                  <div className="field">
                    <label htmlFor="village">Village</label>
                    <input
                      id="village"
                      value={details.village ?? ""}
                      onChange={(e) => setDetails({ ...details, village: e.target.value })}
                    />
                  </div>

                  <div className="field">
                    <label htmlFor="mandal">Mandal</label>
                    <input
                      id="mandal"
                      value={details.mandal ?? ""}
                      onChange={(e) => setDetails({ ...details, mandal: e.target.value })}
                    />
                  </div>

                  <div className="field">
                    <label htmlFor="district">District</label>
                    <input
                      id="district"
                      value={details.district ?? ""}
                      onChange={(e) => setDetails({ ...details, district: e.target.value })}
                    />
                  </div>

                  <div className="field">
                    <label htmlFor="residentialAddress">Residential Address</label>
                    <textarea
                      id="residentialAddress"
                      rows={3}
                      value={details.address ?? ""}
                      onChange={(e) => setDetails({ ...details, address: e.target.value })}
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className="field">
                    <label htmlFor="name">Name</label>
                    <input
                      id="name"
                      value={details.name ?? ""}
                      onChange={(e) => setDetails({ ...details, name: e.target.value })}
                    />
                  </div>

                  <div className="field">
                    <label htmlFor="nameLocal">Name (regional script)</label>
                    <input
                      id="nameLocal"
                      value={details.name_local ?? ""}
                      onChange={(e) => setDetails({ ...details, name_local: e.target.value })}
                    />
                  </div>

                  <div className="field">
                    <label htmlFor="dob">Date of birth</label>
                    <input
                      id="dob"
                      placeholder="DD/MM/YYYY"
                      value={details.dob ?? ""}
                      onChange={(e) => setDetails({ ...details, dob: e.target.value })}
                    />
                  </div>

                  <div className="field">
                    <label htmlFor="gender">Gender</label>
                    <input
                      id="gender"
                      value={details.gender ?? ""}
                      onChange={(e) => setDetails({ ...details, gender: e.target.value })}
                    />
                  </div>

                  <div className="field">
                    <label htmlFor="documentNumber">Document number</label>
                    <input
                      id="documentNumber"
                      value={details.document_number ?? ""}
                      onChange={(e) => setDetails({ ...details, document_number: e.target.value })}
                    />
                  </div>

                  <div className="field">
                    <label htmlFor="vidNumber">VID number</label>
                    <input
                      id="vidNumber"
                      value={details.vid_number ?? ""}
                      onChange={(e) => setDetails({ ...details, vid_number: e.target.value })}
                    />
                  </div>

                  <div className="field">
                    <label htmlFor="issueDate">Aadhaar no. issued</label>
                    <input
                      id="issueDate"
                      placeholder="DD/MM/YYYY"
                      value={details.issue_date ?? ""}
                      onChange={(e) => setDetails({ ...details, issue_date: e.target.value })}
                    />
                  </div>

                  <div className="field">
                    <label htmlFor="detailsAsOn">Details as on</label>
                    <input
                      id="detailsAsOn"
                      placeholder="DD/MM/YYYY"
                      value={details.details_as_on ?? ""}
                      onChange={(e) => setDetails({ ...details, details_as_on: e.target.value })}
                    />
                  </div>

                  <div className="field">
                    <label htmlFor="address">Address</label>
                    <textarea
                      id="address"
                      rows={3}
                      value={details.address ?? ""}
                      onChange={(e) => setDetails({ ...details, address: e.target.value })}
                    />
                  </div>

                  <div className="field">
                    <label htmlFor="addressLocal">Address (regional script)</label>
                    <textarea
                      id="addressLocal"
                      rows={3}
                      value={details.address_local ?? ""}
                      onChange={(e) => setDetails({ ...details, address_local: e.target.value })}
                    />
                  </div>
                </>
              )}

              {details.is_verified && <p className="verified-note">Verified — ready for card generation.</p>}

              <div className="document-form-actions">
                <button
                  className="btn btn-secondary"
                  onClick={() => handleSaveDetails(false)}
                  disabled={isSaving}
                >
                  Save draft
                </button>
                <button
                  className="btn btn-primary"
                  onClick={() => handleSaveDetails(true)}
                  disabled={isSaving}
                >
                  {isSaving ? "Saving…" : "Save & mark verified"}
                </button>
              </div>
            </>
          ) : (
            <p className="empty-state">No extracted details found for this document.</p>
          )}
        </div>
      </div>

      {showDeleteConfirm && (
        <ConfirmDialog
          title="Delete document"
          message="Delete this document and its file? This cannot be undone."
          confirmLabel="Delete"
          onConfirm={handleDeleteConfirmed}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      )}
    </div>
  );
}
