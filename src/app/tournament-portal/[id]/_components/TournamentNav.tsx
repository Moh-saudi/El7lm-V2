'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    LayoutDashboard, Settings, Users, Shuffle,
    CalendarDays, Swords, BarChart3, Bell, Grid3x3, GitBranch,
} from 'lucide-react';

const NAV_ITEMS = [
    { href: 'overview',       icon: LayoutDashboard, label: 'نظرة عامة'      },
    { href: 'setup',          icon: Settings,        label: 'الإعداد'         },
    { href: 'registrations',  icon: Users,           label: 'الفرق'           },
    { href: 'draw',           icon: Shuffle,         label: 'القرعة'          },
    { href: 'schedule',       icon: CalendarDays,    label: 'الجدول'          },
    { href: 'matches',        icon: Swords,          label: 'النتائج'         },
    { href: 'groups',         icon: Grid3x3,         label: 'المجموعات'       },
    { href: 'bracket',        icon: GitBranch,       label: 'Bracket'         },
    { href: 'stats',          icon: BarChart3,       label: 'الإحصائيات'     },
    { href: 'notifications',  icon: Bell,            label: 'الإشعارات'       },
];

export function TournamentNav({ tournamentId }: { tournamentId: string }) {
    const pathname = usePathname();
    const base     = `/tournament-portal/${tournamentId}`;

    return (
        <div className="bg-white border-b border-slate-200 sticky top-[57px] z-10 overflow-x-auto">
            <div className="flex gap-1 px-4 min-w-max">
                {NAV_ITEMS.map(item => {
                    const href   = `${base}/${item.href}`;
                    const active = pathname === href;
                    return (
                        <Link
                            key={item.href}
                            href={href}
                            className={`flex items-center gap-1.5 px-3 py-3 text-xs font-semibold border-b-2 whitespace-nowrap transition-all
                                ${active
                                    ? 'border-yellow-500 text-yellow-600'
                                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                                }`}
                        >
                            <item.icon className="w-3.5 h-3.5" />
                            {item.label}
                        </Link>
                    );
                })}
            </div>
        </div>
    );
}
