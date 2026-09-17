import type { ElementType } from "./types";

const TOOLS: { type: ElementType; label: string }[] = [
  { type: "text", label: "Text" },
  { type: "image", label: "Image" },
  { type: "photo", label: "Photo" },
  { type: "logo", label: "Logo" },
  { type: "qrcode", label: "QR Code" },
  { type: "barcode", label: "Barcode" },
  { type: "rectangle", label: "Shape" },
];

interface ToolbarProps {
  onAdd: (type: ElementType) => void;
  zoom: number;
  onZoomChange: (zoom: number) => void;
  showGrid: boolean;
  onToggleGrid: () => void;
  showSafeArea: boolean;
  onToggleSafeArea: () => void;
}

export default function Toolbar({
  onAdd,
  zoom,
  onZoomChange,
  showGrid,
  onToggleGrid,
  showSafeArea,
  onToggleSafeArea,
}: ToolbarProps) {
  return (
    <div className="designer-toolbar">
      <div className="toolbar-group">
        {TOOLS.map((tool) => (
          <button key={tool.type} className="btn btn-secondary" onClick={() => onAdd(tool.type)}>
            + {tool.label}
          </button>
        ))}
      </div>

      <div className="toolbar-group toolbar-view-controls">
        <button className="btn btn-secondary" onClick={() => onZoomChange(Math.max(1, zoom - 0.5))}>
          −
        </button>
        <span className="toolbar-zoom-label">{Math.round(zoom * 100)}%</span>
        <button className="btn btn-secondary" onClick={() => onZoomChange(Math.min(6, zoom + 0.5))}>
          +
        </button>
        <label className="toolbar-checkbox">
          <input type="checkbox" checked={showGrid} onChange={onToggleGrid} />
          Grid
        </label>
        <label className="toolbar-checkbox">
          <input type="checkbox" checked={showSafeArea} onChange={onToggleSafeArea} />
          Safe area
        </label>
      </div>
    </div>
  );
}
