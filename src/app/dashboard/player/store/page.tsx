'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '@/lib/firebase/auth-provider';
import { useTranslation } from '@/lib/i18n';
import { supabase } from '@/lib/supabase/config';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  CheckCircle,
  ChevronLeft,
  CreditCard,
  ExternalLink,
  Heart,
  Package,
  Search,
  ShieldCheck,
  ShoppingBag,
  ShoppingCart,
  Star,
  Tag,
  Truck,
  Wallet,
  XCircle,
  Zap,
} from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { usePathname } from 'next/navigation';
import { SUPPORTED_COUNTRIES, getCitiesByCountry } from '@/lib/cities-data';


type StoreCategory =
  | 'equipment'
  | 'clothing'
  | 'accessories'
  | 'nutrition'
  | 'electronics'
  | 'other';

type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled';

type DashboardAccountType =
  | 'player'
  | 'academy'
  | 'club'
  | 'agent'
  | 'trainer'
  | 'marketer'
  | 'admin'
  | 'parent';

interface StoreProduct {
  id: string;
  name: string;
  description: string;
  category: StoreCategory;
  price: number;
  originalPrice?: number;
  discountPercent?: number;
  currency: string;
  brand?: string;
  model?: string;
  image?: string;
  images: string[];
  stock: number;
  isAvailable: boolean;
  isFeatured?: boolean;
  flashSaleEndAt?: string | null;
}

interface StoreOrder {
  id: string;
  product_name: string;
  quantity: number;
  total_price: number;
  currency: string;
  payment_method: string | null;
  payment_provider: string | null;
  payment_type: string | null;
  installment_months: number | null;
  status: OrderStatus;
  created_at: string;
}

interface OrderFormState {
  buyerName: string;
  buyerPhone: string;
  paymentMethod: string;
  paymentType: 'full' | 'installment';
  installmentMonths: string;
  addressLabel: string;
  deliveryMethod: string;
  contactMethod: string;
  contactWindow: string;
  shippingAddress: string;
  shippingCity: string;
  shippingCountry: string;
  notes: string;
}

interface PaymentOption {
  id: string;
  label: string;
  type: 'full' | 'installment';
  plans?: number[];
  brandMark?: string;
  brandClassName?: string;
}

const MANUAL_TRANSFER_NUMBER = '01017799580';

interface InventoryRow {
  id?: string;
  name?: string;
  category?: string;
  stock?: number;
  price?: number;
  original_price?: number;
  discount_percent?: number;
  currency?: string;
  brand?: string;
  model?: string;
  description?: string;
  image?: string;
  images?: string[];
  status?: string;
  is_featured?: boolean;
  featured?: boolean;               // legacy column name fallback
  flash_sale_end_at?: string | null;
}

const DEFAULT_SHIPPING_COUNTRY = SUPPORTED_COUNTRIES[0] || '';

const DEFAULT_SHIPPING_CITY = getCitiesByCountry(DEFAULT_SHIPPING_COUNTRY)[0] || '';

const EMPTY_ORDER_FORM: OrderFormState = {
  buyerName: '',
  buyerPhone: '',
  paymentMethod: 'card_online',
  paymentType: 'full',
  installmentMonths: '',
  addressLabel: 'home',
  deliveryMethod: 'courier',
  contactMethod: 'whatsapp',
  contactWindow: 'anytime',
  shippingAddress: '',
  shippingCity: DEFAULT_SHIPPING_CITY,
  shippingCountry: DEFAULT_SHIPPING_COUNTRY,
  notes: '',
};

const ADDRESS_LABEL_OPTIONS = [
  { value: 'home', label: 'home' },
  { value: 'work', label: 'work' },
  { value: 'academy', label: 'academy' },
  { value: 'club', label: 'club' },
];

const DELIVERY_METHOD_OPTIONS = [
  { value: 'courier', label: 'courier' },
  { value: 'branch_pickup', label: 'branch_pickup' },
  { value: 'coordinator', label: 'coordinator' },
];

const CONTACT_METHOD_OPTIONS = [
  { value: 'whatsapp', label: 'whatsapp' },
  { value: 'phone', label: 'phone' },
  { value: 'email', label: 'email' },
];

const CONTACT_WINDOW_OPTIONS = [
  { value: 'morning', label: 'morning' },
  { value: 'afternoon', label: 'afternoon' },
  { value: 'evening', label: 'evening' },
  { value: 'anytime', label: 'anytime' },
];

const selectClassName =
  'h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-[#ffb703]/30 focus:border-[#ffb703] transition';

