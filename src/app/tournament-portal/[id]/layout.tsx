'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Spin } from 'antd';
import { getCurrentClient, createPortalClient, TournamentClient } from '@/lib/tournament-portal/auth';
import { PortalShell, usePortalTheme } from '../_components/PortalShell';
import { TournamentNav } from './_components/TournamentNav';
import '../portal.css';
import { useTranslation } from '@/lib/i18n';

const STATUS_DOT: Record<string, string> = {
  draft: '#64748b', open: '#16a34a', closed: '#ef4444',
  ongoing: '#3b82f6', completed: '#8b5cf6', cancelled: '#94a3b8',
};
function TournamentHeader({ tournament, id }: { tournament: any; id: string }) {
  const { locale, getTranslations } = useTranslation();
  const section = getTranslations<any>('tournamentPortalSection');
  const portal = getTranslations<any>('tournamentPortal');
  const { isDark } = usePortalTheme();
  const dotColor = STATUS_DOT[tournament.status] || '#64748b';
  const statusLbl = portal.dashboard.statuses[tournament.status] || tournament.status;

  return (
    <div style={{
      margin: '-24px -24px 0',
      borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.07)' : '#e2e8f0'}`,
      background: isDark ? '#0f172a' : '#fff',
    }}>
      <div style={{ padding: '12px 24px 0' }}>
        {/* Breadcrumb */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
          <Link href="/tournament-portal" style={{ fontSize: 12, color: isDark ? '#475569' : '#94a3b8', textDecoration: 'none' }}>
            {section.myTournaments}
          </Link>
          <span style={{ fontSize: 10, color: isDark ? '#374151' : '#d1d5db' }}>›</span>
          <span style={{ fontSize: 12, fontWeight: 600, color: isDark ? '#e2e8f0' : '#374151', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {tournament.name}
          </span>
        </div>

        {/* Tournament info row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingBottom: 12 }}>
          {tournament.logo_url ? (
            <img src={tournament.logo_url} alt={tournament.name}
              style={{ width: 36, height: 36, borderRadius: 9, objectFit: 'cover', flexShrink: 0 }} />
          ) : (
            <div style={{ width: 36, height: 36, borderRadius: 9, flexShrink: 0, background: 'linear-gradient(135deg,#d97706,#ea580c)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ color: '#fff', fontSize: 16 }}>🏆</span>
            </div>
          )}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: isDark ? '#f1f5f9' : '#0f172a' }}>{tournament.name}</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: `${dotColor}18`, border: `1px solid ${dotColor}35`, borderRadius: 12, padding: '2px 9px', fontSize: 11, fontWeight: 700, color: dotColor }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: dotColor, display: 'inline-block' }} />
                {statusLbl}
              </span>
            </div>
            <div style={{ fontSize: 11, color: isDark ? '#475569' : '#94a3b8', marginTop: 2 }}>
              {[tournament.city, tournament.country].filter(Boolean).join('، ')}
              {tournament.start_date && ` · ${new Date(tournament.start_date).toLocaleDateString(locale, { month: 'short', day: 'numeric', year: 'numeric' })}`}
            </div>
          </div>
        </div>
      </div>

      <TournamentNav tournamentId={id} />
    </div>
  );
}

export default function TournamentLayout({ children }: { children: React.ReactNode }) {
  const { getTranslations } = useTranslation();
  const section = getTranslations<any>('tournamentPortalSection');
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [client,     setClient]     = useState<TournamentClient | null>(null);
  const [tournament, setTournament] = useState<any>(null);
  const [loading,    setLoading]    = useState(true);

  useEffect(() => {
    (async () => {
      const c = await getCurrentClient();
      if (!c) { router.replace('/tournament-portal/login'); return; }
      setClient(c);
      const supabase = createPortalClient();
      const { data } = await supabase.from('tournament_new').select('id,name,status,type,country,city,logo_url,start_date,end_date').eq('id', id).eq('client_id', c.id).single();
      setTournament(data);
      setLoading(false);
    })();
  }, [id]);

  if (!client || loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Spin size="large" />
    </div>
  );

  if (!tournament) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 12, padding: '20px 28px', color: '#991b1b', fontSize: 14, fontWeight: 600 }}>
        {section.notFound}
      </div>
    </div>
  );

  return (
    <PortalShell client={client}>
      <TournamentHeader tournament={tournament} id={id} />
      <div className="portal-page" style={{ paddingTop: 20, paddingBottom: 32 }}>{children}</div>
    </PortalShell>
  );
}
