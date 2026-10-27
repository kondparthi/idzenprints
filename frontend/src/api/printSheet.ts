import { apiClient } from "./client";

export interface PrintSheetOptions {
  layout: string;
  side: "both" | "front" | "back";
  border: boolean;
  mirror: boolean;
  gap_mm: number;
  dx_mm: number;
  dy_mm: number;
  zoom: number;
  rotation: number;
  copies: number;
}

export interface PrintLayoutInfo {
  id: string;
  label: string;
  maxCopies: number;
  sides: boolean; // lets the operator choose front / back
  paper: string;
  guide: [string, string][];
}

export const PRINT_LAYOUTS: PrintLayoutInfo[] = [
  {
    id: "a4_5_cards", label: "A4 sheet — 5 cards (front + back)", maxCopies: 5, sides: false, paper: "210 × 297 mm",
    guide: [["Paper size", "A4"], ["Borderless", "OFF (better alignment)"], ["Media type", "Plain or photo paper"], ["Quality", "Standard or High"], ["Scaling", "Actual size (100%) — critical"], ["Orientation", "Portrait"]],
  },
  {
    id: "a4_10_duplex", label: "A4 sheet — 10 cards duplex (page 1 fronts, page 2 backs)", maxCopies: 10, sides: false, paper: "210 × 297 mm",
    guide: [["Paper size", "A4"], ["Borderless", "OFF"], ["Duplex", "Print page 1, flip on the LONG edge, print page 2"], ["Scaling", "Actual size (100%) — critical"], ["Orientation", "Portrait"]],
  },
  {
    id: "4x6_single", label: "10 × 15 cm (4 × 6 in)", maxCopies: 1, sides: true, paper: "101.6 × 152.4 mm",
    guide: [["Paper size", "4 × 6 in (10 × 15 cm) / 4R"], ["Borderless", "OFF (important for alignment)"], ["Media type", "Premium glossy"], ["Quality", "High / Best"], ["Scaling", "Actual size (no scaling)"]],
  },
  {
    id: "4x6_both_side", label: "10 × 15 cm (4 × 6 in) — both side print", maxCopies: 2, sides: false, paper: "101.6 × 152.4 mm",
    guide: [["Paper size", "4 × 6 in (10 × 15 cm) / 4R"], ["Borderless", "OFF"], ["Duplex mode", "Manual — print page 1, turn the paper over like a book page, print page 2"], ["Scaling", "Actual size (no scaling)"], ["Tip", "Use X / Y nudge on the back page to fix any flip offset"]],
  },
  {
    id: "pvc_tray", label: "PVC tray (Epson L8050)", maxCopies: 2, sides: true, paper: "297 × 210 mm",
    guide: [["Paper size", "A4"], ["Borderless", "ON"], ["Media type", "CD/DVD or PVC tray"], ["Quality", "High"], ["Scaling", "Actual size (100%)"], ["Orientation", "Landscape"], ["Tray", "Insert the PVC tray into the printer's tray slot. Print the front, then the back."]],
  },
  {
    id: "back_tray", label: "Back tray PVC card", maxCopies: 1, sides: true, paper: "101.6 × 152.4 mm",
    guide: [["Paper size", "4 × 6 in (10 × 15 cm) / 4R"], ["Paper source", "Rear paper feed / back tray"], ["Borderless", "ON"], ["Media type", "Premium glossy"], ["Scaling", "Actual size — critical"], ["Orientation", "Portrait"], ["Feeding tip", "Place the PVC card firmly in the 4×6 tray carrier and feed from the rear."]],
  },
];

export const DEFAULT_PRINT_OPTIONS: PrintSheetOptions = {
  layout: "a4_5_cards", side: "both", border: false, mirror: false,
  gap_mm: 4, dx_mm: 0, dy_mm: 0, zoom: 100, rotation: 0, copies: 1,
};

export async function previewPrintSheet(cardId: string, options: PrintSheetOptions): Promise<string[]> {
  const { data } = await apiClient.post<{ pages: string[] }>(`/cards/${cardId}/print-sheet/preview`, options);
  return data.pages;
}

export async function downloadPrintSheet(cardId: string, options: PrintSheetOptions, filename: string): Promise<void> {
  const response = await apiClient.post(`/cards/${cardId}/print-sheet/pdf`, options, { responseType: "blob" });
  const url = URL.createObjectURL(response.data as Blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}.pdf`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

/** Opens the PDF in a new tab so the browser's print dialog can be used. */
export async function openPrintSheet(cardId: string, options: PrintSheetOptions): Promise<void> {
  const response = await apiClient.post(`/cards/${cardId}/print-sheet/pdf`, options, { responseType: "blob" });
  window.open(URL.createObjectURL(response.data as Blob), "_blank");
}
