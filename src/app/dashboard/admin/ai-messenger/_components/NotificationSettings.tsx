'use client';
import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { db } from '@/lib/firebase/config';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { ChatAmanService, ChatAmanTemplate } from '@/lib/services/chataman-service';
import { toast } from 'sonner';
import {
  Bell, Eye, Video, Heart, MessageCircle, Share2, Mail, UserPlus,
  Save, CheckCircle2, Info, Loader2, RefreshCw, ChevronDown, ChevronUp,
} from 'lucide-react';

// ── Event type definitions ────────────────────────────────────────────────────

type EventType =
  | 'profile_view'
  | 'video_view'
  | 'video_like'
  | 'video_comment'
  | 'video_share'
  | 'message_received'
  | 'follow';

interface EventDef {
  type: EventType;
  label: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  // Fixed params order for all our approved templates
  params: string[];
}

const EVENT_DEFS: EventDef[] = [
  {
    type: 'profile_view',
    label: 'مشاهدة الملف الشخصي',
    description: 'عند زيارة شخص ما لملف مستخدم',
    icon: <Eye className="w-4 h-4" />,
    color: 'text-indigo-500',
    params: ['recipientName', 'actorName'],
  },
  {
    type: 'video_view',
    label: 'مشاهدة فيديو',
    description: 'عند مشاهدة شخص ما لأحد الفيديوهات',
    icon: <Video className="w-4 h-4" />,
    color: 'text-sky-500',
    params: ['recipientName', 'actorName'],
  },
  {
    type: 'video_like',
    label: 'إعجاب بفيديو',
    description: 'عند إعجاب شخص ما بأحد الفيديوهات',
    icon: <Heart className="w-4 h-4" />,
    color: 'text-rose-500',
    params: ['recipientName', 'actorName'],
  },
  {
    type: 'video_comment',
    label: 'تعليق على فيديو',
    description: 'عند تعليق شخص على أحد الفيديوهات',
    icon: <MessageCircle className="w-4 h-4" />,
    color: 'text-amber-500',
    params: ['recipientName', 'actorName'],
  },
  {
    type: 'video_share',
    label: 'مشاركة فيديو',
    description: 'عند مشاركة شخص لأحد الفيديوهات',
    icon: <Share2 className="w-4 h-4" />,
    color: 'text-emerald-500',
    params: ['recipientName', 'actorName'],
  },
  {
    type: 'message_received',
    label: 'رسالة جديدة',
    description: 'عند إرسال رسالة خاصة لمستخدم',
    icon: <Mail className="w-4 h-4" />,
    color: 'text-violet-500',
    params: ['recipientName', 'actorName'],
  },
  {
    type: 'follow',
    label: 'متابعة جديدة',
    description: 'عند متابعة شخص ما لمستخدم آخر',
    icon: <UserPlus className="w-4 h-4" />,
    color: 'text-teal-500',
    params: ['recipientName', 'actorName'],
  },
];

// ── Param label helper ────────────────────────────────────────────────────────

const PARAM_LABELS: Record<string, string> = {
  recipientName: 'اسم المستقبل',
  actorName: 'اسم المُرسِل / الزائر',
  messagePreview: 'معاينة الرسالة',
  commentText: 'نص التعليق',
};

// ── Single event row ──────────────────────────────────────────────────────────

interface EventRowProps {
  def: EventDef;
  templateName: string;
  templates: ChatAmanTemplate[];
  loading: boolean;
  onChange: (val: string) => void;
}

