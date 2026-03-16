import os
import uuid
import csv
import io
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional, List
from app.database import get_db
from app.utils.jwt_handler import verify_token
from app.models.inventory import (
    MoveType, OperationStatus, Product, StockLevel, StockMove, StockOperation,
    ReorderRule, AuditLog
)
from app.schemas.inventory_schema import (
    CategoryCreate, CategoryUpdate, CategoryResponse,
    WarehouseCreate, WarehouseUpdate, WarehouseResponse,
    LocationCreate, LocationResponse,
    ProductCreate, ProductUpdate, ProductResponse,
    OperationCreate, OperationUpdate, OperationValidate, OperationResponse,
    ReorderRuleCreate, ReorderRuleUpdate, ReorderRuleResponse,
    AuditLogResponse, DashboardKPIs
)
from app.services.inventory_service import (
    get_categories, create_category, update_category, delete_category,
    get_warehouses, create_warehouse, update_warehouse, delete_warehouse,
    get_locations, create_location, delete_location,
    get_products, get_product, create_product, update_product, delete_product,
    get_stock_by_product,
    get_operations, get_operation, create_operation, update_operation,
    validate_operation, cancel_operation,
    get_reorder_rules, create_reorder_rule, update_reorder_rule, delete_reorder_rule,
    get_audit_logs, get_dashboard_kpis
)
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

security = HTTPBearer()
router = APIRouter(prefix="/inventory", tags=["Inventory"])

UPLOAD_DIR = "uploads/products"
ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
MAX_IMAGE_SIZE = 5 * 1024 * 1024  # 5MB


def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    payload = verify_token(credentials.credentials)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    return payload


def require_admin(user=Depends(get_current_user)):
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


def _build_product_response(p) -> dict:
    total_stock = sum(sl.quantity for sl in p.stock_levels) if p.stock_levels else 0.0
    return {
        "id": p.id, "name": p.name, "sku": p.sku,
        "category_id": p.category_id,
        "category_name": p.category.name if p.category else None,
        "unit_of_measure": p.unit_of_measure,
        "description": p.description,
        "min_stock_qty": p.min_stock_qty,
        "cost_price": p.cost_price,
        "sale_price": p.sale_price,
        "image_url": p.image_url,
        "is_active": p.is_active,
        "total_stock": total_stock,
        "created_at": p.created_at,
    }


def _build_operation_response(op) -> dict:
    return {
        "id": op.id, "reference": op.reference,
        "operation_type": op.operation_type, "status": op.status,
        "partner_name": op.partner_name,
        "source_location_id": op.source_location_id,
        "dest_location_id": op.dest_location_id,
        "source_location_name": op.source_location.name if op.source_location else None,
        "dest_location_name": op.dest_location.name if op.dest_location else None,
        "scheduled_date": op.scheduled_date,
        "notes": op.notes,
        "created_at": op.created_at,
        "validated_at": op.validated_at,
        "lines": [
            {
                "id": m.id, "product_id": m.product_id,
                "product_name": m.product.name if m.product else None,
                "product_sku": m.product.sku if m.product else None,
                "unit_of_measure": m.product.unit_of_measure if m.product else None,
                "demand_qty": m.demand_qty, "done_qty": m.done_qty,
            }
            for m in op.moves
        ],
        "activities": [
            {
                "id": a.id,
                "activity_type": a.activity_type,
                "note": a.note,
                "user_name": a.user.name if a.user else None,
                "created_at": a.created_at,
            }
            for a in (op.activities if hasattr(op, "activities") else [])
        ],
    }


# ── Dashboard ──────────────────────────────────────────────────────────────────
@router.get("/dashboard")
async def dashboard(db: AsyncSession = Depends(get_db), user=Depends(get_current_user)):
    kpis = await get_dashboard_kpis(db)
    kpis["recent_operations"] = [_build_operation_response(op) for op in kpis["recent_operations"]]
    return kpis


# ── Categories ─────────────────────────────────────────────────────────────────
@router.get("/categories", response_model=List[CategoryResponse])
async def list_categories(db: AsyncSession = Depends(get_db), user=Depends(get_current_user)):
    return await get_categories(db)


