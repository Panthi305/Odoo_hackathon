import { ArrowLeftRight } from 'lucide-react';
import OperationsPage from './OperationsPage';

export default function Transfers() {
    return (
        <OperationsPage
            opType="internal"
            title="Transfers"
            subtitle="Move stock between internal locations"
            icon={<ArrowLeftRight size={20} />}
            partnerLabel="Reference"
        />
    );
}
