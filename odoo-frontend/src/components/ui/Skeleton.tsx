interface SkeletonProps {
    rows?: number;
    cols?: number;
}

export function TableSkeleton({ rows = 5, cols = 6 }: SkeletonProps) {
    return (
        <div className="overflow-x-auto">
            <table className="w-full text-sm">
                <thead>
                    <tr className="border-b border-slate-100">
                        {Array.from({ length: cols }).map((_, i) => (
                            <th key={i} className="px-4 py-3">
                                <div className="h-3 bg-slate-200 rounded animate-pulse w-20" />
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {Array.from({ length: rows }).map((_, r) => (
                        <tr key={r} className="border-b border-slate-50">
                            {Array.from({ length: cols }).map((_, c) => (
                                <td key={c} className="px-4 py-3">
                                    <div className={`h-4 bg-slate-100 rounded animate-pulse ${c === 0 ? 'w-32' : 'w-16'}`} />
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

export function KPISkeleton() {
    return (
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 animate-pulse">
            <div className="flex items-start justify-between">
                <div className="space-y-2">
                    <div className="h-3 bg-slate-200 rounded w-24" />
                    <div className="h-8 bg-slate-200 rounded w-16" />
                    <div className="h-3 bg-slate-100 rounded w-20" />
                </div>
                <div className="w-12 h-12 bg-slate-100 rounded-xl" />
            </div>
        </div>
    );
}

export function CardSkeleton() {
    return (
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 animate-pulse space-y-3">
            <div className="h-4 bg-slate-200 rounded w-1/3" />
            <div className="h-3 bg-slate-100 rounded w-full" />
            <div className="h-3 bg-slate-100 rounded w-2/3" />
        </div>
    );
}
