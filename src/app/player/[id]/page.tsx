'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/config';
import PlayerResume from '@/components/player/PlayerResume';
import { Trophy, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function PublicPlayerProfilePage({ params }: { params: { id: string } }) {
  const playerId = params.id;
  const [player, setPlayer] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    fetchPlayerData();
  }, [playerId]);

  const fetchPlayerData = async () => {
    try {
      setLoading(true);
      setNotFound(false);

      // Search in 'players' table first
      let { data } = await supabase
        .from('players')
        .select('*')
        .eq('id', playerId)
        .maybeSingle();

      if (!data) {
        // Fallback search by uid
        const { data: dataByUid } = await supabase
          .from('players')
          .select('*')
          .eq('uid', playerId)
          .maybeSingle();
        data = dataByUid;
      }

      if (!data) {
        // Fallback search in 'player' legacy table
        const { data: legacyData } = await supabase
          .from('player')
          .select('*')
          .eq('id', playerId)
          .maybeSingle();
        data = legacyData;
      }

      if (!data) {
        setNotFound(true);
      } else {
        setPlayer(data);
      }
    } catch (err) {
      console.error('Error fetching player profile:', err);
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-4">
        <div className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-slate-400 font-bold text-lg animate-pulse">جاري تحميل السيرة الذاتية الكروية والمعاينة...</p>
      </div>
    );
  }

  if (notFound || !player) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 text-center" dir="rtl">
        <div className="w-20 h-20 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mb-6 border border-red-500/20">
          <Trophy className="w-10 h-10 opacity-50" />
        </div>
        <h1 className="text-2xl font-black mb-2">الملف الشخصي غير موجود</h1>
        <p className="text-slate-400 mb-8 max-w-md">عذراً، لم نتمكن من العثور على سيرة ذاتية لهذا اللاعب. قد يكون الرابط منتهي الصلاحية أو غير صحيح.</p>
        <Link 
          href="/"
          className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold px-6 py-3 rounded-xl transition flex items-center gap-2"
        >
          <ArrowLeft className="w-5 h-5" />
          العودة للرئيسية
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 py-6 px-2 md:px-6">
      <PlayerResume player={player} playerOrganization={player._organization} />
    </div>
  );
}
