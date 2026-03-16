# CoreInventory — Full Project Analysis

> Odoo Hackathon 2026 | Full-Stack Inventory Management System

---

## 1. Project Overview

CoreInventory is a full-stack Inventory Management System (IMS) built for the Odoo Hackathon 2026.

- **Backend**: FastAPI (Python) + PostgreSQL (Aiven cloud) + SQLAlchemy async ORM
- **Frontend**: React 18 + TypeScript + Vite + TailwindCSS
- **Auth**: JWT (access + refresh tokens) + OTP email verification + Google/GitHub OAuth
- **Database**: Async PostgreSQL via asyncpg driver, hosted on Aiven free tier

---

## 2. Project Structure

```
root/
├── odoo-backend/          # FastAPI Python backend
│   ├── app/
│   │   ├── main.py        # App entry, middleware, lifespan, seeding
│   │   ├── config.py      # Pydantic settings from .env
│   │   ├── database.py    # Async SQLAlchemy engine + session
│   │   ├── models/        # SQLAlchemy ORM models
│   │   ├── schemas/       # Pydantic request/response schemas
│   │   ├── routers/       # FastAPI route handlers
│   │   ├── services/      # Business logic layer
│   │   └── utils/         # JWT, password hash, OTP generator
│   ├── .env               # Environment variables
│   └── requirements.txt   # Python dependencies
│
└── odoo-frontend/         # React + TypeScript frontend
    ├── src/
    │   ├── App.tsx         # Router + protected routes
    │   ├── context/        # AuthContext (global auth state)
    │   ├── api/            # Axios API clients
    │   ├── pages/          # All page components
    │   └── components/     # Reusable UI components
    └── .env                # VITE_API_URL
```

---

## 3. Backend — Detailed Analysis

### 3.1 Entry Point: `main.py`

- Creates FastAPI app with title `CoreInventory API`
- **Lifespan**: on startup runs `init_db()` (creates all tables) then `seed_default_data()` (seeds 1 warehouse + 7 default locations if none exist)
- **Middlewares applied**:
  - `SessionMiddleware` (itsdangerous, for OAuth session state)
  - `CORSMiddleware` (allow all origins — suitable for hackathon, not production)
  - `SlowAPI` rate limiter (IP-based via `get_remote_address`)
  - `RateLimitExceeded` exception handler
- **Static files**: `/uploads` directory served for product images
- **Routers included**: auth, oauth, contact, inventory

### 3.2 Config: `config.py`

Uses `pydantic-settings` `BaseSettings` with `lru_cache` for singleton pattern.

