'use client';

import { useEffect, useState } from 'react';
import { Award, BookOpen, Calendar, MapPin, Star, Target, Trophy, Users } from 'lucide-react';
import { toast } from 'sonner';
import LanguageSwitcher from '@/components/shared/LanguageSwitcher';
import { useAuth } from '@/lib/firebase/auth-provider';
import { useTranslation } from '@/lib/i18n';
import { supabase } from '@/lib/supabase/config';

type LevelKey = 'beginner' | 'intermediate' | 'advanced' | 'professional';
type ProgramStatus = 'active' | 'upcoming' | 'completed';

interface AcademyProgram {
  id: string;
  title: string;
  description: string;
  duration: string;
  level: string;
  price: number;
  currency: string;
  maxStudents: number;
  currentStudents: number;
  location: string;
  startDate: string | Date | null;
  endDate: string | Date | null;
  instructor: string;
  instructorImage?: string;
  curriculum: string[];
  benefits: string[];
  requirements: string[];
  status: ProgramStatus;
  image?: string;
}

const levelAliases: Record<string, LevelKey> = {
  '\u0645\u0628\u062a\u062f\u0626': 'beginner', beginner: 'beginner',
  '\u0645\u062a\u0648\u0633\u0637': 'intermediate', intermediate: 'intermediate',
  '\u0645\u062a\u0642\u062f\u0645': 'advanced', advanced: 'advanced',
  '\u0645\u062d\u062a\u0631\u0641': 'professional', professional: 'professional',
};

