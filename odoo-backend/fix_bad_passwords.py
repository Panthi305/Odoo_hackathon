"""
Deletes users whose password_hash cannot be identified by bcrypt.
Run once: python fix_bad_passwords.py
"""
import asyncio
from sqlalchemy import select, delete
from app.database import AsyncSessionLocal
from app.models.user import User
from passlib.context import CryptContext
from passlib.exc import UnknownHashError

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

async def fix():
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(User))
        users = result.scalars().all()

        bad_ids = []
        for u in users:
            if not u.password_hash:
                bad_ids.append(u.id)
                continue
            try:
                pwd_context.identify(u.password_hash)
            except (UnknownHashError, ValueError):
                bad_ids.append(u.id)

        if not bad_ids:
            print("No bad users found. All password hashes are valid.")
            return

        print(f"Found {len(bad_ids)} user(s) with bad hashes: IDs {bad_ids}")
        await db.execute(delete(User).where(User.id.in_(bad_ids)))
        await db.commit()
        print("Deleted. You can now sign up fresh.")

asyncio.run(fix())
