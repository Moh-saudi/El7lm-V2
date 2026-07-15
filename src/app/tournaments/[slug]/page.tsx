'use client';

import { useEffect, useState } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/config';
import { Trophy, MapPin, Calendar, Users, Clock, ChevronRight, User, DollarSign, Share2 } from 'lucide-react';
import { resolveImg } from '@/app/tournament-portal/_utils/img';
import { useTranslation } from '@/lib/i18n';

type Tab = 'info' | 'schedule' | 'standings' | 'stats' | 'bracket' | 'teams';

export default function TournamentPublicPage() {
  const { locale, isRTL, getTranslations } = useTranslation();
  const copy = getTranslations<any>('tournamentPublic');
  const STATUS_CFG: Record<string,{label:string;color:string}> = {
    open:{label:copy.statuses.open,color:'#16a34a'}, ongoing:{label:copy.statuses.ongoing,color:'#2563eb'}, closed:{label:copy.statuses.closed,color:'#64748b'}, completed:{label:copy.statuses.completed,color:'#8b5cf6'}, draft:{label:copy.statuses.draft,color:'#f59e0b'},
  };
  const { slug }   = useParams<{ slug: string }>();
  const params     = useSearchParams();
  const router     = useRouter();
  const [tab, setTab] = useState<Tab>((params.get('tab') as Tab) || 'info');

  const [tournament, setTournament] = useState<any>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading,    setLoading]    = useState(true);

  // Data per tab
  const [matches,    setMatches]    = useState<any[]>([]);
  const [standings,  setStandings]  = useState<any[]>([]);
  const [scorers,    setScorers]    = useState<any[]>([]);
  const [teams,      setTeams]      = useState<any[]>([]);
  const [bracket,    setBracket]    = useState<any[]>([]);
  const [sponsors,   setSponsors]   = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const { data: t } = await supabase
        .from('tournament_new').select('*')
        .eq('slug', slug).eq('is_public', true).single();
      if (!t) { setLoading(false); return; }
      setTournament(t);
      const [catsRes, sponsorsRes] = await Promise.all([
        supabase.from('tournament_categories').select('*').eq('tournament_id', t.id).order('sort_order'),
        supabase.from('tournament_sponsors').select('*').eq('tournament_id', t.id).order('tier').order('name'),
      ]);
      setCategories(catsRes.data || []);
      setSponsors(sponsorsRes.data || []);
      setLoading(false);
    })();
  }, [slug]);

  // Load schedule
  useEffect(() => {
    if (tab !== 'schedule' || !tournament) return;
    (async () => {
      const { data } = await supabase
        .from('tournament_matches')
        .select('id,round,match_date,venue,status,home_score,away_score,match_number,home_team:tournament_teams!home_team_id(name,logo_url),away_team:tournament_teams!away_team_id(name,logo_url)')
        .eq('tournament_id', tournament.id)
        .order('match_number', { ascending: true });
      setMatches(data || []);
    })();
  }, [tab, tournament]);

  // Load standings
  useEffect(() => {
    if (tab !== 'standings' || !tournament) return;
    (async () => {
      const { data } = await supabase
        .from('tournament_standings')
        .select('*, team:tournament_teams(name,logo_url), group:tournament_groups(name)')
        .eq('tournament_id', tournament.id)
        .order('points', { ascending: false })
        .order('goal_diff', { ascending: false });
      setStandings(data || []);
    })();
  }, [tab, tournament]);

  // Load stats
  useEffect(() => {
    if (tab !== 'stats' || !tournament) return;
    (async () => {
      const { data } = await supabase
        .from('tournament_top_scorers')
        .select('*, team:tournament_teams(name,logo_url)')
        .eq('tournament_id', tournament.id)
        .order('goals', { ascending: false })
        .order('assists', { ascending: false })
        .limit(20);
      setScorers(data || []);
    })();
  }, [tab, tournament]);

  // Load teams
  useEffect(() => {
    if (tab !== 'teams' || !tournament) return;
    (async () => {
      const { data } = await supabase
        .from('tournament_teams')
        .select('id,name,logo_url,city,country,category_id,category:tournament_categories(name)')
        .eq('tournament_id', tournament.id)
        .eq('status', 'approved')
        .order('name');
      setTeams(data || []);
    })();
  }, [tab, tournament]);

  // Load bracket
  useEffect(() => {
    if (tab !== 'bracket' || !tournament) return;
    (async () => {
      const { data } = await supabase
        .from('tournament_matches')
        .select('id,round,match_number,home_score,away_score,status,match_date,home_team:tournament_teams!home_team_id(name,logo_url),away_team:tournament_teams!away_team_id(name,logo_url)')
        .eq('tournament_id', tournament.id)
        .in('round', ['QF','SF','final','3rd','quarter_final','semi_final','third_place','F'])
        .order('match_number', { ascending: true });
      setBracket(data || []);
    })();
  }, [tab, tournament]);

  const changeTab = (t: Tab) => {
    setTab(t);
    router.replace(`/tournaments/${slug}?tab=${t}`, { scroll: false });
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#0b0e1a]">
      <div className="w-10 h-10 border-3 border-[#d97706] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!tournament) return (
    <div className="min-h-screen flex items-center justify-center bg-[#0b0e1a]" dir={isRTL?'rtl':'ltr'}>
      <div className="text-center text-white">
        <Trophy className="w-14 h-14 text-[#64748b] mx-auto mb-4" />
        <p className="font-bold text-lg">{copy.notFound}</p>
        <Link href="/tournaments" className="text-[#d97706] text-sm mt-2 block">{copy.back}</Link>
      </div>
    </div>
  );

  const cfg        = STATUS_CFG[tournament.status] || STATUS_CFG.draft;
  const canReg     = tournament.status === 'open';
  const approvedN  = categories.length;

  const TABS: { key: Tab; emoji: string; label: string }[] = [
    { key: 'info', emoji:'ℹ️', label:copy.tabs[0] }, { key:'teams',emoji:'👥',label:copy.tabs[1] },
    { key:'schedule',emoji:'📅',label:copy.tabs[2] }, { key:'standings',emoji:'📊',label:copy.tabs[3] },
    { key:'stats',emoji:'⚽',label:copy.tabs[4] }, { key:'bracket',emoji:'🏆',label:copy.tabs[5] },
  ];

  // Group matches by date
  const byDate: Record<string, any[]> = {};
  for (const m of matches) {
    const key = m.match_date
      ? new Date(m.match_date).toLocaleDateString(locale, { weekday: 'long', month: 'long', day: 'numeric' })
      : copy.noDate;
    (byDate[key] = byDate[key] || []).push(m);
  }

  // Group standings by group
  const byGroup: Record<string, any[]> = {};
  for (const s of standings) {
    const key = s.group?.name || copy.generalStandings;
    (byGroup[key] = byGroup[key] || []).push(s);
  }

  const tName = (m: any, side: 'home' | 'away') =>
    side === 'home' ? (m.home_team?.name || copy.tbd) : (m.away_team?.name || copy.tbd);
  const tLogo = (m: any, side: 'home' | 'away') =>
    resolveImg(side === 'home' ? m.home_team?.logo_url : m.away_team?.logo_url);

  return (
    <div dir={isRTL?'rtl':'ltr'} style={{ minHeight: '100vh', background: '#0b0e1a', color: '#e8eaf0', fontFamily: "'Tajawal', sans-serif" }}>

      {/* ── Hero ── */}
      <div style={{ background: 'linear-gradient(135deg, #0a1628 0%, #0f2d6b 50%, #0a1628 100%)', padding: '28px 16px 0', position: 'relative' }}>
        <div style={{ maxWidth: 860, margin: '0 auto' }}>

          {/* Back */}
          <Link href="/tournaments" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#64748b', fontSize: 13, textDecoration: 'none', marginBottom: 16 }}>
            <ChevronRight size={14} /> {copy.tournaments}
          </Link>

          <div style={{ display: 'flex', gap: 18, alignItems: 'flex-start', flexWrap: 'wrap' }}>
            {/* Logo */}
            <div style={{ width: 72, height: 72, borderRadius: 18, overflow: 'hidden', background: 'rgba(255,255,255,0.07)', border: '2px solid rgba(255,255,255,0.15)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {tournament.logo_url
                ? <img src={resolveImg(tournament.logo_url) || tournament.logo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <Trophy size={30} color="rgba(255,255,255,0.5)" />}
            </div>

            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 8 }}>
                <h1 style={{ fontSize: 24, fontWeight: 900, color: '#fff', margin: 0 }}>{tournament.name}</h1>
                <span style={{ fontSize: 12, fontWeight: 700, color: cfg.color, background: `${cfg.color}20`, border: `1px solid ${cfg.color}40`, borderRadius: 12, padding: '3px 11px' }}>
                  {cfg.label}
                </span>
              </div>
              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                {tournament.city && <span style={{ fontSize: 13, color: '#64748b', display: 'flex', alignItems: 'center', gap: 4 }}><MapPin size={13} />{tournament.city}</span>}
                {tournament.start_date && <span style={{ fontSize: 13, color: '#64748b', display: 'flex', alignItems: 'center', gap: 4 }}><Calendar size={13} />{new Date(tournament.start_date).toLocaleDateString('ar-SA', { month: 'short', day: 'numeric', year: 'numeric' })}</span>}
                {tournament.type && <span style={{ fontSize: 13, color: '#64748b', display: 'flex', alignItems: 'center', gap: 4 }}><Trophy size={13} />{copy.types[tournament.type] || tournament.type}</span>}
              </div>

              {/* CTA */}
              {canReg && (
                <div style={{ display: 'flex', gap: 10, marginTop: 16, flexWrap: 'wrap' }}>
                  <Link href={`/tournaments/${slug}/register`}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'linear-gradient(135deg,#d97706,#ea580c)', color: '#fff', fontWeight: 700, padding: '10px 20px', borderRadius: 12, textDecoration: 'none', fontSize: 14 }}>
                    <Users size={15} /> {copy.registerTeam}
                  </Link>
                  <button
                    onClick={() => { navigator.clipboard?.writeText(window.location.href); }}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.08)', color: '#e2e8f0', fontWeight: 600, padding: '10px 16px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.15)', cursor: 'pointer', fontSize: 13 }}>
                    <Share2 size={13} /> {copy.share}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Tab bar */}
          <div style={{ display: 'flex', marginTop: 24, borderBottom: '1px solid rgba(255,255,255,0.07)', overflowX: 'auto', scrollbarWidth: 'none' }}>
            {TABS.map(t => (
              <button key={t.key} onClick={() => changeTab(t.key)} style={{
                display: 'inline-flex', alignItems: 'center', gap: 6, padding: '12px 18px',
                fontSize: 14, fontWeight: tab === t.key ? 700 : 500,
                color: tab === t.key ? '#d97706' : '#64748b',
                background: 'transparent', border: 'none',
                borderBottom: `2.5px solid ${tab === t.key ? '#d97706' : 'transparent'}`,
                cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0, fontFamily: 'inherit',
                transition: 'all 0.15s', marginBottom: -1,
              }}>
                <span>{t.emoji}</span> {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      <div style={{ maxWidth: 860, margin: '0 auto', padding: '20px 16px 48px' }}>

        {/* INFO */}
        {tab === 'info' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 16, alignItems: 'start' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {tournament.description && (
                <InfoCard title={copy.about} emoji="📋">
                  <p style={{ fontSize: 15, color: '#94a3b8', lineHeight: 1.7, whiteSpace: 'pre-line', margin: 0 }}>{tournament.description}</p>
                </InfoCard>
              )}
              {categories.length > 0 && (
                <InfoCard title={copy.ageCategories} emoji="⭐">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {categories.map((c: any) => (
                      <div key={c.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: '11px 14px' }}>
                        <div>
                          <div style={{ fontSize: 15, fontWeight: 700, color: '#e2e8f0' }}>{c.name}</div>
                          {(c.age_min || c.age_max) && (
                            <div style={{ fontSize: 12, color: '#64748b' }}>{c.age_min && copy.from.replace('{age}',c.age_min)}{c.age_max && ` ${copy.to.replace('{age}',c.age_max)}`}</div>
                          )}
                        </div>
                        <span style={{ fontSize: 11, fontWeight: 700, color: '#d97706', background: 'rgba(217,119,6,0.15)', padding: '3px 10px', borderRadius: 8 }}>
                          {c.type === 'knockout' ? copy.categoryTypes[0] : c.type === 'league' ? copy.categoryTypes[1] : copy.categoryTypes[2]}
                        </span>
                      </div>
                    ))}
                  </div>
                </InfoCard>
              )}
              {tournament.prizes && (
                <InfoCard title={copy.prizes} emoji="🏆">
                  <p style={{ fontSize: 15, color: '#94a3b8', lineHeight: 1.7, whiteSpace: 'pre-line', margin: 0 }}>{tournament.prizes}</p>
                </InfoCard>
              )}
              {tournament.rules && (
                <InfoCard title={copy.rules} emoji="📜">
                  <p style={{ fontSize: 15, color: '#94a3b8', lineHeight: 1.7, whiteSpace: 'pre-line', margin: 0 }}>{tournament.rules}</p>
                </InfoCard>
              )}
            </div>

            {/* Sidebar */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <InfoCard title={copy.registration} emoji="📝">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <SideRow label={copy.fee} value={tournament.is_paid && tournament.entry_fee ? `${tournament.entry_fee} ${tournament.currency || 'SAR'}` : copy.free} />
                  {tournament.registration_deadline && <SideRow label={copy.deadline} value={new Date(tournament.registration_deadline).toLocaleDateString(locale)} />}
                  {tournament.max_teams && <SideRow label={copy.maximum} value={copy.teamCount.replace('{count}',tournament.max_teams)} />}
                  {canReg && (
                    <Link href={`/tournaments/${slug}/register`}
                      style={{ display: 'block', textAlign: 'center', background: '#d97706', color: '#fff', fontWeight: 700, padding: '10px', borderRadius: 10, textDecoration: 'none', fontSize: 14, marginTop: 4 }}>
                      + {copy.registerNow}
                    </Link>
                  )}
                </div>
              </InfoCard>
              <InfoCard title={copy.dates} emoji="📅">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {tournament.start_date && <SideRow label={copy.start} value={new Date(tournament.start_date).toLocaleDateString(locale, { dateStyle: 'long' })} />}
                  {tournament.end_date && <SideRow label={copy.end} value={new Date(tournament.end_date).toLocaleDateString(locale, { dateStyle: 'long' })} />}
                  {tournament.city && <SideRow label={copy.location} value={`${tournament.city}${tournament.country ? ', ' + tournament.country : ''}`} />}
                </div>
              </InfoCard>
              {tournament.contact_info && (
                <InfoCard title={copy.contact} emoji="📞">
                  <p style={{ fontSize: 14, color: '#94a3b8', whiteSpace: 'pre-line', margin: 0 }}>{tournament.contact_info}</p>
                </InfoCard>
              )}
            </div>
          </div>
        )}

        {/* SCHEDULE */}
        {tab === 'schedule' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {matches.length === 0 ? (
              <Empty emoji="📅" text={copy.noSchedule} />
            ) : Object.entries(byDate).map(([date, dayMs]) => (
              <div key={date}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#d97706' }}>{date}</span>
                  <div style={{ flex: 1, height: 1, background: 'rgba(217,119,6,0.2)' }} />
                  <span style={{ fontSize: 12, color: '#64748b' }}>{dayMs.length} {copy.matchAbbr}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {dayMs.map((m: any) => {
                    const fin = m.status === 'completed';
                    const live = m.status === 'live';
                    return (
                      <div key={m.id} style={{ background: '#131929', border: `1px solid ${live ? '#ef4444' : 'rgba(255,255,255,0.07)'}`, borderRadius: 12, overflow: 'hidden' }}>
                        {live && (
                          <div style={{ background: '#ef4444', padding: '3px 0', textAlign: 'center', fontSize: 11, fontWeight: 700, color: '#fff' }}>
                            🔴 {copy.live}
                          </div>
                        )}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 90px 1fr', alignItems: 'center', padding: '13px 14px', gap: 8 }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>
                            <span style={{ fontSize: 14, fontWeight: 700, color: '#e2e8f0', textAlign: 'right' }}>{tName(m, 'home')}</span>
                            <TeamLogoImg logo={tLogo(m, 'home')} name={tName(m, 'home')} size={32} />
                          </div>
                          <div style={{ textAlign: 'center' }}>
                            {fin || live
                              ? <div style={{ background: '#0d1117', borderRadius: 8, padding: '5px 10px', display: 'inline-block' }}>
                                  <span style={{ color: '#fff', fontFamily: 'monospace', fontWeight: 900, fontSize: 17 }}>{m.home_score ?? 0} - {m.away_score ?? 0}</span>
                                </div>
                              : m.match_date
                                ? <div>
                                    <div style={{ fontSize: 15, fontWeight: 800, color: '#e2e8f0' }}>{new Date(m.match_date).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}</div>
                                    <div style={{ fontSize: 10, color: '#64748b' }}>{copy.rounds[m.round] || m.round}</div>
                                  </div>
                                : <span style={{ fontSize: 13, fontWeight: 700, color: '#64748b' }}>vs</span>
                            }
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <TeamLogoImg logo={tLogo(m, 'away')} name={tName(m, 'away')} size={32} />
                            <span style={{ fontSize: 14, fontWeight: 700, color: '#e2e8f0' }}>{tName(m, 'away')}</span>
                          </div>
                        </div>
                        {m.venue && (
                          <div style={{ padding: '5px 14px 8px', fontSize: 11, color: '#64748b' }}>📍 {m.venue}</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* STANDINGS */}
        {tab === 'standings' && (
          standings.length === 0
            ? <Empty emoji="📊" text={copy.noStandings} />
            : Object.entries(byGroup).map(([groupName, rows]) => (
                <div key={groupName} style={{ marginBottom: 20 }}>
                  <div style={{ background: 'linear-gradient(90deg, #1e3a5f, #1d4ed8)', borderRadius: '12px 12px 0 0', padding: '11px 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 14, fontWeight: 800, color: '#fff' }}>📊 {groupName}</span>
                    <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginInlineStart: 'auto' }}>{copy.teamCount.replace('{count}',rows.length)}</span>
                  </div>
                  <div style={{ background: '#131929', border: '1px solid rgba(255,255,255,0.07)', borderTop: 'none', borderRadius: '0 0 12px 12px', overflow: 'hidden' }}>
                    {/* Header */}
                    <div style={{ display: 'grid', gridTemplateColumns: '36px 1fr 40px 40px 40px 40px 56px 48px 48px', padding: '8px 14px', background: '#1a2235', fontSize: 11, fontWeight: 700, color: '#64748b', textAlign: 'center' }}>
                      <div>#</div><div style={{ textAlign: 'start' }}>{copy.table[0]}</div>
                      {copy.table.slice(1).map((label:string)=><div key={label}>{label}</div>)}
                    </div>
                    {[...rows].sort((a, b) => b.points - a.points || b.goal_diff - a.goal_diff).map((s: any, i) => (
                      <div key={s.id} style={{ display: 'grid', gridTemplateColumns: '36px 1fr 40px 40px 40px 40px 56px 48px 48px', padding: '11px 14px', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.04)', fontSize: 14, color: '#e2e8f0', textAlign: 'center', borderRight: i < 2 ? `3px solid ${i === 0 ? '#f59e0b' : '#94a3b8'}` : 'none', background: i < 2 ? 'rgba(29,78,216,0.05)' : 'transparent' }}>
                        <div style={{ fontSize: 13, fontWeight: i < 3 ? 800 : 400, color: ['#f59e0b','#94a3b8','#cd7f32'][i] || '#64748b' }}>{i + 1}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, textAlign: 'right' }}>
                          <TeamLogoImg logo={resolveImg(s.team?.logo_url)} name={s.team?.name || '?'} size={26} />
                          <span style={{ fontWeight: 700, fontSize: 13 }}>{s.team?.name || '—'}</span>
                        </div>
                        <div style={{ color: '#94a3b8' }}>{s.played}</div>
                        <div style={{ color: '#4ade80', fontWeight: 700 }}>{s.won}</div>
                        <div style={{ color: '#94a3b8' }}>{s.drawn}</div>
                        <div style={{ color: '#f87171', fontWeight: 700 }}>{s.lost}</div>
                        <div style={{ fontSize: 12, fontFamily: 'monospace', color: '#94a3b8' }}>{s.goals_for}:{s.goals_against}</div>
                        <div style={{ fontWeight: 700, color: s.goal_diff > 0 ? '#4ade80' : s.goal_diff < 0 ? '#f87171' : '#94a3b8' }}>{s.goal_diff > 0 ? `+${s.goal_diff}` : s.goal_diff}</div>
                        <div style={{ fontSize: 16, fontWeight: 900 }}>{s.points}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
        )}

        {/* STATS */}
        {tab === 'stats' && (
          scorers.length === 0
            ? <Empty emoji="⚽" text={copy.noStats} />
            : <div style={{ background: '#131929', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, overflow: 'hidden' }}>
                <div style={{ background: 'linear-gradient(90deg, #1e3a5f, #1d4ed8)', padding: '11px 16px' }}>
                  <span style={{ fontSize: 14, fontWeight: 800, color: '#fff' }}>⚽ {copy.scorers}</span>
                </div>
                {scorers.map((p: any, i) => (
                  <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <div style={{ width: 28, textAlign: 'center', flexShrink: 0 }}>
                      {['🥇','🥈','🥉'][i] ? <span style={{ fontSize: 20 }}>{['🥇','🥈','🥉'][i]}</span> : <span style={{ fontSize: 13, color: '#64748b' }}>{i + 1}</span>}
                    </div>
                    <TeamLogoImg logo={resolveImg(p.team?.logo_url)} name={p.team?.name || '?'} size={28} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 15, fontWeight: 700, color: '#e2e8f0' }}>{p.player_name}</div>
                      <div style={{ fontSize: 12, color: '#64748b' }}>{p.team?.name} · {p.matches_played} {copy.matchAbbr}</div>
                      <div style={{ height: 4, background: '#1a2235', borderRadius: 2, marginTop: 6, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${scorers[0]?.goals ? (p.goals / scorers[0].goals) * 100 : 0}%`, background: 'linear-gradient(90deg,#16a34a,#22c55e)', borderRadius: 2 }} />
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexShrink: 0 }}>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 22, fontWeight: 900, color: '#16a34a', lineHeight: 1 }}>{p.goals}</div>
                        <div style={{ fontSize: 10, color: '#64748b' }}>{copy.goal}</div>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 17, fontWeight: 700, color: '#3b82f6', lineHeight: 1 }}>{p.assists}</div>
                        <div style={{ fontSize: 10, color: '#64748b' }}>{copy.assist}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
        )}

        {/* TEAMS */}
        {tab === 'teams' && (
          teams.length === 0
            ? <Empty emoji="👥" text={copy.noTeams} />
            : <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
                {teams.map((t: any) => (
                  <div key={t.id} style={{ background: '#131929', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: '16px 14px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, textAlign: 'center' }}>
                    <TeamLogoImg logo={resolveImg(t.logo_url)} name={t.name} size={52} />
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 800, color: '#e2e8f0', marginBottom: 4 }}>{t.name}</div>
                      {t.city && <div style={{ fontSize: 12, color: '#64748b' }}>📍 {t.city}</div>}
                      {t.category?.name && (
                        <span style={{ display: 'inline-block', marginTop: 6, fontSize: 11, fontWeight: 700, color: '#d97706', background: 'rgba(217,119,6,0.15)', padding: '2px 8px', borderRadius: 6 }}>{t.category.name}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
        )}

        {/* BRACKET */}
        {tab === 'bracket' && (() => {
          const ROUND_ORDER: Record<string, number> = { QF: 1, quarter_final: 1, SF: 2, semi_final: 2, '3rd': 3, third_place: 3, F: 4, final: 4 };
          const ROUND_NAME: Record<string,string> = copy.rounds;
          const byRound: Record<string, any[]> = {};
          for (const m of bracket) { const k = m.round; (byRound[k] = byRound[k] || []).push(m); }
          const rounds = Object.entries(byRound).sort((a, b) => (ROUND_ORDER[a[0]] || 9) - (ROUND_ORDER[b[0]] || 9));

          if (bracket.length === 0) return <Empty emoji="🏆" text={copy.noBracket} />;

          return (
            <div style={{ overflowX: 'auto' }}>
              <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', minWidth: 'max-content', padding: '8px 4px 16px' }}>
                {rounds.map(([rnd, ms]) => (
                  <div key={rnd} style={{ display: 'flex', flexDirection: 'column', gap: 12, minWidth: 220 }}>
                    <div style={{ background: 'linear-gradient(90deg,#1e3a5f,#1d4ed8)', borderRadius: 10, padding: '8px 14px', fontSize: 13, fontWeight: 800, color: '#fff', textAlign: 'center' }}>
                      {ROUND_NAME[rnd] || rnd}
                    </div>
                    {ms.map((m: any) => {
                      const fin  = m.status === 'completed';
                      const hWin = fin && (m.home_score ?? 0) > (m.away_score ?? 0);
                      const aWin = fin && (m.away_score ?? 0) > (m.home_score ?? 0);
                      return (
                        <div key={m.id} style={{ background: '#131929', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 12, overflow: 'hidden' }}>
                          {/* Home */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderBottom: '1px solid rgba(255,255,255,0.05)', background: hWin ? 'rgba(22,163,74,0.08)' : 'transparent' }}>
                            <TeamLogoImg logo={resolveImg(m.home_team?.logo_url)} name={m.home_team?.name || 'TBD'} size={24} />
                            <span style={{ flex: 1, fontSize: 13, fontWeight: hWin ? 800 : 500, color: hWin ? '#4ade80' : '#e2e8f0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.home_team?.name || 'TBD'}</span>
                            {fin && <span style={{ fontSize: 16, fontWeight: 900, color: hWin ? '#4ade80' : '#94a3b8', minWidth: 20, textAlign: 'center' }}>{m.home_score ?? 0}</span>}
                            {hWin && <span style={{ fontSize: 14 }}>🏆</span>}
                          </div>
                          {/* Away */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', background: aWin ? 'rgba(22,163,74,0.08)' : 'transparent' }}>
                            <TeamLogoImg logo={resolveImg(m.away_team?.logo_url)} name={m.away_team?.name || 'TBD'} size={24} />
                            <span style={{ flex: 1, fontSize: 13, fontWeight: aWin ? 800 : 500, color: aWin ? '#4ade80' : '#e2e8f0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.away_team?.name || 'TBD'}</span>
                            {fin && <span style={{ fontSize: 16, fontWeight: 900, color: aWin ? '#4ade80' : '#94a3b8', minWidth: 20, textAlign: 'center' }}>{m.away_score ?? 0}</span>}
                            {aWin && <span style={{ fontSize: 14 }}>🏆</span>}
                          </div>
                          {/* Date */}
                          {m.match_date && !fin && (
                            <div style={{ padding: '5px 12px', fontSize: 11, color: '#64748b', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                              📅 {new Date(m.match_date).toLocaleDateString('ar-SA', { month: 'short', day: 'numeric' })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          );
        })()}
      </div>

      {/* SPONSORS */}
      {sponsors.length > 0 && (
        <div style={{ maxWidth: 860, margin: '0 auto', padding: '0 16px 48px' }}>
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: 32 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#64748b', textAlign: 'center', marginBottom: 20, letterSpacing: 1 }}>
              🤝 {slug && copy.sponsors}
            </div>
            {[
              { tier:'platinum', size:72, color:'#e2e8f0' },
              { tier:'gold',     size:56, color:'#f59e0b' },
              { tier:'silver',   size:44, color:'#94a3b8' },
              { tier:'bronze',   size:36, color:'#b45309' },
            ].map(({ tier, size, color }) => {
              const group = sponsors.filter(s => s.tier === tier);
              if (!group.length) return null;
              return (
                <div key={tier} style={{ display:'flex', flexWrap:'wrap', justifyContent:'center', alignItems:'center', gap:20, marginBottom:16 }}>
                  {group.map((sp: any) => (
                    sp.website_url
                      ? <a key={sp.id} href={sp.website_url} target="_blank" rel="noopener noreferrer" title={sp.name} style={{ display:'flex', alignItems:'center', justifyContent:'center', opacity:0.8, transition:'opacity 0.2s' }}
                          onMouseEnter={e=>(e.currentTarget as HTMLAnchorElement).style.opacity='1'}
                          onMouseLeave={e=>(e.currentTarget as HTMLAnchorElement).style.opacity='0.8'}>
                          {sp.logo_url
                            ? <img src={sp.logo_url} alt={sp.name} style={{ height: size, maxWidth: size * 2, objectFit:'contain', filter:'brightness(0) invert(1)', opacity:0.7 }} />
                            : <span style={{ fontSize:13, fontWeight:700, color }}>{sp.name}</span>}
                        </a>
                      : <div key={sp.id} title={sp.name} style={{ display:'flex', alignItems:'center', justifyContent:'center' }}>
                          {sp.logo_url
                            ? <img src={sp.logo_url} alt={sp.name} style={{ height: size, maxWidth: size * 2, objectFit:'contain', filter:'brightness(0) invert(1)', opacity:0.6 }} />
                            : <span style={{ fontSize:13, fontWeight:700, color }}>{sp.name}</span>}
                        </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800;900&display=swap');
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { display: none; }
        @media (max-width: 640px) {
          .pub-grid { grid-template-columns: 1fr !important; }
          .pub-match-grid { grid-template-columns: 1fr !important; text-align: center; }
        }
      `}</style>
    </div>
  );
}

/* ── Helpers ── */
function InfoCard({ title, emoji, children }: { title: string; emoji: string; children: React.ReactNode }) {
  return (
    <div style={{ background: '#131929', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, overflow: 'hidden' }}>
      <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', gap: 8, background: '#1a2235' }}>
        <span>{emoji}</span>
        <span style={{ fontSize: 14, fontWeight: 700, color: '#e2e8f0' }}>{title}</span>
      </div>
      <div style={{ padding: '14px 16px' }}>{children}</div>
    </div>
  );
}

function SideRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ fontSize: 13, color: '#64748b' }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0' }}>{value}</span>
    </div>
  );
}

function Empty({ emoji, text }: { emoji: string; text: string }) {
  return (
    <div style={{ textAlign: 'center', padding: '48px 24px' }}>
      <div style={{ fontSize: 48, marginBottom: 14 }}>{emoji}</div>
      <div style={{ fontSize: 15, color: '#64748b' }}>{text}</div>
    </div>
  );
}

function TeamLogoImg({ logo, name, size = 32 }: { logo?: string | null; name: string; size?: number }) {
  if (logo) return <img src={logo} alt={name} style={{ width: size, height: size, borderRadius: Math.round(size * 0.27), objectFit: 'cover', flexShrink: 0 }} onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />;
  return <div style={{ width: size, height: size, borderRadius: Math.round(size * 0.27), flexShrink: 0, background: 'linear-gradient(135deg,#1e3a5f,#1d4ed8)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: Math.round(size * 0.38) }}>{name?.charAt(0) || '?'}</div>;
}
