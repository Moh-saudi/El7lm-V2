'use client';
import { TeamLogo as LogoImg } from '../../_components/TeamLogo';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Modal } from 'antd';
import { toast } from 'sonner';
import Link from 'next/link';
import { createPortalClient } from '@/lib/tournament-portal/auth';
import { usePortalTheme } from '../../_components/PortalShell';

type Team   = { id: string; name: string; logo_url: string | null };
type Cat    = { id: string; name: string };
type Match  = {
  id: string; round: string; match_number: number | null;
  home_team_id: string | null; away_team_id: string | null;
  home_score: number | null; away_score: number | null;
  home_penalties: number | null; away_penalties: number | null;
  match_date: string | null; venue: string | null; referee_name: string | null;
  status: string; group_id: string | null; category_id: string | null;
};
type Event = { id?: string; team_id: string; event_type: string; minute: number | null; notes: string };

const ROUND_LBL: Record<string,string> = {
  league:'الدوري', group_stage:'دور المجموعات', R128:'دور الـ128', R64:'دور الـ64',
  R32:'دور الـ32', R16:'دور الـ16', QF:'ربع النهائي', SF:'نصف النهائي', F:'النهائي', '3rd':'المركز الثالث',
};
const ROUND_ORDER = ['league','group_stage','R128','R64','R32','R16','QF','SF','F','3rd'];
const ROUND_COLOR: Record<string,string> = { F:'#f59e0b', SF:'#8b5cf6', QF:'#3b82f6', '3rd':'#f97316' };

const EVT: { v:string; lbl:string; emoji:string; color:string }[] = [
  { v:'goal',           lbl:'هدف',              emoji:'⚽', color:'#16a34a' },
  { v:'own_goal',       lbl:'هدف عكسي',         emoji:'🙈', color:'#dc2626' },
  { v:'yellow_card',    lbl:'صفراء',             emoji:'🟨', color:'#ca8a04' },
  { v:'red_card',       lbl:'حمراء',             emoji:'🟥', color:'#dc2626' },
  { v:'second_yellow',  lbl:'ثانية → إخراج',    emoji:'🟨🟥',color:'#dc2626' },
  { v:'penalty_scored', lbl:'ركلة جزاء ✓',      emoji:'✅', color:'#16a34a' },
  { v:'penalty_missed', lbl:'ركلة جزاء ✗',      emoji:'❌', color:'#dc2626' },
  { v:'sub_in',         lbl:'دخول',              emoji:'🔼', color:'#3b82f6' },
  { v:'sub_out',        lbl:'خروج',              emoji:'🔽', color:'#64748b' },
];