Settings loaded from `.env`:
- `DATABASE_URL`, `JWT_SECRET`, `JWT_ALGORITHM`, `ACCESS_TOKEN_EXPIRE_MINUTES` (15), `REFRESH_TOKEN_EXPIRE_DAYS` (7)
- `SMTP_SERVER`, `SMTP_PORT`, `SMTP_EMAIL`, `SMTP_PASSWORD`
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`
- `FRONTEND_URL`, `BACKEND_URL`

### 3.3 Database: `database.py`

- Async SQLAlchemy engine with `NullPool` (no persistent connections — required for Aiven free tier connection limit)
- `AsyncSessionLocal` via `async_sessionmaker`
- `get_db()` dependency yields session, closes on exit
- `init_db()` runs `Base.metadata.create_all` on startup

---

## 4. Database Models

### 4.1 `User` (`users` table)
| Column | Type | Notes |
|---|---|---|
| id | Integer PK | |
| name | String | NOT NULL |
| email | String | UNIQUE, indexed, NOT NULL |
| password_hash | String | nullable (OAuth users have no password) |
| is_verified | Boolean | default False |
| role | String | default "staff" — values: "admin" / "staff" |
| oauth_provider | String | nullable — "google" / "github" |
| oauth_id | String | nullable |
| created_at | DateTime | server_default now() |

### 4.2 `OTPCode` (`otp_codes` table)
| Column | Type | Notes |
|---|---|---|
| id | Integer PK | |
| email | String | indexed |
| otp | String | 6-digit code |
| expires_at | DateTime | UTC, 5 min TTL |

### 4.3 `ProductCategory` (`product_categories` table)
| Column | Type | Notes |
|---|---|---|
| id | Integer PK | |
| name | String(100) | UNIQUE, NOT NULL |
| description | Text | nullable |
| is_active | Boolean | default True (soft delete) |
| created_at | DateTime | |

### 4.4 `Warehouse` (`warehouses` table)
| Column | Type | Notes |
|---|---|---|
| id | Integer PK | |
| name | String(100) | NOT NULL |
| code | String(20) | UNIQUE, NOT NULL |
| address | Text | nullable |
| is_active | Boolean | default True |
| deleted_at | DateTime | nullable (soft delete) |
| created_at | DateTime | |

### 4.5 `Location` (`locations` table)
| Column | Type | Notes |
|---|---|---|
| id | Integer PK | |
| name | String(100) | NOT NULL |
| warehouse_id | FK → warehouses | nullable |
| location_type | String(50) | internal / vendor / customer / virtual |
| is_active | Boolean | default True |
| deleted_at | DateTime | nullable (soft delete) |
| created_at | DateTime | |

### 4.6 `Product` (`products` table)
| Column | Type | Notes |
|---|---|---|
| id | Integer PK | |
| name | String(200) | NOT NULL |
| sku | String(100) | UNIQUE, NOT NULL |
| category_id | FK → product_categories | nullable |
| unit_of_measure | String(50) | default "Units" |
| description | Text | nullable |
| min_stock_qty | Float | default 0.0 (reorder point) |
| cost_price | Float | default 0.0 |
| sale_price | Float | default 0.0 |
| image_url | String(500) | nullable |
| is_active | Boolean | default True (soft delete) |
| created_at / updated_at | DateTime | |

### 4.7 `StockLevel` (`stock_levels` table)
| Column | Type | Notes |
|---|---|---|
| id | Integer PK | |
| product_id | FK → products | NOT NULL |
| location_id | FK → locations | NOT NULL |
| quantity | Float | default 0.0 |
| updated_at | DateTime | auto-updated |

### 4.8 `StockOperation` (`stock_operations` table)
| Column | Type | Notes |
|---|---|---|
| id | Integer PK | |
| reference | String(50) | UNIQUE (e.g. REC/001234) |
| operation_type | Enum(MoveType) | receipt/delivery/internal/adjustment |
| status | Enum(OperationStatus) | draft/waiting/ready/done/cancelled |
| partner_name | String(200) | nullable (supplier/customer) |
| source_location_id | FK → locations | nullable |
| dest_location_id | FK → locations | nullable |
| scheduled_date | DateTime | nullable |
| notes | Text | nullable |
| created_by | FK → users | nullable |
| validated_at | DateTime | nullable |
| created_at / updated_at | DateTime | |

### 4.9 `StockMove` (`stock_moves` table)
| Column | Type | Notes |
|---|---|---|
| id | Integer PK | |
| operation_id | FK → stock_operations | NOT NULL |
| product_id | FK → products | NOT NULL |
| demand_qty | Float | default 0.0 |
| done_qty | Float | default 0.0 |
| source_location_id | FK → locations | nullable |
| dest_location_id | FK → locations | nullable |
| created_at | DateTime | |

### 4.10 `ReorderRule` (`reorder_rules` table)
| Column | Type | Notes |
|---|---|---|
| id | Integer PK | |
| product_id | FK → products | UNIQUE (one rule per product) |
| min_qty | Float | trigger reorder below this |
| max_qty | Float | reorder up to this |
| is_active | Boolean | default True |
| created_at / updated_at | DateTime | |

### 4.11 `AuditLog` (`audit_logs` table)
| Column | Type | Notes |
|---|---|---|
| id | Integer PK | |
| user_id | FK → users | nullable |
| entity_type | String(50) | product/warehouse/category/operation/location |
| entity_id | Integer | NOT NULL |
| action | String(50) | create/update/delete/validate/cancel |
| changes | JSON | {field: {old, new}} |
| created_at | DateTime | |

### 4.12 `OperationActivity` (`operation_activities` table)
| Column | Type | Notes |
|---|---|---|
| id | Integer PK | |
| operation_id | FK → stock_operations | NOT NULL |
| user_id | FK → users | nullable |
| activity_type | String(50) | created/edited/validated/cancelled |
| note | Text | nullable |
| created_at | DateTime | |

---

## 5. Backend Validations

### 5.1 Pydantic Schema Validations (`schemas/`)

#### `inventory_schema.py`

**CategoryCreate**
- `name`: `@field_validator` — strips whitespace, raises `ValueError` if empty after strip

**WarehouseCreate**
- `name`, `code`: `@field_validator` — strips whitespace, raises if empty; uppercases if ≤10 chars

**LocationCreate**
- `location_type`: `@field_validator` — must be one of `{internal, vendor, customer, virtual}`

**ProductCreate**
- `name`, `sku`: `@field_validator` — strips whitespace, raises if empty
- `cost_price`, `sale_price`, `min_stock_qty`: `@field_validator` — raises if `< 0`

**ReorderRuleCreate**
- `min_qty`, `max_qty`: `@field_validator` — raises if `< 0`

**MoveLine**
- `demand_qty`: `@field_validator` — raises if `<= 0` (must be positive)

**OperationCreate**
- `lines`: `@field_validator` — raises if list is empty

**ValidateLine**
- `done_qty`: `@field_validator` — raises if `< 0`

#### `user_schema.py`
- `email`: uses Pydantic `EmailStr` — validates email format
- `UserCreate.password`: plain string (no length validation at schema level — handled in service)

#### `auth_schema.py`
- `OTPVerify.email`, `ForgotPassword.email`, `ResetPassword.email`: all use `EmailStr`

### 5.2 Service-Layer Validations (`services/`)

#### `auth_service.py`
- `create_user`: checks if email already registered → HTTP 400 "Email already registered"
- `authenticate_user`: checks user exists + password_hash present → HTTP 401 "Invalid credentials"
- `authenticate_user`: checks `is_verified` → HTTP 403 "Email not verified"

#### `inventory_service.py`

**Categories**
- `create_category`: checks duplicate name → HTTP 400 "Category already exists"
- `update_category` / `delete_category`: checks existence → HTTP 404

**Warehouses**
- `create_warehouse`: checks duplicate code → HTTP 400 "Warehouse code already exists"
- `update_warehouse` / `delete_warehouse`: checks existence → HTTP 404

**Locations**
- `delete_location`: checks existence → HTTP 404

**Products**
- `create_product`: checks duplicate SKU → HTTP 400 "SKU already exists"
- `create_product`: validates `category_id` exists → HTTP 404 "Category not found"
- `get_product`: checks existence → HTTP 404 "Product not found"

**Operations**
- `update_operation`: blocks edit if status is `done` or `cancelled` → HTTP 400
- `validate_operation`: blocks if already `done` → HTTP 400
- `validate_operation`: blocks if `cancelled` → HTTP 400
- `validate_operation`: checks `done_qty >= 0` per line → HTTP 400
- `validate_operation` (delivery): checks sufficient stock → HTTP 400 "Insufficient stock for product X. Available: Y, Requested: Z"
- `validate_operation` (internal): checks sufficient stock at source → HTTP 400
- `cancel_operation`: blocks if already `done` → HTTP 400

**Reorder Rules**
- `create_reorder_rule`: checks duplicate product_id → HTTP 400 "Reorder rule already exists for this product"
- `update_reorder_rule` / `delete_reorder_rule`: checks existence → HTTP 404

#### `otp_service.py`
- `verify_otp`: checks OTP exists in DB → returns False
- `verify_otp`: checks `expires_at` against UTC now → deletes expired OTP, returns False

#### `password_hash.py`
- Uses `passlib` bcrypt context — `hash_password` and `verify_password`

### 5.3 Router-Level Validations (`routers/`)

#### `auth_routes.py`
- Rate limits: signup `10/minute`, verify-otp `10/minute`, login `20/minute`, forgot-password `5/minute`, reset-password `5/minute`
- `update_user_role`: validates role is `"admin"` or `"staff"` → HTTP 400

#### `inventory_routes.py`
- `get_current_user`: verifies JWT token → HTTP 401 if invalid
- `require_admin`: checks `role == "admin"` → HTTP 403 if not admin
- `upload_product_image`: validates `content_type` in `{image/jpeg, image/png, image/webp, image/gif}` → HTTP 400
- `upload_product_image`: validates file size ≤ 5MB → HTTP 400
- Query params: `page >= 1`, `page_size` between 1–200 (FastAPI `Query` constraints)

### 5.4 JWT Validation (`utils/jwt_handler.py`)
- `verify_token`: decodes with `python-jose`, returns `None` on `JWTError`
- Access token has `type: "access"`, refresh token has `type: "refresh"`
- `refresh` endpoint checks `payload.get("type") != "refresh"` → HTTP 401

---

## 6. API Routes Reference

### Auth Routes (`/auth`)
| Method | Path | Auth | Rate Limit | Description |
|---|---|---|---|---|
| POST | `/auth/signup` | None | 10/min | Register user, send OTP |
| POST | `/auth/verify-otp` | None | 10/min | Verify email OTP |
| POST | `/auth/login` | None | 20/min | Login, returns JWT pair |
| POST | `/auth/refresh` | None | None | Refresh access token |
| POST | `/auth/forgot-password` | None | 5/min | Send password reset OTP |
| POST | `/auth/reset-password` | None | 5/min | Reset password with OTP |
| GET | `/auth/users` | Admin JWT | None | List all users |
| PUT | `/auth/users/{id}/role` | Admin JWT | None | Update user role |

### OAuth Routes (`/oauth`)
| Method | Path | Description |
|---|---|---|
| GET | `/oauth/google/login` | Redirect to Google OAuth |
| GET | `/oauth/google/callback` | Handle Google callback, redirect to frontend |
| GET | `/oauth/github/login` | Redirect to GitHub OAuth |
| GET | `/oauth/github/callback` | Handle GitHub callback, redirect to frontend |

### Inventory Routes (`/inventory`)
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/inventory/dashboard` | Any user | KPIs + charts + recent ops |
| GET | `/inventory/categories` | Any user | List active categories |
| POST | `/inventory/categories` | Admin | Create category |
| PUT | `/inventory/categories/{id}` | Admin | Update category |
| DELETE | `/inventory/categories/{id}` | Admin | Soft-delete category |
| GET | `/inventory/warehouses` | Any user | List warehouses |
| POST | `/inventory/warehouses` | Admin | Create warehouse + 3 default locations |
| PUT | `/inventory/warehouses/{id}` | Admin | Update warehouse |
| DELETE | `/inventory/warehouses/{id}` | Admin | Soft-delete warehouse |
| GET | `/inventory/locations` | Any user | List locations (filter by warehouse) |
| POST | `/inventory/locations` | Admin | Create location |
| DELETE | `/inventory/locations/{id}` | Admin | Soft-delete location |
| GET | `/inventory/products` | Any user | Paginated products (search, filter, sort) |
| GET | `/inventory/products/{id}` | Any user | Single product detail |
| POST | `/inventory/products` | Admin | Create product |
| PUT | `/inventory/products/{id}` | Admin | Update product |
| DELETE | `/inventory/products/{id}` | Admin | Soft-delete product |
| POST | `/inventory/products/{id}/image` | Admin | Upload product image |
| GET | `/inventory/products/{id}/stock` | Any user | Stock by location |
| GET | `/inventory/operations` | Any user | Paginated operations |
| GET | `/inventory/operations/{id}` | Any user | Single operation detail |
| POST | `/inventory/operations` | Any user | Create operation |
| PUT | `/inventory/operations/{id}` | Any user | Update operation |
| POST | `/inventory/operations/{id}/validate` | Any user | Validate + update stock |
| POST | `/inventory/operations/{id}/cancel` | Any user | Cancel operation |
| GET | `/inventory/moves/history` | Any user | Paginated stock move ledger |
| GET | `/inventory/alerts` | Any user | Low/out-of-stock alerts |
| GET | `/inventory/reorder-rules` | Any user | List reorder rules |
| POST | `/inventory/reorder-rules` | Admin | Create reorder rule |
| PUT | `/inventory/reorder-rules/{id}` | Admin | Update reorder rule |
| DELETE | `/inventory/reorder-rules/{id}` | Admin | Delete reorder rule |
| GET | `/inventory/audit-logs` | Admin | Paginated audit logs |
| GET | `/inventory/export/products` | Any user | CSV export products |
| GET | `/inventory/export/operations` | Any user | CSV export operations |
| GET | `/inventory/export/stock-ledger` | Any user | CSV export stock ledger |

