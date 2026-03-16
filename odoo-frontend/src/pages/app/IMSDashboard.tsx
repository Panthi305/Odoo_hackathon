import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Package, ArrowDownToLine, ArrowUpFromLine, ArrowLeftRight,
    AlertTriangle, DollarSign, XCircle, FileText, Filter,
    TrendingUp, ChevronRight
} from 'lucide-react';
import { getDashboard } from '../../api/inventory';
import Badge from '../../components/ui/Badge';
import { KPISkeleton } from '../../components/ui/Skeleton';
import type { DashboardKPIs, Operation, OperationStatus, OperationType, ChartDataPoint } from '../../api/inventory';

const statusLabel: Record<OperationStatus, string> = {
    draft: 'Draft', waiting: 'Waiting', ready: 'Ready', done: 'Done', cancelled: 'Cancelled'
};
const typeLabel: Record<OperationType, string> = {
    receipt: 'Receipt', delivery: 'Delivery', internal: 'Transfer', adjustment: 'Adjustment'
};
const typeRoute: Record<OperationType, string> = {
    receipt: '/app/receipts', delivery: '/app/deliveries', internal: '/app/transfers', adjustment: '/app/adjustments'
};
const ALL_TYPES: OperationType[] = ['receipt', 'delivery', 'internal', 'adjustment'];
const ALL_STATUSES: OperationStatus[] = ['draft', 'waiting', 'ready', 'done', 'cancelled'];

