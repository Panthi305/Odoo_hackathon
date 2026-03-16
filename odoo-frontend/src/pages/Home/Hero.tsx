import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle, Package, TrendingUp, Truck } from 'lucide-react';

const Hero = () => {
    return (
        <section className="bg-white pt-16 pb-20 border-b border-gray-100">
            <div className="max-w-7xl mx-auto px-6">
                <div className="flex flex-col lg:flex-row items-center gap-16">
                    {/* Left Content */}
                    <div className="flex-1 max-w-2xl">
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#714B67]/10 border border-[#714B67]/20 mb-8">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#714B67] animate-pulse"></span>
                            <span className="text-xs font-semibold text-[#714B67] uppercase tracking-wider">Odoo Hackathon 2026</span>
                        </div>

                        <h1 className="text-5xl md:text-6xl font-extrabold text-gray-900 leading-[1.1] tracking-tight mb-6">
                            Inventory Management
                            <span className="block text-[#714B67] mt-1">Built for Scale.</span>
                        </h1>

                        <p className="text-lg text-gray-500 leading-relaxed mb-10 max-w-xl">
                            Replace spreadsheets and manual registers with a centralized, real-time inventory system. Track every receipt, delivery, transfer, and adjustment from one place.
                        </p>

                        <div className="flex flex-wrap gap-4 mb-12">
                            <Link
                                to="/login"
                                className="inline-flex items-center gap-2 px-6 py-3 bg-[#714B67] text-white font-semibold rounded-md hover:bg-[#5d3d56] transition-colors"
                            >
                                Start for Free
                                <ArrowRight size={16} />
                            </Link>
                            <Link
                                to="/contact"
                                className="inline-flex items-center gap-2 px-6 py-3 bg-white text-gray-700 font-semibold rounded-md border border-gray-300 hover:bg-gray-50 transition-colors"
                            >
                                Talk to Us
                            </Link>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-4 text-sm text-gray-500">
                            {['No credit card required', 'Multi-warehouse support', 'Real-time stock tracking'].map(f => (
                                <span key={f} className="flex items-center gap-1.5">
                                    <CheckCircle size={14} className="text-green-500 shrink-0" />
                                    {f}
                                </span>
                            ))}
                        </div>
                    </div>

                    {/* Right — Dashboard Preview */}
                    <div className="flex-1 w-full max-w-lg">
                        <div className="bg-white rounded-xl border border-gray-200 shadow-lg overflow-hidden">
                            {/* Window chrome */}
                            <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200">
                                <div className="flex gap-1.5">
                                    <div className="w-3 h-3 rounded-full bg-red-400"></div>
                                    <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                                    <div className="w-3 h-3 rounded-full bg-green-400"></div>
                                </div>
                                <span className="text-xs font-medium text-gray-500">CoreInventory — Dashboard</span>
                                <div className="w-16"></div>
                            </div>

                            <div className="p-5">
                                {/* KPI Row */}
                                <div className="grid grid-cols-3 gap-3 mb-5">
                                    {[
                                        { label: 'Total Products', val: '248', icon: Package, color: 'text-[#714B67]', bg: 'bg-[#714B67]/8' },
                                        { label: 'Low Stock', val: '12', icon: TrendingUp, color: 'text-orange-600', bg: 'bg-orange-50' },
                                        { label: 'Deliveries', val: '8', icon: Truck, color: 'text-blue-600', bg: 'bg-blue-50' },
                                    ].map(item => (
                                        <div key={item.label} className={`${item.bg} rounded-lg p-3`}>
                                            <item.icon size={16} className={`${item.color} mb-2`} />
                                            <p className={`text-xl font-bold ${item.color}`}>{item.val}</p>
                                            <p className="text-xs text-gray-500 mt-0.5">{item.label}</p>
                                        </div>
                                    ))}
                                </div>

                                {/* Table preview */}
                                <div className="rounded-lg border border-gray-100 overflow-hidden">
                                    <div className="px-3 py-2 bg-gray-50 border-b border-gray-100">
                                        <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Recent Operations</span>
                                    </div>
                                    <div className="divide-y divide-gray-50">
                                        {[
                                            { ref: 'REC/2026/0012', type: 'Receipt', status: 'Ready', dot: 'bg-blue-500' },
                                            { ref: 'DEL/2026/0056', type: 'Delivery', status: 'Done', dot: 'bg-green-500' },
                                            { ref: 'INT/2026/0090', type: 'Transfer', status: 'Draft', dot: 'bg-gray-400' },
                                        ].map(op => (
                                            <div key={op.ref} className="flex items-center justify-between px-3 py-2.5">
                                                <div className="flex items-center gap-2">
                                                    <span className={`w-1.5 h-1.5 rounded-full ${op.dot}`}></span>
                                                    <span className="text-xs font-medium text-gray-700">{op.ref}</span>
                                                </div>
                                                <span className="text-xs text-gray-400">{op.status}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default Hero;
