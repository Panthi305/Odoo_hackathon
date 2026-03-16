"""
Delete all users EXCEPT the 3 seeded accounts.
Handles FK references in stock_operations, audit_logs, operation_activities.
Run: python cleanup_users.py
"""
import asyncio
from sqlalchemy import text
from app.database import engine

KEEP_EMAILS = [
    'patelpanthi305@gmail.com',
    'raj.mehta@coreinventory.com',
    'priya.shah@coreinventory.com',
]

async def main():
    async with engine.begin() as conn:
        # Find users to delete
        result = await conn.execute(
            text("SELECT id, email FROM users WHERE email != ALL(:emails)"),
            {"emails": KEEP_EMAILS}
        )
        rows = result.fetchall()
        if not rows:
            print("No extra users found — nothing to delete.")
            return

        ids_to_delete = [row.id for row in rows]
        print(f"Deleting {len(rows)} user(s):")
        for row in rows:
            print(f"  - [{row.id}] {row.email}")

        # Null out FK references so delete doesn't violate constraints
        await conn.execute(
            text("UPDATE stock_operations SET created_by = NULL WHERE created_by = ANY(:ids)"),
            {"ids": ids_to_delete}
        )
        await conn.execute(
            text("UPDATE audit_logs SET user_id = NULL WHERE user_id = ANY(:ids)"),
            {"ids": ids_to_delete}
        )
        await conn.execute(
            text("UPDATE operation_activities SET user_id = NULL WHERE user_id = ANY(:ids)"),
            {"ids": ids_to_delete}
        )

        # Now safe to delete
        await conn.execute(
            text("DELETE FROM otp_codes WHERE email != ALL(:emails)"),
            {"emails": KEEP_EMAILS}
        )
        await conn.execute(
            text("DELETE FROM users WHERE email != ALL(:emails)"),
            {"emails": KEEP_EMAILS}
        )
        print("✓ Done. Only the 3 seeded accounts remain.")

if __name__ == "__main__":
    asyncio.run(main())
