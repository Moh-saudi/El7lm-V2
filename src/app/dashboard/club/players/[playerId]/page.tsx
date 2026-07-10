'use client';
import { useRouter, useParams } from 'next/navigation';
import { useEffect } from 'react';

export default function EditClubPlayer() {
  const router = useRouter();
  const params = useParams();
  const playerId = params.playerId as string;
  
  useEffect(() => {
    router.replace(`/dashboard/shared/player-form?mode=edit&accountType=club&playerId=${playerId}`);
  }, [router, playerId]);
  
  return null;
} 
