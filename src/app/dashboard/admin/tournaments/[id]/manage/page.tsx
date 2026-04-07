'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
    Trophy, Users, Calendar, Settings, ArrowRight,
    LayoutDashboard, Shield
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AccountTypeProtection } from '@/hooks/useAccountTypeAuth';
import { supabase } from '@/lib/supabase/config';
import { Tournament } from '@/app/dashboard/admin/tournaments/utils';
import { toast } from 'sonner';
import { TeamsManager } from './components/TeamsManager';
import { MatchesManager } from './components/MatchesManager';
import { BracketManager } from './components/BracketManager';
import { OverviewManager } from './components/OverviewManager';
import { SettingsManager } from './components/SettingsManager';
import { fixReceiptUrl } from '@/lib/utils/cloudflare-r2-utils';

export default function TournamentManagePage() {
    const params = useParams();
    const router = useRouter();
    const tournamentId = params.id as string;

    const [tournament, setTournament] = useState<Tournament | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('overview');

    useEffect(() => {
        const fetchTournament = async () => {
            try {
                if (!tournamentId) return;
                const { data, error } = await supabase
                    .from('tournaments')
                    .select('*')
                    .eq('id', tournamentId)
                    .single();

                if (error || !data) {
                    toast.error('البطولة غير موجودة');
                    router.push('/dashboard/admin/tournaments');
                } else {
                    setTournament({
                        id: data.id,
                        ...data,
                        isActive: data.isActive === true,
                        createdAt: data.createdAt ? new Date(data.createdAt) : new Date(),
                        updatedAt: data.updatedAt ? new Date(data.updatedAt) : new Date(),
                        registrations: data.registrations || [],
                        currency: data.currency || 'EGP',
                        paymentMethods: data.paymentMethods || ['credit_card', 'bank_transfer'],
                        ageGroups: data.ageGroups || [],
                        categories: data.categories || [],
                    } as Tournament);
                }
            } catch (error) {
                console.error('Error fetching tournament:', error);
                toast.error('حدث خطأ أثناء تحميل بيانات البطولة');
            } finally {
                setLoading(false);
            }
        };

        fetchTournament();
    }, [tournamentId, router]);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-600"></div>
            </div>
        );
    }

    if (!tournament) return null;

    return (
        <AccountTypeProtection allowedTypes={['admin']}>
            <div className="min-h-screen bg-gray-50">
                {/* Top Navigation Bar */}
                <div className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-10">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="flex items-center justify-between h-16">
                            <div className="flex items-center gap-4">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => router.push('/dashboard/admin/tournaments')}
                                    className="text-gray-500 hover:text-gray-900"
                                >
                                    <ArrowRight className="h-5 w-5 ml-1" />
                                    رجوع
                                </Button>
                                <div className="h-6 w-px bg-gray-200"></div>
                                <div className="flex items-center gap-3">
                                    {tournament.logo ? (
                                        <img src={fixReceiptUrl(tournament.logo) || tournament.logo} alt={tournament.name} className="w-8 h-8 rounded-lg object-cover" />
                                    ) : (
                                        <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
                                            <Trophy className="h-4 w-4 text-yellow-600" />
                                        </div>
                                    )}
                                    <h1 className="text-xl font-bold text-gray-900">{tournament.name}</h1>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <span className={`px-3 py-1 rounded-full text-xs font-medium ${tournament.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                                    }`}>
                                    {tournament.isActive ? 'نشطة' : 'غير نشطة'}
                                </span>
                                <span className="text-sm text-gray-500">
                                    {tournament.currentParticipants} مشارك
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Tabs Navigation */}
                <div className="bg-white border-b border-gray-200">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                            <TabsList className="bg-transparent border-b border-transparent w-full justify-start h-auto p-0 space-x-8 space-x-reverse">
                                <TabsTrigger
                                    value="overview"
                                    className="data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=active]:text-blue-700 pb-3 rounded-none bg-transparent hover:bg-gray-50 transition-colors"
                                >
                                    <LayoutDashboard className="h-4 w-4 ml-2" />
                                    نظرة عامة
                                </TabsTrigger>
                                <TabsTrigger
                                    value="teams"
                                    className="data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=active]:text-blue-700 pb-3 rounded-none bg-transparent hover:bg-gray-50 transition-colors"
                                >
                                    <Shield className="h-4 w-4 ml-2" />
                                    الفرق واللاعبين
                                </TabsTrigger>
                                <TabsTrigger
                                    value="matches"
                                    className="data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=active]:text-blue-700 pb-3 rounded-none bg-transparent hover:bg-gray-50 transition-colors"
                                >
                                    <Calendar className="h-4 w-4 ml-2" />
                                    المباريات والنتائج
                                </TabsTrigger>
                                <TabsTrigger
                                    value="bracket"
                                    className="data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=active]:text-blue-700 pb-3 rounded-none bg-transparent hover:bg-gray-50 transition-colors"
                                >
                                    <Users className="h-4 w-4 ml-2" />
                                    المجموعات والأدوار
                                </TabsTrigger>
                                <TabsTrigger
                                    value="settings"
                                    className="data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=active]:text-blue-700 pb-3 rounded-none bg-transparent hover:bg-gray-50 transition-colors"
                                >
                                    <Settings className="h-4 w-4 ml-2" />
                                    الإعدادات
                                </TabsTrigger>
                            </TabsList>
                        </Tabs>
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    <Tabs value={activeTab} onValueChange={setActiveTab}>
                        <TabsContent value="overview" className="mt-0">
                            <OverviewManager tournament={tournament} />
                        </TabsContent>

                        <TabsContent value="teams" className="mt-0">
                            <TeamsManager tournament={tournament} />
                        </TabsContent>

                        <TabsContent value="matches" className="mt-0">
                            <MatchesManager tournament={tournament} />
                        </TabsContent>

                        <TabsContent value="bracket" className="mt-0">
                            <BracketManager tournament={tournament} />
                        </TabsContent>

                        <TabsContent value="settings" className="mt-0">
                            <SettingsManager tournament={tournament} />
                        </TabsContent>
                    </Tabs>
                </div>
            </div>
        </AccountTypeProtection>
    );
}