### Contact Route (`/contact`)
| Method | Path | Description |
|---|---|---|
| POST | `/contact/send` | Send contact form — emails user + admin |

---

## 7. Business Logic — Key Flows

### 7.1 Stock Operation Validation Logic

When `POST /inventory/operations/{id}/validate` is called:

**Receipt** (`receipt`):
- Adds `done_qty` to `StockLevel` at `dest_location`

**Delivery** (`delivery`):
- Checks `StockLevel.quantity >= done_qty` at `source_location` → HTTP 400 if insufficient
- Subtracts `done_qty` from `StockLevel` at `source_location`

**Internal Transfer** (`internal`):
- Checks `StockLevel.quantity >= done_qty` at `source_location` → HTTP 400 if insufficient
- Subtracts from source, adds to destination

**Adjustment** (`adjustment`):
- Sets `StockLevel.quantity = done_qty` (absolute override, not delta)

After validation: sets `status = done`, `validated_at = now()`, logs activity + audit.

### 7.2 Reference Generation
Auto-generates unique references: `REC/XXXXXX`, `DEL/XXXXXX`, `INT/XXXXXX`, `ADJ/XXXXXX` (6 random digits).

### 7.3 Default Location Assignment
If `source_location_id` or `dest_location_id` not provided on operation create:
- Receipt → source: first vendor location, dest: first internal location
- Delivery → source: first internal, dest: first customer
- Adjustment → source: first virtual, dest: first internal
- Internal → source + dest: first internal

