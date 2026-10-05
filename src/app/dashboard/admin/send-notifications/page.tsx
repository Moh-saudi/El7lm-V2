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
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8" dir="rtl">
      {/* Header */}
      <div className="max-w-6xl mx-auto mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                <Bell className="w-5 h-5" />
              </span>
              <h1 className="text-2xl font-bold tracking-tight">مركز إرسال الإشعارات</h1>
            </div>
            <p className="text-slate-400 text-sm">
              إرسال إشعارات موحدة ومباشرة إلى تطبيق الموبايل ومنصة الويب بأعلى سرعة وموثوقية
            </p>
          </div>
          <Badge variant="outline" className="w-fit bg-emerald-500/10 text-emerald-400 border-emerald-500/20 px-3 py-1.5 gap-1.5">
            <ShieldCheck className="w-4 h-4" /> نظام الإشعارات الموحد v2
          </Badge>
        </div>
      </div>

      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Form (8 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Target Audience */}
          <Card className="bg-slate-900/60 border-slate-800 backdrop-blur">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2 text-slate-200">
                <Users className="w-4 h-4 text-blue-400" />
                1. تحديد الفئة المستهدفة
              </CardTitle>
              <CardDescription className="text-slate-400 text-xs">
                اختر شريحة المستخدمين الذين سيصلهم الإشعار
              </CardDescription>
            </CardHeader>
            <CardContent>
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
                          ? 'bg-blue-600/15 border-blue-500/50 text-blue-200 shadow-sm'
                          : 'bg-slate-800/40 border-slate-800 text-slate-400 hover:bg-slate-800/70 hover:text-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full mb-2">
                        <Icon className={`w-4 h-4 ${isSelected ? 'text-blue-400' : 'text-slate-500'}`} />
                        {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" />}
                      </div>
                      <div>
                        <div className="font-semibold text-xs text-slate-200">{opt.label}</div>
                        <div className="text-[10px] text-slate-500 line-clamp-1">{opt.description}</div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Custom User Search */}
              {target === 'custom' && (
                <div className="mt-4 pt-4 border-t border-slate-800 space-y-3">
                  <Label className="text-xs text-slate-300">ابحث عن المستخدمين بالاسم أو الهاتف:</Label>
                  <div className="relative">
                    <Search className="w-4 h-4 absolute right-3 top-3 text-slate-500" />
                    <Input
                      value={searchQuery}
                      onChange={e => handleSearch(e.target.value)}
                      placeholder="اكتب اسم اللاعب، رقم الهاتف، أو البريد الإلكتروني..."
                      className="pr-9 bg-slate-950/60 border-slate-800 text-xs text-slate-200 placeholder:text-slate-600"
                    />
                    {searching && (
                      <Loader2 className="w-4 h-4 absolute left-3 top-3 animate-spin text-blue-400" />
                    )}
                  </div>

                  {/* Search Results Dropdown */}
                  {searchResults.length > 0 && (
                    <div className="max-h-48 overflow-y-auto rounded-lg border border-slate-800 bg-slate-900 divide-y divide-slate-800/60">
                      {searchResults.map(u => (
                        <button
                          key={u.id}
                          type="button"
                          onClick={() => selectUser(u)}
                          className="w-full text-right p-2.5 hover:bg-slate-800/60 flex items-center justify-between text-xs"
                        >
                          <div>
                            <div className="font-medium text-slate-200">{u.displayName}</div>
                            <div className="text-[11px] text-slate-500">{u.phone || u.email || 'بدون اتصال'}</div>
                          </div>
                          <Badge variant="outline" className="text-[10px] bg-slate-800 text-slate-400 border-slate-700">
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
                          className="inline-flex items-center gap-1.5 text-xs bg-blue-500/10 text-blue-300 border border-blue-500/20 px-2.5 py-1 rounded-full"
                        >
                          {u.displayName}
                          <button
                            type="button"
                            onClick={() => removeUser(u.id)}
                            className="text-blue-400 hover:text-blue-200"
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

          {/* Quick Templates */}
          <Card className="bg-slate-900/60 border-slate-800 backdrop-blur">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2 text-slate-200">
                <Sparkles className="w-4 h-4 text-amber-400" />
                2. قوالب جاهزة سريعة
              </CardTitle>
              <CardDescription className="text-slate-400 text-xs">
                اضغط على أي قالب لتعبئة محتوى الإشعار مباشرة
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {messageTemplates.map(t => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => applyTemplate(t)}
                    className="text-xs bg-slate-800/60 hover:bg-slate-800 text-slate-300 border border-slate-700/60 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5"
                  >
                    <span>{t.title}</span>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Notification Content */}
          <Card className="bg-slate-900/60 border-slate-800 backdrop-blur">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2 text-slate-200">
                <Bell className="w-4 h-4 text-blue-400" />
                3. محتوى الإشعار
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-300">عنوان الإشعار:</Label>
                <Input
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="مثال: فرصة تجارب أداء جديدة في نادي..."
                  className="bg-slate-950/60 border-slate-800 text-sm text-slate-100 placeholder:text-slate-600"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-slate-300">نص الرسالة:</Label>
                <Textarea
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  placeholder="اكتب تفاصيل الإشعار بوضوح هنا..."
                  rows={4}
                  className="bg-slate-950/60 border-slate-800 text-sm text-slate-100 placeholder:text-slate-600 resize-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs text-slate-300">رابط الإجراء (Deep Link - اختياري):</Label>
                  <Input
                    value={actionUrl}
                    onChange={e => setActionUrl(e.target.value)}
                    placeholder="مثال: /dashboard/player/tournaments"
                    className="bg-slate-950/60 border-slate-800 text-xs text-slate-300 placeholder:text-slate-600"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs text-slate-300">درجة الأهمية:</Label>
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
                        className={`flex-1 py-2 text-xs rounded-lg border transition-all ${
                          priority === p.id
                            ? 'bg-blue-600 text-white border-blue-500 font-semibold'
                            : 'bg-slate-800/40 text-slate-400 border-slate-800 hover:bg-slate-800'
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800">
                <Button
                  onClick={handleSend}
                  disabled={loading}
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2.5 text-sm gap-2"
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
          <Card className="bg-slate-900/60 border-slate-800 sticky top-8">
            <CardHeader className="pb-3 border-b border-slate-800/60">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold flex items-center gap-2 text-slate-300">
                  <Smartphone className="w-4 h-4 text-emerald-400" />
                  معاينة حية لشاشة الموبايل
                </CardTitle>
                <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                  مباشر
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              {/* Phone Frame Mockup */}
              <div className="w-full max-w-[320px] mx-auto bg-slate-950 border-4 border-slate-800 rounded-3xl p-4 shadow-2xl relative overflow-hidden">
                {/* Phone Speaker Notch */}
                <div className="w-20 h-3 bg-slate-800 rounded-full mx-auto mb-4" />

                {/* Notification Item in App */}
                <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3.5 shadow-md">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center shrink-0">
                      <Bell className="w-4 h-4 text-blue-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="font-semibold text-xs text-slate-100 truncate">
                          {title.trim() || 'عنوان الإشعار هنا'}
                        </span>
                        <span className="text-[10px] text-slate-500 shrink-0">الآن</span>
                      </div>
                      <p className="text-[11px] text-slate-400 leading-relaxed line-clamp-3">
                        {message.trim() || 'نص الإشعار سيظهر هنا للاعب في التطبيق...'}
                      </p>
                      {actionUrl && (
                        <div className="mt-2.5 pt-2 border-t border-slate-800/60 flex items-center gap-1 text-[10px] text-blue-400 font-medium">
                          <ExternalLink className="w-3 h-3" />
                          <span>فتح الرابط المرفق</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Status bar & simulated phone content */}
                <div className="mt-6 pt-4 border-t border-slate-800/50 flex items-center justify-between text-[10px] text-slate-600">
                  <span>منصة الحلم الرياضية</span>
                  <span className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    متصل
                  </span>
                </div>
              </div>

              <div className="mt-4 p-3 rounded-xl bg-slate-800/30 border border-slate-800/60 text-xs text-slate-400 text-center">
                يصل الإشعار فوراً لحساب اللاعب ويظهر في شريط الإشعارات وعداد الرسائل غير المقروءة.
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
