import type { Metadata } from 'next';
import TournamentsLayoutClient from './TournamentsLayoutClient';

export const metadata: Metadata = {
  title: 'بوابة البطولات - El7lm',
  description: 'بوابة مستقلة لإدارة البطولات والتسجيل ومتابعة تفاصيل المنافسات.',
};

export default function TournamentsLayout({ children }: { children: React.ReactNode }) {
  return <TournamentsLayoutClient>{children}</TournamentsLayoutClient>;
}
