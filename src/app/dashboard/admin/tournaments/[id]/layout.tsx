'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { TournamentProvider, useTournament } from './providers';
import { Button } from "@/components/ui/button";
import { ArrowRight, Trophy, LayoutDashboard, Users, Calendar, Network, Settings } from 'lucide-react';
import { cn } from "@/lib/utils/index";
import { fixReceiptUrl } from '@/lib/utils/cloudflare-r2-utils';

function TournamentLayoutContent({ children }: { children: React.ReactNode }) {
    const { tournament, loading, error } = useTournament();
    const router = useRouter();
    const pathname = usePathname();

    if (loading) return <div className="p-8 text-center text-gray-500">جاري تحميل بيانات البطولة...</div>;
    if (error || !tournament) return <div className="p-8 text-center text-red-500">خطأ: {error || 'البطولة غير موجودة'}</div>;

    const tabs = [
        { name: 'نظرة عامة', href: `/dashboard/admin/tournaments/${tournament.id}/overview`, icon: LayoutDashboard },
        { name: 'الفرق واللاعبين', href: `/dashboard/admin/tournaments/${tournament.id}/teams`, icon: Users },
        { name: 'المباريات والنتائج', href: `/dashboard/admin/tournaments/${tournament.id}/matches`, icon: Calendar },
        { name: 'المجموعات والأدوار', href: `/dashboard/admin/tournaments/${tournament.id}/bracket`, icon: Network },
        { name: 'الإعدادات', href: `/dashboard/admin/tournaments/${tournament.id}/settings`, icon: Settings },
    ];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => router.push('/dashboard/admin/tournaments')}>
                        <ArrowRight className="h-5 w-5 text-gray-500" />
                    </Button>
                    <div className="h-12 w-12 bg-blue-50 rounded-lg flex items-center justify-center border border-blue-100">
                        {tournament.logo ? (
                            <img src={fixReceiptUrl(tournament.logo) || tournament.logo} alt={tournament.name} className="h-full w-full object-cover rounded-lg" />
                        ) : (
                            <Trophy className="h-6 w-6 text-blue-600" />
                        )}
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">{tournament.name}</h1>
                        <p className="text-sm text-gray-500 flex items-center gap-2">
                            <span className={`inline-block w-2 h-2 rounded-full ${tournament.isActive ? 'bg-green-500' : 'bg-gray-300'}`}></span>
                            {tournament.isActive ? 'نشطة' : 'غير نشطة'}
                            <span className="text-gray-300">•</span>
                            {tournament.location}
                        </p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => window.open(`/tournaments/${tournament.id}`, '_blank')}>
                        عرض الصفحة العامة
                    </Button>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex overflow-x-auto bg-white border-b border-gray-200 sticky top-0 z-10">
                {tabs.map((tab) => {
                    const isActive = pathname === tab.href;
                    const Icon = tab.icon;
                    return (
                        <Link
                            key={tab.href}
                            href={tab.href}
                            className={cn(
                                "flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap",
                                isActive
                                    ? "border-blue-600 text-blue-600"
                                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                            )}
                        >
                            <Icon className="h-4 w-4" />
                            {tab.name}
                        </Link>
                    );
                })}
            </div>

            {/* Content */}
            <div className="min-h-[500px]">
                {children}
            </div>
        </div>
    );
}

export default function TournamentLayout({ children }: { children: React.ReactNode }) {
    return (
        <TournamentProvider>
            <TournamentLayoutContent>{children}</TournamentLayoutContent>
        </TournamentProvider>
    );
}
