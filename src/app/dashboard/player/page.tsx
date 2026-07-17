'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Sparkles,
  Star,
  TrendingUp,
  Trophy,
  User,
} from 'lucide-react';
import { useAccountTypeAuth } from '@/hooks/useAccountTypeAuth';
import { useAuth } from '@/lib/firebase/auth-provider';
import { getExploreOpportunities } from '@/lib/firebase/opportunities';
import { useTranslation } from '@/lib/i18n';
import { OPPORTUNITY_TYPES } from '@/lib/opportunities/config';
import { Opportunity } from '@/types/opportunities';
import ReferralWelcomeModal from '@/components/referrals/ReferralWelcomeModal';
import PlayerOrganizationCard from '@/components/referrals/PlayerOrganizationCard';
import PhoneCollectionModal from '@/components/player/PhoneCollectionModal';

export default function PlayerDashboard() {
  const { t } = useTranslation();
  const { isAuthorized, isCheckingAuth } = useAccountTypeAuth({
    allowedTypes: ['player', 'parent'],
    redirectTo: '/dashboard',
  });
  const { user, userData } = useAuth();
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [welcomeMessageIndex, setWelcomeMessageIndex] = useState(0);

  useEffect(() => {
    getExploreOpportunities().then((list) => setOpportunities(list.slice(0, 6))).catch(() => {});
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setWelcomeMessageIndex((current) => (current + 1) % 4);
    }, 8000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!userData || isCheckingAuth || (userData.phone && !userData.profileUpdateRequested)) return;
    const timer = window.setTimeout(() => setShowPhoneModal(true), 1500);
    return () => window.clearTimeout(timer);
  }, [userData, isCheckingAuth]);

  useEffect(() => {
    if (!user || !userData || userData.accountType !== 'player') return;
    if (localStorage.getItem(`never_show_referral_modal_${user.id}`) === 'true') return;
    if (localStorage.getItem(`welcome_modal_${user.id}`)) return;
    const timer = window.setTimeout(() => {
      setShowWelcomeModal(true);
      localStorage.setItem(`welcome_modal_${user.id}`, 'true');
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [user, userData]);

  if (isCheckingAuth) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
          <p className="text-sm text-gray-600 md:text-base">{t('dashboard.checkingAuth')}</p>
        </div>
      </div>
    );
  }

  if (!isAuthorized) return null;

  const playerFirstName = String(
    userData?.full_name?.split(' ')[0] ||
      userData?.name?.split(' ')[0] ||
      user?.user_metadata?.full_name?.split(' ')[0] ||
      t('dashboard.player')
  );
  const welcomeMessages = [0, 1, 2, 3].map((index) => t(`dashboard.welcomeMessages.${index}`));
  const recommendedOpportunities = opportunities.filter((opp) => {
    const playerPos = userData?.position || userData?.playing_position || '';
    const playerCountry = userData?.country || '';
    return Boolean(
      (playerPos && opp.targetPositions?.includes(playerPos)) ||
        (playerCountry && opp.country === playerCountry)
    );
  });
  const visibleOpportunities = (recommendedOpportunities.length ? recommendedOpportunities : opportunities).slice(0, 3);

  return (
    <div className="min-h-screen bg-slate-50">
      {showWelcomeModal && !showPhoneModal && user && (
        <ReferralWelcomeModal
          playerId={user.id}
          playerName={userData?.full_name || user.user_metadata?.full_name || t('dashboard.player')}
          onClose={() => setShowWelcomeModal(false)}
        />
      )}
      {showPhoneModal && (
        <PhoneCollectionModal isOpen={showPhoneModal} onClose={() => setShowPhoneModal(false)} forceOpen />
      )}

      <main className="mx-auto max-w-7xl px-3 py-4 sm:px-6 sm:py-6 lg:px-8">
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-indigo-950 to-purple-900 p-4 text-white shadow-xl sm:p-6 md:p-8">
          <div className="absolute -left-16 -top-20 h-48 w-48 rounded-full bg-cyan-400/20 blur-3xl" />
          <div className="absolute -bottom-24 right-0 h-56 w-56 rounded-full bg-fuchsia-400/20 blur-3xl" />
          <div className="relative flex items-center gap-3 md:gap-5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/15 text-2xl ring-1 ring-white/20 md:h-16 md:w-16 md:text-4xl">
              {['👋', '⚽', '🚀', '🏆'][welcomeMessageIndex]}
            </div>
            <div className="min-w-0 flex-1">
              <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.18em] text-cyan-200 sm:text-xs">{t('dashboard.welcomeLabel')}</p>
              <h1 className="truncate text-xl font-black sm:text-2xl md:text-3xl">{t('dashboard.welcomePlayer')}, {playerFirstName}!</h1>
              <p className="mt-1 text-sm leading-6 text-white/80 sm:text-base">{welcomeMessages[welcomeMessageIndex]}</p>
            </div>
            <Sparkles className="hidden h-8 w-8 shrink-0 text-yellow-300 md:block" />
          </div>
          <div className="relative mt-4 flex items-center justify-between border-t border-white/10 pt-3">
            <div className="flex items-center gap-1.5" aria-label={t('dashboard.welcomeMessageControls')}>
              {welcomeMessages.map((_, index) => (
                <button
                  key={index}
                  type="button"
                  aria-label={`${t('dashboard.welcomeMessage')} ${index + 1}`}
                  onClick={() => setWelcomeMessageIndex(index)}
                  className={`h-1.5 rounded-full transition-all ${index === welcomeMessageIndex ? 'w-7 bg-yellow-300' : 'w-1.5 bg-white/40 hover:bg-white/70'}`}
                />
              ))}
            </div>
            <div className="flex gap-1">
              <button type="button" aria-label={t('dashboard.previousWelcomeMessage')} onClick={() => setWelcomeMessageIndex((welcomeMessageIndex + 3) % 4)} className="rounded-full p-1.5 text-white/70 hover:bg-white/10 hover:text-white">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button type="button" aria-label={t('dashboard.nextWelcomeMessage')} onClick={() => setWelcomeMessageIndex((welcomeMessageIndex + 1) % 4)} className="rounded-full p-1.5 text-white/70 hover:bg-white/10 hover:text-white">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </section>

        <section className="mt-4 rounded-2xl bg-gradient-to-br from-indigo-600 via-purple-600 to-fuchsia-600 p-4 text-white shadow-lg sm:mt-6 sm:p-6">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-white p-2.5 shadow-md"><Star className="h-5 w-5 fill-yellow-400 text-yellow-400" /></div>
            <div className="min-w-0 flex-1">
              <h2 className="text-base font-black sm:text-xl">{t('dashboard.completeProfileTitle')}</h2>
              <p className="mt-1 text-xs text-white/80 sm:text-sm">{t('dashboard.completeProfileDesc')}</p>
            </div>
            <span className="text-xl font-black text-yellow-300 sm:text-2xl">45%</span>
          </div>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/20"><div className="h-full w-[45%] rounded-full bg-yellow-300" /></div>
          <div className="mt-4 grid grid-cols-3 gap-1.5 sm:gap-2">
            <div className="rounded-lg bg-white/10 p-2 text-center"><CheckCircle className="mx-auto h-4 w-4 text-green-300" /><p className="mt-1 truncate text-[10px] font-bold sm:text-xs">{t('dashboard.betterVisibility')}</p></div>
            <div className="rounded-lg bg-white/10 p-2 text-center"><TrendingUp className="mx-auto h-4 w-4 text-blue-300" /><p className="mt-1 truncate text-[10px] font-bold sm:text-xs">{t('dashboard.moreOpportunities')}</p></div>
            <div className="rounded-lg bg-white/10 p-2 text-center"><Trophy className="mx-auto h-4 w-4 text-yellow-300" /><p className="mt-1 truncate text-[10px] font-bold sm:text-xs">{t('dashboard.professionalLook')}</p></div>
          </div>
          <Link href="/dashboard/player/profile" className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-bold text-purple-700 shadow-md transition hover:bg-yellow-300 sm:w-auto">
            <User className="h-4 w-4" />{t('dashboard.completeProfileBtn')}<ArrowRight className="h-4 w-4" />
          </Link>
        </section>

        {user && <section className="mt-4 sm:mt-6"><PlayerOrganizationCard playerId={user.id} playerName={String(userData?.full_name || userData?.name || user.email || '')} /></section>}

        <section className="mt-6 sm:mt-8">
          <div className="mb-3 flex items-center justify-between sm:mb-4">
            <div><p className="text-xs font-semibold uppercase tracking-wider text-green-600">{recommendedOpportunities.length ? t('dashboard.recommendedForYou') : t('dashboard.latestOpportunities')}</p><h2 className="text-lg font-black text-slate-900 sm:text-2xl">{t('dashboard.latestOpportunities')}</h2></div>
            <Link href="/dashboard/player/search" className="text-xs font-bold text-green-600 hover:text-green-700 sm:text-sm">{t('dashboard.viewAll')}</Link>
          </div>
          {visibleOpportunities.length > 0 ? (
            <div className="flex snap-x gap-3 overflow-x-auto pb-2 sm:grid sm:grid-cols-3 sm:overflow-visible">
              {visibleOpportunities.map((opp) => {
                const cfg = OPPORTUNITY_TYPES[opp.opportunityType] ?? { label: opp.opportunityType, emoji: '📌', color: '#6B7280' };
                return <Link key={opp.id} href={`/dashboard/player/explore-opportunities?opportunity=${opp.id}`} className="min-w-[82%] snap-start overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:min-w-0">
                  {opp.coverImage ? <div className="h-32 overflow-hidden bg-slate-100"><img src={opp.coverImage} alt={opp.title} className="h-full w-full object-cover" /></div> : opp.promoVideo ? <div className="h-32 overflow-hidden bg-black"><video src={opp.promoVideo} className="h-full w-full object-cover" muted playsInline preload="metadata" /></div> : <div className="h-3 bg-gradient-to-r from-green-400 to-cyan-500" />}
                  <div className="p-4"><span className="inline-flex rounded-full px-2 py-1 text-[10px] font-bold text-white" style={{ backgroundColor: cfg.color }}>{cfg.emoji} {cfg.label}</span><h3 className="mt-2 line-clamp-2 text-sm font-bold text-slate-900">{opp.title}</h3><p className="mt-2 flex items-center gap-1 text-xs text-slate-500"><MapPin className="h-3 w-3" />{opp.organizerName}</p></div>
                </Link>;
              })}
            </div>
          ) : <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">{t('dashboard.noOpportunities')}</div>}
        </section>

        <section className="mt-6 overflow-hidden rounded-2xl border border-yellow-200 bg-gradient-to-r from-amber-50 to-orange-50 p-4 sm:mt-8 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-3"><div className="rounded-xl bg-yellow-100 p-3"><Trophy className="h-6 w-6 text-yellow-600" /></div><div><h2 className="text-base font-black text-slate-900 sm:text-lg">{t('dashboard.tournamentRegistration')}</h2><p className="mt-1 text-xs text-slate-600 sm:text-sm">{t('dashboard.tournamentRegistrationDesc')}</p></div></div><Link href="/tournaments/unified-registration" className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-yellow-500 to-orange-600 px-4 py-3 text-sm font-bold text-white shadow-md transition hover:from-yellow-600 hover:to-orange-700 sm:w-auto">{t('dashboard.registerInTournamentsBtn')}<ArrowRight className="h-4 w-4" /></Link></div>
        </section>
      </main>
    </div>
  );
}
