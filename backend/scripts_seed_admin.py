"""
One-time helper to create the first Super Admin user.
Run with: python scripts_seed_admin.py
"""
from app.database import SessionLocal
from app.models.user import User, UserRole
from app.utils.security import hash_password


def seed():
    db = SessionLocal()
    try:
        existing = db.query(User).filter(User.email == "admin@pvccard.com").first()
        if existing:
            print("Admin user already exists.")
            return
        admin = User(
            name="Super Admin",
            email="admin@pvccard.com",
            password_hash=hash_password("ChangeMe123!"),
            role=UserRole.SUPER_ADMIN,
            is_active=True,
        )
        db.add(admin)
        db.commit()
        print("Created admin@pvccard.com / ChangeMe123!  — change this password immediately.")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
