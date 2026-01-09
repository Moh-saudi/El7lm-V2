'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { doc, getDoc, collection, query, getDocs, orderBy, where, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { Tournament, formatDate } from '@/app/dashboard/admin/tournaments/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trophy, Calendar, Users, MapPin, Clock, Search } from 'lucide-react';
import { fixReceiptUrl } from '@/lib/utils/cloudflare-r2-utils';

// --- Types ---
interface Team {
    id: string;
    name: string;
    logo?: string;
    group?: string;
    points: number;
    matchesPlayed: number;
    wins: number;
    draws: number;
    losses: number;
    goalsFor: number;
    goalsAgainst: number;
}

interface Match {
    id: string;
    homeTeamName: string;
    homeTeamLogo?: string;
    awayTeamName: string;
    awayTeamLogo?: string;
    homeScore?: number;
    awayScore?: number;
    date: any;
    time: string;
    location: string;
    round: string;
    status: 'scheduled' | 'live' | 'finished';
}

export default function PublicTournamentPage() {
    const params = useParams();
    const tournamentId = params.id as string;

    const [tournament, setTournament] = useState<Tournament | null>(null);
    const [teams, setTeams] = useState<Team[]>([]);
    const [matches, setMatches] = useState<Match[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('overview');

    useEffect(() => {
        const fetchAllData = async () => {
            try {
                if (!tournamentId) return;

                // 1. Fetch Tournament Details
                const docRef = doc(db, 'tournaments', tournamentId);
                const docSnap = await getDoc(docRef);

                if (!docSnap.exists()) {
                    setLoading(false);
                    return;
                }
                setTournament({ id: docSnap.id, ...docSnap.data() } as Tournament);

                // 2. Fetch Teams
                const teamsQ = query(collection(db, `tournaments/${tournamentId}/teams`));
                const teamsSnap = await getDocs(teamsQ);
                const teamsData = teamsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Team));
                // Sort for standings
                teamsData.sort((a, b) => {
                    if (b.points !== a.points) return b.points - a.points;
                    return (b.goalsFor - b.goalsAgainst) - (a.goalsFor - a.goalsAgainst);
                });
                setTeams(teamsData);

                // 3. Fetch Matches
                const matchesQ = query(collection(db, `tournaments/${tournamentId}/matches`), orderBy('date', 'asc'));
                const matchesSnap = await getDocs(matchesQ);
                const matchesData = matchesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Match));
                setMatches(matchesData);

            } catch (error) {
                console.error('Error fetching tournament data:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchAllData();
    }, [tournamentId]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-600"></div>
            </div>
        );
    }

    if (!tournament) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-gray-900">البطولة غير موجودة</h1>
                    <p className="text-gray-500 mt-2">تأكد من الرابط وحاول مرة أخرى</p>
                    <Button className="mt-4" onClick={() => window.location.href = '/'}>العودة للرئيسية</Button>
                </div>
            </div>
        );
    }

    // Helper Grouping
    const groupedTeams: Record<string, Team[]> = {};
    teams.forEach(team => {
        const group = team.group || 'A';
        if (!groupedTeams[group]) groupedTeams[group] = [];
        groupedTeams[group].push(team);
    });

    const upcomingMatches = matches.filter(m => m.status === 'scheduled').slice(0, 3);
    const liveMatches = matches.filter(m => m.status === 'live');
    const finishedMatches = matches.filter(m => m.status === 'finished').reverse();

    // Bracket Helpers
    const finalMatch = matches.find(m => m.round === 'Final');
    const semiFinals = matches.filter(m => m.round === 'Semi Final');
    const quarterFinals = matches.filter(m => m.round === 'Quarter Final');

    return (
        <div className="min-h-screen bg-gray-50 font-sans">
            {/* Hero Section */}
            <div className="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 text-white pb-16 pt-24 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
                {/* Abstract Background Shapes */}
                <div className="absolute top-0 right-0 w-96 h-96 bg-yellow-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2"></div>

                <div className="max-w-7xl mx-auto relative z-10">
                    <div className="flex flex-col md:flex-row items-center gap-8">
                        <div className="flex-shrink-0">
                            {tournament.logo ? (
                                <img src={fixReceiptUrl(tournament.logo) || tournament.logo} alt={tournament.name} className="w-32 h-32 md:w-40 md:h-40 rounded-2xl shadow-2xl border-4 border-white/10 object-cover" />
                            ) : (
                                <div className="w-32 h-32 md:w-40 md:h-40 rounded-2xl bg-gradient-to-br from-yellow-500 to-yellow-600 flex items-center justify-center shadow-2xl">
                                    <Trophy className="h-16 w-16 text-white" />
                                </div>
                            )}
                        </div>

                        <div className="flex-1 text-center md:text-right">
                            <div className="flex items-center justify-center md:justify-start gap-3 mb-2">
                                <Badge className={`${tournament.isActive ? 'bg-green-500' : 'bg-gray-500'} border-0`}>
                                    {tournament.isActive ? 'جارية الان' : 'منتهية'}
                                </Badge>
                                {tournament.isPaid && <Badge variant="outline" className="text-white border-white/30">بطولة رسمية</Badge>}
                            </div>
                            <h1 className="text-3xl md:text-5xl font-bold mb-4">{tournament.name}</h1>
                            <div className="flex flex-wrap items-center justify-center md:justify-start gap-6 text-gray-300 text-sm md:text-base">
                                <div className="flex items-center gap-2">
                                    <MapPin className="h-4 w-4 text-yellow-500" />
                                    {tournament.location}
                                </div>
                                <div className="flex items-center gap-2">
                                    <Calendar className="h-4 w-4 text-yellow-500" />
                                    {formatDate(tournament.startDate)} - {formatDate(tournament.endDate)}
                                </div>
                                <div className="flex items-center gap-2">
                                    <Users className="h-4 w-4 text-yellow-500" />
                                    {teams.length} فرق مشاركة
                                </div>
                            </div>
                        </div>

                        <div className="flex-shrink-0">
                            <Button className="bg-yellow-600 hover:bg-yellow-700 text-white px-8 py-6 text-lg shadow-lg shadow-yellow-600/20"
                                onClick={() => window.open(`/tournaments/unified-registration?tournamentId=${tournament.id}`, '_blank')}
                                disabled={!tournament.isActive}
                            >
                                سجل الآن
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content Info Tabs */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 relative z-20">
                <Card className="shadow-lg border-0 overflow-hidden">
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                        <div className="bg-white border-b overflow-x-auto">
                            <TabsList className="w-full justify-start h-auto p-0 bg-transparent rounded-none flex-nowrap min-w-max md:min-w-0">
                                <TabsTrigger value="overview" className="flex-1 py-4 px-6 rounded-none data-[state=active]:border-b-2 data-[state=active]:border-yellow-600 data-[state=active]:text-yellow-700 bg-transparent">نظرة عامة</TabsTrigger>
                                <TabsTrigger value="matches" className="flex-1 py-4 px-6 rounded-none data-[state=active]:border-b-2 data-[state=active]:border-yellow-600 data-[state=active]:text-yellow-700 bg-transparent">المباريات والنتائج</TabsTrigger>
                                <TabsTrigger value="standings" className="flex-1 py-4 px-6 rounded-none data-[state=active]:border-b-2 data-[state=active]:border-yellow-600 data-[state=active]:text-yellow-700 bg-transparent">جدول الترتيب</TabsTrigger>
                                <TabsTrigger value="bracket" className="flex-1 py-4 px-6 rounded-none data-[state=active]:border-b-2 data-[state=active]:border-yellow-600 data-[state=active]:text-yellow-700 bg-transparent">الأدوار الإقصائية</TabsTrigger>
                                <TabsTrigger value="teams" className="flex-1 py-4 px-6 rounded-none data-[state=active]:border-b-2 data-[state=active]:border-yellow-600 data-[state=active]:text-yellow-700 bg-transparent">الفرق</TabsTrigger>
                            </TabsList>
                        </div>

                        <div className="p-6 min-h-[400px]">
                            {/* OVERVIEW TAB */}
                            <TabsContent value="overview" className="space-y-8 mt-0">
                                {liveMatches.length > 0 && (
                                    <div className="space-y-4">
                                        <h3 className="text-xl font-bold flex items-center gap-2 text-red-600 animate-pulse">
                                            <span className="w-2 h-2 rounded-full bg-red-600"></span>
                                            مباشر الآن
                                        </h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                            {liveMatches.map(match => (
                                                <div key={match.id} className="bg-white border border-red-100 shadow-sm rounded-xl p-4 relative overflow-hidden">
                                                    <div className="absolute top-0 right-0 w-1 h-full bg-red-500"></div>
                                                    <div className="flex justify-between items-center mb-2">
                                                        <Badge variant="destructive" className="animate-pulse">Live</Badge>
                                                        <span className="text-xs text-gray-500">{match.time}</span>
                                                    </div>
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex flex-col items-center gap-1 w-1/3">
                                                            <img src={match.homeTeamLogo || '/placeholder-team.png'} className="w-10 h-10 rounded-full bg-gray-100 object-cover" onError={(e) => e.currentTarget.src = 'https://placehold.co/40x40?text=?'} />
                                                            <span className="text-xs font-bold text-center truncate w-full">{match.homeTeamName}</span>
                                                        </div>
                                                        <div className="text-2xl font-black font-mono">
                                                            {match.homeScore} - {match.awayScore}
                                                        </div>
                                                        <div className="flex flex-col items-center gap-1 w-1/3">
                                                            <img src={match.awayTeamLogo || '/placeholder-team.png'} className="w-10 h-10 rounded-full bg-gray-100 object-cover" onError={(e) => e.currentTarget.src = 'https://placehold.co/40x40?text=?'} />
                                                            <span className="text-xs font-bold text-center truncate w-full">{match.awayTeamName}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                    <div className="md:col-span-2 space-y-6">
                                        <div className="flex items-center justify-between">
                                            <h3 className="text-xl font-bold">آخر النتائج</h3>
                                            <Button variant="link" onClick={() => setActiveTab('matches')}>عرض الكل</Button>
                                        </div>
                                        {finishedMatches.length === 0 ? (
                                            <p className="text-gray-500 text-sm">لا توجد مباريات منتهية بعد.</p>
                                        ) : (
                                            <div className="space-y-3">
                                                {finishedMatches.slice(0, 5).map(match => (
                                                    <div key={match.id} className="flex items-center justify-between p-3 bg-white border border-gray-100 rounded-lg hover:shadow-sm transition-shadow">
                                                        <div className="flex items-center gap-3 w-1/3">
                                                            <span className={`text-sm font-bold ${match.homeScore! > match.awayScore! ? 'text-gray-900' : 'text-gray-500'}`}>{match.homeTeamName}</span>
                                                            <img src={match.homeTeamLogo || ''} className="w-6 h-6 rounded-full bg-gray-100" onError={(e) => e.currentTarget.style.display = 'none'} />
                                                        </div>
                                                        <div className="px-3 py-1 bg-gray-50 rounded font-mono font-bold text-gray-800">
                                                            {match.homeScore} - {match.awayScore}
                                                        </div>
                                                        <div className="flex items-center gap-3 w-1/3 justify-end">
                                                            <img src={match.awayTeamLogo || ''} className="w-6 h-6 rounded-full bg-gray-100" onError={(e) => e.currentTarget.style.display = 'none'} />
                                                            <span className={`text-sm font-bold ${match.awayScore! > match.homeScore! ? 'text-gray-900' : 'text-gray-500'}`}>{match.awayTeamName}</span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    <div>
                                        <h3 className="text-xl font-bold mb-4">المباريات القادمة</h3>
                                        {upcomingMatches.length === 0 ? (
                                            <div className="p-4 bg-gray-50 rounded-lg text-center text-gray-500 text-sm">لا توجد مباريات مجدولة قريباً</div>
                                        ) : (
                                            <div className="space-y-4">
                                                {upcomingMatches.map(match => (
                                                    <Card key={match.id} className="border border-gray-200">
                                                        <CardContent className="p-4">
                                                            <div className="text-xs text-gray-500 mb-3 flex items-center gap-1">
                                                                <Calendar className="h-3 w-3" /> {formatDate(match.date)} • {match.time}
                                                            </div>
                                                            <div className="flex justify-between items-center">
                                                                <div className="text-center w-1/3">
                                                                    <img src={match.homeTeamLogo} className="w-8 h-8 mx-auto mb-1 rounded-full object-cover bg-gray-100" onError={(e) => e.currentTarget.style.display = 'none'} />
                                                                    <div className="text-xs font-bold truncate">{match.homeTeamName}</div>
                                                                </div>
                                                                <div className="text-gray-400 font-bold text-sm">VS</div>
                                                                <div className="text-center w-1/3">
                                                                    <img src={match.awayTeamLogo} className="w-8 h-8 mx-auto mb-1 rounded-full object-cover bg-gray-100" onError={(e) => e.currentTarget.style.display = 'none'} />
                                                                    <div className="text-xs font-bold truncate">{match.awayTeamName}</div>
                                                                </div>
                                                            </div>
                                                        </CardContent>
                                                    </Card>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </TabsContent>

                            {/* MATCHES TAB */}
                            <TabsContent value="matches" className="mt-0 space-y-6">
                                {/* Filters logic could go here */}
                                <div className="space-y-4">
                                    {matches.map(match => (
                                        <div key={match.id} className="bg-white border text-center md:text-right border-gray-200 rounded-lg p-4 flex flex-col md:flex-row items-center justify-between gap-4 hover:border-yellow-400 transition-colors">
                                            <div className="flex flex-col md:items-start min-w-[150px]">
                                                <span className="text-sm font-bold text-gray-900">{formatDate(match.date)}</span>
                                                <span className="text-xs text-gray-500 flex items-center justify-center md:justify-start gap-1 mt-1">
                                                    <Clock className="h-3 w-3" /> {match.time} <span className="mx-1">•</span> {match.location}
                                                </span>
                                                <Badge variant="outline" className="mt-2 w-fit mx-auto md:mx-0 text-[10px]">{match.round}</Badge>
                                            </div>

                                            <div className="flex-1 flex items-center justify-center gap-8 w-full">
                                                <div className="flex items-center gap-3 flex-1 justify-end">
                                                    <span className="text-sm md:text-base font-bold text-gray-900 line-clamp-1">{match.homeTeamName}</span>
                                                    <img src={match.homeTeamLogo || ''} className="w-8 h-8 md:w-12 md:h-12 rounded-full bg-gray-100 border object-cover" onError={(e) => e.currentTarget.style.display = 'none'} />
                                                </div>

                                                <div className="min-w-[80px] text-center">
                                                    {match.status === 'scheduled' ? (
                                                        <span className="text-xl font-bold text-gray-300">VS</span>
                                                    ) : (
                                                        <div className="bg-gray-900 text-white px-3 py-1 rounded text-lg font-mono font-bold">
                                                            {match.homeScore} - {match.awayScore}
                                                        </div>
                                                    )}
                                                    {match.status === 'live' && <span className="text-xs text-red-500 font-bold block mt-1 animate-pulse">مباشر</span>}
                                                </div>

                                                <div className="flex items-center gap-3 flex-1 justify-start">
                                                    <img src={match.awayTeamLogo || ''} className="w-8 h-8 md:w-12 md:h-12 rounded-full bg-gray-100 border object-cover" onError={(e) => e.currentTarget.style.display = 'none'} />
                                                    <span className="text-sm md:text-base font-bold text-gray-900 line-clamp-1">{match.awayTeamName}</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </TabsContent>

                            {/* STANDINGS TAB */}
                            <TabsContent value="standings" className="mt-0">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    {Object.keys(groupedTeams).sort().map(group => (
                                        <Card key={group} className="overflow-hidden border-gray-200">
                                            <CardHeader className="bg-gray-50/50 py-3 border-b">
                                                <CardTitle className="text-base font-bold text-gray-900">المجموعة {group}</CardTitle>
                                            </CardHeader>
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead className="w-[10%] text-center">#</TableHead>
                                                        <TableHead className="text-right">الفريق</TableHead>
                                                        <TableHead className="text-center">لعب</TableHead>
                                                        <TableHead className="text-center">ن</TableHead>
                                                        <TableHead className="text-center text-xs text-gray-400">+/-</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {groupedTeams[group].map((team, index) => (
                                                        <TableRow key={team.id}>
                                                            <TableCell className="text-center font-mono text-gray-500">{index + 1}</TableCell>
                                                            <TableCell className="font-medium flex items-center gap-2">
                                                                <img src={team.logo} className="w-6 h-6 rounded-full bg-gray-100 object-cover" onError={(e) => e.currentTarget.style.display = 'none'} />
                                                                <span className="truncate max-w-[120px]" title={team.name}>{team.name}</span>
                                                            </TableCell>
                                                            <TableCell className="text-center text-gray-600">{team.matchesPlayed}</TableCell>
                                                            <TableCell className="text-center font-bold text-gray-900">{team.points}</TableCell>
                                                            <TableCell className="text-center text-xs text-gray-400 font-mono" dir="ltr">{team.goalsFor - team.goalsAgainst}</TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </Card>
                                    ))}
                                    {Object.keys(groupedTeams).length === 0 && (
                                        <div className="col-span-full py-12 text-center text-gray-500">لا توجد مجموعات متاحة حالياً</div>
                                    )}
                                </div>
                            </TabsContent>

                            {/* BRACKET TAB */}
                            <TabsContent value="bracket" className="mt-0">
                                <div className="overflow-x-auto py-8">
                                    {/* Simplified Public Bracket View */}
                                    <div className="flex gap-16 justify-center min-w-[max-content] mx-auto">
                                        {/* Similar logic to Admin Bracket Manager but Read Only */}
                                        {quarterFinals.length > 0 && (
                                            <div className="flex flex-col justify-around gap-8">
                                                <h3 className="text-center text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">ربع النهائي</h3>
                                                {Array.from({ length: 4 }).map((_, i) => (
                                                    <div key={`qf-${i}`} className="w-56 bg-white border rounded shadow-sm p-2">
                                                        {quarterFinals[i] ? (
                                                            <div className="space-y-2">
                                                                <div className="flex justify-between text-sm"><span className="truncate">{quarterFinals[i].homeTeamName}</span> <b>{quarterFinals[i].status === 'finished' ? quarterFinals[i].homeScore : '-'}</b></div>
                                                                <div className="flex justify-between text-sm"><span className="truncate">{quarterFinals[i].awayTeamName}</span> <b>{quarterFinals[i].status === 'finished' ? quarterFinals[i].awayScore : '-'}</b></div>
                                                            </div>
                                                        ) : <span className="text-xs text-gray-400 block text-center py-2">لم يحدد</span>}
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {(semiFinals.length > 0 || quarterFinals.length > 0) && (
                                            <div className="flex flex-col justify-around gap-16 mt-8">
                                                <h3 className="text-center text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">نصف النهائي</h3>
                                                {Array.from({ length: 2 }).map((_, i) => (
                                                    <div key={`sf-${i}`} className="w-56 bg-white border rounded shadow-sm p-2 relative">
                                                        {/* Connectors could be added here with CSS */}
                                                        {semiFinals[i] ? (
                                                            <div className="space-y-2">
                                                                <div className="flex justify-between text-sm"><span className="truncate">{semiFinals[i].homeTeamName}</span> <b>{semiFinals[i].status === 'finished' ? semiFinals[i].homeScore : '-'}</b></div>
                                                                <div className="flex justify-between text-sm"><span className="truncate">{semiFinals[i].awayTeamName}</span> <b>{semiFinals[i].status === 'finished' ? semiFinals[i].awayScore : '-'}</b></div>
                                                            </div>
                                                        ) : <span className="text-xs text-gray-400 block text-center py-2">لم يحدد</span>}
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        <div className="flex flex-col justify-center gap-8">
                                            <h3 className="text-center text-xs font-bold text-yellow-600 uppercase tracking-wider mb-4 flex items-center justify-center gap-1"><Trophy className="h-3 w-3" /> النهائي</h3>
                                            <div className="w-64 bg-white border-2 border-yellow-400 rounded-lg shadow-md p-3 transform scale-110">
                                                {finalMatch ? (
                                                    <div className="space-y-3">
                                                        <div className="flex justify-between font-bold"><span className="truncate">{finalMatch.homeTeamName}</span> <b className="text-lg">{finalMatch.status === 'finished' ? finalMatch.homeScore : '-'}</b></div>
                                                        <div className="flex justify-between font-bold"><span className="truncate">{finalMatch.awayTeamName}</span> <b className="text-lg">{finalMatch.status === 'finished' ? finalMatch.awayScore : '-'}</b></div>
                                                    </div>
                                                ) : <span className="text-sm text-gray-400 block text-center py-4">لم يحدد الطرفان بعد</span>}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </TabsContent>

                            {/* TEAMS TAB */}
                            <TabsContent value="teams" className="mt-0">
                                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
                                    {teams.map(team => (
                                        <div key={team.id} className="bg-white border hover:border-yellow-400 transition-colors rounded-xl p-6 flex flex-col items-center text-center cursor-pointer group">
                                            <div className="w-20 h-20 rounded-full bg-gray-50 mb-4 flex items-center justify-center overflow-hidden border group-hover:shadow-md transition-all">
                                                {team.logo ? (
                                                    <img src={team.logo} className="w-full h-full object-cover" />
                                                ) : (
                                                    <Users className="h-8 w-8 text-gray-300" />
                                                )}
                                            </div>
                                            <h4 className="font-bold text-gray-900 line-clamp-2 mb-1">{team.name}</h4>
                                            <span className="text-xs text-gray-500">{team.group ? `المجموعة ${team.group}` : 'لم يحدد'}</span>
                                        </div>
                                    ))}
                                </div>
                            </TabsContent>
                        </div>
                    </Tabs>
                </Card>
            </div>
        </div>
    );
}
