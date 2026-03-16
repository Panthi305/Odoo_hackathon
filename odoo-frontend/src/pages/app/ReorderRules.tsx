import { useEffect, useState, useCallback } from 'react';
import { RefreshCw, Plus, Edit2, Trash2, CheckCircle, AlertTriangle, X } from 'lucide-react';
import { getReorderRules, createReorderRule, updateReorderRule, deleteReorderRule, getProducts } from '../../api/inventory';
import type { ReorderRule, Product } from '../../api/inventory';
import PageHeader from '../../components/ui/PageHeader';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import Table from '../../components/ui/Table';
import { useAuth } from '../../context/AuthContext';

const inputClass = "w-full px-3 py-2.5 border border-gray-200 rounded-md text-sm focus:outline-none focus:border-[#714B67] focus:ring-1 focus:ring-[#714B67] transition-colors";
const labelClass = "block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5";

export default function ReorderRules() {
    const [rules, setRules] = useState<ReorderRule[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState<ReorderRule | null>(null);
    const [form, setForm] = useState({ product_id: '', min_qty: 0, max_qty: 0 });
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState('');
    const [toastType, setToastType] = useState<'success' | 'error'>('success');
    const [confirmDelete, setConfirmDelete] = useState<ReorderRule | null>(null);
    const { isAdmin } = useAuth();

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const [r, p] = await Promise.all([getReorderRules(), getProducts({ page_size: 200 })]);
            setRules(r); setProducts(p.items);
        } finally { setLoading(false); }
    }, []);

    useEffect(() => { load(); }, [load]);

    const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
        setToast(msg); setToastType(type); setTimeout(() => setToast(''), 3000);
    };

    const openCreate = () => { setEditing(null); setForm({ product_id: '', min_qty: 0, max_qty: 0 }); setModalOpen(true); };
    const openEdit = (r: ReorderRule) => { setEditing(r); setForm({ product_id: String(r.product_id), min_qty: r.min_qty, max_qty: r.max_qty }); setModalOpen(true); };

    const handleSave = async () => {
        if (!form.product_id) return;
        setSaving(true);
        try {
            if (editing) { await updateReorderRule(editing.id, { min_qty: form.min_qty, max_qty: form.max_qty }); showToast('Rule updated'); }
            else { await createReorderRule({ product_id: Number(form.product_id), min_qty: form.min_qty, max_qty: form.max_qty }); showToast('Rule created'); }
            setModalOpen(false); load();
        } finally { setSaving(false); }
    };

    const handleDelete = async () => {
        if (!confirmDelete) return;
        await deleteReorderRule(confirmDelete.id);
        showToast('Rule deleted'); setConfirmDelete(null); load();
    };

    const columns = [
        {
            key: 'product_name', header: 'Product', render: (r: ReorderRule) => (
                <div>
                    <p className="font-semibold text-gray-900">{r.product_name}</p>
                    <p className="text-xs text-gray-400">{r.product_sku}</p>
                </div>
            )
        },
        {
            key: 'current_stock', header: 'Current Stock', render: (r: ReorderRule) => (
                <span className={`font-semibold ${r.current_stock <= r.min_qty ? 'text-red-600' : 'text-green-600'}`}>{r.current_stock}</span>
            )
        },
        { key: 'min_qty', header: 'Min Qty', render: (r: ReorderRule) => <span className="text-amber-600 font-medium">{r.min_qty}</span> },
        { key: 'max_qty', header: 'Max Qty', render: (r: ReorderRule) => <span className="text-[#714B67] font-medium">{r.max_qty}</span> },
        {
            key: 'alert', header: 'Status', render: (r: ReorderRule) => (
                r.current_stock <= r.min_qty
                    ? <span className="flex items-center gap-1 text-xs text-red-600 font-medium bg-red-50 px-2 py-0.5 rounded-md w-fit"><AlertTriangle size={11} /> Reorder needed</span>
                    : <span className="text-xs text-green-600 font-medium bg-green-50 px-2 py-0.5 rounded-md">OK</span>
            )
        },
        {
            key: 'actions', header: '', render: (r: ReorderRule) => isAdmin ? (
                <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                    <button onClick={() => openEdit(r)} className="p-1.5 rounded-md hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"><Edit2 size={14} /></button>
                    <button onClick={() => setConfirmDelete(r)} className="p-1.5 rounded-md hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"><Trash2 size={14} /></button>
                </div>
            ) : null
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
                title="Reorder Rules"
                subtitle="Automatic reorder triggers based on stock thresholds"
                icon={<RefreshCw size={18} />}
                actions={isAdmin ? (
                    <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-[#714B67] text-white rounded-md hover:bg-[#5d3d56] transition-colors text-sm font-medium">
                        <Plus size={15} /> New Rule
                    </button>
                ) : undefined}
            />
            <div className="bg-white rounded-xl border border-gray-200">
                <Table columns={columns} data={rules} loading={loading} emptyMessage="No reorder rules configured." emptyIcon={<RefreshCw size={36} />} />
            </div>
            <ConfirmDialog open={!!confirmDelete} title="Delete Rule" message={`Delete reorder rule for "${confirmDelete?.product_name}"?`}
                confirmLabel="Delete" danger onConfirm={handleDelete} onCancel={() => setConfirmDelete(null)} />
            <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Reorder Rule' : 'New Reorder Rule'} size="sm">
                <div className="space-y-4">
                    {!editing && (
                        <div>
                            <label className={labelClass}>Product</label>
                            <select value={form.product_id} onChange={e => setForm({ ...form, product_id: e.target.value })} className={inputClass}>
                                <option value="">Select product...</option>
                                {products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
                            </select>
                        </div>
                    )}
                    <div>
                        <label className={labelClass}>Min Qty (Reorder Point)</label>
                        <input type="number" min="0" value={form.min_qty} onChange={e => setForm({ ...form, min_qty: Number(e.target.value) })} className={inputClass} />
                    </div>
                    <div>
                        <label className={labelClass}>Max Qty (Reorder Up To)</label>
                        <input type="number" min="0" value={form.max_qty} onChange={e => setForm({ ...form, max_qty: Number(e.target.value) })} className={inputClass} />
                    </div>
                    <div className="flex justify-end gap-3 pt-2">
                        <button onClick={() => setModalOpen(false)} className="px-4 py-2 border border-gray-200 rounded-md text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">Cancel</button>
                        <button onClick={handleSave} disabled={saving || !form.product_id}
                            className="px-5 py-2 bg-[#714B67] text-white rounded-md text-sm font-medium hover:bg-[#5d3d56] transition-colors disabled:opacity-50">
                            {saving ? 'Saving...' : editing ? 'Update' : 'Create'}
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
