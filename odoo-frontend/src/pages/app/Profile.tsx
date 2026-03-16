import { User, Mail, Shield, CheckCircle, XCircle, LogOut, Calendar } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function Profile() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    if (!user) return null;

    const handleLogout = () => { logout(); navigate('/login'); };

    const fields = [
        { icon: User, label: 'Full Name', value: user.name, color: 'text-[#714B67]', bg: 'bg-[#714B67]/8' },
        { icon: Mail, label: 'Email Address', value: user.email, color: 'text-blue-600', bg: 'bg-blue-50' },
        { icon: Shield, label: 'Role', value: user.role === 'admin' ? 'Inventory Manager' : 'Warehouse Staff', color: 'text-green-600', bg: 'bg-green-50' },
        { icon: Calendar, label: 'Account Status', value: user.is_verified ? 'Verified & Active' : 'Pending Verification', color: user.is_verified ? 'text-green-600' : 'text-amber-600', bg: user.is_verified ? 'bg-green-50' : 'bg-amber-50' },
    ];

    return (
        <div className="p-6 max-w-2xl">
            <div className="mb-6">
                <h1 className="text-xl font-bold text-gray-900">My Profile</h1>
                <p className="text-sm text-gray-500 mt-0.5">Your account information</p>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                {/* Header */}
                <div className="bg-[#714B67] px-6 py-8 flex items-center gap-4">
                    <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center text-white text-2xl font-bold shrink-0">
                        {user.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-white">{user.name}</h2>
                        <p className="text-white/70 text-sm">{user.email}</p>
                        <div className="flex items-center gap-1.5 mt-1.5">
                            {user.is_verified
                                ? <span className="flex items-center gap-1 text-green-300 text-xs font-medium"><CheckCircle size={11} /> Verified</span>
                                : <span className="flex items-center gap-1 text-orange-300 text-xs font-medium"><XCircle size={11} /> Not Verified</span>
                            }
                        </div>
                    </div>
                </div>

                {/* Fields */}
                <div className="p-6 space-y-3">
                    {fields.map((f, i) => (
                        <div key={i} className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg border border-gray-100">
                            <div className={`w-9 h-9 ${f.bg} rounded-lg flex items-center justify-center shrink-0`}>
                                <f.icon size={16} className={f.color} />
                            </div>
                            <div>
                                <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">{f.label}</p>
                                <p className="font-semibold text-gray-900 text-sm mt-0.5">{f.value}</p>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="px-6 pb-6">
                    <button onClick={handleLogout}
                        className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md text-sm font-medium transition-colors">
                        <LogOut size={15} /> Sign Out
                    </button>
                </div>
            </div>
        </div>
    );
}
