'use client';
import { TeamLogo as LogoImg } from '../../_components/TeamLogo';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { toast } from 'sonner';
import { createPortalClient } from '@/lib/tournament-portal/auth';
import { usePortalTheme } from '../../_components/PortalShell';

type Standing = { id:string; team_id:string; group_id:string|null; category_id:string; played:number; won:number; drawn:number; lost:number; goals_for:number; goals_against:number; goal_diff:number; points:number; team?:{ name:string; logo_url:string|null } };
type Group    = { id:string; name:string; sort_order:number };
type Category = { id:string; name:string; type:string; group_count:number|null };

const GROUP_NAMES = ['أ','ب','ج','د','هـ','و','ز','ح','ط','ي'];
const API = '/api/tournament-portal/groups';

export default function GroupsPage() {
  const { id } = useParams<{ id:string }>();
  const { isDark } = usePortalTheme();
  const S = isDark ? D : L;

  const [cats,        setCats]        = useState<Category[]>([]);
  const [selCat,      setSelCat]      = useState('');
  const [groups,      setGroups]      = useState<Group[]>([]);
  const [standings,   setStandings]   = useState<Standing[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [recalc,      setRecalc]      = useState(false);
  const [newName,     setNewName]     = useState('');
  const [adding,      setAdding]      = useState(false);
  const [editId,      setEditId]      = useState<string|null>(null);
  const [editName,    setEditName]    = useState('');
  const [count,       setCount]       = useState(4);
  const [creating,    setCreating]    = useState(false);

  const supabase = createPortalClient();

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('tournament_categories').select('id,name,type,group_count').eq('tournament_id',id).order('sort_order');
      setCats(data||[]);
      if (data?.length) { setSelCat(data[0].id); if (data[0].group_count) setCount(data[0].group_count); }
      setLoading(false);
    })();
  }, [id]);

  const loadData = useCallback(async () => {
    if (!selCat) return;
    const [gj, sr] = await Promise.all([
      fetch(`${API}?tournament_id=${id}&category_id=${selCat}`).then(r=>r.json()),
      supabase.from('tournament_standings').select('*,team:tournament_teams(name,logo_url)').eq('tournament_id',id).eq('category_id',selCat).order('points',{ascending:false}).order('goal_diff',{ascending:false}),
    ]);
    setGroups(gj.groups||[]);
    setStandings(sr.data||[]);
  }, [selCat, id]);

  useEffect(() => { loadData(); }, [loadData]);

  const createGroups = async () => {
    if (count<2) return;
    setCreating(true);
    const res = await fetch(API,{ method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ tournament_id:id, category_id:selCat, count }) });
    const d = await res.json();
    if (!res.ok) toast.error(d.error); else { setGroups(d.groups||[]); toast.success(`تم إنشاء ${count} مجموعات`); }
    setCreating(false);
  };

  const addGroup = async () => {
    const name = newName.trim() || `المجموعة ${GROUP_NAMES[groups.length]||(groups.length+1)}`;
    setAdding(true);
    const res = await fetch(API,{ method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ tournament_id:id, category_id:selCat, name }) });
    const d = await res.json();
    if (!res.ok) toast.error(d.error); else { setNewName(''); setGroups(p=>[...p,d.group]); toast.success('تمت الإضافة'); }
    setAdding(false);
  };

  const deleteGroup = async (gid:string) => {
    const res = await fetch(`${API}?id=${gid}`,{ method:'DELETE' });
    if (!res.ok) { const d=await res.json(); toast.error(d.error); return; }
    setGroups(p=>p.filter(g=>g.id!==gid)); toast.success('تم الحذف');
  };

  const saveGroupName = async (gid:string) => {
    if (!editName.trim()) return;
    const res = await fetch(API,{ method:'PATCH', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ id:gid, name:editName.trim() }) });
    if (!res.ok) { const d=await res.json(); toast.error(d.error); return; }
    setGroups(p=>p.map(g=>g.id===gid?{...g,name:editName.trim()}:g)); setEditId(null); toast.success('تم التحديث');
  };

  const recalculate = async () => {
    setRecalc(true);
    try {
      const { data:ms } = await supabase.from('tournament_matches').select('id,home_team_id,away_team_id,home_score,away_score,group_id').eq('tournament_id',id).eq('category_id',selCat).eq('status','completed');
      if (!ms?.length) { toast.info('لا توجد مباريات منتهية'); setRecalc(false); return; }
      const { data:ts } = await supabase.from('tournament_teams').select('id,group_id').eq('tournament_id',id).eq('category_id',selCat).eq('status','approved');
      const map: Record<string,any> = {};
      for (const t of ts||[]) map[t.id]={ team_id:t.id, group_id:t.group_id, played:0, won:0, drawn:0, lost:0, goals_for:0, goals_against:0 };
      for (const m of ms) {
        const hs=m.home_score??0, as_=m.away_score??0;
        if (map[m.home_team_id]) { map[m.home_team_id].played++; map[m.home_team_id].goals_for+=hs; map[m.home_team_id].goals_against+=as_; hs>as_?map[m.home_team_id].won++:hs===as_?map[m.home_team_id].drawn++:map[m.home_team_id].lost++; }
        if (map[m.away_team_id]) { map[m.away_team_id].played++; map[m.away_team_id].goals_for+=as_; map[m.away_team_id].goals_against+=hs; as_>hs?map[m.away_team_id].won++:as_===hs?map[m.away_team_id].drawn++:map[m.away_team_id].lost++; }
      }
      for (const s of Object.values(map))
        await supabase.from('tournament_standings').upsert({ tournament_id:id, category_id:selCat, team_id:s.team_id, group_id:s.group_id, played:s.played, won:s.won, drawn:s.drawn, lost:s.lost, goals_for:s.goals_for, goals_against:s.goals_against, goal_diff:s.goals_for-s.goals_against, points:s.won*3+s.drawn },{ onConflict:'tournament_id,category_id,team_id' });
      await loadData(); toast.success('تم تحديث الترتيب');
    } catch (e:any) { toast.error(e.message); }
    setRecalc(false);
  };

  if (loading) return <Loader isDark={isDark} />;

  const curCat   = cats.find(c=>c.id===selCat);
  const allLeague= [...standings].sort((a,b)=>b.points-a.points||b.goal_diff-a.goal_diff);
  const byGroup  = (gid:string) => standings.filter(s=>s.group_id===gid).sort((a,b)=>b.points-a.points||b.goal_diff-a.goal_diff);

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:14 }}>

      {/* Top bar */}
      <div style={{ background:S.surface, border:`1px solid ${S.border}`, borderRadius:14, padding:'12px 16px', display:'flex', alignItems:'center', flexWrap:'wrap', gap:10 }}>
        <div style={{ display:'flex', gap:6, flex:1, flexWrap:'wrap' }}>
          {cats.map(c=>(
            <button key={c.id} onClick={()=>setSelCat(c.id)} className={`sp-cat-tab${selCat===c.id?' active':''}`}>{c.name}</button>
          ))}
        </div>
        <button onClick={recalculate} disabled={recalc} className="sp-btn sp-btn-sm" style={{ background:'#4f46e5', color:'#fff', border:'none' }}>
          {recalc?'جاري الحساب...':'↻ تحديث الترتيب'}
        </button>
        <button onClick={()=>window.open(`/tournament-portal/${id}/print?type=standings`,'_blank')} className="sp-btn sp-btn-ghost sp-btn-sm">🖨️</button>
      </div>

      {/* Group management */}
      <div className="sp-card" style={{ background:S.surface, borderColor:S.border }}>
        <div className="sp-section-header">
          <span style={{ fontSize:14, fontWeight:700, color:'#fff', flex:1 }}>⚙️ إدارة المجموعات</span>
          <span style={{ fontSize:11, color:'rgba(255,255,255,0.5)' }}>{groups.length} مجموعة</span>
        </div>
        <div style={{ padding:'14px 16px', display:'flex', flexDirection:'column', gap:10 }}>
          {/* Batch */}
          <div style={{ display:'flex', alignItems:'center', gap:10, background:S.surface2, borderRadius:10, padding:'10px 14px', border:`1px solid ${S.border}` }}>
            <span style={{ fontSize:12, color:S.text2, fontWeight:600 }}>إنشاء دفعة:</span>
            <input type="number" min={2} max={16} className="sp-input sp-input-sm" style={{ width:70 }} value={count} onChange={e=>setCount(+e.target.value||4)} />
            <button onClick={createGroups} disabled={creating} className="sp-btn sp-btn-primary sp-btn-sm">
              {creating?'...':groups.length>0?'إعادة إنشاء':'+ إنشاء'}
            </button>
          </div>
          {/* Add single */}
          <div style={{ display:'flex', gap:8 }}>
            <input className="sp-input sp-input-sm" style={{ flex:1 }} value={newName} onChange={e=>setNewName(e.target.value)} placeholder={`المجموعة ${GROUP_NAMES[groups.length]||(groups.length+1)}`} onKeyDown={e=>e.key==='Enter'&&addGroup()} />
            <button onClick={addGroup} disabled={adding} className="sp-btn sp-btn-ghost sp-btn-sm">+ إضافة</button>
          </div>
          {/* List */}
          {groups.map(g=>(
            <div key={g.id} style={{ display:'flex', alignItems:'center', gap:8, background:S.surface2, borderRadius:9, padding:'8px 12px', border:`1px solid ${S.border}` }}>
              {editId===g.id
                ? <>
                    <input className="sp-input sp-input-sm" style={{ flex:1 }} value={editName} onChange={e=>setEditName(e.target.value)} onKeyDown={e=>e.key==='Enter'&&saveGroupName(g.id)} autoFocus />
                    <button onClick={()=>saveGroupName(g.id)} style={{ width:28,height:28,borderRadius:7,background:'#16a34a',border:'none',color:'#fff',cursor:'pointer',fontSize:14 }}>✓</button>
                    <button onClick={()=>setEditId(null)} style={{ width:28,height:28,borderRadius:7,background:S.surface3,border:`1px solid ${S.border}`,color:S.text2,cursor:'pointer',fontSize:14 }}>✕</button>
                  </>
                : <>
                    <span style={{ flex:1, fontSize:13, fontWeight:600, color:S.text }}>{g.name}</span>
                    <button onClick={()=>{setEditId(g.id);setEditName(g.name)}} style={{ width:28,height:28,borderRadius:7,background:'transparent',border:`1px solid ${S.border}`,color:S.text2,cursor:'pointer',fontSize:13 }}>✏️</button>
                    <button onClick={()=>deleteGroup(g.id)} style={{ width:28,height:28,borderRadius:7,background:'transparent',border:`1px solid ${S.border}`,color:'#ef4444',cursor:'pointer',fontSize:13 }}>🗑</button>
                  </>
              }
            </div>
          ))}
        </div>
      </div>

      {/* Standings */}
      {curCat?.type==='league'
        ? <StandingsTable title="ترتيب الدوري" rows={allLeague} S={S} isDark={isDark} />
        : groups.map(g => byGroup(g.id).length>0 && (
            <StandingsTable key={g.id} title={g.name} rows={byGroup(g.id)} S={S} isDark={isDark} />
          ))
      }
    </div>
  );
}

