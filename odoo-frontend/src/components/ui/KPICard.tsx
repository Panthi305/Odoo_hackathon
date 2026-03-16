import type { ReactNode } from 'react';

interface KPICardProps {
    title: string;
    value: string | number;
    icon: ReactNode;
    color: string;
    bgColor: string;
    subtitle?: string;
    trend?: { value: number; label: string };
}

export default function KPICard({ title, value, icon, color, bgColor, subtitle, trend }: KPICardProps) {
    return (
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-sm text-slate-500 font-medium">{title}</p>
                    <p className={`text-3xl font-bold mt-1 ${color}`}>{value}</p>
                    {subtitle && <p className="text-xs text-slate-400 mt-1">{subtitle}</p>}
                </div>
                <div className={`w-12 h-12 ${bgColor} rounded-xl flex items-center justify-center ${color}`}>
                    {icon}
                </div>
            </div>
            {trend && (
                <div className="mt-3 pt-3 border-t border-slate-50">
                    <span className={`text-xs font-medium ${trend.value >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                        {trend.value >= 0 ? '↑' : '↓'} {Math.abs(trend.value)}%
                    </span>
                    <span className="text-xs text-slate-400 ml-1">{trend.label}</span>
                </div>
            )}
        </div>
    );
}
