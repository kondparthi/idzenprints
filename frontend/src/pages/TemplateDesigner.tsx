import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  fetchTemplateBackgroundUrl,
  getTemplate,
  updateTemplate,
  uploadTemplateBackground,
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
  const [elements, setElements] = useState<DesignElement[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [backgroundUrl, setBackgroundUrl] = useState<string | null>(null);
  const [zoom, setZoom] = useState(3);
  const [showGrid, setShowGrid] = useState(false);
  const [showSafeArea, setShowSafeArea] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const bgInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!id) return;
    getTemplate(id).then((t) => {
      setTemplate(t);
      setElements(t.elements);
      if (t.background_path) {
        fetchTemplateBackgroundUrl(id).then(setBackgroundUrl);
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
    [elements]
  );

  const handleElementChange = useCallback((elementId: string, patch: Partial<DesignElement>) => {
    setElements((prev) =>
      prev.map((el) => (el.id === elementId ? ({ ...el, ...patch } as DesignElement) : el))
    );
  }, []);

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

  async function handleSave() {
    if (!id) return;
    setIsSaving(true);
    try {
      const updated = await updateTemplate(id, { elements });
      setTemplate(updated);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleBackgroundUpload(file: File) {
    if (!id) return;
    await uploadTemplateBackground(id, file);
    const url = await fetchTemplateBackgroundUrl(id);
    setBackgroundUrl(url);
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
            Upload background
          </button>
          <button className="btn btn-secondary" onClick={() => navigate("/templates")}>
            Back to templates
          </button>
          <button className="btn btn-primary" onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Saving…" : "Save template"}
          </button>
        </div>
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
