import { useState, useEffect, useRef } from "react";
import type { ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
    LayoutDashboard, Package, ArrowDownToLine, ArrowUpFromLine,
    ArrowLeftRight, ClipboardList, History, Settings, User,
    LogOut, Bell, Menu, X, Boxes, AlertTriangle, XCircle,
    Users, RefreshCw, ShieldCheck, TrendingDown, ChevronDown,
    ChevronLeft, ChevronRight
} from "lucide-react";
import { getAlerts } from "../api/inventory";
import type { StockAlert } from "../api/inventory";

interface NavItem {
    label: string;
    icon: typeof LayoutDashboard;
    path: string;
    adminOnly?: boolean;
}

const navItems: NavItem[] = [
    { label: "Dashboard", icon: LayoutDashboard, path: "/app/dashboard" },
    { label: "Products", icon: Package, path: "/app/products" },
    { label: "Receipts", icon: ArrowDownToLine, path: "/app/receipts" },
    { label: "Deliveries", icon: ArrowUpFromLine, path: "/app/deliveries" },
    { label: "Transfers", icon: ArrowLeftRight, path: "/app/transfers" },
    { label: "Adjustments", icon: ClipboardList, path: "/app/adjustments" },
    { label: "Move History", icon: History, path: "/app/history" },
    { label: "Reorder Rules", icon: RefreshCw, path: "/app/reorder-rules" },
];

const adminItems: NavItem[] = [
    { label: "Users", icon: Users, path: "/app/users", adminOnly: true },
    { label: "Audit Logs", icon: ShieldCheck, path: "/app/audit-logs", adminOnly: true },
    { label: "Settings", icon: Settings, path: "/app/settings", adminOnly: true },
];