function EventRow({ def, templateName, templates, loading, onChange }: EventRowProps) {
  const [open, setOpen] = useState(false);
  const selected = templates.find(t => t.name === templateName) || null;

  return (
    <div className="border border-slate-100 rounded-2xl overflow-hidden">
      {/* Header row */}
      <div
        className="flex items-center justify-between p-3 cursor-pointer hover:bg-slate-50 transition-colors"
        onClick={() => setOpen(o => !o)}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className={`shrink-0 ${def.color}`}>{def.icon}</div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-slate-800 truncate">{def.label}</p>
            <p className="text-[10px] text-slate-400 truncate">{def.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0 mr-2">
          {templateName ? (
            <Badge className="text-[9px] px-1.5 py-0 bg-emerald-50 text-emerald-700 border-none max-w-[100px] truncate">
              {templateName}
            </Badge>
          ) : (
            <Badge className="text-[9px] px-1.5 py-0 bg-slate-100 text-slate-400 border-none">
              بدون قالب
            </Badge>
          )}
          {open ? <ChevronUp className="w-3.5 h-3.5 text-slate-400" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
        </div>
      </div>

      {/* Expanded config */}
      {open && (
        <div className="border-t border-slate-100 p-3 space-y-3 bg-slate-50/40">

          {/* Template selector */}
          {loading ? (
            <p className="text-[11px] text-slate-400 animate-pulse py-1">جاري تحميل القوالب...</p>
          ) : (
            <Select
              value={templateName || '__none__'}
              onValueChange={val => onChange(val === '__none__' ? '' : val)}
            >
              <SelectTrigger className="h-8 text-xs border-slate-200 bg-white rounded-xl">
                <SelectValue placeholder="اختر قالباً..." />
              </SelectTrigger>
              <SelectContent className="text-xs">
                <SelectItem value="__none__" className="text-slate-400">
                  — بدون قالب (تعطيل WhatsApp لهذا النوع) —
                </SelectItem>
                {templates.map(t => (
                  <SelectItem key={t.name} value={t.name}>
                    <div className="flex items-center gap-3">
                      <span className="truncate max-w-[160px]">{t.name}</span>
                      <Badge
                        variant="outline"
                        className={`text-[9px] px-1 py-0 h-4 shrink-0 ${
                          t.category?.toUpperCase() === 'MARKETING'
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : 'bg-sky-50 text-sky-700 border-sky-200'
                        }`}
                      >
                        {t.category === 'MARKETING' ? 'تسويقي' : t.category === 'UTILITY' ? 'خدمي' : t.category || 'عام'}
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* Template body preview */}
          {selected?.body && (
            <div className="bg-white border border-slate-100 rounded-xl p-2.5 text-[10px] text-slate-600 leading-relaxed whitespace-pre-wrap">
              {selected.body}
            </div>
          )}

          {/* Param mapping info */}
          <div className="flex items-start gap-2 p-2 rounded-xl bg-blue-50 border border-blue-100">
            <Info className="w-3.5 h-3.5 text-blue-400 mt-0.5 shrink-0" />
            <div className="text-[10px] text-blue-700 space-y-0.5">
              {def.params.map((p, i) => (
                <p key={p}><span className="font-mono font-bold">{`{{${i + 1}}}`}</span> = {PARAM_LABELS[p] || p}</p>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

type TemplateMap = Record<EventType, string>;

export const NotificationSettings: React.FC = () => {
  const [templates, setTemplates] = useState<ChatAmanTemplate[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [mapping, setMapping] = useState<TemplateMap>({
    profile_view: '',
    video_view: '',
    video_like: '',
    video_comment: '',
    video_share: '',
    message_received: '',
    follow: '',
  });

  const loadData = async () => {
    setLoadingTemplates(true);
    try {
      const [fetchedTemplates, configSnap] = await Promise.all([
        ChatAmanService.getTemplates(),
        getDoc(doc(db, 'system_configs', 'notification_templates')),
      ]);

      setTemplates(fetchedTemplates);

      if (configSnap.exists()) {
        const data = configSnap.data();
        setMapping(prev => {
          const next = { ...prev };
          for (const key of Object.keys(prev) as EventType[]) {
            if (data[key]?.templateName) {
              next[key] = data[key].templateName;
            }
          }
          return next;
        });
      }
    } catch (err) {
      console.error('Error loading notification settings:', err);
      toast.error('حدث خطأ أثناء تحميل الإعدادات');
    } finally {
      setLoadingTemplates(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      // Build Firestore document — null means "no template (disabled)"
      const firestoreData: Record<string, { templateName: string; params: string[] } | null> = {};
      for (const def of EVENT_DEFS) {
        firestoreData[def.type] = mapping[def.type]
          ? { templateName: mapping[def.type], params: def.params }
          : null;
      }

      await setDoc(doc(db, 'system_configs', 'notification_templates'), firestoreData);

      setSaved(true);
      toast.success('تم حفظ إعدادات القوالب بنجاح');
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error('Error saving notification settings:', err);
      toast.error('حدث خطأ أثناء الحفظ');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4 h-full overflow-y-auto custom-scrollbar p-1" dir="rtl">
      <Card className="border-none shadow-xl bg-white rounded-2xl">
        <CardHeader className="p-4 pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                <Bell className="w-4 h-4 text-emerald-500" />
                قوالب إشعارات WhatsApp
              </CardTitle>
              <CardDescription className="text-[10px] text-slate-400 mt-0.5">
                حدد قالب ChatAman لكل نوع إشعار — اتركه فارغاً لتعطيل WhatsApp لذلك النوع
              </CardDescription>
            </div>
            <button
              onClick={loadData}
              disabled={loadingTemplates}
              className="text-slate-400 hover:text-slate-600 transition-colors"
              title="تحديث القوالب"
            >
              <RefreshCw className={`w-4 h-4 ${loadingTemplates ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </CardHeader>

        <CardContent className="p-4 pt-3 space-y-3">

          {/* Shared note */}
          <div className="flex items-start gap-2 p-2.5 rounded-xl bg-amber-50 border border-amber-100">
            <Info className="w-3.5 h-3.5 text-amber-500 mt-0.5 shrink-0" />
            <p className="text-[10px] text-amber-700 leading-relaxed">
              يمكن استخدام نفس القالب لأكثر من نوع إشعار. جميع القوالب تدعم{' '}
              <span className="font-mono font-bold">{'{{1}}'}</span> = اسم المستقبل و{' '}
              <span className="font-mono font-bold">{'{{2}}'}</span> = اسم المُرسِل/الزائر.
            </p>
          </div>

          {/* Event rows */}
          <div className="space-y-2">
            {EVENT_DEFS.map(def => (
              <EventRow
                key={def.type}
                def={def}
                templateName={mapping[def.type]}
                templates={templates}
                loading={loadingTemplates}
                onChange={val => setMapping(prev => ({ ...prev, [def.type]: val }))}
              />
            ))}
          </div>

          {/* Save button */}
          <div className="flex items-center gap-3 pt-1">
            <Button
              onClick={handleSave}
              disabled={saving}
              className="h-9 px-5 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-1.5 disabled:opacity-60"
            >
              {saving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  جاري الحفظ...
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  حفظ جميع الإعدادات
                </>
              )}
            </Button>

            {saved && (
              <div className="flex items-center gap-1.5 text-emerald-600 text-xs font-semibold animate-in fade-in slide-in-from-left-2">
                <CheckCircle2 className="w-4 h-4" />
                تم الحفظ بنجاح
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
