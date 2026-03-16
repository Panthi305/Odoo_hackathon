import type { ReactNode } from 'react';
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import { TableSkeleton } from './Skeleton';

export interface Column<T> {
    key: string;
    header: string;
    render?: (row: T) => ReactNode;
    className?: string;
    sortable?: boolean;
}

interface TableProps<T> {
    columns: Column<T>[];
    data: T[];
    loading?: boolean;
    emptyMessage?: string;
    emptyIcon?: ReactNode;
    onRowClick?: (row: T) => void;
    sortBy?: string;
    sortDir?: 'asc' | 'desc';
    onSort?: (key: string) => void;
}

export default function Table<T extends { id: number }>({
    columns, data, loading, emptyMessage = 'No records found', emptyIcon,
    onRowClick, sortBy, sortDir, onSort
}: TableProps<T>) {
    if (loading) return <TableSkeleton rows={5} cols={columns.length} />;

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-sm">
                <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/60">
                        {columns.map(col => (
                            <th
                                key={col.key}
                                className={`text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider ${col.className || ''} ${col.sortable ? 'cursor-pointer select-none hover:text-gray-700' : ''}`}
                                onClick={() => col.sortable && onSort?.(col.key)}
                            >
                                <div className="flex items-center gap-1">
                                    {col.header}
                                    {col.sortable && (
                                        <span className="text-gray-300">
                                            {sortBy === col.key
                                                ? sortDir === 'asc'
                                                    ? <ChevronUp size={12} className="text-[#714B67]" />
                                                    : <ChevronDown size={12} className="text-[#714B67]" />
                                                : <ChevronsUpDown size={12} />}
                                        </span>
                                    )}
                                </div>
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {data.length === 0 ? (
                        <tr>
                            <td colSpan={columns.length} className="text-center py-16 text-gray-400">
                                {emptyIcon && <div className="flex justify-center mb-3 opacity-20">{emptyIcon}</div>}
                                <p className="text-sm">{emptyMessage}</p>
                            </td>
                        </tr>
                    ) : (
                        data.map(row => (
                            <tr
                                key={row.id}
                                onClick={() => onRowClick?.(row)}
                                className={`border-b border-gray-50 hover:bg-gray-50 transition-colors ${onRowClick ? 'cursor-pointer' : ''}`}
                            >
                                {columns.map(col => (
                                    <td key={col.key} className={`px-4 py-3 text-gray-700 ${col.className || ''}`}>
                                        {col.render ? col.render(row) : (row as any)[col.key]}
                                    </td>
                                ))}
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
    );
}
