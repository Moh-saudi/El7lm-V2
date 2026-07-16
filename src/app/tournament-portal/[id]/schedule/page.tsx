'use client';
import { TeamLogo as LogoImg } from '../../_components/TeamLogo';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { DatePicker } from 'antd';
import dayjs from 'dayjs';
import { toast } from 'sonner';
import { createPortalClient, portalAuthenticatedFetch } from '@/lib/tournament-portal/auth';
import { usePortalTheme } from '../../_components/PortalShell';
import { useTranslation } from '@/lib/i18n';

type Category = { id: string; name: string; type: string; group_count: number | null };
type Team     = { id: string; name: string; logo_url: string | null };
type Group    = { id: string; name: string };
type Match    = {
  id: string; round: string; match_number: number | null;
  home_team_id: string | null; away_team_id: string | null;
  home_score: number | null; away_score: number | null;
  match_date: string | null; venue: string | null; referee_name: string | null;
  status: string; group_id: string | null; category_id: string | null;
};
type Draft = { match_date: string; venue: string; referee_name: string; home_team_id: string; away_team_id: string };

const ROUND_ORDER = ['league','group_stage','R128','R64','R32','R16','QF','SF','F','3rd'];
const ROUND_COLOR: Record<string,string> = { F:'#f59e0b', SF:'#8b5cf6', QF:'#3b82f6', '3rd':'#f97316', R16:'#06b6d4', group_stage:'#16a34a', league:'#16a34a' };

