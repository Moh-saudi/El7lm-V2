'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';

export default function PlayerSearchProfileRedirectPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useTranslation();

  useEffect(() => {
    const type = searchParams.get('type');
    const id = searchParams.get('id');

    if (type && id) {
      router.replace(`/dashboard/player/search/profile/${type}/${id}`);
    } else {
      router.replace('/dashboard/player/search-opportunities');
    }
  }, [router, searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600 mx-auto mb-4" />
        <p className="text-gray-500 font-medium">{t('playerEntitySearch.redirecting')}</p>
      </div>
    </div>
  );
}
