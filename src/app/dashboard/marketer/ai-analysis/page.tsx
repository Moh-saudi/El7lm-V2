'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Brain, Download, Search } from 'lucide-react';
import { toast } from 'sonner';
import LanguageSwitcher from '@/components/shared/LanguageSwitcher';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/lib/firebase/auth-provider';
import { useTranslation } from '@/lib/i18n';
import { supabase } from '@/lib/supabase/config';

interface PlayerAnalysis {
  id: string;
  playerId: string;
  playerName: string;
  date: string;
  performance: { overall: number; physical: number; technical: number; tactical: number; mental: number };
  predictions: { nextMatch: number; seasonEnd: number; potential: number };
  insights: string[];
  recommendations: string[];
  riskFactors: { injury: number; fatigue: number; form: number };
}

export default function MarketerAIAnalysisPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { isRTL, getTranslations } = useTranslation();
  const shared = getTranslations<any>('clubAiAnalysis');
  const copy = getTranslations<any>('marketerAiAnalysis');
  const [analyses, setAnalyses] = useState<PlayerAnalysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    const fetchAnalyses = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase.from('player_analyses').select('*').eq('marketerId', user.id);
        if (error) throw error;
        const result = (data || []) as PlayerAnalysis[];
        setAnalyses(result);
        if (result.length === 0) toast.info(shared.noAnalysesToast);
      } catch (error) {
        console.error('Error fetching analyses:', error);
        toast.error(shared.loadError);
        setAnalyses([]);
      } finally {
        setLoading(false);
      }
    };
    void fetchAnalyses();
  }, [shared.loadError, shared.noAnalysesToast, user]);

  const getPerformanceColor = (score: number) => score >= 80 ? 'text-green-600' : score >= 60 ? 'text-yellow-600' : 'text-red-600';
  const getRiskLevel = (risk: number) => risk >= 70 ? shared.riskLevels.high : risk >= 40 ? shared.riskLevels.medium : shared.riskLevels.low;
  const getRiskColor = (risk: number) => risk >= 70 ? 'text-red-600' : risk >= 40 ? 'text-yellow-600' : 'text-green-600';

  const Header = () => (
    <div className="mb-8">
      <div className="mb-4 flex items-center justify-between gap-4">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
          <ArrowLeft className={`h-5 w-5 ${isRTL ? 'rotate-180' : ''}`} /> {shared.back}
        </button>
        <LanguageSwitcher />
      </div>
      <h1 className="mb-2 text-3xl font-bold text-gray-900">{shared.title}</h1>
      <p className="text-gray-600">{copy.subtitle}</p>
    </div>
  );

  if (loading) return <div className="flex min-h-screen items-center justify-center" dir={isRTL ? 'rtl' : 'ltr'}><div className="text-center"><div className="mx-auto mb-4 h-16 w-16 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" /><p className="text-gray-600">{shared.loading}</p></div></div>;

  if (analyses.length === 0) return (
    <div className="min-h-screen bg-gray-50 p-6" dir={isRTL ? 'rtl' : 'ltr'}>
      <Header />
      <div className="flex min-h-[400px] items-center justify-center"><div className="text-center"><Brain className="mx-auto mb-6 h-24 w-24 text-gray-400" /><h2 className="mb-4 text-2xl font-bold text-gray-900">{shared.emptyTitle}</h2><p className="mx-auto mb-6 max-w-md text-gray-600">{copy.emptyDescription}</p></div></div>
    </div>
  );

  const filteredAnalyses = analyses.filter((analysis) => analysis.playerName.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="min-h-screen bg-gray-50 p-6" dir={isRTL ? 'rtl' : 'ltr'}>
      <Header />
      <div className="mb-8 flex flex-col gap-4 sm:flex-row">
        <div className="relative flex-1"><Search className={`absolute top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400 ${isRTL ? 'right-3' : 'left-3'}`} /><Input type="text" placeholder={shared.searchPlaceholder} value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} className={isRTL ? 'w-full pr-12' : 'w-full pl-12'} /></div>
        <Button onClick={() => router.push('/dashboard/marketer/ai-analysis/new')}>{copy.newAnalysis}</Button>
      </div>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredAnalyses.map((analysis) => (
          <motion.div key={analysis.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="overflow-hidden rounded-xl bg-white shadow-lg">
            <Card><CardHeader className="pb-4"><div className="flex items-start justify-between gap-2"><div><CardTitle className="text-xl">{analysis.playerName}</CardTitle><p className="mt-1 text-sm text-gray-600">{analysis.date}</p></div><Badge className="bg-blue-100 text-blue-800">{copy.recentAnalysis}</Badge></div></CardHeader>
              <CardContent><div className="space-y-4">
                <div><h4 className="mb-2 text-sm font-semibold">{copy.performanceMetrics}</h4><div className="grid grid-cols-2 gap-4"><div className="rounded-lg bg-gray-50 p-2 text-center"><p className="text-sm text-gray-600">{shared.performanceTitle}</p><p className={`text-lg font-semibold ${getPerformanceColor(analysis.performance.overall)}`}>{analysis.performance.overall}%</p></div><div className="rounded-lg bg-gray-50 p-2 text-center"><p className="text-sm text-gray-600">{copy.potential}</p><p className={`text-lg font-semibold ${getPerformanceColor(analysis.predictions.potential)}`}>{analysis.predictions.potential}%</p></div></div></div>
                <div><h4 className="mb-2 text-sm font-semibold">{copy.riskFactors}</h4><div className="space-y-2">{Object.entries(analysis.riskFactors).map(([risk, value]) => <div key={risk} className="flex items-center justify-between"><span className="text-sm text-gray-600">{copy.risks[risk]}</span><span className={`text-sm font-semibold ${getRiskColor(value)}`}>{getRiskLevel(value)}</span></div>)}</div></div>
                <div className="flex justify-end gap-2 pt-4"><Button variant="outline" size="sm" onClick={() => router.push(`/dashboard/marketer/ai-analysis/${analysis.id}`)}>{copy.viewDetails}</Button><Button variant="outline" size="sm"><Download className="h-4 w-4" /> {copy.downloadReport}</Button></div>
              </div></CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
