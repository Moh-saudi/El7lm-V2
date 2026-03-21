import { redirect } from 'next/navigation';

/**
 * Redirect legacy /dashboard/payment links to the correct payment page.
 * Components in the player context link here; forward them to bulk-payment.
 */
export default function PaymentRedirectPage() {
  redirect('/dashboard/player/bulk-payment');
}
