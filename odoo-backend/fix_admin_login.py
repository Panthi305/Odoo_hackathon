"""
Check and fix the 3 seeded users — reset passwords and ensure is_verified=True.
Run: python fix_admin_login.py
"""
import asyncio
from sqlalchemy import text
from app.database import engine
from app.utils.password_hash import hash_password

USERS = [
    ("patelpanthi305@gmail.com", "Admin@1234",  "admin"),
    ("raj.mehta@coreinventory.com", "Staff@1234", "staff"),
    ("priya.shah@coreinventory.com", "Staff@1234", "staff"),
]

async def main():
    async with engine.begin() as conn:
        for email, password, role in USERS:
            result = await conn.execute(
                text("SELECT id, name, is_verified, role FROM users WHERE email = :email"),
                {"email": email}
            )
            row = result.fetchone()
            if not row:
                print(f"✗ NOT FOUND: {email} — inserting...")
                new_hash = hash_password(password)
                await conn.execute(text("""
                    INSERT INTO users (name, email, password_hash, is_verified, role)
                    VALUES (:name, :email, :hash, true, :role)
                """), {
                    "name": email.split("@")[0].replace(".", " ").title(),
                    "email": email,
                    "hash": new_hash,
                    "role": role,
                })
                print(f"  ✓ Inserted {email}")
            else:
                new_hash = hash_password(password)
                await conn.execute(text("""
                    UPDATE users
                    SET password_hash = :hash,
                        is_verified   = true,
                        role          = :role
                    WHERE email = :email
                """), {"hash": new_hash, "email": email, "role": role})
                print(f"✓ Fixed: [{row.id}] {email}  verified={row.is_verified} → true, password reset")

    print("\nAll done. Try logging in now:")
    print("  patelpanthi305@gmail.com  /  Admin@1234")
    print("  raj.mehta@coreinventory.com  /  Staff@1234")

if __name__ == "__main__":
    asyncio.run(main())
