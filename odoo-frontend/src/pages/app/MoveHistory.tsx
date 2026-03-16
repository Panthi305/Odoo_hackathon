import { useEffect, useState, useCallback } from 'react';
import { History, Download } from 'lucide-react';
import { getMoveHistory, getProducts, exportStockLedgerCSV } from '../../api/inventory';
import type { StockMove, Product, OperationType } from '../../api/inventory';
import PageHeader from '../../components/ui/PageHeader';
import Badge from '../../components/ui/Badge';
import Table from '../../components/ui/Table';
import Pagination from '../../components/ui/Pagination';

const typeLabel: Record<OperationType, string> = {
    receipt: 'Receipt', delivery: 'Delivery', internal: 'Transfer', adjustment: 'Adjustment'
};

const selectClass = "px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:border-[#714B67] bg-white text-gray-600";

export default function MoveHistory() {
    const [moves, setMoves] = useState<StockMove[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterProduct, setFilterProduct] = useState('');
    const [filterType, setFilterType] = useState('');
    const [page, setPage] = useState(1);
    const [pages, setPages] = useState(1);
    const [total, setTotal] = useState(0);
    const PAGE_SIZE = 30;

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const [res, prodsData] = await Promise.all([
                getMoveHistory({ product_id: filterProduct ? Number(filterProduct) : undefined, op_type: filterType as OperationType || undefined, page, page_size: PAGE_SIZE }),
                getProducts({ page_size: 200 })
            ]);
            setMoves(res.items); setTotal(res.total); setPages(res.pages);
            setProducts(prodsData.items);
        } finally { setLoading(false); }
    }, [filterProduct, filterType, page]);

    useEffect(() => { load(); }, [load]);
    useEffect(() => { setPage(1); }, [filterProduct, filterType]);

    const columns = [
        { key: 'created_at', header: 'Date', render: (m: StockMove) => <span className="text-gray-500 text-xs">{new Date(m.created_at).toLocaleString()}</span> },
        { key: 'operation_ref', header: 'Reference', render: (m: StockMove) => <span className="font-semibold text-[#714B67] text-sm">{m.operation_ref || '—'}</span> },
        { key: 'operation_type', header: 'Type', render: (m: StockMove) => m.operation_type ? <Badge variant={m.operation_type as any}>{typeLabel[m.operation_type]}</Badge> : <span>—</span> },
        {
            key: 'product_name', header: 'Product', render: (m: StockMove) => (
                <div>
                    <p className="font-medium text-gray-900">{m.product_name}</p>
                    <p className="text-xs text-gray-400">{m.product_sku}</p>
                </div>
            )
        },
        { key: 'route', header: 'Route', render: (m: StockMove) => <span className="text-xs text-gray-500">{m.source_location || '—'} → {m.dest_location || '—'}</span> },
        { key: 'demand_qty', header: 'Demand', render: (m: StockMove) => <span className="font-medium text-gray-700">{m.demand_qty}</span> },
        { key: 'done_qty', header: 'Done', render: (m: StockMove) => <span className={`font-semibold ${m.done_qty > 0 ? 'text-green-600' : 'text-gray-400'}`}>{m.done_qty}</span> },
        { key: 'operation_status', header: 'Status', render: (m: StockMove) => m.operation_status ? <Badge variant={m.operation_status as any}>{m.operation_status}</Badge> : <span>—</span> },
    ];

    return (
        <div className="p-6">
            <PageHeader
                title="Move History"
                subtitle="Complete stock movement ledger"
                icon={<History size={18} />}
                actions={
                    <button onClick={() => exportStockLedgerCSV()}
                        className="flex items-center gap-2 px-3 py-2 border border-gray-200 text-gray-600 rounded-md hover:bg-gray-50 transition-colors text-sm font-medium">
                        <Download size={14} /> Export CSV
                    </button>
                }
            />
            <div className="flex flex-col sm:flex-row gap-3 mb-5">
                <select value={filterProduct} onChange={e => setFilterProduct(e.target.value)} className={`${selectClass} flex-1`}>
                    <option value="">All Products</option>
                    {products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
                </select>
                <select value={filterType} onChange={e => setFilterType(e.target.value)} className={selectClass}>
                    <option value="">All Types</option>
                    <option value="receipt">Receipt</option>
                    <option value="delivery">Delivery</option>
                    <option value="internal">Transfer</option>
                    <option value="adjustment">Adjustment</option>
                </select>
            </div>
            <div className="bg-white rounded-xl border border-gray-200">
                <Table columns={columns} data={moves} loading={loading} emptyMessage="No stock movements found." />
                <Pagination page={page} pages={pages} total={total} pageSize={PAGE_SIZE} onPage={setPage} />
            </div>
        </div>
    );
}
