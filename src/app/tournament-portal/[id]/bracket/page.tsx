'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Loader2, Trophy, ChevronRight } from 'lucide-react';
import { createPortalClient } from '@/lib/tournament-portal/auth';

type Category = { id: string; name: string; type: string };
type Team = { id: string; name: string; logo_url: string | null };
type BracketMatch = {
    id: string;
    round: string;
    match_number: number | null;
    home_team_id: string | null;
    away_team_id: string | null;
    home_score: number | null;
    away_score: number | null;
    status: string;
    match_date: string | null;
    home_team?: Team | null;
    away_team?: Team | null;
};

// Round display order and labels
const ROUND_ORDER = ['R128', 'R64', 'R32', 'R16', 'QF', 'SF', 'F', '3rd'];
const ROUND_LABELS: Record<string, string> = {
    R128: 'دور الـ128',
    R64:  'دور الـ64',
    R32:  'دور الـ32',
    R16:  'دور الـ16',
    QF:   'ربع النهائي',
    SF:   'نصف النهائي',
    F:    'النهائي',
    '3rd':'نهائي المركز الثالث',
};

export default function BracketPage() {
    const { id } = useParams<{ id: string }>();
    const [categories,  setCategories]  = useState<Category[]>([]);
    const [selectedCat, setSelectedCat] = useState('');
    const [matches,     setMatches]     = useState<BracketMatch[]>([]);
    const [loading,     setLoading]     = useState(true);

    const supabase = createPortalClient();

    useEffect(() => {
        (async () => {
            const { data: cats } = await supabase
                .from('tournament_categories')
                .select('id, name, type')
                .eq('tournament_id', id)
                .in('type', ['knockout', 'groups_knockout'])
                .order('sort_order');
            setCategories(cats || []);
            if (cats && cats.length > 0) setSelectedCat(cats[0].id);
            setLoading(false);
        })();
    }, [id]);

    const loadMatches = useCallback(async () => {
        if (!selectedCat) return;
        const { data } = await supabase
            .from('tournament_matches')
            .select(`
                id, round, match_number, home_team_id, away_team_id,
                home_score, away_score, status, match_date,
                home_team:tournament_teams!home_team_id(id, name, logo_url),
                away_team:tournament_teams!away_team_id(id, name, logo_url)
            `)
            .eq('tournament_id', id)
            .eq('category_id', selectedCat)
            .in('round', ROUND_ORDER)
            .order('match_number', { ascending: true });
        setMatches((data as any) || []);
    }, [selectedCat, id]);

    useEffect(() => { loadMatches(); }, [loadMatches]);

    if (loading) return (
        <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-yellow-500" />
        </div>
    );

    // Group matches by round
    const byRound: Record<string, BracketMatch[]> = {};
    for (const m of matches) {
        const r = m.round || 'other';
        if (!byRound[r]) byRound[r] = [];
        byRound[r].push(m);
    }

    const rounds = ROUND_ORDER.filter(r => byRound[r] && byRound[r].length > 0);
    // Separate 3rd place
    const thirdPlace = byRound['3rd'] || [];
    const mainRounds = rounds.filter(r => r !== '3rd');

    const currentCat = categories.find(c => c.id === selectedCat);

    if (categories.length === 0) return (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 text-center" dir="rtl">
            <Trophy className="w-8 h-8 text-amber-400 mx-auto mb-2" />
            <p className="font-bold text-amber-800 text-sm">لا توجد فئات إقصائية</p>
            <p className="text-xs text-amber-600 mt-1">أضف فئة من نوع «إقصائي» أو «مجموعات + إقصاء» في الإعدادات</p>
        </div>
    );

    return (
        <div className="space-y-5" dir="rtl">

            {/* Category tabs */}
            {categories.length > 1 && (
                <div className="flex gap-2 flex-wrap">
                    {categories.map(c => (
                        <button key={c.id} onClick={() => setSelectedCat(c.id)}
                            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all
                                ${selectedCat === c.id ? 'bg-yellow-500 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:border-yellow-300'}`}>
                            {c.name}
                        </button>
                    ))}
                </div>
            )}

            {/* Header */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center gap-3">
                <Trophy className="w-5 h-5 text-yellow-500" />
                <div>
                    <p className="font-bold text-slate-800 text-sm">{currentCat?.name}</p>
                    <p className="text-xs text-slate-400">شجرة الإقصاء — {matches.length} مباراة</p>
                </div>
            </div>

            {matches.length === 0 ? (
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-8 text-center text-slate-500 text-sm">
                    لا توجد مباريات إقصائية بعد — أضف مباريات من صفحة «المباريات» واختر جولة إقصائية (QF, SF, F…)
                </div>
            ) : (
                <>
                    {/* Bracket: horizontal scroll */}
                    <div className="overflow-x-auto pb-4">
                        <div className="flex gap-4 min-w-max" style={{ direction: 'ltr' }}>
                            {mainRounds.map((round, ri) => (
                                <div key={round} className="flex flex-col gap-3" style={{ width: 220 }}>
                                    {/* Round header */}
                                    <div className="bg-slate-800 text-white text-center rounded-xl py-2 px-3">
                                        <p className="font-black text-xs">{ROUND_LABELS[round] || round}</p>
                                        <p className="text-[10px] text-slate-400">{byRound[round].length} مباراة</p>
                                    </div>

                                    {/* Matches in this round */}
                                    <div className="flex flex-col gap-3">
                                        {byRound[round].map(m => (
                                            <BracketCard key={m.id} match={m} isFinal={round === 'F'} />
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* 3rd place separately */}
                    {thirdPlace.length > 0 && (
                        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                            <div className="bg-gradient-to-r from-amber-700 to-amber-600 px-4 py-2.5">
                                <p className="text-white font-black text-sm">نهائي المركز الثالث</p>
                            </div>
                            <div className="p-4 grid sm:grid-cols-2 gap-3">
                                {thirdPlace.map(m => (
                                    <BracketCard key={m.id} match={m} />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Champion banner */}
                    {byRound['F'] && byRound['F'].length > 0 && (() => {
                        const final = byRound['F'][0];
                        const hs = final.home_score ?? -1;
                        const as_ = final.away_score ?? -1;
                        const champion = final.status === 'finished'
                            ? (hs > as_ ? final.home_team : as_ > hs ? final.away_team : null)
                            : null;
                        if (!champion) return null;
                        return (
                            <div className="bg-gradient-to-r from-yellow-400 to-amber-500 rounded-2xl p-5 text-center shadow-lg">
                                <Trophy className="w-8 h-8 text-white mx-auto mb-2" />
                                <p className="text-white font-black text-lg">{champion.name}</p>
                                <p className="text-yellow-100 text-sm mt-1">بطل البطولة</p>
                            </div>
                        );
                    })()}
                </>
            )}
        </div>
    );
}

// ── Single bracket match card ─────────────────────────────────
function BracketCard({ match, isFinal = false }: { match: BracketMatch; isFinal?: boolean }) {
    const hs = match.home_score;
    const as_ = match.away_score;
    const finished = match.status === 'finished';
    const homeWon = finished && hs !== null && as_ !== null && hs > as_;
    const awayWon = finished && hs !== null && as_ !== null && as_ > hs;

    return (
        <div className={`border rounded-xl overflow-hidden text-[11px] ${isFinal ? 'border-yellow-400 shadow-yellow-100 shadow-md' : 'border-slate-200'}`}>
            {/* Home team */}
            <div className={`flex items-center gap-2 px-3 py-2 ${homeWon ? 'bg-emerald-50' : 'bg-white'} border-b border-slate-100`}>
                <TeamAvatar team={match.home_team} />
                <span className={`flex-1 font-semibold truncate ${homeWon ? 'text-emerald-700' : 'text-slate-800'}`}>
                    {match.home_team?.name || 'TBD'}
                </span>
                <span className={`font-black text-sm w-5 text-center ${homeWon ? 'text-emerald-700' : 'text-slate-600'}`}>
                    {hs ?? '—'}
                </span>
            </div>
            {/* Away team */}
            <div className={`flex items-center gap-2 px-3 py-2 ${awayWon ? 'bg-emerald-50' : 'bg-white'}`}>
                <TeamAvatar team={match.away_team} />
                <span className={`flex-1 font-semibold truncate ${awayWon ? 'text-emerald-700' : 'text-slate-800'}`}>
                    {match.away_team?.name || 'TBD'}
                </span>
                <span className={`font-black text-sm w-5 text-center ${awayWon ? 'text-emerald-700' : 'text-slate-600'}`}>
                    {as_ ?? '—'}
                </span>
            </div>
            {/* Match date */}
            {match.match_date && (
                <div className="bg-slate-50 px-3 py-1.5 text-[10px] text-slate-400 text-center border-t border-slate-100">
                    {new Date(match.match_date).toLocaleDateString('ar-SA', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </div>
            )}
        </div>
    );
}

function TeamAvatar({ team }: { team?: Team | null }) {
    if (!team) return <div className="w-5 h-5 rounded bg-slate-100" />;
    if (team.logo_url) return <img src={team.logo_url} alt={team.name} className="w-5 h-5 rounded object-cover" />;
    return (
        <div className="w-5 h-5 rounded bg-slate-200 flex items-center justify-center text-[9px] font-bold text-slate-500">
            {team.name.charAt(0)}
        </div>
    );
}
