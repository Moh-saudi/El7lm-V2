import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Account Deletion | El7lm Platform',
  description: 'Request deletion of your El7lm Platform account and associated data.',
};

export default function AccountDeletionLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
