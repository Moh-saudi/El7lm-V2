'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { createPortalClient } from '@/lib/tournament-portal/auth';
import { usePortalTheme } from '../../_components/PortalShell';
import { TeamLogo as LogoImg } from '../../_components/TeamLogo';
import { useTranslation } from '@/lib/i18n';

type Match  = { id:string; home_score:number|null; away_score:number|null; status:string; category_id:string; round:string|null; home_team:{ name:string; logo_url:string|null }|null; away_team:{ name:string; logo_url:string|null }|null };
type Event  = { event_type:string; minute:number|null; team_id:string; match_id:string; match?:{ category_id:string }|null };
type Cat    = { id:string; name:string };
type Scorer = { player_name:string; goals:number; assists:number; team:{ name:string; logo_url:string|null }|null };

export default function AnalyticsPage() {
  const { getTranslations } = useTranslation();
  const copy = getTranslations<any>('tournamentAnalytics');
  const { id }     = useParams<{ id: string }>();
  const { isDark } = usePortalTheme();
  const S = isDark ? D : L;
  const supabase   = createPortalClient();

  const [cats,    setCats]    = useState<Cat[]>([]);
  const [selCat,  setSelCat]  = useState('');
  const [matches, setMatches] = useState<Match[]>([]);
  const [events,  setEvents]  = useState<Event[]>([]);
  const [scorers, setScorers] = useState<Scorer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('tournament_categories').select('id,name').eq('tournament_id', id).order('sort_order');
      setCats(data || []);
      if (data?.length) setSelCat(data[0].id);
      setLoading(false);
    })();
  }, [id]);

  const load = useCallback(async () => {
    if (!selCat) return;
    const [mRes, eRes, sRes] = await Promise.all([
      supabase.from('tournament_matches').select('id,home_score,away_score,status,category_id,round,home_team:tournament_teams!home_team_id(name,logo_url),away_team:tournament_teams!away_team_id(name,logo_url)').eq('tournament_id', id).eq('category_id', selCat).not('home_score', 'is', null),
      supabase.from('tournament_match_events').select('event_type,minute,team_id,match_id,match:tournament_matches!match_id(category_id)').eq('tournament_id', id),
      supabase.from('tournament_top_scorers').select('player_name,goals,assists,team:tournament_teams(name,logo_url)').eq('tournament_id', id).eq('category_id', selCat).order('goals', { ascending: false }).limit(10),
    ]);
    setMatches((mRes.data as any) || []);
    setEvents((eRes.data as any) || []);
    setScorers((sRes.data as any) || []);
  }, [selCat, id]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <Loader isDark={isDark} />;

  const played    = matches.filter(m => m.status === 'completed' || (m.home_score !== null && m.away_score !== null));
  const totalGoals = played.reduce((s, m) => s + (m.home_score || 0) + (m.away_score || 0), 0);
  const avgGoals   = played.length ? (totalGoals / played.length).toFixed(2) : '—';
  const wins       = played.filter(m => (m.home_score||0) !== (m.away_score||0)).length;
  const draws      = played.filter(m => (m.home_score||0) === (m.away_score||0)).length;
  const winPct     = played.length ? Math.round((wins / played.length) * 100) : 0;
  const drawPct    = played.length ? Math.round((draws / played.length) * 100) : 0;

  const goalEvents = events.filter(e => ['goal','penalty_scored'].includes(e.event_type) && e.minute !== null && e.match?.category_id === selCat);
  const periods    = [
    { label: '1–15',  from: 1,  to: 15  },
    { label: '16–30', from: 16, to: 30  },
    { label: '31–45', from: 31, to: 45  },
    { label: '46–60', from: 46, to: 60  },
    { label: '61–75', from: 61, to: 75  },
    { label: '76–90', from: 76, to: 120 },
  ].map(p => ({ ...p, count: goalEvents.filter(e => (e.minute||0) >= p.from && (e.minute||0) <= p.to).length }));
  const maxPeriod = Math.max(...periods.map(p => p.count), 1);

  const teamGoals: Record<string, { name:string; logo:string|null; for:number; against:number; played:number }> = {};
  played.forEach(m => {
    const hId = (m as any).home_team_id || 'h';
    const aId = (m as any).away_team_id || 'a';
    const hKey = m.home_team?.name || hId;
    const aKey = m.away_team?.name || aId;
    if (!teamGoals[hKey]) teamGoals[hKey] = { name: m.home_team?.name || '?', logo: m.home_team?.logo_url || null, for: 0, against: 0, played: 0 };
    if (!teamGoals[aKey]) teamGoals[aKey] = { name: m.away_team?.name || '?', logo: m.away_team?.logo_url || null, for: 0, against: 0, played: 0 };
    teamGoals[hKey].for      += (m.home_score || 0);
    teamGoals[hKey].against  += (m.away_score || 0);
    teamGoals[hKey].played   += 1;
    teamGoals[aKey].for      += (m.away_score || 0);
    teamGoals[aKey].against  += (m.home_score || 0);
    teamGoals[aKey].played   += 1;
  });
  const teamArr = Object.values(teamGoals).sort((a, b) => b.for - a.for);
  const maxFor  = Math.max(...teamArr.map(t => t.for), 1);

  const matchScores: Record<string, number> = {};
  played.forEach(m => {
    const k = `${m.home_score}-${m.away_score}`;
    matchScores[k] = (matchScores[k] || 0) + 1;
  });
  const topScores = Object.entries(matchScores).sort((a, b) => b[1] - a[1]).slice(0, 6);

  const ROUND_ORDER: Record<string, number> = { group_stage:1, round_of_16:2, quarter_final:3, semi_final:4, third_place:5, final:6, QF:3, SF:4, F:6, '3rd':5 };
  const roundGoals: Record<string, number> = {};
  played.forEach(m => {
    const r = m.round || 'group_stage';
    roundGoals[r] = (roundGoals[r] || 0) + (m.home_score || 0) + (m.away_score || 0);
  });
  const rounds    = Object.entries(roundGoals).sort((a, b) => (ROUND_ORDER[a[0]] || 99) - (ROUND_ORDER[b[0]] || 99));
  const maxRound  = Math.max(...rounds.map(r => r[1]), 1);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

      {/* Category bar */}
      <div style={{ background: S.surface, border: `1px solid ${S.border}`, borderRadius: 14, padding: '12px 16px', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {cats.map(c => (
          <button key={c.id} onClick={() => setSelCat(c.id)} className={`sp-cat-tab${selCat === c.id ? ' active' : ''}`}>{c.name}</button>
        ))}
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10 }} className="sp-grid-4col">
        {[
          { icon: '⚽', v: totalGoals, lbl: copy.totalGoals, color: '#16a34a' },
          { icon: '📊', v: avgGoals, lbl: copy.avgGoals, color: '#3b82f6' },
          { icon: '✅', v: `${winPct}%`, lbl: copy.decided, color: '#f59e0b' },
          { icon: '🤝', v: `${drawPct}%`, lbl: copy.draws, color: '#8b5cf6' },
        ].map(kpi => (
          <div key={kpi.lbl} className="sp-kpi" style={{ background: S.surface, borderColor: S.border }}>
            <div style={{ fontSize: 24, marginBottom: 8 }}>{kpi.icon}</div>
            <div style={{ fontSize: 26, fontWeight: 900, color: kpi.color, lineHeight: 1 }}>{kpi.v}</div>
            <div className="sp-kpi-label" style={{ color: S.text2 }}>{kpi.lbl}</div>
          </div>
        ))}
      </div>

      {/* Row: goal timing + result distribution */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }} className="sp-grid-2col">

        {/* Goal timing */}
        <div style={{ background: S.surface, border: `1px solid ${S.border}`, borderRadius: 14, padding: '16px 18px' }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: S.text, marginBottom: 16 }}>⏱️ {copy.goalTiming}</div>
          {goalEvents.length === 0
            ? <Empty S={S} text={copy.noEvents} />
            : <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {periods.map(p => (
                  <div key={p.label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 44, fontSize: 11, color: S.text2, textAlign: 'right', flexShrink: 0 }}>{p.label}'</div>
                    <div style={{ flex: 1, height: 22, background: S.surface2, borderRadius: 4, overflow: 'hidden', position: 'relative' }}>
                      <div style={{ height: '100%', width: `${Math.round((p.count / maxPeriod) * 100)}%`, background: 'linear-gradient(90deg,#d97706,#f59e0b)', borderRadius: 4, transition: 'width 0.6s', minWidth: p.count > 0 ? 4 : 0 }} />
                    </div>
                    <div style={{ width: 24, fontSize: 13, fontWeight: 700, color: S.text, flexShrink: 0 }}>{p.count}</div>
                  </div>
                ))}
              </div>
          }
        </div>

        {/* Result distribution */}
        <div style={{ background: S.surface, border: `1px solid ${S.border}`, borderRadius: 14, padding: '16px 18px' }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: S.text, marginBottom: 16 }}>🎯 {copy.commonScores}</div>
          {topScores.length === 0
            ? <Empty S={S} text={copy.noResults} />
            : <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {topScores.map(([score, count]) => (
                  <div key={score} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 48, textAlign: 'center', fontSize: 13, fontWeight: 900, color: S.text, background: S.surface2, borderRadius: 6, padding: '4px 0', flexShrink: 0 }}>{score}</div>
                    <div style={{ flex: 1, height: 22, background: S.surface2, borderRadius: 4, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${Math.round((count / (topScores[0]?.[1] || 1)) * 100)}%`, background: 'linear-gradient(90deg,#3b82f6,#60a5fa)', borderRadius: 4, transition: 'width 0.6s' }} />
                    </div>
                    <div style={{ width: 32, textAlign: 'right', fontSize: 13, fontWeight: 700, color: S.text2, flexShrink: 0 }}>{count}×</div>
                  </div>
                ))}
              </div>
          }
        </div>
      </div>

      {/* Goals per round chart */}
      {rounds.length > 0 && (
        <div style={{ background: S.surface, border: `1px solid ${S.border}`, borderRadius: 14, padding: '16px 18px' }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: S.text, marginBottom: 16 }}>📈 {copy.goalsByRound}</div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 90, overflowX: 'auto' }}>
            {rounds.map(([rnd, goals]) => (
              <div key={rnd} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#d97706' }}>{goals}</div>
                <div style={{ width: 36, height: Math.max(6, Math.round((goals / maxRound) * 70)), background: 'linear-gradient(180deg,#d97706,#f59e0b)', borderRadius: '4px 4px 0 0', transition: 'height 0.5s' }} />
                <div style={{ fontSize: 10, color: S.text2, whiteSpace: 'nowrap', maxWidth: 52, overflow: 'hidden', textOverflow: 'ellipsis', textAlign: 'center' }}>{copy.rounds[rnd] || rnd}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Team goals chart */}
      <div style={{ background: S.surface, border: `1px solid ${S.border}`, borderRadius: 14, padding: '16px 18px' }}>
        <div style={{ fontSize: 14, fontWeight: 800, color: S.text, marginBottom: 16 }}>🏹 {copy.teamGoals}</div>
        {teamArr.length === 0
          ? <Empty S={S} text={copy.noFinished} />
          : <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {teamArr.slice(0, 10).map(t => (
                <div key={t.name} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <LogoImg name={t.name} logo={t.logo} size={24} />
                  <div style={{ width: 110, fontSize: 12, fontWeight: 600, color: S.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flexShrink: 0 }}>{t.name}</div>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 3 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <div style={{ width: 48, fontSize: 9, color: '#4ade80', textAlign: 'right', flexShrink: 0 }}>{copy.scored}</div>
                      <div style={{ flex: 1, height: 8, background: S.surface2, borderRadius: 2 }}>
                        <div style={{ height: '100%', width: `${Math.round((t.for / maxFor) * 100)}%`, background: '#16a34a', borderRadius: 2 }} />
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#4ade80', width: 20 }}>{t.for}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <div style={{ width: 48, fontSize: 9, color: '#f87171', textAlign: 'right', flexShrink: 0 }}>{copy.conceded}</div>
                      <div style={{ flex: 1, height: 8, background: S.surface2, borderRadius: 2 }}>
                        <div style={{ height: '100%', width: `${Math.round((t.against / maxFor) * 100)}%`, background: '#dc2626', borderRadius: 2 }} />
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#f87171', width: 20 }}>{t.against}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
        }
      </div>

      {/* Win/Draw/Loss bar */}
      <div style={{ background: S.surface, border: `1px solid ${S.border}`, borderRadius: 14, padding: '16px 18px' }}>
        <div style={{ fontSize: 14, fontWeight: 800, color: S.text, marginBottom: 16 }}>🏁 {copy.distribution} ({played.length} {copy.match})</div>
        {played.length === 0
          ? <Empty S={S} text={copy.noFinished} />
          : <>
              <div style={{ display: 'flex', height: 28, borderRadius: 8, overflow: 'hidden', marginBottom: 12, gap: 2 }}>
                <div title={`${copy.decided} ${wins}`} style={{ flex: wins, background: '#16a34a', minWidth: wins > 0 ? 4 : 0 }} />
                <div title={`${copy.draws} ${draws}`}  style={{ flex: draws, background: '#f59e0b', minWidth: draws > 0 ? 4 : 0 }} />
              </div>
              <div style={{ display: 'flex', gap: 20 }}>
                {[
                  { lbl: copy.decided, v: wins, pct: winPct, color: '#16a34a' },
                  { lbl: copy.draws, v: draws, pct: drawPct, color: '#f59e0b' },
                ].map(item => (
                  <div key={item.lbl} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 10, height: 10, borderRadius: 2, background: item.color, flexShrink: 0 }} />
                    <span style={{ fontSize: 12, color: S.text2 }}>{item.lbl}:</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: S.text }}>{item.v} ({item.pct}%)</span>
                  </div>
                ))}
              </div>
            </>
        }
      </div>

      {/* Top scorers mini */}
      {scorers.length > 0 && (
        <div style={{ background: S.surface, border: `1px solid ${S.border}`, borderRadius: 14, padding: '16px 18px' }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: S.text, marginBottom: 14 }}>⚽ {copy.topScorers}</div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {scorers.slice(0, 8).map((s, i) => (
              <div key={i} style={{ background: S.surface2, border: `1px solid ${S.border}`, borderRadius: 10, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10, minWidth: 160 }}>
                <span style={{ fontSize: 18 }}>{['🥇','🥈','🥉'][i] || `${i+1}.`}</span>
                <LogoImg name={s.team?.name || '?'} logo={s.team?.logo_url || null} size={26} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: S.text }}>{s.player_name}</div>
                  <div style={{ fontSize: 11, color: S.text2 }}>{s.team?.name} · <span style={{ color: '#4ade80', fontWeight: 700 }}>{s.goals} {copy.goals}</span></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Empty({ S, text }: { S: any; text: string }) {
  return <div style={{ padding: '30px 20px', textAlign: 'center', color: S.text2, fontSize: 13 }}>{text}</div>;
}

function Loader({ isDark }: { isDark: boolean }) {
  return <div style={{ display:'flex',justifyContent:'center',padding:60 }}><div style={{ width:36,height:36,borderRadius:'50%',border:`3px solid ${isDark?'rgba(255,255,255,0.1)':'#e2e8f0'}`,borderTopColor:'#d97706',animation:'spin 0.7s linear infinite' }} /><style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style></div>;
}

const D = { surface: '#131929', surface2: '#1a2235', border: 'rgba(255,255,255,0.07)', text: '#e8eaf0', text2: '#64748b' };
const L = { surface: '#ffffff', surface2: '#f8fafc', border: '#e2e8f0', text: '#0f172a', text2: '#64748b' };