@router.post("/categories", response_model=CategoryResponse, status_code=201)
async def add_category(data: CategoryCreate, db: AsyncSession = Depends(get_db), user=Depends(require_admin)):
    return await create_category(data, db, user.get("user_id"))


@router.put("/categories/{cat_id}", response_model=CategoryResponse)
async def edit_category(cat_id: int, data: CategoryUpdate, db: AsyncSession = Depends(get_db), user=Depends(require_admin)):
    return await update_category(cat_id, data, db, user.get("user_id"))


@router.delete("/categories/{cat_id}")
async def remove_category(cat_id: int, db: AsyncSession = Depends(get_db), user=Depends(require_admin)):
    return await delete_category(cat_id, db, user.get("user_id"))


# ── Warehouses ─────────────────────────────────────────────────────────────────
@router.get("/warehouses", response_model=List[WarehouseResponse])
async def list_warehouses(db: AsyncSession = Depends(get_db), user=Depends(get_current_user)):
    return await get_warehouses(db)


@router.post("/warehouses", response_model=WarehouseResponse, status_code=201)
async def add_warehouse(data: WarehouseCreate, db: AsyncSession = Depends(get_db), user=Depends(require_admin)):
    return await create_warehouse(data, db, user.get("user_id"))


@router.put("/warehouses/{wh_id}", response_model=WarehouseResponse)
async def edit_warehouse(wh_id: int, data: WarehouseUpdate, db: AsyncSession = Depends(get_db), user=Depends(require_admin)):
    return await update_warehouse(wh_id, data, db, user.get("user_id"))


@router.delete("/warehouses/{wh_id}")
async def remove_warehouse(wh_id: int, db: AsyncSession = Depends(get_db), user=Depends(require_admin)):
    return await delete_warehouse(wh_id, db, user.get("user_id"))


# ── Locations ──────────────────────────────────────────────────────────────────
@router.get("/locations", response_model=List[LocationResponse])
async def list_locations(
    warehouse_id: Optional[int] = Query(None),
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user)
):
    return await get_locations(db, warehouse_id)


@router.post("/locations", response_model=LocationResponse, status_code=201)
async def add_location(data: LocationCreate, db: AsyncSession = Depends(get_db), user=Depends(require_admin)):
    return await create_location(data, db)


@router.delete("/locations/{loc_id}")
async def remove_location(loc_id: int, db: AsyncSession = Depends(get_db), user=Depends(require_admin)):
    return await delete_location(loc_id, db, user.get("user_id"))


# ── Products ───────────────────────────────────────────────────────────────────
@router.get("/products")
async def list_products(
    search: Optional[str] = Query(None),
    category_id: Optional[int] = Query(None),
    active_only: bool = Query(True),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    sort_by: str = Query("name"),
    sort_dir: str = Query("asc"),
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user)
):
    products, total = await get_products(db, search, category_id, active_only, page, page_size, sort_by, sort_dir)
    items = [_build_product_response(p) for p in products]
    import math
    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "pages": math.ceil(total / page_size) if page_size else 1,
    }


@router.get("/products/{product_id}")
async def get_product_detail(product_id: int, db: AsyncSession = Depends(get_db), user=Depends(get_current_user)):
    p = await get_product(product_id, db)
    return _build_product_response(p)


@router.post("/products", status_code=201)
async def add_product(data: ProductCreate, db: AsyncSession = Depends(get_db), user=Depends(require_admin)):
    p = await create_product(data, db, user.get("user_id"))
    return _build_product_response(p)


@router.put("/products/{product_id}")
async def edit_product(product_id: int, data: ProductUpdate, db: AsyncSession = Depends(get_db), user=Depends(require_admin)):
    p = await update_product(product_id, data, db, user.get("user_id"))
    return _build_product_response(p)


@router.delete("/products/{product_id}")
async def archive_product(product_id: int, db: AsyncSession = Depends(get_db), user=Depends(require_admin)):
    return await delete_product(product_id, db, user.get("user_id"))


