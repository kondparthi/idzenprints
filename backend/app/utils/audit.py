"""
Append-only audit logging. Call record() after a mutation succeeds —
never before, so a failed operation doesn't leave a misleading log entry.

Instrumented on: login, order create/status-update, card generation,
customer create/update/delete, document delete. That's the
business/security-relevant surface for Phase 5, not literally every
write — extend the call sites below as new sensitive actions are added.
"""
import json
from typing import Any, Optional

from sqlalchemy.orm import Session

from app.models.audit_log import AuditLog


def record(
    db: Session,
    user_id: Optional[str],
    action: str,
    entity_type: str,
    entity_id: Optional[str] = None,
    details: Optional[dict[str, Any]] = None,
) -> None:
    entry = AuditLog(
        user_id=user_id,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        details=json.dumps(details) if details else None,
    )
    db.add(entry)
    db.commit()
