import { ArrowUpFromLine } from 'lucide-react';
import OperationsPage from './OperationsPage';

export default function Deliveries() {
    return (
        <OperationsPage
            opType="delivery"
            title="Deliveries"
            subtitle="Manage outgoing stock to customers"
            icon={<ArrowUpFromLine size={20} />}
            partnerLabel="Customer"
        />
    );
}
