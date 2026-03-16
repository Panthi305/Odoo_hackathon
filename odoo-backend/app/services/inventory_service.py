from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_, text
from sqlalchemy.orm import selectinload
from fastapi import HTTPException
from datetime import datetime, timezone, timedelta
from typing import Optional, List
import random
import string

from app.models.inventory import (
    Product, ProductCategory, Warehouse, Location,
    StockLevel, StockOperation, StockMove, OperationStatus, MoveType,
    ReorderRule, AuditLog, OperationActivity
)
from app.schemas.inventory_schema import (
    ProductCreate, ProductUpdate, CategoryCreate, CategoryUpdate,
    WarehouseCreate, WarehouseUpdate, LocationCreate,
    OperationCreate, OperationUpdate, OperationValidate,
    ReorderRuleCreate, ReorderRuleUpdate
)


# ── Reference Generator ────────────────────────────────────────────────────────
def _gen_ref(prefix: str) -> str:
    suffix = ''.join(random.choices(string.digits, k=6))
    return f"{prefix}/{suffix}"


# ── Audit Helper ───────────────────────────────────────────────────────────────
async def _log_audit(db: AsyncSession, user_id: Optional[int], entity_type: str,
                     entity_id: int, action: str, changes: Optional[dict] = None):
    log = AuditLog(user_id=user_id, entity_type=entity_type,
                   entity_id=entity_id, action=action, changes=changes)
    db.add(log)


async def _log_activity(db: AsyncSession, operation_id: int, user_id: Optional[int],
                        activity_type: str, note: Optional[str] = None):
    act = OperationActivity(operation_id=operation_id, user_id=user_id,
                            activity_type=activity_type, note=note)
    db.add(act)


# ── Category ───────────────────────────────────────────────────────────────────
async def get_categories(db: AsyncSession, include_inactive: bool = False):
    q = select(ProductCategory).order_by(ProductCategory.name)
    if not include_inactive:
        q = q.where(ProductCategory.is_active == True)
    result = await db.execute(q)
    return result.scalars().all()


async def create_category(data: CategoryCreate, db: AsyncSession, user_id: Optional[int] = None):
    existing = await db.execute(select(ProductCategory).where(ProductCategory.name == data.name))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Category already exists")
    cat = ProductCategory(name=data.name, description=data.description)
    db.add(cat)
    await db.flush()
    await _log_audit(db, user_id, "category", cat.id, "create", {"name": data.name})
    await db.commit()
    result = await db.execute(select(ProductCategory).where(ProductCategory.id == cat.id))
    return result.scalar_one()


async def update_category(cat_id: int, data: CategoryUpdate, db: AsyncSession, user_id: Optional[int] = None):
    result = await db.execute(select(ProductCategory).where(ProductCategory.id == cat_id))
    cat = result.scalar_one_or_none()
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found")
    changes = {}
    if data.name is not None and data.name != cat.name:
        changes["name"] = {"old": cat.name, "new": data.name}
        cat.name = data.name
    if data.description is not None:
        cat.description = data.description
    await _log_audit(db, user_id, "category", cat_id, "update", changes)
    await db.commit()
    result2 = await db.execute(select(ProductCategory).where(ProductCategory.id == cat_id))
    return result2.scalar_one()


async def delete_category(cat_id: int, db: AsyncSession, user_id: Optional[int] = None):
    result = await db.execute(select(ProductCategory).where(ProductCategory.id == cat_id))
    cat = result.scalar_one_or_none()
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found")
    cat.is_active = False  # soft delete
    await _log_audit(db, user_id, "category", cat_id, "delete")
    await db.commit()
    return {"message": "Category archived"}


# ── Warehouse ──────────────────────────────────────────────────────────────────
async def get_warehouses(db: AsyncSession, include_deleted: bool = False):
    q = select(Warehouse).order_by(Warehouse.name)
    if not include_deleted:
        q = q.where(Warehouse.deleted_at == None)
    result = await db.execute(q)
    return result.scalars().all()


async def create_warehouse(data: WarehouseCreate, db: AsyncSession, user_id: Optional[int] = None):
    existing = await db.execute(select(Warehouse).where(Warehouse.code == data.code.upper()))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Warehouse code already exists")
    wh = Warehouse(name=data.name, code=data.code.upper(), address=data.address)
    db.add(wh)
    await db.flush()
    for loc_name, loc_type in [("Stock", "internal"), ("Input", "internal"), ("Output", "internal")]:
        loc = Location(name=f"{wh.code}/{loc_name}", warehouse_id=wh.id, location_type=loc_type)
        db.add(loc)
    await _log_audit(db, user_id, "warehouse", wh.id, "create", {"name": data.name, "code": data.code})
    await db.commit()
    result = await db.execute(select(Warehouse).where(Warehouse.id == wh.id))
    return result.scalar_one()