export default function MatchesPage() {
  const { id }     = useParams<{ id: string }>();
  const { isDark } = usePortalTheme();
  const S = isDark ? D : L;

  const [cats,       setCats]       = useState<Cat[]>([]);
  const [selCat,     setSelCat]     = useState('all');
  const [teams,      setTeams]      = useState<Team[]>([]);
  const [matches,    setMatches]    = useState<Match[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [events,     setEvents]     = useState<Record<string, Event[]>>({});
  const [expanded,   setExpanded]   = useState<string | null>(null);
  const [saving,     setSaving]     = useState(false);
  const [scoreModal, setScoreModal] = useState<Match | null>(null);
  const [evModal,    setEvModal]    = useState<Match | null>(null);

  // Score form state
  const [sc, setSc] = useState({ hs:'', as:'', hp:'', ap:'' });
  // Event form state
  const [ev, setEv] = useState({ type:'goal', team:'', minute:'', notes:'' });

  const supabase = createPortalClient();

  const fetchAll = useCallback(async () => {
    const [cR,tR,mR] = await Promise.all([
      supabase.from('tournament_categories').select('id,name').eq('tournament_id',id).order('sort_order'),
      supabase.from('tournament_teams').select('id,name,logo_url').eq('tournament_id',id).eq('status','approved'),
      supabase.from('tournament_matches').select('*').eq('tournament_id',id).order('match_number',{ascending:true}),
    ]);
    setCats(cR.data||[]); setTeams(tR.data||[]); setMatches(mR.data||[]);
    setLoading(false);
  }, [id]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const loadEvents = async (mid: string) => {
    if (events[mid] !== undefined) return;
    const { data } = await supabase.from('tournament_match_events').select('*').eq('match_id',mid).order('minute');
    setEvents(p => ({ ...p, [mid]: data||[] }));
  };

  const tName = (tid: string|null) => teams.find(t=>t.id===tid)?.name||'—';
  const tLogo = (tid: string|null) => teams.find(t=>t.id===tid)?.logo_url;

  const saveScore = async () => {
    if (!scoreModal) return;
    setSaving(true);
    const hs = sc.hs !== '' ? +sc.hs : null;
    const as_ = sc.as !== '' ? +sc.as : null;
    const done = hs !== null && as_ !== null;
    const winnerId = done ? (hs > as_ ? scoreModal.home_team_id : as_ > hs ? scoreModal.away_team_id : null) : null;
    const { error } = await supabase.from('tournament_matches').update({ home_score:hs, away_score:as_, home_penalties:sc.hp?+sc.hp:null, away_penalties:sc.ap?+sc.ap:null, status:done?'completed':'scheduled', winner_id:winnerId }).eq('id',scoreModal.id);
    if (error) { toast.error(error.message); setSaving(false); return; }
    toast.success('تم حفظ النتيجة');
    setScoreModal(null);
    fetchAll();
    // انتقال الفائز تلقائياً في الإقصاء
    if (done && ['R128','R64','R32','R16','QF','SF'].includes(scoreModal.round || '')) {
      fetch('/api/tournament-portal/advance-winner', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ match_id: scoreModal.id }),
      }).then(r => r.json()).then(d => {
        if (d.advanced) toast.success('تم نقل الفائز للدور القادم تلقائياً ✓');
      }).catch(() => {});
    }
    setSaving(false);
  };

  const addEvent = async () => {
    if (!evModal||!ev.team) { toast.error('اختر الفريق'); return; }
    const { data, error } = await supabase.from('tournament_match_events').insert({ match_id:evModal.id, tournament_id:id, team_id:ev.team||null, event_type:ev.type, minute:ev.minute?+ev.minute:null, notes:ev.notes||null }).select().single();
    if (error) { toast.error(error.message); return; }
    setEvents(p => ({ ...p, [evModal.id]:[...(p[evModal.id]||[]),data] }));
    setEv(p => ({ ...p, minute:'', notes:'' }));
    toast.success('تم تسجيل الحدث');
  };

  const deleteEvent = async (mid: string, eid: string) => {
    await supabase.from('tournament_match_events').delete().eq('id',eid);
    setEvents(p => ({ ...p, [mid]:p[mid].filter(e=>e.id!==eid) }));
  };

  const filtered = useMemo(() => selCat==='all' ? matches : matches.filter(m=>m.category_id===selCat), [matches,selCat]);

  const grouped = useMemo(() => {
    const byRound: Record<string, Record<string, Match[]>> = {};
    for (const m of filtered) {
      const r = m.round||'other';
      const date = m.match_date ? new Date(m.match_date).toLocaleDateString('ar-SA',{weekday:'long',year:'numeric',month:'long',day:'numeric'}) : 'بدون تاريخ';
      if (!byRound[r]) byRound[r] = {};
      (byRound[r][date]=byRound[r][date]||[]).push(m);
    }
    return byRound;
  }, [filtered]);

  const sortedRounds = ROUND_ORDER.filter(r => grouped[r]);

  if (loading) return <Loader isDark={isDark} />;

  const completedN = filtered.filter(m=>m.status==='completed').length;
  const pendingN   = filtered.filter(m=>m.status==='scheduled').length;

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:14 }}>

      {/* Filter bar */}
      <div style={{ background:S.surface, border:`1px solid ${S.border}`, borderRadius:14, padding:'12px 16px', display:'flex', alignItems:'center', flexWrap:'wrap', gap:8 }}>
        <div style={{ display:'flex', gap:6, flexWrap:'wrap', flex:1 }}>
          {[{id:'all',name:`الكل (${matches.length})`},...cats.map(c=>({id:c.id,name:`${c.name} (${matches.filter(m=>m.category_id===c.id).length})`}))].map(c=>(
            <button key={c.id} onClick={()=>setSelCat(c.id)} className={`sp-cat-tab${selCat===c.id?' active':''}`}>{c.name}</button>
          ))}
        </div>
        <div style={{ display:'flex', gap:16 }}>
          <span style={{ fontSize:12, color:'#16a34a', fontWeight:600 }}>✓ {completedN} منتهية</span>
          <span style={{ fontSize:12, color:S.text2 }}>◷ {pendingN} قادمة</span>
        </div>
      </div>

      {/* Empty */}
      {filtered.length === 0 && (
        <div style={{ background:S.surface, border:`2px dashed ${S.border}`, borderRadius:18, padding:'60px 24px', textAlign:'center' }}>
          <div style={{ fontSize:40, marginBottom:14 }}>⚽</div>
          <div style={{ fontSize:15, fontWeight:700, color:S.text, marginBottom:8 }}>لا توجد مباريات بعد</div>
          <div style={{ fontSize:13, color:S.text2, marginBottom:20 }}>ابدأ بتوليد الجدول من تبويب «الجدول»</div>
          <Link href={`/tournament-portal/${id}/schedule`} style={{ textDecoration:'none' }}>
            <button className="sp-btn sp-btn-primary">📅 الذهاب إلى الجدول</button>
          </Link>
        </div>
      )}

      {/* Rounds */}
      {sortedRounds.map(round => {
        const rc = ROUND_COLOR[round]||'#64748b';
        const dateGroups = grouped[round];
        return (
          <div key={round}>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10 }}>
              <div style={{ height:2, flex:1, background:`${rc}20`, borderRadius:1 }} />
              <div style={{ padding:'5px 14px', background:`${rc}15`, border:`1px solid ${rc}30`, borderRadius:18 }}>
                <span style={{ fontSize:12, fontWeight:800, color:rc }}>{ROUND_LBL[round]||round}</span>
              </div>
              <div style={{ height:2, flex:1, background:`${rc}20`, borderRadius:1 }} />
            </div>

            {Object.entries(dateGroups).map(([date, dayMatches]) => (
              <div key={date} style={{ marginBottom:10 }}>
                {/* Date divider */}
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6, padding:'0 4px' }}>
                  <span style={{ fontSize:11, color:S.text2, fontWeight:600 }}>📅 {date}</span>
                  <div style={{ height:1, flex:1, background:S.border }} />
                </div>

                <div className="sp-card" style={{ background:S.surface, borderColor:S.border }}>
                  {(dayMatches as Match[]).map(m => (
                    <ResultCard
                      key={m.id} match={m} teams={teams} events={events[m.id]}
                      isExpanded={expanded===m.id} isDark={isDark} S={S}
                      onExpand={() => {
                        const next = expanded===m.id ? null : m.id;
                        setExpanded(next);
                        if (next) loadEvents(next);
                      }}
                      onScore={() => { setScoreModal(m); setSc({ hs:m.home_score?.toString()||'', as:m.away_score?.toString()||'', hp:m.home_penalties?.toString()||'', ap:m.away_penalties?.toString()||'' }); }}
                      onEvents={() => { setEvModal(m); loadEvents(m.id); setEv({ type:'goal', team:'', minute:'', notes:'' }); }}
                      onDeleteEvent={(eid:string)=>deleteEvent(m.id,eid)}
                      onToggleLive={async () => {
                        const newStatus = m.status === 'live' ? 'scheduled' : 'live';
                        await supabase.from('tournament_matches').update({ status: newStatus }).eq('id', m.id);
                        setMatches(prev => prev.map(x => x.id === m.id ? { ...x, status: newStatus } : x));
                        toast.success(newStatus === 'live' ? '🔴 المباراة مباشرة الآن' : 'تم إيقاف البث المباشر');
                      }}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        );
      })}

      {/* ── Score Modal ── */}
      <Modal open={!!scoreModal} onOk={saveScore} onCancel={()=>setScoreModal(null)} okText="حفظ النتيجة" cancelText="إلغاء" confirmLoading={saving} okButtonProps={{ style:{ background:'#16a34a', border:'none' } }} width={400}
        title={scoreModal ? `${tName(scoreModal.home_team_id)} ضد ${tName(scoreModal.away_team_id)}` : ''}>
        {scoreModal && (
          <div style={{ marginTop:16 }}>
            {/* Teams banner */}
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-around', padding:'18px 20px', background:isDark?'#0d1117':'#f1f5f9', borderRadius:14, marginBottom:20 }}>
              <div style={{ textAlign:'center' }}>
                <LogoImg name={tName(scoreModal.home_team_id)} logo={tLogo(scoreModal.home_team_id)} size={48} />
                <div style={{ fontSize:13, fontWeight:700, color:isDark?'#e2e8f0':'#0f172a', marginTop:8, maxWidth:100 }}>{tName(scoreModal.home_team_id)}</div>
              </div>
              <span style={{ fontSize:14, color:isDark?'#475569':'#94a3b8', fontWeight:700 }}>vs</span>
              <div style={{ textAlign:'center' }}>
                <LogoImg name={tName(scoreModal.away_team_id)} logo={tLogo(scoreModal.away_team_id)} size={48} />
                <div style={{ fontSize:13, fontWeight:700, color:isDark?'#e2e8f0':'#0f172a', marginTop:8, maxWidth:100 }}>{tName(scoreModal.away_team_id)}</div>
              </div>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
              {[
                { lbl:tName(scoreModal.home_team_id), key:'hs' as const },
                { lbl:tName(scoreModal.away_team_id), key:'as' as const },
                { lbl:'ر.ج (محلي)',                  key:'hp' as const },
                { lbl:'ر.ج (ضيف)',                   key:'ap' as const },
              ].map(f => (
                <div key={f.key}>
                  <label className="sp-label">{f.lbl}</label>
                  <input type="number" min={0} className="sp-input" style={{ fontSize:20, textAlign:'center', fontWeight:900 }} value={sc[f.key]} onChange={e=>setSc(p=>({...p,[f.key]:e.target.value}))} />
                </div>
              ))}
            </div>
          </div>
        )}
      </Modal>

      {/* ── Events Modal ── */}
      <Modal open={!!evModal} footer={null} onCancel={()=>setEvModal(null)} width={480}
        title={evModal ? `أحداث: ${tName(evModal.home_team_id)} vs ${tName(evModal.away_team_id)}` : ''}>
        {evModal && (
          <div style={{ marginTop:12 }}>
            {/* Events list */}
            <div style={{ maxHeight:220, overflowY:'auto', marginBottom:14 }} className="sp-scroll">
              {(events[evModal.id]||[]).length===0
                ? <div style={{ padding:'24px', textAlign:'center', color:isDark?'#475569':'#94a3b8', fontSize:13 }}>لا أحداث بعد</div>
                : (events[evModal.id]||[]).map((e:any) => {
                    const et = EVT.find(x=>x.v===e.event_type);
                    return (
                      <div key={e.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 12px', borderRadius:9, background:isDark?'#1a2235':'#f8fafc', marginBottom:5 }}>
                        <span style={{ fontSize:16 }}>{et?.emoji}</span>
                        <span style={{ fontWeight:700, fontSize:13, color:et?.color||'inherit' }}>{et?.lbl}</span>
                        {e.minute && <span style={{ background:isDark?'#0d1117':'#e2e8f0', borderRadius:5, padding:'1px 7px', fontSize:11, fontWeight:700, color:isDark?'#94a3b8':'#64748b' }}>{e.minute}'</span>}
                        {e.notes && <span style={{ fontSize:12, color:isDark?'#64748b':'#94a3b8', flex:1 }}>{e.notes}</span>}
                        <button onClick={()=>deleteEvent(evModal.id,e.id)} style={{ background:'transparent', border:'none', cursor:'pointer', color:'#ef4444', fontSize:16 }}>×</button>
                      </div>
                    );
                  })
              }
            </div>
            {/* Add event */}
            <div style={{ borderTop:`1px solid ${isDark?'rgba(255,255,255,0.07)':'#e2e8f0'}`, paddingTop:14, display:'flex', flexWrap:'wrap', gap:8, alignItems:'center' }}>
              <select className="sp-select" style={{ width:160, padding:'6px 10px', fontSize:12 }} value={ev.type} onChange={e=>setEv(p=>({...p,type:e.target.value}))}>
                {EVT.map(e=><option key={e.v} value={e.v}>{e.emoji} {e.lbl}</option>)}
              </select>
              <select className="sp-select" style={{ width:120, padding:'6px 10px', fontSize:12 }} value={ev.team} onChange={e=>setEv(p=>({...p,team:e.target.value}))}>
                <option value="">الفريق...</option>
                {[evModal.home_team_id,evModal.away_team_id].filter(Boolean).map(tid=>(
                  <option key={tid!} value={tid!}>{tName(tid)}</option>
                ))}
              </select>
              <input type="number" min={1} max={120} className="sp-input sp-input-sm" style={{ width:80 }} placeholder="الدقيقة" value={ev.minute} onChange={e=>setEv(p=>({...p,minute:e.target.value}))} />
              <input className="sp-input sp-input-sm" style={{ width:130 }} placeholder="اسم اللاعب..." value={ev.notes} onChange={e=>setEv(p=>({...p,notes:e.target.value}))} />
              <button onClick={addEvent} className="sp-btn sp-btn-sm" style={{ background:'#4f46e5', color:'#fff', border:'none' }}>+ تسجيل</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

// ── Result Card ───────────────────────────────────────────────────────────────
function ResultCard({ match, teams, events, isExpanded, isDark, S, onExpand, onScore, onEvents, onDeleteEvent, onToggleLive }: any) {
  const tName = (tid: string|null) => teams.find((t:any)=>t.id===tid)?.name||'TBD';
  const tLogo = (tid: string|null) => teams.find((t:any)=>t.id===tid)?.logo_url;
  const fin  = match.status === 'completed';
  const live = match.status === 'live';
  const hs = match.home_score, as_ = match.away_score;
  const homeWon = fin && hs!==null && as_!==null && hs>as_;
  const awayWon = fin && hs!==null && as_!==null && as_>hs;

  // Goals by team
  const homeGoals = (events||[]).filter((e:any)=>e.team_id===match.home_team_id&&['goal','penalty_scored'].includes(e.event_type));
  const awayGoals = (events||[]).filter((e:any)=>e.team_id===match.away_team_id&&['goal','penalty_scored'].includes(e.event_type));

  return (
    <div style={{ borderBottom:`1px solid ${S.border}` }}>
      {/* Live bar */}
      {live && (
        <div style={{ background:'#ef4444', padding:'3px 14px', display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
          <div className="sp-live-dot" />
          <span style={{ fontSize:11, color:'#fff', fontWeight:800 }}>مباشر</span>
        </div>
      )}

      {/* Main strip */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 100px 1fr', alignItems:'center', padding:'15px 18px', gap:10, cursor:'pointer' }} onClick={onExpand}>
        {/* Home */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'flex-end', gap:10 }}>
          {fin && homeGoals.length > 0 && (
            <div style={{ textAlign:'right' }}>
              {homeGoals.map((e:any,i:number)=>(
                <div key={i} style={{ fontSize:10, color:S.text2 }}>⚽ {e.notes||''} {e.minute?`${e.minute}'`:''}</div>
              ))}
            </div>
          )}
          <span style={{ fontSize:15, fontWeight:700, color:homeWon?'#16a34a':S.text, textAlign:'right' }}>{tName(match.home_team_id)}</span>
          <LogoImg name={tName(match.home_team_id)} logo={tLogo(match.home_team_id)} size={40} />
        </div>

        {/* Score / Time */}
        <div style={{ textAlign:'center' }}>
          {fin
            ? <div className="sp-score" style={{ fontSize:20 }}>{hs??0} - {as_??0}</div>
            : live
              ? <div style={{ background:'#ef4444', borderRadius:9, padding:'5px 12px', display:'inline-block' }}><span style={{ color:'#fff', fontFamily:'monospace', fontWeight:900, fontSize:18 }}>{hs??0} - {as_??0}</span></div>
              : match.match_date
                ? <div><div style={{ fontSize:16, fontWeight:800, color:S.text }}>{new Date(match.match_date).toLocaleTimeString('ar-SA',{hour:'2-digit',minute:'2-digit'})}</div><div style={{ fontSize:10, color:S.text2, marginTop:2 }}>لم تبدأ</div></div>
                : <div style={{ background:S.surface2, borderRadius:8, padding:'5px 12px', display:'inline-block' }}><span style={{ color:S.text2, fontWeight:700 }}>vs</span></div>
          }
        </div>

        {/* Away */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'flex-start', gap:10 }}>
          <LogoImg name={tName(match.away_team_id)} logo={tLogo(match.away_team_id)} size={40} />
          <span style={{ fontSize:15, fontWeight:700, color:awayWon?'#16a34a':S.text }}>{tName(match.away_team_id)}</span>
          {fin && awayGoals.length > 0 && (
            <div>
              {awayGoals.map((e:any,i:number)=>(
                <div key={i} style={{ fontSize:10, color:S.text2 }}>⚽ {e.notes||''} {e.minute?`${e.minute}'`:''}</div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Info + Actions */}
      <div style={{ padding:'8px 16px', background:S.surface2, borderTop:`1px solid ${S.border}`, display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
        {match.venue && <span style={{ fontSize:13, color:S.text2 }}>📍 {match.venue}</span>}
        {match.referee_name && <span style={{ fontSize:13, color:S.text2 }}>👤 {match.referee_name}</span>}
        <div style={{ marginRight:'auto', display:'flex', gap:8, flexWrap:'wrap' }}>
          {/* Live start/stop */}
          {!fin && (
            <button
              onClick={e=>{ e.stopPropagation(); onToggleLive(); }}
              style={{ display:'flex', alignItems:'center', gap:5, padding:'6px 12px', background:live?'rgba(239,68,68,0.15)':'rgba(239,68,68,0.08)', border:`1px solid ${live?'#ef4444':'rgba(239,68,68,0.3)'}`, borderRadius:8, color:'#ef4444', fontSize:13, fontWeight:700, cursor:'pointer' }}>
              {live ? '⏹ إيقاف المباشر' : '🔴 بدء مباشر'}
            </button>
          )}
          <button onClick={e=>{e.stopPropagation();onScore();}} style={{ display:'flex', alignItems:'center', gap:5, padding:'6px 12px', background:fin?'transparent':'#d97706', border:fin?`1px solid ${S.border}`:'none', borderRadius:8, color:fin?S.text2:'#fff', fontSize:13, fontWeight:700, cursor:'pointer' }}>
            {fin?'✏️ تعديل النتيجة':'⚡ إدخال النتيجة'}
          </button>
          <button onClick={e=>{e.stopPropagation();onEvents();}} style={{ display:'flex', alignItems:'center', gap:5, padding:'6px 12px', background:'transparent', border:`1px solid ${S.border}`, borderRadius:8, color:S.text2, fontSize:13, fontWeight:700, cursor:'pointer' }}>
            🎯 الأحداث {events?.length>0?`(${events.length})`:''}
          </button>
        </div>
      </div>
    </div>
  );
}

// LogoImg = TeamLogo (imported)

function Loader({ isDark }: { isDark:boolean }) {
  return (
    <div style={{ display:'flex', justifyContent:'center', alignItems:'center', minHeight:300 }}>
      <div style={{ width:36, height:36, borderRadius:'50%', border:`3px solid ${isDark?'rgba(255,255,255,0.1)':'#e2e8f0'}`, borderTopColor:'#d97706', animation:'spin 0.7s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

const D = { surface:'#131929', surface2:'#1a2235', border:'rgba(255,255,255,0.07)', text:'#e8eaf0', text2:'#64748b' };
const L = { surface:'#ffffff', surface2:'#f8fafc', border:'#e2e8f0', text:'#0f172a', text2:'#64748b' };