### 7.4 Warehouse Creation Auto-Locations
When a new warehouse is created, 3 locations are auto-created: `{CODE}/Stock`, `{CODE}/Input`, `{CODE}/Output` (all internal).

### 7.5 Audit Logging
Every create/update/delete/validate/cancel on products, categories, warehouses, locations, and operations writes an `AuditLog` record with `{field: {old, new}}` changes JSON.

### 7.6 Operation Activity Timeline
Every state change on an operation (created, edited, validated, cancelled) writes an `OperationActivity` record with the user who performed it.

### 7.7 Dashboard KPIs
Computed on every request (no caching):
- Total active products
- Low stock count (qty > 0 but ≤ min_stock_qty)
- Out of stock count (qty == 0)
- Pending receipts/deliveries/transfers (non-done, non-cancelled)
- Total stock value (SUM of qty × cost_price)
- Recent 10 operations
- Stock movement trend (last 7 days, done operations only)
- Operations per day (last 7 days)
- Stock distribution by warehouse

### 7.8 OTP Flow
1. User registers → OTP generated (6 digits, 5 min TTL) → stored in `otp_codes` → emailed via SMTP
2. User submits OTP → verified against DB + expiry → deleted after use → `is_verified = True`
3. Forgot password → same OTP flow → on verify: `password_hash` updated with new bcrypt hash