async def update_warehouse(wh_id: int, data: WarehouseUpdate, db: AsyncSession, user_id: Optional[int] = None):
    result = await db.execute(select(Warehouse).where(Warehouse.id == wh_id))
    wh = result.scalar_one_or_none()
    if not wh:
        raise HTTPException(status_code=404, detail="Warehouse not found")
    changes = {}
    for field, val in data.model_dump(exclude_none=True).items():
        old = getattr(wh, field)
        if old != val:
            changes[field] = {"old": old, "new": val}
        setattr(wh, field, val)
    await _log_audit(db, user_id, "warehouse", wh_id, "update", changes)
    await db.commit()
    result2 = await db.execute(select(Warehouse).where(Warehouse.id == wh_id))
    return result2.scalar_one()


async def delete_warehouse(wh_id: int, db: AsyncSession, user_id: Optional[int] = None):
    result = await db.execute(select(Warehouse).where(Warehouse.id == wh_id))
    wh = result.scalar_one_or_none()
    if not wh:
        raise HTTPException(status_code=404, detail="Warehouse not found")
    wh.deleted_at = datetime.now(timezone.utc)
    wh.is_active = False
    await _log_audit(db, user_id, "warehouse", wh_id, "delete")
    await db.commit()
    return {"message": "Warehouse archived"}


# ── Location ───────────────────────────────────────────────────────────────────
async def get_locations(db: AsyncSession, warehouse_id: Optional[int] = None):
    q = select(Location).where(Location.is_active == True, Location.deleted_at == None)
    if warehouse_id:
        q = q.where(Location.warehouse_id == warehouse_id)
    result = await db.execute(q.order_by(Location.name))
    return result.scalars().all()


async def create_location(data: LocationCreate, db: AsyncSession):
    loc = Location(name=data.name, warehouse_id=data.warehouse_id, location_type=data.location_type)
    db.add(loc)
    await db.flush()
    loc_id = loc.id
    await db.commit()
    result = await db.execute(select(Location).where(Location.id == loc_id))
    return result.scalar_one()


async def delete_location(loc_id: int, db: AsyncSession, user_id: Optional[int] = None):
    result = await db.execute(select(Location).where(Location.id == loc_id))
    loc = result.scalar_one_or_none()
    if not loc:
        raise HTTPException(status_code=404, detail="Location not found")
    loc.deleted_at = datetime.now(timezone.utc)
    loc.is_active = False
    await _log_audit(db, user_id, "location", loc_id, "delete")
    await db.commit()
    return {"message": "Location archived"}


# ── Product ────────────────────────────────────────────────────────────────────
async def get_products(db: AsyncSession, search: Optional[str] = None,
                       category_id: Optional[int] = None, active_only: bool = True,
                       page: int = 1, page_size: int = 50,
                       sort_by: str = "name", sort_dir: str = "asc"):
    q = select(Product).options(selectinload(Product.category), selectinload(Product.stock_levels))
    if active_only:
        q = q.where(Product.is_active == True)
    if search:
        q = q.where(or_(
            Product.name.ilike(f"%{search}%"),
            Product.sku.ilike(f"%{search}%"),
            Product.description.ilike(f"%{search}%")
        ))
    if category_id:
        q = q.where(Product.category_id == category_id)

    # Sorting
    sort_col = getattr(Product, sort_by, Product.name)
    q = q.order_by(sort_col.desc() if sort_dir == "desc" else sort_col.asc())

    # Count total
    count_q = select(func.count()).select_from(q.subquery())
    total = (await db.execute(count_q)).scalar() or 0

    # Paginate
    q = q.offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(q)
    products = result.scalars().all()
    return products, total


async def get_product(product_id: int, db: AsyncSession):
    result = await db.execute(
        select(Product)
        .options(selectinload(Product.category), selectinload(Product.stock_levels))
        .where(Product.id == product_id)
    )
    p = result.scalar_one_or_none()
    if not p:
        raise HTTPException(status_code=404, detail="Product not found")
    return p


