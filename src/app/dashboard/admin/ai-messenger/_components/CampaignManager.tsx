import React, { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { db } from '@/lib/firebase/config';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { ChatAmanService, ChatAmanTemplate } from '@/lib/services/chataman-service';
import { ChatAmanTemplateSelector } from '@/components/messaging/ChatAmanTemplateSelector';
import { toast } from 'sonner';
import {
  Megaphone,
  Users,
  Send,
  CheckCircle2,
  AlertTriangle,
  Settings,
  Sparkles,
  UserSquare2,
  Info,
  ChevronDown,
  X,
  Tag,
  Loader2,
} from 'lucide-react';
import { useCampaign, CampaignUser, VarMapping } from '@/lib/campaign/campaign-context';
import { CampaignHistory } from './CampaignHistory';

// ─── Variable mapping types ────────────────────────────────────────────────────
type VarSource = 'account_name' | 'country' | 'role' | 'custom';

const VAR_SOURCE_LABELS: Record<VarSource, string> = {
  account_name: '👤 اسم صاحب الحساب',
  country:      '🌍 الدولة',
  role:         '🏷️ الفئة',
  custom:       '✏️ نص ثابت',
};

const ROLE_LABELS: Record<string, string> = {
  player: 'لاعب', club: 'نادي', academy: 'أكاديمية',
  trainer: 'مدرب', agent: 'وكيل', parent: 'ولي أمر',
};

const getCountryFlag = (phone: string, country?: string): string => {
   if (country) {
       const c = country.trim().toLowerCase();
       if (c.includes('مصر') || c.includes('egypt')) return '🇪🇬';
       if (c.includes('السعودية') || c.includes('saudi')) return '🇸🇦';
       if (c.includes('الكويت') || c.includes('kuwait')) return '🇰🇼';
       if (c.includes('الامارات') || c.includes('الإمارات') || c.includes('emirates') || c.includes('uae')) return '🇦🇪';
       if (c.includes('قطر') || c.includes('qatar')) return '🇶🇦';
       if (c.includes('عمان') || c.includes('عُمان') || c.includes('oman')) return '🇴🇲';
       if (c.includes('البحرين') || c.includes('bahrain')) return '🇧🇭';
       if (c.includes('الاردن') || c.includes('الأردن') || c.includes('jordan')) return '🇯🇴';
       if (c.includes('المغرب') || c.includes('morocco')) return '🇲🇦';
       if (c.includes('تونس') || c.includes('tunisia')) return '🇹🇳';
       if (c.includes('الجزائر') || c.includes('algeria')) return '🇩🇿';
   }

   if (!phone) return '🌍';
   const d = phone.replace(/\D/g, '');
   if (d.startsWith('20')) return '🇪🇬';
   if (d.startsWith('966')) return '🇸🇦';
   if (d.startsWith('965')) return '🇰🇼';
   if (d.startsWith('971')) return '🇦🇪';
   if (d.startsWith('974')) return '🇶🇦';
   if (d.startsWith('968')) return '🇴🇲';
   if (d.startsWith('973')) return '🇧🇭';
   if (d.startsWith('962')) return '🇯🇴';
   if (d.startsWith('961')) return '🇱🇧';
   if (d.startsWith('212')) return '🇲🇦';
   return '🌍';
};

export const CampaignManager: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'builder' | 'history'>('builder');
  const { campaign, startCampaign } = useCampaign();

  const [targetSegment, setTargetSegment] = useState<string>('all');
  const [targetCountries, setTargetCountries] = useState<string[]>([]);   // multi-select
  const [countryDropdownOpen, setCountryDropdownOpen] = useState(false);
  const countryDropdownRef = useRef<HTMLDivElement>(null);
  const [campaignType, setCampaignType] = useState<string>('promo');

  const [users, setUsers] = useState<any[]>([]);
  const [templates, setTemplates] = useState<ChatAmanTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<ChatAmanTemplate | null>(null);
  const [varMappings, setVarMappings] = useState<VarMapping[]>([]);

  const uniqueCountries = Array.from(new Set(users.map(u => u.country))).filter(Boolean);

  // Close country dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (countryDropdownRef.current && !countryDropdownRef.current.contains(e.target as Node)) {
        setCountryDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const toggleCountry = (c: string) => {
    setTargetCountries(prev =>
      prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c]
    );
  };

  // 📋 1. Load Real Users on mount (Multi-collection aggregations)
  useEffect(() => {
    const collectionsGroup = ['users', 'players', 'academies', 'academy', 'clubs', 'club', 'trainers', 'trainer', 'agents', 'agent', 'parents', 'parent'];
    const collectionToType: Record<string, string> = {
      users: 'any', players: 'player', academies: 'academy', academy: 'academy',
      clubs: 'club', club: 'club', trainers: 'trainer', trainer: 'trainer',
      agents: 'agent', agent: 'agent', parents: 'parent', parent: 'parent'
    };
    const combinedMap = new Map<string, any>();

    const upsertDocs = (docs: any[], colName: string) => {
      for (const d of docs) {
        const data = d.data();
        const accountType = collectionToType[colName] || data.accountType || colName;
        const name = data.displayName || data.full_name || data.name || data.academyName || data.academy_name || data.clubName || data.club_name || data.userName || data.username || 'مستخدم مجهول';
        const phone = data.phone || data.phoneNumber || data.whatsapp || data.official_contact?.phone || '';
        const country = data.country || data.countryName || '';

        let avatar = '';
        if (data.profile_image_url) {
          avatar = data.profile_image_url;
        } else if (data.profile_image) {
          if (typeof data.profile_image === 'string') avatar = data.profile_image;
          else if (typeof data.profile_image === 'object' && data.profile_image.url) avatar = data.profile_image.url;
        }
        if (!avatar) {
          avatar = data.avatar || data.photoURL || data.profileImage || data.personalPhoto || data.personal_photo || data.logo || '';
        }

        if (phone) {
           combinedMap.set(d.id, { id: d.id, name, phone, role: accountType, avatar, country });
        }
      }
      setUsers(Array.from(combinedMap.values()));
    };

    const unsubs = collectionsGroup.map(col => onSnapshot(query(collection(db, col)), (snap) => upsertDocs(snap.docs, col)));
    return () => unsubs.forEach(u => u());
  }, []);

  // 📋 2. Load Templates on mount
  useEffect(() => {
    const loadTemplates = async () => {
      const fetched = await ChatAmanService.getTemplates();
      setTemplates(fetched);
    };
    loadTemplates();
  }, []);

  const handleSelectTemplate = (template: ChatAmanTemplate, _vars: string[]) => {
     setSelectedTemplate(template);
     const matches = template.body ? template.body.match(/\{\{(\d+)\}\}/g) : [];
     const numbers = matches ? matches.map(m => parseInt(m.replace(/\D/g, ''), 10)) : [];
     const varCount = numbers.length > 0 ? Math.max(...numbers) : 0;
     // Default: first var = account_name, rest = custom
     setVarMappings(Array.from({ length: varCount }, (_, i) =>
       i === 0 ? { source: 'account_name' } : { source: 'custom', customValue: '' }
     ));
  };

  const handleStartCampaign = async () => {
    if (!selectedTemplate) { toast.error('يرجى تحديد قالب للحملة'); return; }
    const filtered = users.filter(u => {
      const roleMatch = targetSegment === 'all' || u.role === targetSegment;
      const countryMatch = targetCountries.length === 0 || targetCountries.includes(u.country);
      return roleMatch && countryMatch;
    });
    if (filtered.length === 0) { toast.error('لا يوجد مستخدمين متاحين'); return; }
    await startCampaign(
      filtered as CampaignUser[],
      selectedTemplate.name,
      selectedTemplate.body || '',
      selectedTemplate.language || 'ar',
      varMappings,
      targetSegment,
      targetCountries,
    );
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full overflow-y-auto custom-scrollbar p-1" dir="rtl">
      {/* 🟢 Right: Campaign Config & Builder Module */}
      <div className="lg:col-span-2 space-y-4">
         <Card className="border-none shadow-xl bg-white rounded-2xl relative overflow-hidden">
            <CardHeader className="p-4 pb-0">
               <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                  <Megaphone className="w-4 h-4 text-emerald-500 animate-bounce" />
                  إنشاء حملة مراسلة جماعية ذكية
               </CardTitle>
               <CardDescription className="text-[10px] text-slate-400">تحديد الجمهور والقوالب وبدء الإرسال الدفعي الآمن</CardDescription>

               {/* Tab switcher */}
               <div className="flex gap-1 bg-slate-100 p-0.5 rounded-lg mt-3">
                 {[
                   { id: 'builder', label: '🚀 إنشاء حملة' },
                   { id: 'history', label: '📋 سجل الحملات' },
                 ].map(t => (
                   <button key={t.id} onClick={() => setActiveTab(t.id as any)}
                     className={`flex-1 text-[10px] font-bold py-1 rounded-md transition-all ${activeTab === t.id ? 'bg-white shadow text-emerald-700' : 'text-slate-500 hover:text-slate-700'}`}>
                     {t.label}
                   </button>
                 ))}
               </div>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
               {activeTab === 'builder' && (
                 <>
                   {/* Segment Filters */}
                   <div className="grid grid-cols-1 md:grid-cols-4 gap-3 border p-3 rounded-xl border-slate-100 bg-slate-50/50">
                      <div className="space-y-1">
                         <Label className="text-xs font-bold text-slate-700">1. تصفية الفئة</Label>
                         <Select onValueChange={setTargetSegment} defaultValue="all">
                            <SelectTrigger className="h-9 text-xs border-slate-200">
                               <SelectValue placeholder="اختر الفئة..." />
                            </SelectTrigger>
                            <SelectContent className="text-xs">
                               <SelectItem value="all">الكل ({users.length})</SelectItem>
                               <SelectItem value="player">لاعبين ({users.filter(u => u.role === 'player').length})</SelectItem>
                               <SelectItem value="academy">أكاديميات ({users.filter(u => u.role === 'academy').length})</SelectItem>
                               <SelectItem value="trainer">مدربين ({users.filter(u => u.role === 'trainer').length})</SelectItem>
                               <SelectItem value="parent">أولياء أمور ({users.filter(u => u.role === 'parent').length})</SelectItem>
                            </SelectContent>
                         </Select>
                      </div>

                      {/* Multi-select countries */}
                      <div className="space-y-1" ref={countryDropdownRef}>
                         <Label className="text-xs font-bold text-slate-700">2. تصفية الدولة (متعدد)</Label>
                         <div className="relative">
                            <button
                              type="button"
                              onClick={() => setCountryDropdownOpen(o => !o)}
                              className="w-full h-9 px-3 flex items-center justify-between border border-slate-200 rounded-md bg-white text-xs text-slate-700 hover:border-slate-300 focus:outline-none"
                            >
                              <span className="truncate">
                                {targetCountries.length === 0
                                  ? `كل الدول (${users.length})`
                                  : `${targetCountries.length} دولة محددة`}
                              </span>
                              <ChevronDown className="w-3 h-3 text-slate-400 shrink-0" />
                            </button>
                            {countryDropdownOpen && (
                              <div className="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-xl max-h-52 overflow-y-auto">
                                {/* Select all / clear */}
                                <div className="flex items-center justify-between px-3 py-2 border-b border-slate-100">
                                  <button type="button" onClick={() => setTargetCountries(uniqueCountries as string[])} className="text-[10px] text-emerald-600 font-bold hover:underline">تحديد الكل</button>
                                  <button type="button" onClick={() => setTargetCountries([])} className="text-[10px] text-slate-400 hover:underline">إلغاء الكل</button>
                                </div>
                                {uniqueCountries.map((c, i) => (
                                  <label key={i} className="flex items-center gap-2 px-3 py-1.5 hover:bg-slate-50 cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={targetCountries.includes(c as string)}
                                      onChange={() => toggleCountry(c as string)}
                                      className="accent-emerald-500 w-3.5 h-3.5"
                                    />
                                    <span className="text-xs text-slate-700 flex-1">
                                      {getCountryFlag('', c as string)} {c}
                                    </span>
                                    <span className="text-[10px] text-slate-400">{users.filter(u => u.country === c).length}</span>
                                  </label>
                                ))}
                              </div>
                            )}
                         </div>
                         {/* Selected country badges */}
                         {targetCountries.length > 0 && (
                           <div className="flex flex-wrap gap-1 mt-1">
                             {targetCountries.map((c, i) => (
                               <span key={i} className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-full text-[10px] px-2 py-0.5">
                                 {getCountryFlag('', c)} {c}
                                 <button type="button" onClick={() => toggleCountry(c)} className="hover:text-red-500">
                                   <X className="w-2.5 h-2.5" />
                                 </button>
                               </span>
                             ))}
                           </div>
                         )}
                      </div>

                      <div className="space-y-1">
                         <Label className="text-xs font-bold text-slate-700">3. نوع الحملة</Label>
                         <Select onValueChange={setCampaignType} defaultValue="promo">
                            <SelectTrigger className="h-9 text-xs border-slate-200">
                               <SelectValue placeholder="اختر النوع..." />
                            </SelectTrigger>
                            <SelectContent className="text-xs">
                               <SelectItem value="promo">📢 ترويجية وإعلانات</SelectItem>
                               <SelectItem value="awareness">💡 توعية وإرشاد</SelectItem>
                               <SelectItem value="notification">🔔 تنبيهات وإشعارات</SelectItem>
                               <SelectItem value="administrative">📁 إدارية وخاصة</SelectItem>
                            </SelectContent>
                         </Select>
                      </div>

                      <div className="space-y-1 md:col-span-2">
                         <Label className="text-xs font-bold text-slate-700">4. قالب الحملة الحصرية</Label>
                         <ChatAmanTemplateSelector onSelect={handleSelectTemplate} />
                      </div>
                   </div>

                   {/* ─── Variables Mapping ─────────────────────────────────────── */}
                   {selectedTemplate && varMappings.length > 0 && (
                     <div className="border border-slate-100 rounded-xl p-3 bg-slate-50/60 space-y-2">
                       <div className="flex items-center gap-1.5 mb-1">
                         <Tag className="w-3.5 h-3.5 text-purple-500" />
                         <p className="text-xs font-bold text-slate-700">إعداد متغيرات القالب</p>
                       </div>
                       {varMappings.map((mapping, idx) => (
                         <div key={idx} className="flex items-center gap-2">
                           <span className="text-[10px] font-bold text-slate-500 w-8 shrink-0 text-center bg-slate-200 rounded-md py-1">
                             {`{{${idx + 1}}}`}
                           </span>
                           <Select
                             value={mapping.source}
                             onValueChange={(v) => {
                               const updated = [...varMappings];
                               updated[idx] = { source: v as VarSource, customValue: '' };
                               setVarMappings(updated);
                             }}
                           >
                             <SelectTrigger className="h-8 text-xs flex-1 border-slate-200 bg-white">
                               <SelectValue />
                             </SelectTrigger>
                             <SelectContent className="text-xs">
                               {(Object.keys(VAR_SOURCE_LABELS) as VarSource[]).map(src => (
                                 <SelectItem key={src} value={src}>{VAR_SOURCE_LABELS[src]}</SelectItem>
                               ))}
                             </SelectContent>
                           </Select>
                           {mapping.source === 'custom' && (
                             <Input
                               value={mapping.customValue || ''}
                               onChange={(e) => {
                                 const updated = [...varMappings];
                                 updated[idx] = { ...updated[idx], customValue: e.target.value };
                                 setVarMappings(updated);
                               }}
                               placeholder="أدخل النص الثابت..."
                               className="h-8 text-xs flex-1 border-slate-200"
                             />
                           )}
                         </div>
                       ))}
                       {/* Template body preview */}
                       {selectedTemplate.body && (
                         <div className="mt-2 p-2 bg-white border border-slate-100 rounded-lg text-[10px] text-slate-500 leading-relaxed">
                           {selectedTemplate.body}
                         </div>
                       )}
                     </div>
                   )}

                   {/* Bulk Campaign Settings (Time Delay, Limits) */}
                   <div className="p-2.5 rounded-xl bg-amber-50/80 border border-amber-100 flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5" />
                      <div>
                         <h4 className="text-[10px] font-bold text-amber-800">حماية الخادم ضد الحجب (Safe Delay Mode)</h4>
                         <p className="text-[9px] text-amber-700 leading-relaxed mt-0.5">سيقوم محرك الحملات المراسلة بجدولة فاصل تأخير روتيني تبلغ **3 ثوانٍ** لمنع حظر الرقم والمظهر العشوائي.</p>
                      </div>
                   </div>

                   {/* Trigger Click and Progress Bar */}
                   {campaign.status === 'running' ? (
                     <div className="space-y-2">
                       <div className="flex items-center justify-between text-xs text-slate-600">
                         <span className="flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin text-emerald-500" /> جاري الإرسال — يمكنك التنقل بحرية</span>
                         <span className="font-bold">{campaign.progress}%</span>
                       </div>
                       <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                         <div className="h-full bg-gradient-to-r from-emerald-500 to-green-600 transition-all duration-300" style={{ width: `${campaign.progress}%` }} />
                       </div>
                       <div className="flex gap-4 text-[10px] text-slate-500">
                         <span className="text-emerald-600 font-bold">✅ {campaign.success} نجح</span>
                         <span className="text-rose-500 font-bold">❌ {campaign.failed} فشل</span>
                         <span>من {campaign.total}</span>
                       </div>
                     </div>
                   ) : (
                     <Button onClick={handleStartCampaign}
                       className="w-full h-10 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-white font-bold text-xs rounded-xl shadow-lg flex items-center justify-center gap-1.5">
                       <Send className="w-3.5 h-3.5 ml-0.5" />
                       إطلاق الحملة الجماعية الآن
                     </Button>
                   )}
                 </>
               )}

               {activeTab === 'history' && <CampaignHistory />}
            </CardContent>
         </Card>
      </div>

      {/* 🟡 Left: Live Activity Log */}
      <div className="space-y-4">
         <Card className="border-none shadow-xl bg-white rounded-2xl h-full flex flex-col">
            <CardHeader className="p-4 pb-2">
               <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-1">
                  <UserSquare2 className="w-4 h-4 text-emerald-500" />
                  الأهداف والنطاقات المجهزة
               </CardTitle>
               <CardDescription className="text-[10px] text-slate-400">ملخص الجمهور المستهدف المصدق آلياً</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 p-4 flex flex-col justify-between">
               <div className="space-y-2 flex-1">
                  {[
                     { label: "الأكاديميات الرياضية", count: users.filter(u => u.role === 'academy').length.toString(), color: "from-blue-500 to-indigo-600" },
                     { label: "قاعدة اللاعبين المسجلة", count: users.filter(u => u.role === 'player').length.toString(), color: "from-teal-500 to-emerald-600" },
                     { label: "المدربين وأولياء الأمور", count: (users.filter(u => u.role === 'trainer').length + users.filter(u => u.role === 'parent').length).toString(), color: "from-amber-500 to-orange-600" }
                  ].map((item, idx) => (
                     <div key={idx} className="p-2 border rounded-xl border-slate-100 bg-slate-50/30 flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
                           <span className={`w-1.5 h-1.5 rounded-full bg-gradient-to-br ${item.color}`}></span>
                           {item.label}
                        </span>
                        <Badge className="text-xs bg-slate-100 text-slate-800 border-none px-2">{item.count}</Badge>
                     </div>
                  ))}

                  <div className="pt-2 border-t border-slate-100 mt-2">
                     <p className="text-[10px] font-bold text-slate-500 mb-1">🌍 التوزيع الجغرافي للجمهور</p>
                     <div className="grid grid-cols-2 gap-1">
                        {uniqueCountries.map((c, idx) => (
                           <div key={idx} className="p-1 px-2 border rounded-lg border-slate-100 flex items-center justify-between bg-white text-[10px] text-slate-600">
                              <span className="truncate">{getCountryFlag('', c)} {c}</span>
                              <span className="font-bold text-slate-700">{users.filter(u => u.country === c).length}</span>
                           </div>
                        ))}
                     </div>
                  </div>
               </div>

               <div className="p-3 border rounded-xl border-slate-100 bg-slate-50/50 flex flex-col items-center gap-1 text-slate-400 text-xs text-center mt-4">
                  <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
                     <Settings className="w-4 h-4 fill-slate-300 stroke-none" />
                  </div>
                  <p className="font-bold text-slate-600 text-[10px]">نظام الجدولة التأخيري الآمن (Safe Mode)</p>
                  <p className="text-[9px] text-slate-400">تدفق المراسلة يضمن نسبة وصول 100% مستقرة</p>
               </div>
            </CardContent>
         </Card>
      </div>
    </div>
  );
};
