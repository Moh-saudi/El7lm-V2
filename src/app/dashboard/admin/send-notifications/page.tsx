'use client';

import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import {
  Bell,
  Send,
  Users,
  User,
  Trophy,
  GraduationCap,
  Briefcase,
  Sparkles,
  Smartphone,
  Search,
  X,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { messageTemplates } from '@/lib/notifications/templates';

type TargetCategory = 'all' | 'players' | 'clubs' | 'academies' | 'trainers' | 'agents' | 'custom';

interface SearchedUser {
  id: string;
  displayName: string;
  email: string;
  phone: string;
  accountType: string;
}

const TARGET_OPTIONS: { id: TargetCategory; label: string; icon: React.ElementType; description: string }[] = [
  { id: 'all', label: 'جميع المستخدمين', icon: Users, description: 'إرسال لكافة المسجلين بالمنصة' },
  { id: 'players', label: 'اللاعبين فقط', icon: User, description: 'مشتركو تطبيق الحلم واللاعبين' },
  { id: 'clubs', label: 'الأندية الرياضية', icon: Trophy, description: 'حسابات وممثلو الأندية' },
  { id: 'academies', label: 'الأكاديميات', icon: GraduationCap, description: 'أكاديميات كرة القدم' },
  { id: 'trainers', label: 'المدربين', icon: Briefcase, description: 'الكوادر الفنية والمدربين' },
  { id: 'agents', label: 'الوكلاء والكشافين', icon: Briefcase, description: 'وكلاء اللاعبين والمسوقين' },
  { id: 'custom', label: 'مستخدمين محددين', icon: Search, description: 'اختيار بالاسم أو الهاتف' },
];

export default function SendNotificationsPage() {
  const [target, setTarget] = useState<TargetCategory>('all');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [actionUrl, setActionUrl] = useState('');
  const [priority, setPriority] = useState<'normal' | 'high' | 'urgent'>('normal');
  const [type, setType] = useState('system');
  const [loading, setLoading] = useState(false);

  // Custom user search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchedUser[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<SearchedUser[]>([]);

  // Search users dynamically with debouncing
  const handleSearch = useCallback(async (query: string) => {
    setSearchQuery(query);
    if (query.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    try {
      const res = await fetch(`/api/admin/users/search?q=${encodeURIComponent(query.trim())}`);
      const data = await res.json();
      if (data.success) {
        setSearchResults(data.users || []);
      }
    } catch {
      // Search error handled silently
    } finally {
      setSearching(false);
    }
  }, []);

  const selectUser = (user: SearchedUser) => {
    if (!selectedUsers.some(u => u.id === user.id)) {
      setSelectedUsers(prev => [...prev, user]);
    }
    setSearchQuery('');
    setSearchResults([]);
  };

  const removeUser = (userId: string) => {
    setSelectedUsers(prev => prev.filter(u => u.id !== userId));
  };

  const applyTemplate = (template: typeof messageTemplates[0]) => {
    setTitle(template.title);
    setMessage(template.message);
    setPriority(template.priority === 'high' ? 'high' : 'normal');
    setType(template.id.includes('opportunity') ? 'opportunity' : 'system');
    toast.success(`تم تطبيق قالب "${template.title}"`);
  };

  const handleSend = async () => {
    if (!title.trim()) {
      toast.error('يرجى إدخال عنوان الإشعار');
      return;
    }
    if (!message.trim()) {
      toast.error('يرجى إدخال نص الإشعار');
      return;
    }
    if (target === 'custom' && selectedUsers.length === 0) {
      toast.error('يرجى اختيار مستخدم واحد على الأقل');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/admin/notifications/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target,
          targetUserIds: target === 'custom' ? selectedUsers.map(u => u.id) : undefined,
          title: title.trim(),
          message: message.trim(),
          actionUrl: actionUrl.trim() || undefined,
          type,
          priority,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'حدث خطأ أثناء إرسال الإشعار');
      }

      toast.success(data.message || 'تم إرسال الإشعار بنجاح');
      setTitle('');
      setMessage('');
      setActionUrl('');
      setSelectedUsers([]);
    } catch (err: any) {
      toast.error(err.message || 'فشل في إرسال الإشعار');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/80 text-slate-900 p-4 md:p-8" dir="rtl">
      {/* Executive Light Header Banner */}
      <div className="max-w-6xl mx-auto mb-8">
        <div className="relative overflow-hidden rounded-3xl bg-white text-slate-900 p-6 md:p-8 shadow-sm border border-slate-200/90">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200/80 text-xs font-semibold text-blue-800">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-blue-900 font-bold">منصة الحلم</span>
                <span className="text-blue-300">|</span>
                <span>مركز الإشعارات الموحد</span>
              </div>
              <h1 className="text-2xl md:text-3xl font-black tracking-tight text-slate-900 flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shadow-sm shrink-0">
                  <Bell className="w-5 h-5 text-blue-600" />
                </div>
                إرسال الإشعارات المركزية
              </h1>
              <p className="text-slate-500 text-sm max-w-2xl leading-relaxed">
                إرسال إشعارات موجهة وفورية لمستخدمي تطبيق الموبايل ولوحات تحكم المنصة بدقة وسرعة فائقة.
              </p>
            </div>

            <Badge variant="outline" className="w-fit bg-emerald-50 text-emerald-700 border-emerald-300 px-3.5 py-1.5 gap-1.5 text-xs font-bold">
              <ShieldCheck className="w-4 h-4 text-emerald-600" /> نظام الإشعارات v2
            </Badge>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Form (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* 1. Target Audience */}
          <Card className="bg-white border-slate-200/90 shadow-sm rounded-2xl">
            <CardHeader className="pb-3 border-b border-slate-100">
              <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-800">
                <Users className="w-4 h-4 text-blue-600" />
                1. تحديد الفئة المستهدفة
              </CardTitle>
              <CardDescription className="text-slate-500 text-xs">
                اختر شريحة الحسابات التي ستستلم الإشعار
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {TARGET_OPTIONS.map(opt => {
                  const Icon = opt.icon;
                  const isSelected = target === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setTarget(opt.id)}
                      className={`p-3 rounded-xl border text-right transition-all flex flex-col justify-between ${
                        isSelected
                          ? 'bg-blue-50/80 border-blue-500 text-blue-900 shadow-sm ring-1 ring-blue-500/20'
                          : 'bg-slate-50/70 border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full mb-2">
                        <Icon className={`w-4 h-4 ${isSelected ? 'text-blue-600' : 'text-slate-400'}`} />
                        {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />}
                      </div>
                      <div>
                        <div className="font-bold text-xs text-slate-900">{opt.label}</div>
                        <div className="text-[10px] text-slate-500 line-clamp-1">{opt.description}</div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Custom User Search */}
              {target === 'custom' && (
                <div className="mt-4 pt-4 border-t border-slate-100 space-y-3">
                  <Label className="text-xs font-bold text-slate-700">ابحث عن المستخدمين بالاسم أو الهاتف:</Label>
                  <div className="relative">
                    <Search className="w-4 h-4 absolute right-3 top-3 text-slate-400" />
                    <Input
                      value={searchQuery}
                      onChange={e => handleSearch(e.target.value)}
                      placeholder="اكتب اسم اللاعب، رقم الهاتف، أو البريد الإلكتروني..."
                      className="pr-9 bg-white border-slate-200 text-xs text-slate-900 placeholder:text-slate-400"
                    />
                    {searching && (
                      <Loader2 className="w-4 h-4 absolute left-3 top-3 animate-spin text-blue-600" />
                    )}
                  </div>

                  {/* Search Results Dropdown */}
                  {searchResults.length > 0 && (
                    <div className="max-h-48 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg divide-y divide-slate-100">
                      {searchResults.map(u => (
                        <button
                          key={u.id}
                          type="button"
                          onClick={() => selectUser(u)}
                          className="w-full text-right p-2.5 hover:bg-slate-50 flex items-center justify-between text-xs transition-colors"
                        >
                          <div>
                            <div className="font-bold text-slate-900">{u.displayName}</div>
                            <div className="text-[11px] text-slate-500">{u.phone || u.email || 'بدون اتصال'}</div>
                          </div>
                          <Badge variant="outline" className="text-[10px] bg-slate-100 text-slate-600 border-slate-200">
                            {u.accountType}
                          </Badge>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Selected Users Chips */}
                  {selectedUsers.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-2">
                      {selectedUsers.map(u => (
                        <span
                          key={u.id}
                          className="inline-flex items-center gap-1.5 text-xs bg-blue-50 text-blue-800 border border-blue-200 px-2.5 py-1 rounded-full font-medium"
                        >
                          {u.displayName}
                          <button
                            type="button"
                            onClick={() => removeUser(u.id)}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* 2. Quick Templates */}
          <Card className="bg-white border-slate-200/90 shadow-sm rounded-2xl">
            <CardHeader className="pb-3 border-b border-slate-100">
              <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-800">
                <Sparkles className="w-4 h-4 text-amber-500" />
                2. قوالب جاهزة سريعة
              </CardTitle>
              <CardDescription className="text-slate-500 text-xs">
                اضغط على أي قالب لتعبئة النموذج بنقرة واحدة
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="flex flex-wrap gap-2">
                {messageTemplates.map(t => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => applyTemplate(t)}
                    className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200/80 px-3 py-1.5 rounded-lg transition-colors font-medium flex items-center gap-1.5"
                  >
                    <span>{t.title}</span>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* 3. Notification Content */}
          <Card className="bg-white border-slate-200/90 shadow-sm rounded-2xl">
            <CardHeader className="pb-3 border-b border-slate-100">
              <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-800">
                <Bell className="w-4 h-4 text-blue-600" />
                3. محتوى الإشعار
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">عنوان الإشعار:</Label>
                <Input
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="مثال: فرصة تجارب أداء جديدة في نادي..."
                  className="bg-white border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">نص الرسالة:</Label>
                <Textarea
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  placeholder="اكتب تفاصيل الإشعار بوضوح هنا..."
                  rows={4}
                  className="bg-white border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 resize-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700">رابط الإجراء (Deep Link - اختياري):</Label>
                  <Input
                    value={actionUrl}
                    onChange={e => setActionUrl(e.target.value)}
                    placeholder="مثال: /dashboard/player/tournaments"
                    className="bg-white border-slate-200 text-xs text-slate-800 placeholder:text-slate-400 focus:border-blue-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700">درجة الأهمية:</Label>
                  <div className="flex gap-2">
                    {[
                      { id: 'normal', label: 'عادي' },
                      { id: 'high', label: 'مهم' },
                      { id: 'urgent', label: 'عاجل' },
                    ].map(p => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setPriority(p.id as any)}
                        className={`flex-1 py-2 text-xs rounded-xl border transition-all ${
                          priority === p.id
                            ? 'bg-blue-600 text-white border-blue-600 font-bold shadow-sm'
                            : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100">
                <Button
                  onClick={handleSend}
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold py-3 text-sm gap-2 shadow-md shadow-blue-600/20 rounded-xl"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      جاري الإرسال وحفظ الإشعارات...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      إرسال الإشعار الآن
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Live Mobile Preview (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <Card className="bg-white border-slate-200/90 shadow-sm rounded-2xl sticky top-8">
            <CardHeader className="pb-3 border-b border-slate-100">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-800">
                  <Smartphone className="w-4 h-4 text-emerald-600" />
                  معاينة حية لشاشة الموبايل
                </CardTitle>
                <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200 font-bold">
                  مباشر
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              {/* Phone Frame Mockup (Executive Light Frame) */}
              <div className="w-full max-w-[320px] mx-auto bg-slate-100 border-4 border-slate-300 rounded-[2.5rem] p-3.5 shadow-xl relative overflow-hidden">
                {/* Phone Speaker Notch */}
                <div className="w-20 h-3 bg-slate-300 rounded-full mx-auto mb-3" />

                {/* Inner Screen */}
                <div className="bg-slate-50 border border-slate-200 rounded-[1.8rem] p-3 shadow-inner flex flex-col justify-between min-h-[360px]">
                  {/* Status Bar */}
                  <div className="flex items-center justify-between text-[10px] text-slate-500 pb-2.5 mb-2 border-b border-slate-200">
                    <span className="font-bold text-slate-700">تطبيق الحلم</span>
                    <span className="flex items-center gap-1 font-semibold text-emerald-600">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      متصل
                    </span>
                  </div>

                  {/* Notification Item in App */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-3.5 shadow-sm my-auto">
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center shrink-0">
                        <Bell className="w-4 h-4 text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0 text-right">
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <span className="font-bold text-xs text-slate-900 truncate">
                            {title.trim() || 'عنوان الإشعار هنا'}
                          </span>
                          <span className="text-[10px] text-slate-400 shrink-0">الآن</span>
                        </div>
                        <p className="text-[11px] text-slate-600 leading-relaxed line-clamp-3">
                          {message.trim() || 'نص الإشعار سيظهر هنا للاعب في التطبيق...'}
                        </p>
                        {actionUrl && (
                          <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center gap-1 text-[10px] text-blue-600 font-bold">
                            <ExternalLink className="w-3 h-3" />
                            <span>فتح الرابط المرفق</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Simulated App Navigation Footer */}
                  <div className="mt-4 pt-2.5 border-t border-slate-200 flex items-center justify-around text-[10px] text-slate-400">
                    <span className="text-blue-600 font-bold">الإشعارات</span>
                    <span>الرئيسية</span>
                    <span>الملف</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 text-center font-medium">
                يصل الإشعار فوراً لحساب اللاعب ويظهر في شريط الإشعارات وعداد الرسائل غير المقروءة.
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
