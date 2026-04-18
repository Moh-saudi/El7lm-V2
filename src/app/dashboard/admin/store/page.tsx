import Link from 'next/link';
import { ArrowLeft, Boxes, CreditCard, Package, ShoppingCart, Truck } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

const adminStoreCards = [
  {
    title: 'إدارة المنتجات',
    description: 'إضافة المنتجات وتعديل الأسعار والعملات والمخزون والصور.',
    href: '/dashboard/admin/inventory',
    icon: Package,
  },
  {
    title: 'طلبات المتجر',
    description: 'متابعة طلبات العملاء وتحديث الحالة وإضافة الملاحظات الإدارية.',
    href: '/dashboard/admin/store-orders',
    icon: ShoppingCart,
  },
  {
    title: 'إعدادات الدفع',
    description: 'إدارة وسائل الدفع والتقسيط والإعدادات المرتبطة بكل دولة.',
    href: '/dashboard/admin/pricing-management',
    icon: CreditCard,
  },
];

const workflowSteps = [
  {
    title: 'المنتجات',
    description: 'ابدأ بإدارة المنتجات وربطها بالمخزون والصور.',
    icon: Boxes,
  },
  {
    title: 'الطلبات',
    description: 'راجع الطلبات القادمة من جميع الحسابات من صفحة طلبات المتجر.',
    icon: ShoppingCart,
  },
  {
    title: 'الشحن والتنفيذ',
    description: 'تابع تنفيذ الطلبات بعد التأكيد والتجهيز والتسليم.',
    icon: Truck,
  },
];

export default function AdminStorePage() {
  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="flex items-center gap-3 text-3xl font-black text-slate-900">
                <ShoppingCart className="h-8 w-8 text-blue-600" />
                إدارة المتجر
              </h1>
              <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-600">
                هذه الصفحة هي مركز الدخول السريع لإدارة المتجر داخل لوحة الأدمن. منها تصل إلى
                المنتجات والطلبات وإعدادات الدفع بدون استخدام واجهة الشراء المخصصة للعملاء.
              </p>
            </div>
          </div>
        </section>

        <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {adminStoreCards.map((card) => {
            const Icon = card.icon;
            return (
              <Link key={card.href} href={card.href} className="group">
                <Card className="h-full rounded-3xl border-slate-200 shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
                  <CardContent className="flex h-full flex-col gap-4 p-6">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
                      <Icon className="h-6 w-6" />
                    </div>
                    <div className="space-y-2">
                      <h2 className="text-xl font-black text-slate-900">{card.title}</h2>
                      <p className="text-sm leading-7 text-slate-600">{card.description}</p>
                    </div>
                    <div className="mt-auto inline-flex items-center gap-2 text-sm font-bold text-blue-700">
                      فتح الصفحة
                      <ArrowLeft className="h-4 w-4 transition group-hover:-translate-x-1" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </section>

        <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <h2 className="text-xl font-black text-slate-900">ترتيب العمل المقترح</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            {workflowSteps.map((step) => {
              const Icon = step.icon;
              return (
                <div key={step.title} className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-slate-800 shadow-sm">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="mt-4 text-lg font-black text-slate-900">{step.title}</div>
                  <p className="mt-2 text-sm leading-7 text-slate-600">{step.description}</p>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
