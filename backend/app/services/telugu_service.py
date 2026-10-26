"""DB-backed layer over telugu_transliteration: loads the learned
corrections, converts, and records new corrections."""
from sqlalchemy.orm import Session

from app.models.telugu_correction import TeluguCorrection
from app.services.telugu_transliteration import convert_text, learn_pairs


class TeluguService:
    def __init__(self, db: Session):
        self.db = db

    def _corrections(self) -> dict[str, str]:
        return {c.english_word: c.telugu_word for c in self.db.query(TeluguCorrection).all()}

    def convert(self, text: str | None) -> str:
        if not text or not text.strip():
            return ""
        return convert_text(text, self._corrections())[0]

    def learn(self, english: str | None, edited_telugu: str | None) -> int:
        """Remembers every word the operator changed. Returns how many."""
        if not english or not edited_telugu:
            return 0
        corrections = self._corrections()
        learned = learn_pairs(english, edited_telugu, corrections)
        for word, telugu in learned.items():
            row = self.db.query(TeluguCorrection).filter(TeluguCorrection.english_word == word).first()
            if row:
                row.telugu_word = telugu
                row.times_used += 1
            else:
                self.db.add(TeluguCorrection(english_word=word, telugu_word=telugu))
        if learned:
            self.db.commit()
        return len(learned)
