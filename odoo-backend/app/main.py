from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
from starlette.middleware.sessions import SessionMiddleware
from contextlib import asynccontextmanager
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from app.database import init_db, AsyncSessionLocal
from app.routers import auth_routes, oauth_routes, contact_routes, inventory_routes
from app.config import get_settings
import os
import traceback

settings = get_settings()

# Ensure upload directory exists
UPLOAD_DIR = "uploads/products"
os.makedirs(UPLOAD_DIR, exist_ok=True)

limiter = Limiter(key_func=get_remote_address)


async def seed_default_data():
    from sqlalchemy import select
    from app.models.inventory import Location, Warehouse
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Location).limit(1))
        if result.scalar_one_or_none():
            return
        wh = Warehouse(name="Main Warehouse", code="WH", address="Main Storage Facility")
        db.add(wh)
        await db.flush()
        locations = [
            Location(name="WH/Stock", warehouse_id=wh.id, location_type="internal"),
            Location(name="WH/Input", warehouse_id=wh.id, location_type="internal"),
            Location(name="WH/Output", warehouse_id=wh.id, location_type="internal"),
            Location(name="WH/Production", warehouse_id=wh.id, location_type="internal"),
            Location(name="Vendors", warehouse_id=None, location_type="vendor"),
            Location(name="Customers", warehouse_id=None, location_type="customer"),
            Location(name="Virtual/Inventory Adjustments", warehouse_id=None, location_type="virtual"),
        ]
        for loc in locations:
            db.add(loc)
        await db.commit()


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    await seed_default_data()
    yield


app = FastAPI(title="CoreInventory API", lifespan=lifespan)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS must be added FIRST (outermost middleware) so headers are present even on 500s
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        settings.FRONTEND_URL,
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(
    SessionMiddleware,
    secret_key=settings.JWT_SECRET,
    max_age=3600
)

# Serve uploaded product images
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

app.include_router(auth_routes.router)
app.include_router(oauth_routes.router)
app.include_router(contact_routes.router)
app.include_router(inventory_routes.router)


@app.get("/")
async def root():
    return {"message": "CoreInventory API is running"}


@app.get("/health")
async def health():
    return {"status": "healthy"}


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    traceback.print_exc()
    return JSONResponse(
        status_code=500,
        content={"detail": f"Internal server error: {str(exc)}"},
    )
