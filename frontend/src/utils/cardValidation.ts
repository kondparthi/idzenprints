/**
 * Checks the details read from an Aadhaar (or similar) document before a
 * card is made. OCR misreads digits and dates often, and a wrong number on
 * a printed PVC card is expensive — so each rule says exactly what's wrong.
 *
 * level "error" blocks the next step; "warn" lets the operator continue.
 */
import type { CustomerDetails } from "@/types/document";

export type ValidationLevel = "ok" | "warn" | "error";
export interface ValidationResult {
  field: string;
  label: string;
  level: ValidationLevel;
  message: string;
}

// Verhoeff checksum — the last digit of every real Aadhaar number.
const D = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], [1, 2, 3, 4, 0, 6, 7, 8, 9, 5], [2, 3, 4, 0, 1, 7, 8, 9, 5, 6],
  [3, 4, 0, 1, 2, 8, 9, 5, 6, 7], [4, 0, 1, 2, 3, 9, 5, 6, 7, 8], [5, 9, 8, 7, 6, 0, 4, 3, 2, 1],
  [6, 5, 9, 8, 7, 1, 0, 4, 3, 2], [7, 6, 5, 9, 8, 2, 1, 0, 4, 3], [8, 7, 6, 5, 9, 3, 2, 1, 0, 4],
  [9, 8, 7, 6, 5, 4, 3, 2, 1, 0],
];
const P = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], [1, 5, 7, 6, 2, 8, 3, 0, 9, 4], [5, 8, 0, 3, 7, 9, 6, 1, 4, 2],
  [8, 9, 1, 6, 0, 4, 3, 5, 2, 7], [9, 4, 5, 3, 1, 2, 6, 8, 7, 0], [4, 2, 8, 6, 5, 7, 3, 9, 0, 1],
  [2, 7, 9, 3, 8, 0, 6, 4, 1, 5], [7, 0, 4, 6, 9, 1, 3, 2, 5, 8],
];

export function verhoeffValid(digits: string): boolean {
  let c = 0;
  const reversed = digits.split("").reverse();
  for (let i = 0; i < reversed.length; i++) c = D[c][P[i % 8][Number(reversed[i])]];
  return c === 0;
}

function parseDate(value: string): Date | null {
  const m = value.trim().match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/);
  if (!m) return null;
  const [d, mo, y] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const date = new Date(y, mo - 1, d);
  return date.getFullYear() === y && date.getMonth() === mo - 1 && date.getDate() === d ? date : null;
}

const GENDERS = ["male", "female", "transgender", "other"];

export function validateAadhaarDetails(details: Partial<CustomerDetails>): ValidationResult[] {
  const out: ValidationResult[] = [];
  const add = (field: string, label: string, level: ValidationLevel, message: string) =>
    out.push({ field, label, level, message });

  const name = (details.name ?? "").trim();
  if (!name) add("name", "Name", "error", "Name is empty.");
  else if (/[^A-Za-z .'\-]/.test(name)) add("name", "Name", "warn", "Name has digits or symbols — check the spelling.");
  else add("name", "Name", "ok", "Looks fine.");

  if (!(details.name_local ?? "").trim()) add("name_local", "Name (Telugu)", "error", "Telugu name is empty — use Convert to Telugu.");
  else add("name_local", "Name (Telugu)", "ok", "Present.");

  const dobText = (details.dob ?? "").trim();
  const dob = parseDate(dobText);
  if (!dobText) add("dob", "Date of birth", "error", "Date of birth is empty.");
  else if (/^\d{4}$/.test(dobText)) add("dob", "Date of birth", "warn", "Only a year was read — Aadhaar normally shows dd/mm/yyyy.");
  else if (!dob) add("dob", "Date of birth", "error", "Not a valid date — use dd/mm/yyyy.");
  else if (dob > new Date() || dob.getFullYear() < 1900) add("dob", "Date of birth", "error", "Date is outside a believable range.");
  else add("dob", "Date of birth", "ok", "Valid date.");

  const gender = (details.gender ?? "").trim().toLowerCase();
  if (!gender) add("gender", "Gender", "error", "Gender is empty.");
  else if (!GENDERS.includes(gender)) add("gender", "Gender", "error", "Use Male, Female or Transgender.");
  else add("gender", "Gender", "ok", "Valid.");

  const number = (details.document_number ?? "").replace(/\s/g, "");
  if (!number) add("document_number", "Aadhaar number", "error", "Aadhaar number is empty.");
  else if (!/^\d{12}$/.test(number)) add("document_number", "Aadhaar number", "error", `Must be 12 digits (found ${number.length}).`);
  else if (number[0] === "0" || number[0] === "1") add("document_number", "Aadhaar number", "error", "An Aadhaar number never starts with 0 or 1.");
  else if (!verhoeffValid(number)) add("document_number", "Aadhaar number", "error", "Checksum fails — one digit was probably misread.");
  else add("document_number", "Aadhaar number", "ok", "12 digits, checksum correct.");

  const vid = (details.vid_number ?? "").replace(/\s/g, "");
  if (!vid) add("vid_number", "VID", "warn", "VID not found — the back of the card will have no VID line.");
  else if (!/^\d{16}$/.test(vid)) add("vid_number", "VID", "warn", `VID should be 16 digits (found ${vid.length}).`);
  else add("vid_number", "VID", "ok", "16 digits.");

  const address = (details.address ?? "").trim();
  if (!address) add("address", "Address", "error", "Address is empty.");
  else if (!/\b\d{6}\b/.test(address)) add("address", "Address", "warn", "No 6-digit PIN code found in the address.");
  else add("address", "Address", "ok", "Has a PIN code.");

  if (!(details.address_local ?? "").trim()) add("address_local", "Address (Telugu)", "error", "Telugu address is empty — use Convert to Telugu.");
  else add("address_local", "Address (Telugu)", "ok", "Present.");

  for (const [field, label] of [["issue_date", "Aadhaar no. issued"], ["details_as_on", "Details as on"]] as const) {
    const v = (details[field] ?? "").trim();
    if (!v) add(field, label, "warn", "Not found — that line will be blank on the card.");
    else if (!parseDate(v)) add(field, label, "warn", "Not a valid dd/mm/yyyy date.");
    else add(field, label, "ok", "Valid date.");
  }
  return out;
}
