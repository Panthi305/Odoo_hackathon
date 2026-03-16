import asyncio
from sqlalchemy import text
from app.database import engine

async def main():
    async with engine.begin() as conn:
        migrations = [
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR DEFAULT 'staff' NOT NULL",
            "ALTER TABLE products ADD COLUMN IF NOT EXISTS image_url VARCHAR(500) NULL",
            "ALTER TABLE product_categories ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE",
        ]
        for sql in migrations:
            await conn.execute(text(sql))
            print(f"OK: {sql[:60]}...")
        print("\nAll migrations applied successfully.")

asyncio.run(main())
