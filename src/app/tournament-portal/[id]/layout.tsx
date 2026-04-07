'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Loader2, Trophy, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { getCurrentClient, createPortalClient, TournamentClient } from '@/lib/tournament-portal/auth';
import { PortalShell } from '../_components/PortalShell';
import { TournamentNav } from './_components/TournamentNav';

const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
    draft:     { label: 'مسودة',  cls: 'bg-slate-100 text-slate-600'   },
    open:      { label: 'مفتوح',  cls: 'bg-emerald-100 text-emerald-700' },
    closed:    { label: 'مغلق',   cls: 'bg-rose-100 text-rose-700'     },
    ongoing:   { label: 'جارٍ',   cls: 'bg-blue-100 text-blue-700'     },
    completed: { label: 'منتهي',  cls: 'bg-purple-100 text-purple-700' },
    cancelled: { label: 'ملغي',   cls: 'bg-orange-100 text-orange-700' },
};

export default function TournamentLayout({ children }: { children: React.ReactNode }) {
    const { id } = useParams<{ id: string }>();
    const router = useRouter();
    const [client,     setClient]     = useState<TournamentClient | null>(null);
    const [tournament, setTournament] = useState<any>(null);
    const [loading,    setLoading]    = useState(true);

    useEffect(() => {
        (async () => {
            const c = await getCurrentClient();
            if (!c) {
                router.replace('/tournament-portal/login');
                return;
            }
            setClient(c);

            const supabase = createPortalClient();
            const { data } = await supabase
                .from('tournament_new')
                .select('id, name, status, type, country, city, logo_url, start_date, end_date')
                .eq('id', id)
                .eq('client_id', c.id)
                .single();

            setTournament(data);
            setLoading(false);
        })();
    }, [id]);

    if (!client || loading) return (
        <div className="min-h-screen flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-yellow-500" />
        </div>
    );

    if (!tournament) return (
        <div className="min-h-screen flex items-center justify-center text-slate-500">
            البطولة غير موجودة أو ليس لديك صلاحية الوصول
        </div>
    );

    const statusCfg = STATUS_LABEL[tournament.status] || STATUS_LABEL.draft;

    return (
        <PortalShell client={client}>
            {/* Tournament header */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 mb-0 -mx-4 md:-mx-6 rounded-b-none border-b-0">
                <div className="flex items-center gap-2 text-xs text-slate-400 mb-3">
                    <Link href="/tournament-portal" className="hover:text-yellow-600 transition-colors">بطولاتي</Link>
                    <ChevronRight className="w-3 h-3" />
                    <span className="text-slate-700 font-medium truncate">{tournament.name}</span>
                </div>
                <div className="flex items-center gap-3">
                    {tournament.logo_url ? (
                        <img src={tournament.logo_url} alt={tournament.name} className="w-10 h-10 rounded-xl object-cover border border-slate-200" />
                    ) : (
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center flex-shrink-0">
                            <Trophy className="w-5 h-5 text-white" />
                        </div>
                    )}
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="font-black text-slate-900 text-base">{tournament.name}</h1>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${statusCfg.cls}`}>
                                {statusCfg.label}
                            </span>
                        </div>
                        <p className="text-xs text-slate-400">
                            {tournament.city || tournament.country || ''}
                            {tournament.start_date ? ` · ${new Date(tournament.start_date).toLocaleDateString('ar-EG', { month: 'short', day: 'numeric', year: 'numeric' })}` : ''}
                        </p>
                    </div>
                </div>
            </div>

            {/* Sub-navigation */}
            <div className="-mx-4 md:-mx-6">
                <TournamentNav tournamentId={id} />
            </div>

            {/* Page content */}
            <div className="pt-5">{children}</div>
        </PortalShell>
    );
}
