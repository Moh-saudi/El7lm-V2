'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from 'sonner';
import {
  Loader2, Save, Send, CheckCircle2, XCircle, MessageSquare,
  Key, Globe, Activity, Info, RefreshCw, List, Settings,
  Webhook, TestTube2, Zap, Shield, Copy, Eye, EyeOff,
  ChevronRight, Wifi, WifiOff, LayoutTemplate, ArrowRight
} from 'lucide-react';
import { ChatAmanService, ChatAmanConfig, ChatAmanTemplate } from '@/lib/services/chataman-service';

// ─── Nav items ────────────────────────────────────────────────────────────────
type Section = 'connection' | 'templates' | 'test' | 'webhook';

const NAV_ITEMS: { id: Section; label: string; desc: string; icon: React.ReactNode }[] = [
  {
    id: 'connection',
    label: 'إعدادات الربط',
    desc: 'مفتاح API وحالة الخدمة',
    icon: <Key className="w-4 h-4" />,
  },
  {
    id: 'templates',
    label: 'القوالب والمتغيرات',
    desc: 'كل قوالب الحساب مع متغيراتها',
    icon: <LayoutTemplate className="w-4 h-4" />,
  },
  {
    id: 'test',
    label: 'اختبار الإرسال',
    desc: 'إرسال رسالة تجريبية',
    icon: <TestTube2 className="w-4 h-4" />,
  },
  {
    id: 'webhook',
    label: 'إعداد Webhook',
    desc: 'رابط استقبال الرسائل',
    icon: <Webhook className="w-4 h-4" />,
  },
];

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function ChatAmanSettingsPage() {
  const [activeSection, setActiveSection] = useState<Section>('connection');
  const [pageLoading, setPageLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'ok' | 'fail'>('idle');

  const [config, setConfig] = useState<ChatAmanConfig>({
    apiKey: '',
    baseUrl: 'https://chataman.com',
    isActive: true,
    senderName: 'El7lm',
    defaultCountryCode: '20',
  });

  // Test send
  const [testPhone, setTestPhone] = useState('');
  const [testMessage, setTestMessage] = useState('تجربة إرسال رسالة من منصة الحلم');
  const [testMode, setTestMode] = useState<'text' | 'template'>('text');

  // Templates
  const [templates, setTemplates] = useState<ChatAmanTemplate[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [templateParams, setTemplateParams] = useState<string[]>([]);
  const [templateFilter, setTemplateFilter] = useState('');

  // video_notfiation quick test
  const [vtPhone, setVtPhone] = useState('');
  const [vtPlayerName, setVtPlayerName] = useState('');
  const [vtViewerName, setVtViewerName] = useState('');
  const [vtTesting, setVtTesting] = useState(false);
  const [vtResult, setVtResult] = useState<'idle' | 'ok' | 'fail'>('idle');

  // Webhook
  const [webhookUrl, setWebhookUrl] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setWebhookUrl(`${window.location.origin}/api/chataman/webhook`);
    }
    loadConfig();
  }, []);

  useEffect(() => {
    if (activeSection === 'templates' && templates.length === 0 && !loadingTemplates) {
      fetchTemplates();
    }
    if (activeSection === 'test' && testMode === 'template' && templates.length === 0 && !loadingTemplates) {
      fetchTemplates();
    }
  }, [activeSection]);

  const loadConfig = async () => {
    setPageLoading(true);
    const data = await ChatAmanService.getConfig();
    if (data) setConfig(data);
    setPageLoading(false);
  };

  const fetchTemplates = async () => {
    if (!config.apiKey) { toast.error('يرجى إدخال مفتاح API أولاً'); return; }
    setLoadingTemplates(true);
    const fetched = await ChatAmanService.getTemplates(config.apiKey);
    setTemplates(fetched);
    setLoadingTemplates(false);
  };

  const handleSave = async () => {
    setIsSaving(true);
    const ok = await ChatAmanService.saveConfig(config);
    if (ok) toast.success('تم حفظ الإعدادات بنجاح');
    else toast.error('فشل في حفظ الإعدادات');
    setIsSaving(false);
  };

  const handleVerify = async () => {
    if (!config.apiKey) { toast.error('أدخل مفتاح API أولاً'); return; }
    setIsVerifying(true);
    setConnectionStatus('idle');
    const ok = await ChatAmanService.verifyConnection(config.apiKey);
    setConnectionStatus(ok ? 'ok' : 'fail');
    if (ok) toast.success('الاتصال ناجح — المفتاح صالح');
    else toast.error('فشل الاتصال — تحقق من المفتاح');
    setIsVerifying(false);
  };

  const handleVideoNotificationTest = async () => {
    if (!vtPhone) { toast.error('أدخل رقم الهاتف'); return; }
    setVtTesting(true);
    setVtResult('idle');
    try {
      const res = await fetch('/api/chataman/test-video-notification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: vtPhone,
          playerName: vtPlayerName || 'اللاعب',
          viewerName: vtViewerName || 'زائر',
          apiKey: config.apiKey,
          baseUrl: config.baseUrl || 'https://chataman.com',
        }),
      });
      const data = await res.json();
      if (data.success) {
        setVtResult('ok');
        toast.success(`تم الإرسال إلى ${data.phone}`);
      } else {
        setVtResult('fail');
        toast.error(`فشل: ${JSON.stringify(data.error?.message || data.error || 'خطأ غير معروف')}`);
      }
    } catch (e: any) {
      setVtResult('fail');
      toast.error(e.message);
    } finally {
      setVtTesting(false);
    }
  };

  const handleTestSend = async () => {
    if (!testPhone) { toast.error('أدخل رقم الهاتف'); return; }
    setIsTesting(true);
    let result;
    if (testMode === 'text') {
      result = await ChatAmanService.sendMessage(testPhone, testMessage);
    } else {
      if (!selectedTemplateId) { toast.error('اختر قالباً'); setIsTesting(false); return; }
      const tpl = templates.find(t => t.uuid === selectedTemplateId);
      result = await ChatAmanService.sendTemplate(testPhone, selectedTemplateId, {
        language: tpl?.language || 'ar',
        bodyParams: templateParams,
      });
    }
    if (result.success) toast.success('تم الإرسال بنجاح');
    else toast.error(`فشل الإرسال: ${result.error || 'خطأ غير معروف'}`);
    setIsTesting(false);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('تم النسخ');
  };

  const filteredTemplates = templates.filter(t =>
    !templateFilter || t.name?.toLowerCase().includes(templateFilter.toLowerCase())
  );

  if (pageLoading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-lg">
            <MessageSquare className="w-6 h-6 text-white" />
          </div>
          <Loader2 className="w-5 h-5 animate-spin text-emerald-500" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/40 p-4 md:p-6 flex flex-col gap-5" dir="rtl">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="bg-white/90 backdrop-blur border border-white/30 shadow-sm rounded-2xl p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-md shrink-0">
            <MessageSquare className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-black text-slate-800 flex items-center gap-2">
              بوابة الرسائل
              <span className="bg-gradient-to-r from-emerald-500 to-teal-400 bg-clip-text text-transparent">ChatAman</span>
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">إدارة الربط مع مزود خدمة WhatsApp — الإعدادات والقوالب والاختبار</p>
          </div>
        </div>
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold border ${
          config.isActive
            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
            : 'bg-slate-100 text-slate-500 border-slate-200'
        }`}>
          {config.isActive
            ? <><Wifi className="w-3.5 h-3.5" /> الخدمة نشطة</>
            : <><WifiOff className="w-3.5 h-3.5" /> الخدمة متوقفة</>}
        </div>
      </div>

      {/* ── Layout: sidebar + content ─────────────────────────────────── */}
      <div className="flex gap-5 flex-1">

        {/* Sidebar */}
        <div className="w-56 shrink-0 space-y-1.5">
          {NAV_ITEMS.map(item => {
            const active = activeSection === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id)}
                className={`w-full flex items-center gap-3 p-3 rounded-xl text-right transition-all duration-150 group ${
                  active
                    ? 'bg-gradient-to-l from-emerald-500 to-teal-500 text-white shadow-md shadow-emerald-500/20'
                    : 'bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-800 border border-slate-100'
                }`}
              >
                <div className={`shrink-0 ${active ? 'text-white' : 'text-slate-400 group-hover:text-emerald-500'}`}>
                  {item.icon}
                </div>
                <div className="min-w-0 flex-1">
                  <p className={`text-xs font-bold truncate ${active ? 'text-white' : 'text-slate-700'}`}>{item.label}</p>
                  <p className={`text-[10px] truncate mt-0.5 ${active ? 'text-emerald-100' : 'text-slate-400'}`}>{item.desc}</p>
                </div>
                {active && <ChevronRight className="w-3.5 h-3.5 text-white/70 shrink-0 rotate-180" />}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">

          {/* ══ إعدادات الربط ══════════════════════════════════════════════ */}
          {activeSection === 'connection' && (
            <div className="space-y-4">
              {/* Status toggle card */}
              <Card className="border-none shadow-sm rounded-2xl">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-slate-800">تفعيل الخدمة</p>
                      <p className="text-xs text-slate-400 mt-0.5">تشغيل أو إيقاف إرسال الرسائل عبر النظام</p>
                    </div>
                    <Switch
                      checked={config.isActive}
                      onCheckedChange={v => setConfig(p => ({ ...p, isActive: v }))}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* API Key */}
              <Card className="border-none shadow-sm rounded-2xl">
                <CardHeader className="p-4 pb-3">
                  <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
                    <Key className="w-4 h-4 text-emerald-500" />
                    بيانات الاتصال API
                  </CardTitle>
                  <CardDescription className="text-[11px] text-slate-400">مفتاح الربط الخاص بحسابك على ChatAman</CardDescription>
                </CardHeader>
                <CardContent className="p-4 pt-0 space-y-4">

                  {/* API Key field */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-600">API Key</Label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Input
                          type={showApiKey ? 'text' : 'password'}
                          value={config.apiKey}
                          onChange={e => setConfig(p => ({ ...p, apiKey: e.target.value }))}
                          placeholder="أدخل مفتاح الـ API الخاص بك"
                          className="pr-3 pl-9 font-mono text-sm h-9 border-slate-200 rounded-xl"
                          dir="ltr"
                        />
                        <button
                          type="button"
                          onClick={() => setShowApiKey(v => !v)}
                          className="absolute left-2.5 top-2 text-slate-400 hover:text-slate-600"
                        >
                          {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleVerify}
                        disabled={isVerifying}
                        className={`h-9 px-4 rounded-xl text-xs font-semibold border ${
                          connectionStatus === 'ok'
                            ? 'border-emerald-300 text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
                            : connectionStatus === 'fail'
                            ? 'border-red-300 text-red-600 bg-red-50 hover:bg-red-100'
                            : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {isVerifying ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : connectionStatus === 'ok' ? (
                          <><CheckCircle2 className="w-3.5 h-3.5 ml-1" /> متصل</>
                        ) : connectionStatus === 'fail' ? (
                          <><XCircle className="w-3.5 h-3.5 ml-1" /> فشل</>
                        ) : (
                          <><Shield className="w-3.5 h-3.5 ml-1" /> اختبار الاتصال</>
                        )}
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {/* Base URL */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-slate-600 flex items-center gap-1">
                        <Globe className="w-3 h-3" /> Base URL
                      </Label>
                      <Input
                        value={config.baseUrl}
                        onChange={e => setConfig(p => ({ ...p, baseUrl: e.target.value }))}
                        placeholder="https://chataman.com"
                        className="h-9 text-sm border-slate-200 rounded-xl font-mono"
                        dir="ltr"
                      />
                    </div>

                    {/* Sender Name */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-slate-600">اسم المرسل</Label>
                      <Input
                        value={config.senderName}
                        onChange={e => setConfig(p => ({ ...p, senderName: e.target.value }))}
                        placeholder="El7lm"
                        className="h-9 text-sm border-slate-200 rounded-xl"
                      />
                    </div>
                  </div>

                  <Separator />

                  <div className="flex justify-end">
                    <Button
                      onClick={handleSave}
                      disabled={isSaving}
                      className="h-9 px-6 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-500/20"
                    >
                      {isSaving
                        ? <><Loader2 className="w-3.5 h-3.5 animate-spin ml-1.5" />جاري الحفظ...</>
                        : <><Save className="w-3.5 h-3.5 ml-1.5" />حفظ الإعدادات</>}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Quick nav to templates */}
              <button
                onClick={() => setActiveSection('templates')}
                className="w-full flex items-center justify-between p-3.5 bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:border-emerald-200 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center">
                    <LayoutTemplate className="w-4 h-4 text-emerald-500" />
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-slate-700">عرض القوالب والمتغيرات</p>
                    <p className="text-[10px] text-slate-400">جلب كل قوالب الحساب من ChatAman</p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-emerald-500 rotate-180 transition-colors" />
              </button>
            </div>
          )}

          {/* ══ القوالب والمتغيرات ════════════════════════════════════════ */}
          {activeSection === 'templates' && (
            <Card className="border-none shadow-sm rounded-2xl h-full">
              <CardHeader className="p-4 pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
                      <LayoutTemplate className="w-4 h-4 text-emerald-500" />
                      القوالب والمتغيرات
                    </CardTitle>
                    <CardDescription className="text-[11px] text-slate-400 mt-0.5">
                      القوالب المعتمدة في حساب ChatAman — تُستخدم لربط الإشعارات والحملات
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    {templates.length > 0 && (
                      <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200 px-2">
                        {templates.length} قالب
                      </Badge>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={fetchTemplates}
                      disabled={loadingTemplates}
                      className="h-8 px-3 text-xs rounded-xl border-slate-200"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ml-1.5 ${loadingTemplates ? 'animate-spin' : ''}`} />
                      تحديث
                    </Button>
                  </div>
                </div>

                {/* Search */}
                {templates.length > 0 && (
                  <div className="mt-3">
                    <Input
                      value={templateFilter}
                      onChange={e => setTemplateFilter(e.target.value)}
                      placeholder="بحث في القوالب..."
                      className="h-8 text-xs border-slate-200 rounded-xl"
                    />
                  </div>
                )}
              </CardHeader>

              <CardContent className="p-4 pt-0">
                {loadingTemplates ? (
                  <div className="flex flex-col items-center justify-center py-16 gap-3">
                    <Loader2 className="w-7 h-7 animate-spin text-emerald-400" />
                    <p className="text-xs text-slate-400">جاري جلب القوالب من ChatAman...</p>
                  </div>
                ) : templates.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
                    <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center">
                      <LayoutTemplate className="w-7 h-7 text-slate-300" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-500">لا توجد قوالب</p>
                      <p className="text-xs text-slate-400 mt-1">تأكد من صحة مفتاح API ثم اضغط تحديث</p>
                    </div>
                    <Button
                      onClick={fetchTemplates}
                      className="h-8 px-4 text-xs bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl"
                    >
                      جلب القوالب
                    </Button>
                  </div>
                ) : (
                  <div className="rounded-xl border border-slate-100 overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-slate-50/80">
                          <TableHead className="text-right text-[11px] font-bold text-slate-500 w-[180px]">اسم القالب</TableHead>
                          <TableHead className="text-right text-[11px] font-bold text-slate-500 w-[90px]">النوع</TableHead>
                          <TableHead className="text-right text-[11px] font-bold text-slate-500 w-[70px]">اللغة</TableHead>
                          <TableHead className="text-right text-[11px] font-bold text-slate-500 w-[90px]">الحالة</TableHead>
                          <TableHead className="text-right text-[11px] font-bold text-slate-500">نص القالب</TableHead>
                          <TableHead className="text-right text-[11px] font-bold text-slate-500 w-[140px]">المتغيرات</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredTemplates.map((t) => {
                          const varMatches = t.body?.match(/\{\{(\d+)\}\}/g) || [];
                          const varCount = varMatches.length > 0
                            ? Math.max(...varMatches.map(m => parseInt(m.replace(/\D/g, ''), 10)))
                            : 0;
                          const highlightedBody = t.body?.replace(
                            /\{\{(\d+)\}\}/g,
                            '<mark class="bg-amber-100 text-amber-700 font-mono rounded px-0.5 text-[10px]">$&</mark>'
                          ) || '';

                          return (
                            <TableRow key={t.uuid || t.name} className="align-top hover:bg-slate-50/60">
                              <TableCell className="py-3">
                                <p className="font-mono text-xs font-bold text-slate-800 break-all">{t.name}</p>
                              </TableCell>
                              <TableCell className="py-3">
                                <Badge variant="outline" className={`text-[9px] px-1.5 py-0 h-5 ${
                                  t.category?.toUpperCase() === 'MARKETING'
                                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                                    : t.category?.toUpperCase() === 'UTILITY'
                                    ? 'bg-sky-50 text-sky-700 border-sky-200'
                                    : 'bg-slate-50 text-slate-500 border-slate-200'
                                }`}>
                                  {t.category === 'MARKETING' ? 'تسويقي' : t.category === 'UTILITY' ? 'خدمي' : t.category || 'عام'}
                                </Badge>
                              </TableCell>
                              <TableCell className="py-3 font-mono text-[10px] text-slate-500">{t.language || '—'}</TableCell>
                              <TableCell className="py-3">
                                <Badge variant="outline" className={`text-[9px] px-1.5 py-0 h-5 ${
                                  t.status?.toUpperCase() === 'APPROVED'
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                    : t.status?.toUpperCase() === 'PENDING'
                                    ? 'bg-yellow-50 text-yellow-700 border-yellow-200'
                                    : 'bg-red-50 text-red-600 border-red-200'
                                }`}>
                                  {t.status?.toUpperCase() === 'APPROVED' ? 'معتمد' : t.status?.toUpperCase() === 'PENDING' ? 'قيد المراجعة' : t.status || '—'}
                                </Badge>
                              </TableCell>
                              <TableCell className="py-3 max-w-xs">
                                {t.body ? (
                                  <p
                                    className="text-[11px] text-slate-600 leading-relaxed whitespace-pre-wrap"
                                    dangerouslySetInnerHTML={{ __html: highlightedBody }}
                                  />
                                ) : (
                                  <span className="text-[11px] text-slate-300">—</span>
                                )}
                              </TableCell>
                              <TableCell className="py-3">
                                {varCount > 0 ? (
                                  <div className="space-y-1">
                                    {Array.from({ length: varCount }).map((_, i) => (
                                      <div key={i} className="flex items-center gap-1.5">
                                        <span className="font-mono text-[9px] bg-amber-100 text-amber-700 rounded px-1 py-0.5 shrink-0">
                                          {`{{${i + 1}}}`}
                                        </span>
                                        <span className="text-[9px] text-slate-400">متغير {i + 1}</span>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <span className="text-[10px] text-slate-300 italic">بلا متغيرات</span>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* ══ اختبار الإرسال ══════════════════════════════════════════════ */}
          {activeSection === 'test' && (
            <div className="space-y-4">
            <Card className="border-none shadow-sm rounded-2xl">
              <CardHeader className="p-4 pb-3">
                <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <TestTube2 className="w-4 h-4 text-emerald-500" />
                  اختبار الإرسال
                </CardTitle>
                <CardDescription className="text-[11px] text-slate-400">إرسال رسالة حقيقية لاختبار الربط مع ChatAman</CardDescription>
              </CardHeader>
              <CardContent className="p-4 pt-0 space-y-4">

                {/* Phone */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-600">رقم الهاتف (مع كود الدولة)</Label>
                  <Input
                    value={testPhone}
                    onChange={e => setTestPhone(e.target.value)}
                    placeholder="مثال: 201000000000"
                    className="h-9 text-sm border-slate-200 rounded-xl font-mono"
                    dir="ltr"
                  />
                </div>

                {/* Mode toggle */}
                <div className="flex gap-1 p-1 bg-slate-100 rounded-xl w-fit">
                  {(['text', 'template'] as const).map(m => (
                    <button
                      key={m}
                      onClick={() => {
                        setTestMode(m);
                        if (m === 'template' && templates.length === 0) fetchTemplates();
                      }}
                      className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                        testMode === m
                          ? 'bg-white shadow text-emerald-700 border border-slate-200'
                          : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      {m === 'text' ? 'رسالة نصية' : 'قالب WhatsApp'}
                    </button>
                  ))}
                </div>

                {testMode === 'text' ? (
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-600">نص الرسالة</Label>
                    <Input
                      value={testMessage}
                      onChange={e => setTestMessage(e.target.value)}
                      className="h-9 text-sm border-slate-200 rounded-xl"
                    />
                    <div className="flex items-start gap-2 p-2.5 rounded-xl bg-amber-50 border border-amber-100">
                      <Info className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                      <p className="text-[10px] text-amber-700">الرسائل النصية تشترط أن يبدأ العميل المحادثة خلال آخر 24 ساعة</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-slate-600">اختر القالب</Label>
                      <div className="flex gap-2">
                        <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                          <SelectTrigger className="h-9 text-xs border-slate-200 rounded-xl flex-1" dir="rtl">
                            <SelectValue placeholder={loadingTemplates ? 'جاري التحميل...' : 'اختر قالباً...'} />
                          </SelectTrigger>
                          <SelectContent>
                            {templates.length === 0 && !loadingTemplates && (
                              <div className="p-3 text-center text-xs text-slate-400">لا توجد قوالب</div>
                            )}
                            {templates.map(t => (
                              <SelectItem key={t.uuid || t.name} value={t.uuid || t.name}>
                                <div className="flex items-center gap-2">
                                  <span className="font-mono text-xs">{t.name}</span>
                                  <Badge variant="outline" className="text-[9px] px-1 py-0 h-4">{t.category}</Badge>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={fetchTemplates}
                          disabled={loadingTemplates}
                          className="h-9 w-9 p-0 rounded-xl border-slate-200"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${loadingTemplates ? 'animate-spin' : ''}`} />
                        </Button>
                      </div>
                    </div>

                    {selectedTemplateId && (() => {
                      const tpl = templates.find(t => (t.uuid || t.name) === selectedTemplateId);
                      if (!tpl) return null;
                      const varMatches = tpl.body?.match(/\{\{(\d+)\}\}/g) || [];
                      const varCount = varMatches.length > 0 ? Math.max(...varMatches.map(m => parseInt(m.replace(/\D/g, ''), 10))) : 0;
                      return (
                        <div className="space-y-3">
                          {tpl.body && (
                            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                              <p className="text-[10px] text-slate-400 mb-1">معاينة القالب</p>
                              <p className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">{tpl.body}</p>
                            </div>
                          )}
                          {varCount > 0 && (
                            <div className="space-y-2 p-3 rounded-xl border border-slate-100 bg-slate-50/50">
                              <p className="text-[10px] font-bold text-slate-500">متغيرات القالب</p>
                              {Array.from({ length: varCount }).map((_, i) => (
                                <div key={i} className="flex items-center gap-2">
                                  <span className="text-[10px] font-mono bg-amber-100 text-amber-700 rounded px-1.5 py-0.5 shrink-0 w-10 text-center">
                                    {`{{${i + 1}}}`}
                                  </span>
                                  <Input
                                    placeholder={`قيمة المتغير ${i + 1}`}
                                    value={templateParams[i] || ''}
                                    onChange={e => {
                                      const p = [...templateParams];
                                      p[i] = e.target.value;
                                      setTemplateParams(p);
                                    }}
                                    className="h-8 text-xs border-slate-200 rounded-xl"
                                  />
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                )}

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="flex items-start gap-2 p-2.5 rounded-xl bg-blue-50 border border-blue-100 flex-1 ml-4">
                    <MessageSquare className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
                    <p className="text-[10px] text-blue-700">ستُرسَل هذه الرسالة فعلياً وقد يُخصم رصيد من حساب ChatAman</p>
                  </div>
                  <Button
                    onClick={handleTestSend}
                    disabled={isTesting || !config.isActive}
                    className="h-9 px-5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-bold text-xs rounded-xl shadow-md shrink-0"
                  >
                    {isTesting
                      ? <><Loader2 className="w-3.5 h-3.5 animate-spin ml-1.5" />جاري الإرسال...</>
                      : <><Send className="w-3.5 h-3.5 ml-1.5" />إرسال تجريبي</>}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* ── video_notfiation quick test ── */}
            <Card className="border-none shadow-sm rounded-2xl border-l-4 border-l-emerald-400">
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <span className="text-base">🎬</span>
                  اختبار قالب مشاهدة الفيديو
                  <Badge variant="outline" className="text-[9px] px-1.5 py-0 bg-emerald-50 text-emerald-700 border-emerald-200 font-mono">
                    video_notfiation
                  </Badge>
                </CardTitle>
                <CardDescription className="text-[11px] text-slate-400">
                  اختبار مباشر لإرسال إشعار مشاهدة الفيديو — نفس القالب المُستخدم تلقائياً في سينما اللاعبين
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 pt-2 space-y-3">
                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <Label className="text-[10px] font-semibold text-slate-500">هاتف المستقبل (اللاعب)</Label>
                    <Input
                      value={vtPhone}
                      onChange={e => setVtPhone(e.target.value)}
                      placeholder="201XXXXXXXXX"
                      className="h-8 text-xs border-slate-200 rounded-xl font-mono"
                      dir="ltr"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] font-semibold text-slate-500">اسم اللاعب {'{{1}}'}</Label>
                    <Input
                      value={vtPlayerName}
                      onChange={e => setVtPlayerName(e.target.value)}
                      placeholder="أحمد محمد"
                      className="h-8 text-xs border-slate-200 rounded-xl"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] font-semibold text-slate-500">اسم الزائر {'{{2}}'}</Label>
                    <Input
                      value={vtViewerName}
                      onChange={e => setVtViewerName(e.target.value)}
                      placeholder="نادي الأهلي"
                      className="h-8 text-xs border-slate-200 rounded-xl"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Button
                    onClick={handleVideoNotificationTest}
                    disabled={vtTesting || !config.isActive}
                    className="h-8 px-4 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-bold text-xs rounded-xl shadow-sm"
                  >
                    {vtTesting
                      ? <><Loader2 className="w-3 h-3 animate-spin ml-1" />جاري الإرسال...</>
                      : <><Send className="w-3 h-3 ml-1" />إرسال video_notfiation</>}
                  </Button>
                  {vtResult === 'ok' && (
                    <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> تم الإرسال بنجاح
                    </span>
                  )}
                  {vtResult === 'fail' && (
                    <span className="text-xs font-bold text-red-500 flex items-center gap-1">
                      <XCircle className="w-3.5 h-3.5" /> فشل الإرسال
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
            </div>
          )}

          {/* ══ Webhook ══════════════════════════════════════════════════════ */}
          {activeSection === 'webhook' && (
            <Card className="border-none shadow-sm rounded-2xl">
              <CardHeader className="p-4 pb-3">
                <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <Webhook className="w-4 h-4 text-emerald-500" />
                  إعداد Webhook
                </CardTitle>
                <CardDescription className="text-[11px] text-slate-400">
                  الصق هذا الرابط في إعدادات ChatAman لاستقبال الرسائل والتحديثات تلقائياً
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 pt-0 space-y-5">

                {/* Warning */}
                <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-50 border border-amber-100">
                  <Info className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-700 leading-relaxed">
                    لكي يعمل استقبال الرسائل الواردة من WhatsApp، يجب إضافة الرابط أدناه في خانة{' '}
                    <span className="font-mono font-bold">Notification URL</span> في لوحة تحكم ChatAman.
                  </p>
                </div>

                {/* Webhook URL */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-600">Webhook URL</Label>
                  <div className="flex gap-2">
                    <Input
                      value={webhookUrl}
                      readOnly
                      className="h-9 text-xs font-mono bg-slate-50 border-slate-200 rounded-xl flex-1"
                      dir="ltr"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(webhookUrl)}
                      className="h-9 px-3 rounded-xl border-slate-200 text-xs"
                    >
                      <Copy className="w-3.5 h-3.5 ml-1.5" />
                      نسخ
                    </Button>
                  </div>
                </div>

                <Separator />

                {/* Required events */}
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-slate-600">الأحداث المطلوب تفعيلها في ChatAman</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {['message.received', 'message.status.update', 'message.sent'].map(ev => (
                      <div key={ev} className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-50 border border-emerald-100">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        <span className="text-[10px] font-mono text-emerald-800 font-semibold">{ev}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Steps */}
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-slate-600">خطوات الإعداد</Label>
                  <div className="space-y-1.5">
                    {[
                      'ادخل إلى لوحة تحكم ChatAman',
                      'انتقل إلى الإعدادات ← Webhooks',
                      'الصق رابط Webhook أعلاه في خانة Notification URL',
                      'فعّل الأحداث الثلاثة المذكورة أعلاه',
                      'احفظ الإعدادات وجرّب إرسال رسالة',
                    ].map((step, i) => (
                      <div key={i} className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                        <span className="w-5 h-5 rounded-lg bg-emerald-100 text-emerald-700 text-[10px] font-black flex items-center justify-center shrink-0">
                          {i + 1}
                        </span>
                        <p className="text-xs text-slate-600">{step}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

        </div>
      </div>
    </div>
  );
}
