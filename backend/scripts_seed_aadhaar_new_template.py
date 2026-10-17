"""
Fills the "Aadhaar Card New" template: front/back background artwork plus
every text / photo / QR / number element, positioned to match the approved
sample card and bound to customer data ({{name}}, {{dob}}, ...).

Run on the server from the backend folder (venv active):

    python scripts_seed_aadhaar_new_template.py                 # template named "Aadhaar Card New"
    python scripts_seed_aadhaar_new_template.py --template-id <id>

If no template with that name exists, one is created under the card type
whose name contains "aadhaar". Safe to re-run: it overwrites the template's
backgrounds and elements with the shipped design each time (so run it
BEFORE hand-editing the template in the designer, not after).
"""
import argparse
import json
import shutil
import uuid
from pathlib import Path

from app.config.settings import get_settings
from app.database import SessionLocal
from app.models.card_type import CardType
from app.models.template import Template
from app.utils.file_storage import delete_stored_file

ASSETS = Path(__file__).resolve().parent / "app" / "assets" / "templates"
DEFAULT_NAME = "Aadhaar Card New"


def _install_background(template_id: str, side: str, source: Path, previous: str | None) -> str:
    settings = get_settings()
    if previous:
        delete_stored_file(previous)
    subdir = Path("templates") / template_id / side
    target_dir = Path(settings.UPLOAD_DIR) / subdir
    target_dir.mkdir(parents=True, exist_ok=True)
    name = f"{uuid.uuid4().hex}{source.suffix}"
    shutil.copyfile(source, target_dir / name)
    return str(subdir / name)


def seed(template_id: str | None, name: str) -> None:
    elements = json.loads((ASSETS / "aadhaar_new_elements.json").read_text(encoding="utf-8"))
    db = SessionLocal()
    try:
        query = db.query(Template)
        template = query.filter(Template.id == template_id).first() if template_id else query.filter(Template.name == name).first()
        if template is None:
            if template_id:
                raise SystemExit(f"No template with id {template_id}")
            card_type = db.query(CardType).filter(CardType.name.ilike("%aadhaar%")).first()
            if card_type is None:
                raise SystemExit("No Aadhaar card type found — create the card type first.")
            template = Template(name=name, card_type_id=card_type.id)
            db.add(template)
            db.flush()
            print(f"Created template '{name}'")

        template.width_mm, template.height_mm, template.dpi = 85.60, 53.98, 300
        template.elements = elements["front"]
        template.back_elements = elements["back"]
        template.background_path = _install_background(
            template.id, "front", ASSETS / "aadhaar_new_front.png", template.background_path
        )
        template.back_background_path = _install_background(
            template.id, "back", ASSETS / "aadhaar_new_back.png", template.back_background_path
        )
        db.commit()
        print(f"Updated '{template.name}' ({template.id}): {len(template.elements)} front + {len(template.back_elements)} back elements.")
    finally:
        db.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--template-id")
    parser.add_argument("--name", default=DEFAULT_NAME)
    args = parser.parse_args()
    seed(args.template_id, args.name)
