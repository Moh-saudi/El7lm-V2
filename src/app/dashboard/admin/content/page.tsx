'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  LayoutTemplate,
  Images,
  Users,
  Trophy,
  BarChart3,
  Settings,
  Megaphone,
  Image as ImageIcon2,
  BrainCircuit,
  Target,
  UserPlus,
  ShoppingBag,
} from 'lucide-react';
import SliderManager from './_components/SliderManager';
import PartnersManager from './_components/PartnersManager';
import StatsManager from './_components/StatsManager';
import SuccessStoriesManager from './_components/SuccessStoriesManager';
import BrandingManager from './_components/BrandingManager';
import AdsManager from './_components/AdsManager';
import HomeImagesManager from './_components/HomeImagesManager';
import AiSectionManager from './_components/AiSectionManager';
import OppsSectionManager from './_components/OppsSectionManager';
import PlayersSectionManager from './_components/PlayersSectionManager';
import StoreSectionManager from './_components/StoreSectionManager';

const tabs = [
  { id: 'homeImages', label: 'صور الواجهة', icon: ImageIcon2 },
  { id: 'ads', label: 'الإعلانات', icon: Megaphone },
  { id: 'aiSection', label: 'الذكاء الاصطناعي', icon: BrainCircuit },
  { id: 'oppsSection', label: 'الفرص المتاحة', icon: Target },
  { id: 'playersSection', label: 'أبرز المواهب', icon: UserPlus },
  { id: 'storeSection', label: 'المتجر', icon: ShoppingBag },
  { id: 'partners', label: 'الشركاء', icon: Users },
  { id: 'slider', label: 'السلايدر', icon: Images },
  { id: 'branding', label: 'الهوية', icon: Settings },
  { id: 'stats', label: 'الإحصائيات', icon: BarChart3 },
  { id: 'stories', label: 'قصص النجاح', icon: Trophy },
];

export default function ContentManagerPage() {
  const [activeTab, setActiveTab] = useState('slider');

  return (
    <div
      className="min-h-screen space-y-6 bg-slate-50/50 p-6 text-slate-900 dark:bg-[#0b1120] dark:text-gray-100"
      dir="rtl"
    >
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <LayoutTemplate className="h-8 w-8 text-blue-500" />
            إدارة محتوى الصفحة الرئيسية
          </h1>
          <p className="mt-1 text-slate-500 dark:text-gray-400">
            التحكم الكامل في الصور والنصوص والأرقام الظاهرة في واجهة الموقع.
          </p>
        </div>
      </div>

      <div className="overflow-x-auto border-b border-slate-200 dark:border-white/10">
        <div className="flex min-w-max items-center gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 whitespace-nowrap border-b-2 px-6 py-3 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-500 bg-blue-50/50 text-blue-600 dark:bg-white/5 dark:text-blue-400'
                  : 'border-transparent text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-200'
              }`}
            >
              <tab.icon size={18} />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="min-h-[400px] rounded-lg border border-slate-200 bg-white p-6 shadow-sm dark:border-white/5 dark:bg-[#1e293b]">
        {activeTab === 'homeImages' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <HomeImagesManager />
          </motion.div>
        )}

        {activeTab === 'ads' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <AdsManager />
          </motion.div>
        )}

        {activeTab === 'aiSection' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <AiSectionManager />
          </motion.div>
        )}

        {activeTab === 'oppsSection' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <OppsSectionManager />
          </motion.div>
        )}

        {activeTab === 'playersSection' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <PlayersSectionManager />
          </motion.div>
        )}

        {activeTab === 'storeSection' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <StoreSectionManager />
          </motion.div>
        )}

        {activeTab === 'slider' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <SliderManager />
          </motion.div>
        )}

        {activeTab === 'stats' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <StatsManager />
          </motion.div>
        )}

        {activeTab === 'partners' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <PartnersManager />
          </motion.div>
        )}

        {activeTab === 'stories' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <SuccessStoriesManager />
          </motion.div>
        )}

        {activeTab === 'branding' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <BrandingManager />
          </motion.div>
        )}
      </div>
    </div>
  );
}
