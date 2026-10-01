import type { DesignElement } from "@/designer/types";

export interface Template {
  id: string;
  name: string;
  card_type_id: string;
  width_mm: number;
  height_mm: number;
  dpi: number;
  background_path: string | null;
  elements: DesignElement[];
  // Back side is optional — empty elements + no background means this
  // template is still front-only (most existing templates).
  back_background_path: string | null;
  back_elements: DesignElement[];
  is_active: boolean;
}

export interface TemplateInput {
  name: string;
  card_type_id: string;
  width_mm: number;
  height_mm: number;
  dpi: number;
  elements: DesignElement[];
  back_elements: DesignElement[];
}

export function templateHasBackSide(template: Pick<Template, "back_background_path" | "back_elements">): boolean {
  return Boolean(template.back_background_path) || template.back_elements.length > 0;
}
