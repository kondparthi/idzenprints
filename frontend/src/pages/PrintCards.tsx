import { useEffect, useState, type FormEvent } from "react";
import { listCardTypes } from "@/api/cardTypes";
import {
  createUploadedCard,
  deleteUploadedCard,
  getUploadedCardImageUrl,
  listUploadedCards,
  printUploadedCardSheet,
} from "@/api/uploadedCards";
import type { CardType } from "@/types/cardType";
import type { UploadedCard } from "@/types/uploadedCard";
import "./PrintCards.css";

const PAPER_SIZES = [
  { value: "a4", label: "A4" },
  { value: "a3", label: "A3" },
  { value: "letter", label: "Letter" },
];

export default function PrintCards() {
  const [cardTypes, setCardTypes] = useState<CardType[]>([]);
  const [cardTypeId, setCardTypeId] = useState("");

  const [library, setLibrary] = useState<UploadedCard[]>([]);
  const [thumbs, setThumbs] = useState<Record<string, string>>({});
  const [isLoadingLibrary, setIsLoadingLibrary] = useState(false);

  const [showUploadForm, setShowUploadForm] = useState(false);
  const [uploadName, setUploadName] = useState("");
  const [frontFile, setFrontFile] = useState<File | null>(null);
  const [backFile, setBackFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const [copies, setCopies] = useState<Record<string, number>>({});
  const [paperSize, setPaperSize] = useState("a4");
  const [isPrinting, setIsPrinting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listCardTypes().then((types) => {
      setCardTypes(types);
      if (types.length > 0) setCardTypeId((prev) => prev || types[0].id);
    });
  }, []);

  useEffect(() => {
    if (!cardTypeId) {
      setLibrary([]);
      return;
    }
    setIsLoadingLibrary(true);
    listUploadedCards(cardTypeId)
      .then(setLibrary)
      .finally(() => setIsLoadingLibrary(false));
  }, [cardTypeId]);

  // Fetch a front thumbnail for every library card that doesn't have one
  // yet — mirrors the Print bucket page's thumbnail loading.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      for (const card of library) {
        if (thumbs[card.id]) continue;
        try {
          const url = await getUploadedCardImageUrl(card.id, "front");
          if (!cancelled) setThumbs((prev) => ({ ...prev, [card.id]: url }));
        } catch {
          // Missing/undownloadable image — the row just shows no thumbnail.
        }
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [library]);

  function selectedCardTypeName(): string {
    return cardTypes.find((ct) => ct.id === cardTypeId)?.name ?? "";
  }

  async function handleUpload(event: FormEvent) {
    event.preventDefault();
    if (!cardTypeId || !frontFile) {
      setError("Choose a card type and a front image first.");
      return;
    }
    setError(null);
    setIsUploading(true);
    try {
      const name = uploadName.trim() || selectedCardTypeName();
      const created = await createUploadedCard(cardTypeId, name, frontFile, backFile);
      setLibrary((prev) => [created, ...prev]);
      setUploadName("");
      setFrontFile(null);
      setBackFile(null);
      setShowUploadForm(false);
    } catch {
      setError("Couldn't upload that card. Check the files and try again.");
    } finally {
      setIsUploading(false);
    }
  }

  async function handleDelete(id: string) {
    await deleteUploadedCard(id);
    setLibrary((prev) => prev.filter((c) => c.id !== id));
    setCopies((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }

  function setCardCopies(id: string, value: number) {
    const clamped = Math.max(0, Math.min(100, Math.round(value) || 0));
    setCopies((prev) => ({ ...prev, [id]: clamped }));
  }

  const queued = library.filter((c) => (copies[c.id] ?? 0) > 0);
  const totalCards = queued.reduce((sum, c) => sum + (copies[c.id] ?? 0), 0);

  async function handlePrint() {
    if (queued.length === 0) return;
    setError(null);
    setIsPrinting(true);
    try {
      await printUploadedCardSheet(
        queued.map((c) => ({ uploaded_card_id: c.id, copies: copies[c.id] ?? 0 })),
        paperSize
      );
    } catch {
      setError("Couldn't build the print sheet. Try again.");
    } finally {
      setIsPrinting(false);
    }
  }

  return (
    <div className="print-cards-page">
      <h1>Print cards</h1>
      <p className="field-hint">
        For cards that are already fully designed as images (Aadhaar, Ration Card, PAN Card, …) — upload the
        front/back once per card type, then print any combination of them onto an A4/A3 sheet, front and back
        side by side, auto-arranged to fit.
      </p>

      {error && <p className="error-text">{error}</p>}

      <div className="card-panel print-cards-toolbar">
        <div className="field">
          <label htmlFor="cardType">Card type</label>
          <select id="cardType" value={cardTypeId} onChange={(e) => setCardTypeId(e.target.value)}>
            {cardTypes.length === 0 && <option value="">No card types yet</option>}
            {cardTypes.map((ct) => (
              <option key={ct.id} value={ct.id}>
                {ct.name}
              </option>
            ))}
          </select>
        </div>
        <button className="btn btn-secondary" onClick={() => setShowUploadForm((v) => !v)} disabled={!cardTypeId}>
          {showUploadForm ? "Cancel" : "+ Upload card design"}
        </button>
      </div>

      {showUploadForm && (
        <form className="card-panel print-cards-upload-form" onSubmit={handleUpload}>
          <div className="field">
            <label htmlFor="uploadName">Name (optional)</label>
            <input
              id="uploadName"
              value={uploadName}
              placeholder={selectedCardTypeName()}
              onChange={(e) => setUploadName(e.target.value)}
            />
          </div>
          <div className="field-row">
            <div className="field">
              <label htmlFor="frontFile">Front image</label>
              <input
                id="frontFile"
                type="file"
                accept="image/png,image/jpeg"
                onChange={(e) => setFrontFile(e.target.files?.[0] ?? null)}
                required
              />
            </div>
            <div className="field">
              <label htmlFor="backFile">Back image (optional)</label>
              <input
                id="backFile"
                type="file"
                accept="image/png,image/jpeg"
                onChange={(e) => setBackFile(e.target.files?.[0] ?? null)}
              />
            </div>
          </div>
          <div className="card-generate-actions">
            <button type="submit" className="btn btn-primary" disabled={isUploading || !frontFile}>
              {isUploading ? "Uploading…" : "Save to library"}
            </button>
          </div>
        </form>
      )}

      {isLoadingLibrary ? (
        <p className="field-hint">Loading…</p>
      ) : library.length === 0 ? (
        <div className="card-panel print-cards-empty">
          <p>No card designs uploaded for {selectedCardTypeName() || "this card type"} yet.</p>
          <p className="field-hint">Use "+ Upload card design" above to add one.</p>
        </div>
      ) : (
        <>
          <div className="print-cards-list">
            {library.map((card) => (
              <div key={card.id} className={"card-panel print-cards-item" + ((copies[card.id] ?? 0) > 0 ? " print-cards-item-selected" : "")}>
                {thumbs[card.id] ? (
                  <img src={thumbs[card.id]} alt={card.name} className="print-cards-thumb" />
                ) : (
                  <div className="print-cards-thumb print-cards-thumb-loading">…</div>
                )}
                <div className="print-cards-meta">
                  <p className="print-cards-name">{card.name}</p>
                  <p className="field-hint">{card.has_back ? "front & back" : "front only"}</p>
                </div>
                <label className="print-cards-copies">
                  Copies
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={copies[card.id] ?? 0}
                    onChange={(e) => setCardCopies(card.id, Number(e.target.value))}
                  />
                </label>
                <button className="btn btn-secondary btn-sm" onClick={() => handleDelete(card.id)}>
                  Delete
                </button>
              </div>
            ))}
          </div>

          <div className="card-panel print-cards-print-bar">
            <label className="print-cards-paper-size">
              Paper size
              <select value={paperSize} onChange={(e) => setPaperSize(e.target.value)}>
                {PAPER_SIZES.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </label>
            <button className="btn btn-primary" onClick={handlePrint} disabled={totalCards === 0 || isPrinting}>
              {isPrinting ? "Building PDF…" : `Print ${totalCards} card${totalCards === 1 ? "" : "s"}`}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
