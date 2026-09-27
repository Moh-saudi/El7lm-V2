import { redirect } from 'next/navigation';

export default function LegacyInvoicesPage() {
  // Financial operations are now managed from the canonical payments ledger.
  redirect('/dashboard/admin/payments-v2');
}
