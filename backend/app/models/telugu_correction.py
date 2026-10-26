"""
TeluguCorrection — a word an operator corrected after the automatic
English -> Telugu conversion ("tharun" -> "తరుణ్"). Applied automatically
the next time the same word shows up, so the converter improves with use.
One row per lowercase English word.
"""
from sqlalchemy import Column, Integer, String

from app.database import Base
from app.models.mixins import TimestampMixin, uuid_column


class TeluguCorrection(Base, TimestampMixin):
    __tablename__ = "telugu_corrections"

    id = uuid_column()
    english_word = Column(String(120), nullable=False, unique=True, index=True)
    telugu_word = Column(String(240), nullable=False)
    times_used = Column(Integer, nullable=False, default=1)
