import { ClipboardList } from 'lucide-react';
import OperationsPage from './OperationsPage';

export default function Adjustments() {
    return (
        <OperationsPage
            opType="adjustment"
            title="Adjustments"
            subtitle="Correct stock discrepancies with physical counts"
            icon={<ClipboardList size={20} />}
            partnerLabel="Reference"
        />
    );
}
