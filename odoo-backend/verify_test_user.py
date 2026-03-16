import asyncio
from sqlalchemy import text
from app.database import AsyncSessionLocal

async def verify_user():
    async with AsyncSessionLocal() as db:
        await db.execute(text("UPDATE users SET is_verified = true WHERE email = 'admin@coreinventory.com'"))
        await db.commit()
        print("User verified successfully")

asyncio.run(verify_user())
