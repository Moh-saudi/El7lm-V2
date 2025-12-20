'use client';

import { useTournament } from '../providers';
import { OverviewManager } from '../manage/components/OverviewManager';

export default function OverviewPage() {
    const { tournament } = useTournament();

    if (!tournament) return null;

    return (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 min-h-[600px]">
            <OverviewManager tournament={tournament} />
        </div>
    );
}
