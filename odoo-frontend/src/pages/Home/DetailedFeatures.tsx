import { Package, ArrowLeftRight, ClipboardList, Warehouse, BarChart3, ShieldCheck, RefreshCw, Bell } from 'lucide-react';

const features = [
    {
        icon: Package,
        title: 'Product Management',
        desc: 'Create and manage products with SKU, categories, units of measure, and multi-location stock levels.',
        color: 'text-[#714B67]',
        bg: 'bg-[#714B67]/8',
    },
    {
        icon: ArrowLeftRight,
        title: 'Receipts & Deliveries',
        desc: 'Process incoming goods from vendors and outgoing shipments with automatic stock updates on validation.',
        color: 'text-blue-600',
        bg: 'bg-blue-50',
    },
    {
        icon: ClipboardList,
        title: 'Stock Adjustments',
        desc: 'Fix discrepancies between recorded and physical stock counts. Every adjustment is logged in the ledger.',
        color: 'text-amber-600',
        bg: 'bg-amber-50',
    },
    {
        icon: Warehouse,
        title: 'Multi-Warehouse',
        desc: 'Manage multiple warehouses and locations. Move stock between racks, floors, and warehouses seamlessly.',
        color: 'text-green-600',
        bg: 'bg-green-50',
    },
    {
        icon: BarChart3,
        title: 'Analytics & Reports',
        desc: 'Get real-time insights into stock levels, movement history, and inventory valuation at a glance.',
        color: 'text-indigo-600',
        bg: 'bg-indigo-50',
    },
    {
        icon: RefreshCw,
        title: 'Internal Transfers',
        desc: 'Move stock between internal locations with full traceability and automatic ledger entries.',
        color: 'text-cyan-600',
        bg: 'bg-cyan-50',
    },
    {
        icon: Bell,
        title: 'Reorder Rules',
        desc: 'Set minimum stock thresholds and get alerts when inventory drops below critical levels.',
        color: 'text-orange-600',
        bg: 'bg-orange-50',
    },
    {
        icon: ShieldCheck,
        title: 'Audit Logs',
        desc: 'Full audit trail of every action taken in the system — who did what and when, always traceable.',
        color: 'text-rose-600',
        bg: 'bg-rose-50',
    },
];

const DetailedCoreFeatures = () => {
    return (
        <section className="py-24 bg-white border-b border-gray-100">
            <div className="max-w-7xl mx-auto px-6">
                <div className="max-w-2xl mb-16">
                    <p className="text-sm font-semibold text-[#714B67] uppercase tracking-wider mb-3">Features</p>
                    <h2 className="text-4xl font-extrabold text-gray-900 mb-4 leading-tight">
                        Everything you need to manage stock
                    </h2>
                    <p className="text-gray-500 text-lg leading-relaxed">
                        A complete inventory management system that replaces manual registers, spreadsheets, and scattered tracking methods.
                    </p>
                </div>

                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {features.map((f, i) => (
                        <div
                            key={i}
                            className="group p-6 rounded-xl border border-gray-200 hover:border-[#714B67]/30 hover:shadow-md transition-all duration-200 bg-white"
                        >
                            <div className={`w-10 h-10 ${f.bg} rounded-lg flex items-center justify-center mb-5`}>
                                <f.icon size={20} className={f.color} />
                            </div>
                            <h3 className="text-base font-semibold text-gray-900 mb-2">{f.title}</h3>
                            <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default DetailedCoreFeatures;
