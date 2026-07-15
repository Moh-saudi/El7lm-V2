'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { createPortalClient } from '@/lib/tournament-portal/auth';
import { usePortalTheme } from '../../_components/PortalShell';
import { TeamLogo } from '../../_components/TeamLogo';
import { resolveImg } from '../../_utils/img';
import { useTranslation } from '@/lib/i18n';

const STATUS_STEPS = ['draft','open','closed','ongoing','completed'];
const STATUS_DOT:   Record<string,string> = { draft:'#64748b', open:'#16a34a', closed:'#ef4444', ongoing:'#3b82f6', completed:'#8b5cf6' };

const QUICK_LINKS = [
  { href:'registrations', icon:'👥', color:'#3b82f6' },
  { href:'schedule',      icon:'📅', color:'#d97706' },
  { href:'matches',       icon:'⚽', color:'#ef4444' },
  { href:'groups',        icon:'📊', color:'#16a34a' },
  { href:'stats',         icon:'🏆', color:'#8b5cf6' },
  { href:'notifications', icon:'🔔', color:'#f59e0b' },
];

export default function TournamentOverviewPage() {
  const { locale, getTranslations } = useTranslation();
  const copy = getTranslations<any>('tournamentPortalOverview');
  const portalCopy = getTranslations<any>('tournamentPortal');
  const { id }  = useParams<{ id: string }>();
  const { isDark } = usePortalTheme();
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    (async () => {
      const s = createPortalClient();
      const [tR, teamsR, matchesR, catsR] = await Promise.all([
        s.from('tournament_new').select('*').eq('id', id).single(),
        s.from('tournament_teams').select('id,status,name,logo_url').eq('tournament_id', id),
        s.from('tournament_matches').select('id,status,match_date,home_score,away_score,home_team_id,away_team_id').eq('tournament_id', id),
        s.from('tournament_categories').select('id,name').eq('tournament_id', id).order('sort_order'),
      ]);
      setData({ t: tR.data, teams: teamsR.data || [], matches: matchesR.data || [], cats: catsR.data || [] });
    })();
  }, [id]);

  const S = isDark ? D : L;

  if (!data) return (
    <div style={{ display:'flex', justifyContent:'center', alignItems:'center', minHeight:300 }}>
      <div style={{ width:36, height:36, borderRadius:'50%', border:`3px solid ${S.border}`, borderTopColor:'#d97706', animation:'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  const { t, teams, matches, cats } = data;
  const approved  = teams.filter((x: any) => x.status === 'approved');
  const pending   = teams.filter((x: any) => x.status === 'pending');
  const completed = matches.filter((x: any) => x.status === 'completed');
  const totalGoals = completed.reduce((s: number, m: any) => s + (m.home_score ?? 0) + (m.away_score ?? 0), 0);
  const upcoming = matches
    .filter((x: any) => x.status === 'scheduled' && x.match_date && new Date(x.match_date) > new Date())
    .sort((a: any, b: any) => new Date(a.match_date).getTime() - new Date(b.match_date).getTime());
  const lastResults = [...completed].slice(-5).reverse();
  const statusIdx   = STATUS_STEPS.indexOf(t?.status);
  const progress    = Math.max(10, Math.round(((statusIdx + 1) / STATUS_STEPS.length) * 100));

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>

      {/* ── HERO ── */}
      <div style={{
        background: 'linear-gradient(135deg, #0a1628 0%, #0f2d6b 40%, #0a1628 100%)',
        borderRadius: 20, padding: '26px 28px', position:'relative', overflow:'hidden',
        border:'1px solid rgba(255,255,255,0.07)',
      }}>
        {/* Subtle grid */}
        <div style={{ position:'absolute', inset:0, backgroundImage:'radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px)', backgroundSize:'28px 28px', pointerEvents:'none' }} />

        <div style={{ position:'relative', display:'flex', alignItems:'flex-start', gap:20, flexWrap:'wrap' }}>
          {/* Logo */}
          <div style={{ width:68, height:68, borderRadius:16, border:'2px solid rgba(255,255,255,0.15)', overflow:'hidden', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(255,255,255,0.06)' }}>
            {t?.logo_url
              ? <img src={t.logo_url} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
              : <span style={{ fontSize:28 }}>🏆</span>}
          </div>

          <div style={{ flex:1, minWidth:200 }}>
            {/* Name + status */}
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:6, flexWrap:'wrap' }}>
              <span style={{ fontSize:22, fontWeight:900, color:'#fff' }}>{t?.name}</span>
              <span style={{ display:'inline-flex', alignItems:'center', gap:5, background:`${STATUS_DOT[t?.status] || '#64748b'}22`, border:`1px solid ${STATUS_DOT[t?.status] || '#64748b'}44`, borderRadius:12, padding:'3px 10px', fontSize:12, fontWeight:700, color:STATUS_DOT[t?.status] || '#94a3b8' }}>
                <span style={{ width:6, height:6, borderRadius:'50%', background:STATUS_DOT[t?.status] || '#64748b', display:'inline-block' }} />
                {portalCopy.dashboard.statuses[t?.status] || t?.status}
              </span>
            </div>

            {/* Meta */}
            <div style={{ display:'flex', gap:18, flexWrap:'wrap', marginBottom:16 }}>
              {t?.type   && <span style={{ fontSize:12, color:'rgba(255,255,255,0.5)' }}>🏆 {portalCopy.dashboard.types[t.type] || t.type}</span>}
              {t?.city   && <span style={{ fontSize:12, color:'rgba(255,255,255,0.5)' }}>📍 {t.city}{t.country ? `, ${t.country}`:''}</span>}
              {t?.start_date && <span style={{ fontSize:12, color:'rgba(255,255,255,0.5)' }}>📅 {new Date(t.start_date).toLocaleDateString(locale,{dateStyle:'medium'})}</span>}
            </div>

            {/* Progress */}
            {t?.status !== 'cancelled' && (
              <>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
                  {STATUS_STEPS.map((s, i) => (
                    <span key={s} style={{ fontSize:10, fontWeight: i === statusIdx ? 700 : 400, color: i <= statusIdx ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.25)' }}>{portalCopy.dashboard.statuses[s]}</span>
                  ))}
                </div>
                <div style={{ height:4, background:'rgba(255,255,255,0.1)', borderRadius:2 }}>
                  <div style={{ height:'100%', width:`${progress}%`, borderRadius:2, background:'linear-gradient(90deg,#d97706,#fbbf24)', transition:'width 0.6s ease' }} />
                </div>
              </>
            )}
          </div>

          {/* Settings link */}
          <Link href={`/tournament-portal/${id}/setup`} style={{ textDecoration:'none' }}>
            <button style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 16px', background:'rgba(255,255,255,0.1)', border:'1px solid rgba(255,255,255,0.18)', borderRadius:10, color:'rgba(255,255,255,0.8)', fontSize:12, fontWeight:600, cursor:'pointer' }}>
              ⚙️ {copy.settings}
            </button>
          </Link>
        </div>
      </div>

      {/* ── KPIs ── */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:10 }} className="sp-grid-4col">
        {[
          { icon:'👥', v:approved.length,  lbl:copy.acceptedTeam, sub: t?.max_teams ? `${copy.of} ${t.max_teams}` : '', color:'#3b82f6', bg:'rgba(37,99,235,0.12)' },
          { icon:'⏳', v:pending.length, lbl:copy.pendingRequest, sub: pending.length > 0 ? copy.awaiting : copy.allAccepted, color:'#f59e0b', bg:'rgba(245,158,11,0.12)' },
          { icon:'✅', v:completed.length, lbl:copy.finishedMatch, sub:`${copy.of} ${matches.length} ${copy.total}`, color:'#16a34a', bg:'rgba(22,163,74,0.12)' },
          { icon:'⚽', v:totalGoals, lbl:copy.goal, sub: completed.length > 0 ? `${copy.average} ${(totalGoals/completed.length).toFixed(1)}`:'', color:'#8b5cf6', bg:'rgba(139,92,246,0.12)' },
        ].map(s => (
          <div key={s.lbl} className="sp-kpi" style={{ background:S.surface, borderColor:S.border }}>
            <div className="sp-kpi-icon" style={{ background:s.bg, fontSize:20 }}>{s.icon}</div>
            <div className="sp-kpi-value" style={{ color:s.color }}>{s.v}</div>
            <div className="sp-kpi-label" style={{ color:S.text2 }}>{s.lbl}</div>
            {s.sub && <div className="sp-kpi-sub" style={{ color:S.text3 }}>{s.sub}</div>}
          </div>
        ))}
      </div>

      {/* ── Main + Sidebar ── */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 320px', gap:14, alignItems:'start' }} className="sp-grid-single">

        {/* MAIN */}
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>

          {/* Pending alert */}
          {pending.length > 0 && (
            <div style={{ background: isDark?'rgba(245,158,11,0.07)':'#fffbeb', border:`1px solid ${isDark?'rgba(245,158,11,0.2)':'#fcd34d'}`, borderRadius:14, padding:'14px 18px', display:'flex', alignItems:'center', gap:14 }}>
              <div style={{ width:40, height:40, borderRadius:11, background:'#f59e0b', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, flexShrink:0 }}>⏳</div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:14, fontWeight:700, color: isDark?'#fbbf24':'#92400e' }}>{copy.pendingTitle.replace('{count}', pending.length)}</div>
                <div style={{ fontSize:12, color: isDark?'#d97706':'#b45309', marginTop:2 }}>{copy.pendingHelp}</div>
              </div>
              <Link href={`/tournament-portal/${id}/registrations`} style={{ textDecoration:'none' }}>
                <button style={{ padding:'8px 16px', background:'#f59e0b', border:'none', borderRadius:10, color:'#fff', fontSize:12, fontWeight:700, cursor:'pointer' }}>{copy.review}</button>
              </Link>
            </div>
          )}

          {/* Upcoming matches */}
          {upcoming.length > 0 && (
            <div className="sp-card" style={{ background:S.surface, borderColor:S.border }}>
              <div style={{ padding:'12px 18px', borderBottom:`1px solid ${S.border}`, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                <span style={{ fontSize:14, fontWeight:700, color:S.text }}>📅 {copy.upcoming}</span>
                <Link href={`/tournament-portal/${id}/schedule`} style={{ fontSize:12, color:'#d97706', textDecoration:'none', fontWeight:600 }}>{copy.viewAll}</Link>
              </div>
              {upcoming.slice(0,5).map((m: any) => (
                <MiniMatch key={m.id} match={m} teams={teams} S={S} isDark={isDark} />
              ))}
            </div>
          )}

          {/* Last results */}
          {lastResults.length > 0 && (
            <div className="sp-card" style={{ background:S.surface, borderColor:S.border }}>
              <div style={{ padding:'12px 18px', borderBottom:`1px solid ${S.border}`, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                <span style={{ fontSize:14, fontWeight:700, color:S.text }}>🏁 {copy.latestResults}</span>
                <Link href={`/tournament-portal/${id}/matches`} style={{ fontSize:12, color:'#d97706', textDecoration:'none', fontWeight:600 }}>{copy.viewAll}</Link>
              </div>
              {lastResults.map((m: any) => (
                <MiniMatch key={m.id} match={m} teams={teams} S={S} isDark={isDark} showScore />
              ))}
            </div>
          )}

          {/* Empty state */}
          {upcoming.length === 0 && lastResults.length === 0 && (
            <div style={{ background:S.surface, border:`2px dashed ${S.border}`, borderRadius:16, padding:'48px 24px', textAlign:'center' }}>
              <div style={{ fontSize:40, marginBottom:12 }}>🏟️</div>
              <div style={{ fontSize:15, fontWeight:700, color:S.text, marginBottom:6 }}>{copy.emptyTitle}</div>
              <div style={{ fontSize:13, color:S.text2, marginBottom:20 }}>{copy.emptyHelp}</div>
              <Link href={`/tournament-portal/${id}/schedule`} style={{ textDecoration:'none' }}>
                <button className="sp-btn sp-btn-primary">📅 {copy.goSchedule}</button>
              </Link>
            </div>
          )}
        </div>

        {/* SIDEBAR */}
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>

          {/* Quick nav */}
          <div className="sp-card" style={{ background:S.surface, borderColor:S.border }}>
            <div style={{ padding:'11px 16px', borderBottom:`1px solid ${S.border}`, fontSize:12, fontWeight:700, color:S.text2 }}>{copy.quickNav}</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr' }}>
              {QUICK_LINKS.map((nav, i) => (
                <Link key={nav.href} href={`/tournament-portal/${id}/${nav.href}`} style={{ textDecoration:'none' }}>
                  <div style={{
                    padding:'14px 14px', display:'flex', alignItems:'center', gap:9, cursor:'pointer',
                    borderBottom: i < 4 ? `1px solid ${S.border}` : 'none',
                    borderLeft: i%2===0 ? `1px solid ${S.border}` : 'none',
                    transition:'background 0.15s',
                  }}>
                    <div style={{ width:30, height:30, borderRadius:8, background:`${nav.color}18`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:14 }}>{nav.icon}</div>
                    <span style={{ fontSize:12, fontWeight:600, color:S.text }}>{copy.quickLinks[i]}</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Tournament info */}
          <div className="sp-card" style={{ background:S.surface, borderColor:S.border }}>
            <div style={{ padding:'11px 16px', borderBottom:`1px solid ${S.border}`, fontSize:12, fontWeight:700, color:S.text2 }}>{copy.info}</div>
            <div style={{ padding:'4px 0' }}>
              {[
                { lbl:copy.categories, val: cats.map((c: any) => c.name).join(' · ') || '—' },
                { lbl:copy.maximum, val: t?.max_teams ? `${t.max_teams} ${copy.team}` : '—' },
                { lbl:copy.start, val: t?.start_date ? new Date(t.start_date).toLocaleDateString(locale,{dateStyle:'medium'}) : '—' },
                { lbl:copy.end, val: t?.end_date ? new Date(t.end_date).toLocaleDateString(locale,{dateStyle:'medium'}) : '—' },
              ].map(row => (
                <div key={row.lbl} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 16px', borderBottom:`1px solid ${S.border}` }}>
                  <span style={{ fontSize:12, color:S.text2 }}>{row.lbl}</span>
                  <span style={{ fontSize:12, fontWeight:600, color:S.text }}>{row.val}</span>
                </div>
              ))}
            </div>
          </div>

          {/* QR + Public link */}
          {t?.slug && (
            <div className="sp-card" style={{ background:S.surface, borderColor:S.border }}>
              <div style={{ padding:'11px 16px', borderBottom:`1px solid ${S.border}`, fontSize:12, fontWeight:700, color:S.text2 }}>🔗 {copy.publicPage}</div>
              <div style={{ padding:'16px', display:'flex', flexDirection:'column', alignItems:'center', gap:12 }}>
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(`${typeof window !== 'undefined' ? window.location.origin : ''}/tournaments/${t.slug}`)}&color=d97706&bgcolor=${isDark ? '131929' : 'ffffff'}`}
                  alt="QR Code"
                  style={{ width:120, height:120, borderRadius:10, border:`1px solid ${S.border}` }}
                />
                <div style={{ fontSize:11, color:S.text2, textAlign:'center', wordBreak:'break-all' }}>
                  /tournaments/{t.slug}
                </div>
                <div style={{ display:'flex', gap:8, width:'100%' }}>
                  <a href={`/tournaments/${t.slug}`} target="_blank" rel="noopener noreferrer" style={{ flex:1, textAlign:'center', padding:'8px', background:'rgba(217,119,6,0.1)', border:'1px solid rgba(217,119,6,0.3)', borderRadius:8, fontSize:11, fontWeight:700, color:'#d97706', textDecoration:'none' }}>
                    🌐 {copy.open}
                  </a>
                  <button onClick={() => { navigator.clipboard?.writeText(`${window.location.origin}/tournaments/${t.slug}`); }} style={{ flex:1, padding:'8px', background:S.surface, border:`1px solid ${S.border}`, borderRadius:8, fontSize:11, fontWeight:700, color:S.text2, cursor:'pointer' }}>
                    📋 {copy.copy}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MiniMatch({ match, teams, S, isDark, showScore = false }: any) {
  const { locale, getTranslations } = useTranslation();
  const copy = getTranslations<any>('tournamentPortalOverview');
  const home = teams.find((t: any) => t.id === match.home_team_id);
  const away = teams.find((t: any) => t.id === match.away_team_id);
  const Logo = ({ t }: { t: any }) => <TeamLogo name={t?.name || '?'} logo={t?.logo_url} size={26} />;

  return (
    <div style={{ display:'grid', gridTemplateColumns:'1fr 80px 1fr', alignItems:'center', padding:'10px 18px', borderBottom:`1px solid ${S.border}`, gap:8 }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'flex-end', gap:8 }}>
        <span style={{ fontSize:13, fontWeight:600, color:S.text }}>{home?.name || '—'}</span>
        <Logo t={home} />
      </div>
      <div style={{ textAlign:'center' }}>
        {showScore
          ? <div style={{ background:isDark?'#0d1117':'#1e293b', borderRadius:8, padding:'3px 10px', display:'inline-block' }}>
              <span style={{ color:'#fff', fontFamily:'monospace', fontWeight:900, fontSize:14 }}>
                {match.home_score??0} - {match.away_score??0}
              </span>
            </div>
          : match.match_date
            ? <div>
                <div style={{ fontSize:14, fontWeight:800, color:S.text }}>{new Date(match.match_date).toLocaleTimeString(locale,{hour:'2-digit',minute:'2-digit'})}</div>
                <div style={{ fontSize:10, color:S.text2 }}>{new Date(match.match_date).toLocaleDateString(locale,{month:'short',day:'numeric'})}</div>
              </div>
            : <span style={{ fontSize:12, fontWeight:700, color:S.text2 }}>{copy.versus}</span>
        }
      </div>
      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
        <Logo t={away} />
        <span style={{ fontSize:13, fontWeight:600, color:S.text }}>{away?.name || '—'}</span>
      </div>
    </div>
  );
}

// ── Color tokens ──────────────────────────────────────────────
const D = { surface:'#131929', surface2:'#1a2235', border:'rgba(255,255,255,0.07)', border2:'rgba(255,255,255,0.04)', text:'#e8eaf0', text2:'#64748b', text3:'#3a4a5c' };
const L = { surface:'#ffffff', surface2:'#f8fafc', border:'#e2e8f0', border2:'#f0f0f0', text:'#0f172a', text2:'#64748b', text3:'#cbd5e1' };
