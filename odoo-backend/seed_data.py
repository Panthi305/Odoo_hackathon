"""
CoreInventory — Full Seed Script
Clears ALL data, resets sequences, re-seeds everything from scratch.
Run: python seed_data.py  (from odoo-backend with venv active)
"""
import asyncio
from datetime import datetime, timezone, timedelta
from sqlalchemy import text
from app.database import engine, AsyncSessionLocal
from app.models.user import User
from app.models.inventory import (
    ProductCategory, Warehouse, Location, Product, StockLevel,
    StockOperation, StockMove, ReorderRule, AuditLog, OperationActivity,
    MoveType, OperationStatus,
)
from app.utils.password_hash import hash_password

now = datetime.now(timezone.utc)


# ─────────────────────────────────────────────────────────────────────────────
async def clear_all(conn):
    tables = [
        "operation_activities", "audit_logs", "reorder_rules",
        "stock_moves", "stock_operations", "stock_levels",
        "products", "product_categories", "locations", "warehouses",
        "otp_codes", "users",
    ]
    for t in tables:
        await conn.execute(text(f"DELETE FROM {t}"))
    seqs = [
        "users_id_seq", "product_categories_id_seq", "warehouses_id_seq",
        "locations_id_seq", "products_id_seq", "stock_levels_id_seq",
        "stock_operations_id_seq", "stock_moves_id_seq",
        "reorder_rules_id_seq", "audit_logs_id_seq",
        "operation_activities_id_seq",
    ]
    for s in seqs:
        await conn.execute(text(f"ALTER SEQUENCE IF EXISTS {s} RESTART WITH 1"))
    print("✓ Cleared all data & reset sequences")


async def seed_users(db):
    admin = User(name="Panthi Patel", email="patelpanthi305@gmail.com",
                 password_hash=hash_password("Admin@1234"), is_verified=True, role="admin")
    s1 = User(name="Raj Mehta", email="raj.mehta@coreinventory.com",
              password_hash=hash_password("Staff@1234"), is_verified=True, role="staff")
    s2 = User(name="Priya Shah", email="priya.shah@coreinventory.com",
              password_hash=hash_password("Staff@1234"), is_verified=True, role="staff")
    db.add_all([admin, s1, s2])
    await db.flush()
    print("✓ Users: admin + 2 staff")
    return admin, s1, s2


async def seed_warehouses(db):
    wh  = Warehouse(name="Main Warehouse",            code="WH",  address="Plot 12, GIDC Industrial Estate, Ahmedabad, Gujarat 382330")
    ndc = Warehouse(name="North Distribution Center", code="NDC", address="Sector 5, Gandhinagar Industrial Area, Gujarat 382016")
    csu = Warehouse(name="Cold Storage Unit",         code="CSU", address="Village Bavla, Ahmedabad District, Gujarat 382220")
    db.add_all([wh, ndc, csu])
    await db.flush()
    print("✓ Warehouses: WH, NDC, CSU")
    return wh, ndc, csu


async def seed_locations(db, wh, ndc, csu):
    raw = [
        # Main Warehouse
        ("WH/Stock",        wh,  "internal"),
        ("WH/Input",        wh,  "internal"),
        ("WH/Output",       wh,  "internal"),
        ("WH/Production",   wh,  "internal"),
        ("WH/Rack-A",       wh,  "internal"),
        ("WH/Rack-B",       wh,  "internal"),
        # North DC
        ("NDC/Stock",       ndc, "internal"),
        ("NDC/Input",       ndc, "internal"),
        ("NDC/Output",      ndc, "internal"),
        # Cold Storage
        ("CSU/Cold-Zone-1", csu, "internal"),
        ("CSU/Cold-Zone-2", csu, "internal"),
        # Virtual / External
        ("Vendors",                       None, "vendor"),
        ("Customers",                     None, "customer"),
        ("Virtual/Inventory Adjustments", None, "virtual"),
        ("Virtual/Scrap",                 None, "virtual"),
    ]
    locs = {}
    for name, whouse, ltype in raw:
        l = Location(name=name, warehouse_id=whouse.id if whouse else None, location_type=ltype)
        db.add(l)
        locs[name] = l
    await db.flush()
    print(f"✓ Locations: {len(raw)}")
    return locs


