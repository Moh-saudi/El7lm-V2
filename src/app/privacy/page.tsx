'use client';

import PublicLayout from "@/components/layout/PublicLayout.jsx";
import React from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from '@/lib/i18n';

export default function PrivacyPage() {
  const router = useRouter();
  const { t, isRTL, locale } = useTranslation();

  const handleBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      window.history.back();
    } else {
      router.push('/');
    }
  };

  const todayStr = typeof window !== 'undefined'
    ? new Date().toLocaleDateString({ ar: 'ar-QA', en: 'en-GB', es: 'es-ES', pt: 'pt-PT' }[locale])
    : '';

  return (
    <PublicLayout>
      <div className="min-h-screen bg-gray-50 py-12" dir={isRTL ? 'rtl' : 'ltr'}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-lg shadow-lg p-8">
            {/* Header */}
            <div className="text-center mb-12">
              <button
                onClick={handleBack}
                className="mb-6 px-4 py-2 bg-gray-100 rounded hover:bg-gray-200 text-gray-700 font-medium"
              >
                {t('privacy.back')}
              </button>
              <h1 className="text-4xl font-bold text-gray-900 mb-4">{t('privacy.title')}</h1>
              <p className="text-lg text-gray-600">
                {t('privacy.lastUpdate')} {todayStr}
              </p>
            </div>

            {/* Content */}
            <div className="prose prose-lg max-w-none">
              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">{t('privacy.introTitle')}</h2>
                <p className="text-gray-600 leading-relaxed">
                  {t('privacy.introDesc')}
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">{t('privacy.dataCollectionTitle')}</h2>
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-medium text-gray-800 mb-2">{t('privacy.personalInfo')}</h3>
                    <ul className="list-disc list-inside text-gray-600 space-y-1">
                      <li>{t('privacy.personalFullName')}</li>
                      <li>{t('privacy.personalEmail')}</li>
                      <li>{t('privacy.personalPhone')}</li>
                      <li>{t('privacy.personalDOB')}</li>
                      <li>{t('privacy.personalNationality')}</li>
                      <li>{t('privacy.personalSports')}</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-lg font-medium text-gray-800 mb-2">{t('privacy.technicalInfo')}</h3>
                    <ul className="list-disc list-inside text-gray-600 space-y-1">
                      <li>{t('privacy.technicalIP')}</li>
                      <li>{t('privacy.technicalBrowser')}</li>
                      <li>{t('privacy.technicalBrowsing')}</li>
                      <li>{t('privacy.technicalCookies')}</li>
                    </ul>
                  </div>
                </div>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">{t('privacy.dataUsageTitle')}</h2>
                <ul className="list-disc list-inside text-gray-600 space-y-2">
                  <li>{t('privacy.dataUsageAccount')}</li>
                  <li>{t('privacy.dataUsageServices')}</li>
                  <li>{t('privacy.dataUsageCommunication')}</li>
                  <li>{t('privacy.dataUsagePayments')}</li>
                  <li>{t('privacy.dataUsageProfile')}</li>
                  <li>{t('privacy.dataUsageAnalytics')}</li>
                  <li>{t('privacy.dataUsageLegal')}</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">{t('privacy.dataSharingTitle')}</h2>
                <p className="text-gray-600 leading-relaxed mb-4">
                  {t('privacy.dataSharingIntro')}
                </p>
                <ul className="list-disc list-inside text-gray-600 space-y-2">
                  <li><strong>{t('privacy.dataSharingClubs')}</strong> {t('privacy.dataSharingClubsDesc')}</li>
                  <li><strong>{t('privacy.dataSharingProviders')}</strong> {t('privacy.dataSharingProvidersDesc')}</li>
                  <li><strong>{t('privacy.dataSharingLegal')}</strong> {t('privacy.dataSharingLegalDesc')}</li>
                  <li><strong>{t('privacy.dataSharingRights')}</strong> {t('privacy.dataSharingRightsDesc')}</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">{t('privacy.securityTitle')}</h2>
                <p className="text-gray-600 leading-relaxed mb-4">
                  {t('privacy.securityIntro')}
                </p>
                <ul className="list-disc list-inside text-gray-600 space-y-2">
                  <li>{t('privacy.securityEncryption')}</li>
                  <li>{t('privacy.securityMonitoring')}</li>
                  <li>{t('privacy.securityUpdates')}</li>
                  <li>{t('privacy.securityAccess')}</li>
                  <li>{t('privacy.securityBackup')}</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">{t('privacy.rightsTitle')}</h2>
                <p className="text-gray-600 leading-relaxed mb-4">
                  {t('privacy.rightsIntro')}
                </p>
                <ul className="list-disc list-inside text-gray-600 space-y-2">
                  <li><strong>{t('privacy.rightsAccess')}</strong> {t('privacy.rightsAccessDesc')}</li>
                  <li><strong>{t('privacy.rightsCorrection')}</strong> {t('privacy.rightsCorrectionDesc')}</li>
                  <li><strong>{t('privacy.rightsDeletion')}</strong> {t('privacy.rightsDeletionDesc')}</li>
                  <li><strong>{t('privacy.rightsRestriction')}</strong> {t('privacy.rightsRestrictionDesc')}</li>
                  <li><strong>{t('privacy.rightsPortability')}</strong> {t('privacy.rightsPortabilityDesc')}</li>
                  <li><strong>{t('privacy.rightsObjection')}</strong> {t('privacy.rightsObjectionDesc')}</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">{t('privacy.cookiesTitle')}</h2>
                <p className="text-gray-600 leading-relaxed mb-4">
                  {t('privacy.cookiesIntro')}
                </p>
                <ul className="list-disc list-inside text-gray-600 space-y-2">
                  <li><strong>{t('privacy.cookiesEssential')}</strong> {t('privacy.cookiesEssentialDesc')}</li>
                  <li><strong>{t('privacy.cookiesPerformance')}</strong> {t('privacy.cookiesPerformanceDesc')}</li>
                  <li><strong>{t('privacy.cookiesPreferences')}</strong> {t('privacy.cookiesPreferencesDesc')}</li>
                  <li><strong>{t('privacy.cookiesMarketing')}</strong> {t('privacy.cookiesMarketingDesc')}</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">{t('privacy.retentionTitle')}</h2>
                <p className="text-gray-600 leading-relaxed">
                  {t('privacy.retentionDesc')}
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">{t('privacy.childrenTitle')}</h2>
                <p className="text-gray-600 leading-relaxed">
                  {t('privacy.childrenDesc')}
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">{t('privacy.changesTitle')}</h2>
                <p className="text-gray-600 leading-relaxed">
                  {t('privacy.changesDesc')}
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">{t('privacy.contactTitle')}</h2>
                <p className="text-gray-600 leading-relaxed mb-4">
                  {t('privacy.contactDesc')}
                </p>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <ul className="text-gray-600 space-y-2">
                    <li><strong>{t('privacy.contactEmail')}</strong> info@el7lm.com</li>
                    <li><strong>{t('privacy.contactPhoneQatar')}</strong> +974 7054 2458</li>
                    <li><strong>{t('privacy.contactPhoneEgypt')}</strong> +20 1017799580</li>
                    <li><strong>{t('privacy.contactAddress')}</strong> {t('contact.addressQatar')}</li>
                  </ul>
                </div>
              </section>

              <div className="border-t pt-6 mt-8">
                <p className="text-sm text-gray-500 text-center">
                  © {new Date().getFullYear()} {t('privacy.copyright')}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}
