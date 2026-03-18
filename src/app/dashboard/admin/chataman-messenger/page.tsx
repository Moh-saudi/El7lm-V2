'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { ChatAmanService, ChatAmanTemplate } from '@/lib/services/chataman-service';
import { db } from '@/lib/firebase/config';
import { collection, getDocs, limit, query } from 'firebase/firestore';
import { CheckCircle2, Globe, MessageSquare, Search, Send, User, Reply, ListFilter } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';

interface FirebaseUser {
  id: string;
  full_name?: string;
  name?: string;
  phone?: string;
  email?: string;
}

export default function ChatAmanMessengerPage() {
  const [templates, setTemplates] = useState<ChatAmanTemplate[]>([]);
  const [filteredTemplates, setFilteredTemplates] = useState<ChatAmanTemplate[]>([]);
  const [users, setUsers] = useState<FirebaseUser[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isActive, setIsActive] = useState(false);

  // Selection States
  const [selectedTemplate, setSelectedTemplate] = useState<ChatAmanTemplate | null>(null);
  const [recipientType, setRecipientType] = useState<'manual' | 'user'>('manual');
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [manualPhone, setManualPhone] = useState<string>('');
  const [templateVariables, setTemplateVariables] = useState<string[]>([]);
  const [headerUrl, setHeaderUrl] = useState<string>('');
  
  // Custom message support
  const [messageType, setMessageType] = useState<'template' | 'custom'>('template');
  const [customMessage, setCustomMessage] = useState<string>('');

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (searchTerm) {
      setFilteredTemplates(templates.filter(t => 
        t.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        (t.body && t.body.toLowerCase().includes(searchTerm.toLowerCase()))
      ));
    } else {
      setFilteredTemplates(templates);
    }
  }, [searchTerm, templates]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const config = await ChatAmanService.getConfig();
      
      if (!config || !config.isActive) {
        setIsActive(false);
        toast.error('خدمة ChatAman غير مفعلة في الإعدادات حالياً');
        setLoading(false);
        return;
      }
      
      setIsActive(true);

      // 1. Load Templates
      const fetchedTemplates = await ChatAmanService.getTemplates();
      setTemplates(fetchedTemplates);
      setFilteredTemplates(fetchedTemplates);

      // 2. Load Users for quick selection
      const usersSnap = await getDocs(query(collection(db, 'users'), limit(50)));
      const fetchedUsers: FirebaseUser[] = [];
      usersSnap.forEach(doc => {
        const data = doc.data();
        if (data.phone) {
          fetchedUsers.push({ id: doc.id, ...data } as FirebaseUser);
        }
      });
      setUsers(fetchedUsers);

    } catch (error) {
      console.error('Error loading messenger data:', error);
      toast.error('حدث خطأ في جلب بيانات شات أمان');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectTemplate = (template: ChatAmanTemplate) => {
    setSelectedTemplate(template);
    // Guess variables count from body text structure (e.g., {{1}}, {{2}})
    const matches = template.body ? template.body.match(/\{\{(\d+)\}\}/g) : [];
    const numbers = matches ? matches.map(m => parseInt(m.replace(/\D/g, ''), 10)) : [];
    const varCount = numbers.length > 0 ? Math.max(...numbers) : 0;
    
    setTemplateVariables(Array(varCount).fill(''));
    setHeaderUrl('');
  };

  const handleSend = async () => {
    let targetPhone = manualPhone;
    if (recipientType === 'user') {
      const user = users.find(u => u.id === selectedUserId);
      if (user?.phone) {
        targetPhone = user.phone;
      } else {
        toast.error('لا يتوفر رقم هاتف للمستخدم المختار');
        return;
      }
    }

    if (!targetPhone) {
      toast.error('يرجى تحديد رقم الهاتف');
      return;
    }

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
      if (messageType === 'custom') {
        result = await ChatAmanService.sendMessage(targetPhone, customMessage);
      } else {
        result = await ChatAmanService.sendTemplate(targetPhone, selectedTemplate!.name, {
          language: selectedTemplate!.language || 'ar',
          bodyParams: templateVariables,
          headerUrl: headerUrl || undefined
        });
      }

      if (result.success) {
        console.log('✅ ChatAman Send Success:', result);
        toast.success('✅ تم إرسال الرسالة بنجاح');
        // Reset inputs on success except numbers
        if (messageType === 'template') {
          setTemplateVariables(Array(templateVariables.length).fill(''));
          setHeaderUrl('');
        } else {
          setCustomMessage('');
        }
      } else {
        toast.error(`❌ فشل الإرسال: ${result.error || 'خطأ غير معروف'}`);
      }
    } catch (error: any) {
      toast.error(`خطأ: ${error.message || 'حدث خطأ غير متوقع'}`);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-r from-emerald-500 to-green-600 rounded-2xl text-white shadow-md">
              <MessageSquare className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-800">مركز إرسال وحملات ChatAman</h1>
              <p className="text-sm text-slate-500 mt-0.5">إرسال القوالب المعتمدة والموثقة وإدارة المراسلات</p>
            </div>
          </div>
          <Badge variant={isActive ? "default" : "destructive"} className="gap-1.5 px-3 py-1">
            <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`} />
            {isActive ? 'الخدمة نشطة ومفعلة' : 'الخدمة غير مفعلة'}
          </Badge>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Area: Templates List */}
          <div className="lg:col-span-2 space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <ListFilter className="w-4 h-4 text-emerald-600" />
                      قائمة القوالب المعتمدة
                    </CardTitle>
                    <CardDescription>انقر على قالب للبدء بملئه وإرساله فوراً</CardDescription>
                  </div>
                  <Badge variant="outline" className="text-emerald-700 bg-emerald-50 border-emerald-200">
                    {filteredTemplates.length} قالب
                  </Badge>
                </div>
                <div className="relative mt-3">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input 
                    placeholder="ابحث عن قالب بالاسم أو المحتوى..." 
                    className="pl-9"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </CardHeader>

              <CardContent className="max-h-[600px] overflow-y-auto p-3">
                {loading ? (
                  <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500 mb-2"></div>
                    <p className="text-sm">جاري جلب القوالب من ChatAman...</p>
                  </div>
                ) : filteredTemplates.length === 0 ? (
                  <div className="text-center py-16 text-slate-400">
                    <Globe className="w-12 h-12 mx-auto mb-3 stroke-[1.5]" />
                    <p>لا توجد قوالب معتمدة تطابق بحثك أو الحساب غير مفعل</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {filteredTemplates.map((template) => (
                      <div 
                        key={template.name}
                        onClick={() => handleSelectTemplate(template)}
                        className={`group border rounded-xl p-4 cursor-pointer transition-all duration-200 relative ${
                          selectedTemplate?.name === template.name 
                          ? 'border-emerald-500 bg-emerald-50/40 shadow-sm' 
                          : 'hover:border-slate-300 hover:shadow-sm h-full flex flex-col'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex flex-col gap-1 truncate max-w-[140px]">
                            <h3 className="font-semibold text-slate-800 text-sm truncate" title={template.name}>
                              {template.name}
                            </h3>
                            <Badge variant="outline" className={`text-[9px] w-fit font-normal px-1 py-0 h-4 ${
                              template.category?.toUpperCase() === 'MARKETING' 
                                ? 'bg-amber-50 text-amber-700 border-amber-200' 
                                : 'bg-sky-50 text-sky-700 border-sky-200'
                            }`}>
                              {template.category === 'MARKETING' ? 'تسويقي' : template.category === 'UTILITY' ? 'خدمي' : template.category || 'عام'}
                            </Badge>
                          </div>
                          <Badge variant="secondary" className="text-[10px] items-center gap-0.5 px-1.5 py-0">
                            <Globe className="w-3 h-3" />
                            {template.language || 'ar'}
                          </Badge>
                        </div>

                        <p className="text-xs text-slate-600 line-clamp-3 bg-white p-2 rounded-lg border group-hover:border-slate-200 flex-grow">
                          {template.body || 'لا يتوفر نص معاينة لهذا القالب.'}
                        </p>
                        {selectedTemplate?.name === template.name && (
                          <div className="absolute -top-1.5 -right-1.5 bg-emerald-500 text-white rounded-full p-0.5 shadow-sm">
                            <CheckCircle2 className="w-4 h-4" />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Area: Form Panel */}
          <div className="lg:col-span-1">
            <Card className="sticky top-6 border-slate-200 shadow-md">
              <CardHeader className="bg-slate-50 border-b pb-4">
                <CardTitle className="text-lg flex items-center gap-2 text-slate-800">
                  <Send className="w-4 h-4 text-emerald-500" />
                  بيانات الإرسال والـ Setup
                </CardTitle>
                <CardDescription>إرسال القالب للعميل المطلوب</CardDescription>
              </CardHeader>
              
              <CardContent className="pt-5 space-y-4">
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-lg">
                    <Button 
                      variant={messageType === 'template' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setMessageType('template')}
                      className={messageType === 'template' ? 'bg-white shadow-sm font-bold' : 'text-slate-600'}
                    >
                      قالب معتمد
                    </Button>
                    <Button 
                      variant={messageType === 'custom' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setMessageType('custom')}
                      className={messageType === 'custom' ? 'bg-white shadow-sm font-bold' : 'text-slate-600'}
                    >
                      رسالة مخصصة
                    </Button>
                  </div>
                </div>

                <Separator />

                {messageType === 'template' && (
                  <div className="bg-emerald-50/50 border border-emerald-100 p-3 rounded-lg">
                    <p className="text-xs font-semibold text-emerald-800">القالب المحدد:</p>
                    <p className="text-sm font-bold text-slate-800 mt-1">{selectedTemplate ? selectedTemplate.name : 'يرجى تحديد قالب من القائمة'}</p>
                  </div>
                )}

                <Separator />

                {/* Step 1: Destination */}
                <div className="space-y-3">
                  <Label className="text-sm font-bold">1. تحديد المستلم</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Button 
                      variant={recipientType === 'manual' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setRecipientType('manual')}
                    >
                      رقم مبرمج (يدوي)
                    </Button>
                    <Button 
                      variant={recipientType === 'user' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setRecipientType('user')}
                    >
                      تحديد مستخدم
                    </Button>
                  </div>

                  {recipientType === 'manual' ? (
                    <div className="space-y-1 mt-2">
                      <Input 
                        value={manualPhone}
                        onChange={(e) => setManualPhone(e.target.value)}
                        placeholder="مثال: 201111222333"
                        className="h-10 text-sm"
                      />
                      <p className="text-[10px] text-slate-500">ادخل الرقم بدون علامة (+) وسوف يتم مراجعته تلقائياً</p>
                    </div>
                  ) : (
                    <div className="mt-2">
                      <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                        <SelectTrigger className="text-sm h-10">
                          <SelectValue placeholder="اختر مستخدم من القائمة" />
                        </SelectTrigger>
                        <SelectContent className="max-h-[200px]">
                          {users.map((u) => (
                            <SelectItem key={u.id} value={u.id}>
                              {u.full_name || u.name || 'مستخدم بلا اسم'} ({u.phone})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>

                <Separator />

                {/* Step 2: Variables or Custom Message */}
                {messageType === 'template' ? (
                  <div className="space-y-3">
                    <Label className="text-sm font-bold">2. ملء القيم والمتغيرات</Label>
                    
                    {selectedTemplate && selectedTemplate.header_type === 'IMAGE' && (
                      <div className="space-y-1">
                        <Label className="text-xs text-slate-500">رابط صورة الرأس (Header URL)</Label>
                        <Input 
                          value={headerUrl}
                          onChange={(e) => setHeaderUrl(e.target.value)}
                          placeholder="http(s):// رابط الصورة"
                          className="h-9 text-xs"
                        />
                      </div>
                    )}

                    <div className="space-y-2">
                      {!selectedTemplate ? (
                        <p className="text-xs text-slate-400 text-center py-4">اختر قالباً لملء البيانات</p>
                      ) : (
                        templateVariables.map((variable, idx) => (
                          <div key={idx} className="space-y-1">
                            <Label className="text-xs text-slate-600">متغير قالب {`{{${idx + 1}}}`}</Label>
                            <Input 
                              value={variable}
                              onChange={(e) => {
                                const list = [...templateVariables];
                                list[idx] = e.target.value;
                                setTemplateVariables(list);
                              }}
                              placeholder={`تعبئة القيمة لـ {{${idx + 1}}}`}
                              className="h-9 text-xs"
                            />
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <Label className="text-sm font-bold">2. نص الرسالة المخصصة</Label>
                    <textarea 
                      value={customMessage}
                      onChange={(e) => setCustomMessage(e.target.value)}
                      placeholder="اكتب نص الرسالة هنا..."
                      className="w-full h-24 p-2 text-sm border rounded-lg resize-none focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                )}

                <Separator />

                {/* Submit Button */}
                <Button 
                  onClick={handleSend} 
                  disabled={sending} 
                  className="w-full h-11 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white font-semibold"
                >
                  {sending ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white ml-2"></div>
                      جاري الإرسال...
                    </>
                  ) : (
                    <>
                      <Send className="w-5 h-5 ml-2" />
                      إرسال {messageType === 'template' ? 'قالب WhatsApp' : 'إلى WhatsApp'}
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
