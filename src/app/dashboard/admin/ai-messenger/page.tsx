'use client';

import React, { useState } from 'react';
import { 
  BarChart3, 
  MessageSquare, 
  Megaphone, 
  Settings, 
  Bot, 
  Zap, 
  TrendingUp 
} from 'lucide-react';
import { Locale, useTranslation } from '@/lib/i18n';

// Components
import { StatsOverview } from './_components/StatsOverview';
import { LiveChatView } from './_components/LiveChatView';
import { CampaignManager } from './_components/CampaignManager';
import { NotificationSettings } from './_components/NotificationSettings';

const AI_MESSENGER_COPY: Record<Locale, {
  title: string;
  badge: string;
  description: string;
  tabs: Record<'stats' | 'chat' | 'campaigns' | 'settings', string>;
}> = {
  ar: {
    title: 'المركز الذكي للمراسلات',
    badge: 'مدعوم بـ AI',
    description: 'إدارة الذكاء الاصطناعي، الحملات الجماعية، وخدمة العملاء من مكان واحد',
    tabs: {
      stats: 'الإحصائيات',
      chat: 'المحادثات المباشرة',
      campaigns: 'الحملات الذكية',
      settings: 'الإعدادات',
    },
  },
  en: {
    title: 'Smart messaging center',
    badge: 'AI powered',
    description: 'Manage AI, bulk campaigns, and customer support from one place',
    tabs: {
      stats: 'Stats',
      chat: 'Live chats',
      campaigns: 'Smart campaigns',
      settings: 'Settings',
    },
  },
  es: {
    title: 'Centro inteligente de mensajería',
    badge: 'Con IA',
    description: 'Gestiona IA, campañas masivas y soporte al cliente desde un solo lugar',
    tabs: {
      stats: 'Estadísticas',
      chat: 'Chats en vivo',
      campaigns: 'Campañas inteligentes',
      settings: 'Configuración',
    },
  },
  pt: {
    title: 'Central inteligente de mensagens',
    badge: 'Com IA',
    description: 'Gerencie IA, campanhas em massa e suporte ao cliente em um só lugar',
    tabs: {
      stats: 'Estatísticas',
      chat: 'Chats ao vivo',
      campaigns: 'Campanhas inteligentes',
      settings: 'Configurações',
    },
  },
};

export default function AIMessengerDashboard() {
  const { locale, isRTL } = useTranslation();
  const copy = AI_MESSENGER_COPY[locale] || AI_MESSENGER_COPY.en;
  const [activeTab, setActiveTab] = useState<'stats' | 'chat' | 'campaigns' | 'settings'>('stats');

  return (
    <div className="min-h-screen bg-slate-50/40 p-4 md:p-6 space-y-6 flex flex-col h-[calc(100vh-80px)]" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header with Glass Gradient background */}
      <div className="bg-white/80 backdrop-blur-md border border-white/20 shadow-sm rounded-2xl p-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            <span className="bg-gradient-to-r from-emerald-500 to-teal-400 bg-clip-text text-transparent">{copy.title}</span>
            <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 hover:bg-emerald-50 text-[10px] items-center gap-1 border-emerald-100 px-1.5 py-0">
               <Zap className="w-3 h-3 fill-emerald-500 text-emerald-500" />
               {copy.badge}
            </Badge>
          </h1>
          <p className="text-slate-500 text-xs mt-0.5">{copy.description}</p>
        </div>

        {/* Dynamic Navigation Tabs in Navbar style */}
        <div className="flex gap-2 bg-slate-100 p-1 rounded-xl">
          {[
            { id: 'stats', label: copy.tabs.stats, icon: BarChart3 },
            { id: 'chat', label: copy.tabs.chat, icon: MessageSquare },
            { id: 'campaigns', label: copy.tabs.campaigns, icon: Megaphone },
            { id: 'settings', label: copy.tabs.settings, icon: Settings },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
                  isActive 
                  ? 'bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-md shadow-emerald-500/10' 
                  : 'text-slate-600 hover:bg-slate-200/60'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'animate-pulse' : ''}`} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Container Workspace for Content (Flex-Grow) */}
      <div className="flex-1 overflow-hidden relative">
         {activeTab === 'stats' && <StatsOverview />}
         {activeTab === 'chat' && <LiveChatView />}
         {activeTab === 'campaigns' && <CampaignManager />}
         {activeTab === 'settings' && <NotificationSettings />}
      </div>
    </div>
  );
}

const Badge = ({ children, variant, className }: any) => (
  <span className={`inline-flex items-center px-2 py-0.5 rounded-full font-medium ${className}`}>
    {children}
  </span>
);