const STORE_PAYMENT_OPTIONS: PaymentOption[] = [
  // ── دفع كامل ──
  { id: 'card_online',   label: 'card_online', type: 'full', brandMark: '💳', brandClassName: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { id: 'mobile_wallet', label: 'mobile_wallet',  type: 'full', brandMark: '📲', brandClassName: 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200' },
  { id: 'bank_transfer', label: 'bank_transfer',              type: 'full', brandMark: '🏦', brandClassName: 'bg-slate-50 text-slate-700 border-slate-200' },
  // ── تقسيط ──
  { id: 'tamara',   label: 'tamara',   type: 'installment', plans: [2, 3, 4],       brandMark: 'Tamara',  brandClassName: 'bg-stone-900 text-white border-stone-800' },
  { id: 'tabby',    label: 'tabby',    type: 'installment', plans: [4],             brandMark: 'tabby',  brandClassName: 'bg-lime-100 text-lime-800 border-lime-300' },
  { id: 'valu',     label: 'valu',    type: 'installment', plans: [6, 12, 18, 24], brandMark: 'valU',   brandClassName: 'bg-violet-100 text-violet-800 border-violet-200' },
  { id: 'sympl',    label: 'sympl',   type: 'installment', plans: [3, 4, 5],       brandMark: 'sympl',  brandClassName: 'bg-orange-100 text-orange-800 border-orange-200' },
  { id: 'souhoola', label: 'souhoola',   type: 'installment', plans: [6, 12, 18, 24], brandMark: 'Souhoola', brandClassName: 'bg-cyan-100 text-cyan-800 border-cyan-200' },
  { id: 'contact',  label: 'contact',  type: 'installment', plans: [6, 12, 18, 24], brandMark: 'CNT',    brandClassName: 'bg-amber-100 text-amber-800 border-amber-200' },
];

const ACTIVE_STORE_PAYMENT_OPTIONS = STORE_PAYMENT_OPTIONS.filter(
  (option) => option.id !== 'skipcash'
);

const FULL_PAYMENT_OPTIONS = ACTIVE_STORE_PAYMENT_OPTIONS.filter(o => o.type === 'full');
const INSTALLMENT_OPTIONS  = ACTIVE_STORE_PAYMENT_OPTIONS.filter(o => o.type === 'installment');

const CATEGORY_LABELS: Record<'all' | StoreCategory, string> = {
  all: 'all',
  equipment: 'equipment',
  clothing: 'clothing',
  accessories: 'accessories',
  nutrition: 'nutrition',
  electronics: 'electronics',
  other: 'other',
};

const CATEGORY_ICONS: Record<'all' | StoreCategory, string> = {
  all: '🛍️',
  equipment: '⚽',
  clothing: '👕',
  accessories: '⌚',
  nutrition: '💪',
  electronics: '🎧',
  other: '✨',
};

const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: 'pending',
  confirmed: 'confirmed',
  processing: 'processing',
  shipped: 'shipped',
  delivered: 'delivered',
  cancelled: 'cancelled',
};

const ORDER_STATUS_STYLES: Record<OrderStatus, { bg: string; text: string; dot: string }> = {
  pending: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-400' },
  confirmed: { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-400' },
  processing: { bg: 'bg-indigo-50', text: 'text-indigo-700', dot: 'bg-indigo-400' },
  shipped: { bg: 'bg-cyan-50', text: 'text-cyan-700', dot: 'bg-cyan-400' },
  delivered: { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-400' },
  cancelled: { bg: 'bg-rose-50', text: 'text-rose-700', dot: 'bg-rose-400' },
};

function inferAccountTypeFromPath(pathname: string | null): DashboardAccountType {
  if (!pathname) return 'player';
  if (pathname.includes('/dashboard/academy/')) return 'academy';
  if (pathname.includes('/dashboard/club/')) return 'club';
  if (pathname.includes('/dashboard/agent/')) return 'agent';
  if (pathname.includes('/dashboard/trainer/')) return 'trainer';
  if (pathname.includes('/dashboard/marketer/')) return 'marketer';
  if (pathname.includes('/dashboard/admin/')) return 'admin';
  if (pathname.includes('/dashboard/parent/')) return 'parent';
  return 'player';
}

function getCategoryIcon(category: StoreCategory) {
  return CATEGORY_ICONS[category] || '🛍️';
}

function formatStorePrice(amount: number, currency: string) {
  return `${Number(amount || 0).toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })} ${currency || 'SAR'}`;
}

export default function PlayerStorePage() {
  const { t, locale, isRTL } = useTranslation();
  const { user, userData } = useAuth();

  const addressLabelOptions = useMemo(() => [
    { value: 'home', label: t('store.checkout.addressLabels.home') },
    { value: 'work', label: t('store.checkout.addressLabels.work') },
    { value: 'academy', label: t('store.checkout.addressLabels.academy') },
    { value: 'club', label: t('store.checkout.addressLabels.club') },
  ], [t]);

  const deliveryMethodOptions = useMemo(() => [
    { value: 'courier', label: t('store.checkout.deliveryMethods.courier') },
    { value: 'branch_pickup', label: t('store.checkout.deliveryMethods.branch_pickup') },
    { value: 'coordinator', label: t('store.checkout.deliveryMethods.coordinator') },
  ], [t]);

  const contactMethodOptions = useMemo(() => [
    { value: 'whatsapp', label: t('store.checkout.contactMethods.whatsapp') },
    { value: 'phone', label: t('store.checkout.contactMethods.phone') },
    { value: 'email', label: t('store.checkout.contactMethods.email') },
  ], [t]);

  const contactWindowOptions = useMemo(() => [
    { value: 'morning', label: t('store.checkout.contactWindows.morning') },
    { value: 'afternoon', label: t('store.checkout.contactWindows.afternoon') },
    { value: 'evening', label: t('store.checkout.contactWindows.evening') },
    { value: 'anytime', label: t('store.checkout.contactWindows.anytime') },
  ], [t]);

  const categoryLabels = useMemo<Record<'all' | StoreCategory, string>>(() => ({
    all: t('store.categories.all'),
    equipment: t('store.categories.equipment'),
    clothing: t('store.categories.clothing'),
    accessories: t('store.categories.accessories'),
    nutrition: t('store.categories.nutrition'),
    electronics: t('store.categories.electronics'),
    other: t('store.categories.other'),
  }), [t]);

  const orderStatusLabels = useMemo<Record<OrderStatus, string>>(() => ({
    pending: t('store.orders.statuses.pending'),
    confirmed: t('store.orders.statuses.confirmed'),
    processing: t('store.orders.statuses.processing'),
    shipped: t('store.orders.statuses.shipped'),
    delivered: t('store.orders.statuses.delivered'),
    cancelled: t('store.orders.statuses.cancelled'),
  }), [t]);

  const getPaymentOptionLabel = useCallback((id: string) => {
    switch (id) {
      case 'card_online': return t('store.checkout.paymentMethods.card');
      case 'mobile_wallet': return t('store.checkout.paymentMethods.wallet');
      case 'bank_transfer': return t('store.checkout.paymentMethods.bank');
      case 'tamara': return 'Tamara';
      case 'tabby': return 'Tabby';
      case 'valu': return 'valU';
      case 'sympl': return 'Sympl';
      case 'souhoola': return 'Souhoola';
      case 'contact': return 'Contact';
      default: return id;
    }
  }, [t]);

  const getAddressLabel = useCallback((value: string) =>
    addressLabelOptions.find((option) => option.value === value)?.label || value,
  [addressLabelOptions]);

  const getDeliveryMethodLabel = useCallback((value: string) =>
    deliveryMethodOptions.find((option) => option.value === value)?.label || value,
  [deliveryMethodOptions]);

  const getContactMethodLabel = useCallback((value: string) =>
    contactMethodOptions.find((option) => option.value === value)?.label || value,
  [contactMethodOptions]);

  const getContactWindowLabel = useCallback((value: string) =>
    contactWindowOptions.find((option) => option.value === value)?.label || value,
  [contactWindowOptions]);
  const pathname = usePathname();
  const inferredAccountType = inferAccountTypeFromPath(pathname);
  const accountType = (userData?.accountType as DashboardAccountType | undefined) || inferredAccountType;
  const isAdminView = accountType === 'admin';

  const [loading, setLoading] = useState(true);
  const [inventoryUnavailable, setInventoryUnavailable] = useState(false);
  const [ordersUnavailable, setOrdersUnavailable] = useState(false);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [submittingOrder, setSubmittingOrder] = useState(false);
  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [orders, setOrders] = useState<StoreOrder[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'all' | StoreCategory>('all');
  const [selectedProduct, setSelectedProduct] = useState<StoreProduct | null>(null);
  const [selectedProductMedia, setSelectedProductMedia] = useState<string | null>(null);
  const [showInstallmentNotice, setShowInstallmentNotice] = useState(false);
  const [installmentProviderName, setInstallmentProviderName] = useState('');
  const [showTransferNotice, setShowTransferNotice] = useState(false);
  const [transferProviderName, setTransferProviderName] = useState('');
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [purchaseQuantity, setPurchaseQuantity] = useState(1);
  const [orderForm, setOrderForm] = useState<OrderFormState>(EMPTY_ORDER_FORM);
  const [showOrders, setShowOrders] = useState(false);
  const [wishlist, setWishlist] = useState<string[]>([]);

  // ── Cart ──
  const [cartItems, setCartItems] = useState<{ product: StoreProduct; quantity: number }[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [showCartCheckout, setShowCartCheckout] = useState(false);

  // ── Image carousel state (activeImageIndex per product) ──
  const [carouselIndex, setCarouselIndex] = useState<Record<string, number>>({});
  const carouselTimers = useRef<Record<string, ReturnType<typeof setInterval>>>({});

  // ── Flash sale countdown ──
  const [countdown, setCountdown] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0, ended: true });

  const flashSaleProducts = useMemo(
    () => products.filter((p) => p.flashSaleEndAt && new Date(p.flashSaleEndAt) > new Date()),
    [products]
  );
  const flashSaleEnd = flashSaleProducts[0]?.flashSaleEndAt ?? null;

  // Countdown ticker
  useEffect(() => {
    if (!flashSaleEnd) { setCountdown((c) => ({ ...c, ended: true })); return; }
    const tick = () => {
      const diff = new Date(flashSaleEnd).getTime() - Date.now();
      if (diff <= 0) { setCountdown({ days: 0, hours: 0, minutes: 0, seconds: 0, ended: true }); return; }
      const days    = Math.floor(diff / 86_400_000);
      const hours   = Math.floor((diff % 86_400_000) / 3_600_000);
      const minutes = Math.floor((diff % 3_600_000) / 60_000);
      const seconds = Math.floor((diff % 60_000) / 1_000);
      setCountdown({ days, hours, minutes, seconds, ended: false });
    };
    tick();
    const id = setInterval(tick, 1_000);
    return () => clearInterval(id);
  }, [flashSaleEnd]);

  // Auto-advance carousel for each product card
  const startCarousel = useCallback((productId: string, imageCount: number) => {
    if (imageCount <= 1) return;
    if (carouselTimers.current[productId]) return;
    carouselTimers.current[productId] = setInterval(() => {
      setCarouselIndex((prev) => ({ ...prev, [productId]: ((prev[productId] ?? 0) + 1) % imageCount }));
    }, 2_500);
  }, []);

  const stopCarousel = useCallback((productId: string) => {
    clearInterval(carouselTimers.current[productId]);
    delete carouselTimers.current[productId];
  }, []);

  // Cleanup
  useEffect(() => {
    const timers = carouselTimers.current;
    return () => { Object.values(timers).forEach(clearInterval); };
  }, []);

  // ── Cart localStorage persistence ──
  useEffect(() => {
    try {
      const saved = localStorage.getItem('el7lm_cart');
      if (saved) setCartItems(JSON.parse(saved));
    } catch {}
  }, []);

  useEffect(() => {
    localStorage.setItem('el7lm_cart', JSON.stringify(cartItems));
  }, [cartItems]);

  const selectedPaymentOption = ACTIVE_STORE_PAYMENT_OPTIONS.find(
    (option) => option.id === orderForm.paymentMethod
  );
  const cityOptions = getCitiesByCountry(orderForm.shippingCountry);
  const similarProducts = useMemo(() => {
    if (!selectedProduct) return [];
    return products
      .filter(
        (product) =>
          product.id !== selectedProduct.id &&
          product.category === selectedProduct.category &&
          product.isAvailable
      )
      .slice(0, 4);
  }, [products, selectedProduct]);
  const requiresShippingAddress = orderForm.deliveryMethod === 'courier';
  const requiresShippingLocation = orderForm.deliveryMethod !== 'coordinator';

  useEffect(() => {
    void loadProducts();
  }, []);

  useEffect(() => {
    if (!user) {
      setOrders([]);
      setOrdersLoading(false);
      return;
    }
    void loadOrders();
  }, [user]);

  useEffect(() => {
    const buyerName = String(
      userData?.full_name ||
        userData?.name ||
        user?.user_metadata?.full_name ||
        user?.user_metadata?.name ||
        ''
    ).trim();

    const buyerPhone = String(
      userData?.phone ||
        userData?.phoneNumber ||
        user?.user_metadata?.phone ||
        user?.phone ||
        ''
    ).trim();

    setOrderForm((current) => ({
      ...current,
      buyerName: current.buyerName || buyerName,
      buyerPhone: current.buyerPhone || buyerPhone,
    }));
  }, [user, userData]);

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesSearch =
        !searchTerm ||
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [products, searchTerm, selectedCategory]);

  const availableProducts = filteredProducts.filter((product) => product.isAvailable);

  async function loadProducts() {
    try {
      setLoading(true);
      setInventoryUnavailable(false);

      const { data, error } = await supabase
        .from('inventory')
        .select('id, name, category, stock, price, original_price, discount_percent, currency, brand, model, description, image, images, status, is_featured, flash_sale_end_at')
        .order('createdAt', { ascending: false });

      if (error) {
        if (error.code === 'PGRST205') {
          setProducts([]);
          setInventoryUnavailable(true);
          return;
        }
        throw error;
      }

      const normalized = (data || [])
        .map((item: InventoryRow): StoreProduct | null => {
          if (!item.id || !item.name) return null;

          const category = (
            ['equipment', 'clothing', 'accessories', 'nutrition', 'electronics', 'other'].includes(
              item.category || ''
            )
              ? item.category
              : 'other'
          ) as StoreCategory;

          const stock = Number(item.stock || 0);
          const price = Number(item.price || 0);
          const isAvailable = stock > 0 && item.status !== 'discontinued';
          const images = Array.isArray(item.images)
            ? item.images.filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
            : [];
          const primaryImage = item.image || images[0] || undefined;

          const discountPercent = Number(item.discount_percent || 0);
          const originalPrice = item.original_price ? Number(item.original_price) : undefined;

          return {
            id: item.id,
            name: item.name,
            description: item.description || '',
            category,
            price,
            originalPrice,
            discountPercent: discountPercent > 0 ? discountPercent : undefined,
            currency: item.currency || 'SAR',
            brand: item.brand || undefined,
            model: item.model || undefined,
            image: primaryImage,
            images,
            stock,
            isAvailable,
            // Support both is_featured (new) and featured (legacy)
            isFeatured: Boolean(item.is_featured ?? item.featured),
            flashSaleEndAt: item.flash_sale_end_at || null,
          };
        })
        .filter((item): item is StoreProduct => Boolean(item));

      setProducts(normalized);
    } catch (error) {
      console.error('Store inventory load failed:', error);
      setProducts([]);
      toast.error(t('store.errors.loadFailed'));
    } finally {
      setLoading(false);
    }
  }

  async function loadOrders() {
    try {
      setOrdersLoading(true);
      setOrdersUnavailable(false);

      if (!user) {
        setOrders([]);
        return;
      }

      const { data, error } = await supabase
        .from('store_orders')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        if (error.code === 'PGRST205') {
          setOrders([]);
          setOrdersUnavailable(true);
          return;
        }
        throw error;
      }

      setOrders((data || []) as StoreOrder[]);
    } catch (error) {
      console.error('Store orders load failed:', error);
      setOrders([]);
    } finally {
      setOrdersLoading(false);
    }
  }

  function resetPurchaseState() {
    setShowPurchaseModal(false);
    setSelectedProduct(null);
    setSelectedProductMedia(null);
    setPurchaseQuantity(1);
    setOrderForm((current) => ({
      ...EMPTY_ORDER_FORM,
      buyerName: current.buyerName,
      buyerPhone: current.buyerPhone,
    }));
  }

  function handlePurchase(product: StoreProduct) {
    if (!product.isAvailable) {
      toast.error(t('store.errors.productUnavailable'));
      return;
    }

    const defaultOption = ACTIVE_STORE_PAYMENT_OPTIONS[0];
    setSelectedProduct(product);
    setSelectedProductMedia(product.image || product.images[0] || null);
    setPurchaseQuantity(1);
    setOrderForm((current) => ({
      ...current,
      paymentMethod: defaultOption.id,
      paymentType: defaultOption.type,
      installmentMonths: '',
      shippingCountry: current.shippingCountry || DEFAULT_SHIPPING_COUNTRY,
      shippingCity:
        current.shippingCity ||
        getCitiesByCountry(current.shippingCountry || DEFAULT_SHIPPING_COUNTRY)[0] ||
        DEFAULT_SHIPPING_CITY,
    }));
    setShowPurchaseModal(true);
  }

  function toggleWishlist(productId: string) {
    setWishlist((prev) =>
      prev.includes(productId) ? prev.filter((id) => id !== productId) : [...prev, productId]
    );
  }

  function addToCart(product: StoreProduct) {
    if (!product.isAvailable) { toast.error(t('store.errors.productUnavailable')); return; }
    setCartItems((prev) => {
      const existing = prev.find((i) => i.product.id === product.id);
      if (existing) {
        toast.success(t('store.success.cartQtyIncreased'));
        return prev.map((i) => i.product.id === product.id ? { ...i, quantity: Math.min(i.quantity + 1, product.stock) } : i);
      }
      toast.success(t('store.success.cartAdded').replace('{{name}}', product.name));
      return [...prev, { product, quantity: 1 }];
    });
    setShowCart(true);
  }

  function updateCartQty(productId: string, newQty: number) {
    setCartItems((prev) => {
      if (newQty <= 0) {
        return prev.filter((i) => i.product.id !== productId);
      }
      return prev.map((i) => i.product.id === productId ? { ...i, quantity: newQty } : i);
    });
  }

  function removeFromCart(productId: string) {
    setCartItems((prev) => prev.filter((i) => i.product.id !== productId));
  }

  const cartCount = cartItems.reduce((sum, i) => sum + i.quantity, 0);
  const cartTotal = cartItems.reduce((sum, i) => sum + i.product.price * i.quantity, 0);
  const cartCurrency = cartItems[0]?.product.currency || 'SAR';

  async function confirmCartPurchase() {
    if (!user) { toast.error(t('store.errors.loginRequired')); return; }
    if (cartItems.length === 0) { toast.error(t('store.errors.cartEmpty')); return; }
    if (!orderForm.buyerName.trim()) { toast.error(t('store.errors.nameRequired')); return; }
    if (!orderForm.buyerPhone.trim()) { toast.error(t('store.errors.phoneRequired')); return; }
    if (requiresShippingLocation && (!orderForm.shippingCity.trim() || !orderForm.shippingCountry.trim())) { toast.error(t('store.errors.locationRequired')); return; }
    if (requiresShippingAddress && !orderForm.shippingAddress.trim()) { toast.error(t('store.errors.addressRequired')); return; }
    if (orderForm.paymentType === 'installment' && !orderForm.installmentMonths) { toast.error(t('store.errors.installmentRequired')); return; }

    try {
      setSubmittingOrder(true);

      const structuredNotes = [
        `${t('store.checkout.noteAddressLabel')}: ${getAddressLabel(orderForm.addressLabel)}`,
        `${t('store.checkout.noteDeliveryMethod')}: ${getDeliveryMethodLabel(orderForm.deliveryMethod)}`,
        `${t('store.checkout.noteContactMethod')}: ${getContactMethodLabel(orderForm.contactMethod)}`,
        `${t('store.checkout.noteContactWindow')}: ${getContactWindowLabel(orderForm.contactWindow)}`,
        requiresShippingAddress ? `${t('store.checkout.noteAddress')}: ${orderForm.shippingAddress.trim()}` : '',
        orderForm.notes.trim() ? `${t('store.checkout.noteNotes')}: ${orderForm.notes.trim()}` : '',
      ].filter(Boolean).join('\n');

      const rows = cartItems.map((item) => ({
        id: crypto.randomUUID(),
        user_id: user.id,
        buyer_name: orderForm.buyerName,
        buyer_email: user.email || null,
        buyer_phone: orderForm.buyerPhone,
        buyer_account_type: accountType,
        product_id: item.product.id,
        product_name: item.product.name,
        product_category: item.product.category,
        product_image: item.product.image || null,
        product_brand: item.product.brand || null,
        product_model: item.product.model || null,
        unit_price: item.product.price,
        quantity: item.quantity,
        total_price: item.product.price * item.quantity,
        currency: item.product.currency || 'SAR',
        payment_method: orderForm.paymentMethod,
        payment_provider: orderForm.paymentMethod,
        payment_type: orderForm.paymentType,
        installment_months: orderForm.paymentType === 'installment' ? Number(orderForm.installmentMonths || 0) : null,
        status: 'pending',
        shipping_address: requiresShippingAddress ? orderForm.shippingAddress : null,
        shipping_city: requiresShippingLocation ? orderForm.shippingCity : null,
        shipping_country: requiresShippingLocation ? orderForm.shippingCountry : null,
        notes: structuredNotes || null,
        updated_at: new Date().toISOString(),
      }));

      const { error } = await supabase.from('store_orders').insert(rows);
      if (error) {
        if (error.code === 'PGRST205') { setOrdersUnavailable(true); throw new Error(t('store.errors.ordersUnavailable')); }
        throw error;
      }

      const selectedPaymentOpt = ACTIVE_STORE_PAYMENT_OPTIONS.find((o) => o.id === orderForm.paymentMethod);
      const cartOrderId = rows[0].id;

      if (orderForm.paymentMethod === 'geidea') {
        toast.success(t('store.success.redirecting'));
        const response = await fetch('/api/geidea/create-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amount: cartTotal,
            currency: cartCurrency,
            customerEmail: user.email || 'store@el7lm.com',
            customerName: orderForm.buyerName,
            merchantReferenceId: cartOrderId,
            returnUrl: `${window.location.origin}${pathname || '/dashboard/player/store'}?payment=success&order=${cartOrderId}`,
            metadata: { source: 'store_cart', orderId: cartOrderId, itemCount: rows.length },
          }),
        });
        const result = await response.json();
        if (!response.ok || !result?.success || !result?.redirectUrl) {
        toast.error(result?.error || t('store.errors.paymentLinkFailed'));
        }
        window.location.href = result.redirectUrl;
        return;
      }

      if (orderForm.paymentMethod === 'skipcash') {
        toast.success(t('store.success.redirecting'));
        const response = await fetch('/api/skipcash/create-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amount: cartTotal,
            customerEmail: user.email || 'store@el7lm.com',
            customerPhone: orderForm.buyerPhone,
            customerName: orderForm.buyerName,
            transactionId: cartOrderId,
            custom1: `cart:${rows.length}items`,
            returnUrl: `${window.location.origin}/payment/success?method=skipcash&order=${cartOrderId}&amount=${cartTotal}`,
          }),
        });
        const result = await response.json();
        if (!response.ok || !result?.success || !result?.payUrl) {
          throw new Error(result?.error ? `SkipCash: ${result.error}` : t('store.errors.paymentLinkFailed'));
        }
        window.location.href = result.payUrl;
        return;
      }

      setCartItems([]);
      setShowCart(false);
      setShowCartCheckout(false);

      if (selectedPaymentOpt?.type === 'installment') {
        setInstallmentProviderName(getPaymentOptionLabel(selectedPaymentOpt.id));
        setShowInstallmentNotice(true);
        toast.success(t('store.success.orderReceived'));
      } else if (orderForm.paymentMethod === 'mobile_wallet') {
        setTransferProviderName(selectedPaymentOpt ? getPaymentOptionLabel(selectedPaymentOpt.id) : getPaymentOptionLabel('mobile_wallet'));
        setShowTransferNotice(true);
        toast.success(t('store.success.orderRegistered'));
      } else {
        toast.success(t('store.success.cartOrderSuccess').replace('{{count}}', String(rows.length)));
      }
      await loadOrders();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('store.errors.orderFailed'));
    } finally {
      setSubmittingOrder(false);
    }
  }

  async function confirmPurchase() {
    if (!selectedProduct || !user) {
      toast.error(t('store.errors.loginRequired'));
      return;
    }

    if (!orderForm.buyerName.trim()) {
      toast.error(t('store.errors.nameRequired'));
      return;
    }

    if (!orderForm.buyerPhone.trim()) {
      toast.error(t('store.errors.phoneRequired'));
      return;
    }

    if (requiresShippingLocation && (!orderForm.shippingCity.trim() || !orderForm.shippingCountry.trim())) {
      toast.error(t('store.errors.locationRequired'));
      return;
    }

    if (requiresShippingAddress && !orderForm.shippingAddress.trim()) {
      toast.error(t('store.errors.addressRequired'));
      return;
    }

    if (orderForm.paymentType === 'installment' && !orderForm.installmentMonths) {
      toast.error(t('store.errors.installmentRequired'));
      return;
    }

    try {
      setSubmittingOrder(true);

      const structuredNotes = [
        `${t('store.checkout.noteAddressLabel')}: ${getAddressLabel(orderForm.addressLabel)}`,
        `${t('store.checkout.noteDeliveryMethod')}: ${getDeliveryMethodLabel(orderForm.deliveryMethod)}`,
        `${t('store.checkout.notePreferredContactMethod')}: ${getContactMethodLabel(orderForm.contactMethod)}`,
        `${t('store.checkout.noteContactWindow')}: ${getContactWindowLabel(orderForm.contactWindow)}`,
        requiresShippingAddress ? `${t('store.checkout.noteDetailedAddress')}: ${orderForm.shippingAddress.trim()}` : '',
        orderForm.deliveryMethod === 'branch_pickup' ? t('store.checkout.noteBranchPickup') : '',
        orderForm.deliveryMethod === 'coordinator' ? t('store.checkout.noteCoordinator') : '',
        orderForm.paymentMethod === 'mobile_wallet'
          ? `${t('store.checkout.noteWalletTransfer')} ${MANUAL_TRANSFER_NUMBER}`
          : '',
        orderForm.notes.trim() ? `${t('store.checkout.noteExtraNotes')}: ${orderForm.notes.trim()}` : '',
      ]
        .filter(Boolean)
        .join('\n');

      const orderId = crypto.randomUUID();
      const { error } = await supabase.from('store_orders').insert({
        id: orderId,
        user_id: user.id,
        buyer_name: orderForm.buyerName,
        buyer_email: user.email || null,
        buyer_phone: orderForm.buyerPhone,
        buyer_account_type: accountType,
        product_id: selectedProduct.id,
        product_name: selectedProduct.name,
        product_category: selectedProduct.category,
        product_image: selectedProduct.image || null,
        product_brand: selectedProduct.brand || null,
        product_model: selectedProduct.model || null,
        unit_price: selectedProduct.price,
        quantity: purchaseQuantity,
        total_price: selectedProduct.price * purchaseQuantity,
        currency: selectedProduct.currency || 'SAR',
        payment_method: orderForm.paymentMethod,
        payment_provider: orderForm.paymentMethod,
        payment_type: orderForm.paymentType,
        installment_months:
          orderForm.paymentType === 'installment'
            ? Number(orderForm.installmentMonths || 0)
            : null,
        status: 'pending',
        shipping_address: requiresShippingAddress ? orderForm.shippingAddress : null,
        shipping_city: requiresShippingLocation ? orderForm.shippingCity : null,
        shipping_country: requiresShippingLocation ? orderForm.shippingCountry : null,
        notes: structuredNotes || null,
        updated_at: new Date().toISOString(),
      });

      if (error) {
        if (error.code === 'PGRST205') {
          setOrdersUnavailable(true);
          throw new Error(t('store.errors.ordersUnavailableTryLater'));
        }
        throw error;
      }

      if (selectedPaymentOption?.type === 'installment') {
        setInstallmentProviderName(getPaymentOptionLabel(selectedPaymentOption.id));
        setShowInstallmentNotice(true);
        toast.success(t('store.success.orderReceived'));
        resetPurchaseState();
        await loadOrders();
        return;
      }

      if (orderForm.paymentMethod === 'mobile_wallet') {
        setTransferProviderName(getPaymentOptionLabel('mobile_wallet'));
        setShowTransferNotice(true);
        toast.success(t('store.success.orderRegistered'));
        resetPurchaseState();
        await loadOrders();
        return;
      }

      if (orderForm.paymentMethod === 'geidea') {
        const response = await fetch('/api/geidea/create-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amount: selectedProduct.price * purchaseQuantity,
            currency: selectedProduct.currency || 'SAR',
            customerEmail: user.email || 'store@el7lm.com',
            customerName: orderForm.buyerName,
            merchantReferenceId: orderId,
            returnUrl: `${window.location.origin}${pathname || '/dashboard/player/store'}?payment=success&order=${orderId}`,
            metadata: {
              source: 'store_order',
              orderId,
              productId: selectedProduct.id,
            },
          }),
        });
        const result = await response.json();
        if (!response.ok || !result?.success || !result?.redirectUrl) {
        toast.error(result?.error || t('store.errors.paymentLinkFailed'));
        }
        toast.success(t('store.success.redirecting'));
        window.location.href = result.redirectUrl;
        return;
      }

      if (orderForm.paymentMethod === 'skipcash') {
        const response = await fetch('/api/skipcash/create-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amount: selectedProduct.price * purchaseQuantity,
            customerEmail: user.email || 'store@el7lm.com',
            customerPhone: orderForm.buyerPhone,
            customerName: orderForm.buyerName,
            transactionId: orderId,
            custom1: `store:${selectedProduct.id}`,
            returnUrl: `${window.location.origin}/payment/success?method=skipcash&order=${orderId}&amount=${selectedProduct.price * purchaseQuantity}`,
          }),
        });
        const result = await response.json();
        if (!response.ok || !result?.success || !result?.payUrl) {
          throw new Error(result?.error ? `SkipCash: ${result.error}` : t('store.errors.paymentLinkFailed'));
        }
        toast.success(t('store.success.redirecting'));
        window.location.href = result.payUrl;
        return;
      }

      toast.success(t('store.success.orderSuccess'));
      resetPurchaseState();
      await loadOrders();
    } catch (error) {
      console.error('Store order submit failed:', error);
      toast.error(error instanceof Error ? error.message : t('store.errors.orderFailed'));
    } finally {
      setSubmittingOrder(false);
    }
  }

  // Loading skeleton
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50" dir={isRTL ? "rtl" : "ltr"}>
        <div className="mx-auto max-w-7xl px-4 py-8">
          <div className="mb-8 h-48 animate-pulse rounded-3xl bg-slate-200" />
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-80 animate-pulse rounded-3xl bg-slate-200" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50" dir={isRTL ? "rtl" : "ltr"}>
      {/* ── Hero Banner ── */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#101828] to-[#1e2d45]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_#ffb70325_0%,_transparent_55%)]" />
        <div className="relative z-10 mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between"
          >
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#ffb703]/40 bg-[#ffb703]/15 px-4 py-1.5 text-sm font-bold text-[#ffb703]">
                <Zap className="h-3.5 w-3.5" />
                {t('store.badge')}
              </div>
              <h1 className="text-3xl font-black text-white sm:text-4xl lg:text-5xl">
                {t('store.heroTitle')}
                <span className="block bg-gradient-to-l from-[#ffb703] to-[#f59e0b] bg-clip-text text-transparent">
                  {t('store.heroTitle2')}
                </span>
              </h1>
              <p className="max-w-xl text-base leading-relaxed text-slate-300">
                {t('store.heroDesc')}
              </p>
            </div>

            {/* Stats row */}
            <div className="flex flex-wrap gap-3">
              {[
                { icon: Package, labelKey: 'store.statProducts', value: products.length, color: 'text-[#ffb703]' },
                { icon: ShoppingBag, labelKey: 'store.statAvailable', value: availableProducts.length, color: 'text-emerald-400' },
                { icon: Truck, labelKey: 'store.statMyOrders', value: orders.length, color: 'text-sky-400' },
              ].map(({ icon: Icon, labelKey, value, color }) => (
                <button
                  key={labelKey}
                  type="button"
                  onClick={labelKey === 'store.statMyOrders' ? () => setShowOrders(!showOrders) : undefined}
                  className={`flex min-w-[90px] flex-col items-center justify-center gap-1 rounded-2xl border border-white/20 bg-white/10 px-5 py-3 backdrop-blur-sm transition hover:bg-white/20 ${labelKey === 'store.statMyOrders' ? 'cursor-pointer' : 'cursor-default'}`}
                >
                  <Icon className={`h-4 w-4 ${color}`} />
                  <span className="text-xl font-black text-white">{value}</span>
                  <span className="text-[11px] text-slate-300">{t(labelKey)}</span>
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
              { icon: ShieldCheck, labelKey: 'store.trustSecure' },
              { icon: Truck, labelKey: 'store.trustFast' },
              { icon: CreditCard, labelKey: 'store.trustInstallment' },
              { icon: Star, labelKey: 'store.trustOriginal' },
            ].map(({ icon: Icon, labelKey }) => (
              <div
                key={labelKey}
                className="flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold text-slate-200 backdrop-blur-sm"
              >
                <Icon className="h-3.5 w-3.5 text-[#ffb703]" />
                {t(labelKey)}
              </div>
            ))}
          </motion.div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 pb-16 pt-6 sm:px-6 lg:px-8">

        {/* ── Orders Panel (collapsible) ── */}
        <AnimatePresence>
          {showOrders && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-6 overflow-hidden"
            >
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="rounded-xl bg-sky-100 p-2">
                      <Truck className="h-5 w-5 text-sky-600" />
                    </div>
                    <div>
                      <h2 className="font-black text-slate-900">{t('store.orders.tabTitle')}</h2>
                      <p className="text-xs text-slate-500">{t('store.orders.tabSubtitle')}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowOrders(false)}
                    className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                  >
                    <XCircle className="h-5 w-5" />
                  </button>
                </div>

                {ordersLoading ? (
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-28 animate-pulse rounded-2xl bg-slate-100" />
                    ))}
                  </div>
                ) : orders.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 py-10 text-center">
                    <ShoppingBag className="mx-auto mb-3 h-10 w-10 text-slate-300" />
                    <p className="text-sm text-slate-500">{t('store.orders.noOrders')}</p>
                  </div>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {orders.slice(0, 6).map((order) => {
                      const style = ORDER_STATUS_STYLES[order.status];
                      return (
                        <div
                          key={order.id}
                          className="rounded-2xl border border-slate-100 bg-slate-50 p-4"
                        >
                          <div className="mb-3 flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <div className="truncate font-bold text-slate-900">{order.product_name}</div>
                              <div className="mt-0.5 text-xs text-slate-400">
                                {new Date(order.created_at).toLocaleDateString(locale === 'ar' ? 'ar-EG' : 'en-US')}
                              </div>
                            </div>
                            <span className={`flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${style.bg} ${style.text}`}>
                              <span className={`inline-block h-1.5 w-1.5 rounded-full ${style.dot}`} />
                              {orderStatusLabels[order.status]}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-slate-500">{order.quantity} {t('store.orders.quantity')}</span>
                            <span className="font-black text-[#d97706]">
                              {Number(order.total_price || 0).toLocaleString()} {order.currency || 'SAR'}
                            </span>
                          </div>
                          <div className="mt-2 rounded-xl bg-white px-3 py-1.5 text-xs text-slate-500">
                            {order.payment_type === 'installment'
                              ? `${getPaymentOptionLabel(order.payment_method || '')} • ${order.installment_months || '-'} ${t('store.checkout.months')}`
                              : getPaymentOptionLabel(order.payment_method || '')}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Flash Sale Banner ── */}
        <AnimatePresence>
          {!countdown.ended && flashSaleProducts.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              className="mb-6 overflow-hidden rounded-3xl bg-gradient-to-r from-rose-600 via-rose-500 to-orange-500 p-px shadow-lg shadow-rose-200"
            >
              <div className="flex flex-col items-center gap-4 rounded-[calc(1.5rem-1px)] bg-gradient-to-r from-rose-600 via-rose-500 to-orange-500 px-5 py-4 sm:flex-row sm:justify-between">
                {/* Label */}
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 animate-bounce items-center justify-center rounded-2xl bg-white/20 text-xl">⚡</div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest text-white/80">{t('store.flashSaleEnds')}</p>
                    <p className="text-lg font-black text-white">{t('store.flashSale.title')}</p>
                  </div>
                </div>
                {/* Countdown */}
                <div className="flex items-center gap-2">
                  {[
                    { v: countdown.days,    l: t('store.flashSale.countdown.days') },
                    { v: countdown.hours,   l: t('store.flashSale.countdown.hours') },
                    { v: countdown.minutes, l: t('store.flashSale.countdown.minutes') },
                    { v: countdown.seconds, l: t('store.flashSale.countdown.seconds') },
                  ].map(({ v, l }, i) => (
                    <React.Fragment key={l}>
                      <div className="flex min-w-[52px] flex-col items-center rounded-2xl bg-white/20 px-3 py-2 backdrop-blur-sm">
                        <span className="text-2xl font-black tabular-nums text-white leading-none">
                          {String(v).padStart(2, '0')}
                        </span>
                        <span className="mt-0.5 text-[10px] font-bold text-white/80">{l}</span>
                      </div>
                      {i < 3 && <span className="text-xl font-black text-white/60">:</span>}
                    </React.Fragment>
                  ))}
                </div>
                {/* CTA */}
                <button
                  type="button"
                  onClick={() => setSelectedCategory('all')}
                  className="shrink-0 rounded-2xl bg-white px-5 py-2.5 text-sm font-black text-rose-600 shadow-md transition hover:bg-rose-50 active:scale-95"
                >
                  {t('store.product.buyNow')} →
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Search & Filters ── */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={t('store.searchPlaceholder')}
              className="h-12 w-full rounded-2xl border border-slate-200 bg-white pr-10 pl-4 text-sm text-slate-800 placeholder:text-slate-400 outline-none shadow-sm focus:border-[#ffb703] focus:ring-2 focus:ring-[#ffb703]/20 transition"
            />
          </div>
          {/* Cart icon */}
          <button
            type="button"
            onClick={() => setShowCart(true)}
            className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:border-[#ffb703] hover:bg-amber-50"
            aria-label={t('store.cart.title')}
          >
            <ShoppingCart className="h-5 w-5 text-slate-700" />
            {cartCount > 0 && (
              <span className="absolute -top-1.5 -left-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-[#ffb703] text-[10px] font-black text-slate-900 shadow-sm">
                {cartCount > 9 ? '9+' : cartCount}
              </span>
            )}
          </button>
        </div>

        {/* ── Category Pills ── */}
        <div className="mb-8 flex flex-wrap gap-2">
          {(Object.keys(categoryLabels) as Array<'all' | StoreCategory>).map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold transition-all ${
                selectedCategory === cat
                  ? 'bg-[#101828] text-white shadow-md'
                  : 'border border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50 shadow-sm'
              }`}
            >
              <span className="text-base">{CATEGORY_ICONS[cat]}</span>
              {categoryLabels[cat]}
              {cat !== 'all' && (
                <span className={`rounded-full px-2 py-0.5 text-xs ${selectedCategory === cat ? 'bg-white/20' : 'bg-slate-100'}`}>
                  {products.filter((p) => p.category === cat).length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── Results count ── */}
        {filteredProducts.length > 0 && (
          <div className="mb-5 flex items-center justify-between">
            <p className="text-sm text-slate-500">
              {t('store.product.showing')} <span className="font-bold text-slate-800">{filteredProducts.length}</span> {t('store.statProducts')}
              {selectedCategory !== 'all' ? ` ${t('store.product.inCategory')} ${categoryLabels[selectedCategory]}` : ''}
            </p>
            <p className="text-sm text-slate-500">
              <span className="font-bold text-emerald-600">{availableProducts.length}</span> {t('store.product.available')}
            </p>
          </div>
        )}

        {/* ── Products Grid ── */}
        {filteredProducts.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex min-h-[400px] flex-col items-center justify-center gap-4 rounded-3xl border border-dashed border-slate-200 bg-white text-center shadow-sm"
          >
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-slate-100 text-4xl">
              🔍
            </div>
            <h3 className="text-xl font-black text-slate-900">{t('store.errors.noProductsFound')}</h3>
            <p className="max-w-sm text-sm text-slate-500">
              {t('store.errors.tryDifferentSearch')}
            </p>
            <button
              type="button"
              onClick={() => { setSearchTerm(''); setSelectedCategory('all'); }}
              className="rounded-full bg-[#101828] px-6 py-2 text-sm font-bold text-white transition hover:bg-[#1e2d45]"
            >
              {categoryLabels['all']}
            </button>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {filteredProducts.map((product, index) => (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05, duration: 0.4 }}
              >
                <div className="group relative flex flex-col overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-slate-200 hover:shadow-xl hover:shadow-slate-200/80">
                  {/* ── Product Image Carousel ── */}
                  <div
                    className="relative aspect-[4/3] overflow-hidden bg-gradient-to-br from-slate-100 to-slate-200"
                    onMouseEnter={() => startCarousel(product.id, product.images.length || 1)}
                    onMouseLeave={() => { stopCarousel(product.id); setCarouselIndex((p) => ({ ...p, [product.id]: 0 })); }}
                  >
                    {product.images.length > 0 ? (
                      product.images.map((src, imgIdx) => (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          key={`${product.id}-img-${imgIdx}`}
                          src={src}
                          alt={product.name}
                          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${
                            (carouselIndex[product.id] ?? 0) === imgIdx ? 'opacity-100' : 'opacity-0'
                          }`}
                          onError={(e) => { e.currentTarget.style.display = 'none'; }}
                        />
                      ))
                    ) : product.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={product.image}
                        alt={product.name}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <span className="text-7xl opacity-30">{getCategoryIcon(product.category)}</span>
                      </div>
                    )}

                    {/* Gradient overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />

                    {/* Dot indicators */}
                    {product.images.length > 1 && (
                      <div className="absolute bottom-10 left-1/2 flex -translate-x-1/2 gap-1">
                        {product.images.map((_, di) => (
                          <span
                            key={di}
                            className={`block h-1.5 rounded-full transition-all duration-300 ${
                              (carouselIndex[product.id] ?? 0) === di ? 'w-4 bg-white' : 'w-1.5 bg-white/50'
                            }`}
                          />
                        ))}
                      </div>
                    )}

                    {/* ── Left badges: availability + discount + flash ── */}
                    <div className="absolute left-3 top-3 flex flex-col gap-1.5">
                      {/* Availability */}
                      {product.isAvailable ? (
                        <span className="flex items-center gap-1 rounded-full bg-emerald-500 px-2.5 py-1 text-[11px] font-bold text-white shadow-sm">
                          <span className="h-1.5 w-1.5 rounded-full bg-white" />
                          {t('store.product.available')}
                        </span>
                      ) : (
                        <span className="rounded-full bg-slate-600 px-2.5 py-1 text-[11px] font-bold text-white">
                          {t('store.product.outOfStock')}
                        </span>
                      )}
                      {/* Discount badge */}
                      {product.discountPercent && product.discountPercent > 0 && (
                        <span className="rounded-full bg-rose-500 px-2.5 py-1 text-[11px] font-black text-white shadow-sm">
                          {t('store.product.discount').replace('{{percent}}', String(product.discountPercent))}
                        </span>
                      )}
                      {/* Flash sale badge */}
                      {product.flashSaleEndAt && new Date(product.flashSaleEndAt) > new Date() && (
                        <span className="flex items-center gap-1 rounded-full bg-orange-500 px-2.5 py-1 text-[11px] font-black text-white shadow-sm">
                          ⚡ {t('store.flashSale.title')}
                        </span>
                      )}
                    </div>

                    {/* ── Right: Wishlist + Featured badge ── */}
                    <div className="absolute right-3 top-3 flex flex-col gap-2">
                      {/* Featured star */}
                      {product.isFeatured && (
                        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-400 text-sm shadow-md">
                          ⭐
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => toggleWishlist(product.id)}
                        className="flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-slate-400 shadow-sm backdrop-blur-sm transition hover:bg-rose-500 hover:text-white"
                      >
                        <Heart className={`h-4 w-4 ${wishlist.includes(product.id) ? 'fill-rose-500 text-rose-500' : ''}`} />
                      </button>
                    </div>

                    {/* Category pill bottom */}
                    <div className="absolute bottom-3 right-3">
                      <span className="flex items-center gap-1 rounded-full bg-white/90 px-3 py-1 text-[11px] font-semibold text-slate-700 shadow-sm backdrop-blur-sm">
                        <span>{getCategoryIcon(product.category)}</span>
                        {categoryLabels[product.category]}
                      </span>
                    </div>
                  </div>

                  {/* Product info */}
                  <div className="flex flex-1 flex-col gap-3 p-4">
                    <div>
                      <h3 className="line-clamp-1 text-base font-black text-slate-900">{product.name}</h3>
                      {(product.brand || product.model) && (
                        <p className="mt-0.5 text-xs text-slate-400">
                          {[product.brand, product.model].filter(Boolean).join(' • ')}
                        </p>
                      )}
                      {product.description && (
                        <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-slate-500">
                          {product.description}
                        </p>
                      )}
                    </div>

                    <div className="mt-auto flex items-center justify-between pt-2">
                      <div>
                        {/* Price with optional strikethrough */}
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-xl font-black text-[#d97706]">
                            {formatStorePrice(product.price, product.currency)}
                          </span>
                          {product.originalPrice && product.originalPrice > product.price && (
                            <span className="text-xs font-semibold text-slate-400 line-through">
                              {formatStorePrice(product.originalPrice, product.currency)}
                            </span>
                          )}
                        </div>
                        {product.stock > 0 && product.stock <= 5 && (
                          <div className="mt-0.5 flex items-center gap-1 text-[11px] text-rose-500">
                            <Tag className="h-3 w-3" />
                            {t('store.product.onlyStockLeft').replace('{{count}}', String(product.stock))}
                          </div>
                        )}
                        {product.isFeatured && !product.discountPercent && (
                          <div className="mt-0.5 text-[11px] font-bold text-amber-600">⭐ {t('store.product.featured')}</div>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => addToCart(product)}
                        disabled={!product.isAvailable}
                        className={`flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-black transition-all ${
                          product.isAvailable
                            ? 'bg-[#101828] text-white hover:bg-[#1e2d45] hover:shadow-lg active:scale-95'
                            : 'cursor-not-allowed bg-slate-100 text-slate-400'
                        }`}
                      >
                        <ShoppingCart className="h-4 w-4" />
                        {t('store.product.addToCart')}
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
      {/* ── Cart Drawer ── */}
      <AnimatePresence>
        {showCart && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
              onClick={() => setShowCart(false)}
            />
            <motion.div
              initial={{ x: isRTL ? '-100%' : '100%' }} animate={{ x: 0 }} exit={{ x: isRTL ? '-100%' : '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 280 }}
              className={`fixed inset-y-0 ${isRTL ? 'left-0' : 'right-0'} z-50 flex w-full max-w-sm flex-col bg-white shadow-2xl`}
              dir={isRTL ? "rtl" : "ltr"}
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#101828]">
                    <ShoppingCart className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <h3 className="font-black text-slate-900">{t('store.cart.title')}</h3>
                    <p className="text-[11px] text-slate-400">{t('store.cart.itemsCount').replace('{{count}}', String(cartCount))}</p>
                  </div>
                </div>
                <button type="button" onClick={() => setShowCart(false)}
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-400 transition hover:bg-slate-100">
                  <XCircle className="h-4 w-4" />
                </button>
              </div>

              {/* Items */}
              <div className="flex-1 overflow-y-auto px-4 py-4">
                {cartItems.length === 0 ? (
                  <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
                    <div className="flex h-20 w-20 items-center justify-center rounded-full bg-slate-100 text-4xl">🛒</div>
                    <h4 className="font-black text-slate-700">{t('store.cart.empty')}</h4>
                    <p className="text-sm text-slate-400">{t('store.cart.emptyDesc')}</p>
                    <button type="button" onClick={() => setShowCart(false)}
                      className="rounded-2xl bg-[#101828] px-6 py-2.5 text-sm font-black text-white transition hover:bg-[#1e2d45]">
                      {t('store.product.buyNow')}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {cartItems.map(({ product, quantity }) => (
                      <div key={product.id} className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-3">
                        <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-slate-200">
                          {product.image ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={product.image} alt={product.name} className="h-full w-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-2xl">{getCategoryIcon(product.category)}</div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="line-clamp-1 text-sm font-black text-slate-900">{product.name}</p>
                          <p className="text-xs font-bold text-[#d97706]">{formatStorePrice(product.price, product.currency)}</p>
                          {/* Qty controls */}
                          <div className="mt-2 flex items-center gap-2">
                            <button type="button" onClick={() => updateCartQty(product.id, quantity - 1)}
                              className="flex h-6 w-6 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-red-50 hover:text-red-500 text-sm font-black">−</button>
                            <span className="min-w-[20px] text-center text-sm font-black text-slate-800">{quantity}</span>
                            <button type="button" onClick={() => updateCartQty(product.id, Math.min(quantity + 1, product.stock))}
                              className="flex h-6 w-6 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-emerald-50 hover:text-emerald-600 text-sm font-black">+</button>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <p className="text-sm font-black text-slate-900">{formatStorePrice(product.price * quantity, product.currency)}</p>
                          <button type="button" onClick={() => removeFromCart(product.id)}
                            className="text-[11px] font-bold text-rose-400 transition hover:text-rose-600">{t('store.cart.delete')}</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Footer */}
              {cartItems.length > 0 && (
                <div className="shrink-0 border-t border-slate-100 bg-white px-5 py-4">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-sm font-bold text-slate-500">{t('store.cart.total')} ({cartCount} {t('store.statProducts')})</span>
                    <span className="text-xl font-black text-[#d97706]">{formatStorePrice(cartTotal, cartCurrency)}</span>
                  </div>
                  <button type="button"
                    onClick={() => {
                      setShowCart(false);
                      const defaultOption = ACTIVE_STORE_PAYMENT_OPTIONS[0];
                      setOrderForm((prev) => ({
                        ...prev,
                        paymentMethod: defaultOption.id,
                        paymentType: defaultOption.type,
                        installmentMonths: '',
                        shippingCountry: prev.shippingCountry || DEFAULT_SHIPPING_COUNTRY,
                        shippingCity: prev.shippingCity || getCitiesByCountry(prev.shippingCountry || DEFAULT_SHIPPING_COUNTRY)[0] || DEFAULT_SHIPPING_CITY,
                      }));
                      setShowCartCheckout(true);
                    }}
                    className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#101828] text-sm font-black text-white transition hover:bg-[#1e2d45] hover:shadow-lg active:scale-[0.98]">
                    <CheckCircle className="h-4 w-4" />
                    {t('store.cart.checkout')}
                  </button>
                  <button type="button" onClick={() => { setCartItems([]); }} className="mt-2 w-full text-center text-xs font-bold text-rose-400 transition hover:text-rose-600 py-1">
                    {t('store.cart.clear')}
                  </button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Cart Checkout Modal ── */}
      <AnimatePresence>
        {showCartCheckout && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }} transition={{ duration: 0.25 }}
              className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl"
            >
              {/* Header */}
              <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#101828]">
                    <ShoppingCart className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900">{t('store.checkout.title')}</h3>
                    <p className="text-[11px] text-slate-400">{cartCount} {t('store.statProducts')} — {t('store.cart.total')} {formatStorePrice(cartTotal, cartCurrency)}</p>
                  </div>
                </div>
                <button type="button" onClick={() => setShowCartCheckout(false)}
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-400 transition hover:bg-slate-100">
                  <XCircle className="h-4 w-4" />
                </button>
              </div>

              {/* Scrollable body */}
              <div className="flex-1 overflow-y-auto">
                {/* Items summary strip */}
                <div className="border-b border-slate-100 bg-slate-50 px-5 py-3">
                  <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">{t('store.orders.quantity')}</p>
                  <div className="space-y-2">
                    {cartItems.map(({ product, quantity }) => (
                      <div key={product.id} className="flex items-center justify-between gap-2">
                        <span className="text-sm font-semibold text-slate-700 truncate">{product.name}</span>
                        <span className="shrink-0 text-sm font-black text-[#d97706]">
                          {quantity} × {formatStorePrice(product.price, product.currency)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="divide-y divide-slate-100">
                  {/* Step 1: Buyer */}
                  <div className="px-5 py-4">
                    <h4 className="mb-3 flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-500">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#101828] text-[10px] text-white">1</span>
                      {t('store.checkout.buyerInfo')}
                    </h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-slate-500">{t('store.checkout.buyerName')}</label>
                        <Input value={orderForm.buyerName} onChange={(e) => setOrderForm((prev) => ({ ...prev, buyerName: e.target.value }))}
                          placeholder={t('store.checkout.buyerNamePlaceholder')} className="h-10 rounded-xl border-slate-200 bg-slate-50 text-sm focus:border-[#d97706] focus:bg-white" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-slate-500">{t('store.checkout.buyerPhone')}</label>
                        <Input value={orderForm.buyerPhone} onChange={(e) => setOrderForm((prev) => ({ ...prev, buyerPhone: e.target.value }))}
                          placeholder="05xxxxxxxx" className="h-10 rounded-xl border-slate-200 bg-slate-50 text-sm focus:border-[#d97706] focus:bg-white" />
                      </div>
                    </div>
                  </div>

                  {/* Step 2: Payment */}
                  <div className="px-5 py-4">
                    <h4 className="mb-3 flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-500">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#101828] text-[10px] text-white">2</span>
                      {t('store.checkout.paymentMethod')}
                    </h4>
                    <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">{t('store.checkout.paymentType')}</p>
                    <div className="mb-4 grid grid-cols-3 gap-2">
                      {FULL_PAYMENT_OPTIONS.map((option) => {
                        const isSelected = orderForm.paymentMethod === option.id;
                        return (
                          <button key={option.id} type="button"
                            onClick={() => setOrderForm((prev) => ({ ...prev, paymentMethod: option.id, paymentType: 'full', installmentMonths: '' }))}
                            className={`flex flex-col items-center gap-1.5 rounded-2xl border-2 px-2 py-3 text-center transition ${isSelected ? 'border-[#101828] bg-[#101828]/5' : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'}`}>
                            <span className="text-xl leading-none">{option.brandMark}</span>
                            <span className={`text-[10px] font-bold leading-tight ${isSelected ? 'text-[#101828]' : 'text-slate-600'}`}>{getPaymentOptionLabel(option.id)}</span>
                            {isSelected && <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#101828]"><CheckCircle className="h-3 w-3 text-white" /></span>}
                          </button>
                        );
                      })}
                    </div>
                    <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">{t('store.checkout.installmentPlans')}</p>
                    <div className="grid grid-cols-3 gap-2">
                      {INSTALLMENT_OPTIONS.map((option) => {
                        const isSelected = orderForm.paymentMethod === option.id;
                        return (
                          <button key={option.id} type="button"
                            onClick={() => setOrderForm((prev) => ({ ...prev, paymentMethod: option.id, paymentType: 'installment', installmentMonths: String(option.plans?.[0] || '') }))}
                            className={`flex flex-col items-center gap-1 rounded-2xl border-2 px-2 py-2.5 text-center transition ${isSelected ? 'border-[#101828] bg-[#101828]/5' : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'}`}>
                            <span className={`rounded-lg px-2 py-0.5 text-[10px] font-black ${option.brandClassName} border`}>{option.brandMark}</span>
                            <span className={`text-[10px] leading-tight ${isSelected ? 'text-[#101828] font-black' : 'text-slate-500'}`}>{(option.plans || []).join('/')} {t('store.checkout.months')}</span>
                          </button>
                        );
                      })}
                    </div>
                    {selectedPaymentOption?.type === 'installment' && (
                      <div className="mt-4 rounded-2xl border border-slate-100 bg-slate-50 p-3">
                        <p className="mb-2 text-xs font-bold text-slate-500">{t('store.checkout.selectMonths')}</p>
                        <div className="flex flex-wrap gap-2">
                          {(selectedPaymentOption.plans || []).map((plan) => (
                            <button key={plan} type="button" onClick={() => setOrderForm((prev) => ({ ...prev, installmentMonths: String(plan) }))}
                              className={`rounded-xl px-5 py-2 text-sm font-black transition ${orderForm.installmentMonths === String(plan) ? 'bg-[#101828] text-white shadow-md' : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}>
                              {plan} {t('store.checkout.months')}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    {selectedPaymentOption?.id === 'mobile_wallet' && (
                      <div className="mt-3 rounded-2xl border border-fuchsia-200 bg-fuchsia-50 p-3">
                        <p className="text-xs font-semibold text-fuchsia-700">{t('store.orders.vodafoneNoticeTitle')}:</p>
                        <p className="mt-1 text-lg font-black tracking-[0.1em] text-fuchsia-900">{MANUAL_TRANSFER_NUMBER}</p>
                      </div>
                    )}
                  </div>

                  {/* Step 3: Delivery */}
                  <div className="px-5 py-4">
                    <h4 className="mb-3 flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-500">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#101828] text-[10px] text-white">3</span>
                      {t('store.cart.shipping')}
                    </h4>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-500">{t('store.checkout.deliveryMethod')}</label>
                      <select className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-[#d97706] focus:bg-white transition"
                        value={orderForm.deliveryMethod}
                        onChange={(e) => setOrderForm((prev) => ({ ...prev, deliveryMethod: e.target.value, shippingAddress: e.target.value === 'courier' ? prev.shippingAddress : '' }))}>
                        {deliveryMethodOptions.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                      </select>
                    </div>
                    {requiresShippingLocation && (
                      <div className="mt-3 grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-xs font-semibold text-slate-500">{t('store.checkout.country')}</label>
                          <select className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-[#d97706] focus:bg-white transition"
                            value={orderForm.shippingCountry}
                            onChange={(e) => { const c = e.target.value; setOrderForm((prev) => ({ ...prev, shippingCountry: c, shippingCity: getCitiesByCountry(c)[0] || '' })); }}>
                            {SUPPORTED_COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-semibold text-slate-500">{t('store.checkout.city')}</label>
                          <select className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-[#d97706] focus:bg-white transition"
                            value={orderForm.shippingCity} onChange={(e) => setOrderForm((prev) => ({ ...prev, shippingCity: e.target.value }))}>
                            {cityOptions.map((c) => <option key={c} value={c}>{c}</option>)}
                          </select>
                        </div>
                      </div>
                    )}
                    {requiresShippingAddress && (
                      <div className="mt-3 space-y-1">
                        <label className="text-xs font-semibold text-slate-500">{t('store.checkout.address')}</label>
                        <Input value={orderForm.shippingAddress} onChange={(e) => setOrderForm((prev) => ({ ...prev, shippingAddress: e.target.value }))}
                          placeholder={t('store.checkout.addressPlaceholder')} className="h-10 rounded-xl border-slate-200 bg-slate-50 text-sm focus:border-[#d97706] focus:bg-white" />
                      </div>
                    )}
                  </div>

                  {/* Step 4: Notes */}
                  <div className="px-5 py-4">
                    <h4 className="mb-3 flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-500">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#101828] text-[10px] text-white">4</span>
                      {t('store.checkout.notes')}
                    </h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-slate-500">{t('store.checkout.contactMethod')}</label>
                        <select className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-[#d97706] focus:bg-white transition"
                          value={orderForm.contactMethod} onChange={(e) => setOrderForm((prev) => ({ ...prev, contactMethod: e.target.value }))}>
                          {contactMethodOptions.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-slate-500">{t('store.checkout.contactWindow')}</label>
                        <select className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-[#d97706] focus:bg-white transition"
                          value={orderForm.contactWindow} onChange={(e) => setOrderForm((prev) => ({ ...prev, contactWindow: e.target.value }))}>
                          {contactWindowOptions.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                        </select>
                      </div>
                      <div className="col-span-2 space-y-1">
                        <Textarea value={orderForm.notes} onChange={(e) => setOrderForm((prev) => ({ ...prev, notes: e.target.value }))}
                          placeholder={t('store.checkout.notesPlaceholder')}
                          className="min-h-[64px] rounded-xl border-slate-200 bg-slate-50 text-sm focus:border-[#d97706] focus:bg-white" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Sticky footer */}
              <div className="shrink-0 border-t border-slate-100 bg-white px-5 py-4">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-sm font-bold text-slate-500">{t('store.cart.total')} ({cartCount} {t('store.statProducts')})</span>
                  <span className="text-2xl font-black text-[#d97706]">{formatStorePrice(cartTotal, cartCurrency)}</span>
                </div>
                <div className="flex gap-3">
                  <button type="button" onClick={() => setShowCartCheckout(false)}
                    className="h-12 w-24 shrink-0 rounded-2xl border border-slate-200 text-sm font-bold text-slate-500 transition hover:bg-slate-50">
                    {t('store.checkout.cancelBtn')}
                  </button>
                  <button type="button" onClick={() => void confirmCartPurchase()} disabled={submittingOrder}
                    className={`flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl text-sm font-black transition-all ${submittingOrder ? 'cursor-wait bg-[#101828]/70 text-white' : 'bg-[#101828] text-white hover:bg-[#1e2d45] hover:shadow-lg active:scale-[0.98]'}`}>
                    {submittingOrder
                      ? <><span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" /> {t('store.success.redirecting')}</>
                      : <><CheckCircle className="h-4 w-4" /> {t('store.checkout.confirmBtn')}</>}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Purchase Modal ── */}
      <AnimatePresence>
        {showPurchaseModal && selectedProduct && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.25 }}
              className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl"
            >
              {/* Header */}
              <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#101828]">
                    <ShoppingCart className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900">{t('store.checkout.title')}</h3>
                    <p className="text-[11px] text-slate-400">{t('store.checkout.subtitle')}</p>
                  </div>
                </div>
                <button type="button" onClick={resetPurchaseState}
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-400 transition hover:bg-slate-100">
                  <XCircle className="h-4 w-4" />
                </button>
              </div>

              {/* Scrollable body */}
              <div className="flex-1 overflow-y-auto">
                {/* Product strip */}
                <div className="flex items-center gap-3 border-b border-slate-100 bg-slate-50 px-5 py-3">
                  <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-slate-200">
                    {selectedProductMedia ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={selectedProductMedia} alt={selectedProduct.name} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-2xl">{getCategoryIcon(selectedProduct.category)}</div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-black text-slate-900">{selectedProduct.name}</p>
                    <p className="text-xs text-slate-400">
                      {[selectedProduct.brand, selectedProduct.model].filter(Boolean).join(' • ') || categoryLabels[selectedProduct.category]}
                    </p>
                  </div>
                  <div className="shrink-0 text-left">
                    <p className="text-[11px] text-slate-400">{t('store.cart.total')}</p>
                    <p className="text-lg font-black text-[#d97706]">
                      {formatStorePrice(selectedProduct.price * purchaseQuantity, selectedProduct.currency)}
                    </p>
                  </div>
                </div>

                {/* Image thumbnails */}
                {selectedProduct.images.length > 1 && (
                  <div className="flex gap-2 overflow-x-auto border-b border-slate-100 px-5 py-3">
                    {selectedProduct.images.map((image, idx) => (
                      <button key={`thumb-${idx}`} type="button" onClick={() => setSelectedProductMedia(image)}
                        className={`h-12 w-12 shrink-0 overflow-hidden rounded-xl border-2 transition ${selectedProductMedia === image ? 'border-[#d97706]' : 'border-slate-200 hover:border-slate-300'}`}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={image} alt="" className="h-full w-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}

                <div className="divide-y divide-slate-100">
                  {/* Step 1: Buyer */}
                  <div className="px-5 py-4">
                    <h4 className="mb-3 flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-500">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#101828] text-[10px] text-white">1</span>
                      {t('store.checkout.buyerInfo')}
                    </h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-slate-500">{t('store.checkout.buyerName')}</label>
                        <Input value={orderForm.buyerName}
                          onChange={(e) => setOrderForm((prev) => ({ ...prev, buyerName: e.target.value }))}
                          placeholder={t('store.checkout.buyerNamePlaceholder')}
                          className="h-10 rounded-xl border-slate-200 bg-slate-50 text-sm focus:border-[#d97706] focus:bg-white" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-slate-500">{t('store.checkout.buyerPhone')}</label>
                        <Input value={orderForm.buyerPhone}
                          onChange={(e) => setOrderForm((prev) => ({ ...prev, buyerPhone: e.target.value }))}
                          placeholder="05xxxxxxxx"
                          className="h-10 rounded-xl border-slate-200 bg-slate-50 text-sm focus:border-[#d97706] focus:bg-white" />
                      </div>
                    </div>
                  </div>

                  {/* Step 2: Payment */}
                  <div className="px-5 py-4">
                    <h4 className="mb-3 flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-500">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#101828] text-[10px] text-white">2</span>
                      {t('store.checkout.paymentMethod')}
                    </h4>

                    {/* Full payment group */}
                    <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">{t('store.checkout.paymentType')}</p>
                    <div className="mb-4 grid grid-cols-3 gap-2">
                      {FULL_PAYMENT_OPTIONS.map((option) => {
                        const isSelected = orderForm.paymentMethod === option.id;
                        return (
                          <button
                            key={option.id}
                            type="button"
                            onClick={() => setOrderForm((prev) => ({ ...prev, paymentMethod: option.id, paymentType: 'full', installmentMonths: '' }))}
                            className={`flex flex-col items-center gap-1.5 rounded-2xl border-2 px-2 py-3 text-center transition ${
                              isSelected ? 'border-[#101828] bg-[#101828]/5' : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                            }`}
                          >
                            <span className="text-xl leading-none">{option.brandMark}</span>
                            <span className={`text-[10px] font-bold leading-tight ${isSelected ? 'text-[#101828]' : 'text-slate-600'}`}>
                              {getPaymentOptionLabel(option.id)}
                            </span>
                            {isSelected && (
                              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#101828]">
                                <CheckCircle className="h-3 w-3 text-white" />
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>

                    {/* Installment group */}
                    <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">{t('store.checkout.installmentPlans')}</p>
                    <div className="grid grid-cols-3 gap-2">
                      {INSTALLMENT_OPTIONS.map((option) => {
                        const isSelected = orderForm.paymentMethod === option.id;
                        return (
                          <button
                            key={option.id}
                            type="button"
                            onClick={() => setOrderForm((prev) => ({ ...prev, paymentMethod: option.id, paymentType: 'installment', installmentMonths: String(option.plans?.[0] || '') }))}
                            className={`flex flex-col items-center gap-1 rounded-2xl border-2 px-2 py-2.5 text-center transition ${
                              isSelected ? 'border-[#101828] bg-[#101828]/5' : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                            }`}
                          >
                            <span className={`rounded-lg px-2 py-0.5 text-[10px] font-black ${option.brandClassName} border`}>
                              {option.brandMark}
                            </span>
                            <span className={`text-[10px] leading-tight ${isSelected ? 'text-[#101828] font-black' : 'text-slate-500'}`}>
                              {(option.plans || []).join('/')} {t('store.checkout.months')}
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Installment plan picker */}
                    {selectedPaymentOption?.type === 'installment' && (
                      <div className="mt-4 rounded-2xl border border-slate-100 bg-slate-50 p-3">
                        <p className="mb-2 text-xs font-bold text-slate-500">{t('store.checkout.selectMonths')}</p>
                        <div className="flex flex-wrap gap-2">
                          {(selectedPaymentOption.plans || []).map((plan) => (
                            <button key={plan} type="button"
                              onClick={() => setOrderForm((prev) => ({ ...prev, installmentMonths: String(plan) }))}
                              className={`rounded-xl px-5 py-2 text-sm font-black transition ${
                                orderForm.installmentMonths === String(plan)
                                  ? 'bg-[#101828] text-white shadow-md'
                                  : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                              }`}>
                              {plan} {t('store.checkout.months')}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Mobile wallet info */}
                    {selectedPaymentOption?.id === 'mobile_wallet' && (
                      <div className="mt-3 rounded-2xl border border-fuchsia-200 bg-fuchsia-50 p-3">
                        <p className="text-xs font-semibold text-fuchsia-700">{t('store.orders.vodafoneNoticeTitle')}:</p>
                        <p className="mt-1 text-lg font-black tracking-[0.1em] text-fuchsia-900">{MANUAL_TRANSFER_NUMBER}</p>
                        <p className="mt-1 text-[11px] text-fuchsia-600">{t('store.orders.vodafoneNoticeDesc')}</p>
                      </div>
                    )}
                  </div>

                  {/* Step 3: Delivery */}
                  <div className="px-5 py-4">
                    <h4 className="mb-3 flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-500">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#101828] text-[10px] text-white">3</span>
                      {t('store.cart.shipping')}
                    </h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-slate-500">{t('store.orders.quantity')}</label>
                        <select className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-[#d97706] focus:bg-white"
                          value={purchaseQuantity} onChange={(e) => setPurchaseQuantity(Number(e.target.value || '1'))}>
                          {Array.from({ length: Math.max(Math.min(selectedProduct.stock, 10), 1) }, (_, i) => i + 1).map((qty) => (
                            <option key={qty} value={qty}>{qty} {t('store.orders.quantity')}</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-slate-500">{t('store.checkout.deliveryMethod')}</label>
                        <select className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-[#d97706] focus:bg-white transition"
                          value={orderForm.deliveryMethod}
                          onChange={(e) => setOrderForm((prev) => ({
                            ...prev, deliveryMethod: e.target.value,
                            shippingAddress: e.target.value === 'courier' ? prev.shippingAddress : '',
                            addressLabel: e.target.value === 'courier' ? prev.addressLabel : 'home',
                          }))}>
                          {deliveryMethodOptions.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                        </select>
                      </div>
                    </div>
                    {requiresShippingLocation && (
                      <div className="mt-3 grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-xs font-semibold text-slate-500">{t('store.checkout.country')}</label>
                          <select className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-[#d97706] focus:bg-white transition"
                            value={orderForm.shippingCountry}
                            onChange={(e) => { const c = e.target.value; setOrderForm((prev) => ({ ...prev, shippingCountry: c, shippingCity: getCitiesByCountry(c)[0] || '' })); }}>
                            {SUPPORTED_COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-semibold text-slate-500">{t('store.checkout.city')}</label>
                          <select className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-[#d97706] focus:bg-white transition"
                            value={orderForm.shippingCity} onChange={(e) => setOrderForm((prev) => ({ ...prev, shippingCity: e.target.value }))}>
                            {cityOptions.map((c) => <option key={c} value={c}>{c}</option>)}
                          </select>
                        </div>
                      </div>
                    )}
                    {requiresShippingAddress && (
                      <div className="mt-3 space-y-2">
                        <div className="space-y-1">
                          <label className="text-xs font-semibold text-slate-500">{t('store.checkout.addressLabel')}</label>
                          <select className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-[#d97706] focus:bg-white transition"
                            value={orderForm.addressLabel} onChange={(e) => setOrderForm((prev) => ({ ...prev, addressLabel: e.target.value }))}>
                            {addressLabelOptions.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-semibold text-slate-500">{t('store.checkout.address')}</label>
                          <Input value={orderForm.shippingAddress}
                            onChange={(e) => setOrderForm((prev) => ({ ...prev, shippingAddress: e.target.value }))}
                            placeholder={t('store.checkout.addressPlaceholder')}
                            className="h-10 rounded-xl border-slate-200 bg-slate-50 text-sm focus:border-[#d97706] focus:bg-white" />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Step 4: Contact */}
                  <div className="px-5 py-4">
                    <h4 className="mb-3 flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-500">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#101828] text-[10px] text-white">4</span>
                      {t('store.checkout.contactMethod')}
                    </h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-slate-500">{t('store.checkout.contactMethod')}</label>
                        <select className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-[#d97706] focus:bg-white transition"
                          value={orderForm.contactMethod} onChange={(e) => setOrderForm((prev) => ({ ...prev, contactMethod: e.target.value }))}>
                          {contactMethodOptions.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-slate-500">{t('store.checkout.contactWindow')}</label>
                        <select className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-[#d97706] focus:bg-white transition"
                          value={orderForm.contactWindow} onChange={(e) => setOrderForm((prev) => ({ ...prev, contactWindow: e.target.value }))}>
                          {contactWindowOptions.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                        </select>
                      </div>
                      <div className="col-span-2 space-y-1">
                        <label className="text-xs font-semibold text-slate-500">{t('store.checkout.notes')}</label>
                        <Textarea value={orderForm.notes}
                          onChange={(e) => setOrderForm((prev) => ({ ...prev, notes: e.target.value }))}
                          placeholder={t('store.checkout.notesPlaceholder')}
                          className="min-h-[64px] rounded-xl border-slate-200 bg-slate-50 text-sm focus:border-[#d97706] focus:bg-white" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Sticky footer */}
              <div className="shrink-0 border-t border-slate-100 bg-white px-5 py-4">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-sm font-bold text-slate-500">{t('store.cart.total')}</span>
                  <span className="text-2xl font-black text-[#d97706]">
                    {formatStorePrice(selectedProduct.price * purchaseQuantity, selectedProduct.currency)}
                  </span>
                </div>
                <div className="flex gap-3">
                  <button type="button" onClick={resetPurchaseState}
                    className="h-12 w-24 shrink-0 rounded-2xl border border-slate-200 text-sm font-bold text-slate-500 transition hover:bg-slate-50">
                    {t('store.checkout.cancelBtn')}
                  </button>
                  <button type="button" onClick={() => void confirmPurchase()} disabled={submittingOrder}
                    className={`flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl text-sm font-black transition-all ${
                      submittingOrder ? 'cursor-wait bg-[#101828]/70 text-white' : 'bg-[#101828] text-white hover:bg-[#1e2d45] hover:shadow-lg active:scale-[0.98]'
                    }`}>
                    {submittingOrder ? (
                      <><span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" /> {t('store.success.redirecting')}</>
                    ) : selectedPaymentOption?.type === 'installment' ? (
                      <><CheckCircle className="h-4 w-4" /> {t('store.checkout.confirmBtn')}</>
                    ) : selectedPaymentOption?.id === 'mobile_wallet' ? (
                      <><CheckCircle className="h-4 w-4" /> {t('store.checkout.confirmBtn')}</>
                    ) : (
                      <><ExternalLink className="h-4 w-4" /> {t('store.product.buyNow')}</>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Installment Notice ── */}
      <AnimatePresence>
        {showInstallmentNotice && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md rounded-3xl border border-white/10 bg-slate-900 p-6 shadow-2xl"
            >
              <div className="mb-4 flex items-center gap-4">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-amber-500/20 text-amber-400">
                  <ShieldCheck className="h-8 w-8" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-white">{t('store.orders.installmentNoticeTitle')}</h3>
                  <p className="mt-1 text-sm text-slate-400">{t('store.orders.installmentNoticeSubtitle')}</p>
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300 leading-relaxed">
                <span className="font-bold text-white">{installmentProviderName}</span>
                <br />
                <span className="text-slate-400">
                  {t('store.orders.installmentNoticeDesc').replace('{{provider}}', installmentProviderName)}
                </span>
              </div>
              <div className="mt-5 flex gap-3">
                <button
                  type="button"
                  className="flex h-11 flex-1 items-center justify-center rounded-2xl bg-[#ffb703] font-black text-slate-900 transition hover:bg-[#f59e0b]"
                  onClick={() => setShowInstallmentNotice(false)}
                >
                  {t('common.ok')}
                </button>
                <button
                  type="button"
                  className="h-11 flex-1 rounded-2xl border border-white/10 font-bold text-slate-300 transition hover:bg-white/10"
                  onClick={() => { setShowInstallmentNotice(false); void loadOrders(); setShowOrders(true); }}
                >
                  {t('store.orders.tabTitle')}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Transfer Notice ── */}
      <AnimatePresence>
        {showTransferNotice && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md rounded-3xl border border-white/10 bg-slate-900 p-6 shadow-2xl"
            >
              <div className="mb-4 flex items-center gap-4">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-fuchsia-500/20 text-fuchsia-400">
                  <Wallet className="h-8 w-8" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-white">{t('store.orders.vodafoneNoticeTitle')}</h3>
                  <p className="mt-1 text-sm text-slate-400">{t('store.success.orderRegistered')}</p>
                </div>
              </div>
              <div className="rounded-2xl border border-fuchsia-500/30 bg-fuchsia-500/10 p-4">
                <p className="text-xs font-semibold text-fuchsia-300">{t('store.orders.vodafoneNoticeTitle')}</p>
                <p className="mt-2 text-center text-3xl font-black tracking-[0.2em] text-fuchsia-200">
                  {MANUAL_TRANSFER_NUMBER}
                </p>
                <p className="mt-3 text-xs text-center text-fuchsia-400 leading-relaxed">
                  {t('store.orders.vodafoneNoticeDesc')}
                </p>
              </div>
              <div className="mt-5 flex gap-3">
                <button
                  type="button"
                  className="flex h-11 flex-1 items-center justify-center rounded-2xl bg-[#ffb703] font-black text-slate-900 transition hover:bg-[#f59e0b]"
                  onClick={() => setShowTransferNotice(false)}
                >
                  {t('common.ok')}
                </button>
                <button
                  type="button"
                  className="h-11 flex-1 rounded-2xl border border-white/10 font-bold text-slate-300 transition hover:bg-white/10"
                  onClick={() => { setShowTransferNotice(false); void loadOrders(); setShowOrders(true); }}
                >
                  {t('store.orders.tabTitle')}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
