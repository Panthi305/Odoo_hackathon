import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL;

export const api = axios.create({ baseURL: API_URL });

// ── Request interceptor: attach access token ───────────────────────────────────
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('access_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

// ── Response interceptor: auto-refresh on 401 ─────────────────────────────────
let _refreshing = false;
let _queue: Array<{ resolve: (v: string) => void; reject: (e: unknown) => void }> = [];

api.interceptors.response.use(
    (res) => res,
    async (error) => {
        const original = error.config;
        if (error.response?.status === 401 && !original._retry) {
            original._retry = true;
            if (_refreshing) {
                return new Promise((resolve, reject) => {
                    _queue.push({ resolve, reject });
                }).then((token) => {
                    original.headers.Authorization = `Bearer ${token}`;
                    return api(original);
                });
            }
            _refreshing = true;
            try {
                const refresh_token = localStorage.getItem('refresh_token');
                if (!refresh_token) throw new Error('No refresh token');
                const { data } = await axios.post(`${API_URL}/auth/refresh`, { refresh_token });
                localStorage.setItem('access_token', data.access_token);
                localStorage.setItem('refresh_token', data.refresh_token);
                localStorage.setItem('user', JSON.stringify(data.user));
                _queue.forEach(({ resolve }) => resolve(data.access_token));
                _queue = [];
                original.headers.Authorization = `Bearer ${data.access_token}`;
                return api(original);
            } catch (e) {
                _queue.forEach(({ reject }) => reject(e));
                _queue = [];
                localStorage.removeItem('access_token');
                localStorage.removeItem('refresh_token');
                localStorage.removeItem('user');
                window.location.href = '/login';
                return Promise.reject(e);
            } finally {
                _refreshing = false;
            }
        }
        return Promise.reject(error);
    }
);

// ── Types ──────────────────────────────────────────────────────────────────────
export type OperationType = 'receipt' | 'delivery' | 'internal' | 'adjustment';
export type OperationStatus = 'draft' | 'waiting' | 'ready' | 'done' | 'cancelled';

export interface PaginatedResponse<T> {
    items: T[];
    total: number;
    page: number;
    page_size: number;
    pages: number;
}

export interface Category { id: number; name: string; description?: string; is_active: boolean; created_at: string; }
export interface Warehouse { id: number; name: string; code: string; address?: string; is_active: boolean; created_at: string; }
export interface Location { id: number; name: string; warehouse_id?: number; location_type: string; is_active: boolean; }

export interface Product {
    id: number; name: string; sku: string; category_id?: number; category_name?: string;
    unit_of_measure: string; description?: string; min_stock_qty: number;
    cost_price: number; sale_price: number; image_url?: string;
    is_active: boolean; total_stock: number; created_at: string;
}

export interface MoveLine { id: number; product_id: number; product_name?: string; product_sku?: string; unit_of_measure?: string; demand_qty: number; done_qty: number; }

export interface OperationActivity { id: number; activity_type: string; note?: string; user_name?: string; created_at: string; }

export interface Operation {
    id: number; reference: string; operation_type: OperationType; status: OperationStatus;
    partner_name?: string; source_location_id?: number; dest_location_id?: number;
    source_location_name?: string; dest_location_name?: string;
    scheduled_date?: string; notes?: string; created_at: string; validated_at?: string;
    lines: MoveLine[];
    activities: OperationActivity[];
}

export interface StockMove {
    id: number; product_id: number; product_name?: string; product_sku?: string;
    operation_id: number; operation_ref?: string; operation_type?: OperationType;
    operation_status?: OperationStatus; source_location?: string; dest_location?: string;
    demand_qty: number; done_qty: number; created_at: string;
}

export interface ChartDataPoint { label: string; value: number; }

export interface DashboardKPIs {
    total_products: number; low_stock_items: number; out_of_stock_items: number;
    pending_receipts: number; pending_deliveries: number; scheduled_transfers: number;
    total_stock_value: number; recent_operations: Operation[];
    stock_movement_trend: ChartDataPoint[];
    operations_per_day: ChartDataPoint[];
    stock_by_warehouse: ChartDataPoint[];
}

export interface ReorderRule {
    id: number; product_id: number; product_name?: string; product_sku?: string;
    min_qty: number; max_qty: number; current_stock: number; is_active: boolean; created_at: string;
}

export interface AuditLog {
    id: number; user_id?: number; user_name?: string; entity_type: string;
    entity_id: number; action: string; changes?: Record<string, any>; created_at: string;
}

export interface StockAlert {
    product_id: number; product_name: string; sku: string; category_name?: string;
    total_stock: number; min_stock_qty: number; alert_type: 'low_stock' | 'out_of_stock';
}

export interface UserRecord {
    id: number; name: string; email: string; role: string;
    is_verified: boolean; created_at: string;
}

// ── Dashboard ──────────────────────────────────────────────────────────────────
export const getDashboard = () => api.get<DashboardKPIs>('/inventory/dashboard').then(r => r.data);

// ── Categories ─────────────────────────────────────────────────────────────────
export const getCategories = () => api.get<Category[]>('/inventory/categories').then(r => r.data);
export const createCategory = (data: { name: string; description?: string }) => api.post<Category>('/inventory/categories', data).then(r => r.data);
export const updateCategory = (id: number, data: Partial<Category>) => api.put<Category>(`/inventory/categories/${id}`, data).then(r => r.data);
export const deleteCategory = (id: number) => api.delete(`/inventory/categories/${id}`).then(r => r.data);

// ── Warehouses ─────────────────────────────────────────────────────────────────
export const getWarehouses = () => api.get<Warehouse[]>('/inventory/warehouses').then(r => r.data);
export const createWarehouse = (data: { name: string; code: string; address?: string }) => api.post<Warehouse>('/inventory/warehouses', data).then(r => r.data);
export const updateWarehouse = (id: number, data: Partial<Warehouse>) => api.put<Warehouse>(`/inventory/warehouses/${id}`, data).then(r => r.data);
export const deleteWarehouse = (id: number) => api.delete(`/inventory/warehouses/${id}`).then(r => r.data);

// ── Locations ──────────────────────────────────────────────────────────────────
export const getLocations = (warehouse_id?: number) => api.get<Location[]>('/inventory/locations', { params: { warehouse_id } }).then(r => r.data);
export const createLocation = (data: { name: string; warehouse_id?: number; location_type?: string }) => api.post<Location>('/inventory/locations', data).then(r => r.data);
export const deleteLocation = (id: number) => api.delete(`/inventory/locations/${id}`).then(r => r.data);

// ── Products ───────────────────────────────────────────────────────────────────
export const getProducts = (params?: {
    search?: string; category_id?: number; active_only?: boolean;
    page?: number; page_size?: number; sort_by?: string; sort_dir?: string;
}) => api.get<PaginatedResponse<Product>>('/inventory/products', { params }).then(r => r.data);

export const getProduct = (id: number) => api.get<Product>(`/inventory/products/${id}`).then(r => r.data);
export const createProduct = (data: Partial<Product> & { initial_stock?: number }) => api.post<Product>('/inventory/products', data).then(r => r.data);
export const updateProduct = (id: number, data: Partial<Product>) => api.put<Product>(`/inventory/products/${id}`, data).then(r => r.data);
export const deleteProduct = (id: number) => api.delete(`/inventory/products/${id}`).then(r => r.data);
export const uploadProductImage = (id: number, file: File) => {
    const form = new FormData();
    form.append('file', file);
    return api.post<{ image_url: string }>(`/inventory/products/${id}/image`, form, {
        headers: { 'Content-Type': 'multipart/form-data' }
    }).then(r => r.data);
};
export const getProductStock = (id: number) => api.get<{ location_id: number; location_name: string; quantity: number }[]>(`/inventory/products/${id}/stock`).then(r => r.data);

// ── Operations ─────────────────────────────────────────────────────────────────
export const getOperations = (params?: {
    op_type?: OperationType; status?: OperationStatus; search?: string;
    page?: number; page_size?: number;
}) => api.get<PaginatedResponse<Operation>>('/inventory/operations', { params }).then(r => r.data);

export const getOperation = (id: number) => api.get<Operation>(`/inventory/operations/${id}`).then(r => r.data);
export const createOperation = (data: {
    operation_type: OperationType; partner_name?: string;
    source_location_id?: number; dest_location_id?: number;
    scheduled_date?: string; notes?: string;
    lines: { product_id: number; demand_qty: number }[];
}) => api.post<Operation>('/inventory/operations', data).then(r => r.data);
export const updateOperation = (id: number, data: Partial<Operation>) => api.put<Operation>(`/inventory/operations/${id}`, data).then(r => r.data);
export const validateOperation = (id: number, lines: { product_id: number; done_qty: number }[]) =>
    api.post<Operation>(`/inventory/operations/${id}/validate`, { lines }).then(r => r.data);
export const cancelOperation = (id: number) => api.post<Operation>(`/inventory/operations/${id}/cancel`).then(r => r.data);

// ── Move History ───────────────────────────────────────────────────────────────
export const getMoveHistory = (params?: {
    product_id?: number; op_type?: OperationType; page?: number; page_size?: number;
}) => api.get<PaginatedResponse<StockMove>>('/inventory/moves/history', { params }).then(r => r.data);

// ── Alerts ─────────────────────────────────────────────────────────────────────
export const getAlerts = () => api.get<StockAlert[]>('/inventory/alerts').then(r => r.data);

// ── Reorder Rules ──────────────────────────────────────────────────────────────
export const getReorderRules = () => api.get<ReorderRule[]>('/inventory/reorder-rules').then(r => r.data);
export const createReorderRule = (data: { product_id: number; min_qty: number; max_qty: number }) =>
    api.post<ReorderRule>('/inventory/reorder-rules', data).then(r => r.data);
export const updateReorderRule = (id: number, data: Partial<ReorderRule>) =>
    api.put<ReorderRule>(`/inventory/reorder-rules/${id}`, data).then(r => r.data);
export const deleteReorderRule = (id: number) => api.delete(`/inventory/reorder-rules/${id}`).then(r => r.data);

// ── Audit Logs ─────────────────────────────────────────────────────────────────
export const getAuditLogs = (params?: { entity_type?: string; entity_id?: number; page?: number; page_size?: number }) =>
    api.get<PaginatedResponse<AuditLog>>('/inventory/audit-logs', { params }).then(r => r.data);

// ── CSV Exports (authenticated download) ──────────────────────────────────────
async function _downloadCSV(path: string, filename: string) {
    const res = await api.get(path, { responseType: 'blob' });
    const url = URL.createObjectURL(new Blob([res.data], { type: 'text/csv' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}

export const exportProductsCSV = () => _downloadCSV('/inventory/export/products', 'products.csv');
export const exportOperationsCSV = (op_type?: string) =>
    _downloadCSV(`/inventory/export/operations${op_type ? `?op_type=${op_type}` : ''}`, `${op_type || 'operations'}.csv`);
export const exportStockLedgerCSV = () => _downloadCSV('/inventory/export/stock-ledger', 'stock_ledger.csv');

// ── User Management ────────────────────────────────────────────────────────────
export const getUsers = () => api.get<UserRecord[]>('/auth/users').then(r => r.data);
export const updateUserRole = (id: number, role: string) => api.put(`/auth/users/${id}/role`, { role }).then(r => r.data);