async def seed_categories(db):
    cats_raw = [
        ("Electronics",      "Consumer electronics, dev boards, cables and components"),
        ("Raw Materials",     "Industrial raw materials — steel, aluminium, copper, PVC"),
        ("Packaging",         "Corrugated boxes, bubble wrap, stretch film, tapes"),
        ("Office Supplies",   "Paper, stationery, furniture and office equipment"),
        ("Machinery Parts",   "Bearings, belts, seals and industrial spare parts"),
        ("Food & Beverages",  "Perishable and non-perishable food items — cold storage"),
        ("Chemicals",         "Industrial and laboratory chemicals — IPA, acetone"),
        ("Safety Equipment",  "PPE — helmets, gloves, goggles and safety gear"),
    ]
    cats = {}
    for name, desc in cats_raw:
        c = ProductCategory(name=name, description=desc, is_active=True)
        db.add(c)
        cats[name] = c
    await db.flush()
    print(f"✓ Categories: {len(cats_raw)}")
    return cats


async def seed_products(db, cats):
    # (name, sku, category, uom, min_qty, cost, sale)
    raw = [
        # Electronics
        ("Arduino Uno R3",           "ELEC-ARD-001", "Electronics",     "Units",  10, 350.0,  499.0),
        ("Raspberry Pi 4 (4GB)",     "ELEC-RPI-002", "Electronics",     "Units",   5, 3200.0, 4500.0),
        ("ESP32 Dev Board",          "ELEC-ESP-003", "Electronics",     "Units",  15, 180.0,  299.0),
        ("16x2 LCD Display",         "ELEC-LCD-004", "Electronics",     "Units",  10,  85.0,  149.0),
        ("DC Motor 12V",             "ELEC-MOT-005", "Electronics",     "Units",   8, 220.0,  349.0),
        ("Li-Ion Battery 18650",     "ELEC-BAT-006", "Electronics",     "Units",  30,  95.0,  149.0),
        ("HDMI Cable 2m",            "ELEC-HDM-007", "Electronics",     "Units",  20, 120.0,  199.0),
        # Raw Materials
        ("Steel Rod 10mm x 1m",      "RAW-STL-001",  "Raw Materials",   "Pieces", 20, 180.0,  250.0),
        ("Aluminium Sheet 2mm",      "RAW-ALU-002",  "Raw Materials",   "Kg",     25, 320.0,  420.0),
        ("Copper Wire 1.5mm",        "RAW-COP-003",  "Raw Materials",   "Meters", 50,  45.0,   65.0),
        ("PVC Pipe 1 inch",          "RAW-PVC-004",  "Raw Materials",   "Meters", 20,  55.0,   80.0),
        ("Mild Steel Plate 5mm",     "RAW-MSP-005",  "Raw Materials",   "Kg",     30, 280.0,  380.0),
        # Packaging
        ("Corrugated Box 12x10x8",   "PKG-BOX-001",  "Packaging",       "Units",  50,  18.0,   28.0),
        ("Bubble Wrap Roll 50m",     "PKG-BWR-002",  "Packaging",       "Rolls",   5, 350.0,  499.0),
        ("Stretch Film 500m",        "PKG-STF-003",  "Packaging",       "Rolls",   5, 280.0,  399.0),
        ("Packing Tape 48mm",        "PKG-TAP-004",  "Packaging",       "Units",  30,  22.0,   35.0),
        # Office Supplies
        ("A4 Paper Ream 500 sheets", "OFF-PAP-001",  "Office Supplies", "Reams",  20, 180.0,  249.0),
        ("Ball Pen Blue (Box 10)",   "OFF-PEN-001",  "Office Supplies", "Boxes",  10,  45.0,   65.0),
        ("Stapler Heavy Duty",       "OFF-STP-001",  "Office Supplies", "Units",   5, 320.0,  449.0),
        ("Whiteboard Marker Set",    "OFF-MRK-001",  "Office Supplies", "Sets",    8,  85.0,  120.0),
        # Machinery Parts
        ("Bearing 6205 ZZ",          "MCH-BRG-001",  "Machinery Parts", "Units",  20, 120.0,  180.0),
        ("V-Belt A-42",              "MCH-VBT-002",  "Machinery Parts", "Units",  15,  95.0,  149.0),
        ("Oil Seal 30x50x10",        "MCH-OSL-003",  "Machinery Parts", "Units",  15,  65.0,   99.0),
        ("Hydraulic Hose 1/2 inch",  "MCH-HYD-004",  "Machinery Parts", "Meters", 20, 180.0,  260.0),
        # Food & Beverages
        ("Wheat Flour 50kg Bag",     "FNB-WHT-001",  "Food & Beverages","Bags",   10, 1450.0, 1800.0),
        ("Refined Oil 15L Can",      "FNB-OIL-002",  "Food & Beverages","Cans",    8, 1850.0, 2200.0),
        ("Sugar 50kg Bag",           "FNB-SUG-003",  "Food & Beverages","Bags",   10, 1750.0, 2100.0),
        # Chemicals
        ("IPA 99% 5L Can",           "CHM-IPA-001",  "Chemicals",       "Cans",    5,  850.0, 1200.0),
        ("Acetone 5L Can",           "CHM-ACT-002",  "Chemicals",       "Cans",    5,  780.0, 1100.0),
        # Safety Equipment
        ("Safety Helmet ISI",        "SAF-HLM-001",  "Safety Equipment","Units",  20, 280.0,  399.0),
        ("Safety Gloves Cut-5",      "SAF-GLV-002",  "Safety Equipment","Pairs",  30, 120.0,  180.0),
        ("Safety Goggles",           "SAF-GOG-003",  "Safety Equipment","Units",  15,  95.0,  149.0),
    ]
    prods = {}
    for name, sku, cat, uom, min_qty, cost, sale in raw:
        p = Product(name=name, sku=sku, category_id=cats[cat].id,
                    unit_of_measure=uom, min_stock_qty=min_qty,
                    cost_price=cost, sale_price=sale, is_active=True)
        db.add(p)
        prods[sku] = p
    await db.flush()
    print(f"✓ Products: {len(raw)}")
    return prods


