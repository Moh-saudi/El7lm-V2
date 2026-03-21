"use client";

import { useEffect, useState } from "react";
import { Form } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Save, Briefcase, Edit, X, AlertCircle, Award } from "lucide-react";
import { usePlayerProfile } from "./hooks/usePlayerProfile";
import { toast } from "sonner";
import { PersonalTab } from "./_components/PersonalTab";
import { SportsTab } from "./_components/SportsTab";
import { MediaTab } from "./_components/MediaTab";
import { ObjectivesTab } from "./_components/ObjectivesTab";

import { MedicalTab } from "./_components/MedicalTab";
import { SkillsTab } from "./_components/SkillsTab";
import { EducationTab } from "./_components/EducationTab";
import { ContractsTab } from "./_components/ContractsTab";

const REQUIRED_PROFILE_FIELDS = [
  { key: 'name',        label: 'الاسم الكامل' },
  { key: 'nationality', label: 'الجنسية' },
  { key: 'position',    label: 'المركز' },
  { key: 'phone',       label: 'رقم الهاتف' },
  { key: 'birth_date',  label: 'تاريخ الميلاد' },
  { key: 'country',     label: 'الدولة' },
];

// Placeholder for pending tabs
const PlaceholderTab = ({ title, icon: Icon }: { title: string, icon: any }) => (
  <div className="flex flex-col items-center justify-center p-12 text-center border-2 border-dashed rounded-xl bg-gray-50 mt-4 animate-in fade-in zoom-in-50 duration-500">
    <div className="p-4 bg-white rounded-full mb-4 shadow-sm">
      <Icon className="w-12 h-12 text-gray-300" />
    </div>
    <h3 className="text-xl font-semibold text-gray-700 mb-2">{title}</h3>
    <p className="text-gray-500 max-w-sm mx-auto">هذا القسم قيد التطوير حالياً، سيتم إتاحته قريباً بمميزات متقدمة.</p>
  </div>
);

