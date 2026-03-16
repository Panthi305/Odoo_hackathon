import { ArrowDownToLine } from 'lucide-react';
import OperationsPage from './OperationsPage';

export default function Receipts() {
    return (
        <OperationsPage
            opType="receipt"
            title="Receipts"
            subtitle="Manage incoming stock from vendors"
            icon={<ArrowDownToLine size={20} />}
            partnerLabel="Supplier"
        />
    );
}