### 7.9 OAuth Flow (Google / GitHub)
1. Frontend redirects to `/oauth/google/login` or `/oauth/github/login`
2. Backend redirects to provider
3. Provider redirects to callback URL
4. Backend fetches user info, creates user if not exists (`is_verified = True`, `role = "staff"`)
5. Backend generates JWT pair, URL-encodes user JSON, redirects to `FRONTEND_URL/login?access_token=...&refresh_token=...&user=...`
6. Frontend parses query params, calls `authLogin()`, navigates to dashboard

---

## 8. Frontend — Detailed Analysis

### 8.1 Tech Stack
- React 18 + TypeScript + Vite
- TailwindCSS for styling
- React Router v6 for routing
- Axios for HTTP
- Framer Motion (login page animations)
- Lucide React (icons)

### 8.2 Routing (`App.tsx`)

**Public routes** (no auth required):
- `/` → Home page
- `/login` → Login/Signup page
- `/contact` → Contact form

**Protected routes** (require `isAuthenticated`):
- `/app/dashboard` → IMSDashboard
- `/app/products` → Products
- `/app/receipts` → OperationsPage (type=receipt)
- `/app/deliveries` → OperationsPage (type=delivery)
- `/app/transfers` → OperationsPage (type=internal)
- `/app/adjustments` → OperationsPage (type=adjustment)
- `/app/history` → MoveHistory
- `/app/profile` → Profile
- `/app/reorder-rules` → ReorderRules