export default function PlayerProfilePage() {

  const { form, loading, saving, saveProfile, user, isEditing, setIsEditing } = usePlayerProfile();
  const [errorTabs, setErrorTabs] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState("personal");
  const [showCompletionBanner, setShowCompletionBanner] = useState(false);

  const BANNER_SNOOZE_KEY = `player_profile_banner_snoozed_${user?.uid}`;
  const SNOOZE_DAYS = 3;
  const formValues = form.watch();

  const missingFields = REQUIRED_PROFILE_FIELDS.filter(({ key }) => {
    const val = formValues[key as keyof typeof formValues];
    return !val || (typeof val === 'string' && !val.trim());
  });

  useEffect(() => {
    if (loading || missingFields.length === 0) return;
    const snoozedAt = localStorage.getItem(BANNER_SNOOZE_KEY);
    if (snoozedAt) {
      const daysSince = (Date.now() - Number(snoozedAt)) / (1000 * 60 * 60 * 24);
      if (daysSince < SNOOZE_DAYS) return;
    }
    setShowCompletionBanner(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  const onInvalid = (errors: any) => {
    const errorFields = Object.keys(errors);
    if (errorFields.length > 0) {
      const fieldToTab: Record<string, string> = {
        // Personal
        name: 'personal', birth_date: 'personal', gender: 'personal', nationality: 'personal',
        country: 'personal', city: 'personal', phone: 'personal', email: 'personal',
        whatsapp: 'personal', address: 'personal', guardian_name: 'personal', guardian_phone: 'personal',

        // Sports
        position: 'sports', detailed_position: 'sports', secondary_position: 'sports',
        jersey_number: 'sports', foot: 'sports', height: 'sports', weight: 'sports',
        club_history: 'sports', achievements: 'sports', private_coaches: 'sports', academies: 'sports',

        // Skills
        stats_pace: 'skills', stats_shooting: 'skills', stats_passing: 'skills',
        stats_dribbling: 'skills', stats_defending: 'skills', stats_physical: 'skills',
        mentality_vision: 'skills', mentality_leadership: 'skills', mentality_composure: 'skills',
        mentality_teamwork: 'skills', mentality_aggression: 'skills',
        skill_moves: 'skills', weak_foot: 'skills', work_rate_attack: 'skills', work_rate_defense: 'skills',

        // Objectives
        objectives: 'objectives',

        // Education
        education_level: 'education', university: 'education', school_name: 'education',
        graduation_year: 'education', university_name: 'education', languages: 'education', courses: 'education',

        // Medical
        blood_type: 'medical', chronic_diseases: 'medical', surgeries_list: 'medical',
        allergies_list: 'medical', medications: 'medical', injuries: 'medical',
        family_history: 'medical', last_checkup: 'medical',

        // Contracts
        contract_history: 'contracts', agent_history: 'contracts', official_contact: 'contracts',
        agent_name: 'contracts', agent_phone: 'contracts',

        // Media
        videos: 'media', images: 'media', documents: 'media', social_links: 'media',
        instagram_handle: 'media', transfermarkt_url: 'media',
      };

      const uniqueErrorTabs = Array.from(new Set(errorFields.map(field => fieldToTab[field]).filter(Boolean)));
      setErrorTabs(uniqueErrorTabs);

      const tabLabels: Record<string, string> = {
        personal: 'البيانات الشخصية', sports: 'المعلومات الرياضية', skills: 'المهارات',
        education: 'التعليم', medical: 'الطبي', contracts: 'العقود', media: 'الوسائط',
      };

      const errorLabels = uniqueErrorTabs.map(t => tabLabels[t] || t);

      toast.error(
        <div className="flex flex-col gap-1">
          <span className="font-bold">تنبيه: لم يتم الحفظ لوجود بيانات ناقصة</span>
          <span className="text-sm">يرجى مراجعة التبويبات التالية: {errorLabels.join('، ')}</span>
        </div>
        , { duration: 5000 });

      // Auto-switch to first error tab
      if (uniqueErrorTabs.length > 0) {
        setActiveTab(uniqueErrorTabs[0]);
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50" dir="rtl">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto mb-4" />
          <p className="text-gray-500 font-medium">جاري تحميل الملف الشخصي...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50/50 pb-20 text-right" dir="rtl">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(saveProfile, onInvalid)} className="space-y-8">

          {/* Header */}
          <div className="hidden">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 tracking-tight">الملف الشخصي</h1>
                <p className="text-sm text-gray-500">إدارة معلوماتك الرياضية والشخصية</p>
              </div>

              {!isEditing ? (
                <Button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="flex bg-black hover:bg-black/90 text-white min-w-[140px] shadow-sm transition-all hover:shadow-md active:scale-95 gap-2"
                >
                  <Edit className="w-4 h-4" />
                  تعديل الملف
                </Button>
              ) : (
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsEditing(false)}
                    disabled={saving}
                    className="min-w-[100px]"
                  >
                    <X className="w-4 h-4 ml-2" />
                    إلغاء
                  </Button>
                  <Button
                    type="submit"
                    disabled={saving}
                    className="bg-green-600 hover:bg-green-700 text-white min-w-[140px] shadow-sm transition-all hover:shadow-md active:scale-95 gap-2"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        جاري الحفظ...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        حفظ التغييرات
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Main Content */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-6" dir="rtl">

              <div className="sticky top-20 z-40 space-y-4 pt-4 pb-2 bg-gray-50/50 backdrop-blur-xl">
                <div className="bg-white rounded-xl border shadow-sm px-6 py-4 flex items-center justify-between">
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900 tracking-tight">الملف الشخصي</h1>
                    <p className="text-sm text-gray-500">إدارة معلوماتك الرياضية والشخصية</p>
                  </div>
                  {!isEditing ? (
                    <Button
                      type="button"
                      onClick={() => setIsEditing(true)}
                      className="flex bg-black hover:bg-black/90 text-white min-w-[140px] shadow-sm transition-all hover:shadow-md active:scale-95 gap-2"
                    >
                      <Edit className="w-4 h-4" />
                      تعديل الملف
                    </Button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsEditing(false)}
                        disabled={saving}
                        className="min-w-[100px]"
                      >
                        <X className="w-4 h-4 ml-2" />
                        إلغاء
                      </Button>
                      <Button
                        type="submit"
                        disabled={saving}
                        className="bg-green-600 hover:bg-green-700 text-white min-w-[140px] shadow-sm transition-all hover:shadow-md active:scale-95 gap-2"
                      >
                        {saving ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            جاري الحفظ...
                          </>
                        ) : (
                          <>
                            <Save className="w-4 h-4" />
                            حفظ التغييرات
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </div>
                <div className="bg-white p-1.5 rounded-xl border shadow-sm">
                  <div className="overflow-x-auto no-scrollbar -mx-1.5 px-1.5">
                    <TabsList className="inline-flex w-auto justify-start h-auto gap-2 bg-transparent p-0">
                      {[
                        { value: "personal", label: "البيانات الشخصية" },
                        { value: "sports", label: "المعلومات الرياضية" },
                        { value: "skills", label: "المهارات" },
                        { value: "objectives", label: "الأهداف" },
                        { value: "education", label: "التعليم" },
                        { value: "medical", label: "الطبي" },
                        { value: "contracts", label: "العقود" },
                        { value: "media", label: "الوسائط" },
                      ].map((tab) => (
                        <TabsTrigger
                          key={tab.value}
                          value={tab.value}
                          className="flex-none min-w-[100px] px-6 py-2.5 rounded-lg font-medium text-gray-500 transition-all data-[state=active]:bg-black data-[state=active]:text-white data-[state=active]:shadow-md hover:bg-gray-50 text-sm whitespace-nowrap"
                        >
                          <span className="flex items-center gap-2">
                            {tab.label}
                            {errorTabs.includes(tab.value) && (
                              <AlertCircle className="w-4 h-4 text-red-500 animate-pulse" />
                            )}
                          </span>
                        </TabsTrigger>
                      ))}
                    </TabsList>
                  </div>
                </div>
              </div>

              {showCompletionBanner && !isEditing && (
                <div className="flex gap-4 items-start p-4 mb-6 bg-amber-50 rounded-xl border-2 border-amber-300 shadow-sm">
                  <div className="flex-shrink-0 mt-0.5 p-2 bg-amber-100 rounded-full">
                    <Award className="w-5 h-5 text-amber-600" />
                  </div>
                  <div className="flex-1">
                    <p className="mb-1 text-sm font-bold text-amber-800">الملف الشخصي غير مكتمل</p>
                    <p className="mb-2 text-xs text-amber-700">أكمل بياناتك الأساسية لتحسين ظهورك وجذب الفرص. الحقول الناقصة:</p>
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {missingFields.map(({ label }) => (
                        <span key={label} className="px-2 py-0.5 text-xs font-medium text-amber-700 bg-amber-100 rounded-full border border-amber-300">
                          {label}
                        </span>
                      ))}
                    </div>
                    <div className="flex gap-3 items-center">
                      <button
                        type="button"
                        onClick={() => { setIsEditing(true); setActiveTab('personal'); }}
                        className="px-4 py-1.5 text-xs font-semibold text-white bg-amber-500 rounded-lg transition hover:bg-amber-600"
                      >
                        استكمال البيانات الآن
                      </button>
                      <span className="text-xs text-amber-500">سيتم تذكيرك مجدداً بعد {SNOOZE_DAYS} أيام عند الإغلاق</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => { localStorage.setItem(BANNER_SNOOZE_KEY, String(Date.now())); setShowCompletionBanner(false); }}
                    className="text-amber-400 hover:text-amber-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              <fieldset disabled={!isEditing} className="group-disabled:pointer-events-none min-h-[500px] mt-6">
                <div className={`transition-opacity duration-300 ${!isEditing ? 'opacity-80 pointer-events-none' : 'opacity-100'}`}>
                  <TabsContent value="personal" className="mt-0 focus-visible:outline-none animate-in fade-in slide-in-from-bottom-2">
                    <PersonalTab />
                  </TabsContent>

                  <TabsContent value="sports" className="mt-0 focus-visible:outline-none animate-in fade-in slide-in-from-bottom-2">
                    <SportsTab />
                  </TabsContent>

                  <TabsContent value="skills" className="mt-0 focus-visible:outline-none animate-in fade-in slide-in-from-bottom-2"><SkillsTab /></TabsContent>
                  <TabsContent value="objectives" className="mt-0 focus-visible:outline-none animate-in fade-in slide-in-from-bottom-2"><ObjectivesTab /></TabsContent>
                  <TabsContent value="education" className="mt-0 focus-visible:outline-none animate-in fade-in slide-in-from-bottom-2"><EducationTab /></TabsContent>
                  <TabsContent value="medical" className="mt-0 focus-visible:outline-none animate-in fade-in slide-in-from-bottom-2"><MedicalTab /></TabsContent>
                  <TabsContent value="contracts" className="mt-0 focus-visible:outline-none animate-in fade-in slide-in-from-bottom-2"><ContractsTab /></TabsContent>
                  <TabsContent value="media" className="mt-0 focus-visible:outline-none animate-in fade-in slide-in-from-bottom-2"><MediaTab /></TabsContent>
                </div>
              </fieldset>

            </Tabs>
          </div>

          {/* Mobile Save Bar */}
          <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/80 backdrop-blur-md border-t border-gray-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] z-50 md:hidden">
            {!isEditing ? (
              <Button
                type="button"
                onClick={() => setIsEditing(true)}
                className="w-full bg-black hover:bg-black/90 text-white shadow-md active:scale-95 gap-2 h-12 text-lg font-bold rounded-xl"
              >
                <Edit className="w-5 h-5" />
                تعديل الملف
              </Button>
            ) : (
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsEditing(false)}
                  disabled={saving}
                  className="flex-1 h-12 text-lg font-bold rounded-xl"
                >
                  إلغاء
                </Button>
                <Button
                  type="submit"
                  disabled={saving}
                  className="flex-[2] bg-green-600 hover:bg-green-700 text-white shadow-md active:scale-95 gap-2 h-12 text-lg font-bold rounded-xl"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      جاري الحفظ...
                    </>
                  ) : (
                    <>
                      <Save className="w-5 h-5" />
                      حفظ التغييرات
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        </form>
      </Form>
    </div>
  );
}