async def seed_stock_levels(db, prods, locs):
    L = locs
    # (sku, location_name, qty)  — intentional low/out-of-stock for dashboard alerts
    dist = [
        # Electronics → WH/Rack-A  (healthy stock)
        ("ELEC-ARD-001", "WH/Rack-A",  120),
        ("ELEC-RPI-002", "WH/Rack-A",   35),
        ("ELEC-ESP-003", "WH/Rack-A",  200),
        ("ELEC-LCD-004", "WH/Rack-A",   80),
        ("ELEC-MOT-005", "WH/Rack-A",   60),
        ("ELEC-BAT-006", "WH/Rack-A",  350),
        ("ELEC-BAT-006", "NDC/Stock",  150),
        ("ELEC-HDM-007", "WH/Rack-A",  150),
        # Raw Materials → WH/Stock + NDC
        ("RAW-STL-001",  "WH/Stock",   200),
        ("RAW-STL-001",  "NDC/Stock",  100),
        ("RAW-ALU-002",  "WH/Stock",   300),
        ("RAW-ALU-002",  "NDC/Stock",  100),
        ("RAW-COP-003",  "WH/Stock",   600),
        ("RAW-COP-003",  "NDC/Stock",  200),
        ("RAW-PVC-004",  "WH/Stock",   150),
        ("RAW-MSP-005",  "WH/Stock",   400),
        # Packaging → WH/Rack-B
        ("PKG-BOX-001",  "WH/Rack-B",  600),
        ("PKG-BOX-001",  "NDC/Stock",  200),
        ("PKG-BWR-002",  "WH/Rack-B",   30),
        ("PKG-STF-003",  "WH/Rack-B",   25),
        ("PKG-TAP-004",  "WH/Rack-B",  250),
        # Office — LOW STOCK & OUT OF STOCK (triggers dashboard alerts)
        ("OFF-PAP-001",  "WH/Stock",     8),   # LOW  (min=20)
        ("OFF-PEN-001",  "WH/Stock",     0),   # OUT OF STOCK
        ("OFF-STP-001",  "WH/Stock",    25),
        ("OFF-MRK-001",  "WH/Stock",    50),
        # Machinery → WH/Rack-B — one LOW STOCK
        ("MCH-BRG-001",  "WH/Rack-B",  180),
        ("MCH-VBT-002",  "WH/Rack-B",   90),
        ("MCH-OSL-003",  "WH/Rack-B",  110),
        ("MCH-HYD-004",  "WH/Rack-B",   12),  # LOW  (min=20)
        # Food → Cold Storage
        ("FNB-WHT-001",  "CSU/Cold-Zone-1", 70),
        ("FNB-OIL-002",  "CSU/Cold-Zone-1", 45),
        ("FNB-SUG-003",  "CSU/Cold-Zone-1", 55),
        # Chemicals → WH/Stock — one OUT OF STOCK
        ("CHM-IPA-001",  "WH/Stock",    35),
        ("CHM-ACT-002",  "WH/Stock",     0),   # OUT OF STOCK
        # Safety → WH/Stock
        ("SAF-HLM-001",  "WH/Stock",   130),
        ("SAF-GLV-002",  "WH/Stock",   180),
        ("SAF-GOG-003",  "WH/Stock",    90),
    ]
    for sku, loc_name, qty in dist:
        sl = StockLevel(product_id=prods[sku].id, location_id=L[loc_name].id, quantity=qty)
        db.add(sl)
    await db.flush()
    print(f"✓ Stock levels: {len(dist)} entries (2 out-of-stock, 2 low-stock)")


