'use client';
import { TeamLogo as LogoImg } from '../../_components/TeamLogo';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { createPortalClient } from '@/lib/tournament-portal/auth';
import { usePortalTheme } from '../../_components/PortalShell';

type Cat   = { id:string; name:string; type:string };
type Team  = { id:string; name:string; logo_url:string|null };
type BM    = { id:string; round:string; match_number:number|null; home_team_id:string|null; away_team_id:string|null; home_score:number|null; away_score:number|null; status:string; match_date:string|null; home_team?:Team|null; away_team?:Team|null };

const RO  = ['R128','R64','R32','R16','QF','SF','F','3rd'];
const RL: Record<string,string> = { R128:'دور الـ128',R64:'دور الـ64',R32:'دور الـ32',R16:'دور الـ16',QF:'ربع النهائي',SF:'نصف النهائي',F:'النهائي','3rd':'المركز الثالث' };

export default function BracketPage() {
  const { id }     = useParams<{ id:string }>();
  const { isDark } = usePortalTheme();
  const S = isDark ? D : L;

  const [cats,   setCats]   = useState<Cat[]>([]);
  const [selCat, setSelCat] = useState('');
  const [matches,setMatches]= useState<BM[]>([]);
  const [loading,setLoading]= useState(true);
  const supabase = createPortalClient();

  useEffect(()=>{
    (async()=>{
      const { data } = await supabase.from('tournament_categories').select('id,name,type').eq('tournament_id',id).in('type',['knockout','groups_knockout']).order('sort_order');
      setCats(data||[]);
      if (data?.length) setSelCat(data[0].id);
      setLoading(false);
    })();
  },[id]);

  const load = useCallback(async()=>{
    if (!selCat) return;
    const { data } = await supabase.from('tournament_matches').select('id,round,match_number,home_team_id,away_team_id,home_score,away_score,status,match_date,home_team:tournament_teams!home_team_id(id,name,logo_url),away_team:tournament_teams!away_team_id(id,name,logo_url)').eq('tournament_id',id).eq('category_id',selCat).in('round',RO).order('match_number',{ascending:true});
    setMatches((data as any)||[]);
  },[selCat,id]);

  useEffect(()=>{ load(); },[load]);

  if (loading) return <Loader isDark={isDark} />;

  const byRound: Record<string,BM[]> = {};
  for (const m of matches) (byRound[m.round]=byRound[m.round]||[]).push(m);
  const main   = RO.filter(r=>r!=='3rd'&&byRound[r]?.length);
  const third  = byRound['3rd']||[];
  const final  = byRound['F']?.[0];
  const champ  = final?.status==='completed'
    ? ((final.home_score??-1)>(final.away_score??-1)?final.home_team:(final.away_score??-1)>(final.home_score??-1)?final.away_team:null)
    : null;

  if (cats.length===0) return (
    <div style={{ background:S.surface, border:`2px dashed ${S.border}`, borderRadius:18, padding:'60px 24px', textAlign:'center' }}>
      <div style={{ fontSize:40, marginBottom:14 }}>🏆</div>
      <div style={{ fontSize:15, fontWeight:700, color:S.text, marginBottom:8 }}>لا توجد فئات إقصائية</div>
      <div style={{ fontSize:13, color:S.text2 }}>أضف فئة من نوع «إقصائي» أو «مجموعات + إقصاء» في الإعداد</div>
    </div>
  );

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:14 }}>

      {/* Category tabs */}
      {cats.length>1 && (
        <div style={{ background:S.surface, border:`1px solid ${S.border}`, borderRadius:14, padding:'12px 16px' }}>
          <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
            {cats.map(c=>(
              <button key={c.id} onClick={()=>setSelCat(c.id)} className={`sp-cat-tab${selCat===c.id?' active':''}`}>{c.name}</button>
            ))}
          </div>
        </div>
      )}

      {matches.length===0
        ? <div style={{ background:S.surface, border:`2px dashed ${S.border}`, borderRadius:16, padding:'48px 24px', textAlign:'center' }}>
            <div style={{ fontSize:34, marginBottom:12 }}>🌳</div>
            <div style={{ fontSize:15, fontWeight:700, color:S.text, marginBottom:8 }}>لا توجد مباريات إقصائية</div>
            <div style={{ fontSize:13, color:S.text2 }}>ولّد الجدول من تبويب «الجدول» ثم ارجع هنا</div>
          </div>
        : <>
            {/* Champion */}
            {champ && (
              <div style={{ background:'linear-gradient(135deg,#78350f,#d97706,#fbbf24)', borderRadius:20, padding:'22px 28px', display:'flex', alignItems:'center', gap:18, boxShadow:'0 8px 32px rgba(217,119,6,0.4)' }}>
                <span style={{ fontSize:40 }}>🏆</span>
                <LogoImg name={champ.name} logo={champ.logo_url} size={52} />
                <div>
                  <div style={{ fontSize:12, color:'rgba(255,255,255,0.65)', fontWeight:600, marginBottom:4 }}>بطل البطولة</div>
                  <div style={{ fontSize:24, fontWeight:900, color:'#fff' }}>{champ.name}</div>
                </div>
              </div>
            )}

            {/* Bracket scroll */}
            <div className="sp-card" style={{ background:S.surface, borderColor:S.border }}>
              <div style={{ padding:'12px 18px', borderBottom:`1px solid ${S.border}`, background:S.surface2 }}>
                <span style={{ fontSize:14, fontWeight:700, color:S.text }}>🌳 شجرة الإقصاء</span>
                <span style={{ fontSize:12, color:S.text2, marginRight:8 }}>— {matches.length} مباراة</span>
              </div>
              <div style={{ overflowX:'auto', padding:'20px 16px' }} className="sp-scroll">
                <div dir="ltr" style={{ display:'flex', gap:20, minWidth:'max-content' }}>
                  {main.map(round=>(
                    <div key={round} style={{ display:'flex', flexDirection:'column', gap:10 }}>
                      <div style={{ textAlign:'center', padding:'8px 14px', borderRadius:10, background:round==='F'?'linear-gradient(135deg,#78350f,#d97706)':round==='SF'?'#2e1065':S.surface3 }}>
                        <div style={{ fontSize:11, fontWeight:800, color:'#fff' }}>{RL[round]||round}</div>
                        <div style={{ fontSize:10, color:'rgba(255,255,255,0.45)' }}>{byRound[round].length} م</div>
                      </div>
                      {byRound[round].map(m=>(
                        <BracketCard key={m.id} m={m} S={S} isFinal={round==='F'} />
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* 3rd place */}
            {third.length>0 && (
              <div className="sp-card" style={{ background:S.surface, borderColor:S.border }}>
                <div style={{ padding:'10px 18px', borderBottom:`1px solid ${S.border}`, background:'linear-gradient(90deg,#7c2d12,#ea580c)' }}>
                  <span style={{ fontSize:13, fontWeight:700, color:'#fff' }}>🥉 نهائي المركز الثالث</span>
                </div>
                <div style={{ padding:16, display:'flex', gap:12, flexWrap:'wrap' }}>
                  {third.map(m=><BracketCard key={m.id} m={m} S={S} />)}
                </div>
              </div>
            )}
          </>
      }
    </div>
  );
}

function BracketCard({ m, S, isFinal=false }: { m:BM; S:any; isFinal?:boolean }) {
  const fin=m.status==='completed', hs=m.home_score, as_=m.away_score;
  const hw=fin&&hs!==null&&as_!==null&&hs>as_, aw=fin&&hs!==null&&as_!==null&&as_>hs;
  const Row=({ t, won, score }:{ t?:Team|null; won:boolean; score:number|null })=>(
    <div className={`sp-bracket-team${won?' winner':''}`} style={{ background:won?(S===L?'rgba(22,163,74,0.08)':'rgba(22,163,74,0.1)'):'transparent' }}>
      <LogoImg name={t?.name||'TBD'} logo={t?.logo_url} size={22} />
      <span style={{ flex:1, fontSize:12, fontWeight:won?700:500, color:t?S.text:S.text2, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{t?.name||'TBD'}</span>
      <span className={`sp-bracket-score${won?' winner':''}`}>{score??'—'}</span>
    </div>
  );
  return (
    <div className={`sp-bracket-card${isFinal?' final':''}`} style={{ background:S.surface, borderColor:isFinal?'#f59e0b':S.border }}>
      <Row t={m.home_team} won={hw} score={hs} />
      <Row t={m.away_team} won={aw} score={as_} />
      {m.match_date&&<div style={{ padding:'4px 10px', background:S.surface2, fontSize:10, color:S.text2, textAlign:'center' }}>{new Date(m.match_date).toLocaleDateString('ar-SA',{month:'short',day:'numeric'})}</div>}
    </div>
  );
}

// LogoImg = TeamLogo (imported at top)
function Loader({ isDark }: { isDark:boolean }) {
  return <div style={{ display:'flex',justifyContent:'center',alignItems:'center',minHeight:300 }}><div style={{ width:36,height:36,borderRadius:'50%',border:`3px solid ${isDark?'rgba(255,255,255,0.1)':'#e2e8f0'}`,borderTopColor:'#d97706',animation:'spin 0.7s linear infinite' }} /><style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style></div>;
}

const D = { surface:'#131929', surface2:'#1a2235', surface3:'#1e293b', border:'rgba(255,255,255,0.07)', text:'#e8eaf0', text2:'#64748b' };
const L = { surface:'#ffffff', surface2:'#f8fafc', surface3:'#f1f5f9', border:'#e2e8f0', text:'#0f172a', text2:'#64748b' };
