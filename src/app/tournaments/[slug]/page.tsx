'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';
import {
    Trophy, MapPin, Calendar, Users, Clock, ChevronLeft,
    Shield, Star, User, DollarSign, FileText, Phone,
} from 'lucide-react';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const STATUS_CFG: Record<string, { label: string; cls: string }> = {
    open:      { label: 'مفتوح للتسجيل', cls: 'bg-emerald-100 text-emerald-700' },
    ongoing:   { label: 'جارٍ',           cls: 'bg-blue-100 text-blue-700'       },
    closed:    { label: 'مغلق',           cls: 'bg-slate-100 text-slate-600'     },
    completed: { label: 'منتهي',          cls: 'bg-purple-100 text-purple-700'   },
    draft:     { label: 'قريباً',         cls: 'bg-amber-100 text-amber-700'     },
};

export default function TournamentDetailPage() {
    const { slug } = useParams<{ slug: string }>();
    const [tournament, setTournament] = useState<any>(null);
    const [categories, setCategories] = useState<any[]>([]);
    const [teamCount,  setTeamCount]  = useState(0);
    const [loading,    setLoading]    = useState(true);

    useEffect(() => {
        (async () => {
            const { data: t } = await supabase
                .from('tournament_new')
                .select('*')
                .eq('slug', slug)
                .eq('is_public', true)
                .single();

            if (!t) { setLoading(false); return; }
            setTournament(t);

            const [catsRes, teamsRes] = await Promise.all([
                supabase.from('tournament_categories').select('*').eq('tournament_id', t.id).order('sort_order'),
                supabase.from('tournament_teams').select('id').eq('tournament_id', t.id).eq('status', 'approved'),
            ]);
            setCategories(catsRes.data || []);
            setTeamCount(teamsRes.data?.length || 0);
            setLoading(false);
        })();
    }, [slug]);

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin" />
        </div>
    );

    if (!tournament) return (
        <div className="min-h-screen flex items-center justify-center text-slate-500" dir="rtl">
            <div className="text-center">
                <Trophy className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="font-bold">البطولة غير موجودة</p>
                <Link href="/tournaments" className="text-yellow-600 text-sm mt-2 block hover:underline">العودة للبطولات</Link>
            </div>
        </div>
    );

    const cfg = STATUS_CFG[tournament.status] || STATUS_CFG.draft;
    const canRegister = tournament.status === 'open';

    const TYPE_LABEL: Record<string, string> = {
        knockout: 'كأس إقصائي', league: 'دوري', groups_knockout: 'مجموعات + إقصاء',
    };

    return (
        <div className="min-h-screen bg-slate-50" dir="rtl">

            {/* Banner */}
            {tournament.banner_url && (
                <div className="h-48 bg-cover bg-center relative" style={{ backgroundImage: `url(${tournament.banner_url})` }}>
                    <div className="absolute inset-0 bg-black/50" />
                </div>
            )}

            {/* Header */}
            <div className={`${tournament.banner_url ? 'bg-slate-900' : 'bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900'} text-white py-10 px-4`}>
                <div className="max-w-4xl mx-auto">
                    <Link href="/tournaments" className="flex items-center gap-1 text-slate-400 hover:text-white text-sm mb-6 transition-colors">
                        <ChevronLeft className="w-4 h-4 rotate-180" /> البطولات
                    </Link>
                    <div className="flex gap-5 items-start">
                        {tournament.logo_url ? (
                            <img src={tournament.logo_url} alt={tournament.name} className="w-20 h-20 rounded-2xl object-cover border-2 border-white/20 flex-shrink-0" />
                        ) : (
                            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center flex-shrink-0">
                                <Trophy className="w-10 h-10 text-white" />
                            </div>
                        )}
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 flex-wrap mb-2">
                                <h1 className="text-2xl font-black">{tournament.name}</h1>
                                <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${cfg.cls}`}>{cfg.label}</span>
                            </div>
                            <div className="flex flex-wrap gap-3 text-slate-400 text-sm">
                                {(tournament.city || tournament.country) && (
                                    <span className="flex items-center gap-1"><MapPin className="w-4 h-4" />{tournament.city || tournament.country}</span>
                                )}
                                {tournament.start_date && (
                                    <span className="flex items-center gap-1">
                                        <Calendar className="w-4 h-4" />
                                        {new Date(tournament.start_date).toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' })}
                                    </span>
                                )}
                                <span className="flex items-center gap-1"><Shield className="w-4 h-4" />{TYPE_LABEL[tournament.type]}</span>
                                <span className="flex items-center gap-1"><Users className="w-4 h-4" />{teamCount} / {tournament.max_teams || '∞'} فريق</span>
                            </div>
                        </div>
                    </div>

                    {canRegister && (
                        <div className="mt-6 flex flex-wrap gap-3">
                            <Link href={`/tournaments/${slug}/register`}
                                className="flex items-center gap-2 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 text-white font-black px-6 py-3 rounded-xl shadow-lg transition-all">
                                <Users className="w-4 h-4" /> سجّل فريقاً
                            </Link>
                            <Link href={`/tournaments/${slug}/register?type=individual`}
                                className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white font-bold px-6 py-3 rounded-xl transition-all border border-white/20">
                                <User className="w-4 h-4" /> تسجيل لاعب فردي
                            </Link>
                        </div>
                    )}
                </div>
            </div>

            {/* Content */}
            <div className="max-w-4xl mx-auto px-4 py-8 grid md:grid-cols-3 gap-6">

                {/* Main */}
                <div className="md:col-span-2 space-y-5">
                    {tournament.description && (
                        <div className="bg-white border border-slate-200 rounded-2xl p-5">
                            <h3 className="font-black text-slate-900 text-sm mb-3 flex items-center gap-2">
                                <FileText className="w-4 h-4 text-yellow-500" /> عن البطولة
                            </h3>
                            <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">{tournament.description}</p>
                        </div>
                    )}

                    {categories.length > 0 && (
                        <div className="bg-white border border-slate-200 rounded-2xl p-5">
                            <h3 className="font-black text-slate-900 text-sm mb-4 flex items-center gap-2">
                                <Star className="w-4 h-4 text-yellow-500" /> الفئات العمرية
                            </h3>
                            <div className="space-y-3">
                                {categories.map((c: any) => (
                                    <div key={c.id} className="flex items-center justify-between bg-slate-50 rounded-xl px-4 py-3">
                                        <div>
                                            <p className="font-bold text-slate-800 text-sm">{c.name}</p>
                                            {(c.age_min || c.age_max) && (
                                                <p className="text-xs text-slate-400">
                                                    {c.age_min && `من ${c.age_min}`}{c.age_max && ` إلى ${c.age_max} سنة`}
                                                </p>
                                            )}
                                        </div>
                                        <div className="text-right">
                                            <span className="text-xs bg-indigo-100 text-indigo-700 font-bold px-2 py-0.5 rounded-full">
                                                {c.type === 'knockout' ? 'كأس' : c.type === 'league' ? 'دوري' : 'مجموعات'}
                                            </span>
                                            {c.max_teams && (
                                                <p className="text-[10px] text-slate-400 mt-1">{c.max_teams} فريق كحد أقصى</p>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {tournament.rules && (
                        <div className="bg-white border border-slate-200 rounded-2xl p-5">
                            <h3 className="font-black text-slate-900 text-sm mb-3">القواعد واللوائح</h3>
                            <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">{tournament.rules}</p>
                        </div>
                    )}

                    {tournament.prizes && (
                        <div className="bg-gradient-to-br from-yellow-50 to-orange-50 border border-yellow-200 rounded-2xl p-5">
                            <h3 className="font-black text-slate-900 text-sm mb-3 flex items-center gap-2">
                                🏆 الجوائز
                            </h3>
                            <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">{tournament.prizes}</p>
                        </div>
                    )}
                </div>

                {/* Sidebar */}
                <div className="space-y-4">
                    {/* Registration info */}
                    <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3">
                        <h3 className="font-black text-slate-900 text-sm">معلومات التسجيل</h3>
                        <InfoRow icon={<DollarSign className="w-4 h-4 text-slate-400" />}
                            label="رسوم التسجيل"
                            value={tournament.is_paid && tournament.entry_fee
                                ? `${tournament.entry_fee} ${tournament.currency}`
                                : 'مجاني'} />
                        {tournament.registration_deadline && (
                            <InfoRow icon={<Clock className="w-4 h-4 text-slate-400" />}
                                label="آخر موعد"
                                value={new Date(tournament.registration_deadline).toLocaleDateString('ar-SA')} />
                        )}
                        {tournament.max_teams && (
                            <InfoRow icon={<Users className="w-4 h-4 text-slate-400" />}
                                label="الفرق المسجلة"
                                value={`${teamCount} / ${tournament.max_teams}`} />
                        )}
                        {tournament.players_per_team && (
                            <InfoRow icon={<User className="w-4 h-4 text-slate-400" />}
                                label="لاعبون لكل فريق"
                                value={`${tournament.players_per_team} لاعب`} />
                        )}
                        {canRegister && (
                            <div className="pt-2 space-y-2">
                                <Link href={`/tournaments/${slug}/register`}
                                    className="w-full flex items-center justify-center gap-2 bg-yellow-500 hover:bg-yellow-400 text-white font-bold py-2.5 rounded-xl text-sm transition-all">
                                    <Users className="w-4 h-4" /> تسجيل فريق
                                </Link>
                                <Link href={`/tournaments/${slug}/register?type=individual`}
                                    className="w-full flex items-center justify-center gap-2 border border-slate-200 hover:border-yellow-300 text-slate-700 font-bold py-2.5 rounded-xl text-sm transition-all">
                                    <User className="w-4 h-4" /> تسجيل لاعب فردي
                                </Link>
                            </div>
                        )}
                    </div>

                    {/* Contact */}
                    {tournament.contact_info && (
                        <div className="bg-white border border-slate-200 rounded-2xl p-5">
                            <h3 className="font-black text-slate-900 text-sm mb-3 flex items-center gap-2">
                                <Phone className="w-4 h-4 text-slate-400" /> التواصل
                            </h3>
                            <p className="text-sm text-slate-600 whitespace-pre-line">{tournament.contact_info}</p>
                        </div>
                    )}

                    {/* Dates */}
                    <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3">
                        <h3 className="font-black text-slate-900 text-sm">مواعيد البطولة</h3>
                        {tournament.start_date && (
                            <InfoRow icon={<Calendar className="w-4 h-4 text-slate-400" />}
                                label="تاريخ البدء"
                                value={new Date(tournament.start_date).toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' })} />
                        )}
                        {tournament.end_date && (
                            <InfoRow icon={<Calendar className="w-4 h-4 text-slate-400" />}
                                label="تاريخ الانتهاء"
                                value={new Date(tournament.end_date).toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' })} />
                        )}
                        {tournament.location && (
                            <InfoRow icon={<MapPin className="w-4 h-4 text-slate-400" />}
                                label="الموقع"
                                value={tournament.location} />
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
    return (
        <div className="flex items-center gap-2">
            {icon}
            <span className="text-xs text-slate-500 flex-1">{label}</span>
            <span className="text-xs font-bold text-slate-800">{value}</span>
        </div>
    );
}
