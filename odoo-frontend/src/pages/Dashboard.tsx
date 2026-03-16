import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { User, Mail, Calendar, LogOut, CheckCircle, XCircle } from 'lucide-react';

interface UserData {
    id: number;
    name: string;
    email: string;
    is_verified: boolean;
}

const Dashboard = () => {
    const navigate = useNavigate();
    const [user, setUser] = useState<UserData | null>(null);

    useEffect(() => {
        const userData = localStorage.getItem('user');
        const token = localStorage.getItem('access_token');

        if (!userData || !token) {
            navigate('/login');
            return;
        }

        setUser(JSON.parse(userData));
    }, [navigate]);

    const handleLogout = () => {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user');
        navigate('/login');
    };

    if (!user) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-xl">Loading...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-12 px-4">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center mb-8"
                >
                    <h1 className="text-4xl font-bold text-slate-900 mb-2">Welcome Back!</h1>
                    <p className="text-slate-600">Manage your profile and account settings</p>
                </motion.div>

                {/* Profile Card */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.1 }}
                    className="bg-white rounded-3xl shadow-xl p-8 mb-6"
                >
                    {/* Profile Header */}
                    <div className="flex items-center justify-between mb-8 pb-6 border-b border-slate-100">
                        <div className="flex items-center gap-4">
                            <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl flex items-center justify-center text-white text-3xl font-bold shadow-lg">
                                {user.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-slate-900">{user.name}</h2>
                                <div className="flex items-center gap-2 mt-1">
                                    {user.is_verified ? (
                                        <span className="flex items-center gap-1 text-green-600 text-sm font-medium">
                                            <CheckCircle className="w-4 h-4" />
                                            Verified Account
                                        </span>
                                    ) : (
                                        <span className="flex items-center gap-1 text-orange-600 text-sm font-medium">
                                            <XCircle className="w-4 h-4" />
                                            Not Verified
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                        <button
                            onClick={handleLogout}
                            className="flex items-center gap-2 px-6 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-semibold transition-all active:scale-95 shadow-lg"
                        >
                            <LogOut className="w-5 h-5" />
                            Logout
                        </button>
                    </div>

                    {/* Profile Details */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-bold text-slate-900 mb-4">Profile Information</h3>

                        <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl">
                            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                                <User className="w-6 h-6 text-purple-600" />
                            </div>
                            <div>
                                <p className="text-sm text-slate-500 font-medium">Full Name</p>
                                <p className="text-lg font-semibold text-slate-900">{user.name}</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl">
                            <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center">
                                <Mail className="w-6 h-6 text-indigo-600" />
                            </div>
                            <div>
                                <p className="text-sm text-slate-500 font-medium">Email Address</p>
                                <p className="text-lg font-semibold text-slate-900">{user.email}</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl">
                            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                                <Calendar className="w-6 h-6 text-blue-600" />
                            </div>
                            <div>
                                <p className="text-sm text-slate-500 font-medium">User ID</p>
                                <p className="text-lg font-semibold text-slate-900">#{user.id}</p>
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* Quick Actions */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="grid grid-cols-1 md:grid-cols-3 gap-4"
                >
                    <button className="p-6 bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all text-center group">
                        <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                            <User className="w-6 h-6 text-purple-600" />
                        </div>
                        <h3 className="font-bold text-slate-900">Edit Profile</h3>
                        <p className="text-sm text-slate-500 mt-1">Update your information</p>
                    </button>

                    <button className="p-6 bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all text-center group">
                        <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                            <Mail className="w-6 h-6 text-indigo-600" />
                        </div>
                        <h3 className="font-bold text-slate-900">Change Email</h3>
                        <p className="text-sm text-slate-500 mt-1">Update email address</p>
                    </button>

                    <button className="p-6 bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all text-center group">
                        <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                            <CheckCircle className="w-6 h-6 text-blue-600" />
                        </div>
                        <h3 className="font-bold text-slate-900">Security</h3>
                        <p className="text-sm text-slate-500 mt-1">Manage password</p>
                    </button>
                </motion.div>
            </div>
        </div>
    );
};

export default Dashboard;
