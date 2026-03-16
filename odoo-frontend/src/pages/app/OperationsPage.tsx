import { useEffect, useState, useCallback } from 'react';
import { Plus, Search, CheckCircle, X, Eye, Trash2, Download, Clock } from 'lucide-react';
import { getOperations, getProducts, getLocations, createOperation, validateOperation, cancelOperation, exportOperationsCSV } from '../../api/inventory';
import type { Operation, Product, Location, OperationStatus, OperationType } from '../../api/inventory';
import PageHeader from '../../components/ui/PageHeader';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import Table from '../../components/ui/Table';
import Pagination from '../../components/ui/Pagination';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import type { ReactNode } from 'react';

interface Props { opType: OperationType; title: string; subtitle: string; icon: ReactNode; partnerLabel: string; }

const statusLabel: Record<OperationStatus, string> = { draft: 'Draft', waiting: 'Waiting', ready: 'Ready', done: 'Done', cancelled: 'Cancelled' };
const inputClass = "w-full px-3 py-2.5 border border-gray-200 rounded-md text-sm focus:outline-none focus:border-[#714B67] focus:ring-1 focus:ring-[#714B67] transition-colors";
const labelClass = "block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5";

export default function OperationsPage({ opType, title, subtitle, icon, partnerLabel }: Props) {
    const [ops, setOps] = useState<Operation[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [locations, setLocations] = useState<Location[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [page, setPage] = useState(1);
    const [pages, setPages] = useState(1);
    const [total, setTotal] = useState(0);
    const [createOpen, setCreateOpen] = useState(false);
    const [detailOp, setDetailOp] = useState<Operation | null>(null);
    const [validateOpen, setValidateOpen] = useState(false);
    const [confirmCancel, setConfirmCancel] = useState<Operation | null>(null);
    const [toast, setToast] = useState('');
    const [toastType, setToastType] = useState<'success' | 'error'>('success');
    const [saving, setSaving] = useState(false);
    const PAGE_SIZE = 20;

    const [form, setForm] = useState({ partner_name: '', source_location_id: '', dest_location_id: '', scheduled_date: '', notes: '' });
    const [lines, setLines] = useState<{ product_id: string; demand_qty: number }[]>([{ product_id: '', demand_qty: 1 }]);
    const [formErrors, setFormErrors] = useState<Record<string, string>>({});
    const [doneQtys, setDoneQtys] = useState<Record<number, number>>({});

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const [res, prodsData, locsData] = await Promise.all([
                getOperations({ op_type: opType, status: filterStatus as OperationStatus || undefined, search: search || undefined, page, page_size: PAGE_SIZE }),
                getProducts({ page_size: 200 }),
                getLocations()
            ]);
            setOps(res.items); setTotal(res.total); setPages(res.pages);
            setProducts(prodsData.items); setLocations(locsData);
        } finally { setLoading(false); }
    }, [opType, filterStatus, search, page]);

    useEffect(() => { load(); }, [load]);
    useEffect(() => { setPage(1); }, [search, filterStatus]);

    const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
        setToast(msg); setToastType(type); setTimeout(() => setToast(''), 3500);
    };

    const validateForm = () => {
        const e: Record<string, string> = {};
        const validLines = lines.filter(l => l.product_id);
        if (validLines.length === 0) e.lines = 'Add at least one product line';
        validLines.forEach((l, i) => { if (l.demand_qty <= 0) e[`qty_${i}`] = 'Quantity must be > 0'; });
        setFormErrors(e);
        return Object.keys(e).length === 0;
    };

    const handleCreate = async () => {
        if (!validateForm()) return;
        setSaving(true);
        try {
            const validLines = lines.filter(l => l.product_id).map(l => ({ product_id: Number(l.product_id), demand_qty: l.demand_qty }));
            await createOperation({ operation_type: opType, partner_name: form.partner_name || undefined, source_location_id: form.source_location_id ? Number(form.source_location_id) : undefined, dest_location_id: form.dest_location_id ? Number(form.dest_location_id) : undefined, scheduled_date: form.scheduled_date || undefined, notes: form.notes || undefined, lines: validLines });
            showToast(`${title.slice(0, -1)} created successfully`);
            setCreateOpen(false);
            setForm({ partner_name: '', source_location_id: '', dest_location_id: '', scheduled_date: '', notes: '' });
            setLines([{ product_id: '', demand_qty: 1 }]);
            load();
        } catch (err: any) {
            showToast(err.response?.data?.detail || 'Failed to create operation', 'error');
        } finally { setSaving(false); }
    };

    const openValidate = (op: Operation) => {
        setDetailOp(op);
        const map: Record<number, number> = {};
        op.lines.forEach(l => { map[l.product_id] = l.demand_qty; });
        setDoneQtys(map);
        setValidateOpen(true);
    };

    const handleValidate = async () => {
        if (!detailOp) return;
        setSaving(true);
        try {
            await validateOperation(detailOp.id, detailOp.lines.map(l => ({ product_id: l.product_id, done_qty: doneQtys[l.product_id] ?? l.demand_qty })));
            showToast('Operation validated — stock updated');
            setValidateOpen(false); setDetailOp(null); load();
        } catch (err: any) {
            showToast(err.response?.data?.detail || 'Validation failed', 'error');
        } finally { setSaving(false); }
    };

    const handleCancel = async () => {
        if (!confirmCancel) return;
        try {
            await cancelOperation(confirmCancel.id);
            showToast('Operation cancelled'); setConfirmCancel(null); load();
        } catch (err: any) { showToast(err.response?.data?.detail || 'Failed to cancel', 'error'); }
    };

    const addLine = () => setLines([...lines, { product_id: '', demand_qty: 1 }]);
    const removeLine = (i: number) => setLines(lines.filter((_, idx) => idx !== i));
    const updateLine = (i: number, field: string, val: string | number) => {
        const updated = [...lines]; updated[i] = { ...updated[i], [field]: val }; setLines(updated);
    };

    const internalLocs = locations.filter(l => l.location_type === 'internal');

    const columns = [
        { key: 'reference', header: 'Reference', render: (op: Operation) => <span className="font-semibold text-[#714B67] text-sm">{op.reference}</span> },
        { key: 'partner_name', header: partnerLabel, render: (op: Operation) => <span className="text-gray-600 text-sm">{op.partner_name || '—'}</span> },
        { key: 'route', header: 'Route', render: (op: Operation) => <span className="text-xs text-gray-500">{op.source_location_name || '—'} → {op.dest_location_name || '—'}</span> },
        { key: 'lines', header: 'Items', render: (op: Operation) => <span className="text-gray-600 text-sm">{op.lines.length} item{op.lines.length !== 1 ? 's' : ''}</span> },
        { key: 'scheduled_date', header: 'Scheduled', render: (op: Operation) => <span className="text-gray-500 text-xs">{op.scheduled_date ? new Date(op.scheduled_date).toLocaleDateString() : '—'}</span> },
        { key: 'status', header: 'Status', render: (op: Operation) => <Badge variant={op.status as any}>{statusLabel[op.status]}</Badge> },
        {
            key: 'actions', header: '', render: (op: Operation) => (
                <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                    <button onClick={() => setDetailOp(op)} className="p-1.5 rounded-md hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors" title="View"><Eye size={14} /></button>
                    {op.status !== 'done' && op.status !== 'cancelled' && (
                        <>
                            <button onClick={() => openValidate(op)} className="p-1.5 rounded-md hover:bg-green-50 text-gray-400 hover:text-green-600 transition-colors" title="Validate"><CheckCircle size={14} /></button>
                            <button onClick={() => setConfirmCancel(op)} className="p-1.5 rounded-md hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors" title="Cancel"><X size={14} /></button>
                        </>
                    )}
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

            <PageHeader title={title} subtitle={subtitle} icon={icon}
                actions={
                    <div className="flex items-center gap-2">
                        <button onClick={() => exportOperationsCSV(opType)}
                            className="flex items-center gap-2 px-3 py-2 border border-gray-200 text-gray-600 rounded-md hover:bg-gray-50 transition-colors text-sm font-medium">
                            <Download size={14} /> Export
                        </button>
                        <button onClick={() => setCreateOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-[#714B67] text-white rounded-md hover:bg-[#5d3d56] transition-colors text-sm font-medium">
                            <Plus size={15} /> New {title.slice(0, -1)}
                        </button>
                    </div>
                }
            />

            <div className="flex flex-col sm:flex-row gap-3 mb-5">
                <div className="relative flex-1">
                    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by reference or partner..."
                        className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:border-[#714B67] transition-colors" />
                </div>
                <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                    className="px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:border-[#714B67] bg-white text-gray-600">
                    <option value="">All Statuses</option>
                    {(['draft', 'waiting', 'ready', 'done', 'cancelled'] as OperationStatus[]).map(s => (
                        <option key={s} value={s}>{statusLabel[s]}</option>
                    ))}
                </select>
            </div>

            <div className="bg-white rounded-xl border border-gray-200">
                <Table columns={columns} data={ops} loading={loading} emptyMessage={`No ${title.toLowerCase()} found.`} />
                <Pagination page={page} pages={pages} total={total} pageSize={PAGE_SIZE} onPage={setPage} />
            </div>

            <ConfirmDialog open={!!confirmCancel} title="Cancel Operation"
                message={`Cancel operation ${confirmCancel?.reference}? This cannot be undone.`}
                confirmLabel="Cancel Operation" danger onConfirm={handleCancel} onCancel={() => setConfirmCancel(null)} />

            {/* Create Modal */}
            <Modal open={createOpen} onClose={() => setCreateOpen(false)} title={`New ${title.slice(0, -1)}`} size="xl">
                <div className="space-y-5">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2 sm:col-span-1">
                            <label className={labelClass}>{partnerLabel}</label>
                            <input value={form.partner_name} onChange={e => setForm({ ...form, partner_name: e.target.value })}
                                className={inputClass} placeholder={`Enter ${partnerLabel.toLowerCase()}`} />
                        </div>
                        <div>
                            <label className={labelClass}>Scheduled Date</label>
                            <input type="datetime-local" value={form.scheduled_date} onChange={e => setForm({ ...form, scheduled_date: e.target.value })} className={inputClass} />
                        </div>
                        {opType !== 'receipt' && (
                            <div>
                                <label className={labelClass}>Source Location</label>
                                <select value={form.source_location_id} onChange={e => setForm({ ...form, source_location_id: e.target.value })} className={inputClass}>
                                    <option value="">Default</option>
                                    {internalLocs.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                                </select>
                            </div>
                        )}
                        {opType !== 'delivery' && opType !== 'adjustment' && (
                            <div>
                                <label className={labelClass}>Destination Location</label>
                                <select value={form.dest_location_id} onChange={e => setForm({ ...form, dest_location_id: e.target.value })} className={inputClass}>
                                    <option value="">Default</option>
                                    {internalLocs.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                                </select>
                            </div>
                        )}
                        <div className="col-span-2">
                            <label className={labelClass}>Notes</label>
                            <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2}
                                className={`${inputClass} resize-none`} />
                        </div>
                    </div>
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <label className={labelClass}>Product Lines *</label>
                            <button onClick={addLine} className="flex items-center gap-1 text-xs text-[#714B67] hover:text-[#5d3d56] font-medium"><Plus size={12} /> Add Line</button>
                        </div>
                        {formErrors.lines && <p className="text-red-500 text-xs mb-2">{formErrors.lines}</p>}
                        <div className="space-y-2">
                            {lines.map((line, i) => (
                                <div key={i} className="flex items-center gap-2">
                                    <select value={line.product_id} onChange={e => updateLine(i, 'product_id', e.target.value)}
                                        className="flex-1 px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:border-[#714B67] bg-white">
                                        <option value="">Select product...</option>
                                        {products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.sku}) — Stock: {p.total_stock}</option>)}
                                    </select>
                                    <input type="number" min="0.01" step="0.01" value={line.demand_qty}
                                        onChange={e => updateLine(i, 'demand_qty', Number(e.target.value))}
                                        className="w-24 px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:border-[#714B67]" />
                                    {lines.length > 1 && (
                                        <button onClick={() => removeLine(i)} className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"><Trash2 size={14} /></button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="flex justify-end gap-3 pt-2">
                        <button onClick={() => setCreateOpen(false)} className="px-4 py-2 border border-gray-200 rounded-md text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">Cancel</button>
                        <button onClick={handleCreate} disabled={saving} className="px-5 py-2 bg-[#714B67] text-white rounded-md text-sm font-medium hover:bg-[#5d3d56] transition-colors disabled:opacity-50">
                            {saving ? 'Creating...' : 'Create'}
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Detail Modal */}
            {detailOp && !validateOpen && (
                <Modal open={!!detailOp} onClose={() => setDetailOp(null)} title={`Operation: ${detailOp.reference}`} size="lg">
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-3 text-sm">
                            {[
                                { label: 'Type', value: <Badge variant={detailOp.operation_type as any}>{detailOp.operation_type}</Badge> },
                                { label: 'Status', value: <Badge variant={detailOp.status as any}>{statusLabel[detailOp.status]}</Badge> },
                                { label: partnerLabel, value: <span className="font-medium text-gray-900">{detailOp.partner_name || '—'}</span> },
                                { label: 'Route', value: <span className="font-medium text-gray-900 text-xs">{detailOp.source_location_name || '—'} → {detailOp.dest_location_name || '—'}</span> },
                            ].map((f, i) => (
                                <div key={i} className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                                    <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-1">{f.label}</p>
                                    {f.value}
                                </div>
                            ))}
                        </div>
                        <div>
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Product Lines</p>
                            <div className="border border-gray-100 rounded-lg overflow-hidden">
                                <table className="w-full text-sm">
                                    <thead className="bg-gray-50 border-b border-gray-100">
                                        <tr>
                                            <th className="text-left px-4 py-2 text-xs text-gray-500 font-semibold">Product</th>
                                            <th className="text-right px-4 py-2 text-xs text-gray-500 font-semibold">Demand</th>
                                            <th className="text-right px-4 py-2 text-xs text-gray-500 font-semibold">Done</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {detailOp.lines.map(l => (
                                            <tr key={l.id} className="border-t border-gray-50">
                                                <td className="px-4 py-2.5">
                                                    <p className="font-medium text-gray-900">{l.product_name}</p>
                                                    <p className="text-xs text-gray-400">{l.product_sku}</p>
                                                </td>
                                                <td className="px-4 py-2.5 text-right text-gray-700">{l.demand_qty} {l.unit_of_measure}</td>
                                                <td className="px-4 py-2.5 text-right text-gray-700">{l.done_qty} {l.unit_of_measure}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                        {detailOp.activities && detailOp.activities.length > 0 && (
                            <div>
                                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1"><Clock size={11} /> Activity</p>
                                <div className="space-y-2">
                                    {detailOp.activities.map(a => (
                                        <div key={a.id} className="flex items-start gap-3 text-sm">
                                            <div className="w-1.5 h-1.5 rounded-full bg-[#714B67] mt-1.5 shrink-0" />
                                            <div>
                                                <span className="font-medium text-gray-700 capitalize">{a.activity_type}</span>
                                                {a.user_name && <span className="text-gray-400 text-xs ml-1">by {a.user_name}</span>}
                                                <p className="text-xs text-gray-400">{new Date(a.created_at).toLocaleString()}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                        {detailOp.notes && (
                            <div className="bg-amber-50 border border-amber-100 rounded-lg p-3">
                                <p className="text-xs text-amber-700 font-medium uppercase mb-1">Notes</p>
                                <p className="text-sm text-amber-900">{detailOp.notes}</p>
                            </div>
                        )}
                        {detailOp.status !== 'done' && detailOp.status !== 'cancelled' && (
                            <div className="flex justify-end gap-3">
                                <button onClick={() => setConfirmCancel(detailOp)} className="px-4 py-2 border border-red-200 text-red-600 rounded-md text-sm font-medium hover:bg-red-50 transition-colors">Cancel Op</button>
                                <button onClick={() => openValidate(detailOp)} className="px-5 py-2 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700 transition-colors">Validate</button>
                            </div>
                        )}
                    </div>
                </Modal>
            )}

            {/* Validate Modal */}
            {detailOp && validateOpen && (
                <Modal open={validateOpen} onClose={() => { setValidateOpen(false); setDetailOp(null); }} title={`Validate: ${detailOp.reference}`} size="md">
                    <div className="space-y-4">
                        <p className="text-sm text-gray-500">Enter the actual quantities processed. Stock will be updated automatically.</p>
                        <div className="space-y-2">
                            {detailOp.lines.map(l => (
                                <div key={l.id} className="flex items-center justify-between gap-4 p-3 bg-gray-50 rounded-lg border border-gray-100">
                                    <div>
                                        <p className="font-medium text-sm text-gray-900">{l.product_name}</p>
                                        <p className="text-xs text-gray-400">Demand: {l.demand_qty} {l.unit_of_measure}</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <label className="text-xs text-gray-500">Done:</label>
                                        <input type="number" min="0" step="0.01"
                                            value={doneQtys[l.product_id] ?? l.demand_qty}
                                            onChange={e => setDoneQtys({ ...doneQtys, [l.product_id]: Number(e.target.value) })}
                                            className="w-24 px-3 py-1.5 border border-gray-200 rounded-md text-sm focus:outline-none focus:border-green-500" />
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="flex justify-end gap-3">
                            <button onClick={() => { setValidateOpen(false); setDetailOp(null); }} className="px-4 py-2 border border-gray-200 rounded-md text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">Cancel</button>
                            <button onClick={handleValidate} disabled={saving} className="px-5 py-2 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-50">
                                {saving ? 'Validating...' : 'Confirm & Validate'}
                            </button>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
}
