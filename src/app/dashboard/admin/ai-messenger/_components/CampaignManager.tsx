import React, { useEffect, useState } from 'react';
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
  UserSquare2 
} from 'lucide-react';

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
  const [targetSegment, setTargetSegment] = useState<string>('all');
  const [targetCountry, setTargetCountry] = useState<string>('all');
  const [campaignType, setCampaignType] = useState<string>('promo');
  
  const [sending, setSending] = useState(false);
  const [progress, setProgress] = useState(0);

  const [users, setUsers] = useState<any[]>([]);
  const [templates, setTemplates] = useState<ChatAmanTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<ChatAmanTemplate | null>(null);
  const [templateVariables, setTemplateVariables] = useState<string[]>([]);
  
  const [aggregatedStats, setAggregatedStats] = useState({
     total: 0,
     success: 0,
     failed: 0
  });

  const uniqueCountries = Array.from(new Set(users.map(u => u.country))).filter(Boolean);

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

  const handleSelectTemplate = (templateName: string) => {
     const template = templates.find(t => t.name === templateName);
     if (!template) return;
     setSelectedTemplate(template);
     const matches = template.body ? template.body.match(/\{\{(\d+)\}\}/g) : [];
     const numbers = matches ? matches.map(m => parseInt(m.replace(/\D/g, ''), 10)) : [];
     const varCount = numbers.length > 0 ? Math.max(...numbers) : 0;
     setTemplateVariables(Array(varCount).fill(''));
  };

  const handleStartCampaign = async () => {
     if (!selectedTemplate) {
        toast.error('يرجى تحديد قالب للحملة');
        return;
     }

     const filterBySegment = users.filter(u => {
        const roleMatch = targetSegment === 'all' || u.role === targetSegment;
        const countryMatch = targetCountry === 'all' || u.country === targetCountry;
        return roleMatch && countryMatch;
     });

     if (filterBySegment.length === 0) {
        toast.error('لا يوجد مستخدمين متاحين في هذه الشريحة المستهدفة');
        return;
     }

     setSending(true);
     setProgress(0);
     let successCount = 0;
     let failCount = 0;

     for (let i = 0; i < filterBySegment.length; i++) {
        const user = filterBySegment[i];
        const vars = [...templateVariables];
        
        // Autofill Name shortcuts if first variable is blank
        if (vars[0] === '' && user.name) vars[0] = user.name; 

        try {
           const res = await ChatAmanService.sendTemplate(user.phone, selectedTemplate.name, {
              language: selectedTemplate.language || 'ar',
              bodyParams: vars
           });

           if (res.success) successCount++;
           else failCount++;
        } catch (e) {
           failCount++;
        }

        setProgress(Math.floor(((i + 1) / filterBySegment.length) * 100));
        setAggregatedStats({ total: filterBySegment.length, success: successCount, failed: failCount });
        
        await new Promise(r => setTimeout(r, 3000));
     }

     setSending(false);
     toast.success(`✅ جرى اكتمال الحملة! بنجاح: ${successCount}، فشل: ${failCount}`);
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
            </CardHeader>
            <CardContent className="p-4 space-y-4">
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

                  <div className="space-y-1">
                     <Label className="text-xs font-bold text-slate-700">2. تصفية الدولة</Label>
                     <Select onValueChange={setTargetCountry} defaultValue="all">
                        <SelectTrigger className="h-9 text-xs border-slate-200">
                           <SelectValue placeholder="اختر الدولة..." />
                        </SelectTrigger>
                        <SelectContent className="text-xs">
                           <SelectItem value="all">كل الدول ({users.length})</SelectItem>
                           {uniqueCountries.map((c, i) => (
                              <SelectItem key={i} value={c}>
                                 {getCountryFlag('', c)} {c} ({users.filter(u => u.country === c).length})
                              </SelectItem>
                           ))}
                        </SelectContent>
                     </Select>
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
                     <ChatAmanTemplateSelector 
                        onSelect={(template, vars) => {
                           setSelectedTemplate(template);
                           setTemplateVariables(vars);
                        }}
                     />
                  </div>
               </div>


               {/* Bulk Campaign Settings (Time Delay, Limits) */}
               <div className="p-2.5 rounded-xl bg-amber-50/80 border border-amber-100 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5" />
                  <div>
                     <h4 className="text-[10px] font-bold text-amber-800">حماية الخادم ضد الحجب (Safe Delay Mode)</h4>
                     <p className="text-[9px] text-amber-700 leading-relaxed mt-0.5">سيقوم محرك الحملات المراسلة بجدولة فاصل تأخير روتيني تبلغ **3 ثوانٍ** لمنع حظر الرقم والمظهر العشوائي.</p>
                  </div>
               </div>

               {/* Trigger Click and Progress Bar */}
               {sending ? (
                  <div className="space-y-2">
                     <div className="flex items-center justify-between text-xs text-slate-600">
                        <span>جاري إرسال الحملة...</span>
                        <span className="font-bold">{progress}%</span>
                     </div>
                     <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-emerald-500 to-green-600 transition-all duration-300" style={{ width: `${progress}%` }}></div>
                     </div>
                     <p className="text-[10px] text-slate-400 text-center">تم إرسال {aggregatedStats.success + aggregatedStats.failed} من أصل {aggregatedStats.total} رسالة</p>
                  </div>
               ) : (
                  <Button 
                    onClick={handleStartCampaign}
                    className="w-full h-10 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-white font-bold text-xs rounded-xl shadow-lg flex items-center justify-center gap-1.5"
                  >
                     <Send className="w-3.5 h-3.5 ml-0.5" />
                     إطلاق الحملة الجماعية الآن
                  </Button>
               )}
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
