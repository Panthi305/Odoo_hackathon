from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Text, Enum as SAEnum, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
import enum


class OperationStatus(str, enum.Enum):
    draft = "draft"
    waiting = "waiting"
    ready = "ready"
    done = "done"
    cancelled = "cancelled"


class MoveType(str, enum.Enum):
    receipt = "receipt"
    delivery = "delivery"
    internal = "internal"
    adjustment = "adjustment"


class ProductCategory(Base):
    __tablename__ = "product_categories"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False, unique=True)
    description = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    products = relationship("Product", back_populates="category")


class Warehouse(Base):
    __tablename__ = "warehouses"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    code = Column(String(20), nullable=False, unique=True)
    address = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True)
    deleted_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    locations = relationship("Location", back_populates="warehouse")


class Location(Base):
    __tablename__ = "locations"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    warehouse_id = Column(Integer, ForeignKey("warehouses.id"), nullable=True)
    location_type = Column(String(50), default="internal")  # internal, vendor, customer, virtual
    is_active = Column(Boolean, default=True)
    deleted_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    warehouse = relationship("Warehouse", back_populates="locations")


class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    sku = Column(String(100), nullable=False, unique=True)
    category_id = Column(Integer, ForeignKey("product_categories.id"), nullable=True)
    unit_of_measure = Column(String(50), default="Units")
    description = Column(Text, nullable=True)
    min_stock_qty = Column(Float, default=0.0)  # reorder point
    cost_price = Column(Float, default=0.0)
    sale_price = Column(Float, default=0.0)
    image_url = Column(String(500), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    category = relationship("ProductCategory", back_populates="products")
    stock_levels = relationship("StockLevel", back_populates="product")
    stock_moves = relationship("StockMove", back_populates="product")
    reorder_rules = relationship("ReorderRule", back_populates="product")


class StockLevel(Base):
    __tablename__ = "stock_levels"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    location_id = Column(Integer, ForeignKey("locations.id"), nullable=False)
    quantity = Column(Float, default=0.0)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    product = relationship("Product", back_populates="stock_levels")
    location = relationship("Location")


class StockOperation(Base):
    __tablename__ = "stock_operations"

    id = Column(Integer, primary_key=True, index=True)
    reference = Column(String(50), nullable=False, unique=True)
    operation_type = Column(SAEnum(MoveType), nullable=False)
    status = Column(SAEnum(OperationStatus), default=OperationStatus.draft)
    partner_name = Column(String(200), nullable=True)  # supplier or customer
    source_location_id = Column(Integer, ForeignKey("locations.id"), nullable=True)
    dest_location_id = Column(Integer, ForeignKey("locations.id"), nullable=True)
    scheduled_date = Column(DateTime(timezone=True), nullable=True)
    notes = Column(Text, nullable=True)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    validated_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    source_location = relationship("Location", foreign_keys=[source_location_id])
    dest_location = relationship("Location", foreign_keys=[dest_location_id])
    moves = relationship("StockMove", back_populates="operation", cascade="all, delete-orphan")
    creator = relationship("User", foreign_keys=[created_by])
    activities = relationship("OperationActivity", back_populates="operation", cascade="all, delete-orphan",
                              foreign_keys="OperationActivity.operation_id")


class StockMove(Base):
    __tablename__ = "stock_moves"

    id = Column(Integer, primary_key=True, index=True)
    operation_id = Column(Integer, ForeignKey("stock_operations.id"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    demand_qty = Column(Float, default=0.0)
    done_qty = Column(Float, default=0.0)
    source_location_id = Column(Integer, ForeignKey("locations.id"), nullable=True)
    dest_location_id = Column(Integer, ForeignKey("locations.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    operation = relationship("StockOperation", back_populates="moves")
    product = relationship("Product", back_populates="stock_moves")
    source_location = relationship("Location", foreign_keys=[source_location_id])
    dest_location = relationship("Location", foreign_keys=[dest_location_id])


# ── Reorder Rules ──────────────────────────────────────────────────────────────
class ReorderRule(Base):
    __tablename__ = "reorder_rules"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False, unique=True)
    min_qty = Column(Float, default=0.0)   # trigger reorder below this
    max_qty = Column(Float, default=0.0)   # reorder up to this
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    product = relationship("Product", back_populates="reorder_rules")


# ── Audit Log ──────────────────────────────────────────────────────────────────
class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    entity_type = Column(String(50), nullable=False)   # product, warehouse, category, operation
    entity_id = Column(Integer, nullable=False)
    action = Column(String(50), nullable=False)        # create, update, delete, validate, cancel
    changes = Column(JSON, nullable=True)              # {field: {old, new}}
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", foreign_keys=[user_id])


# ── Operation Activity Timeline ────────────────────────────────────────────────
class OperationActivity(Base):
    __tablename__ = "operation_activities"

    id = Column(Integer, primary_key=True, index=True)
    operation_id = Column(Integer, ForeignKey("stock_operations.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    activity_type = Column(String(50), nullable=False)  # created, edited, validated, cancelled
    note = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    operation = relationship("StockOperation", foreign_keys=[operation_id])
    user = relationship("User", foreign_keys=[user_id])
