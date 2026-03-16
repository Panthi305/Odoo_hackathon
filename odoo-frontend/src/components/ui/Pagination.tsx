import { ChevronLeft, ChevronRight } from 'lucide-react';

interface Props {
    page: number;
    pages: number;
    total: number;
    pageSize: number;
    onPage: (p: number) => void;
}

export default function Pagination({ page, pages, total, pageSize, onPage }: Props) {
    if (pages <= 1) return null;
    const start = (page - 1) * pageSize + 1;
    const end = Math.min(page * pageSize, total);

    return (
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <p className="text-xs text-gray-400">
                Showing {start}–{end} of {total}
            </p>
            <div className="flex items-center gap-1">
                <button onClick={() => onPage(page - 1)} disabled={page === 1}
                    className="p-1.5 rounded-md hover:bg-gray-100 text-gray-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                    <ChevronLeft size={15} />
                </button>
                {Array.from({ length: Math.min(pages, 7) }, (_, i) => {
                    const p = pages <= 7 ? i + 1 : page <= 4 ? i + 1 : page >= pages - 3 ? pages - 6 + i : page - 3 + i;
                    return (
                        <button key={p} onClick={() => onPage(p)}
                            className={`w-7 h-7 rounded-md text-xs font-medium transition-colors ${p === page ? 'bg-[#714B67] text-white' : 'hover:bg-gray-100 text-gray-600'}`}>
                            {p}
                        </button>
                    );
                })}
                <button onClick={() => onPage(page + 1)} disabled={page === pages}
                    className="p-1.5 rounded-md hover:bg-gray-100 text-gray-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                    <ChevronRight size={15} />
                </button>
            </div>
        </div>
    );
}
