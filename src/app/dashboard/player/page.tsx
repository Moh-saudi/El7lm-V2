'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  User,
  FileText,
  Video,
  Search,
  BarChart3,
  MessageSquare,
  CreditCard,
  CheckCircle,
  Menu,
  X,
  Star,
  TrendingUp,
  Trophy,
  Target,
  Users,
  Calendar,
  ArrowRight,
  MapPin,
} from 'lucide-react';
import { useAccountTypeAuth } from '@/hooks/useAccountTypeAuth';
import { useAuth } from '@/lib/firebase/auth-provider';
import { getExploreOpportunities } from '@/lib/firebase/opportunities';
import { OPPORTUNITY_TYPES } from '@/lib/opportunities/config';
import { Opportunity } from '@/types/opportunities';
import ReferralWelcomeModal from '@/components/referrals/ReferralWelcomeModal';
import PlayerOrganizationCard from '@/components/referrals/PlayerOrganizationCard';
import PhoneCollectionModal from '@/components/player/PhoneCollectionModal';

export default function PlayerDashboard() {
  // التحقق من نوع الحساب - السماح فقط للاعبين وأولياء الأمور
  const { isAuthorized, isCheckingAuth } = useAccountTypeAuth({
    allowedTypes: ['player', 'parent'],
    redirectTo: '/dashboard'
  });

  const { user, userData } = useAuth();
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);

  useEffect(() => {
    getExploreOpportunities().then(list => setOpportunities(list.slice(0, 3))).catch(() => {});
  }, []);

  // كشف نوع الجهاز
  useEffect(() => {
    const checkDevice = () => {
      const width = window.innerWidth;
      setIsMobile(width < 768);
      setIsTablet(width >= 768 && width < 1024);
    };

    checkDevice();
    window.addEventListener('resize', checkDevice);
    return () => window.removeEventListener('resize', checkDevice);
  }, []);

  // State for Phone Modal
  const [showPhoneModal, setShowPhoneModal] = useState(false);

  // Check for missing phone number
  useEffect(() => {
    if (userData && !isCheckingAuth) {
      // Check if phone is missing OR an update is requested
      if (!userData.phone || userData.profileUpdateRequested) {
        // Slight delay to ensure smooth rendering
        const timer = setTimeout(() => {
          setShowPhoneModal(true);
        }, 1500);
        return () => clearTimeout(timer);
      }
    }
  }, [userData, isCheckingAuth]);

  // عرض Modal الترحيب عند الدخول أول مرة
  useEffect(() => {
    if (user && userData && userData.accountType === 'player') {
      // تحقق إذا اختار المستخدم "لا تظهر مرة أخرى"
      const neverShow = localStorage.getItem(`never_show_referral_modal_${user.uid}`);
      if (neverShow === 'true') {
        return; // لا تظهر المودال أبداً
      }

      // تحقق إذا لم يتم عرض Modal من قبل
      const hasSeenWelcome = localStorage.getItem(`welcome_modal_${user.uid}`);
      if (!hasSeenWelcome) {
        setTimeout(() => {
          setShowWelcomeModal(true);
          localStorage.setItem(`welcome_modal_${user.uid}`, 'true');
        }, 1000); // انتظر ثانية بعد التحميل
      }
    }
  }, [user, userData]);

  // عرض شاشة التحميل أثناء التحقق
  if (isCheckingAuth) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 border-4 border-blue-200 rounded-full border-t-blue-600 animate-spin"></div>
          <p className="text-gray-600 text-sm md:text-base">جاري التحقق من صلاحيات الوصول...</p>
        </div>
      </div>
    );
  }

  // إذا لم يكن مصرح له، سيتم التوجيه تلقائياً
  if (!isAuthorized) {
    return null;
  }

  const quickActions = [
    {
      title: 'الملف الشخصي',
      description: 'إدارة معلوماتك الشخصية',
      icon: User,
      href: '/dashboard/player/profile',
      color: 'bg-blue-500'
    },
    {
      title: 'التقارير',
      description: 'عرض تقارير الأداء والتقدم',
      icon: FileText,
      href: '/dashboard/player/reports',
      color: 'bg-green-500'
    },
    {
      title: 'البحث عن الفرص',
      description: 'البحث عن فرص جديدة',
      icon: Search,
      href: '/dashboard/player/search',
      color: 'bg-purple-500'
    },
    {
      title: 'الرسائل',
      description: 'إدارة المحادثات والرسائل',
      icon: MessageSquare,
      href: '/dashboard/player/messages',
      color: 'bg-orange-500'
    }
  ];

  const stats = [
    {
      title: 'المباريات',
      value: '12',
      change: '+3',
      changeType: 'positive',
      icon: BarChart3
    },
    {
      title: 'الأهداف',
      value: '8',
      change: '+2',
      changeType: 'positive',
      icon: CheckCircle
    },
    {
      title: 'المساعدات',
      value: '5',
      change: '+1',
      changeType: 'positive',
      icon: CheckCircle
    },
    {
      title: 'التقييم',
      value: '8.5',
      change: '+0.3',
      changeType: 'positive',
      icon: Star
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Referral Welcome Modal - Only show if Phone Modal is NOT showing */}
      {showWelcomeModal && !showPhoneModal && user && (
        <ReferralWelcomeModal
          playerId={user.uid}
          playerName={userData?.full_name || user.displayName || 'اللاعب'}
          onClose={() => setShowWelcomeModal(false)}
        />
      )}

      {/* Phone Collection Modal */}
      {showPhoneModal && (
        <PhoneCollectionModal
          isOpen={showPhoneModal}
          onClose={() => setShowPhoneModal(false)}
          forceOpen={true}
        />
      )}

      {/* Header Section */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 md:py-6">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h1 className="text-xl md:text-3xl font-bold text-gray-900">
                مرحباً بك في لوحة تحكم اللاعب
              </h1>
              <p className="mt-1 md:mt-2 text-gray-600 text-sm md:text-base">
                إدارة ملفك الشخصي وتتبع تقدمك الرياضي
              </p>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden p-2 text-gray-600 hover:text-blue-600 transition-colors touch-target"
            >
              {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>

            <div className="hidden md:flex items-center space-x-4">
              <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center">
                <span className="text-white font-bold">E</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="md:hidden bg-white border-b border-gray-200">
          <div className="px-4 py-2 space-y-2">
            {quickActions.map((action) => (
              <Link
                key={action.title}
                href={action.href}
                className="flex items-center p-3 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors touch-target"
                onClick={() => setIsMenuOpen(false)}
              >
                <action.icon className="w-5 h-5 mr-3" />
                <span className="text-sm font-medium">{action.title}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
        {/* Profile Completion Section - NEW */}
        <div className="mb-6 md:mb-8">
          <div className="relative overflow-hidden bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 rounded-2xl md:rounded-3xl shadow-2xl">
            {/* Animated Background Pattern */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-0 left-0 w-40 h-40 bg-white rounded-full blur-3xl"></div>
              <div className="absolute bottom-0 right-0 w-60 h-60 bg-white rounded-full blur-3xl"></div>
            </div>

            <div className="relative p-6 md:p-8">
              {/* Header with Icon */}
              <div className="flex items-start justify-between mb-4 md:mb-6">
                <div className="flex items-center gap-3 md:gap-4">
                  <div className="relative">
                    <div className="absolute inset-0 bg-yellow-300 rounded-full blur-lg opacity-50 animate-pulse"></div>
                    <div className="relative bg-white p-3 md:p-4 rounded-xl md:rounded-2xl shadow-lg">
                      <Star className="w-6 h-6 md:w-8 md:h-8 text-yellow-500 fill-yellow-500" />
                    </div>
                  </div>
                  <div>
                    <h2 className="text-xl md:text-3xl font-black text-white mb-1">
                      أكمل ملفك الشخصي! 🚀
                    </h2>
                    <p className="text-white/90 text-sm md:text-base font-medium">
                      اجعل ملفك احترافياً وزد فرصك في الظهور
                    </p>
                  </div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mb-4 md:mb-6">
                <div className="flex items-center justify-between text-white/90 text-xs md:text-sm font-semibold mb-2">
                  <span>اكتمال الملف الشخصي</span>
                  <span className="text-yellow-300">45%</span>
                </div>
                <div className="h-3 md:h-4 bg-white/20 rounded-full overflow-hidden backdrop-blur-sm">
                  <div
                    className="h-full bg-gradient-to-r from-yellow-300 via-yellow-400 to-yellow-500 rounded-full transition-all duration-1000 ease-out shadow-lg"
                    style={{ width: '45%' }}
                  >
                    <div className="h-full w-full bg-white/30 animate-pulse"></div>
                  </div>
                </div>
              </div>

              {/* Benefits Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4 mb-6">
                <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md rounded-xl p-3 md:p-4 border border-white/20">
                  <CheckCircle className="w-5 h-5 md:w-6 md:h-6 text-green-300 flex-shrink-0" />
                  <div>
                    <p className="text-white font-bold text-sm md:text-base">ظهور أفضل</p>
                    <p className="text-white/70 text-xs">في نتائج البحث</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md rounded-xl p-3 md:p-4 border border-white/20">
                  <TrendingUp className="w-5 h-5 md:w-6 md:w-6 text-blue-300 flex-shrink-0" />
                  <div>
                    <p className="text-white font-bold text-sm md:text-base">فرص أكثر</p>
                    <p className="text-white/70 text-xs">للتواصل معك</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md rounded-xl p-3 md:p-4 border border-white/20">
                  <Trophy className="w-5 h-5 md:w-6 md:h-6 text-yellow-300 flex-shrink-0" />
                  <div>
                    <p className="text-white font-bold text-sm md:text-base">مظهر احترافي</p>
                    <p className="text-white/70 text-xs">يلفت الانتباه</p>
                  </div>
                </div>
              </div>

              {/* CTA Button */}
              <Link
                href="/dashboard/player/profile"
                className="group relative inline-flex items-center justify-center gap-3 w-full md:w-auto px-6 md:px-8 py-4 md:py-5 bg-white text-purple-600 rounded-xl md:rounded-2xl font-black text-base md:text-lg shadow-2xl hover:shadow-yellow-500/50 hover:scale-105 transition-all duration-300 overflow-hidden"
              >
                {/* Animated background */}
                <div className="absolute inset-0 bg-gradient-to-r from-yellow-400 to-yellow-300 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

                <User className="w-5 h-5 md:w-6 md:h-6 relative z-10 group-hover:rotate-12 transition-transform" />
                <span className="relative z-10">أكمل ملفك الآن</span>
                <ArrowRight className="w-5 h-5 md:w-6 md:h-6 relative z-10 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>
        </div>

        {/* Player Organization Card - الارتباطات */}
        {user && (
          <div className="mb-6 md:mb-8">
            <PlayerOrganizationCard playerId={user.uid} />
          </div>
        )}

        {/* Stats Overview */}
        <div className="mb-6 md:mb-8">
          <h2 className="text-lg md:text-2xl font-semibold text-gray-900 mb-4 md:mb-6">
            نظرة عامة على الأداء
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6">
            {stats.map((stat) => (
              <div key={stat.title} className="bg-white p-4 md:p-6 rounded-xl md:rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-2">
                  <stat.icon className="w-5 h-5 text-gray-400" />
                  <span className={`text-xs md:text-sm font-medium ${stat.changeType === 'positive' ? 'text-green-600' : 'text-red-600'
                    }`}>
                    {stat.change}
                  </span>
                </div>
                <div className="text-2xl md:text-3xl font-bold text-gray-900">
                  {stat.value}
                </div>
                <div className="text-xs md:text-sm text-gray-600">
                  {stat.title}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Tournament Registration Section */}
        <div className="mb-6 md:mb-8">
          <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-xl p-4 md:p-6">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-yellow-100 rounded-full">
                  <Trophy className="h-6 w-6 md:h-8 md:w-8 text-yellow-600" />
                </div>
                <div>
                  <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-1">التسجيل في البطولات</h3>
                  <p className="text-sm md:text-base text-gray-600">سجل في البطولات المتاحة وشارك في المنافسات</p>
                </div>
              </div>
              <Link
                href="/tournaments/unified-registration"
                className="inline-flex items-center gap-2 px-4 md:px-6 py-2 md:py-3 bg-gradient-to-r from-yellow-500 to-orange-600 text-white rounded-lg hover:from-yellow-600 hover:to-orange-700 transition-all duration-300 hover:scale-105 shadow-lg text-sm md:text-base"
              >
                <Trophy className="h-4 w-4 md:h-5 md:w-5" />
                تسجيل في البطولات
                <ArrowRight className="h-3 w-3 md:h-4 md:w-4" />
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4 mt-4 md:mt-6">
              <div className="flex items-center gap-3 p-3 bg-white/50 rounded-lg">
                <Users className="h-4 w-4 md:h-5 md:w-5 text-blue-600" />
                <div>
                  <p className="font-semibold text-gray-900 text-sm md:text-base">تسجيل فردي</p>
                  <p className="text-xs md:text-sm text-gray-600">سجل نفسك في البطولات</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-white/50 rounded-lg">
                <Calendar className="h-4 w-4 md:h-5 md:w-5 text-green-600" />
                <div>
                  <p className="font-semibold text-gray-900 text-sm md:text-base">البطولات المتاحة</p>
                  <p className="text-xs md:text-sm text-gray-600">جميع البطولات النشطة</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-white/50 rounded-lg">
                <Trophy className="h-4 w-4 md:h-5 md:w-5 text-purple-600" />
                <div>
                  <p className="font-semibold text-gray-900 text-sm md:text-base">دفع آمن</p>
                  <p className="text-xs md:text-sm text-gray-600">طرق دفع متعددة</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Opportunities Section */}
        {opportunities.length > 0 && (
          <div className="mb-6 md:mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg md:text-2xl font-semibold text-gray-900">آخر الفرص المتاحة</h2>
              <Link href="/dashboard/player/search" className="text-sm text-green-600 font-semibold hover:text-green-700">
                عرض الكل ←
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {opportunities.map(opp => {
                const cfg = OPPORTUNITY_TYPES[opp.opportunityType] ?? { label: opp.opportunityType, emoji: '📌', color: '#6B7280' };
                return (
                  <Link
                    key={opp.id}
                    href={`/dashboard/opportunities/${opp.id}`}
                    className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold text-white"
                        style={{ backgroundColor: cfg.color }}
                      >
                        {cfg.emoji} {cfg.label}
                      </span>
                    </div>
                    <h3 className="font-bold text-sm text-gray-900 line-clamp-2 mb-1">{opp.title}</h3>
                    <p className="text-xs text-gray-500 flex items-center gap-1">
                      <MapPin className="w-3 h-3" /> {opp.organizerName}
                    </p>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* Recommended Opportunities Section */}
        {(() => {
          const playerPos = userData?.position || userData?.playing_position || '';
          const playerCountry = userData?.country || '';
          const recommended = opportunities.filter(opp => {
            const posMatch = playerPos && opp.targetPositions?.includes(playerPos);
            const countryMatch = playerCountry && opp.country === playerCountry;
            return posMatch || countryMatch;
          }).slice(0, 3);
          if (recommended.length === 0) return null;
          return (
            <div className="mb-6 md:mb-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg md:text-2xl font-semibold text-gray-900">موصى بها لك</h2>
                <Link href="/dashboard/player/search" className="text-sm text-green-600 font-semibold hover:text-green-700">
                  عرض الكل ←
                </Link>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {recommended.map(opp => {
                  const cfg = OPPORTUNITY_TYPES[opp.opportunityType] ?? { label: opp.opportunityType, emoji: '📌', color: '#6B7280' };
                  return (
                    <Link
                      key={opp.id}
                      href={`/dashboard/opportunities/${opp.id}`}
                      className="bg-white rounded-xl border border-green-100 shadow-sm p-4 hover:shadow-md transition-shadow relative"
                    >
                      <span className="absolute top-2 left-2 text-xs font-bold bg-green-500 text-white px-2 py-0.5 rounded-full">
                        مناسب لك
                      </span>
                      <div className="flex items-center gap-2 mb-2 mt-4">
                        <span
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold text-white"
                          style={{ backgroundColor: cfg.color }}
                        >
                          {cfg.emoji} {cfg.label}
                        </span>
                      </div>
                      <h3 className="font-bold text-sm text-gray-900 line-clamp-2 mb-1">{opp.title}</h3>
                      <p className="text-xs text-gray-500 flex items-center gap-1">
                        <MapPin className="w-3 h-3" /> {opp.organizerName}
                      </p>
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })()}

        {/* Quick Actions */}
        <div className="mb-6 md:mb-8">
          <h2 className="text-lg md:text-2xl font-semibold text-gray-900 mb-4 md:mb-6">
            الوصول السريع
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            {quickActions.map((action) => (
              <Link
                key={action.title}
                href={action.href}
                className="group bg-white p-4 md:p-6 rounded-xl md:rounded-2xl shadow-sm hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1 touch-target"
              >
                <div className="flex items-center mb-3 md:mb-4">
                  <div className={`w-10 h-10 md:w-12 md:h-12 ${action.color} rounded-lg flex items-center justify-center mr-3 md:mr-4 group-hover:scale-110 transition-transform`}>
                    <action.icon className="w-5 h-5 md:w-6 md:h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-sm md:text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                      {action.title}
                    </h3>
                    <p className="text-xs md:text-sm text-gray-600 mt-1">
                      {action.description}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="mb-6 md:mb-8">
          <h2 className="text-lg md:text-2xl font-semibold text-gray-900 mb-4 md:mb-6">
            النشاط الأخير
          </h2>
          <div className="bg-white rounded-xl md:rounded-2xl shadow-sm overflow-hidden">
            <div className="p-4 md:p-6">
              <div className="space-y-4">
                {[
                  {
                    title: 'تم تحديث ملفك الشخصي',
                    description: 'تم إضافة معلومات جديدة إلى ملفك الشخصي',
                    time: 'منذ ساعتين',
                    icon: User,
                    color: 'text-blue-500'
                  },
                  {
                    title: 'تم إرسال تقرير جديد',
                    description: 'تم إرسال تقرير الأداء الأسبوعي',
                    time: 'منذ يوم واحد',
                    icon: FileText,
                    color: 'text-green-500'
                  },
                  {
                    title: 'رسالة جديدة',
                    description: 'لديك رسالة جديدة من المدرب',
                    time: 'منذ يومين',
                    icon: MessageSquare,
                    color: 'text-orange-500'
                  }
                ].map((activity, index) => (
                  <div key={index} className="flex items-start space-x-3 md:space-x-4 p-3 md:p-4 bg-gray-50 rounded-lg">
                    <activity.icon className={`w-5 h-5 md:w-6 md:h-6 mt-1 ${activity.color}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm md:text-base font-medium text-gray-900">
                        {activity.title}
                      </p>
                      <p className="text-xs md:text-sm text-gray-600 mt-1">
                        {activity.description}
                      </p>
                      <p className="text-xs text-gray-500 mt-2">
                        {activity.time}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Upcoming Events */}
        <div className="mb-6 md:mb-8">
          <h2 className="text-lg md:text-2xl font-semibold text-gray-900 mb-4 md:mb-6">
            الأحداث القادمة
          </h2>
          <div className="bg-white rounded-xl md:rounded-2xl shadow-sm overflow-hidden">
            <div className="p-4 md:p-6">
              <div className="space-y-4">
                {[
                  {
                    title: 'مباراة تدريبية',
                    date: 'غداً - 4:00 مساءً',
                    location: 'ملعب النادي',
                    type: 'training'
                  },
                  {
                    title: 'جلسة تحليل الأداء',
                    date: 'الخميس - 6:00 مساءً',
                    location: 'قاعة الاجتماعات',
                    type: 'analysis'
                  },
                  {
                    title: 'مباراة رسمية',
                    date: 'السبت - 8:00 مساءً',
                    location: 'الملعب الرئيسي',
                    type: 'match'
                  }
                ].map((event, index) => (
                  <div key={index} className="flex items-center justify-between p-3 md:p-4 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <h3 className="text-sm md:text-base font-medium text-gray-900">
                        {event.title}
                      </h3>
                      <p className="text-xs md:text-sm text-gray-600 mt-1">
                        {event.date}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {event.location}
                      </p>
                    </div>
                    <div className={`px-2 py-1 rounded-full text-xs font-medium ${event.type === 'match' ? 'bg-red-100 text-red-800' :
                      event.type === 'training' ? 'bg-blue-100 text-blue-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                      {event.type === 'match' ? 'مباراة' :
                        event.type === 'training' ? 'تدريب' : 'تحليل'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          {/* Performance Chart */}
          <div className="bg-white p-4 md:p-6 rounded-xl md:rounded-2xl shadow-sm">
            <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-4">
              تقدم الأداء
            </h3>
            <div className="space-y-3">
              {[
                { label: 'السرعة', value: 85, color: 'bg-blue-500' },
                { label: 'القوة', value: 72, color: 'bg-green-500' },
                { label: 'الدقة', value: 90, color: 'bg-purple-500' },
                { label: 'التحمل', value: 78, color: 'bg-orange-500' }
              ].map((skill) => (
                <div key={skill.label} className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">{skill.label}</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-20 md:w-24 bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${skill.color}`}
                        style={{ width: `${skill.value}%` }}
                      ></div>
                    </div>
                    <span className="text-sm font-medium text-gray-900 w-8 text-left">
                      {skill.value}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Achievements */}
          <div className="bg-white p-4 md:p-6 rounded-xl md:rounded-2xl shadow-sm">
            <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-4">
              الإنجازات الأخيرة
            </h3>
            <div className="space-y-3">
              {[
                { title: 'أفضل لاعب في المباراة', date: 'الأسبوع الماضي', icon: Trophy },
                { title: 'تحسن في السرعة', date: 'قبل أسبوعين', icon: TrendingUp },
                { title: 'أول هدف رسمي', date: 'قبل شهر', icon: Target }
              ].map((achievement, index) => (
                <div key={index} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                  <achievement.icon className="w-5 h-5 text-yellow-500" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">
                      {achievement.title}
                    </p>
                    <p className="text-xs text-gray-600">
                      {achievement.date}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