@router.post("/products/{product_id}/image")
async def upload_product_image(
    product_id: int,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    user=Depends(require_admin)
):
    if file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(status_code=400, detail="Only JPEG, PNG, WebP, GIF images are allowed")
    content = await file.read()
    if len(content) > MAX_IMAGE_SIZE:
        raise HTTPException(status_code=400, detail="Image must be under 5MB")
    ext = file.filename.rsplit(".", 1)[-1] if "." in file.filename else "jpg"
    filename = f"{product_id}_{uuid.uuid4().hex}.{ext}"
    filepath = os.path.join(UPLOAD_DIR, filename)
    with open(filepath, "wb") as f:
        f.write(content)
    image_url = f"/uploads/products/{filename}"
    p = await get_product(product_id, db)
    p.image_url = image_url
    await db.commit()
    return {"image_url": image_url}


@router.get("/products/{product_id}/stock")
async def product_stock(product_id: int, db: AsyncSession = Depends(get_db), user=Depends(get_current_user)):
    rows = await get_stock_by_product(product_id, db)
    return [{"location_id": loc.id, "location_name": loc.name, "quantity": sl.quantity} for sl, loc in rows]


# ── Operations ─────────────────────────────────────────────────────────────────
@router.get("/operations")
async def list_operations(
    op_type: Optional[MoveType] = Query(None),
    status: Optional[OperationStatus] = Query(None),
    search: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user)
):
    import math
    ops, total = await get_operations(db, op_type, status, search, page, page_size)
    return {
        "items": [_build_operation_response(op) for op in ops],
        "total": total,
        "page": page,
        "page_size": page_size,
        "pages": math.ceil(total / page_size) if page_size else 1,
    }


@router.get("/operations/{op_id}")
async def get_operation_detail(op_id: int, db: AsyncSession = Depends(get_db), user=Depends(get_current_user)):
    op = await get_operation(op_id, db)
    return _build_operation_response(op)


@router.post("/operations", status_code=201)
async def create_op(data: OperationCreate, db: AsyncSession = Depends(get_db), user=Depends(get_current_user)):
    op = await create_operation(data, user.get("user_id"), db)
    return _build_operation_response(op)


@router.put("/operations/{op_id}")
async def update_op(op_id: int, data: OperationUpdate, db: AsyncSession = Depends(get_db), user=Depends(get_current_user)):
    op = await update_operation(op_id, data, user.get("user_id"), db)
    return _build_operation_response(op)


@router.post("/operations/{op_id}/validate")
async def validate_op(op_id: int, data: OperationValidate, db: AsyncSession = Depends(get_db), user=Depends(get_current_user)):
    op = await validate_operation(op_id, data, user.get("user_id"), db)
    return _build_operation_response(op)


@router.post("/operations/{op_id}/cancel")
async def cancel_op(op_id: int, db: AsyncSession = Depends(get_db), user=Depends(get_current_user)):
    op = await cancel_operation(op_id, user.get("user_id"), db)
    return _build_operation_response(op)


