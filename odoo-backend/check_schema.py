import asyncio
from sqlalchemy import text
from app.database import engine

EXPECTED = {
    "users": ["id", "name", "email", "password_hash", "is_verified", "role", "oauth_provider", "oauth_id", "created_at"],
    "locations": ["id", "name", "warehouse_id", "location_type", "is_active", "deleted_at", "created_at"],
    "warehouses": ["id", "name", "code", "address", "is_active", "deleted_at", "created_at"],
    "products": ["id", "name", "sku", "category_id", "unit_of_measure", "description", "min_stock_qty", "cost_price", "sale_price", "image_url", "is_active", "created_at", "updated_at"],
    "stock_operations": ["id", "reference", "operation_type", "status", "partner_name", "source_location_id", "dest_location_id", "scheduled_date", "notes", "created_by", "validated_at", "created_at", "updated_at"],
    "stock_moves": ["id", "operation_id", "product_id", "demand_qty", "done_qty", "source_location_id", "dest_location_id", "created_at"],
    "stock_levels": ["id", "product_id", "location_id", "quantity", "updated_at"],
    "product_categories": ["id", "name", "description", "is_active", "created_at"],
    "reorder_rules": ["id", "product_id", "min_qty", "max_qty", "is_active", "created_at", "updated_at"],
    "audit_logs": ["id", "user_id", "entity_type", "entity_id", "action", "changes", "created_at"],
    "operation_activities": ["id", "operation_id", "user_id", "activity_type", "note", "created_at"],
    "otp_codes": ["id", "email", "otp", "expires_at"],
}

async def main():
    async with engine.begin() as conn:
        for table, expected_cols in EXPECTED.items():
            result = await conn.execute(text(
                "SELECT column_name FROM information_schema.columns "
                "WHERE table_name = :t ORDER BY column_name"
            ), {"t": table})
            actual = {r[0] for r in result}
            missing = [c for c in expected_cols if c not in actual]
            if missing:
                print(f"MISSING in {table}: {missing}")
            else:
                print(f"OK: {table}")

asyncio.run(main())
