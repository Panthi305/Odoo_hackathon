import { useEffect, useState, useCallback } from 'react';
import { ShieldCheck } from 'lucide-react';
import { getAuditLogs } from '../../api/inventory';
import type { AuditLog } from '../../api/inventory';
import PageHeader from '../../components/ui/PageHeader';
import Table from '../../components/ui/Table';
import Pagination from '../../components/ui/Pagination';
import Badge from '../../components/ui/Badge';

const actionColor: Record<string, string> = {
    create: 'ok', update: 'waiting', delete: 'cancelled', validate: 'done', cancel: 'cancelled'
};

export default function AuditLogs() {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterEntity, setFilterEntity] = useState('');
    const [page, setPage] = useState(1);
    const [pages, setPages] = useState(1);
    const [total, setTotal] = useState(0);
    const PAGE_SIZE = 30;

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res = await getAuditLogs({ entity_type: filterEntity || undefined, page, page_size: PAGE_SIZE });
            setLogs(res.items); setTotal(res.total); setPages(res.pages);
        } finally { setLoading(false); }
    }, [filterEntity, page]);

    useEffect(() => { load(); }, [load]);
    useEffect(() => { setPage(1); }, [filterEntity]);

    const columns = [
        { key: 'created_at', header: 'Time', render: (l: AuditLog) => <span className="text-xs text-gray-500">{new Date(l.created_at).toLocaleString()}</span> },
        { key: 'user_name', header: 'User', render: (l: AuditLog) => <span className="font-medium text-gray-800">{l.user_name || '—'}</span> },
        { key: 'entity_type', header: 'Entity', render: (l: AuditLog) => <span className="capitalize text-gray-600">{l.entity_type}</span> },
        { key: 'entity_id', header: 'ID', render: (l: AuditLog) => <span className="text-gray-400 text-xs font-mono">#{l.entity_id}</span> },
        { key: 'action', header: 'Action', render: (l: AuditLog) => <Badge variant={(actionColor[l.action] || 'draft') as any}>{l.action}</Badge> },
        {
            key: 'changes', header: 'Changed Fields', render: (l: AuditLog) => (
                l.changes && Object.keys(l.changes).length > 0
                    ? <span className="text-xs text-gray-500 font-mono">{Object.keys(l.changes).join(', ')}</span>
                    : <span className="text-gray-300 text-xs">—</span>
            )
        },
    ];

    return (
        <div className="p-6">
            <PageHeader title="Audit Logs" subtitle="Track all changes to inventory entities" icon={<ShieldCheck size={18} />} />
            <div className="flex gap-3 mb-5">
                <select value={filterEntity} onChange={e => setFilterEntity(e.target.value)}
                    className="px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:border-[#714B67] bg-white text-gray-600">
                    <option value="">All Entities</option>
                    <option value="product">Product</option>
                    <option value="category">Category</option>
                    <option value="warehouse">Warehouse</option>
                    <option value="operation">Operation</option>
                    <option value="location">Location</option>
                </select>
            </div>
            <div className="bg-white rounded-xl border border-gray-200">
                <Table columns={columns} data={logs} loading={loading} emptyMessage="No audit logs found." emptyIcon={<ShieldCheck size={36} />} />
                <Pagination page={page} pages={pages} total={total} pageSize={PAGE_SIZE} onPage={setPage} />
            </div>
        </div>
    );
}