# ── Move History ───────────────────────────────────────────────────────────────
@router.get("/moves/history")
async def move_history(
    product_id: Optional[int] = Query(None),
    op_type: Optional[MoveType] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user)
):
    import math
    from sqlalchemy.orm import selectinload
    q = select(StockMove).options(
        selectinload(StockMove.product),
        selectinload(StockMove.operation),
        selectinload(StockMove.source_location),
        selectinload(StockMove.dest_location),
    )
    if product_id:
        q = q.where(StockMove.product_id == product_id)
    if op_type:
        q = q.join(StockOperation).where(StockOperation.operation_type == op_type)

    count_q = select(StockMove.id)
    if product_id:
        count_q = count_q.where(StockMove.product_id == product_id)
    if op_type:
        count_q = count_q.join(StockOperation).where(StockOperation.operation_type == op_type)
    from sqlalchemy import func as _func
    total = (await db.execute(select(_func.count()).select_from(count_q.subquery()))).scalar() or 0

    q = q.order_by(StockMove.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(q)
    moves = result.scalars().all()

    return {
        "items": [
            {
                "id": m.id, "product_id": m.product_id,
                "product_name": m.product.name if m.product else None,
                "product_sku": m.product.sku if m.product else None,
                "operation_id": m.operation_id,
                "operation_ref": m.operation.reference if m.operation else None,
                "operation_type": m.operation.operation_type if m.operation else None,
                "operation_status": m.operation.status if m.operation else None,
                "source_location": m.source_location.name if m.source_location else None,
                "dest_location": m.dest_location.name if m.dest_location else None,
                "demand_qty": m.demand_qty, "done_qty": m.done_qty,
                "created_at": m.created_at,
            }
            for m in moves
        ],
        "total": total,
        "page": page,
        "page_size": page_size,
        "pages": math.ceil(total / page_size) if page_size else 1,
    }


# ── Alerts ─────────────────────────────────────────────────────────────────────
@router.get("/alerts")
async def get_alerts(db: AsyncSession = Depends(get_db), user=Depends(get_current_user)):
    from sqlalchemy.orm import selectinload
    products = (await db.execute(
        select(Product)
        .options(selectinload(Product.stock_levels), selectinload(Product.category))
        .where(Product.is_active == True)
    )).scalars().all()

    alerts = []
    for p in products:
        total_stock = sum(sl.quantity for sl in p.stock_levels) if p.stock_levels else 0.0
        if total_stock == 0:
            alerts.append({"product_id": p.id, "product_name": p.name, "sku": p.sku,
                           "category_name": p.category.name if p.category else None,
                           "total_stock": total_stock, "min_stock_qty": p.min_stock_qty,
                           "alert_type": "out_of_stock"})
        elif p.min_stock_qty > 0 and total_stock <= p.min_stock_qty:
            alerts.append({"product_id": p.id, "product_name": p.name, "sku": p.sku,
                           "category_name": p.category.name if p.category else None,
                           "total_stock": total_stock, "min_stock_qty": p.min_stock_qty,
                           "alert_type": "low_stock"})
    return alerts


# ── Reorder Rules ──────────────────────────────────────────────────────────────
@router.get("/reorder-rules")
async def list_reorder_rules(db: AsyncSession = Depends(get_db), user=Depends(get_current_user)):
    rules = await get_reorder_rules(db)
    return [
        {
            "id": r.id, "product_id": r.product_id,
            "product_name": r.product.name if r.product else None,
            "product_sku": r.product.sku if r.product else None,
            "min_qty": r.min_qty, "max_qty": r.max_qty,
            "current_stock": sum(sl.quantity for sl in r.product.stock_levels) if r.product and r.product.stock_levels else 0.0,
            "is_active": r.is_active, "created_at": r.created_at,
        }
        for r in rules
    ]


@router.post("/reorder-rules", status_code=201)
async def add_reorder_rule(data: ReorderRuleCreate, db: AsyncSession = Depends(get_db), user=Depends(require_admin)):
    rule = await create_reorder_rule(data, db, user.get("user_id"))
    return {
        "id": rule.id, "product_id": rule.product_id,
        "product_name": rule.product.name if rule.product else None,
        "product_sku": rule.product.sku if rule.product else None,
        "min_qty": rule.min_qty, "max_qty": rule.max_qty,
        "current_stock": sum(sl.quantity for sl in rule.product.stock_levels) if rule.product and rule.product.stock_levels else 0.0,
        "is_active": rule.is_active, "created_at": rule.created_at,
    }


@router.put("/reorder-rules/{rule_id}")
async def edit_reorder_rule(rule_id: int, data: ReorderRuleUpdate, db: AsyncSession = Depends(get_db), user=Depends(require_admin)):
    rule = await update_reorder_rule(rule_id, data, db)
    return {
        "id": rule.id, "product_id": rule.product_id,
        "product_name": rule.product.name if rule.product else None,
        "product_sku": rule.product.sku if rule.product else None,
        "min_qty": rule.min_qty, "max_qty": rule.max_qty,
        "current_stock": sum(sl.quantity for sl in rule.product.stock_levels) if rule.product and rule.product.stock_levels else 0.0,
        "is_active": rule.is_active, "created_at": rule.created_at,
    }


@router.delete("/reorder-rules/{rule_id}")
async def remove_reorder_rule(rule_id: int, db: AsyncSession = Depends(get_db), user=Depends(require_admin)):
    return await delete_reorder_rule(rule_id, db)


# ── Audit Logs ─────────────────────────────────────────────────────────────────
@router.get("/audit-logs")
async def list_audit_logs(
    entity_type: Optional[str] = Query(None),
    entity_id: Optional[int] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    user=Depends(require_admin)
):
    import math
    logs, total = await get_audit_logs(db, entity_type, entity_id, page, page_size)
    return {
        "items": [
            {
                "id": l.id, "user_id": l.user_id,
                "user_name": l.user.name if l.user else None,
                "entity_type": l.entity_type, "entity_id": l.entity_id,
                "action": l.action, "changes": l.changes, "created_at": l.created_at,
            }
            for l in logs
        ],
        "total": total, "page": page, "page_size": page_size,
        "pages": math.ceil(total / page_size) if page_size else 1,
    }


# ── CSV Export ─────────────────────────────────────────────────────────────────
@router.get("/export/products")
async def export_products_csv(db: AsyncSession = Depends(get_db), user=Depends(get_current_user)):
    products, _ = await get_products(db, page=1, page_size=10000)
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["ID", "Name", "SKU", "Category", "UOM", "Cost Price", "Sale Price", "Min Stock", "Total Stock", "Active"])
    for p in products:
        total_stock = sum(sl.quantity for sl in p.stock_levels) if p.stock_levels else 0.0
        writer.writerow([p.id, p.name, p.sku, p.category.name if p.category else "",
                         p.unit_of_measure, p.cost_price, p.sale_price, p.min_stock_qty, total_stock, p.is_active])
    output.seek(0)
    return StreamingResponse(iter([output.getvalue()]), media_type="text/csv",
                             headers={"Content-Disposition": "attachment; filename=products.csv"})


