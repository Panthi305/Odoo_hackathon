# CoreInventory — Inventory Management System

> Odoo Hackathon 2026 | Full-Stack IMS built with FastAPI + React

CoreInventory is a production-ready Inventory Management System that handles products, stock operations (receipts, deliveries, transfers, adjustments), reorder rules, audit logging, and multi-user role-based access — all with a clean, responsive UI.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | FastAPI (Python 3.11+), SQLAlchemy 2.0 async ORM |
| Database | PostgreSQL (Aiven cloud) via asyncpg |
| Frontend | React 19 + TypeScript + Vite |
| Styling | TailwindCSS v4 |
| Auth | JWT (access + refresh) + OTP email + Google OAuth |
| Rate Limiting | SlowAPI (IP-based) |
| Email | SMTP via Gmail |
| Icons | Lucide React |
| Animations | Framer Motion |

---

## Features

### Inventory Management
- **Products** — full CRUD with SKU, category, pricing, reorder point, image upload (JPEG/PNG/WebP/GIF, max 5MB)
- **Stock Operations** — Receipts, Deliveries, Internal Transfers, Adjustments with multi-line product moves
- **Stock Levels** — per-location stock tracking, auto-updated on operation validation
- **Move History** — paginated stock move ledger with filters and CSV export
- **Reorder Rules** — per-product min/max qty rules with live stock alert indicators
- **Warehouses & Locations** — multi-warehouse support, auto-creates Stock/Input/Output locations on warehouse creation
- **Product Categories** — categorize products with soft delete

### Dashboard & Analytics
- KPI cards: Total Products, Low Stock, Out of Stock, Total Stock Value
- Pending operation counts (Receipts, Deliveries, Transfers)
- Charts: Stock Movement Trend (7 days), Operations per Day (7 days), Stock by Warehouse
- Recent operations table with type + status filters

### Auth & Users
- Email/password signup with OTP email verification (6-digit, 5 min TTL)
- JWT access tokens (15 min) + refresh tokens (7 days) with auto-refresh on 401
- Google OAuth (one-click login)
- Forgot password via OTP reset flow
- Role-based access: `admin` (Inventory Manager) / `staff` (Warehouse Staff)
- Admin-only: User Management (toggle roles), Settings, Audit Logs

### Audit & Compliance
- Full audit log on every create/update/delete/validate/cancel with field-level change tracking
- Operation activity timeline (who created, edited, validated, cancelled)
- CSV export for products, operations, and stock ledger

### Other
- Contact form with dual email (user confirmation + admin notification)
- Responsive sidebar layout with collapsible nav, mobile hamburger menu
- Live stock alert badge in sidebar with dropdown
- Soft deletes on products, categories, warehouses, locations

---

## Project Structure

```
root/
├── odoo-backend/               # FastAPI backend
│   ├── app/
│   │   ├── main.py             # App entry, middleware, startup seeding
│   │   ├── config.py           # Pydantic settings from .env
│   │   ├── database.py         # Async SQLAlchemy engine + session
│   │   ├── models/             # ORM models (User, Product, StockOperation, etc.)
│   │   ├── schemas/            # Pydantic request/response schemas
│   │   ├── routers/            # Route handlers (auth, oauth, inventory, contact)
│   │   ├── services/           # Business logic layer
│   │   └── utils/              # JWT handler, password hash, OTP generator
│   ├── .env                    # Environment variables
│   └── requirements.txt
│
└── odoo-frontend/              # React + TypeScript frontend
    ├── src/
    │   ├── App.tsx             # Router + protected/admin route guards
    │   ├── context/            # AuthContext (global auth state + localStorage)
    │   ├── api/                # Axios clients with auto token refresh interceptor
    │   ├── pages/              # All page components
    │   │   ├── Home/           # Landing page sections
    │   │   ├── Login.tsx       # Login / Signup / OTP / OAuth
    │   │   ├── Contact/        # Contact form
    │   │   └── app/            # Protected IMS pages
    │   └── components/         # Navbar, Footer, IMSLayout (sidebar), UI primitives
    └── .env                    # VITE_API_URL
```

---

## Getting Started

### Prerequisites
- Python 3.11+
- Node.js 18+
- npm

### 1. Clone the repo

```bash
git clone <repo-url>
cd <repo-folder>
```

### 2. Backend Setup

```bash
cd odoo-backend

# Create and activate virtual environment
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # macOS/Linux

# Install dependencies
pip install -r requirements.txt

# Start the server
uvicorn app.main:app --reload
```

Backend runs at: `http://localhost:8000`  
Interactive API docs: `http://localhost:8000/docs`

### 3. Frontend Setup

```bash
cd odoo-frontend

npm install
npm run dev
```

Frontend runs at: `http://localhost:5173`

### 4. Environment Variables

**`odoo-backend/.env`**
```env
DATABASE_URL=postgresql+asyncpg://<user>:<password>@<host>:<port>/<db>?ssl=require
JWT_SECRET=your_secret_key
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=15
REFRESH_TOKEN_EXPIRE_DAYS=7

SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
SMTP_EMAIL=your@email.com
SMTP_PASSWORD=your_app_password

GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

FRONTEND_URL=http://localhost:5173
BACKEND_URL=http://localhost:8000
```

**`odoo-frontend/.env`**
```env
VITE_API_URL=http://localhost:8000
```

> On first startup, the backend auto-creates all database tables and seeds 1 default warehouse with 7 locations (Stock, Input, Output, Production, Vendors, Customers, Virtual/Adjustments).

