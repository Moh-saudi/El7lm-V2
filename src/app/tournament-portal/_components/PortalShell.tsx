'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
    Trophy, LayoutDashboard, Plus, LogOut, Menu, X,
    ChevronLeft, User, Bell,
} from 'lucide-react';
import { signOutClient, TournamentClient } from '@/lib/tournament-portal/auth';
import { Toaster } from 'sonner';

interface Props {
    client: TournamentClient;
    children: React.ReactNode;
}

const NAV = [
    { href: '/tournament-portal',            icon: LayoutDashboard, label: 'لوحة التحكم' },
    { href: '/tournament-portal/new',        icon: Plus,            label: 'بطولة جديدة'  },
];

export function PortalShell({ client, children }: Props) {
    const pathname = usePathname();
    const router   = useRouter();
    const [sideOpen, setSideOpen] = useState(false);

    const handleSignOut = async () => {
        await signOutClient();
        router.push('/tournament-portal/login');
    };

    return (
        <div className="min-h-screen bg-slate-50 flex" dir="rtl">
            <Toaster position="top-center" richColors />

            {/* ── Sidebar ── */}
            <aside className={`fixed inset-y-0 right-0 z-40 w-64 bg-slate-900 flex flex-col transition-transform duration-300
                ${sideOpen ? 'translate-x-0' : 'translate-x-full'} lg:translate-x-0 lg:static lg:flex`}>

                {/* Logo */}
                <div className="flex items-center gap-3 px-5 py-5 border-b border-white/10">
                    <div className="w-9 h-9 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-xl flex items-center justify-center flex-shrink-0">
                        <Trophy className="w-5 h-5 text-white" />
                    </div>
                    <div className="min-w-0">
                        <p className="text-white font-bold text-sm truncate">{client.organization_name || client.name}</p>
                        <p className="text-slate-400 text-[11px] truncate">بوابة البطولات</p>
                    </div>
                    <button onClick={() => setSideOpen(false)} className="lg:hidden text-slate-400 mr-auto">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Nav */}
                <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
                    {NAV.map(item => {
                        const active = pathname === item.href;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                onClick={() => setSideOpen(false)}
                                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all
                                    ${active
                                        ? 'bg-yellow-500/20 text-yellow-400'
                                        : 'text-slate-400 hover:text-white hover:bg-white/5'
                                    }`}
                            >
                                <item.icon className="w-4 h-4 flex-shrink-0" />
                                {item.label}
                                {active && <ChevronLeft className="w-3 h-3 mr-auto" />}
                            </Link>
                        );
                    })}
                </nav>

                {/* Footer */}
                <div className="px-3 py-4 border-t border-white/10 space-y-1">
                    <Link href="/tournament-portal/profile"
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-slate-400 hover:text-white hover:bg-white/5 transition-all">
                        <User className="w-4 h-4" /> الملف الشخصي
                    </Link>
                    <button
                        onClick={handleSignOut}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-all"
                    >
                        <LogOut className="w-4 h-4" /> تسجيل الخروج
                    </button>
                </div>
            </aside>

            {/* ── Overlay mobile ── */}
            {sideOpen && (
                <div className="fixed inset-0 z-30 bg-black/50 lg:hidden" onClick={() => setSideOpen(false)} />
            )}

            {/* ── Main ── */}
            <div className="flex-1 flex flex-col min-w-0">

                {/* Topbar */}
                <header className="bg-white border-b border-slate-200 px-4 py-3 flex items-center gap-3 sticky top-0 z-20">
                    <button
                        onClick={() => setSideOpen(true)}
                        className="lg:hidden text-slate-500 hover:text-slate-700 p-1 rounded-lg"
                    >
                        <Menu className="w-5 h-5" />
                    </button>

                    <div className="flex-1" />

                    <button className="relative p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors">
                        <Bell className="w-4 h-4" />
                    </button>

                    <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center text-white text-xs font-bold">
                            {client.name.charAt(0)}
                        </div>
                        <span className="text-sm font-medium text-slate-700 hidden sm:block">{client.name}</span>
                    </div>
                </header>

                {/* Page content */}
                <main className="flex-1 p-4 md:p-6 overflow-auto">
                    {children}
                </main>
            </div>
        </div>
    );
}