export default function MarketerDreamAcademyPage() {
  const { user } = useAuth();
  const { locale, isRTL, getTranslations } = useTranslation();
  const shared = getTranslations<any>('dreamAcademy');
  const copy = getTranslations<any>('marketerDreamAcademy');
  const [programs, setPrograms] = useState<AcademyProgram[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLevel, setSelectedLevel] = useState<LevelKey | ''>('');
  const [selectedStatus, setSelectedStatus] = useState<ProgramStatus | ''>('');

  useEffect(() => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    const fetchPrograms = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase.from('dreamAcademyPrograms').select('*').order('startDate', { ascending: false });
        if (error) throw error;
        setPrograms((data || []) as AcademyProgram[]);
      } catch (error) {
        console.error('Error fetching programs:', error);
        toast.error(copy.loadError);
      } finally {
        setLoading(false);
      }
    };
    void fetchPrograms();
  }, [copy.loadError, user?.id]);

  const filteredPrograms = programs.filter((program) =>
    (!selectedLevel || levelAliases[program.level] === selectedLevel)
    && (!selectedStatus || program.status === selectedStatus),
  );
  const dateLocale = ({ ar: 'ar-EG', en: 'en-US', es: 'es-ES', pt: 'pt-BR' } as const)[locale];
  const formatDate = (date: AcademyProgram['startDate']) => date ? new Date(date).toLocaleDateString(dateLocale, { year: 'numeric', month: 'long', day: 'numeric' }) : copy.notSpecified;
  const levelColor = (level: string) => ({ beginner: 'text-green-600 bg-green-100', intermediate: 'text-blue-600 bg-blue-100', advanced: 'text-purple-600 bg-purple-100', professional: 'text-red-600 bg-red-100' }[levelAliases[level]] || 'text-gray-600 bg-gray-100');
  const statusColor = (status: ProgramStatus) => status === 'active' ? 'text-green-600 bg-green-100' : status === 'upcoming' ? 'text-yellow-600 bg-yellow-100' : 'text-gray-600 bg-gray-100';
  const interpolateCount = (template: string, count: number) => template.replace('{{count}}', String(count));

  if (loading) return <div className="flex min-h-screen items-center justify-center" dir={isRTL ? 'rtl' : 'ltr'}><div className="text-center"><div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600" /><p className="text-gray-600">{copy.loading}</p></div></div>;

  return (
    <div className="mx-auto max-w-7xl p-6" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="mb-8"><div className="mb-2 flex items-center justify-between gap-4"><h1 className="text-3xl font-bold text-gray-900">{shared.title}</h1><LanguageSwitcher /></div><p className="text-gray-600">{copy.subtitle}</p></div>
      <div className="mb-8 rounded-2xl bg-gradient-to-r from-blue-600 to-purple-700 p-8 text-white"><div className="text-center"><Trophy className="mx-auto mb-4 h-16 w-16" /><h2 className="mb-4 text-3xl font-bold">{copy.heroTitle}</h2><p className="mb-6 text-xl opacity-90">{copy.heroDescription}</p><div className="grid grid-cols-1 gap-6 md:grid-cols-3"><div><Users className="mx-auto mb-2 h-8 w-8" /><p className="text-2xl font-bold">{programs.length}</p><p className="text-sm opacity-90">{copy.stats.programs}</p></div><div><Star className="mx-auto mb-2 h-8 w-8" /><p className="text-2xl font-bold">4.8</p><p className="text-sm opacity-90">{copy.stats.averageRating}</p></div><div><Award className="mx-auto mb-2 h-8 w-8" /><p className="text-2xl font-bold">95%</p><p className="text-sm opacity-90">{copy.stats.successRate}</p></div></div></div></div>
      <div className="mb-8 flex flex-col gap-4 sm:flex-row">
        <select value={selectedLevel} onChange={(event) => setSelectedLevel(event.target.value as LevelKey | '')} className="rounded-lg border border-gray-300 px-4 py-2" aria-label={copy.selectLevel}><option value="">{copy.allLevels}</option>{Object.entries(copy.levels).map(([value, label]) => <option key={value} value={value}>{String(label)}</option>)}</select>
        <select value={selectedStatus} onChange={(event) => setSelectedStatus(event.target.value as ProgramStatus | '')} className="rounded-lg border border-gray-300 px-4 py-2" aria-label={copy.selectStatus}><option value="">{copy.allStatuses}</option>{Object.entries(copy.statuses).map(([value, label]) => <option key={value} value={value}>{String(label)}</option>)}</select>
      </div>
      {filteredPrograms.length === 0 ? <div className="py-12 text-center"><Trophy className="mx-auto mb-4 h-16 w-16 text-gray-300" /><h3 className="mb-2 text-xl font-semibold text-gray-900">{copy.emptyTitle}</h3><p className="text-gray-600">{selectedLevel || selectedStatus ? copy.noMatch : copy.noneAvailable}</p></div> : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">{filteredPrograms.map((program) => {
          const levelKey = levelAliases[program.level];
          return <div key={program.id} className="overflow-hidden rounded-xl bg-white shadow-lg transition-shadow hover:shadow-xl">
            <div className="relative h-48"><img src={program.image || '/placeholder-academy.jpg'} alt={program.title} className="h-full w-full object-cover" /><div className={`absolute top-4 ${isRTL ? 'right-4' : 'left-4'}`}><span className={`rounded-full px-2 py-1 text-xs font-semibold ${levelColor(program.level)}`}>{copy.levels[levelKey] || program.level}</span></div><div className={`absolute top-4 ${isRTL ? 'left-4' : 'right-4'}`}><span className={`rounded-full px-2 py-1 text-xs font-semibold ${statusColor(program.status)}`}>{copy.statuses[program.status]}</span></div></div>
            <div className="p-6"><h3 className="mb-2 text-xl font-bold text-gray-900">{program.title}</h3><p className="mb-4 line-clamp-2 text-gray-600">{program.description}</p><div className="mb-4 space-y-2"><div className="flex items-center gap-2 text-sm text-gray-600"><Calendar className="h-4 w-4" />{formatDate(program.startDate)} - {formatDate(program.endDate)}</div><div className="flex items-center gap-2 text-sm text-gray-600"><MapPin className="h-4 w-4" />{program.location}</div><div className="flex items-center gap-2 text-sm text-gray-600"><BookOpen className="h-4 w-4" />{program.duration}</div><div className="flex items-center gap-2 text-sm text-gray-600"><Users className="h-4 w-4" />{program.currentStudents}/{program.maxStudents} {copy.students}</div></div>
              <div className="mb-4 flex items-center gap-3 rounded-lg bg-gray-50 p-3"><div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-sm font-semibold text-white">{program.instructorImage ? <img src={program.instructorImage} alt={program.instructor} className="h-full w-full rounded-full object-cover" /> : program.instructor.charAt(0).toUpperCase()}</div><div><p className="font-medium text-gray-900">{program.instructor}</p><p className="text-sm text-gray-600">{copy.certifiedCoach}</p></div></div>
              {program.benefits?.length > 0 && <div className="mb-4"><p className="mb-2 text-sm font-medium text-gray-700">{copy.benefits}</p><div className="space-y-1">{program.benefits.slice(0, 2).map((benefit, index) => <div key={index} className="flex items-center gap-2 text-sm text-gray-600"><Target className="h-3 w-3 text-green-500" />{benefit}</div>)}{program.benefits.length > 2 && <p className="text-xs text-gray-500">{interpolateCount(copy.moreBenefits, program.benefits.length - 2)}</p>}</div></div>}
              <div className="flex items-center justify-between border-t border-gray-200 pt-4"><div><p className="text-2xl font-bold text-gray-900">{program.price} {program.currency}</p><p className="text-sm text-gray-600">{copy.completeProgram}</p></div><button className="rounded-lg bg-blue-600 px-6 py-2 text-white transition-colors hover:bg-blue-700">{copy.joinNow}</button></div>
            </div>
          </div>;
        })}</div>
      )}
    </div>
  );
}
