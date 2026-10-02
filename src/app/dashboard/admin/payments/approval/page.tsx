import { redirect } from 'next/navigation';

/** Retired legacy payment approval UI. Canonical review lives in payments-v2. */
export default function RetiredPaymentAdminPage() {
  redirect('/dashboard/admin/payments-v2');
}
