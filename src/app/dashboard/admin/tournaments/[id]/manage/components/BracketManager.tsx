import React, { useEffect, useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy } from 'lucide-react';
import { supabase } from '@/lib/supabase/config';
import { Tournament } from '@/app/dashboard/admin/tournaments/utils';

interface Match {
    id: string;
    homeTeamName: string;
    homeTeamLogo?: string;
    awayTeamName: string;
    awayTeamLogo?: string;
    homeScore?: number;
    awayScore?: number;
    date: any;
    round: string;
    status: 'scheduled' | 'live' | 'finished';
}

interface BracketManagerProps {
    tournament: Tournament;
}

export const BracketManager: React.FC<BracketManagerProps> = ({ tournament }) => {
    const [matches, setMatches] = useState<Match[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchMatches = async () => {
            if (!tournament.id) return;
            try {
                const { data } = await supabase
                    .from('tournament_matches')
                    .select('*')
                    .eq('tournamentId', tournament.id)
                    .order('date', { ascending: true });
                setMatches((data || []) as Match[]);
            } catch (error) {
                console.error('Error fetching matches for bracket:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchMatches();
    }, [tournament.id]);

    // Filter matches by round
    const finalMatch = matches.find(m => m.round === 'Final');
    const semiFinals = matches.filter(m => m.round === 'Semi Final');
    const quarterFinals = matches.filter(m => m.round === 'Quarter Final');

    const BracketMatchCard = ({ match }: { match?: Match }) => {
        if (!match) return (
            <div className="w-64 h-24 border-2 border-dashed border-gray-200 rounded-lg flex items-center justify-center bg-gray-50/50">
                <span className="text-gray-400 text-sm">مباراة لم تحدد</span>
            </div>
        );

        return (
            <div className="w-64 bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden relative">
                {match.status === 'live' && <div className="absolute top-0 right-0 w-1 h-full bg-green-500 animate-pulse" />}
                <div className="flex flex-col">
                    {/* Home Team */}
                    <div className={`flex items-center justify-between p-2 border-b ${match.homeScore! > match.awayScore! ? 'bg-yellow-50' : ''}`}>
                        <div className="flex items-center gap-2 overflow-hidden">
                            {match.homeTeamLogo ? (
                                <img src={match.homeTeamLogo} alt="" className="w-6 h-6 rounded-full object-cover" />
                            ) : (
                                <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-[10px]">?</div>
                            )}
                            <span className={`text-sm truncate ${match.homeScore! > match.awayScore! ? 'font-bold text-gray-900' : 'text-gray-600'}`}>
                                {match.homeTeamName}
                            </span>
                        </div>
                        <span className="font-mono font-bold bg-gray-100 px-2 py-0.5 rounded text-sm">
                            {match.status === 'scheduled' ? '-' : match.homeScore}
                        </span>
                    </div>

                    {/* Away Team */}
                    <div className={`flex items-center justify-between p-2 ${match.awayScore! > match.homeScore! ? 'bg-yellow-50' : ''}`}>
                        <div className="flex items-center gap-2 overflow-hidden">
                            {match.awayTeamLogo ? (
                                <img src={match.awayTeamLogo} alt="" className="w-6 h-6 rounded-full object-cover" />
                            ) : (
                                <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-[10px]">?</div>
                            )}
                            <span className={`text-sm truncate ${match.awayScore! > match.homeScore! ? 'font-bold text-gray-900' : 'text-gray-600'}`}>
                                {match.awayTeamName}
                            </span>
                        </div>
                        <span className="font-mono font-bold bg-gray-100 px-2 py-0.5 rounded text-sm">
                            {match.status === 'scheduled' ? '-' : match.awayScore}
                        </span>
                    </div>
                </div>
            </div>
        );
    };

    const Connector = ({ type }: { type: 'horizontal' | 'vertical-right' | 'vertical-left' | 't-shape' }) => {
        // This is a simplified connector logic for visual structure
        return <div className="hidden md:block w-8 border-t-2 border-gray-300"></div>;
    };

    if (matches.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-center text-gray-500">
                <Trophy className="h-12 w-12 mb-4 text-gray-300" />
                <p>لا توجد مباريات كافية لعرض المخطط.</p>
                <p className="text-sm">قم بإنشاء مباريات للأدوار النهائية (ربع النهائي، نصف النهائي، النهائي) لتظر هنا.</p>
            </div>
        );
    }

    return (
        <div className="overflow-x-auto py-8 px-4" dir="ltr"> {/* LTR is easier for standard brackets */}
            <div className="flex gap-16 justify-center min-w-[max-content]">

                {/* Quarter Finals Column */}
                {quarterFinals.length > 0 && (
                    <div className="flex flex-col justify-around gap-8">
                        <h3 className="text-center font-bold text-gray-400 mb-4 sticky top-0 bg-gray-50 uppercase tracking-wider text-xs">Quarter Finals</h3>
                        {Array.from({ length: 4 }).map((_, i) => (
                            <div key={`qf-${i}`} className="relative flex items-center">
                                <BracketMatchCard match={quarterFinals[i]} />
                                <div className="absolute -right-8 w-8 h-px bg-gray-300"></div>
                                {/* Vertical connector would go here */}
                            </div>
                        ))}
                    </div>
                )}

                {/* Semi Finals Column */}
                {(semiFinals.length > 0 || quarterFinals.length > 0) && (
                    <div className="flex flex-col justify-around gap-16 mt-8">
                        <h3 className="text-center font-bold text-gray-400 mb-4 sticky top-0 bg-gray-50 uppercase tracking-wider text-xs">Semi Finals</h3>
                        {Array.from({ length: 2 }).map((_, i) => (
                            <div key={`sf-${i}`} className="relative flex items-center">
                                <div className="absolute -left-8 w-8 h-px bg-gray-300"></div>
                                <BracketMatchCard match={semiFinals[i]} />
                                <div className="absolute -right-8 w-8 h-px bg-gray-300"></div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Final Column */}
                <div className="flex flex-col justify-center gap-8">
                    <h3 className="text-center font-black text-yellow-600 mb-8 sticky top-0 bg-gray-50 uppercase tracking-wider flex items-center justify-center gap-2">
                        <Trophy className="h-4 w-4" />
                        Final
                    </h3>
                    <div className="relative flex items-center">
                        <div className="absolute -left-8 w-8 h-px bg-gray-300"></div>
                        <div className="transform scale-110 origin-center">
                            <BracketMatchCard match={finalMatch} />
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};
