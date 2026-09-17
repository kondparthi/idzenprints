import type { ChangeEvent } from "react";
import type { DesignElement } from "./types";
import VariablePicker from "./VariablePicker";

interface PropertiesPanelProps {
  element: DesignElement | null;
  onChange: (patch: Partial<DesignElement>) => void;
  onDelete: () => void;
  onBringToFront: () => void;
  onSendToBack: () => void;
}

export default function PropertiesPanel({
  element,
  onChange,
  onDelete,
  onBringToFront,
  onSendToBack,
}: PropertiesPanelProps) {
  if (!element) {
    return (
      <div className="properties-panel card-panel">
        <p className="empty-state">Select an element to edit its properties.</p>
      </div>
    );
  }

  function handleImageUpload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => onChange({ imagePath: reader.result as string } as Partial<DesignElement>);
    reader.readAsDataURL(file);
  }

  return (
    <div className="properties-panel card-panel">
      <div className="properties-header">
        <h3>{element.type[0].toUpperCase() + element.type.slice(1)}</h3>
        <button className="link-danger" onClick={onDelete}>
          Delete
        </button>
      </div>

      <div className="field-row">
        <div className="field">
          <label>X (mm)</label>
          <input
            type="number"
            value={Math.round(element.x * 10) / 10}
            onChange={(e) => onChange({ x: Number(e.target.value) })}
          />
        </div>
        <div className="field">
          <label>Y (mm)</label>
          <input
            type="number"
            value={Math.round(element.y * 10) / 10}
            onChange={(e) => onChange({ y: Number(e.target.value) })}
          />
        </div>
      </div>

      <div className="field-row">
        <div className="field">
          <label>Width (mm)</label>
          <input
            type="number"
            value={Math.round(element.width * 10) / 10}
            onChange={(e) => onChange({ width: Number(e.target.value) })}
          />
        </div>
        <div className="field">
          <label>Height (mm)</label>
          <input
            type="number"
            value={Math.round(element.height * 10) / 10}
            onChange={(e) => onChange({ height: Number(e.target.value) })}
          />
        </div>
      </div>

      <div className="field">
        <label>Rotation (°)</label>
        <input
          type="number"
          value={Math.round(element.rotation)}
          onChange={(e) => onChange({ rotation: Number(e.target.value) })}
        />
      </div>

      {element.type === "text" && (
        <>
          <div className="field">
            <label>Text</label>
            <textarea
              rows={2}
              value={element.text}
              onChange={(e) => onChange({ text: e.target.value } as Partial<DesignElement>)}
            />
          </div>
          <VariablePicker onInsert={(token) => onChange({ text: element.text + token } as Partial<DesignElement>)} />

          <div className="field">
            <label>Font family</label>
            <select
              value={element.fontFamily}
              onChange={(e) => onChange({ fontFamily: e.target.value } as Partial<DesignElement>)}
            >
              <option value="Arial">Arial</option>
              <option value="Georgia">Georgia</option>
              <option value="Courier New">Courier New</option>
              <option value="Verdana">Verdana</option>
            </select>
          </div>

          <div className="field-row">
            <div className="field">
              <label>Font size (mm)</label>
              <input
                type="number"
                step="0.5"
                value={element.fontSize}
                onChange={(e) => onChange({ fontSize: Number(e.target.value) } as Partial<DesignElement>)}
              />
            </div>
            <div className="field">
              <label>Align</label>
              <select
                value={element.align}
                onChange={(e) => onChange({ align: e.target.value } as Partial<DesignElement>)}
              >
                <option value="left">Left</option>
                <option value="center">Center</option>
                <option value="right">Right</option>
              </select>
            </div>
          </div>

          <div className="field-row">
            <label className="toolbar-checkbox">
              <input
                type="checkbox"
                checked={element.bold}
                onChange={(e) => onChange({ bold: e.target.checked } as Partial<DesignElement>)}
              />
              Bold
            </label>
            <label className="toolbar-checkbox">
              <input
                type="checkbox"
                checked={element.italic}
                onChange={(e) => onChange({ italic: e.target.checked } as Partial<DesignElement>)}
              />
              Italic
            </label>
          </div>

          <div className="field-row">
            <div className="field">
              <label>Letter spacing (mm)</label>
              <input
                type="number"
                step="0.1"
                value={element.letterSpacing}
                onChange={(e) => onChange({ letterSpacing: Number(e.target.value) } as Partial<DesignElement>)}
              />
            </div>
            <div className="field">
              <label>Line height</label>
              <input
                type="number"
                step="0.1"
                value={element.lineHeight}
                onChange={(e) => onChange({ lineHeight: Number(e.target.value) } as Partial<DesignElement>)}
              />
            </div>
          </div>

          <div className="field">
            <label>Color</label>
            <input
              type="color"
              value={element.color}
              onChange={(e) => onChange({ color: e.target.value } as Partial<DesignElement>)}
            />
          </div>
        </>
      )}

      {(element.type === "image" || element.type === "photo" || element.type === "logo") && (
        <div className="field">
          <label>{element.type === "photo" ? "Photo" : element.type === "logo" ? "Logo" : "Image"}</label>
          <input type="file" accept="image/*" onChange={handleImageUpload} />
          <p className="field-hint">
            {element.type === "photo"
              ? "Placeholder image — the customer's actual photo is substituted in at card generation (Phase 4)."
              : "Upload an image to preview it in this template."}
          </p>
        </div>
      )}

      {(element.type === "qrcode" || element.type === "barcode") && (
        <>
          <div className="field">
            <label>Value</label>
            <input
              value={element.value}
              onChange={(e) => onChange({ value: e.target.value } as Partial<DesignElement>)}
            />
          </div>
          <VariablePicker onInsert={(token) => onChange({ value: element.value + token } as Partial<DesignElement>)} />
        </>
      )}

      {element.type === "rectangle" && (
        <div className="field-row">
          <div className="field">
            <label>Fill</label>
            <input
              type="color"
              value={element.fill}
              onChange={(e) => onChange({ fill: e.target.value } as Partial<DesignElement>)}
            />
          </div>
          <div className="field">
            <label>Border</label>
            <input
              type="color"
              value={element.stroke}
              onChange={(e) => onChange({ stroke: e.target.value } as Partial<DesignElement>)}
            />
          </div>
        </div>
      )}

      <div className="field-row properties-layer-actions">
        <button className="btn btn-secondary" onClick={onBringToFront}>
          Bring to front
        </button>
        <button className="btn btn-secondary" onClick={onSendToBack}>
          Send to back
        </button>
      </div>
    </div>
  );
}
