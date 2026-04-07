'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import {
  Brain,
  TrendingUp,
  Target,
  BarChart3,
  LineChart,
  PieChart,
  Activity,
  AlertCircle,
  CheckCircle2,
  Clock,
  Download,
  Filter,
  Search,
  ArrowLeft
} from 'lucide-react';
import { supabase } from '@/lib/supabase/config';
import { useAuth } from '@/lib/firebase/auth-provider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

interface PlayerAnalysis {
  id: string;
  playerId: string;
  playerName: string;
  date: string;
  performance: {
    overall: number;
    physical: number;
    technical: number;
    tactical: number;
    mental: number;
  };
  predictions: {
    nextMatch: number;
    seasonEnd: number;
    potential: number;
  };
  insights: string[];
  recommendations: string[];
  riskFactors: {
    injury: number;
    fatigue: number;
    form: number;
  };
}

export default function AIAnalysisPage() {
  const router = useRouter();
  const { user, userData } = useAuth();
  const [analyses, setAnalyses] = useState<PlayerAnalysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      router.push('/auth/login');
      return;
    }

    if (!userData) {
      // Wait for userData to load
      return;
    }

    if (userData.accountType !== 'club') {
      router.push('/dashboard');
      return;
    }

    // Only fetch analyses if we have all required data
    if (userData.clubId) {
      fetchAnalyses();
    }
  }, [user, userData]);

  const fetchAnalyses = async () => {
    try {
      setLoading(true);

      // Check if userData and clubId are valid
      if (!userData || !userData.clubId) {
        console.warn('No userData or clubId available for fetching analyses');
        setAnalyses([]);
        return;
      }

      console.log('🔍 Fetching analyses for clubId:', userData.clubId);

      const { data: analysesData } = await supabase
        .from('player_analyses')
        .select('*')
        .eq('clubId', userData.clubId);

      console.log('📊 Query results:', analysesData?.length ?? 0, 'documents found');

      const result = (analysesData || []) as PlayerAnalysis[];
      setAnalyses(result);

      // If no data found, show a helpful message
      if (result.length === 0) {
        console.log('ℹ️ No analyses found for this club');
        toast.info('لا توجد تحليلات متاحة حالياً. سيتم إضافة التحليلات قريباً.');
      }

    } catch (error) {
      console.error('Error fetching analyses:', error);
      toast.error('حدث خطأ أثناء جلب بيانات التحليلات');
      setAnalyses([]);
    } finally {
      setLoading(false);
    }
  };

  const getPerformanceColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getRiskLevel = (risk: number) => {
    if (risk >= 70) return 'عالية';
    if (risk >= 40) return 'متوسطة';
    return 'منخفضة';
  };

  const getRiskColor = (risk: number) => {
    if (risk >= 70) return 'text-red-600';
    if (risk >= 40) return 'text-yellow-600';
    return 'text-green-600';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 border-4 border-blue-200 rounded-full border-t-blue-600 animate-spin"></div>
          <p className="text-gray-600">جاري تحميل التحليلات...</p>
        </div>
      </div>
    );
  }

  // Show empty state if no analyses found
  if (analyses.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 p-6" dir="rtl">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 mb-4 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-5 h-5" />
            العودة للوحة التحكم
          </button>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">تحليل الأداء بالذكاء الاصطناعي</h1>
          <p className="text-gray-600">تحليل متقدم لأداء اللاعبين باستخدام الذكاء الاصطناعي</p>
        </div>

        {/* Empty State */}
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Brain className="w-24 h-24 mx-auto mb-6 text-gray-400" />
            <h2 className="text-2xl font-bold text-gray-900 mb-4">لا توجد تحليلات متاحة حالياً</h2>
            <p className="text-gray-600 mb-6 max-w-md">
              لم يتم إنشاء أي تحليلات للاعبين بعد. سيتم إضافة هذه الميزة قريباً لتوفير تحليلات متقدمة لأداء اللاعبين.
            </p>
            <div className="space-y-2 text-sm text-gray-500">
              <p>• تحليل الأداء العام للاعبين</p>
              <p>• توقعات الأداء في المباريات القادمة</p>
              <p>• توصيات لتحسين الأداء</p>
              <p>• تحليل عوامل المخاطر</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6" dir="rtl">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 mb-4 text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="w-5 h-5" />
          العودة للوحة التحكم
        </button>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">تحليل الأداء بالذكاء الاصطناعي</h1>
        <p className="text-gray-600">تحليل متقدم لأداء اللاعبين باستخدام الذكاء الاصطناعي</p>
      </div>

      {/* Search */}
      <div className="flex flex-col sm:flex-row gap-4 mb-8">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <Input
            type="text"
            placeholder="ابحث عن لاعب..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pr-12"
          />
        </div>
      </div>

      {/* Analyses Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {analyses
          .filter(a => !searchTerm || a.playerName.toLowerCase().includes(searchTerm.toLowerCase()))
          .map((analysis) => (
            <motion.div
              key={analysis.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>{analysis.playerName}</span>
                    <Badge variant="outline">{analysis.date}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Performance Scores */}
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-2">الأداء العام</p>
                      <div className="grid grid-cols-5 gap-2">
                        {Object.entries(analysis.performance).map(([key, value]) => (
                          <div key={key} className="text-center">
                            <p className={`text-lg font-bold ${getPerformanceColor(value)}`}>{value}</p>
                            <p className="text-xs text-gray-500">
                              {key === 'overall' ? 'عام' :
                               key === 'physical' ? 'بدني' :
                               key === 'technical' ? 'تقني' :
                               key === 'tactical' ? 'تكتيكي' : 'ذهني'}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Risk Factors */}
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-2">عوامل المخاطر</p>
                      <div className="grid grid-cols-3 gap-2">
                        {Object.entries(analysis.riskFactors).map(([key, value]) => (
                          <div key={key} className="text-center bg-gray-50 rounded-lg p-2">
                            <p className={`text-sm font-bold ${getRiskColor(value)}`}>{getRiskLevel(value)}</p>
                            <p className="text-xs text-gray-500">
                              {key === 'injury' ? 'إصابة' : key === 'fatigue' ? 'إرهاق' : 'الشكل'}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Recommendations */}
                    {analysis.recommendations && analysis.recommendations.length > 0 && (
                      <div>
                        <p className="text-sm font-medium text-gray-700 mb-2">التوصيات</p>
                        <ul className="space-y-1">
                          {analysis.recommendations.slice(0, 3).map((rec, i) => (
                            <li key={i} className="flex items-start gap-2 text-xs text-gray-600">
                              <CheckCircle2 className="w-3 h-3 text-green-500 mt-0.5 flex-shrink-0" />
                              {rec}
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
