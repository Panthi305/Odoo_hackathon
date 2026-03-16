import { useEffect, useState } from 'react';
import { Settings as SettingsIcon, Plus, Edit2, Trash2, CheckCircle, X, Warehouse as WarehouseIcon, Tag, MapPin } from 'lucide-react';
import { getWarehouses, createWarehouse, updateWarehouse, getCategories, createCategory, updateCategory, deleteCategory, getLocations, createLocation } from '../../api/inventory';
import type { Warehouse, Category, Location } from '../../api/inventory';
import PageHeader from '../../components/ui/PageHeader';
import Modal from '../../components/ui/Modal';

const inputClass = "w-full px-3 py-2.5 border border-gray-200 rounded-md text-sm focus:outline-none focus:border-[#714B67] focus:ring-1 focus:ring-[#714B67] transition-colors";
const labelClass = "block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5";
const btnPrimary = "px-5 py-2 bg-[#714B67] text-white rounded-md text-sm font-medium hover:bg-[#5d3d56] transition-colors disabled:opacity-50";
const btnSecondary = "px-4 py-2 border border-gray-200 rounded-md text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors";

export default function Settings() {
    const [tab, setTab] = useState<'warehouses' | 'categories' | 'locations'>('warehouses');
    const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [locations, setLocations] = useState<Location[]>([]);
    const [toast, setToast] = useState('');
    const [toastType, setToastType] = useState<'success' | 'error'>('success');
    const [saving, setSaving] = useState(false);

    const [whModal, setWhModal] = useState(false);
    const [whForm, setWhForm] = useState({ name: '', code: '', address: '' });
    const [whErrors, setWhErrors] = useState<Record<string, string>>({});
    const [editingWh, setEditingWh] = useState<Warehouse | null>(null);

    const [catModal, setCatModal] = useState(false);
    const [catForm, setCatForm] = useState({ name: '', description: '' });
    const [catErrors, setCatErrors] = useState<Record<string, string>>({});
    const [editingCat, setEditingCat] = useState<Category | null>(null);

    const [locModal, setLocModal] = useState(false);
    const [locForm, setLocForm] = useState({ name: '', warehouse_id: '', location_type: 'internal' });
    const [locErrors, setLocErrors] = useState<Record<string, string>>({});

    const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
        setToast(msg); setToastType(type); setTimeout(() => setToast(''), 3000);
    };

    const loadAll = async () => {
        const [whs, cats, locs] = await Promise.all([getWarehouses(), getCategories(), getLocations()]);
        setWarehouses(whs); setCategories(cats); setLocations(locs);
    };

    useEffect(() => { loadAll(); }, []);

    const openCreateWh = () => { setEditingWh(null); setWhForm({ name: '', code: '', address: '' }); setWhErrors({}); setWhModal(true); };
    const openEditWh = (wh: Warehouse) => { setEditingWh(wh); setWhForm({ name: wh.name, code: wh.code, address: wh.address || '' }); setWhErrors({}); setWhModal(true); };
    const validateWh = () => {
        const e: Record<string, string> = {};
        if (!whForm.name.trim()) e.name = 'Name is required';
        if (!editingWh && !whForm.code.trim()) e.code = 'Code is required';
        setWhErrors(e); return Object.keys(e).length === 0;
    };
    const handleSaveWh = async () => {
        if (!validateWh()) return;
        setSaving(true);
        try {
            if (editingWh) await updateWarehouse(editingWh.id, { name: whForm.name, address: whForm.address });
            else await createWarehouse({ name: whForm.name, code: whForm.code, address: whForm.address });
            showToast(editingWh ? 'Warehouse updated' : 'Warehouse created');
            setWhModal(false); loadAll();
        } catch (err: any) { showToast(err.response?.data?.detail || 'Failed', 'error'); }
        finally { setSaving(false); }
    };

    const openCreateCat = () => { setEditingCat(null); setCatForm({ name: '', description: '' }); setCatErrors({}); setCatModal(true); };
    const openEditCat = (c: Category) => { setEditingCat(c); setCatForm({ name: c.name, description: c.description || '' }); setCatErrors({}); setCatModal(true); };
    const validateCat = () => {
        const e: Record<string, string> = {};
        if (!catForm.name.trim()) e.name = 'Name is required';
        setCatErrors(e); return Object.keys(e).length === 0;
    };
    const handleSaveCat = async () => {
        if (!validateCat()) return;
        setSaving(true);
        try {
            if (editingCat) await updateCategory(editingCat.id, catForm);
            else await createCategory(catForm);
            showToast(editingCat ? 'Category updated' : 'Category created');
            setCatModal(false); loadAll();
        } catch (err: any) { showToast(err.response?.data?.detail || 'Failed', 'error'); }
        finally { setSaving(false); }
    };
    const handleDeleteCat = async (c: Category) => {
        if (!confirm(`Delete category "${c.name}"?`)) return;
        try { await deleteCategory(c.id); showToast('Category deleted'); loadAll(); }
        catch (err: any) { showToast(err.response?.data?.detail || 'Failed to delete', 'error'); }
    };

    const validateLoc = () => {
        const e: Record<string, string> = {};
        if (!locForm.name.trim()) e.name = 'Name is required';
        setLocErrors(e); return Object.keys(e).length === 0;
    };
    const handleSaveLoc = async () => {
        if (!validateLoc()) return;
        setSaving(true);
        try {
            await createLocation({ name: locForm.name, warehouse_id: locForm.warehouse_id ? Number(locForm.warehouse_id) : undefined, location_type: locForm.location_type });
            showToast('Location created'); setLocModal(false);
            setLocForm({ name: '', warehouse_id: '', location_type: 'internal' }); loadAll();
        } catch (err: any) { showToast(err.response?.data?.detail || 'Failed', 'error'); }
        finally { setSaving(false); }
    };

    const tabs = [
        { key: 'warehouses', label: 'Warehouses', icon: WarehouseIcon },
        { key: 'categories', label: 'Categories', icon: Tag },
        { key: 'locations', label: 'Locations', icon: MapPin },
    ] as const;

    const addBtn = (label: string, onClick: () => void) => (
        <button onClick={onClick} className="flex items-center gap-1.5 px-3 py-1.5 bg-[#714B67] text-white rounded-md text-sm font-medium hover:bg-[#5d3d56] transition-colors">
            <Plus size={14} /> {label}
        </button>
    );

    const statusBadge = (active: boolean) => (
        <span className={`text-xs px-2 py-0.5 rounded-md font-medium ${active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
            {active ? 'Active' : 'Inactive'}
        </span>
    );

    return (
        <div className="p-6">
            {toast && (
                <div className={`fixed top-4 right-4 z-50 px-4 py-2.5 rounded-lg shadow-lg flex items-center gap-2 text-white text-sm ${toastType === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
                    {toastType === 'success' ? <CheckCircle size={15} /> : <X size={15} />} {toast}
                </div>
            )}

            <PageHeader title="Settings" subtitle="Configure warehouses, categories, and locations" icon={<SettingsIcon size={18} />} />

            {/* Tabs */}
            <div className="flex gap-1 border-b border-gray-200 mb-6">
                {tabs.map(t => {
                    const Icon = t.icon;
                    return (
                        <button key={t.key} onClick={() => setTab(t.key)}
                            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${tab === t.key ? 'border-[#714B67] text-[#714B67]' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                            <Icon size={15} /> {t.label}
                        </button>
                    );
                })}
            </div>

            {tab === 'warehouses' && (
                <div className="bg-white rounded-xl border border-gray-200">
                    <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                        <h2 className="font-semibold text-gray-900">Warehouses</h2>
                        {addBtn('Add Warehouse', openCreateWh)}
                    </div>
                    <div className="divide-y divide-gray-50">
                        {warehouses.map(wh => (
                            <div key={wh.id} className="px-5 py-4 flex items-center justify-between">
                                <div>
                                    <p className="font-semibold text-gray-900">{wh.name} <span className="text-xs text-gray-400 font-normal font-mono ml-1">({wh.code})</span></p>
                                    <p className="text-sm text-gray-500 mt-0.5">{wh.address || 'No address'}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    {statusBadge(wh.is_active)}
                                    <button onClick={() => openEditWh(wh)} className="p-1.5 rounded-md hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"><Edit2 size={14} /></button>
                                </div>
                            </div>
                        ))}
                        {warehouses.length === 0 && <p className="px-5 py-10 text-center text-gray-400 text-sm">No warehouses yet</p>}
                    </div>
                </div>
            )}

            {tab === 'categories' && (
                <div className="bg-white rounded-xl border border-gray-200">
                    <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                        <h2 className="font-semibold text-gray-900">Product Categories</h2>
                        {addBtn('Add Category', openCreateCat)}
                    </div>
                    <div className="divide-y divide-gray-50">
                        {categories.map(c => (
                            <div key={c.id} className="px-5 py-4 flex items-center justify-between">
                                <div>
                                    <p className="font-semibold text-gray-900">{c.name}</p>
                                    <p className="text-sm text-gray-500 mt-0.5">{c.description || 'No description'}</p>
                                </div>
                                <div className="flex items-center gap-1">
                                    <button onClick={() => openEditCat(c)} className="p-1.5 rounded-md hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"><Edit2 size={14} /></button>
                                    <button onClick={() => handleDeleteCat(c)} className="p-1.5 rounded-md hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"><Trash2 size={14} /></button>
                                </div>
                            </div>
                        ))}
                        {categories.length === 0 && <p className="px-5 py-10 text-center text-gray-400 text-sm">No categories yet</p>}
                    </div>
                </div>
            )}

            {tab === 'locations' && (
                <div className="bg-white rounded-xl border border-gray-200">
                    <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                        <h2 className="font-semibold text-gray-900">Locations</h2>
                        {addBtn('Add Location', () => setLocModal(true))}
                    </div>
                    <div className="divide-y divide-gray-50">
                        {locations.map(l => (
                            <div key={l.id} className="px-5 py-4 flex items-center justify-between">
                                <div>
                                    <p className="font-semibold text-gray-900">{l.name}</p>
                                    <p className="text-sm text-gray-500 capitalize mt-0.5">{l.location_type}</p>
                                </div>
                                {statusBadge(l.is_active)}
                            </div>
                        ))}
                        {locations.length === 0 && <p className="px-5 py-10 text-center text-gray-400 text-sm">No locations yet</p>}
                    </div>
                </div>
            )}

            {/* Warehouse Modal */}
            <Modal open={whModal} onClose={() => setWhModal(false)} title={editingWh ? 'Edit Warehouse' : 'New Warehouse'} size="sm">
                <div className="space-y-4">
                    <div>
                        <label className={labelClass}>Name *</label>
                        <input value={whForm.name} onChange={e => setWhForm({ ...whForm, name: e.target.value })}
                            className={`${inputClass} ${whErrors.name ? 'border-red-400' : ''}`} />
                        {whErrors.name && <p className="text-red-500 text-xs mt-1">{whErrors.name}</p>}
                    </div>
                    {!editingWh && (
                        <div>
                            <label className={labelClass}>Code *</label>
                            <input value={whForm.code} onChange={e => setWhForm({ ...whForm, code: e.target.value.toUpperCase() })}
                                className={`${inputClass} ${whErrors.code ? 'border-red-400' : ''}`} placeholder="e.g. WH2" />
                            {whErrors.code && <p className="text-red-500 text-xs mt-1">{whErrors.code}</p>}
                        </div>
                    )}
                    <div>
                        <label className={labelClass}>Address</label>
                        <textarea value={whForm.address} onChange={e => setWhForm({ ...whForm, address: e.target.value })} rows={2} className={`${inputClass} resize-none`} />
                    </div>
                    <div className="flex justify-end gap-3">
                        <button onClick={() => setWhModal(false)} className={btnSecondary}>Cancel</button>
                        <button onClick={handleSaveWh} disabled={saving} className={btnPrimary}>{saving ? 'Saving...' : editingWh ? 'Update' : 'Create'}</button>
                    </div>
                </div>
            </Modal>

            {/* Category Modal */}
            <Modal open={catModal} onClose={() => setCatModal(false)} title={editingCat ? 'Edit Category' : 'New Category'} size="sm">
                <div className="space-y-4">
                    <div>
                        <label className={labelClass}>Name *</label>
                        <input value={catForm.name} onChange={e => setCatForm({ ...catForm, name: e.target.value })}
                            className={`${inputClass} ${catErrors.name ? 'border-red-400' : ''}`} />
                        {catErrors.name && <p className="text-red-500 text-xs mt-1">{catErrors.name}</p>}
                    </div>
                    <div>
                        <label className={labelClass}>Description</label>
                        <textarea value={catForm.description} onChange={e => setCatForm({ ...catForm, description: e.target.value })} rows={2} className={`${inputClass} resize-none`} />
                    </div>
                    <div className="flex justify-end gap-3">
                        <button onClick={() => setCatModal(false)} className={btnSecondary}>Cancel</button>
                        <button onClick={handleSaveCat} disabled={saving} className={btnPrimary}>{saving ? 'Saving...' : editingCat ? 'Update' : 'Create'}</button>
                    </div>
                </div>
            </Modal>

            {/* Location Modal */}
            <Modal open={locModal} onClose={() => setLocModal(false)} title="New Location" size="sm">
                <div className="space-y-4">
                    <div>
                        <label className={labelClass}>Name *</label>
                        <input value={locForm.name} onChange={e => setLocForm({ ...locForm, name: e.target.value })}
                            className={`${inputClass} ${locErrors.name ? 'border-red-400' : ''}`} placeholder="e.g. WH/Rack-A" />
                        {locErrors.name && <p className="text-red-500 text-xs mt-1">{locErrors.name}</p>}
                    </div>
                    <div>
                        <label className={labelClass}>Warehouse</label>
                        <select value={locForm.warehouse_id} onChange={e => setLocForm({ ...locForm, warehouse_id: e.target.value })} className={inputClass}>
                            <option value="">None</option>
                            {warehouses.map(wh => <option key={wh.id} value={wh.id}>{wh.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className={labelClass}>Type</label>
                        <select value={locForm.location_type} onChange={e => setLocForm({ ...locForm, location_type: e.target.value })} className={inputClass}>
                            <option value="internal">Internal</option>
                            <option value="vendor">Vendor</option>
                            <option value="customer">Customer</option>
                            <option value="virtual">Virtual</option>
                        </select>
                    </div>
                    <div className="flex justify-end gap-3">
                        <button onClick={() => setLocModal(false)} className={btnSecondary}>Cancel</button>
                        <button onClick={handleSaveLoc} disabled={saving} className={btnPrimary}>{saving ? 'Saving...' : 'Create'}</button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