export default function SchedulePage() {
  const { getTranslations } = useTranslation();
  const copy = getTranslations<any>('tournamentSchedule');
  const analytics = getTranslations<any>('tournamentAnalytics');
  const bracket = getTranslations<any>('tournamentBracket');
  const portal = getTranslations<any>('tournamentPortal');
  const roundLabels = { ...analytics.rounds, ...bracket.rounds, league: portal.dashboard.types.league };
  const { id }    = useParams<{ id: string }>();
  const { isDark } = usePortalTheme();
  const S = isDark ? D : L;

  const [categories,  setCategories]  = useState<Category[]>([]);
  const [selectedCat, setSelectedCat] = useState('');
  const [teams,       setTeams]       = useState<Team[]>([]);
  const [groups,      setGroups]      = useState<Group[]>([]);
  const [matches,     setMatches]     = useState<Match[]>([]);
  const [referees,    setReferees]    = useState<{id:string;name:string;level:string|null}[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [generating,  setGenerating]  = useState(false);
  const [saving,      setSaving]      = useState(false);
  const [drafts,      setDrafts]      = useState<Record<string, Partial<Draft>>>({});
  const [editing,     setEditing]     = useState<Set<string>>(new Set());
  const [confirmGen,  setConfirmGen]  = useState(false);

  const supabase = createPortalClient();

  const loadAll = useCallback(async () => {
    if (!selectedCat) return;
    const [tR, gR, mR] = await Promise.all([
      supabase.from('tournament_teams').select('id,name,logo_url').eq('tournament_id', id).eq('status','approved').order('name'),
      supabase.from('tournament_groups').select('id,name').eq('tournament_id', id).eq('category_id', selectedCat).order('sort_order'),
      supabase.from('tournament_matches').select('*').eq('tournament_id', id).eq('category_id', selectedCat).order('match_number', { ascending: true }),
    ]);
    setTeams(tR.data || []);
    setGroups(gR.data || []);
    setMatches(mR.data || []);
    setDrafts({}); setEditing(new Set());
  }, [selectedCat, id]);

  useEffect(() => {
    (async () => {
      const [catsRes, refsRes] = await Promise.all([
        supabase.from('tournament_categories').select('id,name,type,group_count').eq('tournament_id', id).order('sort_order'),
        portalAuthenticatedFetch(`/api/tournament-portal/referees?tournament_id=${id}`).then(r => r.json()),
      ]);
      setCategories(catsRes.data || []);
      if (catsRes.data?.length) setSelectedCat(catsRes.data[0].id);
      setReferees(refsRes.referees || []);
      setLoading(false);
    })();
  }, [id]);
  useEffect(() => { loadAll(); }, [loadAll]);

  const generate = async () => {
    setConfirmGen(false); setGenerating(true);
    try {
      const res = await portalAuthenticatedFetch('/api/tournament-portal/generate-fixtures', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ tournament_id:id, category_id:selectedCat }) });
      const d = await res.json();
      if (!res.ok) { toast.error(d.error); return; }
      toast.success(copy.generated.replace('{count}', d.generated));
      await loadAll();
    } catch (e: any) { toast.error(e.message); }
    setGenerating(false);
  };

  const startEdit = (m: Match) => {
    setEditing(prev => new Set(prev).add(m.id));
    setDrafts(prev => ({ ...prev, [m.id]: { match_date:m.match_date||'', venue:m.venue||'', referee_name:m.referee_name||'', home_team_id:m.home_team_id||'', away_team_id:m.away_team_id||'' } }));
  };
  const cancelEdit = (mid: string) => {
    setEditing(prev => { const s=new Set(prev); s.delete(mid); return s; });
    setDrafts(prev => { const d={...prev}; delete d[mid]; return d; });
  };
  const patch = (mid: string, k: keyof Draft, v: string) =>
    setDrafts(prev => ({ ...prev, [mid]: { ...prev[mid], [k]:v } }));

  const saveAll = async () => {
    const dirty = Object.entries(drafts).filter(([mid]) => editing.has(mid));
    if (!dirty.length) { toast.info(copy.noChanges); return; }
    setSaving(true);
    try {
      const res = await portalAuthenticatedFetch('/api/tournament-portal/save-schedule', { method:'PATCH', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ tournament_id:id, matches: dirty.map(([mid,d]) => ({ id:mid, ...d })) }) });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error); return; }
      toast.success(copy.saved.replace('{count}', data.updated));
      await loadAll();
    } catch (e: any) { toast.error(e.message); }
    setSaving(false);
  };

  const tName = (tid: string|null) => teams.find(t=>t.id===tid)?.name || 'TBD';
  const tLogo = (tid: string|null) => teams.find(t=>t.id===tid)?.logo_url;
  const gName = (gid: string|null) => groups.find(g=>g.id===gid)?.name || '';
  const teamOpts = teams.map(t => ({ value:t.id, label:t.name }));
  const currentCat = categories.find(c=>c.id===selectedCat);
  const dirtyCount = Object.keys(drafts).filter(mid=>editing.has(mid)).length;

  const grouped = useMemo(() => {
    const map: Record<string, Match[]> = {};
    for (const m of matches) (map[m.round||'other']=map[m.round||'other']||[]).push(m);
    return map;
  }, [matches]);
  const sortedRounds = ROUND_ORDER.filter(r => grouped[r]);

  if (loading) return <Loader isDark={isDark} />;

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>

      {/* ── Top bar ── */}
      <div style={{ background:S.surface, border:`1px solid ${S.border}`, borderRadius:14, padding:'13px 18px', display:'flex', alignItems:'center', flexWrap:'wrap', gap:12 }}>
        {/* Category tabs */}
        <div style={{ display:'flex', gap:6, flexWrap:'wrap', flex:1 }}>
          {categories.map(c => (
            <button key={c.id} onClick={()=>setSelectedCat(c.id)} className={`sp-cat-tab${selectedCat===c.id?' active':''}`}>{c.name}</button>
          ))}
        </div>
        {/* Actions */}
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          {dirtyCount > 0 && (
            <button onClick={saveAll} disabled={saving} className="sp-btn sp-btn-success sp-btn-sm">
              💾 {copy.save} ({dirtyCount})
            </button>
          )}
          {confirmGen
            ? <div style={{ display:'flex', gap:6, alignItems:'center' }}>
                <span style={{ fontSize:12, color:S.text2 }}>{matches.length > 0 ? copy.deleteWarning : copy.generateQuestion}</span>
                <button onClick={generate} disabled={generating} className="sp-btn sp-btn-danger sp-btn-sm">{copy.yes}</button>
                <button onClick={()=>setConfirmGen(false)} className="sp-btn sp-btn-ghost sp-btn-sm">{copy.no}</button>
              </div>
            : <button onClick={()=>setConfirmGen(true)} disabled={generating} className={`sp-btn sp-btn-sm ${matches.length===0?'sp-btn-primary':'sp-btn-ghost'}`}>
                ⚡ {generating ? copy.generating : matches.length===0 ? copy.generate : copy.regenerate}
              </button>
          }
          <button onClick={loadAll} className="sp-btn sp-btn-ghost sp-btn-icon" style={{ fontSize:13 }}>↻</button>
          <button onClick={()=>window.open(`/tournament-portal/${id}/print?type=schedule`,'_blank')} className="sp-btn sp-btn-ghost sp-btn-sm" title={copy.print}>🖨️</button>
        </div>
      </div>

      {/* ── Stats strip ── */}
      {matches.length > 0 && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10 }} className="sp-grid-4col">
          {[
            { lbl:copy.total, v:matches.length, color:S.text },
            { lbl:copy.dated, v:matches.filter(m=>m.match_date).length, color:'#16a34a'},
            { lbl:copy.venueSet, v:matches.filter(m=>m.venue).length, color:'#3b82f6'},
            { lbl:copy.completed, v:matches.filter(m=>m.status==='completed').length, color:S.text2},
          ].map(s => (
            <div key={s.lbl} style={{ background:S.surface, border:`1px solid ${S.border}`, borderRadius:12, padding:'12px 16px', textAlign:'center' }}>
              <div style={{ fontSize:22, fontWeight:900, color:s.color, lineHeight:1 }}>{s.v}</div>
              <div style={{ fontSize:11, color:S.text2, marginTop:4 }}>{s.lbl}</div>
            </div>
          ))}
        </div>
      )}

      {/* ── Empty state ── */}
      {matches.length === 0 && (
        <div style={{ background:S.surface, border:`2px dashed ${S.border}`, borderRadius:20, padding:'64px 24px', textAlign:'center' }}>
          <div style={{ fontSize:44, marginBottom:16 }}>📅</div>
          <div style={{ fontSize:17, fontWeight:700, color:S.text, marginBottom:8 }}>{copy.empty}</div>
          <div style={{ fontSize:13, color:S.text2, marginBottom:24 }}>
            {currentCat?.type === 'league' && copy.leagueHelp}
            {currentCat?.type === 'knockout' && copy.knockoutHelp}
            {(currentCat?.type === 'groups_knockout'||currentCat?.type==='groups') && (
              <span>{copy.groupsHelp}</span>
            )}
          </div>
          <button onClick={()=>setConfirmGen(true)} className="sp-btn sp-btn-primary" style={{ fontSize:15, padding:'12px 28px', borderRadius:14 }}>
            ⚡ {copy.generateNow}
          </button>
        </div>
      )}

      {/* ── Rounds ── */}
      {sortedRounds.map(round => {
        const roundMatches = grouped[round];
        const rc = ROUND_COLOR[round] || '#64748b';
        const byGroup: Record<string, Match[]> = {};
        if (round === 'group_stage') {
          for (const m of roundMatches) (byGroup[m.group_id||'none']=byGroup[m.group_id||'none']||[]).push(m);
        }

        return (
          <div key={round}>
            {/* Round header */}
            <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:10 }}>
              <div style={{ height:2, flex:1, background:`${rc}20`, borderRadius:1 }} />
              <div style={{ padding:'5px 16px', background:`${rc}15`, border:`1px solid ${rc}35`, borderRadius:20, display:'flex', alignItems:'center', gap:8 }}>
                {round==='F' && <span>🏆</span>}
                <span style={{ fontSize:12, fontWeight:800, color:rc }}>{roundLabels[round]||round}</span>
                <span style={{ fontSize:10, color:`${rc}80` }}>{roundMatches.length} {copy.match}</span>
              </div>
              <div style={{ height:2, flex:1, background:`${rc}20`, borderRadius:1 }} />
            </div>

            <div className="sp-card sp-fade-in" style={{ background:S.surface, borderColor:S.border }}>
              {round === 'group_stage'
                ? Object.entries(byGroup).map(([gid, gMs]) => (
                    <div key={gid}>
                      <div style={{ padding:'7px 16px', background:`${S.surface2}`, borderBottom:`1px solid ${S.border}` }}>
                        <span style={{ fontSize:11, fontWeight:700, color:'#3b82f6', background:'rgba(59,130,246,0.12)', padding:'2px 10px', borderRadius:6 }}>{gName(gid)}</span>
                      </div>
                      {gMs.map(m => <MatchRow key={m.id} match={m} teams={teams} teamOpts={teamOpts} referees={referees} draft={drafts[m.id]} isEditing={editing.has(m.id)} S={S} isDark={isDark} onEdit={()=>startEdit(m)} onCancel={()=>cancelEdit(m.id)} onPatch={(k,v)=>patch(m.id,k as keyof Draft,v)} />)}
                    </div>
                  ))
                : roundMatches.map(m => <MatchRow key={m.id} match={m} teams={teams} teamOpts={teamOpts} referees={referees} draft={drafts[m.id]} isEditing={editing.has(m.id)} S={S} isDark={isDark} onEdit={()=>startEdit(m)} onCancel={()=>cancelEdit(m.id)} onPatch={(k,v)=>patch(m.id,k as keyof Draft,v)} />)
              }
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Match Row ─────────────────────────────────────────────────────────────────
function MatchRow({ match, teams, teamOpts, referees, draft, isEditing, S, isDark, onEdit, onCancel, onPatch }: any) {
  const { locale, getTranslations } = useTranslation();
  const copy = getTranslations<any>('tournamentSchedule');
  const tName = (tid: string|null) => teams.find((t: any)=>t.id===tid)?.name || 'TBD';
  const tLogo = (tid: string|null) => teams.find((t: any)=>t.id===tid)?.logo_url;
  const homeId = isEditing ? (draft?.home_team_id||match.home_team_id) : match.home_team_id;
  const awayId = isEditing ? (draft?.away_team_id||match.away_team_id) : match.away_team_id;
  const fin = match.status === 'completed';

  const statusDot = ({ completed:'#16a34a', live:'#ef4444', scheduled:'#475569', postponed:'#f59e0b', cancelled:'#374151' } as any)[match.status] || '#475569';

  return (
    <div style={{ background:isEditing?(isDark?'rgba(59,130,246,0.05)':'rgba(59,130,246,0.03)'):'transparent', borderBottom:`1px solid ${S.border}`, transition:'background 0.2s' }}>
      {/* Main row */}
      <div style={{ display:'grid', gridTemplateColumns:'38px 1fr 100px 1fr 38px', alignItems:'center', padding:'13px 16px', gap:10 }}>
        {/* Num + dot */}
        <div style={{ textAlign:'center' }}>
          <div style={{ width:7, height:7, borderRadius:'50%', background:statusDot, margin:'0 auto 4px' }} />
          <span style={{ fontSize:10, color:S.text2 }}>#{match.match_number||'—'}</span>
        </div>

        {/* Home */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'flex-end', gap:9 }}>
          {isEditing && !fin
            ? <select className="sp-select" style={{ maxWidth:160, padding:'6px 10px', fontSize:12 }} value={draft?.home_team_id||match.home_team_id||''} onChange={e=>onPatch('home_team_id',e.target.value)}>
                <option value="">{copy.home}</option>
                {teamOpts.map((t: any)=><option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            : <>
                <span style={{ fontSize:14, fontWeight:700, color:S.text, textAlign:'right' }}>{tName(homeId)}</span>
                <LogoImg name={tName(homeId)} logo={tLogo(homeId)} size={34} />
              </>
          }
        </div>

        {/* Score / Time */}
        <div style={{ textAlign:'center' }}>
          {fin
            ? <div className="sp-score">{match.home_score??0} - {match.away_score??0}</div>
            : match.match_date
              ? <div>
                  <div style={{ fontSize:15, fontWeight:800, color:S.text }}>{new Date(match.match_date).toLocaleTimeString(locale,{hour:'2-digit',minute:'2-digit'})}</div>
                  <div style={{ fontSize:10, color:S.text2, marginTop:2 }}>{new Date(match.match_date).toLocaleDateString(locale,{month:'short',day:'numeric'})}</div>
                </div>
              : <div style={{ background:S.surface2, borderRadius:8, padding:'5px 12px', display:'inline-block' }}>
                  <span style={{ fontWeight:700, color:S.text2 }}>vs</span>
                </div>
          }
        </div>

        {/* Away */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'flex-start', gap:9 }}>
          {isEditing && !fin
            ? <select className="sp-select" style={{ maxWidth:160, padding:'6px 10px', fontSize:12 }} value={draft?.away_team_id||match.away_team_id||''} onChange={e=>onPatch('away_team_id',e.target.value)}>
                <option value="">{copy.away}</option>
                {teamOpts.map((t: any)=><option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            : <>
                <LogoImg name={tName(awayId)} logo={tLogo(awayId)} size={34} />
                <span style={{ fontSize:14, fontWeight:700, color:S.text }}>{tName(awayId)}</span>
              </>
          }
        </div>

        {/* Edit btn */}
        {!fin && (
          isEditing
            ? <button onClick={onCancel} style={{ width:30, height:30, borderRadius:7, background:'transparent', border:`1px solid ${S.border}`, color:S.text2, cursor:'pointer', fontSize:16, display:'flex', alignItems:'center', justifyContent:'center' }}>✕</button>
            : <button onClick={onEdit} style={{ width:30, height:30, borderRadius:7, background:'transparent', border:`1px solid ${S.border}`, color:S.text2, cursor:'pointer', fontSize:13, display:'flex', alignItems:'center', justifyContent:'center' }}>✏️</button>
        )}
      </div>

      {/* Edit fields */}
      {isEditing && (
        <div style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 16px 12px', flexWrap:'wrap', borderTop:`1px solid ${S.border}` }}>
          <DatePicker showTime={{ format:'HH:mm' }} format="YYYY-MM-DD HH:mm" size="small" style={{ width:185 }} placeholder={copy.date}
            value={draft?.match_date ? dayjs(draft.match_date) : null}
            onChange={d => onPatch('match_date', d ? d.toISOString() : '')} />
          <input className="sp-input sp-input-sm" style={{ width:150 }} placeholder={`📍 ${copy.venue}`} value={draft?.venue||''} onChange={e=>onPatch('venue',e.target.value)} />
          {referees.length > 0
            ? <select className="sp-select" style={{ width:140, fontSize:12, padding:'4px 8px' }} value={draft?.referee_name||''} onChange={e=>onPatch('referee_name',e.target.value)}>
                <option value="">👤 {copy.selectReferee}</option>
                {referees.map(r=><option key={r.id} value={r.name}>{r.name}{r.level?` · ${r.level}`:''}</option>)}
              </select>
            : <input className="sp-input sp-input-sm" style={{ width:130 }} placeholder={`👤 ${copy.referee}`} value={draft?.referee_name||''} onChange={e=>onPatch('referee_name',e.target.value)} />
          }
        </div>
      )}

      {/* Info bar */}
      {!isEditing && (match.match_date||match.venue||match.referee_name) && (
        <div style={{ padding:'7px 16px', background:S.surface2, borderTop:`1px solid ${S.border}`, display:'flex', gap:16, flexWrap:'wrap' }}>
          {match.match_date && <span style={{ fontSize:11, color:S.text2 }}>📅 {new Date(match.match_date).toLocaleDateString(locale,{weekday:'short',month:'short',day:'numeric'})} — {new Date(match.match_date).toLocaleTimeString(locale,{hour:'2-digit',minute:'2-digit'})}</span>}
          {match.venue && <span style={{ fontSize:11, color:S.text2 }}>📍 {match.venue}</span>}
          {match.referee_name && <span style={{ fontSize:11, color:S.text2 }}>👤 {match.referee_name}</span>}
        </div>
      )}
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
