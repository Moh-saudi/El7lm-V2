'use client';

import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { Save, Plus, Trash2, Check } from 'lucide-react';
import {
  getStoreSection,
  saveStoreSection,
  StoreSectionData,
} from '@/lib/content/store-section-service';
import { supabase } from '@/lib/supabase/config';

interface ProductLite {
  id: string;
  name: string;
  category: string;
  price: number;
  stock: number;
  image?: string;
}

export default function StoreSectionManager() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState<StoreSectionData | null>(null);
  const [availableProducts, setAvailableProducts] = useState<ProductLite[]>([]);

  useEffect(() => {
    void loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const result = await getStoreSection();
    const { data: products } = await supabase
      .from('inventory')
      .select('id, name, category, price, stock, image')
      .order('createdAt', { ascending: false });

    setAvailableProducts((products || []).filter((item: any) => item?.id && item?.name));
    setData({
      ...result,
      selectedProductIds: result.selectedProductIds || [],
      maxItems: result.maxItems || 6,
    });
    setLoading(false);
  };

  const handleSave = async () => {
    if (!data) return;
    setSaving(true);
    const success = await saveStoreSection(data);
    if (success) {
      toast.success('تم حفظ قسم المتجر بنجاح');
    } else {
      toast.error('حدث خطأ أثناء حفظ قسم المتجر');
    }
    setSaving(false);
  };

  const updateHighlight = (
    locale: 'highlightsAr' | 'highlightsEn',
    index: number,
    field: 'title' | 'desc',
    value: string
  ) => {
    if (!data) return;
    const updated = [...data[locale]];
    updated[index] = { ...updated[index], [field]: value };
    setData({ ...data, [locale]: updated });
  };

  const addHighlight = (locale: 'highlightsAr' | 'highlightsEn') => {
    if (!data) return;
    setData({
      ...data,
      [locale]: [...data[locale], { title: 'عنصر جديد', desc: '' }],
    });
  };

  const removeHighlight = (locale: 'highlightsAr' | 'highlightsEn', index: number) => {
    if (!data) return;
    setData({
      ...data,
      [locale]: data[locale].filter((_, currentIndex) => currentIndex !== index),
    });
  };

  const toggleProduct = (id: string) => {
    if (!data) return;
    const selected = data.selectedProductIds || [];

    if (selected.includes(id)) {
      setData({ ...data, selectedProductIds: selected.filter((productId) => productId !== id) });
      return;
    }

    if (selected.length >= 8) {
      toast.error('يمكنك اختيار 8 منتجات كحد أقصى للقسم');
      return;
    }

    setData({ ...data, selectedProductIds: [...selected, id] });
  };

  if (loading || !data) return <div className="p-8 text-center">جاري تحميل بيانات قسم المتجر...</div>;

  return (
    <div className="space-y-8" dir="rtl">
      <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800">
        <div>
          <h2 className="text-xl font-bold dark:text-white">إدارة قسم المتجر</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            التحكم في النصوص والرسائل التسويقية الخاصة بالمتجر داخل الصفحة الرئيسية.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setData({ ...data, isEnabled: !data.isEnabled })}
            className={`rounded-lg px-4 py-2 font-medium transition-colors ${
              data.isEnabled
                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
            }`}
          >
            {data.isEnabled ? 'القسم مفعل' : 'القسم معطل'}
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2 text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
          >
            <Save size={18} />
            {saving ? 'جاري الحفظ...' : 'حفظ التغييرات'}
          </button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800">
          <h3 className="border-b pb-3 text-lg font-bold dark:text-white dark:border-slate-700">النصوص العربية</h3>
          <input
            value={data.badgeAr}
            onChange={(e) => setData({ ...data, badgeAr: e.target.value })}
            placeholder="شارة القسم"
            className="w-full rounded-lg border border-slate-200 bg-slate-50 p-2 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          />
          <input
            value={data.titleAr}
            onChange={(e) => setData({ ...data, titleAr: e.target.value })}
            placeholder="العنوان الرئيسي"
            className="w-full rounded-lg border border-slate-200 bg-slate-50 p-2 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          />
          <textarea
            value={data.subAr}
            onChange={(e) => setData({ ...data, subAr: e.target.value })}
            rows={4}
            placeholder="الوصف"
            className="w-full rounded-lg border border-slate-200 bg-slate-50 p-2 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          />
          <input
            value={data.ctaAr}
            onChange={(e) => setData({ ...data, ctaAr: e.target.value })}
            placeholder="زر المتجر"
            className="w-full rounded-lg border border-slate-200 bg-slate-50 p-2 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          />
          <input
            value={data.secondaryAr}
            onChange={(e) => setData({ ...data, secondaryAr: e.target.value })}
            placeholder="زر خيارات الدفع"
            className="w-full rounded-lg border border-slate-200 bg-slate-50 p-2 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          />
        </div>

        <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800">
          <h3 className="border-b pb-3 text-lg font-bold dark:text-white dark:border-slate-700">النصوص الإنجليزية</h3>
          <input
            dir="ltr"
            value={data.badgeEn}
            onChange={(e) => setData({ ...data, badgeEn: e.target.value })}
            placeholder="Badge"
            className="w-full rounded-lg border border-slate-200 bg-slate-50 p-2 text-left dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          />
          <input
            dir="ltr"
            value={data.titleEn}
            onChange={(e) => setData({ ...data, titleEn: e.target.value })}
            placeholder="Title"
            className="w-full rounded-lg border border-slate-200 bg-slate-50 p-2 text-left dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          />
          <textarea
            dir="ltr"
            value={data.subEn}
            onChange={(e) => setData({ ...data, subEn: e.target.value })}
            rows={4}
            placeholder="Description"
            className="w-full rounded-lg border border-slate-200 bg-slate-50 p-2 text-left dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          />
          <input
            dir="ltr"
            value={data.ctaEn}
            onChange={(e) => setData({ ...data, ctaEn: e.target.value })}
            placeholder="Store CTA"
            className="w-full rounded-lg border border-slate-200 bg-slate-50 p-2 text-left dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          />
          <input
            dir="ltr"
            value={data.secondaryEn}
            onChange={(e) => setData({ ...data, secondaryEn: e.target.value })}
            placeholder="Secondary CTA"
            className="w-full rounded-lg border border-slate-200 bg-slate-50 p-2 text-left dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          />
        </div>
      </div>

      <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800">
        <div className="grid gap-4 md:grid-cols-2 md:items-end">
          <div>
            <h3 className="mb-2 text-lg font-bold dark:text-white">إعدادات عرض المنتجات</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              اختر المنتجات التي ستظهر في الصفحة الرئيسية، أو اترك الاختيار فارغًا ليتم عرض أحدث المنتجات تلقائيًا.
            </p>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
              عدد المنتجات المعروضة
            </label>
            <input
              type="number"
              min={1}
              max={8}
              value={data.maxItems || 6}
              onChange={(e) =>
                setData({
                  ...data,
                  maxItems: Math.max(1, Math.min(8, Number(e.target.value || 6))),
                })
              }
              className="w-full rounded-lg border border-slate-200 bg-slate-50 p-2 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            />
          </div>
        </div>

        <div className="flex items-center justify-between border-t pt-4 dark:border-slate-700">
          <div>
            <h4 className="font-bold dark:text-white">المنتجات المختارة</h4>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              تم اختيار {(data.selectedProductIds || []).length} منتج
            </p>
          </div>
        </div>

        {availableProducts.length === 0 ? (
          <div className="rounded-lg bg-slate-50 p-4 text-center text-slate-500 dark:bg-slate-900 dark:text-slate-400">
            لا توجد منتجات متاحة في إدارة المتجر حاليًا.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {availableProducts.map((product) => {
              const isSelected = (data.selectedProductIds || []).includes(product.id);

              return (
                <button
                  key={product.id}
                  type="button"
                  onClick={() => toggleProduct(product.id)}
                  className={`rounded-xl border p-4 text-right transition-all ${
                    isSelected
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-slate-200 bg-white hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900'
                  }`}
                >
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate font-bold text-slate-800 dark:text-white">{product.name}</div>
                      <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{product.category}</div>
                    </div>
                    <div
                      className={`flex h-5 w-5 items-center justify-center rounded ${
                        isSelected
                          ? 'bg-blue-600 text-white'
                          : 'border border-slate-300 dark:border-slate-600'
                      }`}
                    >
                      {isSelected && <Check size={12} />}
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                      {Number(product.price || 0).toLocaleString()} ر.س
                    </span>
                    <span className="text-slate-500 dark:text-slate-400">المخزون: {product.stock || 0}</span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {(['highlightsAr', 'highlightsEn'] as const).map((localeKey) => {
          const isArabic = localeKey === 'highlightsAr';
          const items = data[localeKey];

          return (
            <div key={localeKey} className="space-y-4">
              <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800">
                <h3 className="text-lg font-bold dark:text-white">
                  {isArabic ? 'نقاط البيع - عربي' : 'Highlights - English'}
                </h3>
                <button
                  onClick={() => addHighlight(localeKey)}
                  className="flex items-center gap-1 rounded-lg bg-blue-100 px-3 py-1.5 text-sm text-blue-700 transition-colors hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-400"
                >
                  <Plus size={16} />
                  إضافة
                </button>
              </div>

              {items.map((item, index) => (
                <div key={`${localeKey}-${index}`} className="relative rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
                  <button
                    onClick={() => removeHighlight(localeKey, index)}
                    className="absolute left-2 top-2 rounded-lg bg-red-100 p-1.5 text-red-600 transition-colors hover:bg-red-200"
                  >
                    <Trash2 size={16} />
                  </button>

                  <div className="space-y-3">
                    <input
                      dir={isArabic ? 'rtl' : 'ltr'}
                      value={item.title}
                      onChange={(e) => updateHighlight(localeKey, index, 'title', e.target.value)}
                      placeholder={isArabic ? 'عنوان النقطة' : 'Highlight title'}
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 p-2 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                    />
                    <textarea
                      dir={isArabic ? 'rtl' : 'ltr'}
                      value={item.desc}
                      onChange={(e) => updateHighlight(localeKey, index, 'desc', e.target.value)}
                      rows={3}
                      placeholder={isArabic ? 'وصف النقطة' : 'Highlight description'}
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 p-2 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                    />
                  </div>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
