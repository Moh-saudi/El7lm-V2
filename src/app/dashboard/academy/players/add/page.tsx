'use client';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';

export default function AddAcademyPlayer() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  useEffect(() => {
    // فحص إذا كان وضع التعديل
    const editId = searchParams.get('edit');
    
    if (editId) {
      // وضع التعديل - التوجيه مع معرف اللاعب
      router.replace(`/dashboard/shared/player-form?mode=edit&accountType=academy&playerId=${editId}`);
    } else {
      // وضع الإضافة
    router.replace('/dashboard/shared/player-form?mode=add&accountType=academy');
    }
  }, [router, searchParams]);
  
  return null;
} 
