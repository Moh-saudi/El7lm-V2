'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { supabase } from '@/lib/supabase/config';
import { RefreshCw, ShoppingCart } from 'lucide-react';
import { toast } from 'sonner';

type OrderStatus = 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled';

interface StoreOrder {
  id: string;
  buyer_name: string;
  buyer_email: string | null;
  buyer_phone: string | null;
  buyer_account_type: string | null;
  product_name: string;
  quantity: number;
  total_price: number;
  currency: string;
  payment_method: string | null;
  payment_provider: string | null;
  payment_type: string | null;
  installment_months: number | null;
  status: OrderStatus;
  shipping_address: string | null;
  shipping_city: string | null;
  shipping_country: string | null;
  notes: string | null;
  admin_notes: string | null;
  created_at: string;
}

const STATUS_OPTIONS: OrderStatus[] = [
  'pending',
  'confirmed',
  'processing',
  'shipped',
  'delivered',
  'cancelled',
];

const STATUS_LABELS: Record<OrderStatus, string> = {
  pending: 'قيد المراجعة',
  confirmed: 'تم التأكيد',
  processing: 'قيد التجهيز',
  shipped: 'تم الشحن',
  delivered: 'تم التسليم',
  cancelled: 'ملغي',
};

const STATUS_STYLES: Record<OrderStatus, string> = {
  pending: 'bg-amber-100 text-amber-800',
  confirmed: 'bg-blue-100 text-blue-800',
  processing: 'bg-indigo-100 text-indigo-800',
  shipped: 'bg-cyan-100 text-cyan-800',
  delivered: 'bg-emerald-100 text-emerald-800',
  cancelled: 'bg-rose-100 text-rose-800',
};

