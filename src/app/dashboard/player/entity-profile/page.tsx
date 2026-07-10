'use client';

import { useState } from 'react';
import { Award, BookOpen, Briefcase, CheckCircle, Clock, GraduationCap, Heart, Home, Languages, Star, User, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useTranslation } from '@/lib/i18n';

const categories = [
  { id: 'languages', icon: Languages, color: 'bg-blue-500' },
  { id: 'lifeSkills', icon: Heart, color: 'bg-green-500' },
  { id: 'livingSkills', icon: Home, color: 'bg-purple-500' },
  { id: 'career', icon: Briefcase, color: 'bg-orange-500' },
] as const;

const courseGroups = {
  languages: ['englishBasics', 'spanishBeginners', 'frenchAdvanced'],
  lifeSkills: ['timeManagement', 'effectiveCommunication', 'emotionalIntelligence'],
  livingSkills: ['personalBudgeting', 'healthyCooking', 'homeMaintenance'],
  career: ['resumeWriting', 'entrepreneurship', 'digitalMarketing'],
} as const;

const courseStats = {
  englishBasics: { rating: 4.8, students: 1250 },
  spanishBeginners: { rating: 4.6, students: 890 },
  frenchAdvanced: { rating: 4.9, students: 650 },
  timeManagement: { rating: 4.7, students: 2100 },
  effectiveCommunication: { rating: 4.8, students: 1800 },
  emotionalIntelligence: { rating: 4.9, students: 1200 },
  personalBudgeting: { rating: 4.6, students: 1500 },
  healthyCooking: { rating: 4.7, students: 2200 },
  homeMaintenance: { rating: 4.5, students: 1100 },
  resumeWriting: { rating: 4.8, students: 2800 },
  entrepreneurship: { rating: 4.7, students: 1600 },
  digitalMarketing: { rating: 4.9, students: 900 },
} as const;

type CategoryId = keyof typeof courseGroups;
type CourseId = keyof typeof courseStats;

export default function PlayerEntityProfilePage() {
  const { t } = useTranslation();
  const [selectedCategory, setSelectedCategory] = useState<CategoryId>('languages');
  const courses = courseGroups[selectedCategory];

  const courseFeatureList = (courseId: CourseId) =>
    [0, 1, 2].map((index) => t(`playerEntityProfile.courses.${courseId}.features.${index}`));

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-4">
            <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mr-4">
              <GraduationCap className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">{t('playerEntityProfile.title')}</h1>
              <p className="text-xl text-gray-600">{t('playerEntityProfile.subtitle')}</p>
            </div>
          </div>

          <div className="flex items-center justify-center gap-4 text-sm text-gray-500">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              <span>{t('playerEntityProfile.stats.students')}</span>
            </div>
            <div className="flex items-center gap-2">
              <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
              <span>{t('playerEntityProfile.stats.rating')}</span>
            </div>
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4 text-blue-500" />
              <span>{t('playerEntityProfile.stats.freeCourses')}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {categories.map((category) => {
            const Icon = category.icon;
            return (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`p-4 rounded-lg border-2 transition-all duration-200 ${
                  selectedCategory === category.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 bg-white hover:border-blue-300'
                }`}
              >
                <div className="flex flex-col items-center gap-3">
                  <div className={`w-12 h-12 ${category.color} rounded-full flex items-center justify-center`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <span className="font-medium text-sm text-center">
                    {t(`playerEntityProfile.categories.${category.id}`)}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map((courseId) => {
            const stats = courseStats[courseId];
            return (
              <Card key={courseId} className="overflow-hidden hover:shadow-lg transition-shadow duration-300">
                <div className="h-48 bg-gradient-to-r from-blue-400 to-purple-500 relative">
                  <div className="absolute inset-0 bg-black bg-opacity-20" />
                  <div className="absolute top-3 right-3">
                    <Badge className="bg-green-500 text-white">
                      {t(`playerEntityProfile.courses.${courseId}.price`)}
                    </Badge>
                  </div>
                  <div className="absolute bottom-3 left-3">
                    <Badge variant="secondary" className="bg-white/90">
                      {t(`playerEntityProfile.courses.${courseId}.level`)}
                    </Badge>
                  </div>
                </div>

                <div className="p-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-2">
                    {t(`playerEntityProfile.courses.${courseId}.title`)}
                  </h3>

                  <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                    <div className="flex items-center gap-1">
                      <User className="w-4 h-4" />
                      <span>{t(`playerEntityProfile.courses.${courseId}.instructor`)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      <span>{t(`playerEntityProfile.courses.${courseId}.duration`)}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 mb-4">
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                      <span className="text-sm font-medium">{stats.rating}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-500">
                        {t('playerEntityProfile.studentCount').replace('{{count}}', stats.students.toString())}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2 mb-4">
                    {courseFeatureList(courseId).map((feature, index) => (
                      <div key={index} className="flex items-center gap-2 text-sm text-gray-600">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        <span>{feature}</span>
                      </div>
                    ))}
                  </div>

                  <Button className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white">
                    <BookOpen className="w-4 h-4 mr-2" />
                    {t('playerEntityProfile.startCourse')}
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
