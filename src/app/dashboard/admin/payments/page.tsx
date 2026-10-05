'use client';

/**
 * إعادة توجيه للصفحة الجديدة (V2)
 * تم استبدال الصفحة القديمة بالكامل بنظام إدارة المدفوعات والاشتراكات المحسن (V2)
 * الكود المصدري موجود في ../payments-v2/page.tsx
 */

import PaymentsPageV2 from '../payments-v2/page';

export default function AdminPaymentsPage() {
  return <PaymentsPageV2 />;
}