function StandingsTable({ title, rows, S, isDark }: { title:string; rows:Standing[]; S:any; isDark:boolean }) {
  return (
    <div className="sp-card" style={{ background:S.surface, borderColor:S.border }}>
      <div className="sp-section-header">
        <span style={{ fontSize:14, fontWeight:800, color:'#fff' }}>📊 {title}</span>
        <span style={{ fontSize:11, color:'rgba(255,255,255,0.4)', marginRight:'auto' }}>{rows.length} فريق</span>
      </div>
      {rows.length===0
        ? <div style={{ padding:'32px', textAlign:'center', color:S.text2, fontSize:13 }}>لا يوجد ترتيب — أدخل نتائج المباريات ثم اضغط «تحديث الترتيب»</div>
        : <table className="sp-table" style={{ width:'100%' }}>
            <thead className="sp-table-head">
              <tr>
                <th style={{ width:36 }}>#</th>
                <th className="text-start" style={{ minWidth:150 }}>الفريق</th>
                <th>لعب</th><th>فاز</th><th>تع</th><th>خسر</th>
                <th>ل:ع</th><th>فارق</th>
                <th style={{ fontSize:12 }}>نقاط</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((s,i)=>{
                const mc=['rank-1','rank-2','rank-3'][i]||'';
                return (
                  <tr key={s.id} className={mc}>
                    <td>
                      {i<3
                        ? <div style={{ width:22,height:22,borderRadius:6,background:['#f59e0b','#94a3b8','#cd7f32'][i],display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto' }}><span style={{ fontSize:11,fontWeight:800,color:'#fff' }}>{i+1}</span></div>
                        : <span style={{ fontSize:12,color:S.text2 }}>{i+1}</span>
                      }
                    </td>
                    <td className="text-start">
                      <div style={{ display:'flex',alignItems:'center',gap:8 }}>
                        <LogoImg name={s.team?.name||'?'} logo={s.team?.logo_url} size={26} />
                        <span style={{ fontSize:13,fontWeight:700,color:S.text }}>{s.team?.name||'—'}</span>
                      </div>
                    </td>
                    <td style={{ color:S.text2 }}>{s.played}</td>
                    <td><span style={{ fontWeight:700,color:'#4ade80' }}>{s.won}</span></td>
                    <td style={{ color:S.text2 }}>{s.drawn}</td>
                    <td><span style={{ fontWeight:700,color:'#f87171' }}>{s.lost}</span></td>
                    <td style={{ fontFamily:'monospace',color:S.text2,fontSize:12 }}>{s.goals_for}:{s.goals_against}</td>
                    <td><span style={{ fontWeight:700,color:s.goal_diff>0?'#4ade80':s.goal_diff<0?'#f87171':S.text2 }}>{s.goal_diff>0?`+${s.goal_diff}`:s.goal_diff}</span></td>
                    <td><span style={{ fontSize:15,fontWeight:900,color:S.text }}>{s.points}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
      }
    </div>
  );
}

// LogoImg = TeamLogo (imported)
function Loader({ isDark }: { isDark:boolean }) {
  return <div style={{ display:'flex',justifyContent:'center',alignItems:'center',minHeight:300 }}><div style={{ width:36,height:36,borderRadius:'50%',border:`3px solid ${isDark?'rgba(255,255,255,0.1)':'#e2e8f0'}`,borderTopColor:'#d97706',animation:'spin 0.7s linear infinite' }} /><style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style></div>;
}

const D = { surface:'#131929', surface2:'#1a2235', surface3:'#212d44', border:'rgba(255,255,255,0.07)', text:'#e8eaf0', text2:'#64748b' };
const L = { surface:'#ffffff', surface2:'#f8fafc', surface3:'#f1f5f9', border:'#e2e8f0', text:'#0f172a', text2:'#64748b' };