async def create_product(data: ProductCreate, db: AsyncSession, user_id: Optional[int] = None):
    existing = await db.execute(select(Product).where(Product.sku == data.sku))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="SKU already exists")
    if data.category_id:
        cat = await db.execute(select(ProductCategory).where(ProductCategory.id == data.category_id))
        if not cat.scalar_one_or_none():
            raise HTTPException(status_code=404, detail="Category not found")
    product = Product(
        name=data.name, sku=data.sku, category_id=data.category_id,
        unit_of_measure=data.unit_of_measure, description=data.description,
        min_stock_qty=data.min_stock_qty, cost_price=data.cost_price, sale_price=data.sale_price
    )
    db.add(product)
    await db.flush()
    if data.initial_stock and data.initial_stock > 0:
        int_loc = await db.execute(select(Location).where(Location.location_type == "internal").limit(1))
        int_location = int_loc.scalar_one_or_none()
        if int_location:
            sl = StockLevel(product_id=product.id, location_id=int_location.id, quantity=data.initial_stock)
            db.add(sl)
    await _log_audit(db, user_id, "product", product.id, "create",
                     {"name": data.name, "sku": data.sku})
    await db.commit()
    return await get_product(product.id, db)


async def update_product(product_id: int, data: ProductUpdate, db: AsyncSession, user_id: Optional[int] = None):
    p = await get_product(product_id, db)
    changes = {}
    for field, val in data.model_dump(exclude_none=True).items():
        old = getattr(p, field)
        if old != val:
            changes[field] = {"old": old, "new": val}
        setattr(p, field, val)
    await _log_audit(db, user_id, "product", product_id, "update", changes)
    await db.commit()
    return await get_product(product_id, db)


async def delete_product(product_id: int, db: AsyncSession, user_id: Optional[int] = None):
    p = await get_product(product_id, db)
    p.is_active = False
    await _log_audit(db, user_id, "product", product_id, "delete")
    await db.commit()
    return {"message": "Product archived"}


# ── Stock Level helpers ────────────────────────────────────────────────────────
async def _get_or_create_stock_level(product_id: int, location_id: int, db: AsyncSession) -> StockLevel:
    result = await db.execute(
        select(StockLevel).where(
            StockLevel.product_id == product_id,
            StockLevel.location_id == location_id
        )
    )
    sl = result.scalar_one_or_none()
    if not sl:
        sl = StockLevel(product_id=product_id, location_id=location_id, quantity=0.0)
        db.add(sl)
        await db.flush()
    return sl


async def get_stock_by_product(product_id: int, db: AsyncSession):
    result = await db.execute(
        select(StockLevel, Location)
        .join(Location, StockLevel.location_id == Location.id)
        .where(StockLevel.product_id == product_id)
    )
    return result.all()


# ── Operations ─────────────────────────────────────────────────────────────────
_OP_PREFIX = {
    MoveType.receipt: "REC",
    MoveType.delivery: "DEL",
    MoveType.internal: "INT",
    MoveType.adjustment: "ADJ",
}


async def _ensure_default_locations(op_type: MoveType, db: AsyncSession):
    vendor = (await db.execute(select(Location).where(Location.location_type == "vendor").limit(1))).scalar_one_or_none()
    customer = (await db.execute(select(Location).where(Location.location_type == "customer").limit(1))).scalar_one_or_none()
    internal = (await db.execute(select(Location).where(Location.location_type == "internal").limit(1))).scalar_one_or_none()
    virtual = (await db.execute(select(Location).where(Location.location_type == "virtual").limit(1))).scalar_one_or_none()

    if op_type == MoveType.receipt:
        return (vendor.id if vendor else None, internal.id if internal else None)
    elif op_type == MoveType.delivery:
        return (internal.id if internal else None, customer.id if customer else None)
    elif op_type == MoveType.adjustment:
        return (virtual.id if virtual else None, internal.id if internal else None)
    else:
        return (internal.id if internal else None, internal.id if internal else None)