**Admin-only routes** (require `isAuthenticated` + `isAdmin`):
- `/app/settings` → Settings (warehouses, categories, locations)
- `/app/users` → UserManagement
- `/app/audit-logs` → AuditLogs

Unauthenticated access → redirect to `/login`. Non-admin on admin route → redirect to `/app/dashboard`.

### 8.3 Auth Context (`context/AuthContext.tsx`)

Global state stored in `localStorage`:
- `access_token`, `refresh_token`, `user` (JSON)

Provides:
- `user: UserData | null`
- `token: string | null`
- `login(accessToken, refreshToken, userData)` — saves to localStorage + state
- `logout()` — clears localStorage + state
- `isAuthenticated: boolean` — `!!token`
- `isAdmin: boolean` — `user?.role === 'admin'`

State initialized from localStorage on mount (persists across page refresh).

### 8.4 API Layer (`api/inventory.ts`)

**Axios interceptors**:
- Request: attaches `Authorization: Bearer {access_token}` from localStorage
- Response (401 handler): auto-refresh token flow
  - If not already refreshing: calls `/auth/refresh` with stored refresh token
  - Updates localStorage with new tokens
  - Retries original request with new token
  - If refresh fails: clears localStorage, redirects to `/login`
  - Queue system: concurrent 401 requests wait for single refresh, then all retry

### 8.5 Frontend Validations

#### Login Page (`Login.tsx`)
- All forms use `e.preventDefault()` + async/await with try/catch
- Error messages displayed from `error.response?.data?.detail`
- Loading state disables submit buttons
- OTP modal shown after signup
- Forgot password / reset password modals with separate state

#### Products Page (`Products.tsx`)
Client-side `validate()` function checks:
- `name` not empty → "Product name is required"
- `sku` not empty → "SKU is required"
- `cost_price >= 0` → "Cost price cannot be negative"
- `sale_price >= 0` → "Sale price cannot be negative"
- `min_stock_qty >= 0` → "Min stock cannot be negative"
- Errors shown inline below each field with red border highlight
- `errors.submit` shown at top of modal for API errors

#### OperationsPage (`OperationsPage.tsx`)
Client-side `validateForm()` checks:
- At least one product line with a selected product → "Add at least one product line"
- Each line `demand_qty > 0` → "Quantity must be > 0"
- Errors shown inline

