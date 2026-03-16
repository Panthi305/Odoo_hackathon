"""Kill all idle DB connections to free up slots on Aiven free tier"""
import asyncio
import asyncpg
import os
from dotenv import load_dotenv

load_dotenv()

# Parse the DATABASE_URL to get connection params
# Format: postgresql+asyncpg://user:pass@host:port/dbname?ssl=require
raw_url = os.getenv("DATABASE_URL", "")
# Convert SQLAlchemy URL to asyncpg format
url = raw_url.replace("postgresql+asyncpg://", "postgresql://")

async def kill_idle():
    # Connect directly with asyncpg (bypasses SQLAlchemy pool)
    conn = await asyncpg.connect(url)
    try:
        # Terminate all other connections to this database
        result = await conn.fetch("""
            SELECT pg_terminate_backend(pid)
            FROM pg_stat_activity
            WHERE datname = current_database()
              AND pid <> pg_backend_pid()
              AND state IN ('idle', 'idle in transaction', 'idle in transaction (aborted)')
        """)
        print(f"Terminated {len(result)} idle connections")
        
        # Show remaining connections
        remaining = await conn.fetchval("""
            SELECT count(*) FROM pg_stat_activity WHERE datname = current_database()
        """)
        print(f"Remaining active connections: {remaining}")
    finally:
        await conn.close()

asyncio.run(kill_idle())