async def seed_reorder_rules(db, prods):
    rules = [
        # Products that are low or out of stock get reorder rules
        ("OFF-PAP-001",  20, 100),
        ("OFF-PEN-001",  10,  50),
        ("MCH-HYD-004",  20,  80),
        ("CHM-ACT-002",   5,  30),
        ("ELEC-RPI-002",  5,  30),
        ("PKG-BWR-002",   5,  25),
        ("PKG-STF-003",   5,  20),
        ("FNB-OIL-002",   8,  40),
    ]
    for sku, mn, mx in rules:
        db.add(ReorderRule(product_id=prods[sku].id, min_qty=mn, max_qty=mx, is_active=True))
    await db.flush()
    print(f"✓ Reorder rules: {len(rules)}")


async def seed_operations(db, prods, locs, admin, s1, s2):
    L = locs

    def op(ref, otype, status, partner, src, dst, days_ago, notes, user, days_validated=None):
        validated = (now - timedelta(days=days_validated)) if days_validated is not None else None
        return StockOperation(
            reference=ref, operation_type=otype, status=status,
            partner_name=partner,
            source_location_id=L[src].id, dest_location_id=L[dst].id,
            scheduled_date=now - timedelta(days=days_ago),
            validated_at=validated, notes=notes, created_by=user.id,
        )

    # ── RECEIPTS ──────────────────────────────────────────────────────────────
    # Covers: done, ready, draft, cancelled — all statuses visible in UI
    rec1 = op("REC/2025/001", MoveType.receipt, OperationStatus.done,
              "Robocraze Electronics Pvt Ltd", "Vendors", "WH/Rack-A",
              20, "Bulk electronics — Q1 replenishment", admin, days_validated=19)

    rec2 = op("REC/2025/002", MoveType.receipt, OperationStatus.done,
              "Tata Steel Distributors", "Vendors", "WH/Stock",
              15, "Steel & aluminium raw material delivery", admin, days_validated=14)

    rec3 = op("REC/2025/003", MoveType.receipt, OperationStatus.done,
              "Sigma Chemicals Ltd", "Vendors", "WH/Stock",
              10, "IPA and acetone restock", s1, days_validated=9)

    rec4 = op("REC/2025/004", MoveType.receipt, OperationStatus.ready,
              "Packman Supplies Co.", "Vendors", "WH/Rack-B",
              2, "Packaging restock — boxes and bubble wrap", s1)

    rec5 = op("REC/2025/005", MoveType.receipt, OperationStatus.draft,
              "Gujarat Agro Foods Ltd", "Vendors", "CSU/Cold-Zone-1",
              0, "Monthly food stock replenishment", s2)

    rec6 = op("REC/2025/006", MoveType.receipt, OperationStatus.cancelled,
              "FastParts India", "Vendors", "WH/Rack-B",
              12, "Cancelled — supplier unable to deliver on time", admin)

    # ── DELIVERIES ────────────────────────────────────────────────────────────
    del1 = op("DEL/2025/001", MoveType.delivery, OperationStatus.done,
              "Infosys Technologies Ltd", "WH/Output", "Customers",
              12, "Office supplies delivery — Q1 order", s1, days_validated=11)

    del2 = op("DEL/2025/002", MoveType.delivery, OperationStatus.done,
              "Reliance Industries Ltd", "WH/Output", "Customers",
              8, "Electronics components delivery", admin, days_validated=7)

    del3 = op("DEL/2025/003", MoveType.delivery, OperationStatus.ready,
              "Wipro Limited", "WH/Output", "Customers",
              1, "Machinery parts order — urgent", s2)

    del4 = op("DEL/2025/004", MoveType.delivery, OperationStatus.draft,
              "Adani Enterprises", "WH/Output", "Customers",
              0, "Safety equipment bulk order", s1)

    # ── INTERNAL TRANSFERS ────────────────────────────────────────────────────
    int1 = op("INT/2025/001", MoveType.internal, OperationStatus.done,
              None, "WH/Stock", "NDC/Stock",
              18, "Replenish North DC from Main Warehouse", admin, days_validated=17)

    int2 = op("INT/2025/002", MoveType.internal, OperationStatus.done,
              None, "WH/Rack-A", "WH/Production",
              6, "Move electronics to production floor", s1, days_validated=5)

    int3 = op("INT/2025/003", MoveType.internal, OperationStatus.ready,
              None, "WH/Rack-A", "WH/Output",
              1, "Pick electronics for DEL/2025/003", s1)

    int4 = op("INT/2025/004", MoveType.internal, OperationStatus.draft,
              None, "NDC/Stock", "CSU/Cold-Zone-1",
              0, "Transfer food items to cold storage", s2)

    # ── ADJUSTMENTS ───────────────────────────────────────────────────────────
    adj1 = op("ADJ/2025/001", MoveType.adjustment, OperationStatus.done,
              None, "Virtual/Inventory Adjustments", "WH/Stock",
              6, "Physical count — found 15 extra safety helmets", admin, days_validated=6)

    adj2 = op("ADJ/2025/002", MoveType.adjustment, OperationStatus.done,
              None, "WH/Rack-B", "Virtual/Inventory Adjustments",
              3, "Write-off — 5 damaged corrugated boxes", s1, days_validated=3)

    adj3 = op("ADJ/2025/003", MoveType.adjustment, OperationStatus.draft,
              None, "Virtual/Inventory Adjustments", "WH/Stock",
              0, "Scheduled quarterly physical inventory count", admin)

    all_ops = [rec1,rec2,rec3,rec4,rec5,rec6, del1,del2,del3,del4,
               int1,int2,int3,int4, adj1,adj2,adj3]
    for o in all_ops: db.add(o)
    await db.flush()
    print(f"✓ Operations: {len(all_ops)} (receipts×6, deliveries×4, transfers×4, adjustments×3)")
    return (rec1,rec2,rec3,rec4,rec5,rec6,
            del1,del2,del3,del4,
            int1,int2,int3,int4,
            adj1,adj2,adj3)


