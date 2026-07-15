'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { AlertCircle, ArrowLeft, Award, CheckCircle2, Clock, Edit, Eye, Medal, Plus, Search, Star, Target, Trash2, Trophy } from 'lucide-react';
import { toast } from 'sonner';
import LanguageSwitcher from '@/components/shared/LanguageSwitcher';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/lib/firebase/auth-provider';
import { useTranslation } from '@/lib/i18n';
import { supabase } from '@/lib/supabase/config';

interface PlayerEvaluation {
  id: string;
  playerId: string;
  playerName: string;
  date: string;
  evaluator: string;
  overall: { score: number; level: 'excellent' | 'good' | 'average' | 'poor'; comments: string };
  technical: { passing: number; shooting: number; dribbling: number; defending: number; physical: number };
  tactical: { positioning: number; decisionMaking: number; teamwork: number; leadership: number };
  physical: { speed: number; strength: number; stamina: number; agility: number };
  mental: { concentration: number; confidence: number; discipline: number; motivation: number };
  recommendations: string[];
  nextEvaluation: string;
}

export default function PlayerEvaluationPage() {
  const router = useRouter();
  const { user, userData } = useAuth();
  const { isRTL, getTranslations } = useTranslation();
  const copy = getTranslations<any>('clubPlayerEvaluation');
  const [evaluations, setEvaluations] = useState<PlayerEvaluation[]>([]);
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

    const fetchEvaluations = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('player_evaluations')
          .select('*')
          .eq('clubId', userData.clubId);
        if (error) throw error;
        const result = (data || []) as PlayerEvaluation[];
        setEvaluations(result);
        if (result.length === 0) toast.info(copy.noEvaluationsToast);
      } catch (error) {
        console.error('Error fetching evaluations:', error);
        toast.error(copy.loadError);
        setEvaluations([]);
      } finally {
        setLoading(false);
      }
    };

    void fetchEvaluations();
  }, [copy.loadError, copy.noEvaluationsToast, router, user, userData]);

  const getLevelColor = (level: PlayerEvaluation['overall']['level']) => {
    if (level === 'excellent') return 'bg-green-100 text-green-800';
    if (level === 'good') return 'bg-blue-100 text-blue-800';
    if (level === 'average') return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  const getLevelIcon = (level: PlayerEvaluation['overall']['level']) => {
    if (level === 'excellent') return <Trophy className="h-4 w-4" />;
    if (level === 'good') return <Award className="h-4 w-4" />;
    if (level === 'average') return <Medal className="h-4 w-4" />;
    return <AlertCircle className="h-4 w-4" />;
  };

  const interpolate = (template: string, name: string) => template.replace('{{name}}', name);

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

  const stats = [
    { label: copy.stats.average, value: '85%', icon: Star, color: 'text-yellow-600' },
    { label: copy.stats.completed, value: '24', icon: CheckCircle2, color: 'text-green-600' },
    { label: copy.stats.inProgress, value: '8', icon: Clock, color: 'text-blue-600' },
    { label: copy.stats.recommendations, value: '156', icon: Target, color: 'text-purple-600' },
  ];
  const filteredEvaluations = evaluations.filter((evaluation) =>
    evaluation.playerName.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <div className="min-h-screen bg-gray-50 p-6" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="mb-8">
        <div className="mb-4 flex items-center justify-between gap-4">
          <button onClick={() => router.back()} className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
            <ArrowLeft className={`h-5 w-5 ${isRTL ? 'rotate-180' : ''}`} /> {copy.back}
          </button>
          <LanguageSwitcher />
        </div>
        <h1 className="mb-2 text-3xl font-bold text-gray-900">{copy.title}</h1>
        <p className="text-gray-600">{copy.subtitle}</p>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        {stats.map(({ label, value, icon: Icon, color }) => (
          <Card key={label}><CardContent className="p-6"><div className="flex items-center justify-between"><div><p className="text-sm text-gray-600">{label}</p><h3 className="mt-1 text-2xl font-bold">{value}</h3></div><Icon className={`h-8 w-8 ${color}`} /></div></CardContent></Card>
        ))}
      </div>

      <div className="mb-8 flex flex-col gap-4 sm:flex-row">
        <div className="relative flex-1">
          <Search className={`absolute top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400 ${isRTL ? 'right-3' : 'left-3'}`} />
          <Input type="text" placeholder={copy.searchPlaceholder} value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} className={isRTL ? 'w-full pr-12' : 'w-full pl-12'} />
        </div>
        <Button onClick={() => router.push('/dashboard/club/player-evaluation/new')} className="flex items-center gap-2"><Plus className="h-5 w-5" /> {copy.newEvaluation}</Button>
      </div>

      {filteredEvaluations.length === 0 ? (
        <div className="rounded-xl bg-white p-12 text-center text-gray-500 shadow">{copy.empty}</div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredEvaluations.map((evaluation) => (
            <motion.div key={evaluation.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="overflow-hidden rounded-xl bg-white shadow-lg">
              <Card>
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between gap-2">
                    <div><CardTitle className="text-xl">{evaluation.playerName}</CardTitle><p className="mt-1 text-sm text-gray-600">{interpolate(copy.evaluatedBy, evaluation.evaluator)}</p></div>
                    <Badge className={getLevelColor(evaluation.overall.level)}><span className="flex items-center gap-1">{getLevelIcon(evaluation.overall.level)} {copy.levels[evaluation.overall.level]}</span></Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div><h4 className="mb-2 text-sm font-semibold">{copy.overall}</h4><div className="text-2xl font-bold text-blue-600">{evaluation.overall.score}%</div></div>
                    <div>
                      <h4 className="mb-2 text-sm font-semibold">{copy.technicalSkills}</h4>
                      <div className="space-y-2">
                        {Object.entries(evaluation.technical).map(([skill, score]) => (
                          <div key={skill} className="flex items-center gap-2">
                            <span className="w-24 text-sm text-gray-600">{copy.skills[skill]}</span>
                            <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-200"><div className="h-full rounded-full bg-blue-600" style={{ width: `${score}%` }} /></div>
                            <span className="w-8 text-sm text-gray-600">{score}%</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div><h4 className="mb-2 text-sm font-semibold">{copy.recommendations}</h4><div className="space-y-1">{evaluation.recommendations.slice(0, 2).map((recommendation, index) => <p key={index} className="text-sm text-gray-600">• {recommendation}</p>)}</div></div>
                    <div className="flex justify-end gap-2 pt-4">
                      <Button variant="outline" size="sm" onClick={() => router.push(`/dashboard/club/player-evaluation/${evaluation.id}`)}><Eye className="h-4 w-4" /> {copy.view}</Button>
                      <Button variant="outline" size="sm" onClick={() => router.push(`/dashboard/club/player-evaluation/${evaluation.id}/edit`)}><Edit className="h-4 w-4" /> {copy.edit}</Button>
                      <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700"><Trash2 className="h-4 w-4" /> {copy.delete}</Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