export default function AdminStoreOrdersPage() {
  const [orders, setOrders] = useState<StoreOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'all' | OrderStatus>('all');
  const [search, setSearch] = useState('');
  const [notesMap, setNotesMap] = useState<Record<string, string>>({});
  const [statusMap, setStatusMap] = useState<Record<string, OrderStatus>>({});

  useEffect(() => {
    void fetchOrders();
  }, [statusFilter]);

  const filteredOrders = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return orders;

    return orders.filter((order) =>
      [order.buyer_name, order.buyer_email, order.product_name, order.id, order.payment_method]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q))
    );
  }, [orders, search]);

  async function getAccessToken() {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      throw new Error('يجب تسجيل الدخول أولًا');
    }

    return session.access_token;
  }

  async function fetchOrders() {
    try {
      setLoading(true);
      const token = await getAccessToken();
      const query = statusFilter === 'all' ? '' : `?status=${statusFilter}`;

      const response = await fetch(`/api/admin/store-orders${query}`, {
        cache: 'no-store',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'تعذر تحميل طلبات المتجر');
      }

      setOrders(result.data || []);
      setNotesMap(
        Object.fromEntries(
          (result.data || []).map((order: StoreOrder) => [order.id, order.admin_notes || ''])
        )
      );
      setStatusMap(
        Object.fromEntries(
          (result.data || []).map((order: StoreOrder) => [order.id, order.status])
        ) as Record<string, OrderStatus>
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'تعذر تحميل طلبات المتجر');
    } finally {
      setLoading(false);
    }
  }

  async function saveOrder(orderId: string) {
    try {
      const token = await getAccessToken();
      const nextStatus = statusMap[orderId];

      if (!nextStatus) {
        throw new Error('حالة الطلب غير محددة');
      }

      const response = await fetch('/api/admin/store-orders', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          orderId,
          status: nextStatus,
          adminNotes: notesMap[orderId] || '',
        }),
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'تعذر تحديث الطلب');
      }

      toast.success('تم تحديث حالة الطلب');
      await fetchOrders();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'تعذر تحديث الطلب');
    }
  }

  const stats = useMemo(() => {
    const totalRevenue = filteredOrders.reduce((sum, order) => sum + Number(order.total_price || 0), 0);

    return {
      total: filteredOrders.length,
      pending: filteredOrders.filter((order) => order.status === 'pending').length,
      inProgress: filteredOrders.filter((order) =>
        ['confirmed', 'processing', 'shipped'].includes(order.status)
      ).length,
      delivered: filteredOrders.filter((order) => order.status === 'delivered').length,
      totalRevenue,
    };
  }, [filteredOrders]);

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="flex items-center gap-3 text-3xl font-black text-slate-900">
                <ShoppingCart className="h-8 w-8 text-blue-600" />
                طلبات المتجر
              </h1>
              <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-600">
                متابعة الطلبات القادمة من المتجر وتحديث حالتها وإضافة ملاحظات الإدارة عليها.
              </p>
            </div>

            <Button type="button" onClick={() => void fetchOrders()}>
              <RefreshCw className="ml-2 h-4 w-4" />
              تحديث
            </Button>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-[1fr_auto]">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ابحث باسم العميل أو المنتج أو رقم الطلب أو وسيلة الدفع"
          />

          <div className="flex flex-wrap gap-2">
            <Button variant={statusFilter === 'all' ? 'default' : 'outline'} onClick={() => setStatusFilter('all')}>
              الكل
            </Button>

            {STATUS_OPTIONS.map((status) => (
              <Button
                key={status}
                variant={statusFilter === status ? 'default' : 'outline'}
                onClick={() => setStatusFilter(status)}
              >
                {STATUS_LABELS[status]}
              </Button>
            ))}
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <Card className="rounded-3xl border-slate-200 shadow-sm">
            <CardContent className="p-5">
              <div className="text-sm font-bold text-slate-500">إجمالي الطلبات</div>
              <div className="mt-3 text-3xl font-black text-slate-900">{stats.total}</div>
            </CardContent>
          </Card>
          <Card className="rounded-3xl border-slate-200 shadow-sm">
            <CardContent className="p-5">
              <div className="text-sm font-bold text-slate-500">قيد المراجعة</div>
              <div className="mt-3 text-3xl font-black text-amber-600">{stats.pending}</div>
            </CardContent>
          </Card>
          <Card className="rounded-3xl border-slate-200 shadow-sm">
            <CardContent className="p-5">
              <div className="text-sm font-bold text-slate-500">قيد التنفيذ</div>
              <div className="mt-3 text-3xl font-black text-indigo-600">{stats.inProgress}</div>
            </CardContent>
          </Card>
          <Card className="rounded-3xl border-slate-200 shadow-sm">
            <CardContent className="p-5">
              <div className="text-sm font-bold text-slate-500">تم التسليم</div>
              <div className="mt-3 text-3xl font-black text-emerald-600">{stats.delivered}</div>
            </CardContent>
          </Card>
          <Card className="rounded-3xl border-slate-200 shadow-sm">
            <CardContent className="p-5">
              <div className="text-sm font-bold text-slate-500">إجمالي المبالغ</div>
              <div className="mt-3 text-3xl font-black text-slate-900">
                {stats.totalRevenue.toLocaleString()}
              </div>
            </CardContent>
          </Card>
        </section>

        {loading ? (
          <div className="flex min-h-[240px] items-center justify-center rounded-3xl bg-white text-slate-500 shadow-sm ring-1 ring-slate-200">
            جاري تحميل الطلبات...
          </div>
        ) : filteredOrders.length === 0 ? (
          <Card className="rounded-3xl border-slate-200 shadow-sm">
            <CardContent className="py-16 text-center text-slate-500">
              لا توجد طلبات متجر مطابقة حاليًا.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredOrders.map((order) => (
              <Card key={order.id} className="rounded-3xl border-slate-200 shadow-sm">
                <CardContent className="space-y-5 p-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge className={STATUS_STYLES[order.status]}>{STATUS_LABELS[order.status]}</Badge>
                        <span className="text-xs text-slate-500">
                          {new Date(order.created_at).toLocaleString('ar-EG')}
                        </span>
                        <span className="font-mono text-xs text-slate-400">{order.id}</span>
                      </div>
                      <h2 className="text-xl font-black text-slate-900">{order.product_name}</h2>
                      <p className="text-sm text-slate-600">
                        {order.buyer_name} • {order.buyer_account_type || 'غير محدد'} • {order.quantity} قطعة
                      </p>
                    </div>

                    <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-right">
                      <div className="text-xs text-emerald-700">الإجمالي</div>
                      <div className="text-lg font-black text-emerald-800">
                        {Number(order.total_price || 0).toLocaleString()} {order.currency || 'SAR'}
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <div className="rounded-2xl bg-slate-50 p-4 text-sm">
                      <div className="mb-2 font-bold text-slate-800">بيانات العميل</div>
                      <div>{order.buyer_name}</div>
                      <div>{order.buyer_email || 'بدون بريد'}</div>
                      <div>{order.buyer_phone || 'بدون هاتف'}</div>
                    </div>

                    <div className="rounded-2xl bg-slate-50 p-4 text-sm">
                      <div className="mb-2 font-bold text-slate-800">الشحن</div>
                      <div>{order.shipping_address || 'بدون عنوان'}</div>
                      <div>{order.shipping_city || 'بدون مدينة'}</div>
                      <div>{order.shipping_country || 'بدون دولة'}</div>
                    </div>

                    <div className="rounded-2xl bg-slate-50 p-4 text-sm">
                      <div className="mb-2 font-bold text-slate-800">الدفع</div>
                      <div>{order.payment_method || order.payment_provider || 'غير محدد'}</div>
                      <div>{order.payment_type === 'installment' ? 'تقسيط' : 'دفع كامل'}</div>
                      <div>
                        {order.payment_type === 'installment'
                          ? `عدد الأشهر: ${order.installment_months || '-'}`
                          : 'دفعة واحدة'}
                      </div>
                    </div>

                    <div className="rounded-2xl bg-slate-50 p-4 text-sm">
                      <div className="mb-2 font-bold text-slate-800">ملاحظات العميل</div>
                      <div>{order.notes || 'لا توجد ملاحظات'}</div>
                    </div>
                  </div>

                  <div className="grid gap-3 lg:grid-cols-[220px_1fr_160px]">
                    <select
                      className="rounded-2xl border border-slate-200 px-3 py-2"
                      value={statusMap[order.id] || order.status}
                      onChange={(e) =>
                        setStatusMap((prev) => ({
                          ...prev,
                          [order.id]: e.target.value as OrderStatus,
                        }))
                      }
                    >
                      {STATUS_OPTIONS.map((status) => (
                        <option key={status} value={status}>
                          {STATUS_LABELS[status]}
                        </option>
                      ))}
                    </select>

                    <Input
                      value={notesMap[order.id] || ''}
                      onChange={(e) =>
                        setNotesMap((prev) => ({
                          ...prev,
                          [order.id]: e.target.value,
                        }))
                      }
                      placeholder="ملاحظات الإدارة"
                    />

                    <Button type="button" onClick={() => void saveOrder(order.id)}>
                      حفظ
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