async def seed_moves(db, ops, prods, locs):
    (rec1,rec2,rec3,rec4,rec5,rec6,
     del1,del2,del3,del4,
     int1,int2,int3,int4,
     adj1,adj2,adj3) = ops
    L = locs

    def mv(operation, sku, demand, done):
        return StockMove(
            operation_id=operation.id,
            product_id=prods[sku].id,
            demand_qty=demand, done_qty=done,
            source_location_id=operation.source_location_id,
            dest_location_id=operation.dest_location_id,
        )

    moves = [
        # REC/001 — Electronics receipt (done)
        mv(rec1,"ELEC-ARD-001", 50, 50), mv(rec1,"ELEC-RPI-002", 20, 20),
        mv(rec1,"ELEC-ESP-003", 80, 80), mv(rec1,"ELEC-BAT-006",200,200),
        mv(rec1,"ELEC-HDM-007", 40, 40),
        # REC/002 — Raw materials (done)
        mv(rec2,"RAW-STL-001",150,150), mv(rec2,"RAW-ALU-002",200,200),
        mv(rec2,"RAW-COP-003",300,300), mv(rec2,"RAW-MSP-005",100,100),
        # REC/003 — Chemicals (done)
        mv(rec3,"CHM-IPA-001", 20, 20), mv(rec3,"CHM-ACT-002", 15, 15),
        # REC/004 — Packaging (ready — not done yet)
        mv(rec4,"PKG-BOX-001",300,  0), mv(rec4,"PKG-BWR-002", 20,  0),
        mv(rec4,"PKG-STF-003", 15,  0), mv(rec4,"PKG-TAP-004",100,  0),
        # REC/005 — Food (draft)
        mv(rec5,"FNB-WHT-001", 30,  0), mv(rec5,"FNB-OIL-002", 20,  0),
        mv(rec5,"FNB-SUG-003", 25,  0),
        # REC/006 — Cancelled
        mv(rec6,"MCH-BRG-001", 50,  0), mv(rec6,"MCH-VBT-002", 30,  0),
        # DEL/001 — Office supplies (done)
        mv(del1,"OFF-PAP-001", 30, 30), mv(del1,"OFF-PEN-001", 20, 20),
        mv(del1,"OFF-STP-001",  5,  5),
        # DEL/002 — Electronics (done)
        mv(del2,"ELEC-ARD-001", 20, 20), mv(del2,"ELEC-ESP-003", 50, 50),
        mv(del2,"ELEC-HDM-007", 30, 30),
        # DEL/003 — Machinery (ready)
        mv(del3,"MCH-BRG-001", 40,  0), mv(del3,"MCH-VBT-002", 20,  0),
        mv(del3,"MCH-OSL-003", 25,  0),
        # DEL/004 — Safety (draft)
        mv(del4,"SAF-HLM-001", 50,  0), mv(del4,"SAF-GLV-002", 80,  0),
        mv(del4,"SAF-GOG-003", 30,  0),
        # INT/001 — WH→NDC (done)
        mv(int1,"RAW-STL-001",100,100), mv(int1,"RAW-ALU-002",100,100),
        mv(int1,"ELEC-BAT-006",150,150),
        # INT/002 — Rack-A→Production (done)
        mv(int2,"ELEC-ARD-001", 10, 10), mv(int2,"ELEC-ESP-003", 20, 20),
        mv(int2,"ELEC-MOT-005", 15, 15),
        # INT/003 — Pick for delivery (ready)
        mv(int3,"ELEC-ARD-001", 20,  0), mv(int3,"ELEC-ESP-003", 30,  0),
        # INT/004 — NDC→CSU (draft)
        mv(int4,"FNB-WHT-001", 20,  0),
        # ADJ/001 — Positive (done)
        mv(adj1,"SAF-HLM-001", 15, 15),
        # ADJ/002 — Negative write-off (done)
        mv(adj2,"PKG-BOX-001",  5,  5),
        # ADJ/003 — Pending count (draft)
        mv(adj3,"OFF-PAP-001", 12,  0), mv(adj3,"OFF-PEN-001", 30,  0),
    ]
    for m in moves: db.add(m)
    await db.flush()
    print(f"✓ Stock moves: {len(moves)}")


