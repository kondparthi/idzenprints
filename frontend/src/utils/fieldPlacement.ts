import type { DesignElement } from "@/designer/types";

/**
 * Powers the "drag a field onto the card to confirm it's in the right
 * place" check on the staff Generate-card page. A template's text/qrcode/
 * barcode elements already carry {{variable}} tokens and an x/y/width/
 * height box in mm (see designer/types.ts) — this just looks up which
 * box(es), if any, a given extracted-details field actually renders into
 * on a given side of the card.
 */
export interface FieldBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function findFieldBoxes(elements: DesignElement[], key: string): FieldBox[] {
  const token = `{{${key}}}`;
  const boxes: FieldBox[] = [];
  for (const el of elements) {
    let matches = false;
    if (el.type === "text") {
      matches = el.text.includes(token);
    } else if (el.type === "qrcode" || el.type === "barcode") {
      matches = el.value.includes(token);
    }
    if (matches) {
      boxes.push({ x: el.x, y: el.y, width: el.width, height: el.height });
    }
  }
  return boxes;
}

/** padMm gives a little slack around a (sometimes tightly-sized) element
 * box, since asking someone to pixel-perfectly hit a text box's exact
 * edges on a small card preview would make this frustrating rather than
 * useful. */
export function isPointInBoxes(boxes: FieldBox[], xMm: number, yMm: number, padMm = 2): boolean {
  return boxes.some(
    (b) => xMm >= b.x - padMm && xMm <= b.x + b.width + padMm && yMm >= b.y - padMm && yMm <= b.y + b.height + padMm
  );
}
