import { Link } from 'react-router-dom';
import { ArrowRight, PackagePlus, ArrowLeftRight, PackageCheck } from 'lucide-react';

const steps = [
    {
        number: '01',
        icon: PackagePlus,
        title: 'Receive Goods',
        desc: 'Create a receipt, add supplier and products, then validate to update stock levels instantly across all locations.',
    },
    {
        number: '02',
        icon: ArrowLeftRight,
        title: 'Move & Transfer',
        desc: 'Transfer stock between internal locations — from Main Warehouse to Production Floor or Rack A to Rack B. Every move is logged.',
    },
    {
        number: '03',
        icon: PackageCheck,
        title: 'Deliver & Adjust',
        desc: 'Ship orders, reduce stock automatically, and reconcile discrepancies with quick cycle counts and adjustments.',
    },
];

const Workflow = () => {
    return (
        <section className="py-24 bg-gray-50 border-b border-gray-100">
            <div className="max-w-7xl mx-auto px-6">
                <div className="flex flex-col lg:flex-row gap-16 items-start">
                    {/* Left */}
                    <div className="lg:w-1/3">
                        <p className="text-sm font-semibold text-[#714B67] uppercase tracking-wider mb-3">How it works</p>
                        <h2 className="text-4xl font-extrabold text-gray-900 leading-tight mb-5">
                            Simple workflow.<br />Total control.
                        </h2>
                        <p className="text-gray-500 leading-relaxed mb-8">
                            Every stock movement is tracked end-to-end, so your team stays fast, accurate, and audit-ready at all times.
                        </p>
                        <Link
                            to="/login"
                            className="inline-flex items-center gap-2 text-sm font-semibold text-[#714B67] hover:gap-3 transition-all"
                        >
                            Start managing inventory
                            <ArrowRight size={16} />
                        </Link>
                    </div>

                    {/* Steps */}
                    <div className="lg:w-2/3 grid md:grid-cols-3 gap-6">
                        {steps.map((s, i) => (
                            <div key={i} className="bg-white rounded-xl border border-gray-200 p-6">
                                <div className="flex items-center justify-between mb-5">
                                    <div className="w-10 h-10 bg-[#714B67]/8 rounded-lg flex items-center justify-center">
                                        <s.icon size={20} className="text-[#714B67]" />
                                    </div>
                                    <span className="text-3xl font-black text-gray-100">{s.number}</span>
                                </div>
                                <h4 className="text-base font-semibold text-gray-900 mb-2">{s.title}</h4>
                                <p className="text-sm text-gray-500 leading-relaxed">{s.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
};

export default Workflow;
