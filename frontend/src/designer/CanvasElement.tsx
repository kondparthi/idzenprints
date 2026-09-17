import { useCallback, useRef } from "react";
import QRCode from "react-qr-code";
import type { DesignElement } from "./types";
import BarcodePreview from "./BarcodePreview";
import "./designer.css";

interface CanvasElementProps {
  element: DesignElement;
  pxPerMm: number;
  isSelected: boolean;
  onSelect: () => void;
  onChange: (patch: Partial<DesignElement>) => void;
}

export default function CanvasElement({ element, pxPerMm, isSelected, onSelect, onChange }: CanvasElementProps) {
  const dragState = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);
  const resizeState = useRef<{ startX: number; startY: number; origW: number; origH: number } | null>(null);
  const rotateState = useRef<{ centerX: number; centerY: number; startAngle: number; origRotation: number } | null>(
    null
  );

  const startDrag = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onSelect();
      dragState.current = { startX: e.clientX, startY: e.clientY, origX: element.x, origY: element.y };

      function onMove(moveEvent: MouseEvent) {
        if (!dragState.current) return;
        const dxMm = (moveEvent.clientX - dragState.current.startX) / pxPerMm;
        const dyMm = (moveEvent.clientY - dragState.current.startY) / pxPerMm;
        onChange({ x: dragState.current.origX + dxMm, y: dragState.current.origY + dyMm });
      }
      function onUp() {
        dragState.current = null;
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
      }
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    },
    [element.x, element.y, onChange, onSelect, pxPerMm]
  );

  const startResize = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      resizeState.current = { startX: e.clientX, startY: e.clientY, origW: element.width, origH: element.height };

      function onMove(moveEvent: MouseEvent) {
        if (!resizeState.current) return;
        const dwMm = (moveEvent.clientX - resizeState.current.startX) / pxPerMm;
        const dhMm = (moveEvent.clientY - resizeState.current.startY) / pxPerMm;
        onChange({
          width: Math.max(4, resizeState.current.origW + dwMm),
          height: Math.max(4, resizeState.current.origH + dhMm),
        });
      }
      function onUp() {
        resizeState.current = null;
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
      }
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    },
    [element.width, element.height, onChange, pxPerMm]
  );

  const startRotate = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      const target = (e.target as HTMLElement).closest(".canvas-element") as HTMLElement;
      const rect = target.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const startAngle = Math.atan2(e.clientY - centerY, e.clientX - centerX);
      rotateState.current = { centerX, centerY, startAngle, origRotation: element.rotation };

      function onMove(moveEvent: MouseEvent) {
        if (!rotateState.current) return;
        const angle = Math.atan2(
          moveEvent.clientY - rotateState.current.centerY,
          moveEvent.clientX - rotateState.current.centerX
        );
        const deltaDeg = ((angle - rotateState.current.startAngle) * 180) / Math.PI;
        onChange({ rotation: Math.round(rotateState.current.origRotation + deltaDeg) });
      }
      function onUp() {
        rotateState.current = null;
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
      }
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    },
    [element.rotation, onChange]
  );

  const style: React.CSSProperties = {
    position: "absolute",
    left: element.x * pxPerMm,
    top: element.y * pxPerMm,
    width: element.width * pxPerMm,
    height: element.height * pxPerMm,
    transform: `rotate(${element.rotation}deg)`,
    zIndex: element.zIndex,
  };

  return (
    <div
      className={"canvas-element" + (isSelected ? " selected" : "")}
      style={style}
      onMouseDown={startDrag}
    >
      {renderContent(element)}
      {isSelected && (
        <>
          <div className="handle handle-resize" onMouseDown={startResize} />
          <div className="handle handle-rotate" onMouseDown={startRotate} />
        </>
      )}
    </div>
  );
}

function renderContent(element: DesignElement) {
  switch (element.type) {
    case "text":
      return (
        <div
          className="canvas-text"
          style={{
            fontFamily: element.fontFamily,
            fontSize: `${element.fontSize}mm`,
            fontWeight: element.bold ? 700 : 400,
            fontStyle: element.italic ? "italic" : "normal",
            textAlign: element.align,
            letterSpacing: `${element.letterSpacing}mm`,
            lineHeight: element.lineHeight,
            color: element.color,
          }}
        >
          {element.text}
        </div>
      );
    case "image":
    case "photo":
    case "logo":
      return element.imagePath ? (
        <img src={element.imagePath} alt="" className="canvas-image" style={{ objectFit: element.objectFit }} />
      ) : (
        <div className="canvas-placeholder">{element.type === "photo" ? "Photo" : element.type === "logo" ? "Logo" : "Image"}</div>
      );
    case "qrcode":
      return (
        <div className="canvas-qr">
          <QRCode value={element.value || " "} size={256} style={{ width: "100%", height: "100%" }} />
        </div>
      );
    case "barcode":
      return <BarcodePreview value={element.value} />;
    case "rectangle":
      return <div className="canvas-rect" style={{ background: element.fill, borderColor: element.stroke }} />;
  }
}
