export interface GeneratedCard {
  id: string;
  customer_id: string;
  template_id: string;
  order_id: string | null;
  pdf_path: string | null;
  png_path: string | null;
  jpg_path: string | null;
  back_png_path: string | null;
  back_jpg_path: string | null;
}
