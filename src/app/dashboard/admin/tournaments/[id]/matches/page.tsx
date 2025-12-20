'use client';

import { useTournament } from '../providers';
import { MatchesManager } from '../manage/components/MatchesManager';

export default function MatchesPage() {
    const { tournament } = useTournament();

    if (!tournament) return null;

    return (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 min-h-[600px]">
            <MatchesManager tournament={tournament} />
        </div>
    );
}
