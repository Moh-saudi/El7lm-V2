'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/firebase/auth-provider';
import { supabase } from '@/lib/supabase/config';
import { Trophy, Users, Star, Calendar, MapPin, BookOpen, Target, Award } from 'lucide-react';

interface AcademyProgram {
  id: string;
  title: string;
  description: string;
  duration: string;
  level: 'مبتدئ' | 'متوسط' | 'متقدم' | 'محترف';
  price: number;
  currency: string;
  maxStudents: number;
  currentStudents: number;
  location: string;
  startDate: any;
  endDate: any;
  instructor: string;
  instructorImage?: string;
  curriculum: string[];
  benefits: string[];
  requirements: string[];
  status: 'active' | 'upcoming' | 'completed';
  image?: string;
}

export default function MarketerDreamAcademyPage() {
  const { user } = useAuth();
  const [programs, setPrograms] = useState<AcademyProgram[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLevel, setSelectedLevel] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');

  useEffect(() => {
    if (user?.id) {
      fetchPrograms();
    }
  }, [user]);

  const fetchPrograms = async () => {
    try {
      setLoading(true);

      // جلب برامج أكاديمية الحلم
      const { data, error } = await supabase
        .from('dreamAcademyPrograms')
        .select('*')
        .order('startDate', { ascending: false });

      if (error) throw error;

      setPrograms((data || []) as AcademyProgram[]);
    } catch (error) {
      console.error('Error fetching programs:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredPrograms = programs.filter(program => {
    const matchesLevel = !selectedLevel || program.level === selectedLevel;
    const matchesStatus = !selectedStatus || program.status === selectedStatus;
    return matchesLevel && matchesStatus;
  });

  const formatDate = (date: any) => {
    if (!date) return 'غير محدد';
    const dateObj = new Date(date);
    return dateObj.toLocaleDateString('ar-SA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'مبتدئ': return 'text-green-600 bg-green-100';
      case 'متوسط': return 'text-blue-600 bg-blue-100';
      case 'متقدم': return 'text-purple-600 bg-purple-100';
      case 'محترف': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-600 bg-green-100';
      case 'upcoming': return 'text-yellow-600 bg-yellow-100';
      case 'completed': return 'text-gray-600 bg-gray-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active': return 'نشط';
      case 'upcoming': return 'قادم';
      case 'completed': return 'مكتمل';
      default: return 'غير محدد';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">جاري تحميل برامج أكاديمية الحلم...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          أكاديمية الحلم
        </h1>
        <p className="text-gray-600">
          اكتشف برامج التدريب المتقدمة لتنمية مهارات لاعبيك
        </p>
      </div>

      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-700 rounded-2xl p-8 mb-8 text-white">
        <div className="text-center">
          <Trophy className="w-16 h-16 mx-auto mb-4" />
          <h2 className="text-3xl font-bold mb-4">
            اكاديمية الحلم للتدريب المتقدم
          </h2>
          <p className="text-xl mb-6 opacity-90">
            برامج تدريبية متخصصة لتطوير مهارات اللاعبين وتحقيق أحلامهم
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <Users className="w-8 h-8 mx-auto mb-2" />
              <p className="text-2xl font-bold">{programs.length}</p>
              <p className="text-sm opacity-90">برنامج تدريبي</p>
            </div>
            <div className="text-center">
              <Star className="w-8 h-8 mx-auto mb-2" />
              <p className="text-2xl font-bold">4.8</p>
              <p className="text-sm opacity-90">تقييم متوسط</p>
            </div>
            <div className="text-center">
              <Award className="w-8 h-8 mx-auto mb-2" />
              <p className="text-2xl font-bold">95%</p>
              <p className="text-sm opacity-90">معدل النجاح</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-8 flex flex-col sm:flex-row gap-4">
        <select
          value={selectedLevel}
          onChange={(e) => setSelectedLevel(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          aria-label="اختر المستوى"
        >
          <option value="">جميع المستويات</option>
          <option value="مبتدئ">مبتدئ</option>
          <option value="متوسط">متوسط</option>
          <option value="متقدم">متقدم</option>
          <option value="محترف">محترف</option>
        </select>
        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          aria-label="اختر الحالة"
        >
          <option value="">جميع الحالات</option>
          <option value="active">نشط</option>
          <option value="upcoming">قادم</option>
          <option value="completed">مكتمل</option>
        </select>
      </div>

      {filteredPrograms.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-400 text-6xl mb-4">🏆</div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            لا توجد برامج
          </h3>
          <p className="text-gray-600">
            {selectedLevel || selectedStatus 
              ? 'لم يتم العثور على برامج تطابق المعايير المحددة.'
              : 'لا توجد برامج تدريبية متاحة حالياً.'
            }
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPrograms.map((program) => (
            <div key={program.id} className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow">
              {/* Program Image */}
              <div className="relative h-48">
                <img 
                  src={program.image || '/placeholder-academy.jpg'} 
                  alt={program.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-4 left-4">
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getLevelColor(program.level)}`}>
                    {program.level}
                  </span>
                </div>
                <div className="absolute top-4 right-4">
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(program.status)}`}>
                    {getStatusText(program.status)}
                  </span>
                </div>
              </div>

              <div className="p-6">
                {/* Program Title */}
                <h3 className="font-bold text-xl text-gray-900 mb-2">
                  {program.title}
                </h3>

                {/* Program Description */}
                <p className="text-gray-600 mb-4 line-clamp-2">
                  {program.description}
                </p>

                {/* Program Details */}
                <div className="space-y-2 mb-4">
                  <div className="flex items-center text-sm text-gray-600">
                    <Calendar className="w-4 h-4 mr-2" />
                    {formatDate(program.startDate)} - {formatDate(program.endDate)}
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <MapPin className="w-4 h-4 mr-2" />
                    {program.location}
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <BookOpen className="w-4 h-4 mr-2" />
                    {program.duration}
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <Users className="w-4 h-4 mr-2" />
                    {program.currentStudents}/{program.maxStudents} طالب
                  </div>
                </div>

                {/* Instructor */}
                <div className="flex items-center mb-4 p-3 bg-gray-50 rounded-lg">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold text-sm mr-3">
                    {program.instructorImage ? (
                      <img 
                        src={program.instructorImage} 
                        alt={program.instructor}
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      program.instructor.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{program.instructor}</p>
                    <p className="text-sm text-gray-600">مدرب معتمد</p>
                  </div>
                </div>

                {/* Benefits */}
                {program.benefits && program.benefits.length > 0 && (
                  <div className="mb-4">
                    <p className="text-sm font-medium text-gray-700 mb-2">الفوائد:</p>
                    <div className="space-y-1">
                      {program.benefits.slice(0, 2).map((benefit, index) => (
                        <div key={index} className="flex items-center text-sm text-gray-600">
                          <Target className="w-3 h-3 mr-2 text-green-500" />
                          {benefit}
                        </div>
                      ))}
                      {program.benefits.length > 2 && (
                        <p className="text-xs text-gray-500">
                          +{program.benefits.length - 2} فوائد أخرى
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Price and Action */}
                <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                  <div>
                    <p className="text-2xl font-bold text-gray-900">
                      {program.price} {program.currency}
                    </p>
                    <p className="text-sm text-gray-600">للبرنامج كاملاً</p>
                  </div>
                  <button className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                    انضم الآن
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
