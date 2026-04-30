'use client';

import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { resolveImg } from '../../_utils/img';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

/**
 * بوابة الفريق — صفحة عامة يرى فيها مسؤول الفريق:
 * - جدول مبارياته
 * - نتائجه
 * - قائمة لاعبيه
 * - ترتيبه في المجموعة
 *
 * الوصول: /tournament-portal/[id]/team-view?team=TEAM_ID
 */

const STATUS_LBL: Record<string,string> = {
  scheduled:'مجدولة', completed:'منتهية', live:'🔴 مباشر', postponed:'مؤجلة',
};

const ROUND_LBL: Record<string,string> = {
  league:'الدوري', group_stage:'دور المجموعات',
  QF:'ربع النهائي', SF:'نصف النهائي', F:'النهائي', '3rd':'المركز الثالث',
};

export default function TeamViewPage() {
  const { id }   = useParams<{ id: string }>();
  const params   = useSearchParams();
  const teamId   = params.get('team');

  const [tournament, setTournament] = useState<any>(null);
  const [team,       setTeam]       = useState<any>(null);
  const [matches,    setMatches]    = useState<any[]>([]);
  const [players,    setPlayers]    = useState<any[]>([]);
  const [standing,   setStanding]   = useState<any>(null);
  const [groupMates, setGroupMates] = useState<any[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [tab,        setTab]        = useState<'matches'|'players'|'standings'>('matches');

  useEffect(() => {
    if (!teamId) { setLoading(false); return; }
    (async () => {
      const [tRes, teamRes] = await Promise.all([
        supabase.from('tournament_new').select('name,logo_url,city,type,status').eq('id', id).single(),
        supabase.from('tournament_teams').select('*').eq('id', teamId).single(),
      ]);
      setTournament(tRes.data);
      setTeam(teamRes.data);

      // Matches involving this team
      const { data: ms } = await supabase
        .from('tournament_matches')
        .select('*,home_team:tournament_teams!home_team_id(name,logo_url),away_team:tournament_teams!away_team_id(name,logo_url)')
        .eq('tournament_id', id)
        .or(`home_team_id.eq.${teamId},away_team_id.eq.${teamId}`)
        .order('match_number', { ascending: true });
      setMatches(ms || []);

      // Players
      const { data: pl } = await supabase
        .from('tournament_players')
        .select('*')
        .eq('team_id', teamId)
        .order('jersey_number', { ascending: true });
      setPlayers(pl || []);

      // Standing
      const { data: st } = await supabase
        .from('tournament_standings')
        .select('*,group:tournament_groups(name)')
        .eq('team_id', teamId)
        .eq('tournament_id', id)
        .single();
      setStanding(st);

      // Group mates
      if (teamRes.data?.group_id) {
        const { data: gm } = await supabase
          .from('tournament_standings')
          .select('*,team:tournament_teams(name,logo_url)')
          .eq('tournament_id', id)
          .eq('group_id', teamRes.data.group_id)
          .order('points', { ascending: false })
          .order('goal_diff', { ascending: false });
        setGroupMates(gm || []);
      }

      setLoading(false);
    })();
  }, [id, teamId]);

  if (loading) return (
    <div style={{ display:'flex', justifyContent:'center', alignItems:'center', minHeight:300 }}>
      <div style={{ width:36, height:36, borderRadius:'50%', border:'3px solid rgba(255,255,255,0.1)', borderTopColor:'#d97706', animation:'spin 0.7s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (!teamId || !team) return (
    <div style={{ textAlign:'center', padding:60 }}>
      <div style={{ fontSize:40, marginBottom:12 }}>⚠️</div>
      <div style={{ fontSize:16, color:'#64748b' }}>معرّف الفريق غير صحيح. تأكد من الرابط.</div>
    </div>
  );

  const won  = matches.filter(m => m.status === 'completed' && ((m.home_team_id === teamId && m.home_score > m.away_score) || (m.away_team_id === teamId && m.away_score > m.home_score))).length;
  const drew = matches.filter(m => m.status === 'completed' && m.home_score === m.away_score).length;
  const lost = matches.filter(m => m.status === 'completed').length - won - drew;
  const goalsF = matches.reduce((s,m) => s + (m.status==='completed'?(m.home_team_id===teamId?(m.home_score??0):(m.away_score??0)):0), 0);
  const goalsA = matches.reduce((s,m) => s + (m.status==='completed'?(m.home_team_id===teamId?(m.away_score??0):(m.home_score??0)):0), 0);

  const TABS = [
    { key:'matches',   emoji:'⚽', label:'المباريات'  },
    { key:'players',   emoji:'👥', label:`اللاعبون (${players.length})` },
    { key:'standings', emoji:'📊', label:'الترتيب'    },
  ] as const;

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:14 }}>

      {/* Team hero card */}
      <div style={{ background:'linear-gradient(135deg,#0a1628,#0f2d6b)', borderRadius:18, padding:'22px 20px', display:'flex', alignItems:'center', gap:16, flexWrap:'wrap' }}>
        {team.logo_url
          ? <img src={resolveImg(team.logo_url)||''} alt="" style={{ width:64, height:64, borderRadius:14, objectFit:'cover', border:'2px solid rgba(255,255,255,0.2)', flexShrink:0 }} />
          : <div style={{ width:64, height:64, borderRadius:14, background:'linear-gradient(135deg,#d97706,#ea580c)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:26, color:'#fff', flexShrink:0 }}>
              {team.name?.charAt(0)}
            </div>
        }
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:20, fontWeight:900, color:'#fff', marginBottom:4 }}>{team.name}</div>
          <div style={{ display:'flex', gap:16, flexWrap:'wrap' }}>
            {team.city && <span style={{ fontSize:13, color:'rgba(255,255,255,0.5)' }}>📍 {team.city}</span>}
            {tournament?.name && <span style={{ fontSize:13, color:'rgba(255,255,255,0.5)' }}>🏆 {tournament.name}</span>}
            {standing?.group?.name && <span style={{ fontSize:13, color:'rgba(255,255,255,0.5)' }}>📊 {standing.group.name}</span>}
          </div>
        </div>
        {/* Quick stats */}
        <div style={{ display:'flex', gap:20, flexShrink:0 }}>
          {[
            { lbl:'فاز',    v:won,    color:'#4ade80' },
            { lbl:'تعادل', v:drew,   color:'#fbbf24' },
            { lbl:'خسر',   v:lost,   color:'#f87171' },
            { lbl:'أهداف', v:goalsF, color:'#60a5fa' },
          ].map(s=>(
            <div key={s.lbl} style={{ textAlign:'center' }}>
              <div style={{ fontSize:20, fontWeight:900, color:s.color, lineHeight:1 }}>{s.v}</div>
              <div style={{ fontSize:10, color:'rgba(255,255,255,0.4)', marginTop:3 }}>{s.lbl}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="sp-card" style={{ background:'#131929', borderColor:'rgba(255,255,255,0.07)' }}>
        <div className="sp-tabs">
          {TABS.map(t=>(
            <button key={t.key} onClick={()=>setTab(t.key)} className={`sp-tab${tab===t.key?' active':''}`}>
              {t.emoji} {t.label}
            </button>
          ))}
        </div>

        {/* MATCHES */}
        {tab === 'matches' && (
          matches.length === 0
            ? <div style={{ padding:'40px', textAlign:'center', color:'#64748b' }}>لا توجد مباريات بعد</div>
            : matches.map(m => {
                const isHome = m.home_team_id === teamId;
                const opp    = isHome ? m.away_team : m.home_team;
                const fin    = m.status === 'completed';
                const myScore  = isHome ? (m.home_score ?? 0) : (m.away_score ?? 0);
                const oppScore = isHome ? (m.away_score ?? 0) : (m.home_score ?? 0);
                const result   = fin ? (myScore > oppScore ? 'win' : myScore < oppScore ? 'loss' : 'draw') : null;
                const resultColor = { win:'#16a34a', loss:'#dc2626', draw:'#d97706' }[result||''] || '';

                return (
                  <div key={m.id} style={{ display:'grid', gridTemplateColumns:'1fr 80px 1fr', alignItems:'center', padding:'13px 16px', borderBottom:'1px solid rgba(255,255,255,0.04)', gap:8 }}>
                    {/* My team */}
                    <div style={{ display:'flex', alignItems:'center', justifyContent:'flex-end', gap:8 }}>
                      <span style={{ fontSize:14, fontWeight:700, color:'#e2e8f0' }}>{team.name}</span>
                      <div style={{ width:32, height:32, borderRadius:8, background:'linear-gradient(135deg,#1e3a5f,#1d4ed8)', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontWeight:800, fontSize:13, flexShrink:0 }}>
                        {team.name?.charAt(0)}
                      </div>
                    </div>

                    {/* Score / time */}
                    <div style={{ textAlign:'center' }}>
                      {fin
                        ? <div>
                            <div style={{ background:resultColor?`${resultColor}20`:'#0d1117', border:resultColor?`1px solid ${resultColor}40`:'none', borderRadius:9, padding:'5px 10px', display:'inline-block' }}>
                              <span style={{ fontFamily:'monospace', fontWeight:900, fontSize:17, color:resultColor||'#fff' }}>
                                {myScore} - {oppScore}
                              </span>
                            </div>
                            <div style={{ fontSize:10, color:resultColor||'#64748b', fontWeight:700, marginTop:3 }}>
                              {result==='win'?'فوز':result==='loss'?'خسارة':'تعادل'}
                            </div>
                          </div>
                        : m.match_date
                          ? <div>
                              <div style={{ fontSize:15, fontWeight:800, color:'#e2e8f0' }}>{new Date(m.match_date).toLocaleTimeString('ar-SA',{hour:'2-digit',minute:'2-digit'})}</div>
                              <div style={{ fontSize:10, color:'#64748b' }}>{new Date(m.match_date).toLocaleDateString('ar-SA',{month:'short',day:'numeric'})}</div>
                            </div>
                          : <span style={{ fontSize:13, color:'#64748b', fontWeight:700 }}>vs</span>
                      }
                    </div>

                    {/* Opponent */}
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <div style={{ width:32, height:32, borderRadius:8, flexShrink:0, overflow:'hidden', background:'linear-gradient(135deg,#1e3a5f,#1d4ed8)', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontWeight:800, fontSize:13 }}>
                        {opp?.logo_url ? <img src={resolveImg(opp.logo_url)||''} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} /> : opp?.name?.charAt(0) || '?'}
                      </div>
                      <span style={{ fontSize:14, fontWeight:700, color:'#e2e8f0' }}>{opp?.name || 'TBD'}</span>
                    </div>
                  </div>
                );
              })
        )}

        {/* PLAYERS */}
        {tab === 'players' && (
          players.length === 0
            ? <div style={{ padding:'40px', textAlign:'center', color:'#64748b' }}>لا يوجد لاعبون مسجلون</div>
            : <div>
                <div style={{ display:'grid', gridTemplateColumns:'40px 1fr 100px 80px', padding:'8px 16px', background:'#1a2235', fontSize:12, fontWeight:700, color:'#64748b' }}>
                  <div style={{ textAlign:'center' }}>#</div><div>اللاعب</div><div>المركز</div><div>الجوال</div>
                </div>
                {players.map((p,i) => (
                  <div key={p.id} style={{ display:'grid', gridTemplateColumns:'40px 1fr 100px 80px', padding:'11px 16px', borderBottom:'1px solid rgba(255,255,255,0.04)', alignItems:'center' }}>
                    <div style={{ textAlign:'center', fontSize:14, fontWeight:800, color:'#d97706' }}>{p.jersey_number || i+1}</div>
                    <div>
                      <div style={{ fontSize:14, fontWeight:700, color:'#e2e8f0' }}>{p.player_name}</div>
                      {p.platform_player_id && <span style={{ fontSize:10, background:'rgba(59,130,246,0.15)', color:'#60a5fa', padding:'1px 6px', borderRadius:4 }}>منصة</span>}
                    </div>
                    <div style={{ fontSize:13, color:'#64748b' }}>{p.position || '—'}</div>
                    <div style={{ fontSize:12, color:'#64748b', fontFamily:'monospace' }}>{p.phone || '—'}</div>
                  </div>
                ))}
              </div>
        )}

        {/* STANDINGS */}
        {tab === 'standings' && (
          groupMates.length === 0
            ? <div style={{ padding:'40px', textAlign:'center', color:'#64748b' }}>لا يوجد ترتيب بعد</div>
            : <div>
                <div style={{ display:'grid', gridTemplateColumns:'36px 1fr 40px 40px 40px 40px 56px 48px 48px', padding:'8px 14px', background:'#1a2235', fontSize:11, fontWeight:700, color:'#64748b', textAlign:'center' }}>
                  <div>#</div><div style={{ textAlign:'right' }}>الفريق</div>
                  <div>لعب</div><div>فاز</div><div>تع</div><div>خسر</div><div>ل:ع</div><div>فارق</div><div>نقاط</div>
                </div>
                {[...groupMates].sort((a,b)=>b.points-a.points||b.goal_diff-a.goal_diff).map((s,i) => (
                  <div key={s.id} style={{ display:'grid', gridTemplateColumns:'36px 1fr 40px 40px 40px 40px 56px 48px 48px', padding:'11px 14px', borderBottom:'1px solid rgba(255,255,255,0.04)', alignItems:'center', fontSize:13, textAlign:'center', background:s.team_id===teamId?'rgba(217,119,6,0.07)':'transparent', borderRight:s.team_id===teamId?'3px solid #d97706':'none' }}>
                    <div style={{ fontWeight:800, color:['#f59e0b','#94a3b8','#cd7f32'][i]||'#64748b' }}>{i+1}</div>
                    <div style={{ display:'flex', alignItems:'center', gap:8, textAlign:'right' }}>
                      <div style={{ width:26, height:26, borderRadius:7, overflow:'hidden', flexShrink:0, background:'linear-gradient(135deg,#1e3a5f,#1d4ed8)', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontWeight:800, fontSize:11 }}>
                        {s.team?.logo_url ? <img src={resolveImg(s.team.logo_url)||''} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} /> : s.team?.name?.charAt(0)||'?'}
                      </div>
                      <span style={{ fontWeight:s.team_id===teamId?800:600, color:s.team_id===teamId?'#d97706':'#e2e8f0' }}>{s.team?.name||'—'}</span>
                    </div>
                    <div style={{ color:'#94a3b8' }}>{s.played}</div>
                    <div style={{ color:'#4ade80', fontWeight:700 }}>{s.won}</div>
                    <div style={{ color:'#94a3b8' }}>{s.drawn}</div>
                    <div style={{ color:'#f87171', fontWeight:700 }}>{s.lost}</div>
                    <div style={{ fontSize:11, fontFamily:'monospace', color:'#94a3b8' }}>{s.goals_for}:{s.goals_against}</div>
                    <div style={{ fontWeight:700, color:s.goal_diff>=0?'#4ade80':'#f87171' }}>{s.goal_diff>0?`+${s.goal_diff}`:s.goal_diff}</div>
                    <div style={{ fontSize:15, fontWeight:900, color:'#e2e8f0' }}>{s.points}</div>
                  </div>
                ))}
              </div>
        )}
      </div>

      {/* Share link hint */}
      <div style={{ background:'rgba(217,119,6,0.06)', border:'1px solid rgba(217,119,6,0.2)', borderRadius:12, padding:'12px 16px', display:'flex', alignItems:'center', gap:10 }}>
        <span style={{ fontSize:16 }}>🔗</span>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:13, fontWeight:700, color:'#d97706' }}>رابط الفريق</div>
          <div style={{ fontSize:12, color:'#64748b', fontFamily:'monospace', wordBreak:'break-all' }}>{typeof window !== 'undefined' ? window.location.href : ''}</div>
        </div>
        <button
          onClick={() => { typeof window !== 'undefined' && navigator.clipboard?.writeText(window.location.href); toast('تم نسخ الرابط'); }}
          style={{ padding:'6px 12px', background:'#d97706', border:'none', borderRadius:8, color:'#fff', fontSize:13, fontWeight:700, cursor:'pointer' }}>
          نسخ
        </button>
      </div>
    </div>
  );
}

function toast(msg: string) {
  // Simple toast — using sonner if available
  try { (window as any).__sonner?.toast?.(msg); } catch {}
}
