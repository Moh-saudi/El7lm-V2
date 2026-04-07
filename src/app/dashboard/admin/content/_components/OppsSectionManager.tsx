'use client';

import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { Save, Check, X } from 'lucide-react';
import { getOppsSection, saveOppsSection, OppsSectionData } from '@/lib/content/opps-section-service';
import { getExploreOpportunities } from '@/lib/firebase/opportunities';
import { Opportunity } from '@/types/opportunities';

export default function OppsSectionManager() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [availableOpps, setAvailableOpps] = useState<Opportunity[]>([]);
  const [data, setData] = useState<OppsSectionData>({
    isEnabled: true,
    titleAr: '',
    subAr: '',
    titleEn: '',
    subEn: '',
    selectedOpportunityIds: []
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await getOppsSection();
      const opps = await getExploreOpportunities();
      setAvailableOpps(opps || []);
      setData({ ...res, selectedOpportunityIds: res.selectedOpportunityIds || [] });
    } catch (error) {
      toast.error('حدث خطأ أثناء تحميل بيانات قسم الفرص');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const success = await saveOppsSection(data);
      if (success) {
        toast.success('تم حفظ بيانات قسم الفرص بنجاح');
      } else {
        throw new Error('Failed to save');
      }
    } catch (error) {
      toast.error('حدث خطأ أثناء الحفظ');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setData((prev) => ({ ...prev, [name]: value }));
  };

  const toggleEnabled = () => {
    setData((prev) => ({ ...prev, isEnabled: !prev.isEnabled }));
  };

  const toggleOpportunity = (id: string) => {
    setData(prev => {
      const selected = prev.selectedOpportunityIds || [];
      if (selected.includes(id)) {
        return { ...prev, selectedOpportunityIds: selected.filter(oppId => oppId !== id) };
      } else {
        if (selected.length >= 4) {
          toast.error('يمكنك اختيار 4 فرص كحد أقصى للظهور في الصفحة الرئيسية');
          return prev;
        }
        return { ...prev, selectedOpportunityIds: [...selected, id] };
      }
    });
  };

  if (loading) {
    return <div className="text-center p-8">جاري التحميل...</div>;
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-800 dark:text-white">إعدادات قسم الفرص المتاحة</h2>
        <div className="flex items-center gap-4">
          <button
            onClick={toggleEnabled}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
              data.isEnabled 
                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
                : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
            }`}
          >
            {data.isEnabled ? <><Check size={18} /> مفعل</> : <><X size={18} /> معطل</>}
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
          >
            <Save size={18} />
            {saving ? 'جاري الحفظ...' : 'حفظ التغييرات'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-slate-700 dark:text-gray-200 border-b pb-2">النصوص (عربي)</h3>
          
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">
              العنوان الرئيسي
            </label>
            <input
              type="text"
              name="titleAr"
              value={data.titleAr}
              onChange={handleChange}
              className="w-full p-2 border border-slate-300 dark:border-gray-600 rounded bg-white dark:bg-[#0b1120] text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">
              النص الفرعي (الوصف)
            </label>
            <textarea
              name="subAr"
              value={data.subAr}
              onChange={handleChange}
              rows={3}
              className="w-full p-2 border border-slate-300 dark:border-gray-600 rounded bg-white dark:bg-[#0b1120] text-slate-900 dark:text-white"
            />
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-bold text-slate-700 dark:text-gray-200 border-b pb-2">النصوص (إنجليزي)</h3>
          
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">
              العنوان الرئيسي
            </label>
            <input
              type="text"
              name="titleEn"
              value={data.titleEn}
              onChange={handleChange}
              dir="ltr"
              className="w-full p-2 border border-slate-300 dark:border-gray-600 rounded bg-white dark:bg-[#0b1120] text-slate-900 dark:text-white text-left"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">
              النص الفرعي (الوصف)
            </label>
            <textarea
              name="subEn"
              value={data.subEn}
              onChange={handleChange}
              rows={3}
              dir="ltr"
              className="w-full p-2 border border-slate-300 dark:border-gray-600 rounded bg-white dark:bg-[#0b1120] text-slate-900 dark:text-white text-left"
            />
          </div>
        </div>
      </div>

      <div className="space-y-4 mt-8 pt-8 border-t border-slate-200 dark:border-white/10">
        <h3 className="text-lg font-bold text-slate-700 dark:text-gray-200">اختر الفرص للظهور (بحد أقصى 4)</h3>
        <p className="text-sm text-slate-500 dark:text-gray-400 mb-4">هذه الفرص هي التي ستظهر للزوار في صفحة الهبوط، وعند الضغط عليها سيُطلب منهم تسجيل الدخول.</p>
        
        {availableOpps.length === 0 ? (
          <p className="text-slate-500 text-center py-4 bg-slate-50 dark:bg-white/5 rounded-lg">لا توجد إعلانات فرص نشطة حالياً للتحكم بها.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {availableOpps.map((opp) => (
              <div 
                key={opp.id} 
                onClick={() => toggleOpportunity(opp.id)}
                className={`p-4 border rounded-xl cursor-pointer transition-all ${
                  (data.selectedOpportunityIds || []).includes(opp.id)
                    ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-900/20 shadow-sm'
                    : 'border-slate-200 dark:border-gray-700 hover:border-slate-300 hover:bg-slate-50 dark:hover:bg-white/5'
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-bold text-sm text-slate-800 dark:text-gray-100 line-clamp-1">{opp.title}</h4>
                  <div className={`w-5 h-5 rounded flex items-center justify-center shrink-0 ${
                    (data.selectedOpportunityIds || []).includes(opp.id) ? 'bg-blue-500 text-white' : 'border border-slate-300 dark:border-gray-600'
                  }`}>
                    {(data.selectedOpportunityIds || []).includes(opp.id) && <Check size={14} />}
                  </div>
                </div>
                <div className="text-xs text-slate-500 dark:text-gray-400 space-y-1">
                  <p>المنظم: <span className="font-medium text-slate-700 dark:text-gray-300">{opp.organizerName}</span></p>
                  <p>النوع: <span className="font-medium text-slate-700 dark:text-gray-300 text-[10px] bg-slate-100 dark:bg-gray-800 px-2 py-0.5 rounded">{opp.opportunityType}</span></p>
                  <p>الانتهاء: <span className="font-medium text-slate-700 dark:text-gray-300">{new Date(opp.applicationDeadline).toLocaleDateString('ar-SA')}</span></p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
