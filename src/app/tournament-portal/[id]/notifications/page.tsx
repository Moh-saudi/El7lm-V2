'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { toast } from 'sonner';
import { createPortalClient, portalAuthenticatedFetch } from '@/lib/tournament-portal/auth';
import { usePortalTheme } from '../../_components/PortalShell';
import { useTranslation } from '@/lib/i18n';

type Team  = { id:string; name:string; logo_url:string|null; contact_phone?:string|null };
type Notif = { id:string; title:string; body:string; target_type:'all'|'team'; target_id:string|null; status:'pending'|'sent'|'failed'; created_at:string; channel?:string; target_team?:{ name:string }|null };

type Channel = 'app' | 'whatsapp' | 'sms';

export default function NotificationsPage() {
  const { locale, getTranslations } = useTranslation();
  const copy = getTranslations<any>('tournamentNotifications');
  const { id }     = useParams<{ id:string }>();
  const { isDark } = usePortalTheme();
  const S = isDark ? D : L;

  const [teams,     setTeams]     = useState<Team[]>([]);
  const [notifs,    setNotifs]    = useState<Notif[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [sending,   setSending]   = useState(false);
  const [title,     setTitle]     = useState('');
  const [body,      setBody]      = useState('');
  const [target,    setTarget]    = useState<'all'|'team'>('all');
  const [teamId,    setTeamId]    = useState('');
  const [channels,  setChannels]  = useState<Channel[]>(['app']);
  const [whatsappResults, setWhatsappResults] = useState<{name:string;link:string}[]>([]);

  const supabase = createPortalClient();

  const load = useCallback(async()=>{
    const [tR,nR] = await Promise.all([
      supabase.from('tournament_teams').select('id,name,logo_url,contact_phone').eq('tournament_id',id).eq('status','approved').order('name'),
      supabase.from('tournament_notifications').select('*,target_team:tournament_teams!target_id(name)').eq('tournament_id',id).order('created_at',{ascending:false}).limit(50),
    ]);
    setTeams(tR.data||[]); setNotifs((nR.data as any)||[]); setLoading(false);
  },[id]);

  useEffect(()=>{ load(); },[load]);

  const toggleChannel = (ch: Channel) => {
    setChannels(prev => prev.includes(ch) ? prev.filter(c => c !== ch) : [...prev, ch]);
  };

  const send = async()=>{
    if (!title.trim()||!body.trim()) { toast.error(copy.enterContent); return; }
    if (target==='team'&&!teamId) { toast.error(copy.selectTeam); return; }
    if (channels.length === 0) { toast.error(copy.selectChannel); return; }
    setSending(true);
    setWhatsappResults([]);

    const msg = `*${title.trim()}*\n\n${body.trim()}`;

    // Save in-app notification
    if (channels.includes('app')) {
      const { error } = await supabase.from('tournament_notifications').insert({ tournament_id:id, title:title.trim(), body:body.trim(), target_type:target, target_id:target==='team'?teamId:null, status:'sent', sent_at:new Date().toISOString() });
      if (error) toast.error(error.message);
    }

    // WhatsApp links
    if (channels.includes('whatsapp')) {
      const targetTeams = target === 'all' ? teams : teams.filter(t => t.id === teamId);
      const teamsWithPhone = targetTeams.filter(t => t.contact_phone);
      if (teamsWithPhone.length === 0) {
        toast.warning(copy.noWhatsapp);
      } else {
        const encoded = encodeURIComponent(msg);
        const links = teamsWithPhone.map(t => ({
          name: t.name,
          link: `https://wa.me/${(t.contact_phone||'').replace(/\D/g,'')}?text=${encoded}`,
        }));
        setWhatsappResults(links);
        toast.success(copy.whatsappCreated.replace('{count}', links.length));
      }
    }

    // SMS via API (Twilio if configured)
    if (channels.includes('sms')) {
      const targetTeams = target === 'all' ? teams : teams.filter(t => t.id === teamId);
      const teamsWithPhone = targetTeams.filter(t => t.contact_phone);
      if (teamsWithPhone.length === 0) {
        toast.warning(copy.noPhones);
      } else {
        const res = await portalAuthenticatedFetch('/api/tournament-portal/send-sms', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tournament_id:id, phones: teamsWithPhone.map(t => t.contact_phone), message: `${title.trim()}\n${body.trim()}` }),
        });
        const json = await res.json();
        if (json.error) toast.error(json.error);
        else toast.success(copy.smsSent.replace('{count}', json.sent || 0));
      }
    }

    if (channels.includes('app')) { await load(); }
    setTitle(''); setBody(''); setTeamId(''); setTarget('all');
    setSending(false);
  };

  const del = async(nid:string)=>{
    await supabase.from('tournament_notifications').delete().eq('id',nid);
    setNotifs(p=>p.filter(n=>n.id!==nid));
    toast.success(copy.deleted);
  };

  if (loading) return <Loader isDark={isDark} />;

  const sentN = notifs.filter(n=>n.status==='sent').length;

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:14 }}>

      {/* KPIs */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10 }} className="sp-grid-3col">
        {[
          { icon:'🔔', v:sentN,       lbl:copy.sent, color:'#d97706' },
          { icon:'👥', v:teams.length, lbl:copy.accepted, color:'#3b82f6' },
          { icon:'✅', v:sentN,        lbl:copy.delivered, color:'#16a34a' },
        ].map(s=>(
          <div key={s.lbl} className="sp-kpi" style={{ background:S.surface, borderColor:S.border, display:'flex', alignItems:'center', gap:12 }}>
            <div style={{ width:42, height:42, borderRadius:11, background:`${s.color}18`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, flexShrink:0 }}>{s.icon}</div>
            <div>
              <div style={{ fontSize:24, fontWeight:900, color:s.color, lineHeight:1 }}>{s.v}</div>
              <div className="sp-kpi-label" style={{ color:S.text2 }}>{s.lbl}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 380px', gap:14, alignItems:'start' }} className="sp-grid-single">

        {/* ── Compose ── */}
        <div className="sp-card" style={{ background:S.surface, borderColor:S.border }}>
          <div className="sp-section-header">
            <span style={{ fontSize:14, fontWeight:700, color:'#fff' }}>🔔 {copy.create}</span>
          </div>
          <div style={{ padding:'18px' }}>

            {/* Templates */}
            <label className="sp-label">{copy.ready}</label>
            <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginBottom:18 }}>
              {copy.templates.map((t:{label:string;title:string;body:string})=>(
                <button key={t.label} onClick={()=>{ setTitle(t.title); setBody(t.body); }} className="sp-btn sp-btn-ghost sp-btn-sm">{t.label}</button>
              ))}
            </div>

            {/* Target */}
            <label className="sp-label">{copy.targets}</label>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:14 }}>
              {(['all','team'] as const).map(type=>(
                <button key={type} onClick={()=>setTarget(type)} style={{ padding:'11px 14px', borderRadius:10, cursor:'pointer', border:`2px solid ${target===type?'#d97706':S.border}`, background:target===type?(isDark?'rgba(217,119,6,0.1)':'#fffbeb'):'transparent', display:'flex', alignItems:'center', gap:8, transition:'all 0.15s', fontSize:13, fontWeight:600, color:target===type?'#d97706':S.text2, fontFamily:'inherit' }}>
                  {type==='all'?'👥':'🔔'}
                  {type==='all'?copy.allTeams:copy.specific}
                </button>
              ))}
            </div>

            {target==='team' && (
              <div style={{ marginBottom:14 }}>
                <select className="sp-select" value={teamId} onChange={e=>setTeamId(e.target.value)}>
                  <option value="">{copy.selectTeam}...</option>
                  {teams.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
            )}

            {/* Channels */}
            <label className="sp-label">{copy.channels}</label>
            <div style={{ display:'flex', gap:8, marginBottom:14, flexWrap:'wrap' }}>
              {([
                { id:'app',       icon:'🔔', lbl:copy.channelNames[0], color:'#3b82f6' },
                { id:'whatsapp',  icon:'💬', lbl:copy.channelNames[1], color:'#16a34a' },
                { id:'sms',       icon:'📱', lbl:copy.channelNames[2], color:'#7c3aed' },
              ] as {id:Channel;icon:string;lbl:string;color:string}[]).map(ch => (
                <button key={ch.id} onClick={() => toggleChannel(ch.id)} style={{ padding:'9px 14px', borderRadius:10, cursor:'pointer', border:`2px solid ${channels.includes(ch.id)?ch.color:S.border}`, background:channels.includes(ch.id)?(isDark?`${ch.color}22`:`${ch.color}18`):'transparent', display:'flex', alignItems:'center', gap:6, fontSize:12, fontWeight:600, color:channels.includes(ch.id)?ch.color:S.text2, transition:'all 0.15s', fontFamily:'inherit' }}>
                  {ch.icon} {ch.lbl}
                  {channels.includes(ch.id) && <span style={{ fontSize:10, color:ch.color }}>✓</span>}
                </button>
              ))}
            </div>

            {(channels.includes('whatsapp') || channels.includes('sms')) && (
              <div style={{ background:isDark?'rgba(245,158,11,0.08)':'#fffbeb', border:`1px solid ${isDark?'rgba(245,158,11,0.2)':'#fde68a'}`, borderRadius:10, padding:'10px 14px', marginBottom:14, fontSize:12, color:isDark?'#fbbf24':'#92400e' }}>
                ⚠️ {copy.phoneHelp}
              </div>
            )}

            <label className="sp-label">{copy.title}</label>
            <input className="sp-input" style={{ marginBottom:14 }} value={title} onChange={e=>setTitle(e.target.value)} placeholder={copy.titlePlaceholder} />

            <label className="sp-label">{copy.body}</label>
            <textarea className="sp-input sp-textarea" style={{ marginBottom:6 }} value={body} onChange={e=>setBody(e.target.value)} placeholder={copy.bodyPlaceholder} maxLength={500} />
            <div style={{ textAlign:'left', fontSize:10, color:S.text2, marginBottom:14 }}>{body.length}/500</div>

            {/* Preview */}
            {(title||body) && (
              <div style={{ background:'#0b0e1a', borderRadius:16, padding:'16px 18px', marginBottom:16, border:'1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ fontSize:10, color:'#475569', fontWeight:600, marginBottom:10, letterSpacing:1 }}>{copy.previewTitle}</div>
                <div style={{ display:'flex', gap:10 }}>
                  <div style={{ width:36, height:36, borderRadius:10, background:'#d97706', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, flexShrink:0 }}>🔔</div>
                  <div>
                    <div style={{ fontSize:13, fontWeight:700, color:'#f1f5f9', marginBottom:4 }}>{title||copy.previewTitle}</div>
                    <div style={{ fontSize:12, color:'#94a3b8', lineHeight:1.5 }}>{body||copy.previewBody}</div>
                    <div style={{ fontSize:10, color:'#374151', marginTop:6 }}>{copy.now}</div>
                  </div>
                </div>
              </div>
            )}

            <button onClick={send} disabled={sending} className="sp-btn sp-btn-primary" style={{ width:'100%', justifyContent:'center', borderRadius:12, height:46, fontSize:15, boxShadow:'0 4px 16px rgba(217,119,6,0.3)' }}>
              {sending?copy.sending:`📤 ${copy.send}`}
            </button>

            {/* WhatsApp links result */}
            {whatsappResults.length > 0 && (
              <div style={{ marginTop:14, background:isDark?'rgba(22,163,74,0.08)':'#f0fdf4', border:`1px solid ${isDark?'rgba(22,163,74,0.2)':'#bbf7d0'}`, borderRadius:12, padding:'12px 16px' }}>
                <div style={{ fontSize:12, fontWeight:700, color:'#16a34a', marginBottom:10 }}>💬 {copy.whatsappLinks}</div>
                <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                  {whatsappResults.map(r => (
                    <a key={r.name} href={r.link} target="_blank" rel="noopener noreferrer" style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 12px', background:isDark?'rgba(22,163,74,0.1)':'#dcfce7', borderRadius:8, textDecoration:'none', fontSize:12, color:'#16a34a', fontWeight:600 }}>
                      <span style={{ fontSize:16 }}>💬</span> {r.name} <span style={{ marginInlineStart:'auto', fontSize:10, color:'#4ade80' }}>→ {copy.open}</span>
                    </a>
                  ))}
                </div>
                <button onClick={() => setWhatsappResults([])} style={{ marginTop:8, background:'none', border:'none', fontSize:11, color:S.text2, cursor:'pointer', padding:0 }}>✕ {copy.hide}</button>
              </div>
            )}
          </div>
        </div>

        {/* ── History ── */}
        <div className="sp-card" style={{ background:S.surface, borderColor:S.border }}>
          <div style={{ padding:'12px 18px', borderBottom:`1px solid ${S.border}`, background:S.surface2, display:'flex', alignItems:'center', gap:8 }}>
            <span style={{ fontSize:14, fontWeight:700, color:S.text, flex:1 }}>⏰ {copy.history}</span>
            <span style={{ fontSize:12, color:S.text2 }}>{notifs.length}</span>
          </div>

          <div style={{ maxHeight:560, overflowY:'auto' }} className="sp-scroll">
            {notifs.length===0
              ? <div style={{ padding:'48px 24px', textAlign:'center' }}>
                  <div style={{ fontSize:36, marginBottom:12 }}>🔕</div>
                  <div style={{ fontSize:14, color:S.text2 }}>{copy.empty}</div>
                </div>
              : notifs.map(n=>{
                  const statusIcon = n.status==='sent'?'✅':n.status==='failed'?'❌':'⏳';
                  const statusBg = { sent:isDark?'rgba(22,163,74,0.1)':'#dcfce7', failed:isDark?'rgba(220,38,38,0.1)':'#fee2e2', pending:isDark?'rgba(245,158,11,0.1)':'#fef3c7' }[n.status] || S.surface2;
                  return (
                    <div key={n.id} className="sp-notif-item">
                      <div style={{ width:36, height:36, borderRadius:10, background:statusBg, display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, flexShrink:0 }}>{statusIcon}</div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:13, fontWeight:700, color:S.text, marginBottom:2, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{n.title}</div>
                        <div style={{ fontSize:11, color:S.text2, display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden', marginBottom:6 }}>{n.body}</div>
                        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                          <span style={{ fontSize:10, fontWeight:700, color:n.target_type==='all'?'#60a5fa':'#a78bfa', background:n.target_type==='all'?(isDark?'rgba(59,130,246,0.12)':'#dbeafe'):(isDark?'rgba(139,92,246,0.12)':'#ede9fe'), padding:'2px 8px', borderRadius:6 }}>
                            {n.target_type==='all'?copy.allTeams:(n.target_team as any)?.name||copy.specific}
                          </span>
                          <span style={{ fontSize:10, color:S.text2 }}>{new Date(n.created_at).toLocaleDateString(locale,{month:'short',day:'numeric'})}</span>
                        </div>
                      </div>
                      <button onClick={()=>del(n.id)} style={{ width:28, height:28, borderRadius:7, background:'transparent', border:`1px solid ${S.border}`, color:'#ef4444', cursor:'pointer', fontSize:14, flexShrink:0 }}>×</button>
                    </div>
                  );
                })
            }
          </div>
        </div>
      </div>
    </div>
  );
}

function Loader({ isDark }: { isDark:boolean }) {
  return <div style={{ display:'flex',justifyContent:'center',alignItems:'center',minHeight:300 }}><div style={{ width:36,height:36,borderRadius:'50%',border:`3px solid ${isDark?'rgba(255,255,255,0.1)':'#e2e8f0'}`,borderTopColor:'#d97706',animation:'spin 0.7s linear infinite' }} /><style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style></div>;
}

const D = { surface:'#131929', surface2:'#1a2235', border:'rgba(255,255,255,0.07)', text:'#e8eaf0', text2:'#64748b' };
const L = { surface:'#ffffff', surface2:'#f8fafc', border:'#e2e8f0', text:'#0f172a', text2:'#64748b' };
