import { useEffect, useState } from 'react';
import { Users, Shield, HardHat, CheckCircle, X } from 'lucide-react';
import { getUsers, updateUserRole } from '../../api/inventory';
import type { UserRecord } from '../../api/inventory';
import PageHeader from '../../components/ui/PageHeader';
import Table from '../../components/ui/Table';

export default function UserManagement() {
    const [users, setUsers] = useState<UserRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [toast, setToast] = useState('');
    const [toastType, setToastType] = useState<'success' | 'error'>('success');

    const load = async () => {
        setLoading(true);
        try { setUsers(await getUsers()); }
        finally { setLoading(false); }
    };

    useEffect(() => { load(); }, []);

    const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
        setToast(msg); setToastType(type);
        setTimeout(() => setToast(''), 3000);
    };

    const handleRoleToggle = async (u: UserRecord) => {
        const newRole = u.role === 'admin' ? 'staff' : 'admin';
        try {
            await updateUserRole(u.id, newRole);
            showToast(`${u.name} is now ${newRole === 'admin' ? 'Inventory Manager' : 'Warehouse Staff'}`);
            load();
        } catch { showToast('Failed to update role', 'error'); }
    };

    const columns = [
        {
            key: 'name', header: 'User', render: (u: UserRecord) => (
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-[#714B67] rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0">
                        {u.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <p className="font-semibold text-gray-900">{u.name}</p>
                        <p className="text-xs text-gray-400">{u.email}</p>
                    </div>
                </div>
            )
        },
        {
            key: 'role', header: 'Role', render: (u: UserRecord) => (
                <div className="flex items-center gap-2">
                    {u.role === 'admin'
                        ? <><Shield size={13} className="text-[#714B67]" /><span className="text-sm font-semibold text-[#714B67]">Inventory Manager</span></>
                        : <><HardHat size={13} className="text-gray-500" /><span className="text-sm text-gray-600">Warehouse Staff</span></>
                    }
                </div>
            )
        },
        {
            key: 'is_verified', header: 'Status', render: (u: UserRecord) => (
                <span className={`text-xs px-2 py-0.5 rounded-md font-medium ${u.is_verified ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                    {u.is_verified ? 'Verified' : 'Unverified'}
                </span>
            )
        },
        {
            key: 'created_at', header: 'Joined', render: (u: UserRecord) => (
                <span className="text-sm text-gray-500">{new Date(u.created_at).toLocaleDateString()}</span>
            )
        },
        {
            key: 'actions', header: '', render: (u: UserRecord) => (
                <button onClick={() => handleRoleToggle(u)}
                    className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${u.role === 'admin'
                        ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        : 'bg-[#714B67]/10 text-[#714B67] hover:bg-[#714B67]/20'}`}>
                    {u.role === 'admin' ? 'Set as Staff' : 'Set as Manager'}
                </button>
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
            <PageHeader title="User Management" subtitle="Manage roles for Inventory Managers and Warehouse Staff" icon={<Users size={18} />} />
            <div className="bg-white rounded-xl border border-gray-200">
                <Table columns={columns} data={users} loading={loading} emptyMessage="No users found." />
            </div>
        </div>
    );
}
