'use client';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function AddTrainerPlayer() {
  const router = useRouter();
  
  useEffect(() => {
    // التوجيه إلى الصفحة المشتركة مع معاملات المدرب
    router.replace('/dashboard/shared/player-form?mode=add&accountType=trainer');
  }, [router]);
  
  return null;
} 
