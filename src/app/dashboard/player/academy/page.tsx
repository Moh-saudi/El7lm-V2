"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from '@/lib/i18n';

export default function PlayerAcademyRedirect() {
  const router = useRouter();
  const { t, isRTL } = useTranslation();
  useEffect(() => {
    router.replace('/dashboard/dream-academy');
  }, [router]);
  return <div className="p-6" dir={isRTL ? 'rtl' : 'ltr'}>{t('sharedComponents.redirects.dreamAcademy')}</div>;
} 