#### Settings Page (`Settings.tsx`)
- Warehouse: `name` required, `code` required (create only)
- Category: `name` required
- Location: `name` required
- All show inline error messages below fields

#### Contact Page (`Contact.tsx`)
- HTML5 `required` attributes on all fields
- Email field uses `type="email"` (browser validation)
- Error/success state displayed above form

### 8.6 UI Components (`components/ui/`)

| Component | Purpose |
|---|---|
| `Badge.tsx` | Status/type colored badges (draft, done, cancelled, receipt, etc.) |
| `ConfirmDialog.tsx` | Reusable confirm/cancel modal with danger variant |
| `KPICard.tsx` | Dashboard metric card with icon, value, subtitle |
| `Modal.tsx` | Reusable modal with size variants (sm/md/lg/xl) |
| `PageHeader.tsx` | Page title + subtitle + icon + actions slot |
| `Pagination.tsx` | Page navigation with total count display |
| `Skeleton.tsx` | Loading skeleton for KPI cards |
| `Table.tsx` | Generic sortable table with loading/empty states |

---

## 9. Frontend Pages — Feature Summary

### 9.1 Login Page
- Animated sliding panel (Framer Motion) — login/signup toggle
- Login form: email + password
- Signup form: name + email + password + role selector (staff/admin)
- OTP verification modal (post-signup)
- Forgot password modal → OTP → reset password modal
- Google OAuth button (GitHub button present but commented out)
- OAuth callback handler via `useSearchParams`

### 9.2 IMSDashboard
- 4 KPI cards: Total Products, Low Stock, Out of Stock, Stock Value
- 3 clickable operation count cards: Pending Receipts, Deliveries, Transfers
- 3 charts: Stock Movement Trend (bar), Operations per Day (bar), Stock by Warehouse (distribution)
- Recent Operations table with type + status filter dropdowns
- Loading skeleton state

### 9.3 Products
- Paginated product table (20/page) with search + category filter
- Sortable columns (name, category, stock, cost)
- Stock status badge (In Stock / Low Stock / Out of Stock)
- Product image display in table
- Admin: Create/Edit modal with full form + image upload
- Admin: Archive (soft delete) with ConfirmDialog
- CSV export button

### 9.4 OperationsPage (shared by Receipts, Deliveries, Transfers, Adjustments)
- Paginated operations table with search + status filter
- Create modal: partner, scheduled date, source/dest location, notes, product lines (dynamic add/remove)
- View detail modal: shows all fields + product lines table + activity timeline
- Validate modal: enter done quantities per line → updates stock
- Cancel with ConfirmDialog
- CSV export button

### 9.5 MoveHistory
- Paginated stock move ledger (30/page)
- Filter by product + operation type
- Shows: date, reference, type badge, product, route (source → dest), demand qty, done qty, status badge
- CSV export (stock ledger)

### 9.6 Settings (Admin only)
- 3 tabs: Warehouses / Categories / Locations
- Warehouses: list, create, edit (name + code + address)
- Categories: list, create, edit, delete
- Locations: list, create (name + warehouse + type)
- All with inline validation + toast notifications

### 9.7 UserManagement (Admin only)
- Table of all users with name, email, role, verification status, join date
- Toggle role button (admin ↔ staff) per user

### 9.8 AuditLogs (Admin only)
- Paginated audit log table (30/page)
- Filter by entity type
- Shows: time, user, entity type, entity ID, action badge, changed fields

### 9.9 ReorderRules
- Table of all reorder rules with current stock vs min/max
- Alert indicator when current stock ≤ min_qty
- Admin: Create/Edit/Delete rules

### 9.10 Profile
- Displays user name, email, role, verification status
- Logout button

### 9.11 IMSLayout (Sidebar)
- Collapsible sidebar (desktop) with tooltip labels when collapsed
- Mobile hamburger menu with overlay
- Bell icon with live stock alert count badge
- Alert dropdown: lists low/out-of-stock products with type icons
- User info display at bottom of sidebar
- Admin-only nav items hidden for staff users

