import { redirect } from 'next/navigation';

/** Retired provider-specific transaction UI. Canonical payment operations live in payments-v2. */
export default function RetiredPaymentAdminPage() {
  redirect('/dashboard/admin/payments-v2');
}
