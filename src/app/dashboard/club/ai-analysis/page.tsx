'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Brain, CheckCircle2, Search } from 'lucide-react';
import { toast } from 'sonner';
import LanguageSwitcher from '@/components/shared/LanguageSwitcher';
import { Badge } from '@/components/ui/badge';
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

export default function AIAnalysisPage() {
  const router = useRouter();
  const { user, userData } = useAuth();
  const { isRTL, getTranslations } = useTranslation();
  const copy = getTranslations<any>('clubAiAnalysis');
  const [analyses, setAnalyses] = useState<PlayerAnalysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (!user) {
      router.push('/auth/login');
      return;
    }
    if (!userData) return;
    if (userData.accountType !== 'club') {
      router.push('/dashboard');
      return;
    }
    if (!userData.clubId) {
      setLoading(false);
      return;
    }

    const fetchAnalyses = async () => {
      try {
        setLoading(true);
        const { data } = await supabase
          .from('player_analyses')
          .select('*')
          .eq('clubId', userData.clubId);
        const result = (data || []) as PlayerAnalysis[];
        setAnalyses(result);
        if (result.length === 0) toast.info(copy.noAnalysesToast);
      } catch (error) {
        console.error('Error fetching analyses:', error);
        toast.error(copy.loadError);
        setAnalyses([]);
      } finally {
        setLoading(false);
      }
    };

    void fetchAnalyses();
  }, [copy.loadError, copy.noAnalysesToast, router, user, userData]);

  const getPerformanceColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };
  const getRiskLevel = (risk: number) =>
    risk >= 70 ? copy.riskLevels.high : risk >= 40 ? copy.riskLevels.medium : copy.riskLevels.low;
  const getRiskColor = (risk: number) =>
    risk >= 70 ? 'text-red-600' : risk >= 40 ? 'text-yellow-600' : 'text-green-600';

  const Header = () => (
    <div className="mb-8">
      <div className="mb-4 flex items-center justify-between gap-4">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
          <ArrowLeft className={`h-5 w-5 ${isRTL ? 'rotate-180' : ''}`} />
          {copy.back}
        </button>
        <LanguageSwitcher />
      </div>
      <h1 className="mb-2 text-3xl font-bold text-gray-900">{copy.title}</h1>
      <p className="text-gray-600">{copy.subtitle}</p>
    </div>
  );

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center" dir={isRTL ? 'rtl' : 'ltr'}>
        <div className="text-center">
          <div className="mx-auto mb-4 h-16 w-16 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
          <p className="text-gray-600">{copy.loading}</p>
        </div>
      </div>
    );
  }

  if (analyses.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 p-6" dir={isRTL ? 'rtl' : 'ltr'}>
        <Header />
        <div className="flex min-h-[400px] items-center justify-center">
          <div className="text-center">
            <Brain className="mx-auto mb-6 h-24 w-24 text-gray-400" />
            <h2 className="mb-4 text-2xl font-bold text-gray-900">{copy.emptyTitle}</h2>
            <p className="mx-auto mb-6 max-w-md text-gray-600">{copy.emptyDescription}</p>
            <div className="space-y-2 text-sm text-gray-500">
              {copy.features.map((feature: string) => <p key={feature}>• {feature}</p>)}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const filteredAnalyses = analyses.filter(
    (analysis) => !searchTerm || analysis.playerName.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <div className="min-h-screen bg-gray-50 p-6" dir={isRTL ? 'rtl' : 'ltr'}>
      <Header />
      <div className="mb-8 flex flex-col gap-4 sm:flex-row">
        <div className="relative flex-1">
          <Search className={`absolute top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400 ${isRTL ? 'right-3' : 'left-3'}`} />
          <Input
            type="text"
            placeholder={copy.searchPlaceholder}
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            className={isRTL ? 'w-full pr-12' : 'w-full pl-12'}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {filteredAnalyses.map((analysis) => (
          <motion.div key={analysis.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{analysis.playerName}</span>
                  <Badge variant="outline">{analysis.date}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <p className="mb-2 text-sm font-medium text-gray-700">{copy.performanceTitle}</p>
                    <div className="grid grid-cols-5 gap-2">
                      {Object.entries(analysis.performance).map(([key, value]) => (
                        <div key={key} className="text-center">
                          <p className={`text-lg font-bold ${getPerformanceColor(value)}`}>{value}</p>
                          <p className="text-xs text-gray-500">{copy.performance[key]}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="mb-2 text-sm font-medium text-gray-700">{copy.riskFactors}</p>
                    <div className="grid grid-cols-3 gap-2">
                      {Object.entries(analysis.riskFactors).map(([key, value]) => (
                        <div key={key} className="rounded-lg bg-gray-50 p-2 text-center">
                          <p className={`text-sm font-bold ${getRiskColor(value)}`}>{getRiskLevel(value)}</p>
                          <p className="text-xs text-gray-500">{copy.risks[key]}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {analysis.recommendations?.length > 0 && (
                    <div>
                      <p className="mb-2 text-sm font-medium text-gray-700">{copy.recommendations}</p>
                      <ul className="space-y-1">
                        {analysis.recommendations.slice(0, 3).map((recommendation, index) => (
                          <li key={index} className="flex items-start gap-2 text-xs text-gray-600">
                            <CheckCircle2 className="mt-0.5 h-3 w-3 flex-shrink-0 text-green-500" />
                            {recommendation}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
