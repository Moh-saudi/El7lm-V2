
'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase/config';
import { storageManager } from '@/lib/storage';
import toast from 'react-hot-toast';
import {
  AlertTriangle,
  Edit,
  ImagePlus,
  Package,
  Plus,
  RefreshCw,
  Search,
  Star,
  Trash2,
} from 'lucide-react';

type InventoryStatus = 'in_stock' | 'low_stock' | 'out_of_stock' | 'discontinued';
type InventoryCategory = 'equipment' | 'clothing' | 'accessories' | 'nutrition' | 'electronics' | 'other';

interface InventoryItem {
  id: string;
  name: string;
  category: InventoryCategory;
  sku: string;
  currency: string;
  brand: string;
  model: string;
  stock: number;
  minStock: number;
  maxStock: number;
  price: number;
  originalPrice: number;
  discountPercent: number;
  cost: number;
  description: string;
  image?: string;
  images: string[];
  isFeatured: boolean;
  flashSaleEndAt: string;
  location: string;
  supplier: string;
  status: InventoryStatus;
  createdAt?: string;
  updatedAt?: string;
}

interface InventoryFormState {
  name: string;
  category: InventoryCategory;
  sku: string;
  currency: string;
  brand: string;
  model: string;
  stock: number;
  minStock: number;
  maxStock: number;
  price: number;
  originalPrice: number;
  discountPercent: number;
  cost: number;
  description: string;
  image: string;
  imagesText: string;
  isFeatured: boolean;
  flashSaleEndAt: string;   // ISO datetime string or empty
  location: string;
  supplier: string;
  status: InventoryStatus;
}

const CATEGORIES: Array<{ value: InventoryCategory; label: string }> = [
  { value: 'equipment', label: 'معدات' },
  { value: 'clothing', label: 'ملابس' },
  { value: 'accessories', label: 'إكسسوارات' },
  { value: 'nutrition', label: 'تغذية' },
  { value: 'electronics', label: 'إلكترونيات' },
  { value: 'other', label: 'أخرى' },
];

const CURRENCIES = [
  { code: 'SAR', label: 'ريال سعودي' },
  { code: 'AED', label: 'درهم إماراتي' },
  { code: 'EGP', label: 'جنيه مصري' },
  { code: 'QAR', label: 'ريال قطري' },
  { code: 'KWD', label: 'دينار كويتي' },
  { code: 'BHD', label: 'دينار بحريني' },
  { code: 'OMR', label: 'ريال عماني' },
  { code: 'USD', label: 'دولار أمريكي' },
  { code: 'EUR', label: 'يورو' },
  { code: 'GBP', label: 'جنيه إسترليني' },
];

const STATUS_LABELS: Record<InventoryStatus, string> = {
  in_stock: 'متوفر',
  low_stock: 'مخزون منخفض',
  out_of_stock: 'نفد المخزون',
  discontinued: 'موقوف',
};

const STATUS_STYLES: Record<InventoryStatus, string> = {
  in_stock: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  low_stock: 'bg-amber-100 text-amber-800 border-amber-200',
  out_of_stock: 'bg-rose-100 text-rose-800 border-rose-200',
  discontinued: 'bg-slate-100 text-slate-700 border-slate-200',
};

const EMPTY_FORM: InventoryFormState = {
  name: '',
  category: 'equipment',
  sku: '',
  currency: 'SAR',
  brand: '',
  model: '',
  stock: 0,
  minStock: 1,
  maxStock: 100,
  price: 0,
  originalPrice: 0,
  discountPercent: 0,
  cost: 0,
  description: '',
  image: '',
  imagesText: '',
  isFeatured: false,
  flashSaleEndAt: '',
  location: '',
  supplier: '',
  status: 'in_stock',
};

function normalizeStatus(stock: number, minStock: number, explicit?: string): InventoryStatus {
  if (explicit === 'discontinued') return 'discontinued';
  if (stock <= 0) return 'out_of_stock';
  if (stock <= minStock) return 'low_stock';
  return 'in_stock';
}

function parseImages(raw: string): string[] {
  return raw.split(/[\n,]+/).map((item) => item.trim()).filter(Boolean);
}

function RequiredMark() {
  return <span className="mr-1 text-rose-500">*</span>;
}

function currencyLabel(code: string) {
  return CURRENCIES.find((item) => item.code === code)?.label || code;
}

function formatMoney(amount: number, currency: string) {
  return `${Number(amount || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} ${currency}`;
}

