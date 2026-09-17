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
  is_active: boolean;
}

export interface TemplateInput {
  name: string;
  card_type_id: string;
  width_mm: number;
  height_mm: number;
  dpi: number;
  elements: DesignElement[];
}
