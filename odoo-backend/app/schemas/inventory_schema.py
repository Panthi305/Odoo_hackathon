from pydantic import BaseModel, field_validator
from typing import Optional, List, Any, Dict
from datetime import datetime
from app.models.inventory import OperationStatus, MoveType


# ── Pagination ─────────────────────────────────────────────────────────────────
class PaginatedResponse(BaseModel):
    items: List[Any]
    total: int
    page: int
    page_size: int
    pages: int


# ── Category ───────────────────────────────────────────────────────────────────
class CategoryCreate(BaseModel):
    name: str
    description: Optional[str] = None

    @field_validator("name")
    @classmethod
    def name_not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Category name cannot be empty")
        return v.strip()


class CategoryUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None


class CategoryResponse(BaseModel):
    id: int
    name: str
    description: Optional[str]
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


# ── Warehouse ──────────────────────────────────────────────────────────────────
class WarehouseCreate(BaseModel):
    name: str
    code: str
    address: Optional[str] = None

    @field_validator("name", "code")
    @classmethod
    def not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Field cannot be empty")
        return v.strip().upper() if len(v) <= 10 else v.strip()


class WarehouseUpdate(BaseModel):
    name: Optional[str] = None
    address: Optional[str] = None
    is_active: Optional[bool] = None


class WarehouseResponse(BaseModel):
    id: int
    name: str
    code: str
    address: Optional[str]
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


# ── Location ───────────────────────────────────────────────────────────────────
class LocationCreate(BaseModel):
    name: str
    warehouse_id: Optional[int] = None
    location_type: str = "internal"

    @field_validator("location_type")
    @classmethod
    def valid_type(cls, v: str) -> str:
        allowed = {"internal", "vendor", "customer", "virtual"}
        if v not in allowed:
            raise ValueError(f"location_type must be one of {allowed}")
        return v


class LocationResponse(BaseModel):
    id: int
    name: str
    warehouse_id: Optional[int]
    location_type: str
    is_active: bool

    class Config:
        from_attributes = True


# ── Product ────────────────────────────────────────────────────────────────────
class ProductCreate(BaseModel):
    name: str
    sku: str
    category_id: Optional[int] = None
    unit_of_measure: str = "Units"
    description: Optional[str] = None
    min_stock_qty: float = 0.0
    cost_price: float = 0.0
    sale_price: float = 0.0
    initial_stock: Optional[float] = None

    @field_validator("name", "sku")
    @classmethod
    def not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Field cannot be empty")
        return v.strip()

    @field_validator("cost_price", "sale_price", "min_stock_qty")
    @classmethod
    def non_negative(cls, v: float) -> float:
        if v < 0:
            raise ValueError("Value cannot be negative")
        return v


class ProductUpdate(BaseModel):
    name: Optional[str] = None
    category_id: Optional[int] = None
    unit_of_measure: Optional[str] = None
    description: Optional[str] = None
    min_stock_qty: Optional[float] = None
    cost_price: Optional[float] = None
    sale_price: Optional[float] = None
    is_active: Optional[bool] = None
    image_url: Optional[str] = None


class ProductResponse(BaseModel):
    id: int
    name: str
    sku: str
    category_id: Optional[int]
    category_name: Optional[str] = None
    unit_of_measure: str
    description: Optional[str]
    min_stock_qty: float
    cost_price: float
    sale_price: float
    image_url: Optional[str] = None
    is_active: bool
    total_stock: float = 0.0
    created_at: datetime

    class Config:
        from_attributes = True


# ── Reorder Rule ───────────────────────────────────────────────────────────────
class ReorderRuleCreate(BaseModel):
    product_id: int
    min_qty: float
    max_qty: float

    @field_validator("min_qty", "max_qty")
    @classmethod
    def non_negative(cls, v: float) -> float:
        if v < 0:
            raise ValueError("Quantity cannot be negative")
        return v


class ReorderRuleUpdate(BaseModel):
    min_qty: Optional[float] = None
    max_qty: Optional[float] = None
    is_active: Optional[bool] = None


class ReorderRuleResponse(BaseModel):
    id: int
    product_id: int
    product_name: Optional[str] = None
    product_sku: Optional[str] = None
    min_qty: float
    max_qty: float
    current_stock: float = 0.0
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


# ── Stock Move Line ────────────────────────────────────────────────────────────
class MoveLine(BaseModel):
    product_id: int
    demand_qty: float
    done_qty: Optional[float] = None

    @field_validator("demand_qty")
    @classmethod
    def positive_qty(cls, v: float) -> float:
        if v <= 0:
            raise ValueError("Quantity must be greater than 0")
        return v


class MoveLineResponse(BaseModel):
    id: int
    product_id: int
    product_name: Optional[str] = None
    product_sku: Optional[str] = None
    unit_of_measure: Optional[str] = None
    demand_qty: float
    done_qty: float

    class Config:
        from_attributes = True


# ── Stock Operation ────────────────────────────────────────────────────────────
class OperationCreate(BaseModel):
    operation_type: MoveType
    partner_name: Optional[str] = None
    source_location_id: Optional[int] = None
    dest_location_id: Optional[int] = None
    scheduled_date: Optional[datetime] = None
    notes: Optional[str] = None
    lines: List[MoveLine]

    @field_validator("lines")
    @classmethod
    def lines_not_empty(cls, v: List[MoveLine]) -> List[MoveLine]:
        if not v:
            raise ValueError("At least one product line is required")
        return v


class OperationUpdate(BaseModel):
    partner_name: Optional[str] = None
    scheduled_date: Optional[datetime] = None
    notes: Optional[str] = None
    lines: Optional[List[MoveLine]] = None


class ValidateLine(BaseModel):
    product_id: int
    done_qty: float

    @field_validator("done_qty")
    @classmethod
    def non_negative(cls, v: float) -> float:
        if v < 0:
            raise ValueError("Done quantity cannot be negative")
        return v


class OperationValidate(BaseModel):
    lines: List[ValidateLine]


class OperationActivityResponse(BaseModel):
    id: int
    activity_type: str
    note: Optional[str]
    user_name: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class OperationResponse(BaseModel):
    id: int
    reference: str
    operation_type: MoveType
    status: OperationStatus
    partner_name: Optional[str]
    source_location_id: Optional[int]
    dest_location_id: Optional[int]
    source_location_name: Optional[str] = None
    dest_location_name: Optional[str] = None
    scheduled_date: Optional[datetime]
    notes: Optional[str]
    created_at: datetime
    validated_at: Optional[datetime]
    lines: List[MoveLineResponse] = []
    activities: List[OperationActivityResponse] = []

    class Config:
        from_attributes = True


# ── Audit Log ──────────────────────────────────────────────────────────────────
class AuditLogResponse(BaseModel):
    id: int
    user_id: Optional[int]
    user_name: Optional[str] = None
    entity_type: str
    entity_id: int
    action: str
    changes: Optional[Dict] = None
    created_at: datetime

    class Config:
        from_attributes = True


# ── Dashboard KPIs ─────────────────────────────────────────────────────────────
class ChartDataPoint(BaseModel):
    label: str
    value: float


class DashboardKPIs(BaseModel):
    total_products: int
    low_stock_items: int
    out_of_stock_items: int
    pending_receipts: int
    pending_deliveries: int
    scheduled_transfers: int
    total_stock_value: float
    recent_operations: List[OperationResponse] = []
    stock_movement_trend: List[ChartDataPoint] = []
    operations_per_day: List[ChartDataPoint] = []
    stock_by_warehouse: List[ChartDataPoint] = []