### 9.12 Home Page
- Hero section, StatBar, DetailedFeatures, Workflow sections
- Public landing page

### 9.13 Contact Page
- Contact form: first name, last name, email, subject (dropdown), message
- On submit: POST to `/contact/send` → sends confirmation email to user + notification to admin
- Success/error state display

---

## 10. Email Service

### OTP Emails (`services/email_service.py`)
- Sends HTML email with styled OTP code box
- Supports purposes: "email verification", "password reset"
- OTP displayed in monospace font with 5-minute expiry notice
- Security tip included in email body
- Sent async via `ThreadPoolExecutor` (non-blocking)
- Failures are logged but do not fail the request

### Contact Emails (`services/contact_service.py`)
- Two emails sent concurrently via `asyncio.gather`:
  1. User confirmation email (with message summary + platform link)
  2. Admin notification email (with full contact details + quick reply button)
- Both use professional HTML templates with gradient headers

---

## 11. Security Summary

| Feature | Implementation |
|---|---|
| Password hashing | bcrypt via passlib |
| JWT access tokens | HS256, 15 min expiry |
| JWT refresh tokens | HS256, 7 day expiry |
| Token type check | `type: "access"` / `type: "refresh"` in payload |
| Email verification | 6-digit OTP, 5 min TTL, deleted after use |
| Rate limiting | slowapi IP-based (5–20 req/min per endpoint) |
| Role-based access | `admin` / `staff` roles, enforced at router level |
| Admin-only routes | Frontend redirect + backend `require_admin` dependency |
| Image upload | Content-type whitelist + 5MB size limit |
| OAuth | Authlib + Starlette session middleware |
| CORS | Currently `allow_origins=["*"]` (hackathon setting) |
| Soft deletes | Products, categories, warehouses, locations use `is_active`/`deleted_at` |
| Audit trail | Every mutation logged to `audit_logs` with user + changes |

---

## 12. What Is Missing / Could Be Improved

| Gap | Notes |
|---|---|
| Password strength validation | No min length or complexity check at schema level |
| CORS restriction | `allow_origins=["*"]` should be restricted in production |
| Token blacklist / logout | No server-side token invalidation on logout |
| GitHub OAuth | Button commented out in Login.tsx |
| Pagination on audit logs filter | No date range filter |
| No unit tests | No test files present |
| `.env` committed to git | Contains real credentials — should be in `.gitignore` |
| `allow_credentials=True` with `allow_origins=["*"]` | Invalid combination for browsers in production |
| Dashboard KPIs not cached | Recomputed on every request |
| No input sanitization | No XSS protection beyond Pydantic type coercion |

---

## 13. Dependencies

### Backend (`requirements.txt`)
| Package | Purpose |
|---|---|
| fastapi | Web framework |
| uvicorn[standard] | ASGI server |
| sqlalchemy 2.0 | Async ORM |
| asyncpg | Async PostgreSQL driver |
| pydantic >= 2.10 | Data validation |
| pydantic-settings | .env config loading |
| python-jose[cryptography] | JWT encode/decode |
| passlib[bcrypt] | Password hashing |
| authlib | OAuth client |
| httpx | Async HTTP (GitHub OAuth user fetch) |
| itsdangerous | Session signing (OAuth state) |
| slowapi | Rate limiting |
| python-multipart | File upload support |
| aiofiles | Async file I/O |
| email-validator | EmailStr validation |

### Frontend (`package.json` key deps)
| Package | Purpose |
|---|---|
| react + react-dom | UI framework |
| react-router-dom | Client-side routing |
| axios | HTTP client |
| framer-motion | Animations (login page) |
| lucide-react | Icon library |
| tailwindcss | Utility CSS |
| typescript | Type safety |
| vite | Build tool |

---

*Generated by Kiro — March 2026*
