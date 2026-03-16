import { useEffect, useState, useCallback, useRef } from 'react';
import { Package, Plus, Search, Edit2, Archive, CheckCircle, Download, ImagePlus, X } from 'lucide-react';
import { getProducts, getCategories, createProduct, updateProduct, deleteProduct, uploadProductImage, exportProductsCSV } from '../../api/inventory';
import type { Product, Category } from '../../api/inventory';
import PageHeader from '../../components/ui/PageHeader';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import Table from '../../components/ui/Table';
import Pagination from '../../components/ui/Pagination';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { useAuth } from '../../context/AuthContext';

const UNITS = ['Units', 'Kg', 'Grams', 'Liters', 'Meters', 'Boxes', 'Pieces', 'Tons', 'Packs'];
const emptyForm = { name: '', sku: '', category_id: '', unit_of_measure: 'Units', description: '', min_stock_qty: 0, cost_price: 0, sale_price: 0, initial_stock: 0 };
const inputClass = "w-full px-3 py-2.5 border border-gray-200 rounded-md text-sm focus:outline-none focus:border-[#714B67] focus:ring-1 focus:ring-[#714B67] transition-colors";
const labelClass = "block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5";

export default function Products() {
    const [products, setProducts] = useState<Product[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filterCat, setFilterCat] = useState('');
    const [page, setPage] = useState(1);
    const [pages, setPages] = useState(1);
    const [total, setTotal] = useState(0);
    const [sortBy, setSortBy] = useState('name');
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState<Product | null>(null);
    const [form, setForm] = useState(emptyForm);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState('');
    const [toastType, setToastType] = useState<'success' | 'error'>('success');
    const [confirmArchive, setConfirmArchive] = useState<Product | null>(null);
    const [imageFile, setImageFile] = useState<File | null>(null);
    const imageRef = useRef<HTMLInputElement>(null);
    const { isAdmin } = useAuth();
    const PAGE_SIZE = 20;

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const [res, cats] = await Promise.all([
                getProducts({ search: search || undefined, category_id: filterCat ? Number(filterCat) : undefined, page, page_size: PAGE_SIZE, sort_by: sortBy, sort_dir: sortDir }),
                getCategories()
            ]);
            setProducts(res.items); setTotal(res.total); setPages(res.pages); setCategories(cats);
        } finally { setLoading(false); }
    }, [search, filterCat, page, sortBy, sortDir]);

    useEffect(() => { load(); }, [load]);
    useEffect(() => { setPage(1); }, [search, filterCat, sortBy, sortDir]);

    const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
        setToast(msg); setToastType(type); setTimeout(() => setToast(''), 3000);
    };

    const handleSort = (key: string) => {
        if (sortBy === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
        else { setSortBy(key); setSortDir('asc'); }
    };

    const openCreate = () => { setEditing(null); setForm(emptyForm); setErrors({}); setImageFile(null); setModalOpen(true); };
    const openEdit = (p: Product) => {
        setEditing(p);
        setForm({ name: p.name, sku: p.sku, category_id: String(p.category_id || ''), unit_of_measure: p.unit_of_measure, description: p.description || '', min_stock_qty: p.min_stock_qty, cost_price: p.cost_price, sale_price: p.sale_price, initial_stock: 0 });
        setErrors({}); setImageFile(null); setModalOpen(true);
    };

    const validate = () => {
        const e: Record<string, string> = {};
        if (!form.name.trim()) e.name = 'Product name is required';
        if (!form.sku.trim()) e.sku = 'SKU is required';
        if (form.cost_price < 0) e.cost_price = 'Cannot be negative';
        if (form.sale_price < 0) e.sale_price = 'Cannot be negative';
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const handleSave = async () => {
        if (!validate()) return;
        setSaving(true);
        try {
            const payload = { ...form, category_id: form.category_id ? Number(form.category_id) : undefined };
            let saved: Product;
            if (editing) { saved = await updateProduct(editing.id, payload); showToast('Product updated'); }
            else { saved = await createProduct(payload); showToast('Product created'); }
            if (imageFile) await uploadProductImage(saved.id, imageFile);
            setModalOpen(false); load();
        } catch (err: any) {
            showToast(err.response?.data?.detail || 'Failed to save product', 'error');
        } finally { setSaving(false); }
    };

    const handleArchive = async () => {
        if (!confirmArchive) return;
        await deleteProduct(confirmArchive.id);
        showToast('Product archived'); setConfirmArchive(null); load();
    };

    const stockStatus = (p: Product) => {
        if (p.total_stock === 0) return <Badge variant="out">Out of Stock</Badge>;
        if (p.min_stock_qty > 0 && p.total_stock <= p.min_stock_qty) return <Badge variant="low">Low Stock</Badge>;
        return <Badge variant="ok">In Stock</Badge>;
    };

    const columns = [
        {
            key: 'name', header: 'Product', sortable: true, render: (p: Product) => (
                <div className="flex items-center gap-3">
                    {p.image_url
                        ? <img src={p.image_url} alt={p.name} className="w-8 h-8 rounded-md object-cover border border-gray-100 shrink-0" />
                        : <div className="w-8 h-8 bg-gray-100 rounded-md flex items-center justify-center shrink-0"><Package size={14} className="text-gray-400" /></div>
                    }
                    <div>
                        <p className="font-semibold text-gray-900">{p.name}</p>
                        <p className="text-xs text-gray-400 font-mono">{p.sku}</p>
                    </div>
                </div>
            )
        },
        { key: 'category_name', header: 'Category', sortable: true, render: (p: Product) => <span className="text-gray-600 text-sm">{p.category_name || '—'}</span> },
        { key: 'unit_of_measure', header: 'UOM', render: (p: Product) => <span className="text-gray-500 text-sm">{p.unit_of_measure}</span> },
        {
            key: 'total_stock', header: 'Stock', sortable: true, render: (p: Product) => (
                <span className="font-semibold text-gray-900">{p.total_stock} <span className="text-gray-400 font-normal text-xs">{p.unit_of_measure}</span></span>
            )
        },
        { key: 'status', header: 'Status', render: stockStatus },
        { key: 'cost_price', header: 'Cost', sortable: true, render: (p: Product) => <span className="text-gray-700">₹{p.cost_price.toFixed(2)}</span> },
        {
            key: 'actions', header: '', render: (p: Product) => (
                <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                    {isAdmin && <>
                        <button onClick={() => openEdit(p)} className="p-1.5 rounded-md hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"><Edit2 size={14} /></button>
                        <button onClick={() => setConfirmArchive(p)} className="p-1.5 rounded-md hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"><Archive size={14} /></button>
                    </>}
                </div>
            )
        },
    ];

    return (
        <div className="p-6">
            {toast && (
                <div className={`fixed top-4 right-4 z-50 px-4 py-2.5 rounded-lg shadow-lg flex items-center gap-2 text-white text-sm ${toastType === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
                    {toastType === 'success' ? <CheckCircle size={15} /> : <X size={15} />} {toast}
                </div>
            )}

            <PageHeader
                title="Products"
                subtitle="Manage your product catalog and stock levels"
                icon={<Package size={18} />}
                actions={
                    <div className="flex items-center gap-2">
                        <button onClick={() => exportProductsCSV()}
                            className="flex items-center gap-2 px-3 py-2 border border-gray-200 text-gray-600 rounded-md hover:bg-gray-50 transition-colors text-sm font-medium">
                            <Download size={14} /> Export
                        </button>
                        {isAdmin && (
                            <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-[#714B67] text-white rounded-md hover:bg-[#5d3d56] transition-colors text-sm font-medium">
                                <Plus size={15} /> New Product
                            </button>
                        )}
                    </div>
                }
            />

            <div className="flex flex-col sm:flex-row gap-3 mb-5">
                <div className="relative flex-1">
                    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, SKU..."
                        className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:border-[#714B67] transition-colors" />
                </div>
                <select value={filterCat} onChange={e => setFilterCat(e.target.value)}
                    className="px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:border-[#714B67] bg-white text-gray-600">
                    <option value="">All Categories</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
            </div>

            <div className="bg-white rounded-xl border border-gray-200">
                <Table columns={columns} data={products} loading={loading}
                    emptyMessage="No products found. Create your first product."
                    emptyIcon={<Package size={36} />}
                    sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                <Pagination page={page} pages={pages} total={total} pageSize={PAGE_SIZE} onPage={setPage} />
            </div>

            <ConfirmDialog open={!!confirmArchive} title="Archive Product"
                message={`Archive "${confirmArchive?.name}"? It will be hidden from the catalog.`}
                confirmLabel="Archive" danger onConfirm={handleArchive} onCancel={() => setConfirmArchive(null)} />

            <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Product' : 'New Product'} size="lg">
                <div className="space-y-4">
                    {errors.submit && <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">{errors.submit}</div>}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                            <label className={labelClass}>Product Name *</label>
                            <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                                className={`${inputClass} ${errors.name ? 'border-red-400' : ''}`} placeholder="e.g. Steel Rods" />
                            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
                        </div>
                        <div>
                            <label className={labelClass}>SKU / Code *</label>
                            <input value={form.sku} onChange={e => setForm({ ...form, sku: e.target.value })} disabled={!!editing}
                                className={`${inputClass} ${errors.sku ? 'border-red-400' : ''} disabled:bg-gray-50`} placeholder="e.g. STL-001" />
                            {errors.sku && <p className="text-red-500 text-xs mt-1">{errors.sku}</p>}
                        </div>
                        <div>
                            <label className={labelClass}>Category</label>
                            <select value={form.category_id} onChange={e => setForm({ ...form, category_id: e.target.value })} className={inputClass}>
                                <option value="">No Category</option>
                                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className={labelClass}>Unit of Measure</label>
                            <select value={form.unit_of_measure} onChange={e => setForm({ ...form, unit_of_measure: e.target.value })} className={inputClass}>
                                {UNITS.map(u => <option key={u}>{u}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className={labelClass}>Min Stock</label>
                            <input type="number" min="0" value={form.min_stock_qty} onChange={e => setForm({ ...form, min_stock_qty: Number(e.target.value) })} className={inputClass} />
                        </div>
                        <div>
                            <label className={labelClass}>Cost Price (₹)</label>
                            <input type="number" min="0" step="0.01" value={form.cost_price} onChange={e => setForm({ ...form, cost_price: Number(e.target.value) })} className={inputClass} />
                        </div>
                        <div>
                            <label className={labelClass}>Sale Price (₹)</label>
                            <input type="number" min="0" step="0.01" value={form.sale_price} onChange={e => setForm({ ...form, sale_price: Number(e.target.value) })} className={inputClass} />
                        </div>
                        {!editing && (
                            <div>
                                <label className={labelClass}>Initial Stock</label>
                                <input type="number" min="0" value={form.initial_stock} onChange={e => setForm({ ...form, initial_stock: Number(e.target.value) })} className={inputClass} />
                            </div>
                        )}
                        <div className="col-span-2">
                            <label className={labelClass}>Product Image</label>
                            <input ref={imageRef} type="file" accept="image/*" className="hidden" onChange={e => setImageFile(e.target.files?.[0] || null)} />
                            <button type="button" onClick={() => imageRef.current?.click()}
                                className="flex items-center gap-2 px-3 py-2 border border-dashed border-gray-300 rounded-md text-sm text-gray-500 hover:border-[#714B67] hover:text-[#714B67] transition-colors">
                                <ImagePlus size={14} />
                                {imageFile ? imageFile.name : 'Upload image (JPEG, PNG, WebP)'}
                            </button>
                        </div>
                        <div className="col-span-2">
                            <label className={labelClass}>Description</label>
                            <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={2}
                                className={`${inputClass} resize-none`} placeholder="Optional product description" />
                        </div>
                    </div>
                    <div className="flex justify-end gap-3 pt-2">
                        <button onClick={() => setModalOpen(false)} className="px-4 py-2 border border-gray-200 rounded-md text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">Cancel</button>
                        <button onClick={handleSave} disabled={saving} className="px-5 py-2 bg-[#714B67] text-white rounded-md text-sm font-medium hover:bg-[#5d3d56] transition-colors disabled:opacity-50">
                            {saving ? 'Saving...' : editing ? 'Update Product' : 'Create Product'}
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
