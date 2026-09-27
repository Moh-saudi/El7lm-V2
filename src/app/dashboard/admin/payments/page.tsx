import { redirect } from 'next/navigation';

export default function LegacyAdminPaymentsPage() {
  redirect('/dashboard/admin/payments-v2');
}
