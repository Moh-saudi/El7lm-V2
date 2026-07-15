'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import { createPortalClient } from '@/lib/tournament-portal/auth';
import { usePortalTheme } from '../../_components/PortalShell';
import { resolveImg } from '../../_utils/img';
import { toast } from 'sonner';
import { useTranslation } from '@/lib/i18n';

type Team = { id: string; name: string; logo_url: string | null; status: string };

const TEMPLATES = [
  { id: 'champion', bg: 'linear-gradient(135deg,#78350f,#d97706,#fef3c7)', text: '#fff', accent: '#f59e0b', border: '#f59e0b' },
  { id: 'runner', bg: 'linear-gradient(135deg,#1e293b,#475569,#e2e8f0)', text: '#fff', accent: '#94a3b8', border: '#94a3b8' },
  { id: 'third', bg: 'linear-gradient(135deg,#431407,#b45309,#fef3c7)', text: '#fff', accent: '#cd7f32', border: '#cd7f32' },
  { id: 'participant', bg: 'linear-gradient(135deg,#0f172a,#1e3a5f,#dbeafe)', text: '#fff', accent: '#60a5fa', border: '#3b82f6' },
];

export default function CertificatesPage() {
  const { locale, isRTL, getTranslations } = useTranslation();
  const copy = getTranslations<any>('tournamentCertificates');
  const { id }     = useParams<{ id: string }>();
  const { isDark } = usePortalTheme();
  const S = isDark ? D : L;

  const [tournament, setTournament] = useState<any>(null);
  const [teams,      setTeams]      = useState<Team[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [selTeam,    setSelTeam]    = useState('');
  const [selTpl,     setSelTpl]     = useState('champion');
  const [customTitle, setCustomTitle] = useState('');
  const [customText,  setCustomText]  = useState('');
  const certRef = useRef<HTMLDivElement>(null);

  const supabase = createPortalClient();

  useEffect(() => {
    (async () => {
      const [tRes, teamsRes] = await Promise.all([
        supabase.from('tournament_new').select('*').eq('id', id).single(),
        supabase.from('tournament_teams').select('id,name,logo_url,status').eq('tournament_id', id).eq('status', 'approved').order('name'),
      ]);
      setTournament(tRes.data);
      setTeams(teamsRes.data || []);
      if (teamsRes.data?.length) setSelTeam(teamsRes.data[0].id);
      setLoading(false);
    })();
  }, [id]);

  const print = () => {
    const el = certRef.current;
    if (!el) return;
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`
      <!DOCTYPE html><html dir="${isRTL ? 'rtl' : 'ltr'}">
      <head>
        <meta charset="utf-8">
        <title>${copy.documentTitle}</title>
        <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;700;900&display=swap" rel="stylesheet">
        <style>
          * { margin:0; padding:0; box-sizing:border-box; }
          body { font-family:'Tajawal',sans-serif; background:#fff; }
          @media print { @page { size: A4 landscape; margin: 0; } }
        </style>
      </head>
      <body>${el.innerHTML}</body></html>
    `);
    win.document.close();
    setTimeout(() => { win.print(); win.close(); }, 600);
  };

  if (loading) return <Loader isDark={isDark} />;

  const tpl    = TEMPLATES.find(t => t.id === selTpl) || TEMPLATES[0];
  const team   = teams.find(t => t.id === selTeam);
  const today  = new Date().toLocaleDateString(locale, { year: 'numeric', month: 'long', day: 'numeric' });
  const tplIndex = TEMPLATES.findIndex(item => item.id === tpl.id);
  const title  = customTitle || copy.titles[tplIndex];
  const body   = customText || copy.body.replace('{team}', team?.name || copy.teamFallback).replace('{tournament}', tournament?.name || '');

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>

      {/* Controls */}
      <div style={{ background:S.surface, border:`1px solid ${S.border}`, borderRadius:14, padding:'16px 18px', display:'flex', flexDirection:'column', gap:12 }}>
        <div style={{ fontSize:16, fontWeight:800, color:S.text }}>🎖️ {copy.create}</div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
          <div>
            <label className="sp-label">{copy.team}</label>
            <select className="sp-select" value={selTeam} onChange={e=>setSelTeam(e.target.value)}>
              {teams.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div>
            <label className="sp-label">{copy.type}</label>
            <select className="sp-select" value={selTpl} onChange={e=>setSelTpl(e.target.value)}>
              {TEMPLATES.map((t,index)=><option key={t.id} value={t.id}>{copy.templates[index]}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className="sp-label">{copy.optionalTitle}</label>
          <input className="sp-input" placeholder={title} value={customTitle} onChange={e=>setCustomTitle(e.target.value)} />
        </div>

        <div>
          <label className="sp-label">{copy.optionalText}</label>
          <textarea className="sp-input sp-textarea" style={{ minHeight:70 }} placeholder={body} value={customText} onChange={e=>setCustomText(e.target.value)} />
        </div>

        <div style={{ display:'flex', gap:10 }}>
          <button onClick={print} className="sp-btn sp-btn-primary">🖨️ {copy.print}</button>
          <button onClick={()=>{ setCustomTitle(''); setCustomText(''); }} className="sp-btn sp-btn-ghost sp-btn-sm">{copy.reset}</button>
        </div>
      </div>

      {/* Certificate preview */}
      <div style={{ background:S.surface, border:`1px solid ${S.border}`, borderRadius:14, padding:'16px 18px' }}>
        <div style={{ fontSize:14, fontWeight:700, color:S.text, marginBottom:14 }}>{copy.preview}</div>

        <div ref={certRef} style={{ width:'100%', maxWidth:800, margin:'0 auto' }}>
          <div style={{
            background: tpl.bg,
            borderRadius: 16,
            padding: '48px 56px',
            position: 'relative',
            overflow: 'hidden',
            border: `3px solid ${tpl.border}`,
            boxShadow: `0 8px 40px ${tpl.border}40`,
            fontFamily: "'Tajawal', sans-serif",
            direction: isRTL ? 'rtl' : 'ltr',
          }}>
            {/* Decorative corners */}
            <div style={{ position:'absolute', top:12, right:12, width:60, height:60, borderTop:`3px solid ${tpl.accent}`, borderRight:`3px solid ${tpl.accent}`, borderRadius:'0 8px 0 0', opacity:0.6 }} />
            <div style={{ position:'absolute', bottom:12, left:12, width:60, height:60, borderBottom:`3px solid ${tpl.accent}`, borderLeft:`3px solid ${tpl.accent}`, borderRadius:'0 0 8px 0', opacity:0.6 }} />

            {/* Header logos */}
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:32 }}>
              {tournament?.logo_url
                ? <img src={resolveImg(tournament.logo_url)||''} alt="" style={{ width:64, height:64, borderRadius:12, objectFit:'cover', border:`2px solid ${tpl.accent}40` }} />
                : <div style={{ width:64, height:64, borderRadius:12, background:`${tpl.accent}20`, border:`2px solid ${tpl.accent}40`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:28 }}>🏆</div>
              }

              <div style={{ textAlign:'center', flex:1 }}>
                <div style={{ fontSize:13, color:`${tpl.text}80`, fontWeight:600, letterSpacing:2, textTransform:'uppercase', marginBottom:4 }}>{copy.documentTitle}</div>
                <div style={{ fontSize:28, fontWeight:900, color:tpl.accent, lineHeight:1 }}>{copy.appreciation}</div>
              </div>

              {team?.logo_url
                ? <img src={resolveImg(team.logo_url)||''} alt="" style={{ width:64, height:64, borderRadius:12, objectFit:'cover', border:`2px solid ${tpl.accent}40` }} />
                : <div style={{ width:64, height:64, borderRadius:12, background:`${tpl.accent}20`, border:`2px solid ${tpl.accent}40`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:28 }}>🏅</div>
              }
            </div>

            {/* Divider */}
            <div style={{ height:2, background:`linear-gradient(90deg, transparent, ${tpl.accent}, transparent)`, margin:'0 0 28px' }} />

            {/* Title */}
            <div style={{ textAlign:'center', marginBottom:20 }}>
              <div style={{ fontSize:24, fontWeight:900, color:tpl.text, marginBottom:8 }}>{title}</div>
              <div style={{ fontSize:36, fontWeight:900, color:tpl.accent, marginBottom:4 }}>{team?.name || copy.teamName}</div>
            </div>

            {/* Body text */}
            <div style={{ textAlign:'center', marginBottom:32 }}>
              <p style={{ fontSize:15, color:`${tpl.text}cc`, lineHeight:1.8, maxWidth:500, margin:'0 auto' }}>{body}</p>
            </div>

            {/* Divider */}
            <div style={{ height:1, background:`${tpl.accent}40`, margin:'0 0 24px' }} />

            {/* Footer */}
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end' }}>
              <div>
                <div style={{ fontSize:12, color:`${tpl.text}60` }}>{copy.tournament}</div>
                <div style={{ fontSize:15, fontWeight:700, color:tpl.text }}>{tournament?.name}</div>
                {tournament?.city && <div style={{ fontSize:12, color:`${tpl.text}60` }}>📍 {tournament.city}</div>}
              </div>
              <div style={{ textAlign:'center' }}>
                <div style={{ width:80, height:80, borderRadius:'50%', background:`${tpl.accent}15`, border:`2px dashed ${tpl.accent}60`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:28 }}>
                  {tpl.id === 'champion' ? '🥇' : tpl.id === 'runner' ? '🥈' : tpl.id === 'third' ? '🥉' : '🎖️'}
                </div>
              </div>
              <div style={{ textAlign:'left' }}>
                <div style={{ fontSize:12, color:`${tpl.text}60` }}>{copy.issued}</div>
                <div style={{ fontSize:14, fontWeight:700, color:tpl.text }}>{today}</div>
                <div style={{ fontSize:11, color:`${tpl.text}50`, marginTop:4 }}>el7lm.com</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bulk print */}
      <div style={{ background:S.surface, border:`1px solid ${S.border}`, borderRadius:14, padding:'14px 18px', display:'flex', alignItems:'center', gap:12 }}>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:14, fontWeight:700, color:S.text }}>🖨️ {copy.bulk}</div>
          <div style={{ fontSize:13, color:S.text2, marginTop:2 }}>{copy.bulkHelp}</div>
        </div>
        <button
          onClick={() => window.open(`/tournament-portal/${id}/print?type=teams`, '_blank')}
          className="sp-btn sp-btn-ghost sp-btn-sm">
          {copy.showTeams}
        </button>
      </div>
    </div>
  );
}

function Loader({ isDark }: { isDark: boolean }) {
  return <div style={{ display:'flex', justifyContent:'center', padding:60 }}><div style={{ width:36, height:36, borderRadius:'50%', border:`3px solid ${isDark?'rgba(255,255,255,0.1)':'#e2e8f0'}`, borderTopColor:'#d97706', animation:'spin 0.7s linear infinite' }} /><style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style></div>;
}

const D = { surface:'#131929', border:'rgba(255,255,255,0.07)', text:'#e8eaf0', text2:'#64748b' };
const L = { surface:'#ffffff', border:'#e2e8f0', text:'#0f172a', text2:'#64748b' };
