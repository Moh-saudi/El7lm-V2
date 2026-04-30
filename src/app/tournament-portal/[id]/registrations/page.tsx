'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Modal, Select as AntSelect, Popconfirm } from 'antd';
import { toast } from 'sonner';
import { createPortalClient } from '@/lib/tournament-portal/auth';
import { usePortalTheme } from '../../_components/PortalShell';
import { TeamLogo } from '../../_components/TeamLogo';
import { resolveImg } from '../../_utils/img';

type Team = {
  id: string; name: string; status: string; logo_url: string | null;
  club_name: string | null; city: string | null; country: string | null;
  contact_name: string | null; contact_phone: string | null; contact_email: string | null;
  notes: string | null; registered_at: string; approved_at: string | null;
  seed: number | null; category_id: string | null; players_count: number;
  registration?: { payment_status: string; payment_amount: number | null } | null;
};
type Player = { id: string; player_name: string; position: string | null; jersey_number: number | null; phone: string | null; platform_player_id: string | null };
type Category = { id: string; name: string };
type PResult = { platform_user_id?: string; platform_player_id?: string; type: string; name: string; email?: string; phone?: string; city?: string; position?: string; date_of_birth?: string; logo_url?: string; account_type?: string };

const STATUS_DOT: Record<string,string> = { pending:'#f59e0b', approved:'#16a34a', rejected:'#ef4444', withdrawn:'#94a3b8' };
const STATUS_LBL: Record<string,string> = { pending:'معلق', approved:'مقبول', rejected:'مرفوض', withdrawn:'انسحب' };
const PAY_COLOR:  Record<string,string> = { pending:'#f59e0b', paid:'#16a34a', partial:'#3b82f6', free:'#94a3b8', refunded:'#8b5cf6' };
const PAY_LBL:   Record<string,string> = { pending:'لم يدفع', paid:'مدفوع', partial:'جزئي', free:'مجاني', refunded:'مُسترد' };
const POSITIONS = ['حارس مرمى','مدافع','لاعب وسط','مهاجم','بديل'];

