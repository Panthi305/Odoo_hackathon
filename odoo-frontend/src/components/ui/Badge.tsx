import type { ReactNode } from 'react';

type Variant = 'draft' | 'waiting' | 'ready' | 'done' | 'cancelled' | 'low' | 'out' | 'ok' | 'receipt' | 'delivery' | 'internal' | 'adjustment';

const styles: Record<Variant, string> = {
    draft: 'bg-gray-100 text-gray-600',
    waiting: 'bg-amber-100 text-amber-700',
    ready: 'bg-blue-100 text-blue-700',
    done: 'bg-green-100 text-green-700',
    cancelled: 'bg-red-100 text-red-600',
    low: 'bg-orange-100 text-orange-700',
    out: 'bg-red-100 text-red-700',
    ok: 'bg-green-100 text-green-700',
    receipt: 'bg-[#714B67]/10 text-[#714B67]',
    delivery: 'bg-blue-100 text-blue-700',
    internal: 'bg-cyan-100 text-cyan-700',
    adjustment: 'bg-amber-100 text-amber-700',
};

export default function Badge({ variant, children }: { variant: Variant; children: ReactNode }) {
    return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold ${styles[variant]}`}>
            {children}
        </span>
    );
}
