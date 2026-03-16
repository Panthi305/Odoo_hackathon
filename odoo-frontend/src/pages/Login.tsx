import { useState, useEffect } from 'react';
import { Mail, Lock, User, Chrome, Eye, EyeOff, Boxes, Warehouse, ClipboardList, ArrowRight } from 'lucide-react';
import { signup, login, verifyOtp, forgotPassword, resetPassword, getGoogleLoginUrl } from '../api/auth';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

type View = 'login' | 'signup';

const Login = () => {
    const navigate = useNavigate();
    const { login: authLogin } = useAuth();
    const [searchParams] = useSearchParams();
    const [view, setView] = useState<View>('login');
    const [showOtpModal, setShowOtpModal] = useState(false);
    const [showForgotPassword, setShowForgotPassword] = useState(false);
    const [showResetPassword, setShowResetPassword] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [otpEmail, setOtpEmail] = useState('');
    const [resetEmail, setResetEmail] = useState('');
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        otp: '',
        newPassword: '',
        role: 'staff' as 'admin' | 'staff',
    });
    const [message, setMessage] = useState('');
    const [messageType, setMessageType] = useState<'success' | 'error'>('error');
    const [loading, setLoading] = useState(false);

    const showMsg = (msg: string, type: 'success' | 'error' = 'error') => {
        setMessage(msg);
        setMessageType(type);
        setTimeout(() => setMessage(''), 5000);
    };

    useEffect(() => {
        const accessToken = searchParams.get('access_token');
        const refreshToken = searchParams.get('refresh_token');
        const userParam = searchParams.get('user');
        const error = searchParams.get('error');
        if (error) { showMsg('OAuth login failed. Please try again.'); return; }
        if (accessToken && refreshToken && userParam) {
            try {
                const userData = JSON.parse(decodeURIComponent(userParam));
                authLogin(accessToken, refreshToken, userData);
                navigate('/app/dashboard', { replace: true });
            } catch { showMsg('Login failed. Please try again.'); }
        }
    }, [searchParams, navigate, authLogin]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const response = await login({ email: formData.email, password: formData.password });
            authLogin(response.access_token, response.refresh_token, response.user);
            navigate('/app/dashboard', { replace: true });
        } catch (error: any) {
            showMsg(error.response?.data?.detail || 'Login failed. Please check your credentials.');
        } finally { setLoading(false); }
    };

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await signup({ name: formData.name, email: formData.email, password: formData.password, role: formData.role });
            setOtpEmail(formData.email);
            setShowOtpModal(true);
            showMsg('OTP sent to your email.', 'success');
        } catch (error: any) {
            showMsg(error.response?.data?.detail || 'Signup failed. Please try again.');
        } finally { setLoading(false); }
    };

    const handleVerifyOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await verifyOtp({ email: otpEmail, otp: formData.otp });
            showMsg('Email verified. You can now sign in.', 'success');
            setShowOtpModal(false);
            setView('login');
        } catch (error: any) {
            showMsg(error.response?.data?.detail || 'OTP verification failed.');
        } finally { setLoading(false); }
    };

    const handleForgotPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await forgotPassword({ email: resetEmail });
            showMsg('OTP sent to your email.', 'success');
            setShowForgotPassword(false);
            setShowResetPassword(true);
        } catch (error: any) {
            showMsg(error.response?.data?.detail || 'Failed to send OTP.');
        } finally { setLoading(false); }
    };

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await resetPassword({ email: resetEmail, otp: formData.otp, new_password: formData.newPassword });
            showMsg('Password reset successfully. You can now sign in.', 'success');
            setShowResetPassword(false);
            setView('login');
            setFormData(prev => ({ ...prev, otp: '', newPassword: '' }));
        } catch (error: any) {
            showMsg(error.response?.data?.detail || 'Password reset failed.');
        } finally { setLoading(false); }
    };

    const Modal = ({ title, subtitle, onClose, children }: { title: string; subtitle: string; onClose: () => void; children: React.ReactNode }) => (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-8 border border-gray-200">
                <h3 className="text-xl font-bold text-gray-900 mb-1">{title}</h3>
                <p className="text-sm text-gray-500 mb-6">{subtitle}</p>
                {children}
                <button onClick={onClose} className="mt-4 text-sm text-gray-500 hover:text-gray-700 transition-colors">
                    Cancel
                </button>
            </div>
        </div>
    );

    const inputClass = "w-full pl-10 pr-4 py-2.5 bg-white border border-gray-300 rounded-md text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#714B67] focus:ring-1 focus:ring-[#714B67] transition-colors";
    const labelClass = "block text-sm font-medium text-gray-700 mb-1.5";

    return (
        <div className="min-h-[calc(100vh-64px)] bg-gray-50 flex items-center justify-center px-4 py-12">
            {/* Modals */}
            {showOtpModal && (
                <Modal title="Verify Your Email" subtitle={`Enter the OTP sent to ${otpEmail}`} onClose={() => setShowOtpModal(false)}>
                    <form onSubmit={handleVerifyOtp} className="space-y-4">
                        <input type="text" placeholder="Enter 6-digit OTP" value={formData.otp}
                            onChange={e => setFormData({ ...formData, otp: e.target.value })}
                            className="w-full px-4 py-2.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:border-[#714B67] focus:ring-1 focus:ring-[#714B67]" />
                        <button type="submit" disabled={loading}
                            className="w-full py-2.5 bg-[#714B67] text-white text-sm font-semibold rounded-md hover:bg-[#5d3d56] disabled:opacity-50 transition-colors">
                            {loading ? 'Verifying...' : 'Verify OTP'}
                        </button>
                    </form>
                </Modal>
            )}

            {showForgotPassword && (
                <Modal title="Reset Password" subtitle="Enter your email to receive a reset OTP" onClose={() => setShowForgotPassword(false)}>
                    <form onSubmit={handleForgotPassword} className="space-y-4">
                        <input type="email" placeholder="your@email.com" value={resetEmail}
                            onChange={e => setResetEmail(e.target.value)}
                            className="w-full px-4 py-2.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:border-[#714B67] focus:ring-1 focus:ring-[#714B67]" />
                        <button type="submit" disabled={loading}
                            className="w-full py-2.5 bg-[#714B67] text-white text-sm font-semibold rounded-md hover:bg-[#5d3d56] disabled:opacity-50 transition-colors">
                            {loading ? 'Sending...' : 'Send OTP'}
                        </button>
                    </form>
                </Modal>
            )}

            {showResetPassword && (
                <Modal title="Set New Password" subtitle="Enter the OTP and your new password" onClose={() => setShowResetPassword(false)}>
                    <form onSubmit={handleResetPassword} className="space-y-4">
                        <input type="text" placeholder="Enter OTP" value={formData.otp}
                            onChange={e => setFormData({ ...formData, otp: e.target.value })}
                            className="w-full px-4 py-2.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:border-[#714B67] focus:ring-1 focus:ring-[#714B67]" />
                        <input type="password" placeholder="New password" value={formData.newPassword}
                            onChange={e => setFormData({ ...formData, newPassword: e.target.value })}
                            className="w-full px-4 py-2.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:border-[#714B67] focus:ring-1 focus:ring-[#714B67]" />
                        <button type="submit" disabled={loading}
                            className="w-full py-2.5 bg-[#714B67] text-white text-sm font-semibold rounded-md hover:bg-[#5d3d56] disabled:opacity-50 transition-colors">
                            {loading ? 'Resetting...' : 'Reset Password'}
                        </button>
                    </form>
                </Modal>
            )}

            {/* Toast */}
            {message && (
                <div className={`fixed top-5 right-5 z-50 px-5 py-3 rounded-lg shadow-lg border text-sm font-medium ${messageType === 'success'
                        ? 'bg-green-50 border-green-200 text-green-800'
                        : 'bg-red-50 border-red-200 text-red-800'
                    }`}>
                    {message}
                </div>
            )}

            <div className="w-full max-w-5xl bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden flex min-h-[600px]">
                {/* Left Panel — Branding */}
                <div className="hidden lg:flex lg:w-5/12 bg-[#714B67] flex-col justify-between p-10">
                    <div>
                        <Link to="/" className="flex items-center gap-2 mb-12">
                            <div className="w-8 h-8 bg-white/20 rounded-md flex items-center justify-center">
                                <Boxes size={16} className="text-white" />
                            </div>
                            <span className="text-white font-bold text-lg">CoreInventory</span>
                        </Link>

                        <h2 className="text-3xl font-extrabold text-white leading-tight mb-4">
                            {view === 'login' ? 'Welcome back.' : 'Join CoreInventory.'}
                        </h2>
                        <p className="text-white/70 text-sm leading-relaxed">
                            {view === 'login'
                                ? 'Sign in to manage your inventory, track stock movements, and keep operations running smoothly.'
                                : 'Create your account and start managing inventory with real-time tracking and full audit trails.'}
                        </p>
                    </div>

                    {/* Feature list */}
                    <div className="space-y-3">
                        {['Real-time stock tracking', 'Multi-warehouse support', 'Full audit trail', 'Role-based access control'].map(f => (
                            <div key={f} className="flex items-center gap-2.5 text-sm text-white/80">
                                <div className="w-1.5 h-1.5 rounded-full bg-white/60"></div>
                                {f}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Right Panel — Form */}
                <div className="flex-1 flex flex-col justify-center px-8 md:px-12 py-10">
                    {/* Tab switcher */}
                    <div className="flex border border-gray-200 rounded-lg p-1 mb-8 w-fit">
                        {(['login', 'signup'] as View[]).map(v => (
                            <button
                                key={v}
                                onClick={() => setView(v)}
                                className={`px-5 py-2 text-sm font-medium rounded-md transition-colors ${view === v
                                        ? 'bg-[#714B67] text-white'
                                        : 'text-gray-600 hover:text-gray-900'
                                    }`}
                            >
                                {v === 'login' ? 'Sign In' : 'Create Account'}
                            </button>
                        ))}
                    </div>

                    {view === 'login' ? (
                        <form onSubmit={handleLogin} className="space-y-5 max-w-sm">
                            <div>
                                <label className={labelClass}>Email Address</label>
                                <div className="relative">
                                    <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                    <input type="email" placeholder="you@company.com" value={formData.email}
                                        onChange={e => setFormData({ ...formData, email: e.target.value })}
                                        required className={inputClass} />
                                </div>
                            </div>
                            <div>
                                <label className={labelClass}>Password</label>
                                <div className="relative">
                                    <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                    <input type={showPassword ? 'text' : 'password'} placeholder="Your password" value={formData.password}
                                        onChange={e => setFormData({ ...formData, password: e.target.value })}
                                        required className={`${inputClass} pr-10`} />
                                    <button type="button" onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                </div>
                            </div>

                            <div className="flex justify-end">
                                <button type="button" onClick={() => setShowForgotPassword(true)}
                                    className="text-xs text-[#714B67] hover:underline font-medium">
                                    Forgot password?
                                </button>
                            </div>

                            <button type="submit" disabled={loading}
                                className="w-full py-2.5 bg-[#714B67] text-white text-sm font-semibold rounded-md hover:bg-[#5d3d56] disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
                                {loading ? 'Signing in...' : (<>Sign In <ArrowRight size={16} /></>)}
                            </button>

                            <div className="relative py-2">
                                <div className="absolute inset-0 flex items-center">
                                    <div className="w-full border-t border-gray-200"></div>
                                </div>
                                <div className="relative flex justify-center">
                                    <span className="bg-white px-3 text-xs text-gray-400 uppercase tracking-wider">or continue with</span>
                                </div>
                            </div>

                            <button type="button" onClick={() => window.location.href = getGoogleLoginUrl()}
                                className="w-full py-2.5 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors flex items-center justify-center gap-2">
                                <Chrome size={16} className="text-red-500" />
                                Continue with Google
                            </button>
                        </form>
                    ) : (
                        <form onSubmit={handleSignup} className="space-y-5 max-w-sm">
                            <div>
                                <label className={labelClass}>Full Name</label>
                                <div className="relative">
                                    <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                    <input type="text" placeholder="John Doe" value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                        required className={inputClass} />
                                </div>
                            </div>
                            <div>
                                <label className={labelClass}>Email Address</label>
                                <div className="relative">
                                    <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                    <input type="email" placeholder="you@company.com" value={formData.email}
                                        onChange={e => setFormData({ ...formData, email: e.target.value })}
                                        required className={inputClass} />
                                </div>
                            </div>
                            <div>
                                <label className={labelClass}>Password</label>
                                <div className="relative">
                                    <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                    <input type={showPassword ? 'text' : 'password'} placeholder="Create a strong password" value={formData.password}
                                        onChange={e => setFormData({ ...formData, password: e.target.value })}
                                        required className={`${inputClass} pr-10`} />
                                    <button type="button" onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className={labelClass}>Role</label>
                                <div className="grid grid-cols-2 gap-3">
                                    {(['staff', 'admin'] as const).map(r => (
                                        <button key={r} type="button"
                                            onClick={() => setFormData({ ...formData, role: r })}
                                            className={`py-2.5 px-3 rounded-md text-sm font-medium border transition-colors flex items-center justify-center gap-2 ${formData.role === r
                                                    ? 'border-[#714B67] bg-[#714B67]/8 text-[#714B67]'
                                                    : 'border-gray-300 text-gray-600 hover:border-gray-400'
                                                }`}>
                                            {r === 'staff' ? <Warehouse size={15} /> : <ClipboardList size={15} />}
                                            {r === 'staff' ? 'Warehouse Staff' : 'Inventory Manager'}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <button type="submit" disabled={loading}
                                className="w-full py-2.5 bg-[#714B67] text-white text-sm font-semibold rounded-md hover:bg-[#5d3d56] disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
                                {loading ? 'Creating Account...' : (<>Create Account <ArrowRight size={16} /></>)}
                            </button>

                            <div className="relative py-2">
                                <div className="absolute inset-0 flex items-center">
                                    <div className="w-full border-t border-gray-200"></div>
                                </div>
                                <div className="relative flex justify-center">
                                    <span className="bg-white px-3 text-xs text-gray-400 uppercase tracking-wider">or continue with</span>
                                </div>
                            </div>

                            <button type="button" onClick={() => window.location.href = getGoogleLoginUrl()}
                                className="w-full py-2.5 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors flex items-center justify-center gap-2">
                                <Chrome size={16} className="text-red-500" />
                                Continue with Google
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Login;
