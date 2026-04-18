'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle,
  ChevronLeft,
  CreditCard,
  Heart,
  Package,
  Search,
  ShieldCheck,
  ShoppingBag,
  ShoppingCart,
  Star,
  Tag,
  Truck,
  XCircle,
  Zap,
} from 'lucide-react';

// ── Mock Data ──────────────────────────────────────────────────
const MOCK_PRODUCTS = [
  {
    id: '1',
    name: 'كرة قدم احترافية FIFA',
    description: 'كرة قدم مصنوعة من الجلد الطبيعي، معتمدة من FIFA للمباريات الرسمية.',
    category: 'equipment' as const,
    price: 299,
    currency: 'SAR',
    brand: 'Adidas',
    model: 'Al Rihla Pro',
    image: 'https://images.unsplash.com/photo-1614632537423-1e6c2e7e0aab?w=600&q=80',
    images: [],
    stock: 15,
    isAvailable: true,
  },
  {
    id: '2',
    name: 'قميص تدريب ماراثون',
    description: 'قميص خفيف الوزن مع تقنية DryFit لامتصاص العرق وراحة قصوى.',
    category: 'clothing' as const,
    price: 149,
    currency: 'SAR',
    brand: 'Nike',
    model: 'Dri-FIT 2024',
    image: 'https://images.unsplash.com/photo-1618886614638-80e3c103d031?w=600&q=80',
    images: [],
    stock: 3,
    isAvailable: true,
  },
  {
    id: '3',
    name: 'سماعات رياضية لاسلكية',
    description: 'سماعات مقاومة للماء مع بطارية 36 ساعة وصوت ممتاز للتدريب.',
    category: 'electronics' as const,
    price: 549,
    currency: 'SAR',
    brand: 'JBL',
    model: 'Endurance Peak 3',
    image: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=600&q=80',
    images: [],
    stock: 8,
    isAvailable: true,
  },
  {
    id: '4',
    name: 'بروتين واي 2KG',
    description: 'مكمل غذائي عالي الجودة لبناء العضلات وتعزيز التعافي بعد التمرين.',
    category: 'nutrition' as const,
    price: 199,
    currency: 'SAR',
    brand: 'Optimum Nutrition',
    model: 'Gold Standard',
    image: 'https://images.unsplash.com/photo-1593095948071-474c5cc2989d?w=600&q=80',
    images: [],
    stock: 0,
    isAvailable: false,
  },
  {
    id: '5',
    name: 'ساعة رياضية GPS',
    description: 'ساعة ذكية رياضية مع تتبع GPS والنبض ومراقبة النوم وخصائص السباحة.',
    category: 'accessories' as const,
    price: 899,
    currency: 'SAR',
    brand: 'Garmin',
    model: 'Forerunner 265',
    image: 'https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?w=600&q=80',
    images: [],
    stock: 5,
    isAvailable: true,
  },
  {
    id: '6',
    name: 'حذاء كرة القدم Pro',
    description: 'حذاء احترافي بنعل كربوني للملاعب العشبية الطبيعية.',
    category: 'equipment' as const,
    price: 449,
    currency: 'SAR',
    brand: 'Puma',
    model: 'Future 7 Ultimate',
    image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&q=80',
    images: [],
    stock: 12,
    isAvailable: true,
  },
];

const CATEGORIES = {
  all: { label: 'جميع المنتجات', icon: '🛍️' },
  equipment: { label: 'معدات رياضية', icon: '⚽' },
  clothing: { label: 'ملابس', icon: '👕' },
  accessories: { label: 'إكسسوارات', icon: '⌚' },
  nutrition: { label: 'تغذية رياضية', icon: '💪' },
  electronics: { label: 'إلكترونيات', icon: '🎧' },
} as const;

type Category = keyof typeof CATEGORIES;

