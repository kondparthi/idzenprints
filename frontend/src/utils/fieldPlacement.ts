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

/**
 * Powers the "convert this box to an image, then drag it onto the card to
 * lock it in" QC workflow. Unlike findFieldBoxes (which looks up boxes by
 * a single {{field}} token, and can return several boxes for one field),
 * this groups the other way: one row per template element — since a text
 * box can combine several fields in one block (e.g. "{{name}}\n{{name_local}}"),
 * the box, and the snapshot image rendered for it, are always whole-element.
 */
export interface DraggableElementBox extends FieldBox {
  elementId: string;
}

export function findDraggableElements(elements: DesignElement[], detailKeys: string[]): DraggableElementBox[] {
  const boxes: DraggableElementBox[] = [];
  for (const el of elements) {
    let text = "";
    if (el.type === "text") text = el.text;
    else if (el.type === "qrcode" || el.type === "barcode") text = el.value;
    else continue;

    const matches = detailKeys.some((key) => text.includes(`{{${key}}}`));
    if (matches) {
      boxes.push({ elementId: el.id, x: el.x, y: el.y, width: el.width, height: el.height });
    }
  }
  return boxes;
}