export default function IMSLayout({ children }: { children: ReactNode }) {
    const [collapsed, setCollapsed] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);
    const [alerts, setAlerts] = useState<StockAlert[]>([]);
    const [showAlerts, setShowAlerts] = useState(false);
    const [showUserMenu, setShowUserMenu] = useState(false);
    const alertRef = useRef<HTMLDivElement>(null);
    const userMenuRef = useRef<HTMLDivElement>(null);
    const location = useLocation();
    const navigate = useNavigate();
    const { user, logout, isAdmin } = useAuth();

    useEffect(() => {
        getAlerts().then(setAlerts).catch(() => { });
    }, [location.pathname]);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (alertRef.current && !alertRef.current.contains(e.target as Node)) setShowAlerts(false);
            if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) setShowUserMenu(false);
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    const handleLogout = () => { logout(); navigate("/login"); };
    const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path + "/");
    const allItems = [...navItems, ...adminItems];
    const currentPage = allItems.find(i => isActive(i.path));

    const NavLink = ({ item }: { item: NavItem }) => {
        const active = isActive(item.path);
        const Icon = item.icon;
        return (
            <Link
                to={item.path}
                onClick={() => setMobileOpen(false)}
                title={collapsed ? item.label : undefined}
                className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors relative group
                    ${active
                        ? "bg-[#714B67] text-white"
                        : "text-gray-400 hover:bg-white/8 hover:text-white"
                    } ${collapsed ? "justify-center" : ""}`}
            >
                <Icon size={17} className="shrink-0" />
                {!collapsed && <span>{item.label}</span>}
                {collapsed && (
                    <div className="absolute left-full ml-2.5 px-2.5 py-1.5 bg-gray-900 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 shadow-lg border border-white/10">
                        {item.label}
                    </div>
                )}
            </Link>
        );
    };

    const SidebarContent = () => (
        <div className="flex flex-col h-full overflow-hidden">
            {/* Logo */}
            <div className={`flex items-center gap-2.5 px-4 h-14 border-b border-white/8 shrink-0 ${collapsed ? "justify-center" : ""}`}>
                <div className="w-7 h-7 bg-[#714B67] rounded-md flex items-center justify-center shrink-0">
                    <Boxes size={15} className="text-white" />
                </div>
                {!collapsed && <span className="text-white font-bold text-base tracking-tight">CoreInventory</span>}
            </div>

            {/* Main Nav */}
            <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-hidden">
                {!collapsed && (
                    <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest px-3 mb-2">Operations</p>
                )}
                {navItems.map(item => <NavLink key={item.path} item={item} />)}
            </nav>

            {/* Collapse toggle */}
            <div className="px-2 pb-3 shrink-0">
                <button
                    onClick={() => setCollapsed(!collapsed)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm text-gray-500 hover:text-white hover:bg-white/8 transition-colors ${collapsed ? "justify-center" : ""}`}
                >
                    {collapsed ? <ChevronRight size={17} /> : <><ChevronLeft size={17} /><span>Collapse</span></>}
                </button>
            </div>
        </div>
    );

    return (
        <div className="flex h-screen bg-gray-50 overflow-hidden">
            {/* Desktop Sidebar */}
            <aside className={`hidden lg:flex flex-col bg-[#1a1a2e] transition-all duration-200 shrink-0 ${collapsed ? "w-[56px]" : "w-[220px]"}`}>
                <SidebarContent />
            </aside>

            {/* Mobile Sidebar */}
            {mobileOpen && (
                <div className="lg:hidden fixed inset-0 z-50 flex">
                    <div className="w-[220px] bg-[#1a1a2e] flex flex-col h-full shadow-2xl">
                        <SidebarContent />
                    </div>
                    <div className="flex-1 bg-black/50" onClick={() => setMobileOpen(false)} />
                </div>
            )}

            {/* Main */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                {/* Top Bar */}
                <header className="bg-white border-b border-gray-200 px-4 lg:px-6 h-14 flex items-center gap-4 shrink-0">
                    <button onClick={() => setMobileOpen(true)} className="lg:hidden p-1.5 rounded-md hover:bg-gray-100 text-gray-500">
                        <Menu size={18} />
                    </button>

                    {/* Breadcrumb */}
                    <div className="flex items-center gap-1.5 text-sm">
                        <span className="text-gray-400">App</span>
                        <ChevronRight size={13} className="text-gray-300" />
                        <span className="font-semibold text-gray-800">{currentPage?.label || "Dashboard"}</span>
                    </div>

                    <div className="flex-1" />

                    <div className="flex items-center gap-1">
                        {/* Alerts */}
                        <div className="relative" ref={alertRef}>
                            <button onClick={() => setShowAlerts(!showAlerts)}
                                className="relative p-2 rounded-md hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors">
                                <Bell size={17} />
                                {alerts.length > 0 && (
                                    <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-red-500 rounded-full" />
                                )}
                            </button>

                            {showAlerts && (
                                <div className="absolute right-0 top-full mt-1 w-80 bg-white rounded-xl shadow-xl border border-gray-200 z-50 overflow-hidden">
                                    <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <TrendingDown size={14} className="text-red-500" />
                                            <span className="font-semibold text-gray-900 text-sm">Stock Alerts</span>
                                            {alerts.length > 0 && (
                                                <span className="text-xs bg-red-100 text-red-600 font-semibold px-1.5 py-0.5 rounded-full">{alerts.length}</span>
                                            )}
                                        </div>
                                        <button onClick={() => setShowAlerts(false)} className="text-gray-400 hover:text-gray-600">
                                            <X size={14} />
                                        </button>
                                    </div>
                                    <div className="max-h-64 overflow-y-auto divide-y divide-gray-50">
                                        {alerts.length === 0 ? (
                                            <p className="px-4 py-8 text-center text-gray-400 text-sm">All stock levels are healthy</p>
                                        ) : alerts.map(a => (
                                            <div key={a.product_id} className="px-4 py-3 flex items-start gap-3 hover:bg-gray-50 transition-colors">
                                                <div className={`mt-0.5 shrink-0 p-1 rounded-md ${a.alert_type === "out_of_stock" ? "bg-red-50 text-red-500" : "bg-amber-50 text-amber-500"}`}>
                                                    {a.alert_type === "out_of_stock" ? <XCircle size={13} /> : <AlertTriangle size={13} />}
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-sm font-medium text-gray-900 truncate">{a.product_name}</p>
                                                    <p className="text-xs text-gray-400">{a.sku}</p>
                                                    <p className={`text-xs font-semibold mt-0.5 ${a.alert_type === "out_of_stock" ? "text-red-600" : "text-amber-600"}`}>
                                                        {a.alert_type === "out_of_stock" ? "Out of Stock" : `Low: ${a.total_stock} / min ${a.min_stock_qty}`}
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    {alerts.length > 0 && (
                                        <div className="px-4 py-2.5 border-t border-gray-100 bg-gray-50">
                                            <button onClick={() => { navigate("/app/products"); setShowAlerts(false); }}
                                                className="text-xs text-[#714B67] font-semibold hover:underline">
                                                View all products
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* User Menu */}
                        {user && (
                            <div className="relative" ref={userMenuRef}>
                                <button
                                    onClick={() => setShowUserMenu(!showUserMenu)}
                                    className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-md hover:bg-gray-100 transition-colors"
                                >
                                    <div className="w-7 h-7 bg-[#714B67] rounded-md flex items-center justify-center text-white text-xs font-bold shrink-0">
                                        {user.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="hidden sm:block text-left">
                                        <p className="text-sm font-semibold text-gray-800 leading-none">{user.name}</p>
                                        <p className="text-xs text-gray-400 mt-0.5">{user.role === "admin" ? "Inventory Manager" : "Warehouse Staff"}</p>
                                    </div>
                                    <ChevronDown size={14} className="text-gray-400 hidden sm:block" />
                                </button>

                                {showUserMenu && (
                                    <div className="absolute right-0 top-full mt-1 w-52 bg-white rounded-xl shadow-xl border border-gray-200 z-50 overflow-hidden py-1">
                                        {/* Profile */}
                                        <Link to="/app/profile" onClick={() => setShowUserMenu(false)}
                                            className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                                            <User size={15} className="text-gray-400" />
                                            Profile
                                        </Link>

                                        {/* Admin section */}
                                        {isAdmin && (
                                            <>
                                                <div className="mx-3 my-1 border-t border-gray-100" />
                                                <p className="px-4 py-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Admin</p>
                                                {adminItems.map(item => {
                                                    const Icon = item.icon;
                                                    return (
                                                        <Link key={item.path} to={item.path} onClick={() => setShowUserMenu(false)}
                                                            className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                                                            <Icon size={15} className="text-gray-400" />
                                                            {item.label}
                                                        </Link>
                                                    );
                                                })}
                                            </>
                                        )}

                                        <div className="mx-3 my-1 border-t border-gray-100" />
                                        <button onClick={handleLogout}
                                            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors">
                                            <LogOut size={15} />
                                            Sign Out
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </header>

                {/* Page Content */}
                <main className="flex-1 overflow-y-auto bg-gray-50">
                    {children}
                </main>
            </div>
        </div>
    );
}