export default function StorePreviewPage() {
  const [selectedCategory, setSelectedCategory] = useState<Category>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<typeof MOCK_PRODUCTS[0] | null>(null);
  const [showOrders, setShowOrders] = useState(false);

  const filtered = MOCK_PRODUCTS.filter((p) => {
    const matchCat = selectedCategory === 'all' || p.category === selectedCategory;
    const matchSearch =
      !searchTerm ||
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.brand?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchCat && matchSearch;
  });

  const available = filtered.filter((p) => p.isAvailable);

  function toggleWish(id: string) {
    setWishlist((w) => (w.includes(id) ? w.filter((x) => x !== id) : [...w, id]));
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950" dir="rtl">

      {/* Preview banner */}
      <div className="sticky top-0 z-50 flex items-center justify-center gap-2 bg-[#ffb703] px-4 py-2 text-xs font-bold text-slate-900">
        <Tag className="h-3.5 w-3.5" />
        صفحة معاينة للتصميم فقط — لا تحتاج تسجيل دخول
      </div>

      {/* Hero */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_#ffb70320_0%,_transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_#1e40af15_0%,_transparent_60%)]" />
        <div className="relative z-10 mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between"
          >
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#ffb703]/30 bg-[#ffb703]/10 px-4 py-1.5 text-sm font-bold text-[#ffb703]">
                <Zap className="h-3.5 w-3.5" />
                متجر الحلم الرياضي
              </div>
              <h1 className="text-3xl font-black text-white sm:text-4xl lg:text-5xl">
                كل ما تحتاجه
                <span className="block bg-gradient-to-l from-[#ffb703] to-[#f59e0b] bg-clip-text text-transparent">
                  لبطولتك القادمة
                </span>
              </h1>
              <p className="max-w-xl text-base leading-relaxed text-slate-400">
                معدات رياضية، ملابس احترافية، وأكثر — بأفضل الأسعار مع خيارات دفع مرنة.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              {[
                { icon: Package, label: 'منتجاً', value: MOCK_PRODUCTS.length, color: 'text-[#ffb703]' },
                { icon: ShoppingBag, label: 'متاح الآن', value: MOCK_PRODUCTS.filter((p) => p.isAvailable).length, color: 'text-emerald-400' },
                { icon: Truck, label: 'طلباتي', value: 3, color: 'text-sky-400' },
              ].map(({ icon: Icon, label, value, color }) => (
                <button
                  key={label}
                  type="button"
                  onClick={label === 'طلباتي' ? () => setShowOrders(!showOrders) : undefined}
                  className={`flex min-w-[90px] flex-col items-center justify-center gap-1 rounded-2xl border border-white/10 bg-white/5 px-5 py-3 backdrop-blur-sm transition hover:bg-white/10 ${label === 'طلباتي' ? 'cursor-pointer' : 'cursor-default'}`}
                >
                  <Icon className={`h-4 w-4 ${color}`} />
                  <span className="text-xl font-black text-white">{value}</span>
                  <span className="text-[11px] text-slate-400">{label}</span>
                </button>
              ))}
            </div>
          </motion.div>

          {/* Trust badges */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="mt-6 flex flex-wrap gap-3"
          >
            {[
              { icon: ShieldCheck, label: 'دفع آمن ومشفر' },
              { icon: Truck, label: 'توصيل سريع' },
              { icon: CreditCard, label: 'تقسيط بدون فوائد' },
              { icon: Star, label: 'منتجات رياضية أصلية' },
            ].map(({ icon: Icon, label }) => (
              <div
                key={label}
                className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-slate-300 backdrop-blur-sm"
              >
                <Icon className="h-3.5 w-3.5 text-[#ffb703]" />
                {label}
              </div>
            ))}
          </motion.div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">

        {/* Orders panel */}
        <AnimatePresence>
          {showOrders && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-6 overflow-hidden"
            >
              <div className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="rounded-xl bg-sky-500/20 p-2">
                      <Truck className="h-5 w-5 text-sky-400" />
                    </div>
                    <div>
                      <h2 className="font-black text-white">طلباتي</h2>
                      <p className="text-xs text-slate-400">تتبع حالة طلباتك</p>
                    </div>
                  </div>
                  <button type="button" onClick={() => setShowOrders(false)} className="text-slate-400 hover:text-white">
                    <XCircle className="h-5 w-5" />
                  </button>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {[
                    { name: 'كرة قدم احترافية FIFA', qty: 2, total: 598, status: 'shipped', statusLabel: 'تم الشحن', dot: 'bg-cyan-400', bg: 'bg-cyan-50', text: 'text-cyan-700' },
                    { name: 'سماعات رياضية لاسلكية', qty: 1, total: 549, status: 'confirmed', statusLabel: 'تم التأكيد', dot: 'bg-blue-400', bg: 'bg-blue-50', text: 'text-blue-700' },
                    { name: 'قميص تدريب ماراثون', qty: 3, total: 447, status: 'pending', statusLabel: 'قيد المراجعة', dot: 'bg-amber-400', bg: 'bg-amber-50', text: 'text-amber-700' },
                  ].map((order) => (
                    <div key={order.name} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                      <div className="mb-3 flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="truncate font-bold text-white text-sm">{order.name}</div>
                          <div className="mt-0.5 text-xs text-slate-500">17 أبريل 2026</div>
                        </div>
                        <span className={`flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${order.bg} ${order.text}`}>
                          <span className={`inline-block h-1.5 w-1.5 rounded-full ${order.dot}`} />
                          {order.statusLabel}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-400">{order.qty} قطعة</span>
                        <span className="font-black text-[#ffb703]">{order.total.toLocaleString()} SAR</span>
                      </div>
                      <div className="mt-2 rounded-xl bg-white/5 px-3 py-1.5 text-xs text-slate-400">Geidea • دفع كامل</div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Search */}
        <div className="mb-6">
          <div className="relative">
            <Search className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="ابحث عن منتج، ماركة، أو فئة..."
              className="h-12 w-full rounded-2xl border border-white/10 bg-white/5 pr-10 pl-4 text-sm text-white placeholder:text-slate-500 outline-none backdrop-blur-sm focus:border-[#ffb703]/40 focus:ring-2 focus:ring-[#ffb703]/20 transition"
            />
          </div>
        </div>

        {/* Category pills */}
        <div className="mb-8 flex flex-wrap gap-2">
          {(Object.entries(CATEGORIES) as [Category, typeof CATEGORIES[Category]][]).map(([key, { label, icon }]) => (
            <button
              key={key}
              type="button"
              onClick={() => setSelectedCategory(key)}
              className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold transition-all ${
                selectedCategory === key
                  ? 'bg-[#ffb703] text-slate-900 shadow-lg shadow-[#ffb703]/30'
                  : 'border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white'
              }`}
            >
              <span className="text-base">{icon}</span>
              {label}
              {key !== 'all' && (
                <span className={`rounded-full px-2 py-0.5 text-xs ${selectedCategory === key ? 'bg-slate-900/20' : 'bg-white/10'}`}>
                  {MOCK_PRODUCTS.filter((p) => p.category === key).length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Results count */}
        <div className="mb-5 flex items-center justify-between">
          <p className="text-sm text-slate-400">
            عرض <span className="font-bold text-white">{filtered.length}</span> منتج
          </p>
          <p className="text-sm text-slate-400">
            <span className="font-bold text-emerald-400">{available.length}</span> متاح للطلب
          </p>
        </div>

        {/* Products grid */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {filtered.map((product, index) => (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05, duration: 0.4 }}
            >
              <div className="group relative flex flex-col overflow-hidden rounded-3xl border border-white/10 bg-white/5 backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:border-[#ffb703]/30 hover:shadow-xl hover:shadow-[#ffb703]/10">
                {/* Image */}
                <div className="relative aspect-[4/3] overflow-hidden bg-gradient-to-br from-slate-800 to-slate-900">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={product.image}
                    alt={product.name}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 via-transparent to-transparent" />

                  {/* Availability badge */}
                  <div className="absolute left-3 top-3">
                    {product.isAvailable ? (
                      <span className="flex items-center gap-1 rounded-full bg-emerald-500/90 px-2.5 py-1 text-[11px] font-bold text-white backdrop-blur-sm">
                        <span className="h-1.5 w-1.5 rounded-full bg-white" />
                        متوفر
                      </span>
                    ) : (
                      <span className="rounded-full bg-slate-700/90 px-2.5 py-1 text-[11px] font-bold text-slate-300 backdrop-blur-sm">
                        نفذ المخزون
                      </span>
                    )}
                  </div>

                  {/* Wishlist */}
                  <div className="absolute right-3 top-3">
                    <button
                      type="button"
                      onClick={() => toggleWish(product.id)}
                      className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-900/70 text-slate-300 backdrop-blur-sm transition hover:bg-rose-500 hover:text-white"
                    >
                      <Heart className={`h-4 w-4 ${wishlist.includes(product.id) ? 'fill-rose-500 text-rose-500' : ''}`} />
                    </button>
                  </div>

                  {/* Category */}
                  <div className="absolute bottom-3 right-3">
                    <span className="flex items-center gap-1 rounded-full bg-slate-900/70 px-3 py-1 text-[11px] font-semibold text-slate-300 backdrop-blur-sm">
                      {CATEGORIES[product.category as Category]?.icon}
                      {CATEGORIES[product.category as Category]?.label}
                    </span>
                  </div>
                </div>

                {/* Info */}
                <div className="flex flex-1 flex-col gap-3 p-4">
                  <div>
                    <h3 className="line-clamp-1 text-base font-black text-white">{product.name}</h3>
                    <p className="mt-0.5 text-xs text-slate-500">{product.brand} • {product.model}</p>
                    <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-slate-400">{product.description}</p>
                  </div>

                  <div className="mt-auto flex items-center justify-between pt-2">
                    <div>
                      <div className="text-xl font-black text-[#ffb703]">
                        {product.price.toLocaleString()} {product.currency}
                      </div>
                      {product.stock > 0 && product.stock <= 5 && (
                        <div className="mt-0.5 flex items-center gap-1 text-[11px] text-rose-400">
                          <Tag className="h-3 w-3" />
                          آخر {product.stock} قطع فقط!
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (!product.isAvailable) return;
                        setSelectedProduct(product);
                        setShowModal(true);
                      }}
                      disabled={!product.isAvailable}
                      className={`flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-black transition-all ${
                        product.isAvailable
                          ? 'bg-[#ffb703] text-slate-900 hover:bg-[#f59e0b] hover:shadow-lg hover:shadow-[#ffb703]/30 active:scale-95'
                          : 'cursor-not-allowed bg-white/10 text-slate-500'
                      }`}
                    >
                      <ShoppingCart className="h-4 w-4" />
                      اطلب الآن
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Purchase Modal */}
      <AnimatePresence>
        {showModal && selectedProduct && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-white/10 bg-slate-900 shadow-2xl"
            >
              {/* Header */}
              <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/10 bg-slate-900/95 px-6 py-4 backdrop-blur-sm">
                <div>
                  <h3 className="text-lg font-black text-white">إتمام الطلب</h3>
                  <p className="mt-0.5 text-xs text-slate-400">أكمل بياناتك لتأكيد الطلب</p>
                </div>
                <button type="button" onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white transition">
                  <XCircle className="h-6 w-6" />
                </button>
              </div>

              <div className="p-6">
                {/* Product summary */}
                <div className="mb-6 flex items-center gap-4 rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl bg-slate-800">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={selectedProduct.image} alt={selectedProduct.name} className="h-full w-full object-cover" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="font-black text-white">{selectedProduct.name}</h4>
                    <p className="text-xs text-slate-400">{selectedProduct.brand} • {selectedProduct.model}</p>
                    <p className="mt-2 text-xl font-black text-[#ffb703]">{selectedProduct.price.toLocaleString()} {selectedProduct.currency}</p>
                  </div>
                </div>

                {/* Form fields preview */}
                <div className="grid gap-4 sm:grid-cols-2">
                  {[
                    { label: 'الاسم الكامل', placeholder: 'محمد عبدالله' },
                    { label: 'رقم الجوال', placeholder: '05xxxxxxxx' },
                  ].map(({ label, placeholder }) => (
                    <div key={label} className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-300">{label}</label>
                      <input
                        className="h-11 w-full rounded-xl border border-white/10 bg-white/5 px-3 text-sm text-white placeholder:text-slate-500 outline-none focus:border-[#ffb703]/40 transition"
                        placeholder={placeholder}
                      />
                    </div>
                  ))}

                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="text-xs font-semibold text-slate-300">طريقة الدفع</label>
                    <select className="h-11 w-full rounded-xl border border-white/10 bg-slate-800 px-3 text-sm text-white outline-none focus:border-[#ffb703]/40 transition">
                      <option>Geidea - بطاقة بنكية</option>
                      <option>Tamara - تقسيط 3 أشهر</option>
                      <option>Tabby - تقسيط 4 أشهر</option>
                      <option>محفظة إلكترونية / InstaPay</option>
                    </select>
                  </div>

                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="text-xs font-semibold text-slate-300">وسيلة التوصيل</label>
                    <select className="h-11 w-full rounded-xl border border-white/10 bg-slate-800 px-3 text-sm text-white outline-none focus:border-[#ffb703]/40 transition">
                      <option>توصيل للعنوان</option>
                      <option>استلام من الفرع</option>
                    </select>
                  </div>
                </div>

                <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                  <button
                    type="button"
                    className="flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-[#ffb703] text-sm font-black text-slate-900 transition hover:bg-[#f59e0b] hover:shadow-lg hover:shadow-[#ffb703]/30"
                  >
                    <CheckCircle className="h-4 w-4" />
                    تأكيد الطلب والانتقال للدفع
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="h-12 flex-1 rounded-2xl border border-white/10 text-sm font-bold text-slate-300 transition hover:bg-white/10 hover:text-white"
                  >
                    إلغاء
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
