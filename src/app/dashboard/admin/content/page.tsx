'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  LayoutTemplate,
  Images,
  Users,
  Trophy,
  BarChart3,
  Save,
  Settings,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import SliderManager from './_components/SliderManager';
import PartnersManager from './_components/PartnersManager';
import StatsManager from './_components/StatsManager';
import SuccessStoriesManager from './_components/SuccessStoriesManager';
import BrandingManager from './_components/BrandingManager';

export default function ContentManagerPage() {
  const [activeTab, setActiveTab] = useState('slider');

  const tabs = [
    { id: 'slider', label: 'السلايدر الرئيسي', icon: Images },
    { id: 'stats', label: 'الإحصائيات', icon: BarChart3 },
    { id: 'partners', label: 'شركاء النجاح', icon: Users },
    { id: 'stories', label: 'قصص النجاح', icon: Trophy },
    { id: 'branding', label: 'هوية الموقع', icon: Settings },
  ];

  return (
    <div className="p-6 space-y-6 min-h-screen bg-slate-50/50 dark:bg-[#0b1120] text-slate-900 dark:text-gray-100" dir="rtl">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <LayoutTemplate className="w-8 h-8 text-blue-500" />
            إدارة محتوى الصفحة الرئيسية
          </h1>
          <p className="text-slate-500 dark:text-gray-400 mt-1">
            التحكم الكامل في الصور، النصوص، والأرقام الظاهرة في واجهة الموقع.
          </p>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="border-b border-slate-200 dark:border-white/10 overflow-x-auto">
        <div className="flex items-center gap-1 min-w-max">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-6 py-3 border-b-2 transition-colors font-medium text-sm whitespace-nowrap ${activeTab === tab.id
                ? 'border-blue-500 text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-white/5'
                : 'border-transparent text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-gray-200 hover:bg-slate-50 dark:hover:bg-white/5'
                }`}
            >
              <tab.icon size={18} />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content Area */}
      <div className="bg-white dark:bg-[#1e293b] rounded-lg border border-slate-200 dark:border-white/5 shadow-sm min-h-[400px] p-6">

        {/* 1. Slider Management */}
        {activeTab === 'slider' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <SliderManager />
          </motion.div>
        )}

        {/* 2. Stats Management */}
        {activeTab === 'stats' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <StatsManager />
          </motion.div>
        )}

        {/* 3. Partners Management */}
        {activeTab === 'partners' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <PartnersManager />
          </motion.div>
        )}

        {/* 4. Success Stories */}
        {activeTab === 'stories' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <SuccessStoriesManager />
          </motion.div>
        )}

        {/* 5. Branding Management */}
        {activeTab === 'branding' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <BrandingManager />
          </motion.div>
        )}

      </div>
    </div>
  );
}
