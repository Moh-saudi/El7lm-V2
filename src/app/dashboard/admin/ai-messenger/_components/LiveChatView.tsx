import React, { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/lib/supabase/config';
import { ChatAmanService, ChatAmanTemplate } from '@/lib/services/chataman-service';
import { ChatAmanTemplateSelector } from '@/components/messaging/ChatAmanTemplateSelector';
import { toast } from 'sonner';
import { 
  Search, 
  Send, 
  Paperclip, 
  Bot, 
  User, 
  CheckCheck, 
  Sparkles, 
  Clock,
  Smartphone,
  MessageCircle 
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

export const LiveChatView: React.FC = () => {
  const [activeChat, setActiveChat] = useState<any | null>(null);
  const [chatSearch, setChatSearch] = useState('');
  const [users, setUsers] = useState<any[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<any[]>([]);
  
  // Messaging & Templates layout
  const [templates, setTemplates] = useState<ChatAmanTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<ChatAmanTemplate | null>(null);
  const [templateVariables, setTemplateVariables] = useState<string[]>([]);
  
  const [messages, setMessages] = useState<any[]>([]);
  const [convoId, setConvoId] = useState<string | null>(null);

  const [sendMethod, setSendMethod] = useState<'whatsapp' | 'app_notification'>('whatsapp');
  const [customMessage, setCustomMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [freezeVariables, setFreezeVariables] = useState(false);

  // 📝 Filters state
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [countryFilter, setCountryFilter] = useState<string>('all');

  // 📋 0. Live Chat Messages Listener
  useEffect(() => {
     if (!activeChat) {
        setMessages([]);
        setConvoId(null);
        return;
     }

     let channel: ReturnType<typeof supabase.channel> | null = null;

     const init = async () => {
        try {
           // Find existing conversation
           const { data: convos } = await supabase
             .from('conversations')
             .select('*')
             .filter('participants', 'cs', `["${activeChat.id}"]`)
             .limit(1);

           let currentConvoId: string | null = null;

           if (convos && convos.length > 0) {
              currentConvoId = convos[0].id;
              setConvoId(currentConvoId);
           } else {
              const newId = crypto.randomUUID();
              await supabase.from('conversations').insert({
                 id: newId,
                 participants: [activeChat.id, 'admin'],
                 lastMessage: '',
                 lastMessageTime: new Date().toISOString(),
                 lastSenderId: 'admin'
              });
              currentConvoId = newId;
              setConvoId(currentConvoId);
           }

           // Initial fetch of messages
           const { data: initialMsgs } = await supabase
             .from('messages')
             .select('*')
             .eq('conversationId', currentConvoId)
             .order('timestamp', { ascending: true });
           setMessages(initialMsgs || []);

           // Realtime subscription
           channel = supabase
             .channel(`messages:convo:${currentConvoId}`)
             .on('postgres_changes', {
               event: '*',
               schema: 'public',
               table: 'messages',
               filter: `conversationId=eq.${currentConvoId}`
             }, async () => {
               const { data: updatedMsgs } = await supabase
                 .from('messages')
                 .select('*')
                 .eq('conversationId', currentConvoId)
                 .order('timestamp', { ascending: true });
               setMessages(updatedMsgs || []);
             })
             .subscribe();
        } catch (e) {
           console.error('Messages Listener Error:', e);
        }
     };

     init();

     return () => {
        if (channel) supabase.removeChannel(channel);
     };
  }, [activeChat]);

  // 📋 1. Load Real Users on mount (Multi-table aggregations + Debounce for Speed)
  useEffect(() => {
    const tablesGroup = [
      'users',
      'players',
      'academies', 'academy',
      'clubs', 'club',
      'trainers', 'trainer',
      'agents', 'agent',
      'marketers', 'marketer',
      'parent',
    ];

    const tableToType: Record<string, string> = {
      users: '',
      players: 'player',
      academies: 'academy', academy: 'academy',
      clubs: 'club', club: 'club',
      trainers: 'trainer', trainer: 'trainer',
      agents: 'agent', agent: 'agent',
      marketers: 'marketer', marketer: 'marketer',
    };

    const combinedMap = new Map<string, any>();
    let throttleTimeout: NodeJS.Timeout | null = null;

    const updateState = () => {
       if (throttleTimeout) return;
       throttleTimeout = setTimeout(() => {
          const arr = Array.from(combinedMap.values());
          setUsers(arr);
          setFilteredUsers(arr);
          throttleTimeout = null;
       }, 50);
    };

    const upsertRows = (rows: any[], tableName: string) => {
      for (const data of rows) {
        const id = data.id;
        const accountType = tableToType[tableName] || data.accountType || tableName;
        const name = data.displayName || data.full_name || data.name || data.academyName || data.academy_name || data.clubName || data.club_name || data.userName || data.username || 'مستخدم مجهول';
        const phone = data.phone || data.phoneNumber || data.whatsapp || data.official_contact?.phone || '';
        const country = data.country || data.countryName || '';

        // 🖼️ Robust Avatar Extractor (Handles strings and objects like profile_image.url)
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

        if (phone) { // Only load users with phones for messaging
           const userEntry = {
             id,
             name,
             phone,
             role: accountType,
             online: false,
             avatar,
             country,
             raw: data
           };

           if (!combinedMap.has(id) || tableName === 'users') {
              combinedMap.set(id, userEntry);
           }
        }
      }
      updateState();
    };

    const channels: ReturnType<typeof supabase.channel>[] = [];

    const loadAndSubscribe = async () => {
      try {
        for (const tbl of tablesGroup) {
          // Initial fetch
          const { data } = await supabase.from(tbl).select('*');
          upsertRows(data || [], tbl);

          // Realtime subscription
          const ch = supabase
            .channel(`live-chat-users:${tbl}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: tbl }, async () => {
              const { data: fresh } = await supabase.from(tbl).select('*');
              upsertRows(fresh || [], tbl);
            })
            .subscribe();
          channels.push(ch);
        }
      } catch (e) {
        console.error(e);
      }
    };

    loadAndSubscribe();

    return () => {
      if (throttleTimeout) clearTimeout(throttleTimeout);
      for (const ch of channels) {
        try { supabase.removeChannel(ch); } catch {}
      }
    };
  }, []);

  // 📋 2. Load Templates on mount
  useEffect(() => {
    const loadTemplates = async () => {
      const fetched = await ChatAmanService.getTemplates();
      setTemplates(fetched);
    };
    loadTemplates();
  }, []);

  // 📋 3. Combined Filtering Processor
  useEffect(() => {
    let result = [...users];

    // 🔍 Search Filter
    if (chatSearch.trim() !== '') {
      const term = chatSearch.toLowerCase();
      result = result.filter(u => u.name.toLowerCase().includes(term) || u.phone.includes(term));
    }

    // 🎭 Role Filter
    if (roleFilter !== 'all') {
      result = result.filter(u => u.role === roleFilter);
    }

    // 🌍 Country Filter
    if (countryFilter !== 'all') {
      result = result.filter(u => u.country === countryFilter);
    }

    setFilteredUsers(result);
  }, [chatSearch, users, roleFilter, countryFilter]);

  const handleSelectTemplate = async (templateName: string) => {
      if (templateName === 'none') {
         setSelectedTemplate(null);
         setTemplateVariables([]);
         setFreezeVariables(false);
         return;
      }

     const template = templates.find(t => t.name === templateName);
     if (!template) return;

     setSelectedTemplate(template);
     const matches = template.body ? template.body.match(/\{\{(\d+)\}\}/g) : [];
     const numbers = matches ? matches.map(m => parseInt(m.replace(/\D/g, ''), 10)) : [];
     const varCount = numbers.length > 0 ? Math.max(...numbers) : 0;
     
     const initialVars = Array(varCount).fill('');
     if (varCount > 0 && activeChat) {
       initialVars[0] = activeChat.name; // Autoload Name
     }
     setTemplateVariables(initialVars);
     setFreezeVariables(false);

     // ❄️ Check Presets/Freeze mappings inside Supabase
     try {
       const { data: presetRow } = await supabase
         .from('system_configs')
         .select('*')
         .eq('id', 'chataman_templates_presets')
         .single();
       const presets = presetRow ? presetRow : {};
       if (presets[templateName]) {
          const loadedVars = [...initialVars];
          presets[templateName].forEach((v: string, i: number) => {
             if (v && i < varCount) loadedVars[i] = v;
          });
          setTemplateVariables(loadedVars);
          setFreezeVariables(true);
       }
     } catch (e) {
       console.log('No presets found or allowed');
     }
  };

  const handleSend = async () => {
     if (!activeChat) return;

     if (sendMethod === 'whatsapp' && selectedTemplate && templateVariables.some(v => !v.trim())) {
        toast.error('يرجى تعبئة كافة المتغيرات');
        return;
     }

     if (!customMessage.trim() && !selectedTemplate) {
        toast.error('يرجى كتابة رسالة أو تحديد قالب');
        return;
     }

     setSending(true);
     try {
        if (sendMethod === 'whatsapp') {
           let result;
           if (selectedTemplate) {
              result = await ChatAmanService.sendTemplate(activeChat.phone, selectedTemplate.name, {
                 language: selectedTemplate.language || 'ar',
                 bodyParams: templateVariables
              });
           } else {
              console.log('[handleSend] Sending Free Message to phone:', activeChat.phone, 'content:', customMessage);
              result = await ChatAmanService.sendMessage(activeChat.phone, customMessage);
           }

           console.log('[handleSend] Response Result:', result);

            if (result.success) {
               toast.success('✅ تم الإرسال عبر WhatsApp');
               setCustomMessage('');

               try {
                  const messageBody = selectedTemplate
                     ? (selectedTemplate.body || `قالب: ${selectedTemplate.name}`)
                     : customMessage;

                  await supabase.from('messages').insert({
                     id: crypto.randomUUID(),
                     conversationId: convoId,
                     senderId: 'admin',
                     receiverId: activeChat.id,
                     senderName: 'الإدارة',
                     message: messageBody,
                     timestamp: new Date().toISOString(),
                     isRead: true,
                     messageType: selectedTemplate ? 'template' : 'text',
                     metadata: {
                        isWhatsApp: true,
                        templateName: selectedTemplate?.name
                     }
                  });

                  if (convoId) {
                     await supabase.from('conversations').update({
                        lastMessage: messageBody,
                        lastMessageTime: new Date().toISOString(),
                        lastSenderId: 'admin'
                     }).eq('id', convoId);
                  }
               } catch (e) {
                  console.error('Error saving sent message:', e);
               }

               if (selectedTemplate && freezeVariables) {
                 await supabase.from('system_configs').upsert({
                    id: 'chataman_templates_presets',
                    [selectedTemplate.name]: templateVariables
                 });
                 toast.success('❄️ تم تثبيت المتغيرات لهذا القالب');
              }
           } else {
              toast.error(`❌ خطأ: ${result.error}`);
           }

        } else {
           await supabase.from('notifications').insert({
              id: crypto.randomUUID(),
              title: selectedTemplate ? 'إشعار من الإدارة' : 'رسالة جديدة',
              message: selectedTemplate ? selectedTemplate.body : customMessage,
              userId: activeChat.id,
              isRead: false,
              type: 'info',
              priority: 'medium',
              createdAt: new Date().toISOString()
           });
           toast.success('✅ تم إرسال إشعار التطبيق بنجاح');
           setCustomMessage('');
        }
     } catch (e: any) {
        toast.error(`خطأ: ${e.message}`);
     } finally {
        setSending(false);
     }
  };

  const uniqueRoles = Array.from(new Set(users.map(u => u.role))).filter(Boolean);
  const uniqueCountries = Array.from(new Set(users.map(u => u.country))).filter(Boolean);

  return (
    <div className="flex bg-white/80 backdrop-blur-md rounded-2xl shadow-xl overflow-hidden h-[calc(100vh-180px)] border border-white/20" dir="rtl">
      {/* 🟢 Left sidebar: Contacts */}
      <div className="w-1/3 border-l border-slate-100/80 flex flex-col h-full bg-slate-50/20">
         <div className="p-4 border-b border-slate-100 bg-white/80 space-y-2">
            <div className="flex gap-2 items-center">
               <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input 
                    placeholder="ابحث عن محادثة أو عميل..." 
                    value={chatSearch}
                    onChange={(e) => setChatSearch(e.target.value)}
                    className="pl-9 h-9 text-xs border-none bg-slate-100/80 focus-visible:ring-emerald-500 rounded-xl"
                  />
               </div>
               
               <Select onValueChange={setRoleFilter} defaultValue="all">
                  <SelectTrigger className="w-24 h-9 text-[10px] border-none bg-slate-100/80 rounded-xl px-2">
                     <SelectValue placeholder="الفئة" />
                  </SelectTrigger>
                  <SelectContent className="text-xs">
                     <SelectItem value="all">كل الفئات</SelectItem>
                     {uniqueRoles.map(r => (
                        <SelectItem key={r} value={r}>{r}</SelectItem>
                     ))}
                  </SelectContent>
               </Select>

               <Select onValueChange={setCountryFilter} defaultValue="all">
                  <SelectTrigger className="w-24 h-9 text-[10px] border-none bg-slate-100/80 rounded-xl px-2">
                     <SelectValue placeholder="البلد" />
                  </SelectTrigger>
                  <SelectContent className="text-xs">
                     <SelectItem value="all">الكل</SelectItem>
                     {uniqueCountries.map(c => (
                        <SelectItem key={c} value={c}>{getCountryFlag('', c)} {c}</SelectItem>
                     ))}
                  </SelectContent>
               </Select>
            </div>
         </div>

         <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
            {filteredUsers.map(chat => (
               <div 
                 key={chat.id}
                 onClick={() => setActiveChat(chat)}
                 className={`p-3 rounded-xl cursor-pointer transition-all duration-200 flex items-center justify-between hover:bg-white/90 group ${
                   activeChat?.id === chat.id ? 'bg-white shadow-sm border-r-4 border-emerald-500 shadow-emerald-500/5' : 'border-r-4 border-transparent'
                 }`}
               >
                  <div className="flex items-center gap-3">
                     <div className="relative">
                        <img 
                          src={chat.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(chat.name)}&background=random&color=fff&size=40`} 
                          alt={chat.name} 
                          onError={(e) => { e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(chat.name)}&background=random&color=fff&size=40`; }}
                          className="w-10 h-10 rounded-full object-cover border border-slate-200" 
                        />
                     </div>
                     <div className="overflow-hidden">
                        <h4 className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                           {getCountryFlag(chat.phone, chat.country)} {chat.name}
                           <Badge variant="outline" className="text-[9px] px-1 font-normal text-slate-500 border-slate-200">{chat.role}</Badge>
                        </h4>
                        <p className="text-[10px] text-slate-500 truncate mt-0.5">{chat.phone}</p>
                     </div>
                  </div>
               </div>
            ))}
         </div>
      </div>

      {/* 🟡 Right Screen: Feed panel */}
      <div className="flex-1 flex flex-col h-full bg-cover bg-center relative" style={{ backgroundImage: 'url("https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png")', opacity: '0.97' }}>
         <div className="absolute inset-0 bg-slate-50/90 [mask-image:linear-gradient(to_bottom,white_10%,transparent_90%)] -z-10"></div>
         {!activeChat ? (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 bg-white/50 backdrop-blur-sm">
               <div className="w-16 h-16 bg-white/80 rounded-full flex items-center justify-center shadow-lg border border-slate-100">
                  <User className="w-6 h-6 text-slate-300" />
               </div>
               <p className="text-sm font-semibold text-slate-600 mt-4">اختر عميلاً من القائمة للبدء</p>
               <p className="text-[10px] text-slate-400 mt-1">إرسال القوالب وتثبيت المتغيرات متاح الآن</p>
            </div>
         ) : (
            <>
               {/* Feed Header */}
               <div className="p-4 border-b border-slate-100 bg-white/95 flex items-center justify-between backdrop-blur-md">
                  <div className="flex items-center gap-3">
                     <img 
                       src={activeChat.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(activeChat.name)}&background=random&color=fff&size=40`} 
                       alt={activeChat.name}
                       onError={(e) => { e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(activeChat.name)}&background=random&color=fff&size=40`; }}
                       className="w-9 h-9 rounded-full object-cover border border-slate-100 shadow-sm"
                     />
                     <div>
                        <h3 className="font-bold text-xs text-slate-800 flex items-center gap-1">
                           {getCountryFlag(activeChat.phone, activeChat.country)} {activeChat.name}
                        </h3>
                        <span className="text-[10px] text-slate-500">{activeChat.phone}</span>
                     </div>
                  </div>

                  <div className="flex items-center gap-2">
                     <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border">
                        <Button 
                          onClick={() => setSendMethod('whatsapp')}
                          variant={'ghost'} 
                          className={`h-7 px-2.5 text-[10px] gap-1 rounded-md ${sendMethod === 'whatsapp' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500'}`}
                        >
                           <MessageCircle className="w-3.5 h-3.5" />
                           واتساب
                        </Button>
                        <Button 
                          onClick={() => setSendMethod('app_notification')}
                          variant={'ghost'} 
                          className={`h-7 px-2.5 text-[10px] gap-1 rounded-md ${sendMethod === 'app_notification' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}
                        >
                           <Smartphone className="w-3.5 h-3.5" />
                           إشعار تطبيق
                        </Button>
                     </div>
                  </div>
               </div>

               {/* 💬 Live Chat Timeline / Bubbles */}
               <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar bg-slate-50/50">
                  {messages.length === 0 ? (
                     <div className="flex h-full items-center justify-center text-slate-400 text-xs">
                        لا توجد رسائل سابقة في هذه المحادثة
                     </div>
                  ) : (
                     messages.map((m) => (
                        <div key={m.id} className={`flex ${m.senderId === 'admin' ? 'justify-end' : 'justify-start'}`}>
                           <div className={`p-3 rounded-2xl max-w-[75%] shadow-sm ${
                              m.senderId === 'admin' 
                              ? 'bg-emerald-600 text-white rounded-br-none' 
                              : 'bg-white text-slate-800 rounded-bl-none border border-slate-100'
                           }`}>
                              <p className="text-xs whitespace-pre-wrap">{m.message}</p>
                              <span className={`text-[8px] mt-1 block ${m.senderId === 'admin' ? 'text-emerald-100 text-left' : 'text-slate-400 text-right'}`}>
                                 {m.timestamp ? new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '...'}
                              </span>
                           </div>
                        </div>
                     ))
                  )}
               </div>

               {/* Configuration Panel & Input */}
               <div className="h-[250px] overflow-y-auto p-4 flex flex-col gap-3 custom-scrollbar bg-white/50 backdrop-blur-sm border-t border-slate-100">
                  {sendMethod === 'whatsapp' && (
                     <div className="space-y-3 bg-white/80 p-4 rounded-xl border border-white/50 shadow-md">
                        <ChatAmanTemplateSelector
                          onSelect={(template, vars) => {
                             setSelectedTemplate(template);
                             setTemplateVariables(vars);
                          }}
                          targetPhone={activeChat.phone}
                          targetName={activeChat.name}
                          shortcuts={[
                            { label: 'الفئة', value: activeChat.role },
                            { label: 'البلد', value: activeChat.country },
                            { label: 'قيمة الاشتراك', value: activeChat.raw?.subscription?.amount || activeChat.raw?.subscriptionAmount || activeChat.raw?.subscription_price || activeChat.raw?.price || '' },
                            { label: 'مدة الاشتراك', value: activeChat.raw?.subscription?.duration || activeChat.raw?.subscriptionDuration || activeChat.raw?.duration || '' },
                            { label: 'الباقة', value: activeChat.raw?.packageName || activeChat.raw?.package_name || activeChat.raw?.package || activeChat.raw?.plan || '' },
                            { label: 'تاريخ الانتهاء', value: activeChat.raw?.subscription?.expiry || activeChat.raw?.subscription_expiry || activeChat.raw?.expiryDate || activeChat.raw?.expiration || '' },
                            { label: 'رمز OTP', value: activeChat.raw?.lastOtp || activeChat.raw?.otp || '' }
                          ].filter(s => s.value)}
                        />

                        {selectedTemplate && templateVariables.length > 0 && (
                          <div className="flex items-center space-x-2 space-x-reverse mt-4 border-t pt-2 border-slate-100">
                             <Checkbox 
                               id="freeze" 
                               checked={freezeVariables}
                               onCheckedChange={(checked) => setFreezeVariables(checked as boolean)}
                             />
                             <Label htmlFor="freeze" className="text-[11px] cursor-pointer text-slate-600 flex items-center gap-1">
                                تثبيت وحفظ المتغيرات لهذا القالب مستقبلاً 
                                <Badge className="bg-amber-50 text-amber-700 text-[8px] font-normal border border-amber-100 px-1 py-0 px-1.5 h-4 flex items-center">ميزة حفظ</Badge>
                             </Label>
                          </div>
                        )}
                     </div>
                  )}

                  {(!selectedTemplate || sendMethod === 'app_notification') && (
                     <div className="space-y-2 bg-white/80 p-4 rounded-xl border border-white/50 shadow-md">
                        <Label className="text-xs font-bold text-slate-700">رسالة نصية حرة (مخصصة)</Label>
                        <Input 
                           placeholder={sendMethod === 'whatsapp' ? 'اكتب رسالة WhatsApp...' : 'اكتب نص الإشعار فوري للتطبيق...'}
                           value={customMessage}
                           onChange={(e) => setCustomMessage(e.target.value)}
                           className="text-xs h-10 border-slate-200 focus-visible:ring-emerald-500"
                        />
                     </div>
                  )}
               </div>

               {/* Footer Action */}
               <div className="p-4 bg-white border-t border-slate-100 flex items-center justify-end gap-2 shadow-inner">
                  <Button 
                    onClick={handleSend}
                    disabled={sending}
                    className={`h-9 text-xs font-bold rounded-xl gap-1.5 shadow-md flex items-center justify-center px-6 ${
                       sendMethod === 'whatsapp' 
                       ? 'bg-gradient-to-r from-emerald-500 to-green-600 text-white' 
                       : 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white'
                    }`}
                  >
                     {sending ? 'جاري الإرسال...' : (
                        <>
                           <Send className="w-3.5 h-3.5 ml-0.5" />
                           إرسال الآن عبر {sendMethod === 'whatsapp' ? 'WhatsApp' : 'التطبيق'}
                        </>
                     )}
                  </Button>
               </div>
            </>
         )}
      </div>
    </div>
  );
};
