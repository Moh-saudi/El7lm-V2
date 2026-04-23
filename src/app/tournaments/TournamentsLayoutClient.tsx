'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Building2, ChevronLeft, Shield, Trophy } from 'lucide-react';

export default function TournamentsLayoutClient({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const isUnifiedReg = pathname?.includes('/unified-registration');

    if (isUnifiedReg) return <>{children}</>;

    return (
        <div className="min-h-screen bg-slate-100" dir="rtl">
            <header className="sticky top-0 z-40 border-b border-slate-800/80 bg-slate-950/95 text-white backdrop-blur">
                <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-yellow-400 to-orange-500 shadow-lg">
                            <Trophy className="h-5 w-5 text-white" />
                        </div>
                        <div>
                            <p className="text-sm font-black text-white">بوابة البطولات</p>
                            <p className="text-[11px] text-slate-400">نظام مستقل للعملاء ومنظمي المنافسات</p>
                        </div>
                    </div>
                    <nav className="hidden items-center gap-2 md:flex">
                        <Link href="/tournaments" className="rounded-xl px-3 py-2 text-sm font-medium text-slate-200 transition hover:bg-white/10 hover:text-white">جميع البطولات</Link>
                        <Link href="/tournaments/unified-registration" className="rounded-xl px-3 py-2 text-sm font-medium text-slate-200 transition hover:bg-white/10 hover:text-white">التسجيل الموحد</Link>
                        <Link href="/" className="rounded-xl px-3 py-2 text-sm font-medium text-slate-200 transition hover:bg-white/10 hover:text-white">الموقع الرئيسي</Link>
                    </nav>
                </div>
            </header>

            <main>{children}</main>

            <footer className="border-t border-slate-200 bg-white">
                <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-5 text-sm text-slate-500 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
                    <div className="flex items-start gap-3">
                        <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
                            <Shield className="h-4 w-4" />
                        </div>
                        <div>
                            <p className="font-bold text-slate-800">بيئة مستقلة للبطولات</p>
                            <p className="text-xs leading-6 text-slate-500">هذا المسار مخصص للعرض العام، تفاصيل المنافسات، والتسجيل ضمن نظام البطولات المنفصل.</p>
                        </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm">
                        <Link href="/tournaments" className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1.5 font-medium text-slate-700 transition hover:bg-slate-200"><Trophy className="h-3.5 w-3.5" />البطولات</Link>
                        <Link href="/tournament-portal" className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1.5 font-medium text-slate-700 transition hover:bg-slate-200"><Building2 className="h-3.5 w-3.5" />بورتال المنظمين</Link>
                        <Link href="/" className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1.5 font-medium text-slate-700 transition hover:bg-slate-200"><ChevronLeft className="h-3.5 w-3.5" />الرجوع للموقع</Link>
                    </div>
                </div>
            </footer>
        </div>
    );
}