export default function RegistrationsPage() {
  const { id }     = useParams<{ id: string }>();
  const { isDark } = usePortalTheme();
  const S = isDark ? D : L;

  const [teams,        setTeams]        = useState<Team[]>([]);
  const [cats,         setCats]         = useState<Category[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [search,       setSearch]       = useState('');
  const [statusF,      setStatusF]      = useState('all');
  const [catF,         setCatF]         = useState('all');
  const [expanded,     setExpanded]     = useState<string | null>(null);
  const [expandTab,    setExpandTab]    = useState<'info'|'players'|'import'>('info');
  const [acting,       setActing]       = useState<string | null>(null);

  // Players
  const [playerMap,    setPlayerMap]    = useState<Record<string, Player[]>>({});
  const [loadingPl,    setLoadingPl]    = useState<string | null>(null);
  const [newPlayer,    setNewPlayer]    = useState({ name:'', position:'', number:'', phone:'' });

  // Platform search
  const [importQ,      setImportQ]      = useState('');
  const [importType,   setImportType]   = useState('all');
  const [importRes,    setImportRes]    = useState<PResult[]>([]);
  const [searching,    setSearching]    = useState(false);
  const [importingId,  setImportingId]  = useState<string | null>(null);

  // Add team modal
  const [showAdd,      setShowAdd]      = useState(false);
  const [addMode,      setAddMode]      = useState<'choose'|'manual'|'import'>('choose');
  const [globalQ,      setGlobalQ]      = useState('');
  const [globalType,   setGlobalType]   = useState('club');
  const [globalRes,    setGlobalRes]    = useState<PResult[]>([]);
  const [globalSearch, setGlobalSearch] = useState(false);
  const [selCatId,     setSelCatId]     = useState('');
  const [manual,       setManual]       = useState({ name:'', phone:'', city:'', category_id:'' });

  const supabase = createPortalClient();

  const fetchData = useCallback(async () => {
    const [tR, cR] = await Promise.all([
      supabase.from('tournament_teams').select('*, registration:tournament_team_regs(payment_status,payment_amount), players:tournament_players(id)').eq('tournament_id', id).order('registered_at', { ascending: false }),
      supabase.from('tournament_categories').select('id,name').eq('tournament_id', id),
    ]);
    setTeams((tR.data || []).map((t: any) => ({ ...t, registration: t.registration?.[0] || null, players_count: t.players?.length || 0 })));
    setCats(cR.data || []);
    setLoading(false);
  }, [id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const act = async (teamId: string, status: string) => {
    setActing(teamId);
    const team = teams.find(t => t.id === teamId);
    await supabase.from('tournament_teams').update({ status, ...(status === 'approved' ? { approved_at: new Date().toISOString() } : {}) }).eq('id', teamId);
    setTeams(p => p.map(t => t.id === teamId ? { ...t, status } : t));

    // WhatsApp auto-notification
    if (team?.contact_phone) {
      const phone = team.contact_phone.replace(/\D/g, '');
      const msg = status === 'approved'
        ? `مرحباً ${team.name} 🎉\nيسعدنا إعلامكم بقبول فريقكم في البطولة.\nبالتوفيق للجميع! 🏆`
        : `مرحباً ${team.name}\nنأسف لإعلامكم بأنه لم يتم قبول طلب تسجيل فريقكم في البطولة هذه المرة.\nشكراً لاهتمامكم.`;
      const waLink = `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
      toast.success(
        <span>
          {status === 'approved' ? '✅ تم القبول' : '❌ تم الرفض'}
          {' — '}
          <a href={waLink} target="_blank" rel="noopener noreferrer" style={{ color:'#25d366', fontWeight:700, textDecoration:'underline' }}>
            أرسل واتساب →
          </a>
        </span>
      );
    } else {
      toast.success(status === 'approved' ? 'تم القبول' : status === 'rejected' ? 'تم الرفض' : 'تم التحديث');
    }
    setActing(null);
  };

  const updatePay = async (teamId: string, v: string) => {
    await supabase.from('tournament_team_regs').upsert({ tournament_id: id, team_id: teamId, payment_status: v }, { onConflict: 'team_id' });
    setTeams(p => p.map(t => t.id === teamId ? { ...t, registration: { ...t.registration, payment_status: v } as any } : t));
    toast.success('تم تحديث الدفع');
  };

  const loadPlayers = async (teamId: string) => {
    if (playerMap[teamId]) return;
    setLoadingPl(teamId);
    const res = await fetch(`/api/tournament-portal/team-players?team_id=${teamId}`);
    const d = await res.json();
    setPlayerMap(p => ({ ...p, [teamId]: d.players || [] }));
    setLoadingPl(null);
  };

  const addPlayer = async (teamId: string) => {
    if (!newPlayer.name.trim()) { toast.error('اسم اللاعب مطلوب'); return; }
    setActing('pl_' + teamId);
    const res = await fetch('/api/tournament-portal/team-players', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ team_id:teamId, tournament_id:id, player_name:newPlayer.name, position:newPlayer.position||null, jersey_number:newPlayer.number?+newPlayer.number:null, phone:newPlayer.phone||null }) });
    const d = await res.json();
    if (!res.ok) toast.error(d.error);
    else { setPlayerMap(p => ({ ...p, [teamId]:[...(p[teamId]||[]), d.player] })); setNewPlayer({ name:'', position:'', number:'', phone:'' }); toast.success('تمت الإضافة'); }
    setActing(null);
  };

  const deletePlayer = async (teamId: string, playerId: string) => {
    await fetch(`/api/tournament-portal/team-players?player_id=${playerId}`, { method:'DELETE' });
    setPlayerMap(p => ({ ...p, [teamId]: p[teamId].filter(x => x.id !== playerId) }));
    toast.success('تم الحذف');
  };

  const searchImport = async () => {
    if (importQ.length < 2) return;
    setSearching(true);
    const res = await fetch(`/api/tournament-portal/search-platform-users?q=${encodeURIComponent(importQ)}&type=${importType}`);
    const d = await res.json();
    setImportRes(d.results || []);
    setSearching(false);
  };

  const importAsTeam = async (r: PResult) => {
    const res = await fetch('/api/tournament-portal/import-team', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ tournament_id:id, name:r.name, city:r.city||null, contact_phone:r.phone||null, logo_url:r.logo_url||null, notes:`مستورد (${r.account_type||r.type})` }) });
    const d = await res.json();
    if (!res.ok) { toast.error(d.error); return; }
    toast.success(`تم استيراد "${r.name}"`);
    setImportRes(p => p.filter(x => x.name !== r.name));
    fetchData();
  };

  const importAsPlayer = async (r: PResult, teamId: string) => {
    const key = r.platform_player_id || r.name;
    setImportingId(key);
    const res = await fetch('/api/tournament-portal/team-players', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ team_id:teamId, tournament_id:id, player_name:r.name, position:r.position||null, date_of_birth:r.date_of_birth||null, phone:r.phone||null, platform_player_id:r.platform_player_id||null }) });
    const d = await res.json();
    if (!res.ok) toast.error(d.error);
    else { setPlayerMap(p => ({ ...p, [teamId]:[...(p[teamId]||[]), d.player||{id:Date.now().toString(),player_name:r.name}] })); toast.success(`تم إضافة "${r.name}"`); setImportRes(p=>p.filter(x=>x.name!==r.name)); }
    setImportingId(null);
  };

  const searchGlobal = async () => {
    if (globalQ.length < 2) return;
    setGlobalSearch(true);
    const res = await fetch(`/api/tournament-portal/search-platform-users?q=${encodeURIComponent(globalQ)}&type=${globalType}`);
    const d = await res.json();
    setGlobalRes(d.results || []);
    setGlobalSearch(false);
  };

  const importGlobal = async (r: PResult) => {
    const res = await fetch('/api/tournament-portal/import-team', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ tournament_id:id, name:r.name, city:r.city||null, contact_phone:r.phone||null, logo_url:r.logo_url||null, category_id:selCatId||null, notes:`مستورد (${r.account_type||r.type})` }) });
    const d = await res.json();
    if (!res.ok) { toast.error(d.error); return; }
    toast.success(`تم استيراد "${r.name}"`);
    setGlobalRes(p=>p.filter(x=>x.name!==r.name));
    fetchData();
  };

  const addManual = async () => {
    if (!manual.name.trim()) { toast.error('اسم الفريق مطلوب'); return; }
    setActing('new');
    const { error } = await supabase.from('tournament_teams').insert({ tournament_id:id, name:manual.name, contact_phone:manual.phone||null, city:manual.city||null, category_id:manual.category_id||null, status:'approved' });
    if (error) toast.error(error.message);
    else { toast.success('تمت الإضافة'); setShowAdd(false); setManual({ name:'', phone:'', city:'', category_id:'' }); fetchData(); }
    setActing(null);
  };

  const toggle = (teamId: string, tab: 'info'|'players'|'import' = 'info') => {
    if (expanded === teamId && expandTab === tab) { setExpanded(null); return; }
    setExpanded(teamId); setExpandTab(tab);
    if (tab === 'players') loadPlayers(teamId);
  };

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return teams.filter(t => {
      if (statusF !== 'all' && t.status !== statusF) return false;
      if (catF !== 'all' && t.category_id !== catF) return false;
      if (q && !t.name.toLowerCase().includes(q) && !(t.club_name||'').toLowerCase().includes(q)) return false;
      return true;
    });
  }, [teams, statusF, catF, search]);

  const stats = {
    total: teams.length, pending: teams.filter(t=>t.status==='pending').length,
    approved: teams.filter(t=>t.status==='approved').length, rejected: teams.filter(t=>t.status==='rejected').length,
  };

  if (loading) return <Loader isDark={isDark} />;

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:14 }}>

      {/* ── Header ── */}
      <div style={{ background:S.surface, border:`1px solid ${S.border}`, borderRadius:14, padding:'14px 18px', display:'flex', alignItems:'center', flexWrap:'wrap', gap:12 }}>
        {/* Search */}
        <div style={{ position:'relative', flex:1, minWidth:180 }}>
          <span style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', color:S.text2, fontSize:13 }}>🔍</span>
          <input className="sp-input" style={{ paddingRight:32 }} placeholder="بحث بالاسم..." value={search} onChange={e=>setSearch(e.target.value)} />
        </div>
        {cats.length > 1 && (
          <select className="sp-select" style={{ width:140 }} value={catF} onChange={e=>setCatF(e.target.value)}>
            <option value="all">كل الفئات</option>
            {cats.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        )}
        <button onClick={()=>{ setShowAdd(true); setAddMode('choose'); }} className="sp-btn sp-btn-primary sp-btn-sm">+ إضافة فريق</button>
        <button onClick={fetchData} style={{ width:32, height:32, borderRadius:8, background:'transparent', border:`1px solid ${S.border}`, color:S.text2, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>↻</button>
      </div>

      {/* ── Status filters ── */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10 }} className="sp-grid-4col">
        {[
          { lbl:'الكل',     val:'all',      n:stats.total,    color:'#3b82f6',  bg:'rgba(59,130,246,0.1)'  },
          { lbl:'معلق',     val:'pending',  n:stats.pending,  color:'#f59e0b',  bg:'rgba(245,158,11,0.1)'  },
          { lbl:'مقبول',    val:'approved', n:stats.approved, color:'#16a34a',  bg:'rgba(22,163,74,0.1)'   },
          { lbl:'مرفوض',   val:'rejected', n:stats.rejected, color:'#ef4444',  bg:'rgba(220,38,38,0.1)'   },
        ].map(s=>(
          <button key={s.val} onClick={()=>setStatusF(s.val)} style={{
            padding:'12px 8px', borderRadius:12, cursor:'pointer', textAlign:'center',
            background: statusF===s.val ? s.bg : S.surface,
            border: `2px solid ${statusF===s.val ? s.color : S.border}`,
            transition:'all 0.15s',
          }}>
            <div style={{ fontSize:22, fontWeight:900, color:s.color, lineHeight:1 }}>{s.n}</div>
            <div style={{ fontSize:11, color:S.text2, marginTop:4 }}>{s.lbl}</div>
          </button>
        ))}
      </div>

      {/* ── Teams list ── */}
      {filtered.length === 0 ? (
        <div style={{ background:S.surface, border:`2px dashed ${S.border}`, borderRadius:16, padding:'48px 24px', textAlign:'center' }}>
          <div style={{ fontSize:36, marginBottom:12 }}>👥</div>
          <div style={{ fontSize:15, fontWeight:700, color:S.text, marginBottom:8 }}>لا توجد فرق</div>
          <div style={{ fontSize:13, color:S.text2, marginBottom:20 }}>
            {statusF === 'all' ? 'أضف فريقاً أو انتظر طلبات التسجيل' : 'لا توجد فرق بهذا الفلتر'}
          </div>
          <button onClick={()=>{ setShowAdd(true); setAddMode('choose'); }} className="sp-btn sp-btn-primary">+ إضافة فريق</button>
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
          {filtered.map((t, idx) => {
            const isOpen = expanded === t.id;
            const payStatus = t.registration?.payment_status || 'pending';
            const dotColor = STATUS_DOT[t.status] || '#94a3b8';

            return (
              <div key={t.id} className="sp-card sp-fade-in" style={{ background:S.surface, borderColor:isOpen ? '#d97706' : S.border, borderWidth: isOpen ? 2 : 1, transition:'border-color 0.2s' }}>

                {/* Main row */}
                <div style={{ display:'grid', gridTemplateColumns:'40px 1fr auto', alignItems:'center', padding:'13px 16px', gap:12, cursor:'pointer' }} onClick={()=>toggle(t.id,'info')}>

                  {/* Rank + logo */}
                  <div style={{ position:'relative' }}>
                    <TeamLogo name={t.name} logo={t.logo_url} size={38} />
                    <div style={{ position:'absolute', bottom:-2, left:-2, width:10, height:10, borderRadius:'50%', background:dotColor, border:`2px solid ${S.surface}` }} />
                  </div>

                  {/* Info */}
                  <div style={{ minWidth:0 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
                      <span style={{ fontSize:14, fontWeight:700, color:S.text }}>{t.name}</span>
                      {cats.find(c=>c.id===t.category_id) && (
                        <span style={{ fontSize:10, fontWeight:700, color:'#d97706', background:'rgba(217,119,6,0.12)', padding:'2px 8px', borderRadius:6 }}>
                          {cats.find(c=>c.id===t.category_id)?.name}
                        </span>
                      )}
                      <span style={{ fontSize:10, fontWeight:700, color:dotColor, background:`${dotColor}15`, padding:'2px 8px', borderRadius:6 }}>
                        {STATUS_LBL[t.status] || t.status}
                      </span>
                    </div>
                    <div style={{ display:'flex', gap:14, marginTop:3, flexWrap:'wrap' }}>
                      {(t.contact_name||t.club_name) && <span style={{ fontSize:11, color:S.text2 }}>👤 {t.contact_name||t.club_name}</span>}
                      {t.city && <span style={{ fontSize:11, color:S.text2 }}>📍 {t.city}</span>}
                      {t.contact_phone && <span style={{ fontSize:11, color:S.text2, fontFamily:'monospace' }}>{t.contact_phone}</span>}
                      <span style={{ fontSize:11, color:S.text2 }}>📅 {new Date(t.registered_at).toLocaleDateString('ar-SA',{month:'short',day:'numeric'})}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display:'flex', alignItems:'center', gap:8, flexShrink:0 }} onClick={e=>e.stopPropagation()}>
                    {/* Players count */}
                    <button onClick={()=>toggle(t.id,'players')} style={{ display:'flex', alignItems:'center', gap:4, padding:'5px 10px', borderRadius:8, background: expandTab==='players'&&isOpen ? 'rgba(59,130,246,0.1)' : S.surface2, border:`1px solid ${S.border}`, color:S.text2, cursor:'pointer', fontSize:12, fontWeight:600 }}>
                      👥 {t.players_count}
                    </button>

                    {/* Pay badge */}
                    <span style={{ fontSize:10, fontWeight:700, color:PAY_COLOR[payStatus]||'#94a3b8', background:`${PAY_COLOR[payStatus]||'#94a3b8'}18`, padding:'3px 8px', borderRadius:6 }}>
                      {PAY_LBL[payStatus]||payStatus}
                    </span>

                    {/* Quick approve/reject */}
                    {t.status === 'pending' && (
                      <>
                        <button onClick={()=>act(t.id,'approved')} disabled={acting===t.id} style={{ width:30, height:30, borderRadius:8, background:'rgba(22,163,74,0.1)', border:'1px solid rgba(22,163,74,0.3)', color:'#16a34a', cursor:'pointer', fontSize:14, display:'flex', alignItems:'center', justifyContent:'center' }}>✓</button>
                        <button onClick={()=>act(t.id,'rejected')} disabled={acting===t.id} style={{ width:30, height:30, borderRadius:8, background:'rgba(220,38,38,0.1)', border:'1px solid rgba(220,38,38,0.3)', color:'#ef4444', cursor:'pointer', fontSize:14, display:'flex', alignItems:'center', justifyContent:'center' }}>✕</button>
                      </>
                    )}

                    {/* Chevron */}
                    <span style={{ fontSize:12, color:S.text2, transform: isOpen?'rotate(180deg)':'none', transition:'transform 0.2s' }}>▾</span>
                  </div>
                </div>

                {/* Expanded section */}
                {isOpen && (
                  <div style={{ borderTop:`1px solid ${S.border}` }}>
                    {/* Tab bar */}
                    <div style={{ display:'flex', borderBottom:`1px solid ${S.border}`, background:S.surface2 }}>
                      {(['info','players','import'] as const).map(tab=>(
                        <button key={tab} onClick={()=>{ setExpandTab(tab); if(tab==='players') loadPlayers(t.id); }} style={{
                          padding:'10px 16px', cursor:'pointer', fontSize:12, fontWeight:600,
                          background:'transparent', border:'none', borderBottom:`2px solid ${expandTab===tab?'#d97706':'transparent'}`,
                          color:expandTab===tab?'#d97706':S.text2, transition:'all 0.15s', fontFamily:'inherit',
                        }}>
                          {tab==='info'?'ℹ️ معلومات':tab==='players'?`👥 اللاعبون (${(playerMap[t.id]||[]).length})`: '🔍 استيراد من المنصة'}
                        </button>
                      ))}
                    </div>

                    <div style={{ padding:'14px 16px' }}>

                      {/* INFO TAB */}
                      {expandTab === 'info' && (
                        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
                          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                            {t.contact_phone && <InfoRow icon="📞" v={t.contact_phone} S={S} />}
                            {t.contact_email && <InfoRow icon="✉️" v={t.contact_email} S={S} />}
                            {t.city && <InfoRow icon="📍" v={`${t.city}${t.country?', '+t.country:''}`} S={S} />}
                            {t.notes && <InfoRow icon="📝" v={t.notes} S={S} />}
                            {t.seed && <InfoRow icon="🌱" v={`البذرة ${t.seed}`} S={S} />}
                          </div>
                          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                            {/* Status actions */}
                            <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                              {t.status !== 'approved' && <button onClick={()=>act(t.id,'approved')} disabled={acting===t.id} className="sp-btn sp-btn-success sp-btn-sm">✓ قبول</button>}
                              {t.status !== 'rejected' && <button onClick={()=>act(t.id,'rejected')} disabled={acting===t.id} className="sp-btn sp-btn-danger sp-btn-sm">✕ رفض</button>}
                              {t.status === 'rejected' && <button onClick={()=>act(t.id,'pending')} disabled={acting===t.id} className="sp-btn sp-btn-ghost sp-btn-sm">↩ استعادة</button>}
                            </div>
                            {/* Payment */}
                            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                              <span style={{ fontSize:12, color:S.text2, flexShrink:0 }}>الدفع:</span>
                              <select className="sp-select sp-input-sm" style={{ flex:1 }} value={payStatus} onChange={e=>updatePay(t.id,e.target.value)}>
                                {Object.entries(PAY_LBL).map(([v,l])=><option key={v} value={v}>{l}</option>)}
                              </select>
                            </div>
                            {/* Delete */}
                            <a href={`/tournament-portal/${id}/team-view?team=${t.id}`} target="_blank" rel="noopener noreferrer" className="sp-btn sp-btn-ghost sp-btn-sm" style={{ textDecoration:'none' }}>
                              🔗 بوابة الفريق
                            </a>
                            <Popconfirm title="حذف الفريق نهائياً؟" onConfirm={async()=>{ await supabase.from('tournament_teams').delete().eq('id',t.id); setTeams(p=>p.filter(x=>x.id!==t.id)); toast.success('تم الحذف'); }} okText="حذف" cancelText="لا" okButtonProps={{ danger:true }}>
                              <button className="sp-btn sp-btn-ghost sp-btn-sm" style={{ color:'#ef4444', borderColor:'rgba(220,38,38,0.3)' }}>🗑 حذف الفريق</button>
                            </Popconfirm>
                          </div>
                        </div>
                      )}

                      {/* PLAYERS TAB */}
                      {expandTab === 'players' && (
                        <div>
                          {loadingPl === t.id
                            ? <div style={{ textAlign:'center', padding:20, color:S.text2 }}>جاري التحميل...</div>
                            : <>
                                {(playerMap[t.id]||[]).length > 0 && (
                                  <div style={{ display:'flex', flexDirection:'column', gap:4, marginBottom:12 }}>
                                    <div style={{ display:'grid', gridTemplateColumns:'32px 1fr 90px 100px 32px', padding:'6px 12px', background:S.surface2, borderRadius:8, fontSize:10, fontWeight:700, color:S.text2 }}>
                                      <div>#</div><div>اللاعب</div><div>المركز</div><div>الجوال</div><div></div>
                                    </div>
                                    {(playerMap[t.id]||[]).map((p,i)=>(
                                      <div key={p.id} style={{ display:'grid', gridTemplateColumns:'32px 1fr 90px 100px 32px', padding:'8px 12px', background:S.surface2, borderRadius:8, alignItems:'center' }}>
                                        <div style={{ fontSize:12, color:S.text2, fontWeight:700 }}>{p.jersey_number||i+1}</div>
                                        <div>
                                          <div style={{ fontSize:13, fontWeight:600, color:S.text }}>{p.player_name}</div>
                                          {p.platform_player_id && <span style={{ fontSize:9, background:'rgba(59,130,246,0.15)', color:'#60a5fa', padding:'1px 6px', borderRadius:4 }}>منصة</span>}
                                        </div>
                                        <div style={{ fontSize:11, color:S.text2 }}>{p.position||'—'}</div>
                                        <div style={{ fontSize:11, color:S.text2, fontFamily:'monospace' }}>{p.phone||'—'}</div>
                                        <Popconfirm title="حذف اللاعب؟" onConfirm={()=>deletePlayer(t.id,p.id)} okText="حذف" cancelText="لا" okButtonProps={{danger:true}}>
                                          <button style={{ width:24, height:24, borderRadius:6, background:'transparent', border:`1px solid ${S.border}`, color:'#ef4444', cursor:'pointer', fontSize:11, display:'flex', alignItems:'center', justifyContent:'center' }}>×</button>
                                        </Popconfirm>
                                      </div>
                                    ))}
                                  </div>
                                )}
                                {/* Add player form */}
                                <div style={{ display:'flex', gap:8, flexWrap:'wrap', alignItems:'center', background:S.surface2, borderRadius:10, padding:'10px 12px', border:`1px solid ${S.border}` }}>
                                  <input className="sp-input sp-input-sm" style={{ width:150 }} placeholder="اسم اللاعب *" value={newPlayer.name} onChange={e=>setNewPlayer(p=>({...p,name:e.target.value}))} />
                                  <select className="sp-select" style={{ width:100, padding:'5px 8px', fontSize:12 }} value={newPlayer.position} onChange={e=>setNewPlayer(p=>({...p,position:e.target.value}))}>
                                    <option value="">المركز</option>
                                    {POSITIONS.map(pos=><option key={pos} value={pos}>{pos}</option>)}
                                  </select>
                                  <input className="sp-input sp-input-sm" style={{ width:60 }} placeholder="#" type="number" value={newPlayer.number} onChange={e=>setNewPlayer(p=>({...p,number:e.target.value}))} />
                                  <input className="sp-input sp-input-sm" style={{ width:120 }} placeholder="الجوال" value={newPlayer.phone} onChange={e=>setNewPlayer(p=>({...p,phone:e.target.value}))} dir="ltr" />
                                  <button onClick={()=>addPlayer(t.id)} disabled={acting===`pl_${t.id}`} className="sp-btn sp-btn-primary sp-btn-sm">+ إضافة</button>
                                </div>
                              </>
                          }
                        </div>
                      )}

                      {/* IMPORT TAB */}
                      {expandTab === 'import' && (
                        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                          <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                            <select className="sp-select" style={{ width:160, padding:'7px 10px', fontSize:12 }} value={importType} onChange={e=>setImportType(e.target.value)}>
                              <option value="all">الكل</option>
                              <option value="club">أندية / أكاديميات</option>
                              <option value="player">لاعبون</option>
                            </select>
                            <input className="sp-input sp-input-sm" style={{ flex:1, minWidth:180 }} placeholder="اسم أو جوال..." value={importQ} onChange={e=>setImportQ(e.target.value)} onKeyDown={e=>e.key==='Enter'&&searchImport()} />
                            <button onClick={searchImport} disabled={searching} className="sp-btn sp-btn-sm" style={{ background:'#4f46e5', color:'#fff', border:'none' }}>
                              {searching?'...':'🔍 بحث'}
                            </button>
                          </div>
                          {importRes.map((r,i)=>(
                            <div key={i} style={{ display:'flex', alignItems:'center', gap:10, background:S.surface2, border:`1px solid ${S.border}`, borderRadius:10, padding:'10px 12px' }}>
                              <img src={resolveImg(r.logo_url, r.account_type as any)||''} alt="" style={{ width:36, height:36, borderRadius:9, objectFit:'cover', flexShrink:0 }} onError={e=>{(e.target as HTMLImageElement).style.display='none'}} />
                              <div style={{ flex:1, minWidth:0 }}>
                                <div style={{ fontSize:13, fontWeight:700, color:S.text }}>{r.name}</div>
                                <div style={{ fontSize:11, color:S.text2 }}>
                                  {r.type==='player'?`لاعب · ${r.position||'—'}`:r.account_type==='academy'?'أكاديمية':'نادي'}
                                  {r.city?` · ${r.city}`:''}
                                </div>
                              </div>
                              <div style={{ display:'flex', gap:6, flexShrink:0 }}>
                                <button onClick={()=>importAsPlayer(r,t.id)} disabled={importingId===(r.platform_player_id||r.name)} className="sp-btn sp-btn-sm" style={{ background:'#2563eb', color:'#fff', border:'none' }}>
                                  + لاعب
                                </button>
                                <button onClick={()=>importAsTeam(r)} className="sp-btn sp-btn-ghost sp-btn-sm">فريق</button>
                              </div>
                            </div>
                          ))}
                          {importQ.length>=2 && !searching && importRes.length===0 && (
                            <div style={{ textAlign:'center', color:S.text2, fontSize:13, padding:12 }}>لا توجد نتائج</div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Add Team Modal ── */}
      <Modal open={showAdd} onCancel={()=>{setShowAdd(false);setAddMode('choose');setGlobalRes([]);}} footer={null} width={520}
        title={<span style={{ fontWeight:700 }}>إضافة فريق</span>}>
        <div style={{ marginTop:16 }}>
          {addMode === 'choose' && (
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
              <button onClick={()=>setAddMode('import')} style={{ padding:'24px 16px', borderRadius:14, border:`2px solid ${L.border}`, background:L.surface2, cursor:'pointer', textAlign:'center' }}>
                <div style={{ fontSize:28, marginBottom:8 }}>🔍</div>
                <div style={{ fontSize:14, fontWeight:700 }}>استيراد من المنصة</div>
                <div style={{ fontSize:12, color:L.text2, marginTop:4 }}>نادي، أكاديمية أو لاعب</div>
              </button>
              <button onClick={()=>setAddMode('manual')} style={{ padding:'24px 16px', borderRadius:14, border:`2px solid ${L.border}`, background:L.surface2, cursor:'pointer', textAlign:'center' }}>
                <div style={{ fontSize:28, marginBottom:8 }}>✍️</div>
                <div style={{ fontSize:14, fontWeight:700 }}>إضافة يدوية</div>
                <div style={{ fontSize:12, color:L.text2, marginTop:4 }}>أدخل بيانات الفريق مباشرة</div>
              </button>
            </div>
          )}

          {addMode === 'import' && (
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              <div style={{ display:'flex', gap:8 }}>
                <button onClick={()=>setAddMode('choose')} style={{ fontSize:12, color:'#94a3b8', background:'transparent', border:'none', cursor:'pointer', padding:0 }}>← رجوع</button>
              </div>
              <div style={{ display:'flex', gap:8 }}>
                <select className="sp-select" style={{ width:150, padding:'8px 10px' }} value={globalType} onChange={e=>setGlobalType(e.target.value)}>
                  <option value="club">أندية / أكاديميات</option>
                  <option value="player">لاعبون</option>
                  <option value="all">الكل</option>
                </select>
                <input className="sp-input" style={{ flex:1 }} placeholder="ابحث بالاسم أو الجوال..." value={globalQ} onChange={e=>setGlobalQ(e.target.value)} onKeyDown={e=>e.key==='Enter'&&searchGlobal()} />
                <button onClick={searchGlobal} disabled={globalSearch} className="sp-btn sp-btn-primary sp-btn-sm">{globalSearch?'...':'بحث'}</button>
              </div>
              {cats.length > 1 && (
                <select className="sp-select" style={{ padding:'8px 10px' }} value={selCatId} onChange={e=>setSelCatId(e.target.value)}>
                  <option value="">بدون فئة</option>
                  {cats.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              )}
              <div style={{ maxHeight:280, overflowY:'auto', display:'flex', flexDirection:'column', gap:6 }}>
                {globalRes.map((r,i)=>(
                  <div key={i} style={{ display:'flex', alignItems:'center', gap:10, background:'#f8fafc', borderRadius:10, padding:'10px 12px', border:'1px solid #e2e8f0' }}>
                    <img src={resolveImg(r.logo_url, r.account_type as any)||''} alt="" style={{ width:36, height:36, borderRadius:9, objectFit:'cover', flexShrink:0 }} onError={e=>{(e.target as HTMLImageElement).style.display='none'}} />
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:13, fontWeight:700, color:'#0f172a' }}>{r.name}</div>
                      <div style={{ fontSize:11, color:'#94a3b8' }}>{r.account_type==='academy'?'أكاديمية':r.type==='player'?`لاعب · ${r.position||'—'}`:'نادي'}{r.city?` · ${r.city}`:''}</div>
                    </div>
                    <button onClick={()=>importGlobal(r)} className="sp-btn sp-btn-primary sp-btn-sm">+ استيراد</button>
                  </div>
                ))}
                {globalQ.length>=2 && !globalSearch && globalRes.length===0 && <div style={{ textAlign:'center', color:'#94a3b8', fontSize:13, padding:20 }}>لا توجد نتائج</div>}
              </div>
            </div>
          )}

          {addMode === 'manual' && (
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              <button onClick={()=>setAddMode('choose')} style={{ fontSize:12, color:'#94a3b8', background:'transparent', border:'none', cursor:'pointer', padding:0, alignSelf:'flex-start' }}>← رجوع</button>
              <div>
                <label className="sp-label">اسم الفريق *</label>
                <input className="sp-input" placeholder="مثال: نادي النصر" value={manual.name} onChange={e=>setManual(p=>({...p,name:e.target.value}))} />
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                <div>
                  <label className="sp-label">رقم الجوال</label>
                  <input className="sp-input" placeholder="+966..." value={manual.phone} onChange={e=>setManual(p=>({...p,phone:e.target.value}))} dir="ltr" />
                </div>
                <div>
                  <label className="sp-label">المدينة</label>
                  <input className="sp-input" placeholder="الرياض" value={manual.city} onChange={e=>setManual(p=>({...p,city:e.target.value}))} />
                </div>
              </div>
              {cats.length > 1 && (
                <div>
                  <label className="sp-label">الفئة</label>
                  <select className="sp-select" value={manual.category_id} onChange={e=>setManual(p=>({...p,category_id:e.target.value}))}>
                    <option value="">بدون فئة</option>
                    {cats.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              )}
              <button onClick={addManual} disabled={acting==='new'} className="sp-btn sp-btn-primary" style={{ marginTop:4 }}>
                {acting==='new'?'جاري الإضافة...':'+ إضافة الفريق'}
              </button>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}

function InfoRow({ icon, v, S }: { icon:string; v:string; S:any }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
      <span style={{ fontSize:13 }}>{icon}</span>
      <span style={{ fontSize:12, color:S.text2 }}>{v}</span>
    </div>
  );
}

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
