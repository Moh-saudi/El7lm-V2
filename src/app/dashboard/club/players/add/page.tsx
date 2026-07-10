'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function AddClubPlayer() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const editId = searchParams.get('edit');

    if (editId) {
      router.replace(`/dashboard/shared/player-form?mode=edit&accountType=club&playerId=${editId}`);
      return;
    }

    router.replace('/dashboard/shared/player-form?mode=add&accountType=club');
  }, [router, searchParams]);

  return null;
}