---

## API Reference

### Auth (`/auth`)
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/auth/signup` | — | Register + send OTP |
| POST | `/auth/verify-otp` | — | Verify email OTP |
| POST | `/auth/login` | — | Login → JWT pair |
| POST | `/auth/refresh` | — | Refresh access token |
| POST | `/auth/forgot-password` | — | Send password reset OTP |
| POST | `/auth/reset-password` | — | Reset password with OTP |
| GET | `/auth/users` | Admin | List all users |
| PUT | `/auth/users/{id}/role` | Admin | Update user role |

### OAuth (`/oauth`)
| Method | Endpoint | Description |
|---|---|---|
| GET | `/oauth/google/login` | Redirect to Google |
| GET | `/oauth/google/callback` | Handle Google callback |

### Inventory (`/inventory`)
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/inventory/dashboard` | Any | KPIs + charts |
| GET/POST | `/inventory/categories` | Any/Admin | List or create |
| PUT/DELETE | `/inventory/categories/{id}` | Admin | Update or soft-delete |
| GET/POST | `/inventory/warehouses` | Any/Admin | List or create |
| PUT/DELETE | `/inventory/warehouses/{id}` | Admin | Update or soft-delete |
| GET/POST | `/inventory/locations` | Any/Admin | List or create |
| DELETE | `/inventory/locations/{id}` | Admin | Soft-delete |
| GET/POST | `/inventory/products` | Any/Admin | Paginated list or create |
| GET/PUT/DELETE | `/inventory/products/{id}` | Any/Admin | Detail, update, soft-delete |
| POST | `/inventory/products/{id}/image` | Admin | Upload product image |
| GET | `/inventory/products/{id}/stock` | Any | Stock by location |
| GET/POST | `/inventory/operations` | Any | List or create operation |
| GET/PUT | `/inventory/operations/{id}` | Any | Detail or update |
| POST | `/inventory/operations/{id}/validate` | Any | Validate → update stock |
| POST | `/inventory/operations/{id}/cancel` | Any | Cancel operation |
| GET | `/inventory/moves/history` | Any | Stock move ledger |
| GET | `/inventory/alerts` | Any | Low/out-of-stock alerts |
| GET/POST | `/inventory/reorder-rules` | Any/Admin | List or create |
| PUT/DELETE | `/inventory/reorder-rules/{id}` | Admin | Update or delete |
| GET | `/inventory/audit-logs` | Admin | Paginated audit logs |
| GET | `/inventory/export/products` | Any | CSV export |
| GET | `/inventory/export/operations` | Any | CSV export |
| GET | `/inventory/export/stock-ledger` | Any | CSV export |

### Contact (`/contact`)
| Method | Endpoint | Description |
|---|---|---|
| POST | `/contact/send` | Send contact form email |

---

## Database Models

| Model | Table | Key Fields |
|---|---|---|
| User | `users` | name, email, password_hash, role (admin/staff), oauth_provider |
| OTPCode | `otp_codes` | email, otp, expires_at |
| ProductCategory | `product_categories` | name, is_active |
| Warehouse | `warehouses` | name, code (unique), address, soft delete |
| Location | `locations` | name, warehouse_id, location_type (internal/vendor/customer/virtual) |
| Product | `products` | name, sku (unique), category_id, cost_price, sale_price, min_stock_qty, image_url |
| StockLevel | `stock_levels` | product_id, location_id, quantity |
| StockOperation | `stock_operations` | reference, operation_type, status, source/dest location, created_by |
| StockMove | `stock_moves` | operation_id, product_id, demand_qty, done_qty |
| ReorderRule | `reorder_rules` | product_id (unique), min_qty, max_qty |
| AuditLog | `audit_logs` | user_id, entity_type, entity_id, action, changes (JSON) |
| OperationActivity | `operation_activities` | operation_id, user_id, activity_type, note |

---

## Stock Operation Logic

| Type | Source → Destination | Stock Effect |
|---|---|---|
| Receipt | Vendor → Internal | +qty at destination |
| Delivery | Internal → Customer | −qty at source (checks availability) |
| Internal Transfer | Internal → Internal | −qty at source, +qty at destination |
| Adjustment | Virtual → Internal | Sets qty to exact done_qty (absolute override) |

References are auto-generated: `REC/XXXXXX`, `DEL/XXXXXX`, `INT/XXXXXX`, `ADJ/XXXXXX`.

---

## Security

| Feature | Implementation |
|---|---|
| Password hashing | bcrypt via passlib |
| JWT tokens | HS256, access 15 min / refresh 7 days |
| Email verification | 6-digit OTP, 5 min TTL, deleted after use |
| Rate limiting | SlowAPI: 5–20 req/min per endpoint |
| Role-based access | admin/staff enforced at router + frontend level |
| Image upload | Content-type whitelist + 5MB size cap |
| OAuth | Authlib + Starlette session middleware |
| Audit trail | Every mutation logged with user + field-level changes |
| Soft deletes | Products, categories, warehouses, locations |

---

## Default Credentials (Seeded)

The database is not pre-seeded with users. Register via the signup form and verify your email OTP. To make a user admin, use the User Management page (first admin must be set via the role endpoint or directly in the DB).

---

## Screenshots

> Dashboard, Products, Operations, and Settings pages are accessible after login at `http://localhost:5173`.

---

## License

Built for Odoo Hackathon 2026. All rights reserved.
