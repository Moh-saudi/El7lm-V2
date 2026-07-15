import React, { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase/config';
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
import { useTranslation } from '@/lib/i18n';

// ─── Variable mapping types ────────────────────────────────────────────────────
type VarSource = 'account_name' | 'country' | 'role' | 'custom';

const getCountryFlag = (phone: string, country?: string): string => {
   if (country) {
       const c = country.trim().toLowerCase();
       if (c.includes('\u0645\u0635\u0631') || c.includes('egypt')) return '🇪🇬';
       if (c.includes('\u0627\u0644\u0633\u0639\u0648\u062f\u064a\u0629') || c.includes('saudi')) return '🇸🇦';
       if (c.includes('\u0627\u0644\u0643\u0648\u064a\u062a') || c.includes('kuwait')) return '🇰🇼';
       if (c.includes('\u0627\u0644\u0627\u0645\u0627\u0631\u0627\u062a') || c.includes('\u0627\u0644\u0625\u0645\u0627\u0631\u0627\u062a') || c.includes('emirates') || c.includes('uae')) return '🇦🇪';
       if (c.includes('\u0642\u0637\u0631') || c.includes('qatar')) return '🇶🇦';
       if (c.includes('\u0639\u0645\u0627\u0646') || c.includes('\u0639\u064f\u0645\u0627\u0646') || c.includes('oman')) return '🇴🇲';
       if (c.includes('\u0627\u0644\u0628\u062d\u0631\u064a\u0646') || c.includes('bahrain')) return '🇧🇭';
       if (c.includes('\u0627\u0644\u0627\u0631\u062f\u0646') || c.includes('\u0627\u0644\u0623\u0631\u062f\u0646') || c.includes('jordan')) return '🇯🇴';
       if (c.includes('\u0627\u0644\u0645\u063a\u0631\u0628') || c.includes('morocco')) return '🇲🇦';
       if (c.includes('\u062a\u0648\u0646\u0633') || c.includes('tunisia')) return '🇹🇳';
       if (c.includes('\u0627\u0644\u062c\u0632\u0627\u0626\u0631') || c.includes('algeria')) return '🇩🇿';
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
  const { isRTL, getTranslations } = useTranslation();
  const copy = getTranslations<any>('aiMessenger.campaignManager');
  const withCount = (template: string, count: number) => template.replace('{{count}}', String(count));
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
    const collectionsGroup = ['users', 'players', 'academies', 'academy', 'clubs', 'club', 'trainers', 'trainer', 'agents', 'agent'];
    const collectionToType: Record<string, string> = {
      users: 'any', players: 'player', academies: 'academy', academy: 'academy',
      clubs: 'club', club: 'club', trainers: 'trainer', trainer: 'trainer',
      agents: 'agent', agent: 'agent'
    };
    const combinedMap = new Map<string, any>();

    const upsertDocs = (docs: any[], colName: string) => {
      for (const data of docs) {
        const accountType = collectionToType[colName] || data.accountType || colName;
        const name = data.displayName || data.full_name || data.name || data.academyName || data.academy_name || data.clubName || data.club_name || data.userName || data.username || copy.unknownUser;
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
           combinedMap.set(data.id, { id: data.id, name, phone, role: accountType, avatar, country });
        }
      }
    };

    // Load all collections once
    const loadAll = async () => {
      for (const col of collectionsGroup) {
        const { data } = await supabase.from(col).select('*');
        if (data) upsertDocs(data, col);
      }
      setUsers(Array.from(combinedMap.values()));
    };
    loadAll();
    // Setup realtime for users table
    const channel = supabase.channel('campaign-users')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, () => loadAll())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
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
    if (!selectedTemplate) { toast.error(copy.selectTemplateError); return; }
    const filtered = users.filter(u => {
      const roleMatch = targetSegment === 'all' || u.role === targetSegment;
      const countryMatch = targetCountries.length === 0 || targetCountries.includes(u.country);
      return roleMatch && countryMatch;
    });
    if (filtered.length === 0) { toast.error(copy.noUsersError); return; }
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
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full overflow-y-auto custom-scrollbar p-1" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* 🟢 Right: Campaign Config & Builder Module */}
      <div className="lg:col-span-2 space-y-4">
         <Card className="border-none shadow-xl bg-white rounded-2xl relative overflow-hidden">
            <CardHeader className="p-4 pb-0">
               <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                  <Megaphone className="w-4 h-4 text-emerald-500 animate-bounce" />
                  {copy.title}
               </CardTitle>
               <CardDescription className="text-[10px] text-slate-400">{copy.description}</CardDescription>

               {/* Tab switcher */}
               <div className="flex gap-1 bg-slate-100 p-0.5 rounded-lg mt-3">
                 {[
                   { id: 'builder', label: copy.builderTab },
                   { id: 'history', label: copy.historyTab },
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
                         <Label className="text-xs font-bold text-slate-700">{copy.segmentFilter}</Label>
                         <Select onValueChange={setTargetSegment} defaultValue="all">
                            <SelectTrigger className="h-9 text-xs border-slate-200">
                               <SelectValue placeholder={copy.selectSegment} />
                            </SelectTrigger>
                            <SelectContent className="text-xs">
                               <SelectItem value="all">{copy.all} ({users.length})</SelectItem>
                               <SelectItem value="player">{copy.players} ({users.filter(u => u.role === 'player').length})</SelectItem>
                               <SelectItem value="academy">{copy.academies} ({users.filter(u => u.role === 'academy').length})</SelectItem>
                               <SelectItem value="trainer">{copy.trainers} ({users.filter(u => u.role === 'trainer').length})</SelectItem>
                               <SelectItem value="parent">{copy.parents} ({users.filter(u => u.role === 'parent').length})</SelectItem>
                            </SelectContent>
                         </Select>
                      </div>

                      {/* Multi-select countries */}
                      <div className="space-y-1" ref={countryDropdownRef}>
                         <Label className="text-xs font-bold text-slate-700">{copy.countryFilter}</Label>
                         <div className="relative">
                            <button
                              type="button"
                              onClick={() => setCountryDropdownOpen(o => !o)}
                              className="w-full h-9 px-3 flex items-center justify-between border border-slate-200 rounded-md bg-white text-xs text-slate-700 hover:border-slate-300 focus:outline-none"
                            >
                              <span className="truncate">
                                {targetCountries.length === 0
                                  ? withCount(copy.allCountries, users.length)
                                  : withCount(copy.selectedCountries, targetCountries.length)}
                              </span>
                              <ChevronDown className="w-3 h-3 text-slate-400 shrink-0" />
                            </button>
                            {countryDropdownOpen && (
                              <div className="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-xl max-h-52 overflow-y-auto">
                                {/* Select all / clear */}
                                <div className="flex items-center justify-between px-3 py-2 border-b border-slate-100">
                                  <button type="button" onClick={() => setTargetCountries(uniqueCountries as string[])} className="text-[10px] text-emerald-600 font-bold hover:underline">{copy.selectAll}</button>
                                  <button type="button" onClick={() => setTargetCountries([])} className="text-[10px] text-slate-400 hover:underline">{copy.clearAll}</button>
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
                         <Label className="text-xs font-bold text-slate-700">{copy.campaignType}</Label>
                         <Select onValueChange={setCampaignType} defaultValue="promo">
                            <SelectTrigger className="h-9 text-xs border-slate-200">
                               <SelectValue placeholder={copy.selectType} />
                            </SelectTrigger>
                            <SelectContent className="text-xs">
                               <SelectItem value="promo">{copy.types.promo}</SelectItem>
                               <SelectItem value="awareness">{copy.types.awareness}</SelectItem>
                               <SelectItem value="notification">{copy.types.notification}</SelectItem>
                               <SelectItem value="administrative">{copy.types.administrative}</SelectItem>
                            </SelectContent>
                         </Select>
                      </div>

                      <div className="space-y-1 md:col-span-2">
                         <Label className="text-xs font-bold text-slate-700">{copy.campaignTemplate}</Label>
                         <ChatAmanTemplateSelector onSelect={handleSelectTemplate} />
                      </div>
                   </div>

                   {/* ─── Variables Mapping ─────────────────────────────────────── */}
                   {selectedTemplate && varMappings.length > 0 && (
                     <div className="border border-slate-100 rounded-xl p-3 bg-slate-50/60 space-y-2">
                       <div className="flex items-center gap-1.5 mb-1">
                         <Tag className="w-3.5 h-3.5 text-purple-500" />
                         <p className="text-xs font-bold text-slate-700">{copy.templateVariables}</p>
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
                               {(Object.keys(copy.varSources) as VarSource[]).map(src => (
                                 <SelectItem key={src} value={src}>{copy.varSources[src]}</SelectItem>
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
                               placeholder={copy.customPlaceholder}
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
                         <h4 className="text-[10px] font-bold text-amber-800">{copy.safeModeTitle}</h4>
                         <p className="text-[9px] text-amber-700 leading-relaxed mt-0.5">{copy.safeModeDescription}</p>
                      </div>
                   </div>

                   {/* Trigger Click and Progress Bar */}
                   {campaign.status === 'running' ? (
                     <div className="space-y-2">
                       <div className="flex items-center justify-between text-xs text-slate-600">
                         <span className="flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin text-emerald-500" /> {copy.sending}</span>
                         <span className="font-bold">{campaign.progress}%</span>
                       </div>
                       <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                         <div className="h-full bg-gradient-to-r from-emerald-500 to-green-600 transition-all duration-300" style={{ width: `${campaign.progress}%` }} />
                       </div>
                       <div className="flex gap-4 text-[10px] text-slate-500">
                         <span className="text-emerald-600 font-bold">✅ {campaign.success} {copy.succeeded}</span>
                         <span className="text-rose-500 font-bold">❌ {campaign.failed} {copy.failed}</span>
                         <span>{withCount(copy.ofTotal, campaign.total)}</span>
                       </div>
                     </div>
                   ) : (
                     <Button onClick={handleStartCampaign}
                       className="w-full h-10 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-white font-bold text-xs rounded-xl shadow-lg flex items-center justify-center gap-1.5">
                       <Send className="w-3.5 h-3.5 ml-0.5" />
                       {copy.launch}
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
                  {copy.targetsTitle}
               </CardTitle>
               <CardDescription className="text-[10px] text-slate-400">{copy.targetsDescription}</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 p-4 flex flex-col justify-between">
               <div className="space-y-2 flex-1">
                  {[
                     { label: copy.sportsAcademies, count: users.filter(u => u.role === 'academy').length.toString(), color: "from-blue-500 to-indigo-600" },
                     { label: copy.registeredPlayers, count: users.filter(u => u.role === 'player').length.toString(), color: "from-teal-500 to-emerald-600" },
                     { label: copy.trainersParents, count: (users.filter(u => u.role === 'trainer').length + users.filter(u => u.role === 'parent').length).toString(), color: "from-amber-500 to-orange-600" }
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
                     <p className="text-[10px] font-bold text-slate-500 mb-1">{copy.geographicDistribution}</p>
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
                  <p className="font-bold text-slate-600 text-[10px]">{copy.safeSchedule}</p>
                  <p className="text-[9px] text-slate-400">{copy.deliveryGuarantee}</p>
               </div>
            </CardContent>
         </Card>
      </div>
    </div>
  );
};
