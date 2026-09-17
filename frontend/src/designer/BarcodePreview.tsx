import { useEffect, useRef } from "react";
import JsBarcode from "jsbarcode";

export default function BarcodePreview({ value }: { value: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    try {
      JsBarcode(canvasRef.current, value || " ", {
        format: "CODE128",
        displayValue: false,
        margin: 0,
        height: 60,
      });
    } catch {
      // An unencodable placeholder token (e.g. "{{document_number}}") is expected
      // at design time — the real value is substituted in at generation time.
    }
  }, [value]);

  return <canvas ref={canvasRef} className="canvas-barcode" />;
}
