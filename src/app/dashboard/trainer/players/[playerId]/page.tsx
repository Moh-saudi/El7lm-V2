'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

export default function TrainerPlayerProfileRedirect() {
  const router = useRouter();
  const params = useParams();
  const playerId = params?.playerId as string | undefined;

  useEffect(() => {
    if (!playerId) return;
    router.replace(`/dashboard/shared/player-profile/${playerId}?returnPath=/dashboard/trainer/players`);
  }, [router, playerId]);

  return null;
}
