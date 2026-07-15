'use client';
import { TeamLogo as LogoImg } from '../../_components/TeamLogo';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { toast } from 'sonner';
import { createPortalClient } from '@/lib/tournament-portal/auth';
import { usePortalTheme } from '../../_components/PortalShell';
import { useTranslation } from '@/lib/i18n';

type Cat    = { id:string; name:string };
type Scorer = { id:string; team_id:string; player_name:string; goals:number; assists:number; yellow_cards:number; red_cards:number; matches_played:number; team?:{ name:string; logo_url:string|null } };
type TStat  = { team_id:string; played:number; goals_for:number; goals_against:number; goal_diff:number; points:number; team?:{ name:string; logo_url:string|null } };

type Tab = 'scorers'|'attack'|'defense'|'cards';
const TABS: { key:Tab; emoji:string }[] = [{key:'scorers',emoji:'⚽'},{key:'attack',emoji:'🎯'},{key:'defense',emoji:'🛡️'},{key:'cards',emoji:'🟨'}];

export default function StatsPage() {
  const { getTranslations } = useTranslation();
  const copy = getTranslations<any>('tournamentStats');
  const { id }     = useParams<{ id:string }>();
  const { isDark } = usePortalTheme();
  const S = isDark ? D : L;

  const [cats,   setCats]   = useState<Cat[]>([]);
  const [selCat, setSelCat] = useState('');
  const [scorers,setScorers]= useState<Scorer[]>([]);
  const [stats,  setStats]  = useState<TStat[]>([]);
  const [loading,setLoading]= useState(true);
  const [recalc, setRecalc] = useState(false);
  const [tab,    setTab]    = useState<Tab>('scorers');

  const supabase = createPortalClient();

  useEffect(()=>{
    (async()=>{
      const { data } = await supabase.from('tournament_categories').select('id,name').eq('tournament_id',id).order('sort_order');
      setCats(data||[]);
      if (data?.length) setSelCat(data[0].id);
      setLoading(false);
    })();
  },[id]);

  const load = useCallback(async()=>{
    if (!selCat) return;
    const [sR,stR] = await Promise.all([
      supabase.from('tournament_top_scorers').select('*,team:tournament_teams(name,logo_url)').eq('tournament_id',id).eq('category_id',selCat).order('goals',{ascending:false}).order('assists',{ascending:false}).limit(30),
      supabase.from('tournament_standings').select('*,team:tournament_teams(name,logo_url)').eq('tournament_id',id).eq('category_id',selCat).order('goals_for',{ascending:false}),
    ]);
    setScorers((sR.data as any)||[]);
    setStats((stR.data as any)||[]);
  },[selCat,id]);

  useEffect(()=>{ load(); },[load]);

  const recalculate = async()=>{
    setRecalc(true);
    try {
      const { data:evs } = await supabase.from('tournament_match_events').select('event_type,player_name,team_id,match_id,match:tournament_matches!match_id(category_id)').eq('tournament_id',id);
      const filtered = (evs||[]).filter((e:any)=>e.match?.category_id===selCat);
      const map: Record<string,any> = {};
      for (const ev of filtered) {
        const key=`${ev.player_name}__${ev.team_id}`;
        if (!map[key]) map[key]={ player_name:ev.player_name, team_id:ev.team_id, goals:0, assists:0, yellow_cards:0, red_cards:0, matches:new Set() };
        map[key].matches.add(ev.match_id);
        if (['goal','penalty_scored'].includes(ev.event_type)) map[key].goals++;
        if (ev.event_type==='assist') map[key].assists++;
        if (['yellow_card','second_yellow'].includes(ev.event_type)) map[key].yellow_cards++;
        if (ev.event_type==='red_card') map[key].red_cards++;
      }
      for (const s of Object.values(map)) {
        if (!s.goals&&!s.assists&&!s.yellow_cards&&!s.red_cards) continue;
        await supabase.from('tournament_top_scorers').upsert({ tournament_id:id, category_id:selCat, team_id:s.team_id, player_name:s.player_name, goals:s.goals, assists:s.assists, yellow_cards:s.yellow_cards, red_cards:s.red_cards, matches_played:s.matches.size },{ onConflict:'tournament_id,category_id,team_id,player_name' });
      }
      await load(); toast.success(copy.updated);
    } catch (e:any) { toast.error(e.message); }
    setRecalc(false);
  };

  if (loading) return <Loader isDark={isDark} />;

  const byAtk  = [...stats].sort((a,b)=>b.goals_for-a.goals_for);
  const byDef  = [...stats].sort((a,b)=>a.goals_against-b.goals_against);
  const cards  = [...scorers].filter(p=>p.yellow_cards>0||p.red_cards>0).sort((a,b)=>(b.yellow_cards+b.red_cards*3)-(a.yellow_cards+a.red_cards*3));
  const total  = scorers.reduce((s,p)=>s+p.goals,0);
  const top    = scorers[0];
  const bestD  = byDef[0];

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:14 }}>

      {/* Bar */}
      <div style={{ background:S.surface, border:`1px solid ${S.border}`, borderRadius:14, padding:'12px 16px', display:'flex', alignItems:'center', flexWrap:'wrap', gap:10 }}>
        <div style={{ display:'flex', gap:6, flex:1, flexWrap:'wrap' }}>
          {cats.map(c=><button key={c.id} onClick={()=>setSelCat(c.id)} className={`sp-cat-tab${selCat===c.id?' active':''}`}>{c.name}</button>)}
        </div>
        <button onClick={recalculate} disabled={recalc} className="sp-btn sp-btn-sm" style={{ background:'#4f46e5', color:'#fff', border:'none' }}>
          {recalc?copy.calculating:`↻ ${copy.recalculate}`}
        </button>
      </div>

      {/* KPIs */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10 }} className="sp-grid-4col">
        {[
          { icon:'⚽', v:total, lbl:copy.totalGoals, color:'#16a34a' },
          { icon:'🏆', v:top?`${top.player_name} (${top.goals})`:'—', lbl:copy.topScorer, color:'#f59e0b', sm:true },
          { icon:'🛡️', v:bestD?.team?.name||'—', lbl:copy.bestDefense, color:'#3b82f6', sm:true },
          { icon:'👥', v:stats.length, lbl:copy.teamsCount, color:'#8b5cf6' },
        ].map(s=>(
          <div key={s.lbl} className="sp-kpi" style={{ background:S.surface, borderColor:S.border }}>
            <div style={{ fontSize:24, marginBottom:8 }}>{s.icon}</div>
            <div style={{ fontSize:s.sm?13:26, fontWeight:900, color:s.color, lineHeight:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{s.v}</div>
            <div className="sp-kpi-label" style={{ color:S.text2 }}>{s.lbl}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="sp-card" style={{ background:S.surface, borderColor:S.border }}>
        <div className="sp-tabs">
          {TABS.map((t,index)=>(
            <button key={t.key} onClick={()=>setTab(t.key)} className={`sp-tab${tab===t.key?' active':''}`}>
              {t.emoji} {copy.tabs[index]}
            </button>
          ))}
        </div>

        {/* Scorers */}
        {tab==='scorers' && (
          scorers.length===0
            ? <Empty S={S} text={copy.noStatsHelp} />
            : scorers.map((p,i)=>(
                <div key={p.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 18px', borderBottom:`1px solid ${S.border}` }}>
                  <div style={{ width:28, textAlign:'center', flexShrink:0 }}>
                    {['🥇','🥈','🥉'][i]
                      ? <span style={{ fontSize:20 }}>{['🥇','🥈','🥉'][i]}</span>
                      : <span style={{ fontSize:12, color:S.text2 }}>{i+1}</span>}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
                      <LogoImg name={p.team?.name||'?'} logo={p.team?.logo_url} size={26} />
                      <div>
                        <div style={{ fontSize:14, fontWeight:700, color:S.text }}>{p.player_name}</div>
                        <div style={{ fontSize:11, color:S.text2 }}>{p.team?.name||'—'} · {p.matches_played} {copy.matches}</div>
                      </div>
                    </div>
                    <div style={{ height:4, background:S.surface2, borderRadius:2, overflow:'hidden' }}>
                      <div style={{ height:'100%', width:`${scorers[0]?.goals?Math.round((p.goals/scorers[0].goals)*100):0}%`, background:'linear-gradient(90deg,#16a34a,#22c55e)', borderRadius:2, transition:'width 0.5s' }} />
                    </div>
                  </div>
                  <div style={{ display:'flex', gap:14, alignItems:'center', flexShrink:0 }}>
                    <div style={{ textAlign:'center' }}>
                      <div style={{ fontSize:22, fontWeight:900, color:'#16a34a', lineHeight:1 }}>{p.goals}</div>
                      <div style={{ fontSize:9, color:S.text2 }}>{copy.goal}</div>
                    </div>
                    <div style={{ textAlign:'center' }}>
                      <div style={{ fontSize:16, fontWeight:700, color:'#3b82f6', lineHeight:1 }}>{p.assists}</div>
                      <div style={{ fontSize:9, color:S.text2 }}>{copy.assist}</div>
                    </div>
                    {(p.yellow_cards>0||p.red_cards>0)&&(
                      <div style={{ display:'flex', gap:4 }}>
                        {p.yellow_cards>0&&<span style={{ background:isDark?'rgba(202,138,4,0.15)':'#fef9c3', color:'#ca8a04', borderRadius:5, padding:'2px 7px', fontSize:11, fontWeight:700 }}>🟨 {p.yellow_cards}</span>}
                        {p.red_cards>0&&<span style={{ background:isDark?'rgba(220,38,38,0.15)':'#fee2e2', color:'#dc2626', borderRadius:5, padding:'2px 7px', fontSize:11, fontWeight:700 }}>🟥 {p.red_cards}</span>}
                      </div>
                    )}
                  </div>
                </div>
              ))
        )}

        {/* Attack */}
        {tab==='attack' && (
          byAtk.length===0 ? <Empty S={S} text={copy.noStats} /> :
          <>
            <div style={{ display:'grid', gridTemplateColumns:'36px 1fr 44px 56px 60px', padding:'8px 18px', background:S.surface2, fontSize:10, fontWeight:700, color:S.text2 }}>
              <div>#</div><div>{copy.team}</div><div style={{textAlign:'center'}}>{copy.played}</div><div style={{textAlign:'center'}}>{copy.goals}</div><div style={{textAlign:'center'}}>{copy.average}</div>
            </div>
            {byAtk.map((t,i)=>(
              <div key={t.team_id} style={{ display:'grid', gridTemplateColumns:'36px 1fr 44px 56px 60px', padding:'11px 18px', alignItems:'center', borderBottom:`1px solid ${S.border}` }}>
                <div style={{ fontSize:12, color:S.text2, fontWeight:700 }}>{i+1}</div>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}><LogoImg name={t.team?.name||'?'} logo={t.team?.logo_url} size={26} /><span style={{ fontSize:13, fontWeight:600, color:S.text }}>{t.team?.name||'—'}</span></div>
                <div style={{ textAlign:'center', fontSize:12, color:S.text2 }}>{t.played}</div>
                <div style={{ textAlign:'center' }}><span style={{ fontSize:16, fontWeight:900, color:'#4ade80' }}>{t.goals_for}</span></div>
                <div style={{ textAlign:'center', fontSize:12, color:S.text2 }}>{t.played>0?(t.goals_for/t.played).toFixed(1):'—'}</div>
              </div>
            ))}
          </>
        )}

        {/* Defense */}
        {tab==='defense' && (
          byDef.length===0 ? <Empty S={S} text={copy.noStats} /> :
          <>
            <div style={{ display:'grid', gridTemplateColumns:'36px 1fr 44px 60px 60px', padding:'8px 18px', background:S.surface2, fontSize:10, fontWeight:700, color:S.text2 }}>
              <div>#</div><div>{copy.team}</div><div style={{textAlign:'center'}}>{copy.played}</div><div style={{textAlign:'center'}}>{copy.conceded}</div><div style={{textAlign:'center'}}>{copy.average}</div>
            </div>
            {byDef.map((t,i)=>(
              <div key={t.team_id} style={{ display:'grid', gridTemplateColumns:'36px 1fr 44px 60px 60px', padding:'11px 18px', alignItems:'center', borderBottom:`1px solid ${S.border}` }}>
                <div style={{ fontSize:12, color:S.text2, fontWeight:700 }}>{i+1}</div>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}><LogoImg name={t.team?.name||'?'} logo={t.team?.logo_url} size={26} /><span style={{ fontSize:13, fontWeight:600, color:S.text }}>{t.team?.name||'—'}</span></div>
                <div style={{ textAlign:'center', fontSize:12, color:S.text2 }}>{t.played}</div>
                <div style={{ textAlign:'center' }}><span style={{ fontSize:16, fontWeight:900, color:i===0?'#4ade80':'#f87171' }}>{t.goals_against}</span></div>
                <div style={{ textAlign:'center', fontSize:12, color:S.text2 }}>{t.played>0?(t.goals_against/t.played).toFixed(1):'—'}</div>
              </div>
            ))}
          </>
        )}

        {/* Cards */}
        {tab==='cards' && (
          cards.length===0 ? <Empty S={S} text={copy.noCards} /> :
          <>
            <div style={{ display:'grid', gridTemplateColumns:'36px 1fr 1fr 52px 52px', padding:'8px 18px', background:S.surface2, fontSize:10, fontWeight:700, color:S.text2 }}>
              <div>#</div><div>{copy.player}</div><div>{copy.team}</div><div style={{textAlign:'center'}}>🟨</div><div style={{textAlign:'center'}}>🟥</div>
            </div>
            {cards.map((p,i)=>(
              <div key={p.id} style={{ display:'grid', gridTemplateColumns:'36px 1fr 1fr 52px 52px', padding:'11px 18px', alignItems:'center', borderBottom:`1px solid ${S.border}` }}>
                <div style={{ fontSize:12, color:S.text2 }}>{i+1}</div>
                <div style={{ fontSize:13, fontWeight:700, color:S.text }}>{p.player_name}</div>
                <div style={{ display:'flex', alignItems:'center', gap:6 }}><LogoImg name={p.team?.name||'?'} logo={p.team?.logo_url} size={22} /><span style={{ fontSize:12, color:S.text2 }}>{p.team?.name||'—'}</span></div>
                <div style={{ textAlign:'center', fontSize:18, fontWeight:900, color:'#ca8a04' }}>{p.yellow_cards}</div>
                <div style={{ textAlign:'center', fontSize:18, fontWeight:900, color:'#dc2626' }}>{p.red_cards}</div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}

function Empty({ S, text }: { S:any; text:string }) {
  return <div style={{ padding:'40px 24px', textAlign:'center', color:S.text2, fontSize:13 }}>{text}</div>;
}
// LogoImg = TeamLogo (imported)
function Loader({ isDark }: { isDark:boolean }) {
  return <div style={{ display:'flex',justifyContent:'center',alignItems:'center',minHeight:300 }}><div style={{ width:36,height:36,borderRadius:'50%',border:`3px solid ${isDark?'rgba(255,255,255,0.1)':'#e2e8f0'}`,borderTopColor:'#d97706',animation:'spin 0.7s linear infinite' }} /><style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style></div>;
}

const D = { surface:'#131929', surface2:'#1a2235', border:'rgba(255,255,255,0.07)', text:'#e8eaf0', text2:'#64748b' };
const L = { surface:'#ffffff', surface2:'#f8fafc', border:'#e2e8f0', text:'#0f172a', text2:'#64748b' };
