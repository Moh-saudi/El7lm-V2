'use client';

import { useTournament } from '../providers';
import { BracketManager } from '../manage/components/BracketManager';

export default function BracketPage() {
    const { tournament } = useTournament();

    if (!tournament) return null;

    return (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 min-h-[600px] overflow-hidden">
            <BracketManager tournament={tournament} />
        </div>
    );
}
