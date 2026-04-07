import React, { useState, useEffect } from 'react';
import { getAiSection, saveAiSection, AiSectionData } from '@/lib/content/ai-section-service';
import { toast } from 'react-hot-toast';
import { Save, Plus, Trash2 } from 'lucide-react';

export default function AiSectionManager() {
  const [data, setData] = useState<AiSectionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const res = await getAiSection();
    setData(res);
    setLoading(false);
  };

  const handleSave = async () => {
    if (!data) return;
    setSaving(true);
    const success = await saveAiSection(data);
    if (success) {
      toast.success('تم حفظ قسـم الذكاء الاصطناعي بنجاح');
    } else {
      toast.error('حدث خطأ أثناء الحفظ');
    }
    setSaving(false);
  };

  const updateFeature = (index: number, field: string, value: string) => {
    if (!data) return;
    const newFeatures = [...data.features];
    newFeatures[index] = { ...newFeatures[index], [field]: value };
    setData({ ...data, features: newFeatures });
  };

  const addFeature = () => {
    if (!data) return;
    setData({
      ...data,
      features: [...data.features, { title: 'ميزة جديدة', desc: '', color: '#bdc4ef', icon: 'star' }]
    });
  };

  const removeFeature = (index: number) => {
    if (!data) return;
    const newFeatures = data.features.filter((_, i) => i !== index);
    setData({ ...data, features: newFeatures });
  };

  if (loading || !data) return <div className="text-center p-8">جاري التحميل...</div>;

  return (
    <div className="space-y-8" dir="rtl">
      <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
        <div>
          <h2 className="text-xl font-bold dark:text-white">إدارة قسم الذكاء الاصطناعي</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm">تعديل النصوص والمميزات المعروضة في الصفحة الرئيسية</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 bg-[#84d993] text-[#003916] px-4 py-2 rounded-lg font-medium hover:bg-[#72c581] transition-colors disabled:opacity-50"
        >
          <Save size={18} />
          {saving ? 'جاري الحفظ...' : 'حفظ التعديلات'}
        </button>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-4 bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700">
          <h3 className="font-bold text-lg dark:text-white border-b dark:border-slate-700 pb-3">النصوص الرئيسية</h3>
          
          <div>
            <label className="block text-sm font-medium mb-1 dark:text-slate-300">الشارة (Badge)</label>
            <input
              type="text"
              value={data.badge}
              onChange={(e) => setData({ ...data, badge: e.target.value })}
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 dark:text-slate-300">العنوان الأبرز</label>
            <input
              type="text"
              value={data.title}
              onChange={(e) => setData({ ...data, title: e.target.value })}
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 dark:text-slate-300">الوصف</label>
            <textarea
              value={data.desc}
              onChange={(e) => setData({ ...data, desc: e.target.value })}
              rows={4}
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2 dark:text-white"
            />
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
            <h3 className="font-bold text-lg dark:text-white">المميزات ({data.features.length})</h3>
            <button
              onClick={addFeature}
              className="flex items-center gap-1 text-sm bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 px-3 py-1.5 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
            >
              <Plus size={16} /> إضافة ميزة
            </button>
          </div>

          <div className="space-y-4">
            {data.features.map((feature, index) => (
              <div key={index} className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 relative group">
                <button
                  onClick={() => removeFeature(index)}
                  className="absolute top-2 left-2 p-1.5 bg-red-100 text-red-600 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 size={16} />
                </button>
                
                <div className="grid grid-cols-2 gap-4 mb-3">
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">اللون Hex</label>
                    <div className="flex gap-2">
                       <input
                          type="color"
                          value={feature.color}
                          onChange={(e) => updateFeature(index, 'color', e.target.value)}
                          className="h-8 w-8 rounded cursor-pointer border-0 p-0"
                        />
                       <input
                         type="text"
                         value={feature.color}
                         onChange={(e) => updateFeature(index, 'color', e.target.value)}
                         className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded p-1 text-sm dark:text-white"
                       />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">رمز الأيقونة (Material)</label>
                    <input
                      type="text"
                      value={feature.icon}
                      onChange={(e) => updateFeature(index, 'icon', e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded p-1 text-sm dark:text-white"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <input
                    type="text"
                    value={feature.title}
                    onChange={(e) => updateFeature(index, 'title', e.target.value)}
                    placeholder="عنوان الميزة"
                    className="w-full font-bold bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded p-2 text-sm dark:text-white"
                  />
                  <textarea
                    value={feature.desc}
                    onChange={(e) => updateFeature(index, 'desc', e.target.value)}
                    placeholder="وصف الميزة"
                    rows={2}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded p-2 text-sm dark:text-white"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