async def seed_activities(db, ops, admin, s1, s2):
    (rec1,rec2,rec3,rec4,rec5,rec6,
     del1,del2,del3,del4,
     int1,int2,int3,int4,
     adj1,adj2,adj3) = ops

    def act(op, user, atype, note, days_ago, hours_ago=0):
        return OperationActivity(
            operation_id=op.id, user_id=user.id,
            activity_type=atype, note=note,
            created_at=now - timedelta(days=days_ago, hours=hours_ago),
        )

    entries = [
        act(rec1, admin, "created",   "Receipt created for electronics order",          20),
        act(rec1, admin, "validated", "All items received and verified",                 19),
        act(rec2, admin, "created",   "Raw materials receipt created",                  15),
        act(rec2, s1,    "validated", "Materials unloaded and stocked in WH/Stock",     14),
        act(rec3, s1,    "created",   "Chemical receipt created",                       10),
        act(rec3, s1,    "validated", "IPA and acetone received and shelved",            9),
        act(rec4, s1,    "created",   "Packaging receipt scheduled — awaiting arrival",  2),
        act(rec5, s2,    "created",   "Food items receipt drafted",                      0),
        act(rec6, admin, "created",   "Machinery parts receipt created",                12),
        act(rec6, admin, "cancelled", "Supplier confirmed delay — order cancelled",     11),
        act(del1, s1,    "created",   "Delivery order created for Infosys",             13),
        act(del1, s1,    "validated", "Goods dispatched and signed off",                11),
        act(del2, admin, "created",   "Electronics delivery for Reliance",               9),
        act(del2, admin, "validated", "Delivery completed — POD received",               7),
        act(del3, s2,    "created",   "Urgent machinery parts delivery for Wipro",       1),
        act(del4, s1,    "created",   "Safety equipment order drafted for Adani",        0),
        act(int1, admin, "created",   "Transfer to NDC initiated",                      18),
        act(int1, s1,    "validated", "Transfer complete — NDC stock updated",          17),
        act(int2, s1,    "created",   "Electronics moved to production floor",           6),
        act(int2, s1,    "validated", "Production floor stocked",                        5),
        act(int3, s1,    "created",   "Pick list created for DEL/2025/003",              1),
        act(int4, s2,    "created",   "Cold storage transfer drafted",                   0),
        act(adj1, admin, "created",   "Physical count discrepancy found",                6, 2),
        act(adj1, admin, "validated", "+15 helmets added after recount confirmed",       6),
        act(adj2, s1,    "created",   "Damaged boxes identified during audit",           3, 1),
        act(adj2, admin, "validated", "5 boxes written off — damage confirmed",          3),
        act(adj3, admin, "created",   "Quarterly physical count scheduled",              0),
    ]
    for e in entries: db.add(e)
    await db.flush()
    print(f"✓ Operation activities: {len(entries)}")


