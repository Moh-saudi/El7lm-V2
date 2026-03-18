import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Send, CheckCircle2, Globe, Search, ListFilter } from 'lucide-react';
import { ChatAmanService, ChatAmanTemplate } from '@/lib/services/chataman-service';
import { toast } from 'sonner';

interface ChatAmanModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetPhone?: string;
  targetName?: string;
  conversationId?: string;
}

export const ChatAmanModal: React.FC<ChatAmanModalProps> = ({
  open,
  onOpenChange,
  targetPhone = '',
  targetName = '',
  conversationId
}) => {
  const [templates, setTemplates] = useState<ChatAmanTemplate[]>([]);
  const [filteredTemplates, setFilteredTemplates] = useState<ChatAmanTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<ChatAmanTemplate | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  
  // States match page.tsx
  const [manualPhone, setManualPhone] = useState<string>('');
  const [templateVariables, setTemplateVariables] = useState<string[]>([]);
  const [headerUrl, setHeaderUrl] = useState<string>('');
  const [messageType, setMessageType] = useState<'template' | 'custom'>('template');
  const [customMessage, setCustomMessage] = useState<string>('');

  useEffect(() => {
    // Pre-fetch templates silently in background as soon as page mounts
    if (templates.length === 0) {
      loadTemplates();
    }
  }, []);

  useEffect(() => {
    if (open) {
      setManualPhone(targetPhone);
    }
  }, [open, targetPhone]);

  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredTemplates(templates);
    } else {
      const term = searchTerm.toLowerCase();
      const filtered = templates.filter(
        t => t.name.toLowerCase().includes(term) || (t.body && t.body.toLowerCase().includes(term))
      );
      setFilteredTemplates(filtered);
    }
  }, [searchTerm, templates]);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const fetched = await ChatAmanService.getTemplates();
      setTemplates(fetched);
      setFilteredTemplates(fetched);
    } catch (error) {
      console.error('Error loading templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectTemplate = (template: ChatAmanTemplate) => {
    setSelectedTemplate(template);
    const matches = template.body ? template.body.match(/\{\{(\d+)\}\}/g) : [];
    const numbers = matches ? matches.map(m => parseInt(m.replace(/\D/g, ''), 10)) : [];
    const varCount = numbers.length > 0 ? Math.max(...numbers) : 0;
    
    // Auto-fill First variable with Target Name if available
    const initialVars = Array(varCount).fill('');
    if (varCount > 0 && targetName) {
      initialVars[0] = targetName; // e.g., Client Name
    }
    
    setTemplateVariables(initialVars);
    setHeaderUrl('');
  };

  const handleSend = async () => {
    if (messageType === 'template' && !selectedTemplate) {
      toast.error('يرجى تحديد القالب أولاً');
      return;
    }

    if (messageType === 'template' && templateVariables.some(v => !v.trim())) {
      toast.error('يرجى تعبئة جميع متغيرات القالب');
      return;
    }

    if (messageType === 'custom' && !customMessage.trim()) {
      toast.error('يرجى كتابة نص الرسالة');
      return;
    }

    setSending(true);
    try {
      let result;
      console.log('--- ChatAmanModal Send Debug ---');
      console.log('manualPhone:', manualPhone);
      console.log('templateName:', selectedTemplate?.name);
      console.log('variables:', templateVariables);

      if (messageType === 'custom') {
        result = await ChatAmanService.sendMessage(manualPhone, customMessage);
      } else {
        result = await ChatAmanService.sendTemplate(manualPhone, selectedTemplate!.name, {
          language: selectedTemplate!.language || 'ar',
          bodyParams: templateVariables,
          headerUrl: headerUrl || undefined
        });
      }

      if (result.success) {
        toast.success('✅ تم إرسال الرسالة بنجاح عبر WhatsApp');
        if (messageType === 'custom') {
          setCustomMessage('');
        }
        onOpenChange(false); // close panel after success
      } else {
        toast.error(`❌ فشل الإرسال: ${result.error || 'خطأ غير معروف'}`);
      }
    } catch (error: any) {
      toast.error(`❌ خطأ: ${error.message}`);
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl p-0 overflow-hidden w-[90vw] h-[85vh] flex flex-col border-none shadow-2xl">
        <DialogHeader className="p-4 bg-gradient-to-r from-emerald-500 to-green-600 text-white">
          <DialogTitle className="flex items-center gap-2 text-xl font-bold">
            <Send className="w-5 h-5" />
            مرسل الـ WhatsApp المدمج (ChatAman)
          </DialogTitle>
          <DialogDescription className="text-emerald-50">
            إرسال مباشر أو حملة قوالب للعميل: <strong className="underline">{targetName}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 flex overflow-hidden bg-slate-50/70" dir="rtl">
          {/* Left: Templates List */}
          <div className="w-1/2 border-l border-slate-100 flex flex-col h-full">
            <div className="p-3 border-b bg-white">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="ابحث عن قالب..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 h-9 text-xs"
                />
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {loading ? (
                <p className="text-center text-xs text-slate-400 py-10 animate-pulse">جاري جلب القوالب...</p>
              ) : filteredTemplates.length === 0 ? (
                <p className="text-center text-xs text-slate-400 py-10">لا توجد قوالب تطابق البحث</p>
              ) : (
                filteredTemplates.map((template) => (
                  <div 
                    key={template.name}
                    onClick={() => handleSelectTemplate(template)}
                    className={`p-3 rounded-lg border cursor-pointer transition-all bg-white relative ${
                      selectedTemplate?.name === template.name 
                      ? 'border-emerald-500 bg-emerald-50/50 shadow-sm' 
                      : 'hover:border-slate-300'
                    }`}
                  >
                      <div className="flex flex-col gap-1 truncate max-w-[140px]">
                        <h4 className="font-semibold text-slate-800 text-xs truncate" title={template.name}>
                          {template.name}
                        </h4>
                        <Badge variant="outline" className={`text-[8px] w-fit font-normal px-1 py-0 h-3.5 ${
                          template.category?.toUpperCase() === 'MARKETING' 
                            ? 'bg-amber-50 text-amber-700 border-amber-200' 
                            : 'bg-sky-50 text-sky-700 border-sky-200'
                        }`}>
                          {template.category === 'MARKETING' ? 'تسويقي' : template.category === 'UTILITY' ? 'خدمي' : template.category || 'عام'}
                        </Badge>
                      </div>
                      <Badge variant="secondary" className="text-[9px] px-1 py-0">{template.language || 'ar'}</Badge>
                    <p className="text-[10px] text-slate-500 line-clamp-2">
                      {template.body || 'لا يوجد نص معاينة'}
                    </p>
                    {selectedTemplate?.name === template.name && (
                      <div className="absolute top-1.5 right-1.5 bg-emerald-500 text-white rounded-full p-0.5">
                        <CheckCircle2 className="w-3 h-3" />
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Right: Form Actions */}
          <div className="w-1/2 p-4 overflow-y-auto flex flex-col justify-between h-full bg-white">
            <div className="space-y-4">
              <div className="p-1 bg-slate-100 rounded-lg flex">
                <Button 
                  variant={messageType === 'template' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setMessageType('template')}
                  className={`flex-1 text-xs ${messageType === 'template' ? 'bg-white shadow-sm font-bold' : 'text-slate-600'}`}
                >
                  قالب معتمد
                </Button>
                <Button 
                  variant={messageType === 'custom' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setMessageType('custom')}
                  className={`flex-1 text-xs ${messageType === 'custom' ? 'bg-white shadow-sm font-bold' : 'text-slate-600'}`}
                >
                  رسالة مخصصة
                </Button>
              </div>

                <div className="bg-emerald-50/50 border border-emerald-100 p-2 rounded-md relative overflow-hidden">
                  <div className="absolute top-1 left-1">
                    {selectedTemplate && (
                      <Badge variant="outline" className={`text-[8px] font-normal px-1 py-0 h-3.5 ${
                        selectedTemplate.category?.toUpperCase() === 'MARKETING' 
                          ? 'bg-amber-50 text-amber-700 border-amber-200' 
                          : 'bg-sky-50 text-sky-700 border-sky-200'
                      }`}>
                        {selectedTemplate.category === 'MARKETING' ? 'تسويقي' : selectedTemplate.category === 'UTILITY' ? 'خدمي' : ''}
                      </Badge>
                    )}
                  </div>
                  <p className="text-[10px] font-semibold text-emerald-800">القالب المحدد:</p>
                  <p className="text-xs font-bold text-slate-800 mt-0.5">{selectedTemplate ? selectedTemplate.name : 'يرجى التحديد من القائمة'}</p>
                </div>

              <div className="space-y-3">
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-slate-700">رقم الهاتف المستهدف</Label>
                  <Input 
                    value={manualPhone}
                    onChange={(e) => setManualPhone(e.target.value)}
                    placeholder="201111222333"
                    className="h-9 text-xs"
                  />
                  <p className="text-[9px] text-slate-400">سيتم مراجعة رقم العميل تلقائياً مسبوقاً برمز الدولة</p>
                </div>

                <Separator />

                {messageType === 'template' ? (
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-slate-700">تعبئة المتغيرات المطلوبة</Label>
                    
                    {!selectedTemplate ? (
                      <p className="text-center text-[10px] text-slate-400 py-4 border border-dashed rounded-lg bg-slate-50/50">اختر قالباً لملء البيانات</p>
                    ) : (
                      <div className="space-y-2">
                        {templateVariables.map((variable, idx) => {
                          const shortcuts = [
                            { label: 'اسم العميل', value: targetName },
                            { label: 'رقم الهاتق', value: targetPhone },
                            { label: 'تاريخ اليوم', value: new Date().toLocaleDateString('ar-EG') },
                          ];

                          return (
                            <div key={idx} className="space-y-0.5 mb-2">
                              <Label className="text-[10px] text-slate-500">متغير {`{{${idx + 1}}}`}</Label>
                              <Input 
                                value={variable}
                                onChange={(e) => {
                                  const list = [...templateVariables];
                                  list[idx] = e.target.value;
                                  setTemplateVariables(list);
                                }}
                                className="h-8 text-xs"
                              />
                              <div className="flex flex-wrap gap-1 mt-1">
                                {shortcuts.filter(s => s.value).map((shortcut, sIdx) => (
                                  <Badge 
                                    key={sIdx}
                                    variant="secondary"
                                    className="text-[9px] cursor-pointer hover:bg-emerald-100 hover:text-emerald-800 border-none px-1.5 py-0.5"
                                    onClick={() => {
                                      const list = [...templateVariables];
                                      list[idx] = shortcut.value;
                                      setTemplateVariables(list);
                                    }}
                                  >
                                    + {shortcut.label}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700">نص الرسالة</Label>
                    <textarea 
                      value={customMessage}
                      onChange={(e) => setCustomMessage(e.target.value)}
                      placeholder="اكتب رسالتك لـ WhatsApp هنا..."
                      className="w-full h-24 p-2 text-xs border rounded-lg resize-none focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                )}
              </div>
            </div>

            <Button 
              onClick={handleSend} 
              disabled={sending} 
              size="sm"
              className="w-full h-10 mt-4 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white text-xs font-semibold"
            >
              {sending ? 'جاري الإرسال...' : `إرسال ${messageType === 'template' ? 'قالب WhatsApp' : 'إلى WhatsApp'}`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
