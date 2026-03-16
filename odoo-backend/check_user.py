"""
Check what's stored for a specific user's password hash.
Run: python check_user.py
"""
import asyncio
from sqlalchemy import select
from app.database import AsyncSessionLocal
from app.models.user import User
from passlib.context import CryptContext
from passlib.exc import UnknownHashError

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

async def check():
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(User).order_by(User.created_at.desc()))
        users = result.scalars().all()

        if not users:
            print("No users in database.")
            return

        for u in users:
            try:
                scheme = pwd_context.identify(u.password_hash) if u.password_hash else "NULL"
                valid = True
            except (UnknownHashError, ValueError) as e:
                scheme = f"ERROR: {e}"
                valid = False

            print(f"ID={u.id} | email={u.email} | verified={u.is_verified} | role={u.role} | hash_scheme={scheme} | hash_ok={valid}")
            if u.password_hash:
                print(f"  hash preview: {u.password_hash[:30]}...")

asyncio.run(check())