async def seed_audit_logs(db, prods, cats, wh_cold, admin, s1, s2):
    entries = [
        AuditLog(user_id=admin.id, entity_type="warehouse",  entity_id=wh_cold.id,
                 action="create",   changes={"name": "Cold Storage Unit", "code": "CSU"},
                 created_at=now - timedelta(days=35)),
        AuditLog(user_id=admin.id, entity_type="category",   entity_id=cats["Safety Equipment"].id,
                 action="create",   changes={"name": "Safety Equipment"},
                 created_at=now - timedelta(days=34)),
        AuditLog(user_id=admin.id, entity_type="product",    entity_id=prods["ELEC-RPI-002"].id,
                 action="update",   changes={"cost_price": {"old": 2800.0, "new": 3200.0}},
                 created_at=now - timedelta(days=25)),
        AuditLog(user_id=admin.id, entity_type="product",    entity_id=prods["RAW-STL-001"].id,
                 action="update",   changes={"min_stock_qty": {"old": 10.0, "new": 20.0}},
                 created_at=now - timedelta(days=22)),
        AuditLog(user_id=s1.id,    entity_type="operation",  entity_id=1,
                 action="validate", changes={"status": {"old": "ready", "new": "done"}},
                 created_at=now - timedelta(days=19)),
        AuditLog(user_id=admin.id, entity_type="operation",  entity_id=6,
                 action="cancel",   changes={"status": {"old": "draft", "new": "cancelled"}, "reason": "Supplier delay"},
                 created_at=now - timedelta(days=11)),
        AuditLog(user_id=s1.id,    entity_type="operation",  entity_id=7,
                 action="validate", changes={"status": {"old": "ready", "new": "done"}},
                 created_at=now - timedelta(days=11)),
        AuditLog(user_id=admin.id, entity_type="product",    entity_id=prods["OFF-PAP-001"].id,
                 action="update",   changes={"min_stock_qty": {"old": 10.0, "new": 20.0}},
                 created_at=now - timedelta(days=5)),
        AuditLog(user_id=admin.id, entity_type="operation",  entity_id=15,
                 action="validate", changes={"status": {"old": "draft", "new": "done"}, "qty_adjusted": 15},
                 created_at=now - timedelta(days=6)),
        AuditLog(user_id=s2.id,    entity_type="product",    entity_id=prods["FNB-WHT-001"].id,
                 action="update",   changes={"sale_price": {"old": 1650.0, "new": 1800.0}},
                 created_at=now - timedelta(days=4)),
    ]
    for e in entries: db.add(e)
    await db.flush()
    print(f"✓ Audit logs: {len(entries)}")


