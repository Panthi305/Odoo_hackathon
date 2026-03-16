"""
Reset database - drops all tables and recreates them.
Uses NullPool so it works even when connection slots are limited.
"""
import asyncio
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy.pool import NullPool
from app.config import get_settings
from app.database import Base

# Import all models to register them with Base.metadata
from app.models.user import User
from app.models.otp import OTPCode
from app.models.inventory import (
    ProductCategory, Warehouse, Location, Product,
    StockLevel, StockOperation, StockMove
)

settings = get_settings()

# Use NullPool to avoid connection limit issues
engine = create_async_engine(settings.DATABASE_URL, poolclass=NullPool, echo=False)

async def reset_database():
    print("Step 1: Dropping schema...")
    async with engine.begin() as conn:
        await conn.execute(text("DROP SCHEMA public CASCADE"))
    print("  Schema dropped.")

    async with engine.begin() as conn:
        await conn.execute(text("CREATE SCHEMA public"))
    print("  Schema recreated.")

    print("Step 2: Creating all tables...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("  All tables created.")

    await engine.dispose()
    print("\nDatabase reset complete!")

if __name__ == "__main__":
    asyncio.run(reset_database())
