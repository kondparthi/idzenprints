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

// Fields every card type can use — resolved from the generic
// CustomerDetails columns (see backend data_resolver.py).
export const COMMON_DETAIL_VARIABLES = [
  "{{name}}",
  "{{name_local}}",
  "{{dob}}",
  "{{gender}}",
  "{{address}}",
  "{{address_local}}",
  "{{mobile}}",
  "{{photo}}",
  "{{document_number}}",
  "{{document_number_spaced}}", // 7934 0221 6977
  "{{vid_number}}",
  "{{vid_number_spaced}}", // 9148 4885 7537 3615
  "{{gender_bilingual}}", // స్త్రీ/ FEMALE
  "{{issue_date}}",
  "{{details_as_on}}",
] as const;

// FSC / Ration Card only — these were added to CustomerDetails (and
// resolve_card_variables) alongside the ration-card OCR work, but were
// missing from this picker, so a Ration Card template had no way to bind
// Village/Mandal/District/FP Shop No. to real data.
export const RATION_CARD_VARIABLES = ["{{fp_shop_no}}", "{{village}}", "{{mandal}}", "{{district}}"] as const;

// Other card types' placeholders (employee/student id cards etc.) — these
// still resolve to an empty string or a document_number fallback until a
// later phase collects that data; see data_resolver.py.
export const OTHER_PLACEHOLDER_VARIABLES = [
  "{{fsc_number}}",
  "{{employee_id}}",
  "{{student_id}}",
  "{{company}}",
  "{{designation}}",
] as const;

// The full set — used as a fallback when the template's card type isn't
// known or doesn't match a recognized kind below, so nothing is ever
// hidden outright.
export const DYNAMIC_VARIABLES = [
  ...COMMON_DETAIL_VARIABLES,
  ...RATION_CARD_VARIABLES,
  ...OTHER_PLACEHOLDER_VARIABLES,
] as const;

/** Narrows the variable list shown in "Insert variable" to the ones that
 * actually apply to this card type, based on its (free-text, admin-set)
 * name. CardType has no structural link to a document/field schema, so
 * this is necessarily a keyword match — falls back to the full list for
 * anything that doesn't match a recognized kind, so nothing is ever
 * hidden outright. */
export function variablesForCardType(cardTypeName: string | null | undefined): readonly string[] {
  const name = (cardTypeName ?? "").toLowerCase();
  if (name.includes("ration") || name.includes("fsc")) {
    return [...COMMON_DETAIL_VARIABLES, ...RATION_CARD_VARIABLES];
  }
  if (name.includes("employee")) {
    return [...COMMON_DETAIL_VARIABLES, "{{employee_id}}", "{{company}}", "{{designation}}"];
  }
  if (name.includes("student")) {
    return [...COMMON_DETAIL_VARIABLES, "{{student_id}}"];
  }
  if (name.includes("aadhaar")) {
    return COMMON_DETAIL_VARIABLES;
  }
  return DYNAMIC_VARIABLES;
}

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
