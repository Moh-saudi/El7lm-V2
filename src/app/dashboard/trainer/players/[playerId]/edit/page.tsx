'use client';
import { useRouter, useParams } from 'next/navigation';
import { useEffect } from 'react';

export default function EditTrainerPlayer() {
  const router = useRouter();
  const params = useParams();
  const playerId = params.playerId as string;
  
  useEffect(() => {
    // التوجيه إلى الصفحة المشتركة مع معاملات التعديل للمدرب
    router.replace(`/dashboard/shared/player-form?mode=edit&accountType=trainer&playerId=${playerId}`);
  }, [router, playerId]);
  
  return null;
} 
