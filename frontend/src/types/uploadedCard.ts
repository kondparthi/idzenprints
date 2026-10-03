export interface UploadedCard {
  id: string;
  card_type_id: string;
  name: string;
  has_back: boolean;
  width_mm: number;
  height_mm: number;
}

export interface PrintSheetItem {
  uploaded_card_id: string;
  copies: number;
}
