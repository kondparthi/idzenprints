export type DocumentType = "aadhaar" | "fsc" | "employee_id" | "student_id" | "other";
export type DocumentStatus = "uploaded" | "processing" | "processed" | "failed";

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  aadhaar: "Aadhaar",
  fsc: "FSC / Ration Card",
  employee_id: "Employee ID",
  student_id: "Student ID",
  other: "Other",
};

export interface DocumentRecord {
  id: string;
  customer_id: string;
  document_type: DocumentType;
  status: DocumentStatus;
  original_filename: string;
  mime_type: string | null;
  file_size: number;
  has_back: boolean;
  back_mime_type: string | null;
  processing_error: string | null;
}

export interface CustomerDetails {
  id: string;
  customer_id: string;
  document_id: string | null;
  name: string | null;
  name_local: string | null;
  dob: string | null;
  gender: string | null;
  address: string | null;
  address_local: string | null;
  document_number: string | null;
  vid_number: string | null;
  issue_date: string | null;
  details_as_on: string | null;
  photo_path: string | null;
  is_verified: boolean;
}

export interface CustomerDetailsInput {
  name?: string;
  name_local?: string;
  dob?: string;
  gender?: string;
  address?: string;
  address_local?: string;
  document_number?: string;
  vid_number?: string;
  issue_date?: string;
  details_as_on?: string;
  is_verified?: boolean;
}
