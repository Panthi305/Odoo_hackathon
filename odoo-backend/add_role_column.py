"""
Migration: Add 'role' column to users table.
Run this ONCE if you already have an existing database.
If starting fresh, just run reset_database.py instead.
"""
import asyncio
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy.pool import NullPool
from app.config import get_settings

settings = get_settings()
engine = create_async_engine(settings.DATABASE_URL, poolclass=NullPool, echo=False)

async def migrate():
    async with engine.begin() as conn:
        # Check if column already exists
        result = await conn.execute(text(
            "SELECT column_name FROM information_schema.columns "
            "WHERE table_name='users' AND column_name='role'"
        ))
        if result.fetchone():
            print("Column 'role' already exists. Nothing to do.")
        else:
            await conn.execute(text(
                "ALTER TABLE users ADD COLUMN role VARCHAR DEFAULT 'staff' NOT NULL"
            ))
            print("Column 'role' added to users table.")
    await engine.dispose()
    print("Migration complete.")

if __name__ == "__main__":
    asyncio.run(migrate())
