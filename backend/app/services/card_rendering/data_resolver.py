"""
Maps a Customer (+ optional verified CustomerDetails) to the dynamic
variable names used in template text/QR/barcode fields.

fsc_number/employee_id/student_id/company/designation aren't collected by
any module yet (customer_details only has one generic document_number,
and there's no staff/student intake form) — they resolve to an empty
string until a later phase adds that data entry. Every other listed
variable in the original spec resolves from real data.
"""
from typing import Optional

from app.models.customer import Customer
from app.models.customer_details import CustomerDetails

_UNRESOLVED_PLACEHOLDER_FIELDS = ("fsc_number", "employee_id", "student_id", "company", "designation")


_GENDER_BILINGUAL = {
    "male": "పురుషుడు/ MALE",
    "female": "స్త్రీ/ FEMALE",
    "transgender": "ట్రాన్స్‌జెండర్/ TRANSGENDER",
}


def _grouped(digits: str, size: int = 4) -> str:
    """'793402216977' -> '7934 0221 6977' (Aadhaar / VID print layout)."""
    compact = "".join((digits or "").split())
    if not compact.isdigit():
        return digits or ""
    return " ".join(compact[i : i + size] for i in range(0, len(compact), size))


def resolve_card_variables(customer: Customer, details: Optional[CustomerDetails]) -> dict[str, str]:
    document_number = details.document_number if details else None
    data = {
        "name": (details.name if details and details.name else customer.name) or "",
        "name_local": (details.name_local if details else "") or "",
        "dob": (details.dob if details else "") or "",
        "gender": (details.gender if details else "") or "",
        "address": (details.address if details and details.address else customer.address) or "",
        "address_local": (details.address_local if details else "") or "",
        "mobile": customer.mobile or "",
        "document_number": document_number or "",
        "vid_number": (details.vid_number if details else "") or "",
        "document_number_spaced": _grouped(document_number or ""),
        "vid_number_spaced": _grouped((details.vid_number if details else "") or ""),
        "gender_bilingual": _GENDER_BILINGUAL.get(((details.gender if details else "") or "").strip().lower(), (details.gender if details else "") or ""),
        "issue_date": (details.issue_date if details else "") or "",
        "details_as_on": (details.details_as_on if details else "") or "",
        "fp_shop_no": (details.fp_shop_no if details else "") or "",
        "village": (details.village if details else "") or "",
        "mandal": (details.mandal if details else "") or "",
        "district": (details.district if details else "") or "",
    }
    for field in _UNRESOLVED_PLACEHOLDER_FIELDS:
        data[field] = document_number or "" if field in ("fsc_number", "employee_id", "student_id") else ""
    return data
