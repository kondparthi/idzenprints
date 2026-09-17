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
    }
    for field in _UNRESOLVED_PLACEHOLDER_FIELDS:
        data[field] = document_number or "" if field in ("fsc_number", "employee_id", "student_id") else ""
    return data
