/**
 * Design-element shapes stored in Template.elements (JSON on the backend).
 * x/y/width/height are in mm, relative to the card's top-left corner —
 * mm keeps the layout DPI-independent; the canvas converts to on-screen
 * pixels using a zoom factor, and Phase 4's generator converts to the
 * template's configured DPI.
 */
export type ElementType = "text" | "image" | "photo" | "logo" | "qrcode" | "barcode" | "rectangle";

interface BaseElement {
  id: string;
  type: ElementType;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  zIndex: number;
}

export interface TextElement extends BaseElement {
  type: "text";
  text: string;
  fontFamily: string;
  fontSize: number;
  bold: boolean;
  italic: boolean;
  align: "left" | "center" | "right";
  letterSpacing: number;
  lineHeight: number;
  color: string;
}

export interface ImageElement extends BaseElement {
  type: "image" | "photo" | "logo";
  imagePath: string | null;
  objectFit: "cover" | "contain";
}

export interface QRCodeElement extends BaseElement {
  type: "qrcode";
  value: string;
}

export interface BarcodeElement extends BaseElement {
  type: "barcode";
  value: string;
}

export interface RectangleElement extends BaseElement {
  type: "rectangle";
  fill: string;
  stroke: string;
}

export type DesignElement = TextElement | ImageElement | QRCodeElement | BarcodeElement | RectangleElement;

export const DYNAMIC_VARIABLES = [
  "{{name}}",
  "{{name_local}}",
  "{{dob}}",
  "{{gender}}",
  "{{address}}",
  "{{address_local}}",
  "{{mobile}}",
  "{{photo}}",
  "{{document_number}}",
  "{{vid_number}}",
  "{{fsc_number}}",
  "{{employee_id}}",
  "{{student_id}}",
  "{{company}}",
  "{{designation}}",
] as const;

let nextId = 1;
export function generateElementId(): string {
  return `el_${Date.now()}_${nextId++}`;
}

export function createDefaultElement(type: ElementType, zIndex: number): DesignElement {
  const base = { id: generateElementId(), x: 10, y: 10, width: 30, height: 10, rotation: 0, zIndex };
  switch (type) {
    case "text":
      return {
        ...base,
        type: "text",
        text: "{{name}}",
        fontFamily: "Arial",
        fontSize: 4,
        bold: false,
        italic: false,
        align: "left",
        letterSpacing: 0,
        lineHeight: 1.2,
        color: "#1c1b19",
        width: 50,
        height: 8,
      };
    case "image":
    case "photo":
    case "logo":
      return { ...base, type, imagePath: null, objectFit: "cover", width: 20, height: 20 };
    case "qrcode":
      return { ...base, type: "qrcode", value: "{{document_number}}", width: 15, height: 15 };
    case "barcode":
      return { ...base, type: "barcode", value: "{{document_number}}", width: 30, height: 10 };
    case "rectangle":
      return { ...base, type: "rectangle", fill: "#f7f5f0", stroke: "#e2ddd2", width: 30, height: 15 };
  }
}