# ─────────────────────────────────────────────────────────────────────────────
async def main():
    # Step 1 — clear everything
    async with engine.begin() as conn:
        await clear_all(conn)

    async with AsyncSessionLocal() as db:
        # Step 2 — users
        admin, s1, s2 = await seed_users(db)

        # Step 3 — warehouses & locations
        wh, ndc, csu = await seed_warehouses(db)
        locs = await seed_locations(db, wh, ndc, csu)

        # Step 4 — categories & products
        cats  = await seed_categories(db)
        prods = await seed_products(db, cats)

        # Step 5 — stock levels & reorder rules
        await seed_stock_levels(db, prods, locs)
        await seed_reorder_rules(db, prods)

        # Step 6 — operations, moves, activities, audit logs
        ops = await seed_operations(db, prods, locs, admin, s1, s2)
        await seed_moves(db, ops, prods, locs)
        await seed_activities(db, ops, admin, s1, s2)
        await seed_audit_logs(db, prods, cats, csu, admin, s1, s2)

        await db.commit()

    print("\n✅  Seed complete — database is ready!")
    print("   Admin : patelpanthi305@gmail.com  /  Admin@1234")
    print("   Staff : raj.mehta@coreinventory.com  /  Staff@1234")
    print("   Staff : priya.shah@coreinventory.com  /  Staff@1234")


if __name__ == "__main__":
    asyncio.run(main())
