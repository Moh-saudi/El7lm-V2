import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'بوابة البطولات — El7lm',
    description: 'إدارة بطولاتك بشكل احترافي',
};

export default function TournamentPortalLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
