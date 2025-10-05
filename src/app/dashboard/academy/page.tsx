'use client';

import React, { memo } from 'react';
import Link from 'next/link';
import { Trophy, Users, Calendar, ArrowRight } from 'lucide-react';

// مكون الصفحة الرئيسية الحماسية
const WelcomeHero = memo(() => {
  return (
    <div className="text-center py-12">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          مرحباً بك في لوحة تحكم الأكاديمية
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          إدارة طلابك ومتابعة تقدمهم وإدارة المدفوعات
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="flex items-center gap-3 p-4 bg-orange-50 rounded-lg">
            <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
            <span className="text-gray-700">إدارة الطلاب والتسجيلات</span>
          </div>
          <div className="flex items-center gap-3 p-4 bg-orange-50 rounded-lg">
            <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
            <span className="text-gray-700">متابعة التقدم والأداء</span>
          </div>
          <div className="flex items-center gap-3 p-4 bg-orange-50 rounded-lg">
            <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
            <span className="text-gray-700">إدارة المدفوعات والاشتراكات</span>
          </div>
          <div className="flex items-center gap-3 p-4 bg-orange-50 rounded-lg">
            <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
            <span className="text-gray-700">التواصل مع الطلاب والأهالي</span>
          </div>
        </div>
        
        {/* Tournament Registration Section */}
        <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-xl p-6 mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-yellow-100 rounded-full">
                <Trophy className="h-8 w-8 text-yellow-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-1">التسجيل في البطولات</h3>
                <p className="text-gray-600">سجل طلابك في البطولات المتاحة بسهولة</p>
              </div>
            </div>
            <Link 
              href="/tournaments/unified-registration"
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-yellow-500 to-orange-600 text-white rounded-lg hover:from-yellow-600 hover:to-orange-700 transition-all duration-300 hover:scale-105 shadow-lg"
            >
              <Trophy className="h-5 w-5" />
              تسجيل في البطولات
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            <div className="flex items-center gap-3 p-3 bg-white/50 rounded-lg">
              <Users className="h-5 w-5 text-blue-600" />
              <div>
                <p className="font-semibold text-gray-900">اختيار الطلاب</p>
                <p className="text-sm text-gray-600">من قائمة طلابك المسجلين</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-white/50 rounded-lg">
              <Calendar className="h-5 w-5 text-green-600" />
              <div>
                <p className="font-semibold text-gray-900">البطولات المتاحة</p>
                <p className="text-sm text-gray-600">جميع البطولات النشطة</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-white/50 rounded-lg">
              <Trophy className="h-5 w-5 text-purple-600" />
              <div>
                <p className="font-semibold text-gray-900">دفع آمن</p>
                <p className="text-sm text-gray-600">طرق دفع متعددة</p>
              </div>
            </div>
          </div>
        </div>
        
        <div className="bg-gradient-to-r from-orange-500 to-red-600 text-white p-8 rounded-lg">
          <h2 className="text-2xl font-bold mb-4">ابدأ رحلتك التعليمية اليوم</h2>
          <p className="text-lg mb-6">
            انضم إلى مجتمعنا وابدأ في تطوير مهارات طلابك
          </p>
          
          {/* أيقونات السوشيال ميديا */}
          <div className="flex justify-center gap-4 mt-6">
            <a 
              href="https://www.facebook.com/hagzz" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-white/20 hover:bg-white/30 transition-all duration-300 hover:scale-110"
            >
              <img src="/images/medialogo/facebook.svg" alt="فيسبوك" width={24} height={24} />
            </a>
            <a 
              href="https://www.instagram.com/hagzzel7lm?utm_source=ig_web_button_share_sheet&igsh=ZDNlZDc0MzIxNw==" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-white/20 hover:bg-white/30 transition-all duration-300 hover:scale-110"
            >
              <img src="/images/medialogo/instagram.svg" alt="إنستغرام" width={24} height={24} />
            </a>
            <a 
              href="https://www.linkedin.com/company/hagzz" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-white/20 hover:bg-white/30 transition-all duration-300 hover:scale-110"
            >
              <img src="/images/medialogo/linkedin.svg" alt="لينكد إن" width={24} height={24} />
            </a>
            <a 
              href="https://www.tiktok.com/@hagzz25?is_from_webapp=1&sender_device=pc" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-white/20 hover:bg-white/30 transition-all duration-300 hover:scale-110"
            >
              <img src="/images/medialogo/tiktok.svg" alt="تيك توك" width={24} height={24} />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
});

WelcomeHero.displayName = 'WelcomeHero';

export default function AcademyDashboard() {
  return <WelcomeHero />;
} 
