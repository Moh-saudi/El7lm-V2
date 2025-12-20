'use client';

import { useTournament } from '../providers';
import { TeamsManager } from '../manage/components/TeamsManager';

export default function TeamsPage() {
    const { tournament } = useTournament();

    if (!tournament) return null;

    return (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 min-h-[600px]">
            <TeamsManager tournament={tournament} />
        </div>
    );
}