function MiniBarChart({ data, color = '#714B67', label }: { data: ChartDataPoint[]; color?: string; label: string }) {
    if (!data.length) return (
        <div className="flex items-center justify-center h-20 text-gray-300 text-xs">No data yet</div>
    );
    const max = Math.max(...data.map(d => d.value), 1);
    return (
        <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">{label}</p>
            <div className="flex items-end gap-1 h-16">
                {data.map((d, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center group relative">
                        <div
                            className="w-full rounded-sm transition-all"
                            style={{ height: `${Math.max((d.value / max) * 60, 3)}px`, backgroundColor: color }}
                        />
                        <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[10px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-10">
                            {d.label}: {d.value}
                        </div>
                    </div>
                ))}
            </div>
            <div className="flex justify-between mt-1.5">
                <span className="text-[10px] text-gray-400">{data[0]?.label}</span>
                <span className="text-[10px] text-gray-400">{data[data.length - 1]?.label}</span>
            </div>
        </div>
    );
}

function DistributionChart({ data, label }: { data: ChartDataPoint[]; label: string }) {
    const total = data.reduce((s, d) => s + d.value, 0);
    const colors = ['#714B67', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
    if (!data.length || total === 0) return (
        <div className="flex items-center justify-center h-20 text-gray-300 text-xs">No data yet</div>
    );
    return (
        <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">{label}</p>
            <div className="space-y-2.5">
                {data.map((d, i) => (
                    <div key={i} className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: colors[i % colors.length] }} />
                        <div className="flex-1 min-w-0">
                            <div className="flex justify-between text-xs mb-1">
                                <span className="text-gray-600 truncate">{d.label}</span>
                                <span className="text-gray-500 font-medium ml-2">{d.value.toFixed(0)}</span>
                            </div>
                            <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
                                <div className="h-full rounded-full" style={{ width: `${(d.value / total) * 100}%`, backgroundColor: colors[i % colors.length] }} />
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

function KPICard({ title, value, icon: Icon, color, bg, subtitle, onClick }: {
    title: string; value: string | number; icon: any;
    color: string; bg: string; subtitle?: string; onClick?: () => void;
}) {
    return (
        <div
            onClick={onClick}
            className={`bg-white rounded-xl border border-gray-200 p-5 ${onClick ? 'cursor-pointer hover:border-[#714B67]/30 hover:shadow-md transition-all' : ''}`}
        >
            <div className="flex items-start justify-between mb-3">
                <div className={`w-9 h-9 ${bg} rounded-lg flex items-center justify-center`}>
                    <Icon size={18} className={color} />
                </div>
                {onClick && <ChevronRight size={14} className="text-gray-300" />}
            </div>
            <p className="text-2xl font-extrabold text-gray-900">{value}</p>
            <p className="text-sm font-medium text-gray-600 mt-0.5">{title}</p>
            {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
        </div>
    );
}

const opTypeIcon: Record<OperationType, any> = {
    receipt: ArrowDownToLine,
    delivery: ArrowUpFromLine,
    internal: ArrowLeftRight,
    adjustment: FileText,
};

export default function IMSDashboard() {
    const [kpis, setKpis] = useState<DashboardKPIs | null>(null);
    const [loading, setLoading] = useState(true);
    const [filterType, setFilterType] = useState<OperationType | ''>('');
    const [filterStatus, setFilterStatus] = useState<OperationStatus | ''>('');
    const navigate = useNavigate();

    useEffect(() => {
        getDashboard().then(setKpis).catch(console.error).finally(() => setLoading(false));
    }, []);

    const filteredOps = useMemo(() => {
        if (!kpis) return [];
        return kpis.recent_operations.filter(op => {
            if (filterType && op.operation_type !== filterType) return false;
            if (filterStatus && op.status !== filterStatus) return false;
            return true;
        });
    }, [kpis, filterType, filterStatus]);

    if (loading) {
        return (
            <div className="p-6 space-y-6">
                <div className="h-6 bg-gray-200 rounded w-44 animate-pulse mb-1" />
                <div className="h-4 bg-gray-100 rounded w-60 animate-pulse" />
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {[...Array(4)].map((_, i) => <KPISkeleton key={i} />)}
                </div>
            </div>
        );
    }

    if (!kpis) return null;

    return (
        <div className="p-6 space-y-6 max-w-screen-xl mx-auto">
            {/* Page Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-bold text-gray-900">Inventory Dashboard</h1>
                    <p className="text-sm text-gray-500 mt-0.5">Real-time overview of your stock operations</p>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-400">
                    <TrendingUp size={13} />
                    <span>Live data</span>
                </div>
            </div>

            {/* KPI Row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <KPICard title="Total Products" value={kpis.total_products}
                    icon={Package} color="text-[#714B67]" bg="bg-[#714B67]/8"
                    subtitle="Active SKUs" onClick={() => navigate('/app/products')} />
                <KPICard title="Low Stock" value={kpis.low_stock_items}
                    icon={AlertTriangle} color="text-amber-600" bg="bg-amber-50"
                    subtitle="Need reorder" onClick={() => navigate('/app/products')} />
                <KPICard title="Out of Stock" value={kpis.out_of_stock_items}
                    icon={XCircle} color="text-red-600" bg="bg-red-50"
                    subtitle="Zero quantity" onClick={() => navigate('/app/products')} />
                <KPICard title="Stock Value" value={`₹${kpis.total_stock_value.toLocaleString()}`}
                    icon={DollarSign} color="text-green-600" bg="bg-green-50"
                    subtitle="Total inventory value" />
            </div>

            {/* Operations Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                    { count: kpis.pending_receipts, label: 'Pending Receipts', icon: ArrowDownToLine, color: 'text-blue-600', bg: 'bg-blue-50', route: '/app/receipts' },
                    { count: kpis.pending_deliveries, label: 'Pending Deliveries', icon: ArrowUpFromLine, color: 'text-[#714B67]', bg: 'bg-[#714B67]/8', route: '/app/deliveries' },
                    { count: kpis.scheduled_transfers, label: 'Scheduled Transfers', icon: ArrowLeftRight, color: 'text-cyan-600', bg: 'bg-cyan-50', route: '/app/transfers' },
                ].map(item => (
                    <button key={item.label} onClick={() => navigate(item.route)}
                        className="bg-white rounded-xl border border-gray-200 p-5 hover:border-[#714B67]/30 hover:shadow-md transition-all text-left flex items-center gap-4">
                        <div className={`w-10 h-10 ${item.bg} rounded-lg flex items-center justify-center shrink-0`}>
                            <item.icon size={18} className={item.color} />
                        </div>
                        <div>
                            <p className="text-2xl font-extrabold text-gray-900">{item.count}</p>
                            <p className="text-sm text-gray-500">{item.label}</p>
                        </div>
                        <ChevronRight size={14} className="text-gray-300 ml-auto" />
                    </button>
                ))}
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                    <MiniBarChart data={kpis.stock_movement_trend} color="#714B67" label="Stock Movement (7 days)" />
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                    <MiniBarChart data={kpis.operations_per_day} color="#3b82f6" label="Operations per Day (7 days)" />
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                    <DistributionChart data={kpis.stock_by_warehouse} label="Stock by Warehouse" />
                </div>
            </div>

            {/* Recent Operations */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="flex items-center gap-2 flex-1">
                        <Filter size={14} className="text-gray-400" />
                        <h2 className="font-semibold text-gray-900 text-sm">Recent Operations</h2>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                        <select value={filterType} onChange={e => setFilterType(e.target.value as OperationType | '')}
                            className="px-3 py-1.5 border border-gray-200 rounded-md text-xs text-gray-600 outline-none focus:border-[#714B67] bg-white">
                            <option value="">All Types</option>
                            {ALL_TYPES.map(t => <option key={t} value={t}>{typeLabel[t]}</option>)}
                        </select>
                        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value as OperationStatus | '')}
                            className="px-3 py-1.5 border border-gray-200 rounded-md text-xs text-gray-600 outline-none focus:border-[#714B67] bg-white">
                            <option value="">All Statuses</option>
                            {ALL_STATUSES.map(s => <option key={s} value={s}>{statusLabel[s]}</option>)}
                        </select>
                        {(filterType || filterStatus) && (
                            <button onClick={() => { setFilterType(''); setFilterStatus(''); }}
                                className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1.5 rounded-md hover:bg-gray-100 transition-colors">
                                Clear
                            </button>
                        )}
                        <button onClick={() => navigate('/app/history')}
                            className="text-xs text-[#714B67] font-semibold hover:underline ml-1">
                            View all
                        </button>
                    </div>
                </div>

                <div className="divide-y divide-gray-50">
                    {filteredOps.length === 0 ? (
                        <div className="py-14 text-center text-gray-400">
                            <FileText size={28} className="mx-auto mb-2 opacity-30" />
                            <p className="text-sm">{kpis.recent_operations.length === 0 ? 'No operations yet' : 'No operations match the filters'}</p>
                        </div>
                    ) : filteredOps.map((op: Operation) => {
                        const Icon = opTypeIcon[op.operation_type];
                        return (
                            <div key={op.id} onClick={() => navigate(typeRoute[op.operation_type])}
                                className="px-5 py-3.5 flex items-center justify-between hover:bg-gray-50 cursor-pointer transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center text-gray-500 shrink-0">
                                        <Icon size={15} />
                                    </div>
                                    <div>
                                        <p className="font-medium text-gray-900 text-sm">{op.reference}</p>
                                        <p className="text-xs text-gray-400">
                                            {op.partner_name || `${op.source_location_name || '—'} → ${op.dest_location_name || '—'}`}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Badge variant={op.operation_type as any}>{typeLabel[op.operation_type]}</Badge>
                                    <Badge variant={op.status as any}>{statusLabel[op.status]}</Badge>
                                    <span className="text-xs text-gray-400 hidden sm:block ml-1">
                                        {new Date(op.created_at).toLocaleDateString()}
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
