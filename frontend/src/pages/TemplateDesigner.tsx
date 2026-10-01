import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  fetchTemplateBackgroundUrl,
  getTemplate,
  updateTemplate,
  uploadTemplateBackground,
  type TemplateSide,
} from "@/api/templates";
import CanvasElement from "@/designer/CanvasElement";
import Toolbar from "@/designer/Toolbar";
import PropertiesPanel from "@/designer/PropertiesPanel";
import { createDefaultElement, type DesignElement, type ElementType } from "@/designer/types";
import type { Template } from "@/types/template";
import "@/designer/designer.css";
import "./TemplateDesigner.css";

const BASE_PX_PER_MM = 4;

export default function TemplateDesigner() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [template, setTemplate] = useState<Template | null>(null);
  // Front and back are tracked as separate element lists/backgrounds —
  // same {{variable}} data, two independent layouts, switched with the
  // side tabs below. A template is front-only until an admin actually
  // adds something to the back.
  const [side, setSide] = useState<TemplateSide>("front");
  const [frontElements, setFrontElements] = useState<DesignElement[]>([]);
  const [backElements, setBackElements] = useState<DesignElement[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [frontBackgroundUrl, setFrontBackgroundUrl] = useState<string | null>(null);
  const [backBackgroundUrl, setBackBackgroundUrl] = useState<string | null>(null);
  const [zoom, setZoom] = useState(3);
  const [showGrid, setShowGrid] = useState(false);
  const [showSafeArea, setShowSafeArea] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const bgInputRef = useRef<HTMLInputElement>(null);

  const elements = side === "front" ? frontElements : backElements;
  const setElements = side === "front" ? setFrontElements : setBackElements;
  const backgroundUrl = side === "front" ? frontBackgroundUrl : backBackgroundUrl;

  useEffect(() => {
    if (!id) return;
    getTemplate(id).then((t) => {
      setTemplate(t);
      setFrontElements(t.elements);
      setBackElements(t.back_elements ?? []);
      if (t.background_path) {
        fetchTemplateBackgroundUrl(id, "front").then(setFrontBackgroundUrl);
      }
      if (t.back_background_path) {
        fetchTemplateBackgroundUrl(id, "back").then(setBackBackgroundUrl);
      }
    });
  }, [id]);

  const pxPerMm = BASE_PX_PER_MM * (zoom / 3);

  const handleAdd = useCallback(
    (type: ElementType) => {
      const maxZ = elements.reduce((max, el) => Math.max(max, el.zIndex), 0);
      const newElement = createDefaultElement(type, maxZ + 1);
      setElements((prev) => [...prev, newElement]);
      setSelectedId(newElement.id);
    },
    [elements, setElements]
  );

  const handleElementChange = useCallback(
    (elementId: string, patch: Partial<DesignElement>) => {
      setElements((prev) =>
        prev.map((el) => (el.id === elementId ? ({ ...el, ...patch } as DesignElement) : el))
      );
    },
    [setElements]
  );

  function handleDelete() {
    if (!selectedId) return;
    setElements((prev) => prev.filter((el) => el.id !== selectedId));
    setSelectedId(null);
  }

  function handleLayerMove(direction: "front" | "back") {
    if (!selectedId) return;
    const maxZ = Math.max(0, ...elements.map((el) => el.zIndex));
    const minZ = Math.min(0, ...elements.map((el) => el.zIndex));
    handleElementChange(selectedId, { zIndex: direction === "front" ? maxZ + 1 : minZ - 1 });
  }

  function handleSideChange(nextSide: TemplateSide) {
    setSide(nextSide);
    setSelectedId(null);
  }

  async function handleSave() {
    if (!id) return;
    setIsSaving(true);
    try {
      const updated = await updateTemplate(id, { elements: frontElements, back_elements: backElements });
      setTemplate(updated);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleBackgroundUpload(file: File) {
    if (!id) return;
    await uploadTemplateBackground(id, file, side);
    const url = await fetchTemplateBackgroundUrl(id, side);
    if (side === "front") setFrontBackgroundUrl(url);
    else setBackBackgroundUrl(url);
  }

  if (!template) {
    return <p className="empty-state">Loading template…</p>;
  }

  const selectedElement = elements.find((el) => el.id === selectedId) ?? null;
  const canvasWidthPx = template.width_mm * pxPerMm;
  const canvasHeightPx = template.height_mm * pxPerMm;
  const safeInsetPx = 2 * pxPerMm;

  return (
    <div className="template-designer-page">
      <div className="template-designer-header">
        <div>
          <h1>{template.name}</h1>
          <p className="document-meta">
            {template.width_mm}×{template.height_mm}mm @ {template.dpi}dpi
          </p>
        </div>
        <div className="template-designer-header-actions">
          <input
            ref={bgInputRef}
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleBackgroundUpload(file);
            }}
          />
          <button className="btn btn-secondary" onClick={() => bgInputRef.current?.click()}>
            Upload {side} background
          </button>
          <button className="btn btn-secondary" onClick={() => navigate("/templates")}>
            Back to templates
          </button>
          <button className="btn btn-primary" onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Saving…" : "Save template"}
          </button>
        </div>
      </div>

      <div className="template-side-tabs" role="tablist" aria-label="Card side">
        <button
          type="button"
          role="tab"
          aria-selected={side === "front"}
          className={"template-side-tab" + (side === "front" ? " is-active" : "")}
          onClick={() => handleSideChange("front")}
        >
          Front
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={side === "back"}
          className={"template-side-tab" + (side === "back" ? " is-active" : "")}
          onClick={() => handleSideChange("back")}
        >
          Back
          {(backElements.length > 0 || backBackgroundUrl) && <span className="template-side-tab-dot" />}
        </button>
        <span className="template-side-tabs-hint">
          Designing the {side} of the card — both sides share the same {"{{"}variable{"}}"} data.
        </span>
      </div>

      <Toolbar
        onAdd={handleAdd}
        zoom={zoom}
        onZoomChange={setZoom}
        showGrid={showGrid}
        onToggleGrid={() => setShowGrid((v) => !v)}
        showSafeArea={showSafeArea}
        onToggleSafeArea={() => setShowSafeArea((v) => !v)}
      />

      <div className="template-designer-body">
        <div className="template-canvas-wrapper" onMouseDown={() => setSelectedId(null)}>
          <div
            className="template-canvas"
            style={{
              width: canvasWidthPx,
              height: canvasHeightPx,
              backgroundImage: [
                backgroundUrl ? `url(${backgroundUrl})` : null,
                showGrid
                  ? `repeating-linear-gradient(0deg, rgba(0,0,0,0.06) 0, rgba(0,0,0,0.06) 1px, transparent 1px, transparent ${5 * pxPerMm}px), repeating-linear-gradient(90deg, rgba(0,0,0,0.06) 0, rgba(0,0,0,0.06) 1px, transparent 1px, transparent ${5 * pxPerMm}px)`
                  : null,
              ]
                .filter(Boolean)
                .join(", "),
              backgroundSize: "cover, auto, auto",
            }}
          >
            {showSafeArea && (
              <div
                className="template-safe-area"
                style={{ inset: safeInsetPx }}
              />
            )}
            {elements.map((element) => (
              <CanvasElement
                key={element.id}
                element={element}
                pxPerMm={pxPerMm}
                isSelected={element.id === selectedId}
                onSelect={() => setSelectedId(element.id)}
                onChange={(patch) => handleElementChange(element.id, patch)}
              />
            ))}
          </div>
        </div>

        <PropertiesPanel
          element={selectedElement}
          onChange={(patch) => selectedId && handleElementChange(selectedId, patch)}
          onDelete={handleDelete}
          onBringToFront={() => handleLayerMove("front")}
          onSendToBack={() => handleLayerMove("back")}
        />
      </div>
    </div>
  );
}
