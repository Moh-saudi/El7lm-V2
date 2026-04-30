'use client';

import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { createPortalClient } from '@/lib/tournament-portal/auth';

type PrintType = 'schedule' | 'standings' | 'teams';

export default function PrintPage() {
  const { id }   = useParams<{ id: string }>();
  const params   = useSearchParams();
  const type     = (params.get('type') || 'schedule') as PrintType;

  const [data, setData] = useState<any>(null);
  const [tournament, setTournament] = useState<any>(null);
  const supabase = createPortalClient();

  useEffect(() => {
    (async () => {
      const { data: t } = await supabase.from('tournament_new').select('name,logo_url,start_date,city').eq('id', id).single();
      setTournament(t);

      if (type === 'schedule') {
        const { data: m } = await supabase
          .from('tournament_matches')
          .select('*,home_team:tournament_teams!home_team_id(name),away_team:tournament_teams!away_team_id(name)')
          .eq('tournament_id', id)
          .order('match_number', { ascending: true });
        setData(m || []);
      } else if (type === 'standings') {
        const { data: s } = await supabase
          .from('tournament_standings')
          .select('*,team:tournament_teams(name),group:tournament_groups(name)')
          .eq('tournament_id', id)
          .order('points', { ascending: false })
          .order('goal_diff', { ascending: false });
        setData(s || []);
      } else if (type === 'teams') {
        const { data: teams } = await supabase
          .from('tournament_teams')
          .select('*')
          .eq('tournament_id', id)
          .eq('status', 'approved')
          .order('name');
        setData(teams || []);
      }
    })();
  }, [id, type]);

  useEffect(() => {
    if (data && tournament) {
      setTimeout(() => window.print(), 800);
    }
  }, [data, tournament]);

  if (!data || !tournament) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', fontFamily: 'Tajawal, sans-serif' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 36, height: 36, borderRadius: '50%', border: '3px solid #e2e8f0', borderTopColor: '#d97706', animation: 'spin 0.7s linear infinite', margin: '0 auto 12px' }} />
        <p style={{ color: '#64748b' }}>جاري التحضير للطباعة...</p>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  const ROUND_LBL: Record<string,string> = {
    league:'الدوري', group_stage:'دور المجموعات', R16:'دور الـ16',
    QF:'ربع النهائي', SF:'نصف النهائي', F:'النهائي', '3rd':'المركز الثالث',
  };

  const STATUS_LBL: Record<string,string> = {
    scheduled:'مجدولة', live:'مباشر', completed:'منتهية', postponed:'مؤجلة',
  };

  // Group standings by group
  const byGroup: Record<string, any[]> = {};
  if (type === 'standings') {
    for (const s of data) {
      const key = s.group?.name || 'الترتيب العام';
      (byGroup[key] = byGroup[key] || []).push(s);
    }
  }

  return (
    <div dir="rtl" style={{ fontFamily: 'Tajawal, sans-serif', padding: '24px', maxWidth: 900, margin: '0 auto', color: '#0f172a' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;700;900&display=swap');
        @media print {
          body { margin: 0; }
          .no-print { display: none !important; }
          @page { margin: 1.5cm; size: A4; }
        }
        * { box-sizing: border-box; }
      `}</style>

      {/* Print controls */}
      <div className="no-print" style={{ display: 'flex', gap: 10, marginBottom: 20, justifyContent: 'center' }}>
        <button onClick={() => window.print()} style={{ padding: '10px 24px', background: '#d97706', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, cursor: 'pointer', fontSize: 14, fontFamily: 'Tajawal, sans-serif' }}>
          🖨️ طباعة
        </button>
        <button onClick={() => window.close()} style={{ padding: '10px 18px', background: '#f1f5f9', color: '#0f172a', border: '1px solid #e2e8f0', borderRadius: 10, fontWeight: 600, cursor: 'pointer', fontSize: 14, fontFamily: 'Tajawal, sans-serif' }}>
          إغلاق
        </button>
      </div>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, borderBottom: '3px solid #d97706', paddingBottom: 16, marginBottom: 24 }}>
        {tournament.logo_url && (
          <img src={tournament.logo_url} alt="" style={{ width: 56, height: 56, borderRadius: 12, objectFit: 'cover' }} />
        )}
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 900, margin: 0 }}>{tournament.name}</h1>
          <p style={{ fontSize: 13, color: '#64748b', margin: '4px 0 0' }}>
            {type === 'schedule' ? 'جدول المباريات' : type === 'standings' ? 'جدول الترتيب' : 'قائمة الفرق'}
            {tournament.start_date && ` · ${new Date(tournament.start_date).toLocaleDateString('ar-SA', { dateStyle: 'long' })}`}
            {tournament.city && ` · ${tournament.city}`}
          </p>
        </div>
        <div style={{ marginRight: 'auto', textAlign: 'left', fontSize: 11, color: '#94a3b8' }}>
          طُبع: {new Date().toLocaleDateString('ar-SA')}
        </div>
      </div>

      {/* SCHEDULE */}
      {type === 'schedule' && (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#0f172a', color: '#fff' }}>
              <th style={{ padding: '9px 10px', textAlign: 'center', width: 40 }}>#</th>
              <th style={{ padding: '9px 10px', textAlign: 'right' }}>الجولة</th>
              <th style={{ padding: '9px 10px', textAlign: 'right' }}>الفريق المضيف</th>
              <th style={{ padding: '9px 10px', textAlign: 'center', width: 70 }}>النتيجة</th>
              <th style={{ padding: '9px 10px', textAlign: 'right' }}>الفريق الضيف</th>
              <th style={{ padding: '9px 10px', textAlign: 'right' }}>التاريخ والوقت</th>
              <th style={{ padding: '9px 10px', textAlign: 'right' }}>الملعب</th>
              <th style={{ padding: '9px 10px', textAlign: 'center', width: 70 }}>الحالة</th>
            </tr>
          </thead>
          <tbody>
            {data.map((m: any, i: number) => (
              <tr key={m.id} style={{ background: i % 2 === 0 ? '#fff' : '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '8px 10px', textAlign: 'center', color: '#94a3b8', fontWeight: 700 }}>{m.match_number || i + 1}</td>
                <td style={{ padding: '8px 10px', fontSize: 12, color: '#64748b' }}>{ROUND_LBL[m.round] || m.round}</td>
                <td style={{ padding: '8px 10px', fontWeight: 700 }}>{m.home_team?.name || 'TBD'}</td>
                <td style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 900, fontFamily: 'monospace', fontSize: 15 }}>
                  {m.status === 'completed' ? `${m.home_score ?? 0} - ${m.away_score ?? 0}` : '—'}
                </td>
                <td style={{ padding: '8px 10px', fontWeight: 700 }}>{m.away_team?.name || 'TBD'}</td>
                <td style={{ padding: '8px 10px', fontSize: 12, color: '#475569' }}>
                  {m.match_date ? new Date(m.match_date).toLocaleString('ar-SA', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
                </td>
                <td style={{ padding: '8px 10px', fontSize: 12, color: '#475569' }}>{m.venue || '—'}</td>
                <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 8, background: m.status === 'completed' ? '#dcfce7' : m.status === 'live' ? '#fee2e2' : '#f1f5f9', color: m.status === 'completed' ? '#16a34a' : m.status === 'live' ? '#ef4444' : '#64748b' }}>
                    {STATUS_LBL[m.status] || m.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* STANDINGS */}
      {type === 'standings' && Object.entries(byGroup).map(([groupName, rows]) => (
        <div key={groupName} style={{ marginBottom: 28 }}>
          <h3 style={{ fontSize: 15, fontWeight: 800, margin: '0 0 10px', color: '#1d4ed8' }}>📊 {groupName}</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#0f172a', color: '#fff' }}>
                {['#','الفريق','لعب','فاز','تع','خسر','ل:ع','فارق','نقاط'].map(h => (
                  <th key={h} style={{ padding: '8px 10px', textAlign: h === 'الفريق' ? 'right' : 'center' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...rows].sort((a, b) => b.points - a.points || b.goal_diff - a.goal_diff).map((s: any, i) => (
                <tr key={s.id} style={{ background: i % 2 === 0 ? '#fff' : '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 800, color: ['#f59e0b','#94a3b8','#cd7f32'][i] || '#64748b' }}>{i + 1}</td>
                  <td style={{ padding: '8px 10px', fontWeight: 700 }}>{s.team?.name || '—'}</td>
                  <td style={{ padding: '8px 10px', textAlign: 'center' }}>{s.played}</td>
                  <td style={{ padding: '8px 10px', textAlign: 'center', color: '#16a34a', fontWeight: 700 }}>{s.won}</td>
                  <td style={{ padding: '8px 10px', textAlign: 'center', color: '#64748b' }}>{s.drawn}</td>
                  <td style={{ padding: '8px 10px', textAlign: 'center', color: '#dc2626', fontWeight: 700 }}>{s.lost}</td>
                  <td style={{ padding: '8px 10px', textAlign: 'center', fontFamily: 'monospace' }}>{s.goals_for}:{s.goals_against}</td>
                  <td style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 700, color: s.goal_diff >= 0 ? '#16a34a' : '#dc2626' }}>{s.goal_diff > 0 ? `+${s.goal_diff}` : s.goal_diff}</td>
                  <td style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 900, fontSize: 16 }}>{s.points}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}

      {/* TEAMS */}
      {type === 'teams' && (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#0f172a', color: '#fff' }}>
              {['#','اسم الفريق','المدينة','المسؤول','الجوال','الفئة','حالة الدفع'].map(h => (
                <th key={h} style={{ padding: '9px 10px', textAlign: h === '#' ? 'center' : 'right' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((t: any, i: number) => (
              <tr key={t.id} style={{ background: i % 2 === 0 ? '#fff' : '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '8px 10px', textAlign: 'center', color: '#94a3b8' }}>{i + 1}</td>
                <td style={{ padding: '8px 10px', fontWeight: 700 }}>{t.name}</td>
                <td style={{ padding: '8px 10px', color: '#64748b' }}>{t.city || '—'}</td>
                <td style={{ padding: '8px 10px', color: '#64748b' }}>{t.contact_name || '—'}</td>
                <td style={{ padding: '8px 10px', color: '#64748b', fontFamily: 'monospace' }}>{t.contact_phone || '—'}</td>
                <td style={{ padding: '8px 10px', color: '#64748b' }}>{t.category_id ? '✓' : '—'}</td>
                <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 6, background: '#f1f5f9', color: '#64748b' }}>
                    {t.registration?.payment_status || 'pending'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Footer */}
      <div style={{ marginTop: 32, paddingTop: 14, borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#94a3b8' }}>
        <span>منصة الحلم — إدارة البطولات</span>
        <span>el7lm.com</span>
      </div>
    </div>
  );
}