@router.get("/export/operations")
async def export_operations_csv(
    op_type: Optional[MoveType] = Query(None),
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user)
):
    ops, _ = await get_operations(db, op_type=op_type, page=1, page_size=10000)
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["ID", "Reference", "Type", "Status", "Partner", "Source", "Destination", "Scheduled Date", "Created At"])
    for op in ops:
        writer.writerow([op.id, op.reference, op.operation_type, op.status, op.partner_name or "",
                         op.source_location.name if op.source_location else "",
                         op.dest_location.name if op.dest_location else "",
                         op.scheduled_date or "", op.created_at])
    output.seek(0)
    return StreamingResponse(iter([output.getvalue()]), media_type="text/csv",
                             headers={"Content-Disposition": "attachment; filename=operations.csv"})


@router.get("/export/stock-ledger")
async def export_stock_ledger_csv(db: AsyncSession = Depends(get_db), user=Depends(get_current_user)):
    from sqlalchemy.orm import selectinload
    result = await db.execute(
        select(StockMove)
        .options(selectinload(StockMove.product), selectinload(StockMove.operation),
                 selectinload(StockMove.source_location), selectinload(StockMove.dest_location))
        .order_by(StockMove.created_at.desc())
        .limit(10000)
    )
    moves = result.scalars().all()
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["ID", "Date", "Reference", "Type", "Product", "SKU", "Source", "Destination", "Demand Qty", "Done Qty"])
    for m in moves:
        writer.writerow([m.id, m.created_at,
                         m.operation.reference if m.operation else "",
                         m.operation.operation_type if m.operation else "",
                         m.product.name if m.product else "",
                         m.product.sku if m.product else "",
                         m.source_location.name if m.source_location else "",
                         m.dest_location.name if m.dest_location else "",
                         m.demand_qty, m.done_qty])
    output.seek(0)
    return StreamingResponse(iter([output.getvalue()]), media_type="text/csv",
                             headers={"Content-Disposition": "attachment; filename=stock_ledger.csv"})