async def get_operations(db: AsyncSession, op_type: Optional[MoveType] = None,
                         status: Optional[OperationStatus] = None,
                         search: Optional[str] = None,
                         page: int = 1, page_size: int = 50):
    q = select(StockOperation).options(
        selectinload(StockOperation.moves).selectinload(StockMove.product),
        selectinload(StockOperation.source_location),
        selectinload(StockOperation.dest_location),
        selectinload(StockOperation.activities).selectinload(OperationActivity.user),
    )
    if op_type:
        q = q.where(StockOperation.operation_type == op_type)
    if status:
        q = q.where(StockOperation.status == status)
    if search:
        q = q.where(or_(
            StockOperation.reference.ilike(f"%{search}%"),
            StockOperation.partner_name.ilike(f"%{search}%")
        ))

    count_q = select(func.count()).select_from(q.subquery())
    total = (await db.execute(count_q)).scalar() or 0

    q = q.order_by(StockOperation.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(q)
    return result.scalars().all(), total


async def get_operation(op_id: int, db: AsyncSession):
    result = await db.execute(
        select(StockOperation)
        .options(
            selectinload(StockOperation.moves).selectinload(StockMove.product),
            selectinload(StockOperation.source_location),
            selectinload(StockOperation.dest_location),
            selectinload(StockOperation.activities).selectinload(OperationActivity.user),
        )
        .where(StockOperation.id == op_id)
    )
    op = result.scalar_one_or_none()
    if not op:
        raise HTTPException(status_code=404, detail="Operation not found")
    return op


async def create_operation(data: OperationCreate, user_id: int, db: AsyncSession):
    src_id = data.source_location_id
    dst_id = data.dest_location_id
    if not src_id or not dst_id:
        default_src, default_dst = await _ensure_default_locations(data.operation_type, db)
        src_id = src_id or default_src
        dst_id = dst_id or default_dst

    op = StockOperation(
        reference=_gen_ref(_OP_PREFIX[data.operation_type]),
        operation_type=data.operation_type,
        status=OperationStatus.draft,
        partner_name=data.partner_name,
        source_location_id=src_id,
        dest_location_id=dst_id,
        scheduled_date=data.scheduled_date,
        notes=data.notes,
        created_by=user_id,
    )
    db.add(op)
    await db.flush()

    for line in data.lines:
        prod = await db.execute(select(Product).where(Product.id == line.product_id))
        if not prod.scalar_one_or_none():
            raise HTTPException(status_code=404, detail=f"Product {line.product_id} not found")
        move = StockMove(
            operation_id=op.id, product_id=line.product_id,
            demand_qty=line.demand_qty, done_qty=0.0,
            source_location_id=src_id, dest_location_id=dst_id,
        )
        db.add(move)

    await _log_activity(db, op.id, user_id, "created")
    await _log_audit(db, user_id, "operation", op.id, "create", {"reference": op.reference})
    await db.commit()
    return await get_operation(op.id, db)


async def update_operation(op_id: int, data: OperationUpdate, user_id: int, db: AsyncSession):
    op = await get_operation(op_id, db)
    if op.status in (OperationStatus.done, OperationStatus.cancelled):
        raise HTTPException(status_code=400, detail="Cannot edit a completed or cancelled operation")
    for field, val in data.model_dump(exclude_none=True, exclude={"lines"}).items():
        setattr(op, field, val)
    if data.lines is not None:
        for move in op.moves:
            await db.delete(move)
        await db.flush()
        for line in data.lines:
            move = StockMove(
                operation_id=op.id, product_id=line.product_id,
                demand_qty=line.demand_qty, done_qty=0.0,
                source_location_id=op.source_location_id,
                dest_location_id=op.dest_location_id,
            )
            db.add(move)
    await _log_activity(db, op_id, user_id, "edited")
    await _log_audit(db, user_id, "operation", op_id, "update")
    await db.commit()
    return await get_operation(op_id, db)


async def validate_operation(op_id: int, data: OperationValidate, user_id: int, db: AsyncSession):
    op = await get_operation(op_id, db)
    if op.status == OperationStatus.done:
        raise HTTPException(status_code=400, detail="Operation already validated")
    if op.status == OperationStatus.cancelled:
        raise HTTPException(status_code=400, detail="Cannot validate a cancelled operation")

    done_map = {line.product_id: line.done_qty for line in data.lines}

    for move in op.moves:
        done_qty = done_map.get(move.product_id, move.demand_qty)
        if done_qty < 0:
            raise HTTPException(status_code=400, detail=f"Done quantity cannot be negative for product {move.product_id}")
        move.done_qty = done_qty

        if op.operation_type == MoveType.receipt:
            if op.dest_location_id:
                sl = await _get_or_create_stock_level(move.product_id, op.dest_location_id, db)
                sl.quantity += done_qty

        elif op.operation_type == MoveType.delivery:
            if op.source_location_id:
                sl = await _get_or_create_stock_level(move.product_id, op.source_location_id, db)
                if sl.quantity < done_qty:
                    raise HTTPException(
                        status_code=400,
                        detail=f"Insufficient stock for product {move.product_id}. Available: {sl.quantity}, Requested: {done_qty}"
                    )
                sl.quantity -= done_qty

        elif op.operation_type == MoveType.internal:
            if op.source_location_id and op.dest_location_id:
                src_sl = await _get_or_create_stock_level(move.product_id, op.source_location_id, db)
                if src_sl.quantity < done_qty:
                    raise HTTPException(
                        status_code=400,
                        detail=f"Insufficient stock for product {move.product_id}. Available: {src_sl.quantity}"
                    )
                src_sl.quantity -= done_qty
                dst_sl = await _get_or_create_stock_level(move.product_id, op.dest_location_id, db)
                dst_sl.quantity += done_qty

        elif op.operation_type == MoveType.adjustment:
            if op.dest_location_id:
                sl = await _get_or_create_stock_level(move.product_id, op.dest_location_id, db)
                sl.quantity = done_qty

    op.status = OperationStatus.done
    op.validated_at = datetime.now(timezone.utc)
    await _log_activity(db, op_id, user_id, "validated")
    await _log_audit(db, user_id, "operation", op_id, "validate")
    await db.commit()
    return await get_operation(op_id, db)


async def cancel_operation(op_id: int, user_id: int, db: AsyncSession):
    op = await get_operation(op_id, db)
    if op.status == OperationStatus.done:
        raise HTTPException(status_code=400, detail="Cannot cancel a validated operation")
    op.status = OperationStatus.cancelled
    await _log_activity(db, op_id, user_id, "cancelled")
    await _log_audit(db, user_id, "operation", op_id, "cancel")
    await db.commit()
    return await get_operation(op_id, db)


# ── Reorder Rules ──────────────────────────────────────────────────────────────
async def get_reorder_rules(db: AsyncSession):
    result = await db.execute(
        select(ReorderRule)
        .options(selectinload(ReorderRule.product).selectinload(Product.stock_levels))
        .where(ReorderRule.is_active == True)
        .order_by(ReorderRule.id)
    )
    return result.scalars().all()


async def create_reorder_rule(data: ReorderRuleCreate, db: AsyncSession, user_id: Optional[int] = None):
    existing = await db.execute(select(ReorderRule).where(ReorderRule.product_id == data.product_id))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Reorder rule already exists for this product")
    rule = ReorderRule(product_id=data.product_id, min_qty=data.min_qty, max_qty=data.max_qty)
    db.add(rule)
    await db.commit()
    result = await db.execute(
        select(ReorderRule).options(selectinload(ReorderRule.product).selectinload(Product.stock_levels))
        .where(ReorderRule.id == rule.id)
    )
    return result.scalar_one()


async def update_reorder_rule(rule_id: int, data: ReorderRuleUpdate, db: AsyncSession):
    result = await db.execute(select(ReorderRule).where(ReorderRule.id == rule_id))
    rule = result.scalar_one_or_none()
    if not rule:
        raise HTTPException(status_code=404, detail="Reorder rule not found")
    for field, val in data.model_dump(exclude_none=True).items():
        setattr(rule, field, val)
    await db.commit()
    result2 = await db.execute(
        select(ReorderRule).options(selectinload(ReorderRule.product).selectinload(Product.stock_levels))
        .where(ReorderRule.id == rule_id)
    )
    return result2.scalar_one()


async def delete_reorder_rule(rule_id: int, db: AsyncSession):
    result = await db.execute(select(ReorderRule).where(ReorderRule.id == rule_id))
    rule = result.scalar_one_or_none()
    if not rule:
        raise HTTPException(status_code=404, detail="Reorder rule not found")
    await db.delete(rule)
    await db.commit()
    return {"message": "Reorder rule deleted"}


# ── Audit Logs ─────────────────────────────────────────────────────────────────
async def get_audit_logs(db: AsyncSession, entity_type: Optional[str] = None,
                         entity_id: Optional[int] = None, page: int = 1, page_size: int = 50):
    from app.models.user import User
    q = select(AuditLog).options(selectinload(AuditLog.user))
    if entity_type:
        q = q.where(AuditLog.entity_type == entity_type)
    if entity_id:
        q = q.where(AuditLog.entity_id == entity_id)

    count_q = select(func.count()).select_from(q.subquery())
    total = (await db.execute(count_q)).scalar() or 0

    q = q.order_by(AuditLog.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(q)
    return result.scalars().all(), total


# ── Dashboard KPIs ─────────────────────────────────────────────────────────────
async def get_dashboard_kpis(db: AsyncSession):
    total_products = (await db.execute(
        select(func.count(Product.id)).where(Product.is_active == True)
    )).scalar() or 0

    stock_result = await db.execute(
        select(StockLevel.product_id, func.sum(StockLevel.quantity).label("total"))
        .group_by(StockLevel.product_id)
    )
    stock_map = {row.product_id: row.total for row in stock_result}

    products_result = await db.execute(
        select(Product.id, Product.min_stock_qty).where(Product.is_active == True)
    )
    low_stock = out_of_stock = 0
    for row in products_result:
        qty = stock_map.get(row.id, 0)
        if qty == 0:
            out_of_stock += 1
        elif qty <= row.min_stock_qty and row.min_stock_qty > 0:
            low_stock += 1

    pending_receipts = (await db.execute(
        select(func.count(StockOperation.id)).where(
            StockOperation.operation_type == MoveType.receipt,
            StockOperation.status.in_([OperationStatus.draft, OperationStatus.waiting, OperationStatus.ready])
        )
    )).scalar() or 0

    pending_deliveries = (await db.execute(
        select(func.count(StockOperation.id)).where(
            StockOperation.operation_type == MoveType.delivery,
            StockOperation.status.in_([OperationStatus.draft, OperationStatus.waiting, OperationStatus.ready])
        )
    )).scalar() or 0

    scheduled_transfers = (await db.execute(
        select(func.count(StockOperation.id)).where(
            StockOperation.operation_type == MoveType.internal,
            StockOperation.status.in_([OperationStatus.draft, OperationStatus.waiting, OperationStatus.ready])
        )
    )).scalar() or 0

    total_value = (await db.execute(
        select(func.sum(StockLevel.quantity * Product.cost_price))
        .join(Product, StockLevel.product_id == Product.id)
    )).scalar() or 0.0

    # Recent operations
    recent_ops_result = await db.execute(
        select(StockOperation)
        .options(
            selectinload(StockOperation.moves).selectinload(StockMove.product),
            selectinload(StockOperation.source_location),
            selectinload(StockOperation.dest_location),
            selectinload(StockOperation.activities).selectinload(OperationActivity.user),
        )
        .order_by(StockOperation.created_at.desc())
        .limit(10)
    )
    recent_ops = recent_ops_result.scalars().all()

    # Chart: stock movement trend (last 7 days done_qty sum)
    seven_days_ago = datetime.now(timezone.utc) - timedelta(days=7)
    trend_result = await db.execute(
        select(
            func.date(StockMove.created_at).label("day"),
            func.sum(StockMove.done_qty).label("total")
        )
        .join(StockOperation, StockMove.operation_id == StockOperation.id)
        .where(StockMove.created_at >= seven_days_ago, StockOperation.status == OperationStatus.done)
        .group_by(func.date(StockMove.created_at))
        .order_by(func.date(StockMove.created_at))
    )
    stock_movement_trend = [
        {"label": str(row.day), "value": float(row.total or 0)}
        for row in trend_result
    ]

    # Chart: operations per day (last 7 days)
    ops_per_day_result = await db.execute(
        select(
            func.date(StockOperation.created_at).label("day"),
            func.count(StockOperation.id).label("count")
        )
        .where(StockOperation.created_at >= seven_days_ago)
        .group_by(func.date(StockOperation.created_at))
        .order_by(func.date(StockOperation.created_at))
    )
    operations_per_day = [
        {"label": str(row.day), "value": float(row.count or 0)}
        for row in ops_per_day_result
    ]

    # Chart: stock distribution by warehouse
    warehouse_stock_result = await db.execute(
        select(Warehouse.name, func.sum(StockLevel.quantity).label("total"))
        .join(Location, StockLevel.location_id == Location.id)
        .join(Warehouse, Location.warehouse_id == Warehouse.id)
        .where(Warehouse.deleted_at == None)
        .group_by(Warehouse.name)
    )
    stock_by_warehouse = [
        {"label": row.name, "value": float(row.total or 0)}
        for row in warehouse_stock_result
    ]

    return {
        "total_products": total_products,
        "low_stock_items": low_stock,
        "out_of_stock_items": out_of_stock,
        "pending_receipts": pending_receipts,
        "pending_deliveries": pending_deliveries,
        "scheduled_transfers": scheduled_transfers,
        "total_stock_value": round(total_value, 2),
        "recent_operations": recent_ops,
        "stock_movement_trend": stock_movement_trend,
        "operations_per_day": operations_per_day,
        "stock_by_warehouse": stock_by_warehouse,
    }
