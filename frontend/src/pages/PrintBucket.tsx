import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { listBucket, printBucketSheet, removeFromBucket } from "@/api/printBucket";
import { getCardImageUrl } from "@/api/cards";
import type { PrintBucketItem } from "@/types/printBucket";
import { usePrintBucket } from "@/print-bucket/PrintBucketContext";
import "./PrintBucket.css";

export default function PrintBucket() {
  const { refresh: refreshBadge } = usePrintBucket();
  const [items, setItems] = useState<PrintBucketItem[]>([]);
  const [thumbs, setThumbs] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [paperSize, setPaperSize] = useState("a4");
  const [isLoading, setIsLoading] = useState(true);
  const [isPrinting, setIsPrinting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setIsLoading(true);
    try {
      const data = await listBucket();
      setItems(data);
      setSelected(new Set(data.map((i) => i.id)));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      for (const item of items) {
        if (thumbs[item.id]) continue;
        try {
          const url = await getCardImageUrl(item.generated_card_id, "front");
          if (!cancelled) setThumbs((prev) => ({ ...prev, [item.id]: url }));
        } catch {
          // Missing/undownloadable PNG — the row just shows no thumbnail.
        }
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected((prev) => (prev.size === items.length ? new Set() : new Set(items.map((i) => i.id))));
  }

  async function handleRemove(id: string) {
    await removeFromBucket(id);
    setItems((prev) => prev.filter((i) => i.id !== id));
    setSelected((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    refreshBadge();
  }

  async function handlePrint() {
    if (selected.size === 0) return;
    setError(null);
    setIsPrinting(true);
    try {
      // Keep the sheet's card order matching the list's order.
      const orderedIds = items.filter((i) => selected.has(i.id)).map((i) => i.id);
      await printBucketSheet(orderedIds, paperSize);
    } catch {
      setError("Couldn't build the print sheet. Try again.");
    } finally {
      setIsPrinting(false);
    }
  }

  const allSelected = items.length > 0 && selected.size === items.length;
  const sheetCount = Math.ceil(selected.size / 4);

  return (
    <div className="print-bucket-page">
      <h1>Print bucket</h1>
      <p className="field-hint">
        Cards queued up for batch printing. Select the ones you want, choose a paper size, and print — 4 cards
        (front row, back row below) per {paperSize.toUpperCase()} sheet.
      </p>

      {error && <p className="error-text">{error}</p>}

      {isLoading ? (
        <p className="field-hint">Loading…</p>
      ) : items.length === 0 ? (
        <div className="card-panel print-bucket-empty">
          <p>The bucket is empty.</p>
          <p className="field-hint">
            Generate a card and use "Add to bucket" to queue it up here.{" "}
            <Link to="/cards/new" className="btn-ghost-link">
              Go to Generate card
            </Link>
          </p>
        </div>
      ) : (
        <>
          <div className="card-panel print-bucket-toolbar">
            <label className="print-bucket-select-all">
              <input type="checkbox" checked={allSelected} onChange={toggleAll} />
              Select all ({items.length})
            </label>

            <div className="print-bucket-toolbar-right">
              <label className="print-bucket-paper-size">
                Paper size
                <select value={paperSize} onChange={(e) => setPaperSize(e.target.value)}>
                  <option value="a4">A4</option>
                </select>
              </label>
              <button className="btn btn-primary" onClick={handlePrint} disabled={selected.size === 0 || isPrinting}>
                {isPrinting
                  ? "Building PDF…"
                  : `Print ${selected.size} card${selected.size === 1 ? "" : "s"} (${sheetCount} sheet${sheetCount === 1 ? "" : "s"})`}
              </button>
            </div>
          </div>

          <div className="print-bucket-list">
            {items.map((item) => (
              <div key={item.id} className={"card-panel print-bucket-item" + (selected.has(item.id) ? " print-bucket-item-selected" : "")}>
                <input type="checkbox" checked={selected.has(item.id)} onChange={() => toggle(item.id)} />
                {thumbs[item.id] ? (
                  <img src={thumbs[item.id]} alt={`${item.customer_name} card`} className="print-bucket-thumb" />
                ) : (
                  <div className="print-bucket-thumb print-bucket-thumb-loading">…</div>
                )}
                <div className="print-bucket-meta">
                  <p className="print-bucket-customer">{item.customer_name}</p>
                  <p className="field-hint">
                    {item.template_name}
                    {item.has_back ? " · front & back" : " · front only"}
                  </p>
                </div>
                <button className="btn btn-secondary btn-sm" onClick={() => handleRemove(item.id)}>
                  Remove
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