function toFormState(item: InventoryItem): InventoryFormState {
  return {
    name: item.name,
    category: item.category,
    sku: item.sku,
    currency: item.currency || 'SAR',
    brand: item.brand || '',
    model: item.model || '',
    stock: item.stock,
    minStock: item.minStock,
    maxStock: item.maxStock,
    price: item.price,
    originalPrice: item.originalPrice || 0,
    discountPercent: item.discountPercent || 0,
    cost: item.cost,
    description: item.description || '',
    image: item.image || '',
    imagesText: item.images.join('\n'),
    isFeatured: Boolean(item.isFeatured),
    flashSaleEndAt: item.flashSaleEndAt
      ? new Date(item.flashSaleEndAt).toISOString().slice(0, 16)   // 'YYYY-MM-DDTHH:mm'
      : '',
    location: item.location || '',
    supplier: item.supplier || '',
    status: item.status,
  };
}

function fromRow(row: any): InventoryItem | null {
  if (!row?.id || !row?.name) return null;

  const stock = Number(row.stock || 0);
  const minStock = Number(row.minStock || 0);
  const images = Array.isArray(row.images)
    ? row.images.filter((value: unknown): value is string => typeof value === 'string' && value.trim().length > 0)
    : [];
  const primaryImage = row.image || images[0] || '';

  return {
    id: row.id,
    name: String(row.name),
    category: (CATEGORIES.some((item) => item.value === row.category) ? row.category : 'other') as InventoryCategory,
    sku: String(row.sku || ''),
    currency: String(row.currency || 'SAR'),
    brand: String(row.brand || ''),
    model: String(row.model || ''),
    stock,
    minStock,
    maxStock: Number(row.maxStock || 0),
    price: Number(row.price || 0),
    originalPrice: Number(row.original_price || 0),
    discountPercent: Number(row.discount_percent || 0),
    cost: Number(row.cost || 0),
    description: String(row.description || ''),
    image: primaryImage || undefined,
    images,
    isFeatured: Boolean(row.is_featured ?? row.featured),
    flashSaleEndAt: row.flash_sale_end_at || '',
    location: String(row.location || ''),
    supplier: String(row.supplier || ''),
    status: normalizeStatus(stock, minStock, row.status),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export default function InventoryManagementPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingMainImage, setUploadingMainImage] = useState(false);
  const [uploadingGalleryImages, setUploadingGalleryImages] = useState(false);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | InventoryCategory>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | InventoryStatus>('all');
  const [modalMode, setModalMode] = useState<'create' | 'edit' | null>(null);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [formData, setFormData] = useState<InventoryFormState>(EMPTY_FORM);

  useEffect(() => {
    void fetchItems();
  }, []);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesSearch =
        !search.trim() ||
        item.name.toLowerCase().includes(search.toLowerCase()) ||
        item.sku.toLowerCase().includes(search.toLowerCase()) ||
        item.brand.toLowerCase().includes(search.toLowerCase()) ||
        item.model.toLowerCase().includes(search.toLowerCase());

      const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter;
      const matchesStatus = statusFilter === 'all' || item.status === statusFilter;

      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [items, search, categoryFilter, statusFilter]);

  const stats = useMemo(() => {
    const lowStock = items.filter((item) => item.status === 'low_stock').length;
    const outOfStock = items.filter((item) => item.status === 'out_of_stock').length;
    const featured = items.filter((item) => item.isFeatured).length;
    const flashSale = items.filter((item) => item.flashSaleEndAt && new Date(item.flashSaleEndAt) > new Date()).length;
    const inventoryValue = items.reduce((sum, item) => sum + item.cost * item.stock, 0);

    return { total: items.length, lowStock, outOfStock, featured, flashSale, inventoryValue };
  }, [items]);

  async function fetchItems() {
    try {
      setLoading(true);
      const { data, error } = await supabase.from('inventory').select('*').order('createdAt', { ascending: false });
      if (error) throw error;
      const normalized = (data || []).map(fromRow).filter((item): item is InventoryItem => Boolean(item));
      setItems(normalized);
    } catch (error) {
      console.error('Error fetching inventory:', error);
      toast.error('تعذر تحميل منتجات المتجر. تأكد من تنفيذ SQL المتجر على Supabase.');
    } finally {
      setLoading(false);
    }
  }

  function openCreateModal() {
    setSelectedItemId(null);
    setFormData(EMPTY_FORM);
    setModalMode('create');
  }

  function openEditModal(item: InventoryItem) {
    setSelectedItemId(item.id);
    setFormData(toFormState(item));
    setModalMode('edit');
  }

  function closeModal() {
    setModalMode(null);
    setSelectedItemId(null);
    setFormData(EMPTY_FORM);
  }

  function updateForm<K extends keyof InventoryFormState>(key: K, value: InventoryFormState[K]) {
    setFormData((current) => ({ ...current, [key]: value }));
  }

  function buildPayload() {
    const images = parseImages(formData.imagesText);
    const primaryImage = formData.image.trim() || images[0] || null;
    const computedStatus = normalizeStatus(formData.stock, formData.minStock, formData.status);
    const discountPct = Math.max(0, Math.min(100, Number(formData.discountPercent || 0)));
    const origPrice   = Number(formData.originalPrice || 0);

    return {
      name: formData.name.trim(),
      category: formData.category,
      sku: formData.sku.trim(),
      currency: formData.currency,
      brand: formData.brand.trim() || null,
      model: formData.model.trim() || null,
      stock: Number(formData.stock || 0),
      minStock: Number(formData.minStock || 0),
      maxStock: Number(formData.maxStock || 0),
      price: Number(formData.price || 0),
      original_price: origPrice > 0 ? origPrice : null,
      discount_percent: discountPct,
      cost: Number(formData.cost || 0),
      description: formData.description.trim() || null,
      image: primaryImage,
      images,
      is_featured: Boolean(formData.isFeatured),
      flash_sale_end_at: formData.flashSaleEndAt ? new Date(formData.flashSaleEndAt).toISOString() : null,
      location: formData.location.trim() || null,
      supplier: formData.supplier.trim() || null,
      status: computedStatus,
      updatedAt: new Date().toISOString(),
    };
  }

  async function handleSubmit() {
    if (!formData.name.trim() || !formData.sku.trim()) {
      toast.error('يرجى إدخال اسم المنتج ورمز SKU.');
      return;
    }

    if (!formData.category || !formData.currency) {
      toast.error('يرجى تحديد القسم والعملة.');
      return;
    }

    if (Number(formData.price) < 0 || Number(formData.stock) < 0 || Number(formData.minStock) < 0) {
      toast.error('يرجى إدخال قيم صحيحة للسعر والمخزون والحد الأدنى.');
      return;
    }

    try {
      setSaving(true);
      const payload = buildPayload();

      if (modalMode === 'edit' && selectedItemId) {
        const { error } = await supabase.from('inventory').update(payload).eq('id', selectedItemId);
        if (error) throw error;
        toast.success('تم تحديث المنتج بنجاح.');
      } else {
        const { error } = await supabase.from('inventory').insert({
          id: crypto.randomUUID(),
          ...payload,
          createdAt: new Date().toISOString(),
        });
        if (error) throw error;
        toast.success('تمت إضافة المنتج بنجاح.');
      }

      closeModal();
      await fetchItems();
    } catch (error) {
      console.error('Error saving inventory item:', error);
      toast.error('تعذر حفظ بيانات المنتج.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(itemId: string) {
    if (!window.confirm('هل تريد حذف هذا المنتج من المتجر؟')) return;

    try {
      const { error } = await supabase.from('inventory').delete().eq('id', itemId);
      if (error) throw error;
      toast.success('تم حذف المنتج.');
      await fetchItems();
    } catch (error) {
      console.error('Error deleting item:', error);
      toast.error('تعذر حذف المنتج.');
    }
  }

  async function toggleFeatured(item: InventoryItem) {
    try {
      const { error } = await supabase
        .from('inventory')
        .update({ is_featured: !item.isFeatured, updatedAt: new Date().toISOString() })
        .eq('id', item.id);
      if (error) throw error;
      toast.success(!item.isFeatured ? 'تم تمييز المنتج للواجهة الرئيسية.' : 'تمت إزالة تمييز المنتج.');
      await fetchItems();
    } catch (error) {
      console.error('Error updating featured state:', error);
      toast.error('تعذر تحديث حالة التمييز.');
    }
  }

  async function uploadSingleImage(file: File) {
    const safeName = `${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
    const result = await storageManager.upload('content', `store-products/${safeName}`, file, {
      contentType: file.type,
      upsert: true,
    });

    if (!result?.publicUrl) {
      throw new Error('لم يتم إرجاع رابط عام للصورة المرفوعة.');
    }

    return result.publicUrl;
  }

  async function handleMainImageUpload(file: File) {
    try {
      setUploadingMainImage(true);
      const url = await uploadSingleImage(file);
      updateForm('image', url);
      toast.success('تم رفع الصورة الرئيسية بنجاح.');
    } catch (error) {
      console.error('Error uploading main product image:', error);
      toast.error('تعذر رفع الصورة الرئيسية.');
    } finally {
      setUploadingMainImage(false);
    }
  }

  async function handleGalleryImagesUpload(files: FileList | null) {
    if (!files || files.length === 0) return;

    try {
      setUploadingGalleryImages(true);
      const uploadedUrls: string[] = [];

      for (const file of Array.from(files)) {
        const url = await uploadSingleImage(file);
        uploadedUrls.push(url);
      }

      const merged = Array.from(new Set([...parseImages(formData.imagesText), ...uploadedUrls]));
      updateForm('imagesText', merged.join('\n'));

      if (!formData.image.trim() && merged[0]) {
        updateForm('image', merged[0]);
      }

      toast.success(`تم رفع ${uploadedUrls.length} صورة إضافية بنجاح.`);
    } catch (error) {
      console.error('Error uploading gallery images:', error);
      toast.error('تعذر رفع الصور الإضافية.');
    } finally {
      setUploadingGalleryImages(false);
    }
  }

  function removeGalleryImage(url: string) {
    const nextImages = parseImages(formData.imagesText).filter((image) => image !== url);
    updateForm('imagesText', nextImages.join('\n'));

    if (formData.image.trim() === url) {
      updateForm('image', nextImages[0] || '');
    }
  }

  function setMainImage(url: string) {
    updateForm('image', url);
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="flex items-center gap-3 text-3xl font-black text-slate-900">
                <Package className="h-8 w-8 text-blue-600" /> إدارة منتجات المتجر
              </h1>
              <p className="mt-2 max-w-3xl text-sm text-slate-600">
                أضف منتجات حقيقية مع العملة المناسبة، الماركة، الموديل، والصور المتعددة حتى تظهر بشكل صحيح في المتجر المشترك والواجهة الرئيسية.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => void fetchItems()} className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 font-bold text-slate-700 transition hover:bg-slate-50">
                <RefreshCw className="h-4 w-4" /> تحديث
              </button>
              <button type="button" onClick={openCreateModal} className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-4 py-2 font-bold text-white transition hover:bg-blue-700">
                <Plus className="h-4 w-4" /> إضافة منتج
              </button>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200"><div className="text-sm font-bold text-slate-500">إجمالي المنتجات</div><div className="mt-3 text-3xl font-black text-slate-900">{stats.total}</div></div>
          <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200"><div className="text-sm font-bold text-slate-500">مخزون منخفض</div><div className="mt-3 text-3xl font-black text-amber-600">{stats.lowStock}</div></div>
          <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200"><div className="text-sm font-bold text-slate-500">منتجات مميزة ⭐</div><div className="mt-3 text-3xl font-black text-fuchsia-600">{stats.featured}</div></div>
          <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200"><div className="text-sm font-bold text-slate-500">فلاش سيل نشط ⚡</div><div className="mt-3 text-3xl font-black text-rose-600">{stats.flashSale}</div></div>
          <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200"><div className="text-sm font-bold text-slate-500">قيمة التكلفة</div><div className="mt-3 text-3xl font-black text-emerald-700">{stats.inventoryValue.toLocaleString('en-US', { maximumFractionDigits: 2 })}</div></div>
        </section>

        <section className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
          <div className="grid gap-3 lg:grid-cols-[1.4fr_220px_220px]">
            <div className="relative">
              <Search className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="ابحث بالاسم أو SKU أو الماركة أو الموديل" className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-12 text-sm outline-none transition focus:border-blue-400 focus:bg-white" />
            </div>
            <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value as 'all' | InventoryCategory)} className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm outline-none transition focus:border-blue-400 focus:bg-white">
              <option value="all">كل الأقسام</option>
              {CATEGORIES.map((category) => <option key={category.value} value={category.value}>{category.label}</option>)}
            </select>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as 'all' | InventoryStatus)} className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm outline-none transition focus:border-blue-400 focus:bg-white">
              <option value="all">كل الحالات</option>
              {Object.entries(STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </div>
        </section>

        {loading ? (
          <div className="rounded-3xl bg-white py-24 text-center text-slate-500 shadow-sm ring-1 ring-slate-200">جاري تحميل المنتجات...</div>
        ) : filteredItems.length === 0 ? (
          <div className="rounded-3xl bg-white py-24 text-center text-slate-500 shadow-sm ring-1 ring-slate-200">لا توجد منتجات مطابقة حاليًا. أضف أول منتج من زر الإضافة أعلاه.</div>
        ) : (
          <section className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {filteredItems.map((item) => {
              const primaryImage = item.image || item.images[0];
              return (
                <article key={item.id} className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200 transition hover:-translate-y-1 hover:shadow-lg">
                  <div className="relative flex aspect-[4/3] items-center justify-center bg-slate-100">
                    {primaryImage ? (
                      <img src={primaryImage} alt={item.name} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex flex-col items-center gap-2 text-slate-400"><ImagePlus className="h-8 w-8" /><span className="text-sm">لا توجد صورة</span></div>
                    )}

                    <button type="button" onClick={() => void toggleFeatured(item)} className={`absolute left-4 top-4 inline-flex h-10 w-10 items-center justify-center rounded-full border shadow-sm transition ${item.isFeatured ? 'border-amber-300 bg-amber-100 text-amber-700' : 'border-white/80 bg-white/90 text-slate-500'}`} title={item.isFeatured ? 'إزالة التمييز' : 'تمييز للصفحة الرئيسية'}>
                      <Star className={`h-4 w-4 ${item.isFeatured ? 'fill-current' : ''}`} />
                    </button>
                    {/* Flash sale badge */}
                    {item.flashSaleEndAt && new Date(item.flashSaleEndAt) > new Date() && (
                      <span className="absolute right-4 top-4 rounded-full bg-rose-500 px-2.5 py-1 text-[11px] font-black text-white shadow">⚡ فلاش</span>
                    )}
                    {/* Discount badge */}
                    {item.discountPercent > 0 && (
                      <span className="absolute right-4 bottom-4 rounded-full bg-orange-500 px-2.5 py-1 text-[11px] font-black text-white shadow">خصم {item.discountPercent}%</span>
                    )}
                  </div>

                  <div className="space-y-4 p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h2 className="text-xl font-black text-slate-900">{item.name}</h2>
                        <div className="mt-1 text-sm text-slate-500">{item.brand || 'بدون ماركة'} {item.model ? `• ${item.model}` : ''}</div>
                      </div>
                      <span className={`rounded-full border px-3 py-1 text-xs font-bold ${STATUS_STYLES[item.status]}`}>{STATUS_LABELS[item.status]}</span>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-2xl bg-slate-50 p-3"><div className="text-[11px] font-bold text-slate-500">السعر</div>
                        <div className="mt-1 flex items-baseline gap-1.5">
                          <span className="text-lg font-black text-slate-900">{formatMoney(item.price, item.currency)}</span>
                          {item.originalPrice > 0 && item.originalPrice > item.price && (
                            <span className="text-xs font-semibold text-slate-400 line-through">{formatMoney(item.originalPrice, item.currency)}</span>
                          )}
                        </div>
                        <div className="mt-1 text-[11px] text-slate-500">{currencyLabel(item.currency)}</div>
                      </div>
                      <div className="rounded-2xl bg-slate-50 p-3"><div className="text-[11px] font-bold text-slate-500">المخزون</div><div className="mt-1 text-lg font-black text-slate-900">{item.stock}</div><div className="mt-1 text-[11px] text-slate-500">SKU: {item.sku}</div></div>
                    </div>

                    <div className="grid gap-2 text-sm text-slate-600">
                      <div>القسم: {CATEGORIES.find((category) => category.value === item.category)?.label || item.category}</div>
                      <div>الصور: {item.images.length || (item.image ? 1 : 0)} صورة</div>
                      {item.supplier ? <div>المورد: {item.supplier}</div> : null}
                      {item.location ? <div>الموقع: {item.location}</div> : null}
                    </div>

                    {item.description ? <p className="line-clamp-3 text-sm leading-6 text-slate-600">{item.description}</p> : null}

                    <div className="flex gap-2">
                      <button type="button" onClick={() => openEditModal(item)} className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl border border-slate-200 px-4 py-2 font-bold text-slate-700 transition hover:bg-slate-50"><Edit className="h-4 w-4" /> تعديل</button>
                      <button type="button" onClick={() => void handleDelete(item.id)} className="inline-flex items-center justify-center rounded-2xl border border-rose-200 px-4 py-2 font-bold text-rose-600 transition hover:bg-rose-50"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </div>
                </article>
              );
            })}
          </section>
        )}
      </div>

      {modalMode ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-[28px] bg-white p-6 shadow-2xl">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-black text-slate-900">{modalMode === 'create' ? 'إضافة منتج جديد' : 'تعديل المنتج'}</h2>
                <p className="mt-2 text-sm text-slate-500">أدخل كل بيانات المنتج الأساسية حتى يظهر بشكل صحيح في المتجر والصفحة الرئيسية والطلبات.</p>
                <p className="mt-2 text-xs font-bold text-rose-600"><RequiredMark /> الحقول المعلّمة بهذه العلامة مطلوبة.</p>
              </div>
              <button type="button" onClick={closeModal} className="rounded-full border border-slate-200 px-4 py-2 text-sm font-bold text-slate-600 transition hover:bg-slate-50">إغلاق</button>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <label className="space-y-2"><span className="text-sm font-bold text-slate-700"><RequiredMark /> اسم المنتج</span><input required value={formData.name} onChange={(e) => updateForm('name', e.target.value)} className="h-11 w-full rounded-2xl border border-slate-200 px-4 outline-none focus:border-blue-400" placeholder="مثال: حذاء تدريب نخبوي" /></label>
              <label className="space-y-2"><span className="text-sm font-bold text-slate-700">الماركة</span><input value={formData.brand} onChange={(e) => updateForm('brand', e.target.value)} className="h-11 w-full rounded-2xl border border-slate-200 px-4 outline-none focus:border-blue-400" placeholder="Nike / Adidas / Puma" /></label>
              <label className="space-y-2"><span className="text-sm font-bold text-slate-700">الموديل</span><input value={formData.model} onChange={(e) => updateForm('model', e.target.value)} className="h-11 w-full rounded-2xl border border-slate-200 px-4 outline-none focus:border-blue-400" placeholder="Mercurial 2026" /></label>
              <label className="space-y-2"><span className="text-sm font-bold text-slate-700"><RequiredMark /> القسم</span><select value={formData.category} onChange={(e) => updateForm('category', e.target.value as InventoryCategory)} className="h-11 w-full rounded-2xl border border-slate-200 px-4 outline-none focus:border-blue-400">{CATEGORIES.map((category) => <option key={category.value} value={category.value}>{category.label}</option>)}</select></label>
              <label className="space-y-2"><span className="text-sm font-bold text-slate-700"><RequiredMark /> رمز SKU</span><input required value={formData.sku} onChange={(e) => updateForm('sku', e.target.value)} className="h-11 w-full rounded-2xl border border-slate-200 px-4 outline-none focus:border-blue-400" placeholder="SHOE-001" /></label>
              <label className="space-y-2"><span className="text-sm font-bold text-slate-700"><RequiredMark /> العملة</span><select value={formData.currency} onChange={(e) => updateForm('currency', e.target.value)} className="h-11 w-full rounded-2xl border border-slate-200 px-4 outline-none focus:border-blue-400">{CURRENCIES.map((currency) => <option key={currency.code} value={currency.code}>{currency.code} - {currency.label}</option>)}</select></label>
              <label className="space-y-2"><span className="text-sm font-bold text-slate-700"><RequiredMark /> سعر البيع</span><input required type="number" min="0" step="0.01" value={formData.price} onChange={(e) => updateForm('price', Number(e.target.value || 0))} className="h-11 w-full rounded-2xl border border-slate-200 px-4 outline-none focus:border-blue-400" /></label>
              <label className="space-y-2"><span className="text-sm font-bold text-slate-700">سعر التكلفة</span><input type="number" min="0" step="0.01" value={formData.cost} onChange={(e) => updateForm('cost', Number(e.target.value || 0))} className="h-11 w-full rounded-2xl border border-slate-200 px-4 outline-none focus:border-blue-400" /></label>
              <label className="space-y-2"><span className="text-sm font-bold text-slate-700"><RequiredMark /> المخزون الحالي</span><input required type="number" min="0" value={formData.stock} onChange={(e) => updateForm('stock', Number(e.target.value || 0))} className="h-11 w-full rounded-2xl border border-slate-200 px-4 outline-none focus:border-blue-400" /></label>
              <label className="space-y-2"><span className="text-sm font-bold text-slate-700"><RequiredMark /> الحد الأدنى</span><input required type="number" min="0" value={formData.minStock} onChange={(e) => updateForm('minStock', Number(e.target.value || 0))} className="h-11 w-full rounded-2xl border border-slate-200 px-4 outline-none focus:border-blue-400" /></label>
              <label className="space-y-2"><span className="text-sm font-bold text-slate-700">الحد الأعلى</span><input type="number" min="0" value={formData.maxStock} onChange={(e) => updateForm('maxStock', Number(e.target.value || 0))} className="h-11 w-full rounded-2xl border border-slate-200 px-4 outline-none focus:border-blue-400" /></label>
              <label className="space-y-2"><span className="text-sm font-bold text-slate-700">المورد</span><input value={formData.supplier} onChange={(e) => updateForm('supplier', e.target.value)} className="h-11 w-full rounded-2xl border border-slate-200 px-4 outline-none focus:border-blue-400" placeholder="اسم المورد" /></label>
              <label className="space-y-2"><span className="text-sm font-bold text-slate-700">موقع التخزين</span><input value={formData.location} onChange={(e) => updateForm('location', e.target.value)} className="h-11 w-full rounded-2xl border border-slate-200 px-4 outline-none focus:border-blue-400" placeholder="المخزن A / الرف 2" /></label>
              <label className="space-y-2 md:col-span-2 xl:col-span-3"><span className="text-sm font-bold text-slate-700">الوصف</span><textarea value={formData.description} onChange={(e) => updateForm('description', e.target.value)} className="min-h-[110px] w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-400" placeholder="وصف واضح للمنتج والمقاسات أو الاستخدام" /></label>
              <label className="space-y-2 md:col-span-2 xl:col-span-3">
                <span className="text-sm font-bold text-slate-700">الصورة الرئيسية</span>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <input value={formData.image} onChange={(e) => updateForm('image', e.target.value)} className="h-11 flex-1 rounded-2xl border border-slate-200 px-4 outline-none focus:border-blue-400" placeholder="https://example.com/product-cover.jpg" />
                  <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-slate-200 px-4 py-2 font-bold text-slate-700 transition hover:bg-slate-50">
                    <ImagePlus className="h-4 w-4" />
                    {uploadingMainImage ? 'جاري الرفع...' : 'رفع صورة'}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          void handleMainImageUpload(file);
                        }
                        e.currentTarget.value = '';
                      }}
                    />
                  </label>
                </div>
                {formData.image.trim() ? (
                  <div className="overflow-hidden rounded-3xl border border-slate-200 bg-slate-50">
                    <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
                      <div>
                        <div className="text-sm font-bold text-slate-900">معاينة الصورة الرئيسية</div>
                        <div className="text-xs text-slate-500">هذه الصورة هي التي ستظهر أولًا في المتجر.</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => updateForm('image', '')}
                        className="inline-flex items-center gap-2 rounded-2xl border border-rose-200 px-3 py-2 text-sm font-bold text-rose-600 transition hover:bg-rose-50"
                      >
                        <Trash2 className="h-4 w-4" /> إزالة
                      </button>
                    </div>
                    <div className="p-4">
                      <img src={formData.image.trim()} alt="الصورة الرئيسية للمنتج" className="h-56 w-full rounded-2xl object-cover" />
                    </div>
                  </div>
                ) : null}
              </label>
              <label className="space-y-2 md:col-span-2 xl:col-span-3">
                <span className="text-sm font-bold text-slate-700">صور المنتج الإضافية</span>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                  <textarea value={formData.imagesText} onChange={(e) => updateForm('imagesText', e.target.value)} className="min-h-[140px] flex-1 rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-400" placeholder={'ضع كل رابط صورة في سطر مستقل أو افصل بينها بفاصلة'} />
                  <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-slate-200 px-4 py-2 font-bold text-slate-700 transition hover:bg-slate-50">
                    <ImagePlus className="h-4 w-4" />
                    {uploadingGalleryImages ? 'جاري رفع الصور...' : 'رفع صور إضافية'}
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={(e) => {
                        void handleGalleryImagesUpload(e.target.files);
                        e.currentTarget.value = '';
                      }}
                    />
                  </label>
                </div>
                <p className="text-xs text-slate-500">يمكنك رفع الصور مباشرة أو إدخال الروابط يدويًا. يتم حفظ الصور كقائمة داخل قاعدة البيانات وتُستخدم في صفحة المتجر والواجهة الرئيسية.</p>
              </label>
            </div>

            {parseImages(formData.imagesText).length > 0 ? (
              <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-4">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-black text-slate-900">معرض صور المنتج</h3>
                    <p className="text-sm text-slate-500">راجع الصور المرفوعة، احذف أي صورة لا تريدها، أو عيّن صورة كصورة رئيسية قبل الحفظ.</p>
                  </div>
                  <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                    {parseImages(formData.imagesText).length} صورة
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  {parseImages(formData.imagesText).map((imageUrl, index) => {
                    const isMainImage = formData.image.trim() === imageUrl;

                    return (
                      <div key={`${imageUrl}-${index}`} className="overflow-hidden rounded-3xl border border-slate-200 bg-slate-50">
                        <div className="relative">
                          <img src={imageUrl} alt={`صورة المنتج ${index + 1}`} className="h-44 w-full object-cover" />
                          {isMainImage ? (
                            <span className="absolute right-3 top-3 rounded-full bg-blue-600 px-3 py-1 text-xs font-bold text-white">
                              الرئيسية
                            </span>
                          ) : null}
                        </div>

                        <div className="space-y-3 p-3">
                          <div className="line-clamp-2 break-all text-xs text-slate-500">{imageUrl}</div>
                          <div className="flex gap-2">
                            {!isMainImage ? (
                              <button
                                type="button"
                                onClick={() => setMainImage(imageUrl)}
                                className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl border border-blue-200 px-3 py-2 text-sm font-bold text-blue-700 transition hover:bg-blue-50"
                              >
                                <Star className="h-4 w-4" /> تعيين كرئيسية
                              </button>
                            ) : (
                              <div className="inline-flex flex-1 items-center justify-center rounded-2xl bg-blue-50 px-3 py-2 text-sm font-bold text-blue-700">
                                الصورة الرئيسية
                              </div>
                            )}

                            <button
                              type="button"
                              onClick={() => removeGalleryImage(imageUrl)}
                              className="inline-flex items-center justify-center rounded-2xl border border-rose-200 px-3 py-2 text-rose-600 transition hover:bg-rose-50"
                              title="حذف الصورة"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}

            {/* ── Discount & Flash Sale Section ── */}
            <div className="col-span-full rounded-3xl border border-dashed border-rose-200 bg-rose-50/40 p-5">
              <h3 className="mb-4 flex items-center gap-2 text-sm font-black text-rose-700">
                <span>⚡</span> التخفيضات والفلاش سيل
              </h3>
              <div className="grid gap-4 sm:grid-cols-3">
                <label className="space-y-2">
                  <span className="text-sm font-bold text-slate-700">السعر الأصلي (قبل الخصم)</span>
                  <input
                    type="number" min="0" step="0.01"
                    value={formData.originalPrice || ''}
                    onChange={(e) => updateForm('originalPrice', Number(e.target.value || 0))}
                    className="h-11 w-full rounded-2xl border border-slate-200 px-4 outline-none focus:border-rose-400"
                    placeholder="0"
                  />
                  <p className="text-[11px] text-slate-400">يظهر مشطوباً بجانب سعر البيع في المتجر</p>
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-bold text-slate-700">نسبة الخصم %</span>
                  <input
                    type="number" min="0" max="100"
                    value={formData.discountPercent || ''}
                    onChange={(e) => updateForm('discountPercent', Math.min(100, Math.max(0, Number(e.target.value || 0))))}
                    className="h-11 w-full rounded-2xl border border-slate-200 px-4 outline-none focus:border-rose-400"
                    placeholder="0"
                  />
                  <p className="text-[11px] text-slate-400">تظهر badge حمراء على البطاقة (مثال: خصم 20%)</p>
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-bold text-slate-700">انتهاء الفلاش سيل ⚡</span>
                  <input
                    type="datetime-local"
                    value={formData.flashSaleEndAt}
                    onChange={(e) => updateForm('flashSaleEndAt', e.target.value)}
                    className="h-11 w-full rounded-2xl border border-slate-200 px-4 outline-none focus:border-rose-400"
                  />
                  <p className="text-[11px] text-slate-400">العداد التنازلي يظهر تلقائياً في المتجر حتى هذا الوقت</p>
                </label>
              </div>
              {formData.flashSaleEndAt && new Date(formData.flashSaleEndAt) > new Date() && (
                <div className="mt-3 flex items-center gap-2 rounded-2xl border border-rose-200 bg-white px-4 py-2.5 text-sm font-bold text-rose-700">
                  ⚡ الفلاش سيل نشط — ينتهي في {new Date(formData.flashSaleEndAt).toLocaleString('ar-EG')}
                </div>
              )}
            </div>

            <div className="mt-2 flex flex-wrap items-center justify-between gap-3 rounded-3xl bg-slate-50 p-4 col-span-full">
              <label className="inline-flex items-center gap-3 text-sm font-bold text-slate-700">
                <input type="checkbox" checked={formData.isFeatured} onChange={(e) => updateForm('isFeatured', e.target.checked)} className="h-5 w-5 rounded border-slate-300" />
                ⭐ تمييز المنتج في الصفحة الرئيسية
              </label>
              <div className="flex gap-2">
                <button type="button" onClick={closeModal} className="rounded-2xl border border-slate-200 px-5 py-2 font-bold text-slate-700 transition hover:bg-white">إلغاء</button>
                <button type="button" onClick={() => void handleSubmit()} disabled={saving} className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-2 font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70">
                  {saving ? (<><RefreshCw className="h-4 w-4 animate-spin" /> جاري الحفظ...</>) : (<><Plus className="h-4 w-4" /> {modalMode === 'create' ? 'حفظ المنتج' : 'تحديث المنتج'}</>)}
                </button>
              </div>
            </div>

            {parseImages(formData.imagesText).length === 0 && !formData.image.trim() ? (
              <div className="mt-4 flex items-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800"><AlertTriangle className="h-4 w-4" /> يفضّل إضافة صورة رئيسية أو صور إضافية حتى يظهر المنتج بشكل احترافي في المتجر.</div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
