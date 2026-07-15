'use client';

import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/config';
import { Trophy, Users, User, CheckCircle, ChevronLeft, Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from '@/lib/i18n';

type Category = { id: string; name: string; age_min: number | null; age_max: number | null; max_teams: number | null };

export default function RegisterPage() {
    const { isRTL, getTranslations } = useTranslation();
    const copy = getTranslations<any>('tournamentRegister');
    const { slug }   = useParams<{ slug: string }>();
    const searchParams = useSearchParams();
    const defaultType = searchParams.get('type') === 'individual' ? 'individual' : 'team';

    const [tournament,  setTournament]  = useState<any>(null);
    const [categories,  setCategories]  = useState<Category[]>([]);
    const [loading,     setLoading]     = useState(true);
    const [regType,     setRegType]     = useState<'team' | 'individual'>(defaultType);
    const [submitting,  setSubmitting]  = useState(false);
    const [done,        setDone]        = useState(false);

    // Team form
    const [team, setTeam] = useState({
        name: '', club_name: '', city: '', country: copy.defaultCountry,
        contact_name: '', contact_phone: '', contact_email: '',
        category_id: '', notes: '',
    });

    // Individual form
    const [player, setPlayer] = useState({
        name: '', date_of_birth: '', position: '', contact_phone: '',
        contact_email: '', category_id: '', notes: '',
    });

    useEffect(() => {
        (async () => {
            const { data: t } = await supabase
                .from('tournament_new')
                .select('*')
                .eq('slug', slug)
                .eq('is_public', true)
                .eq('status', 'open')
                .single();
            setTournament(t);
            if (t) {
                const { data: cats } = await supabase
                    .from('tournament_categories')
                    .select('id, name, age_min, age_max, max_teams')
                    .eq('tournament_id', t.id)
                    .order('sort_order');
                setCategories(cats || []);
                if (cats && cats.length === 1) {
                    setTeam(p => ({ ...p, category_id: cats[0].id }));
                    setPlayer(p => ({ ...p, category_id: cats[0].id }));
                }
            }
            setLoading(false);
        })();
    }, [slug]);

    // ── Submit team ──────────────────────────────────────────
    const submitTeam = async () => {
        if (!team.name.trim())         { toast.error(copy.required.team); return; }
        if (!team.contact_name.trim()) { toast.error(copy.required.contact); return; }
        if (!team.contact_phone.trim()){ toast.error(copy.required.phone); return; }
        setSubmitting(true);
        try {
            const { error } = await supabase.from('tournament_teams').insert({
                tournament_id:  tournament.id,
                name:           team.name,
                club_name:      team.club_name  || null,
                city:           team.city       || null,
                country:        team.country    || null,
                contact_name:   team.contact_name,
                contact_phone:  team.contact_phone,
                contact_email:  team.contact_email || null,
                category_id:    team.category_id   || null,
                notes:          team.notes         || null,
                status:         'pending',
            });
            if (error) throw error;
            setDone(true);
        } catch (e: any) {
            toast.error(copy.failed.replace('{error}',e.message));
        } finally {
            setSubmitting(false);
        }
    };

    // ── Submit individual ────────────────────────────────────
    const submitIndividual = async () => {
        if (!player.name.trim())          { toast.error(copy.required.player); return; }
        if (!player.contact_phone.trim()) { toast.error(copy.required.phone); return; }
        setSubmitting(true);
        try {
            // ننشئ "فريق" للاعب الفردي باسمه، بحيث يمكن للمنظم لاحقاً تجميعهم
            const { data: teamData, error: teamErr } = await supabase
                .from('tournament_teams')
                .insert({
                    tournament_id:  tournament.id,
                    name:           copy.individualTeam.replace('{name}',player.name),
                    contact_name:   player.name,
                    contact_phone:  player.contact_phone,
                    contact_email:  player.contact_email || null,
                    category_id:    player.category_id  || null,
                    notes:          copy.individualNote.replace('{note}',player.notes || '').trim(),
                    status:         'pending',
                })
                .select('id')
                .single();
            if (teamErr) throw teamErr;

            // نضيف اللاعب في tournament_players
            await supabase.from('tournament_players').insert({
                tournament_id: tournament.id,
                team_id:       teamData.id,
                name:          player.name,
                date_of_birth: player.date_of_birth || null,
                position:      player.position      || null,
            });

            setDone(true);
        } catch (e: any) {
            toast.error(copy.failed.replace('{error}',e.message));
        } finally {
            setSubmitting(false);
        }
    };

    // ── Loading ──────────────────────────────────────────────
    if (loading) return (
        <div className="min-h-screen flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin" />
        </div>
    );

    if (!tournament) return (
        <div className="min-h-screen flex items-center justify-center text-slate-500" dir={isRTL?'rtl':'ltr'}>
            <div className="text-center">
                <AlertCircle className="w-12 h-12 text-rose-400 mx-auto mb-3" />
                <p className="font-bold">{copy.unavailable}</p>
                <Link href="/tournaments" className="text-yellow-600 text-sm mt-2 block hover:underline">{copy.back}</Link>
            </div>
        </div>
    );

    // ── Success ──────────────────────────────────────────────
    if (done) return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50" dir={isRTL?'rtl':'ltr'}>
            <div className="bg-white border border-slate-200 rounded-3xl p-10 max-w-md w-full mx-4 text-center shadow-lg">
                <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="w-8 h-8 text-emerald-600" />
                </div>
                <h2 className="font-black text-slate-900 text-xl mb-2">{copy.success}</h2>
                <p className="text-slate-500 text-sm mb-6">
                    {regType === 'team'
                        ? copy.successTeam : copy.successPlayer}
                </p>
                <Link href={`/tournaments/${slug}`}
                    className="inline-flex items-center gap-2 bg-yellow-500 hover:bg-yellow-400 text-white font-bold px-6 py-3 rounded-xl text-sm transition-all">
                    <Trophy className="w-4 h-4" /> {copy.view}
                </Link>
            </div>
        </div>
    );

    const f = (key: string, val: string) => setTeam(p => ({ ...p, [key]: val }));
    const fp = (key: string, val: string) => setPlayer(p => ({ ...p, [key]: val }));

    return (
        <div className="min-h-screen bg-slate-50" dir={isRTL?'rtl':'ltr'}>

            {/* Header */}
            <div className="bg-gradient-to-br from-slate-900 to-indigo-950 text-white py-10 px-4">
                <div className="max-w-2xl mx-auto">
                    <Link href={`/tournaments/${slug}`}
                        className="flex items-center gap-1 text-slate-400 hover:text-white text-sm mb-5 transition-colors">
                        <ChevronLeft className="w-4 h-4 rotate-180" /> {tournament.name}
                    </Link>
                    <h1 className="text-2xl font-black mb-1">{copy.title}</h1>
                    <p className="text-slate-400 text-sm">{tournament.name}</p>
                </div>
            </div>

            <div className="max-w-2xl mx-auto px-4 py-8 space-y-5">

                {/* Type toggle */}
                <div className="bg-white border border-slate-200 rounded-2xl p-4">
                    <p className="text-xs font-bold text-slate-500 mb-3">{copy.type}</p>
                    <div className="grid grid-cols-2 gap-3">
                        <button onClick={() => setRegType('team')}
                            className={`flex items-center gap-3 p-4 rounded-xl border-2 text-right transition-all
                                ${regType === 'team' ? 'border-yellow-400 bg-yellow-50' : 'border-slate-200 hover:border-slate-300'}`}>
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0
                                ${regType === 'team' ? 'bg-yellow-500' : 'bg-slate-100'}`}>
                                <Users className={`w-5 h-5 ${regType === 'team' ? 'text-white' : 'text-slate-400'}`} />
                            </div>
                            <div>
                                <p className="font-bold text-slate-800 text-sm">{copy.teamRegistration}</p>
                                <p className="text-[10px] text-slate-400">{copy.teamHelp}</p>
                            </div>
                        </button>
                        <button onClick={() => setRegType('individual')}
                            className={`flex items-center gap-3 p-4 rounded-xl border-2 text-right transition-all
                                ${regType === 'individual' ? 'border-indigo-400 bg-indigo-50' : 'border-slate-200 hover:border-slate-300'}`}>
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0
                                ${regType === 'individual' ? 'bg-indigo-500' : 'bg-slate-100'}`}>
                                <User className={`w-5 h-5 ${regType === 'individual' ? 'text-white' : 'text-slate-400'}`} />
                            </div>
                            <div>
                                <p className="font-bold text-slate-800 text-sm">{copy.individual}</p>
                                <p className="text-[10px] text-slate-400">{copy.individualHelp}</p>
                            </div>
                        </button>
                    </div>
                </div>

                {/* Individual info box */}
                {regType === 'individual' && (
                    <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-4 flex gap-3">
                        <User className="w-5 h-5 text-indigo-500 flex-shrink-0 mt-0.5" />
                        <div>
                            <p className="font-bold text-indigo-800 text-sm">{copy.howTitle}</p>
                            <p className="text-xs text-indigo-600 mt-1 leading-relaxed">
                                {copy.howText}
                            </p>
                        </div>
                    </div>
                )}

                {/* Form */}
                <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
                    <h3 className="font-black text-slate-900 text-sm">
                        {regType === 'team' ? copy.teamData : copy.playerData}
                    </h3>

                    {/* Category selector */}
                    {categories.length > 1 && (
                        <div>
                            <label className="text-xs font-bold text-slate-500 block mb-1.5">{copy.category}</label>
                            <select
                                value={regType === 'team' ? team.category_id : player.category_id}
                                onChange={e => regType === 'team' ? f('category_id', e.target.value) : fp('category_id', e.target.value)}
                                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-yellow-400 bg-white">
                                <option value="">{copy.selectCategory}</option>
                                {categories.map(c => (
                                    <option key={c.id} value={c.id}>
                                        {c.name}{c.age_min && c.age_max ? ` (${c.age_min}–${c.age_max} ${copy.years})` : ''}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    {regType === 'team' ? (
                        /* ── Team fields ── */
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                                <div className="col-span-2">
                                    <label className="text-xs font-bold text-slate-500 block mb-1.5">{copy.teamName}</label>
                                    <input value={team.name} onChange={e => f('name', e.target.value)}
                                        className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-yellow-400"
                                        placeholder={copy.teamPlaceholder} />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 block mb-1.5">{copy.club}</label>
                                    <input value={team.club_name} onChange={e => f('club_name', e.target.value)}
                                        className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-yellow-400"
                                        placeholder={copy.optional} />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 block mb-1.5">{copy.city}</label>
                                    <input value={team.city} onChange={e => f('city', e.target.value)}
                                        className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-yellow-400"
                                        placeholder={copy.cityPlaceholder} />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 block mb-1.5">{copy.contactName}</label>
                                    <input value={team.contact_name} onChange={e => f('contact_name', e.target.value)}
                                        className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-yellow-400"
                                        placeholder={copy.contactPlaceholder} />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 block mb-1.5">{copy.phone}</label>
                                    <input value={team.contact_phone} onChange={e => f('contact_phone', e.target.value)}
                                        className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-yellow-400"
                                        placeholder="+966..." dir="ltr" />
                                </div>
                                <div className="col-span-2">
                                    <label className="text-xs font-bold text-slate-500 block mb-1.5">{copy.email}</label>
                                    <input type="email" value={team.contact_email} onChange={e => f('contact_email', e.target.value)}
                                        className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-yellow-400"
                                        placeholder="team@example.com" dir="ltr" />
                                </div>
                                <div className="col-span-2">
                                    <label className="text-xs font-bold text-slate-500 block mb-1.5">{copy.notes}</label>
                                    <textarea value={team.notes} onChange={e => f('notes', e.target.value)} rows={3}
                                        className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-yellow-400 resize-none"
                                        placeholder={copy.teamNotes} />
                                </div>
                            </div>
                        </div>
                    ) : (
                        /* ── Individual fields ── */
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                                <div className="col-span-2">
                                    <label className="text-xs font-bold text-slate-500 block mb-1.5">{copy.playerName}</label>
                                    <input value={player.name} onChange={e => fp('name', e.target.value)}
                                        className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-yellow-400"
                                        placeholder={copy.playerPlaceholder} />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 block mb-1.5">{copy.birthDate}</label>
                                    <input type="date" value={player.date_of_birth} onChange={e => fp('date_of_birth', e.target.value)}
                                        className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-yellow-400" dir="ltr" />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 block mb-1.5">{copy.position}</label>
                                    <select value={player.position} onChange={e => fp('position', e.target.value)}
                                        className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-yellow-400 bg-white">
                                        <option value="">{copy.select}</option>
                                        {['goalkeeper','defender','midfielder','forward'].map((value,index)=><option key={value} value={value}>{copy.positions[index]}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 block mb-1.5">{copy.phone}</label>
                                    <input value={player.contact_phone} onChange={e => fp('contact_phone', e.target.value)}
                                        className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-yellow-400"
                                        placeholder="+966..." dir="ltr" />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 block mb-1.5">{copy.email}</label>
                                    <input type="email" value={player.contact_email} onChange={e => fp('contact_email', e.target.value)}
                                        className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-yellow-400"
                                        placeholder="player@example.com" dir="ltr" />
                                </div>
                                <div className="col-span-2">
                                    <label className="text-xs font-bold text-slate-500 block mb-1.5">{copy.notes}</label>
                                    <textarea value={player.notes} onChange={e => fp('notes', e.target.value)} rows={2}
                                        className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-yellow-400 resize-none"
                                        placeholder={copy.playerNotes} />
                                </div>
                            </div>
                        </div>
                    )}

                    <button
                        onClick={regType === 'team' ? submitTeam : submitIndividual}
                        disabled={submitting}
                        className="w-full flex items-center justify-center gap-2 bg-yellow-500 hover:bg-yellow-400 disabled:opacity-50 text-white font-black py-3 rounded-xl text-sm transition-all mt-2">
                        {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> :
                         regType === 'team' ? <Users className="w-4 h-4" /> : <User className="w-4 h-4" />}
                        {submitting ? copy.submitting : regType === 'team' ? copy.submitTeam : copy.submitPlayer}
                    </button>
                </div>
            </div>
        </div>
    );
}
