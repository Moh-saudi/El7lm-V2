import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Trophy, Calendar, Activity, Users } from 'lucide-react';
import { collection, getDocs, query, orderBy, limit, where } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { Tournament, formatDate } from '@/app/dashboard/admin/tournaments/utils';

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
    awayTeamName: string;
    homeTeamLogo?: string;
    awayTeamLogo?: string;
    date: any;
    time: string;
    status: string;
    homeScore?: number;
    awayScore?: number;
}

interface OverviewManagerProps {
    tournament: Tournament;
}

export const OverviewManager: React.FC<OverviewManagerProps> = ({ tournament }) => {
    const [teams, setTeams] = useState<Team[]>([]);
    const [upcomingMatches, setUpcomingMatches] = useState<Match[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            if (!tournament.id) return;
            try {
                // Fetch Teams for Standings
                const teamsQ = query(collection(db, `tournaments/${tournament.id}/teams`));
                const teamsSnap = await getDocs(teamsQ);
                const teamsData = teamsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Team));
                // Sort by points desc, then goal difference (simple client-side sort)
                teamsData.sort((a, b) => {
                    if (b.points !== a.points) return b.points - a.points;
                    return (b.goalsFor - b.goalsAgainst) - (a.goalsFor - a.goalsAgainst);
                });
                setTeams(teamsData);

                // Fetch Upcoming Matches
                const matchesQ = query(
                    collection(db, `tournaments/${tournament.id}/matches`),
                    where('status', '==', 'scheduled'),
                    orderBy('date', 'asc'),
                    limit(3)
                );
                const matchesSnap = await getDocs(matchesQ);
                const matchesData = matchesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Match));
                setUpcomingMatches(matchesData);

            } catch (error) {
                console.error('Error fetching overview data:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [tournament.id]);

    // Group teams by Group Letter
    const groupedTeams: Record<string, Team[]> = {};
    teams.forEach(team => {
        const group = team.group || 'A';
        if (!groupedTeams[group]) groupedTeams[group] = [];
        groupedTeams[group].push(team);
    });

    if (loading) return <div className="p-8 text-center">جاري تحميل الإحصائيات...</div>;

    return (
        <div className="space-y-8">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-gradient-to-br from-yellow-50 to-white border-yellow-100">
                    <CardContent className="p-6 flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-yellow-700">عدد الفرق</p>
                            <h3 className="text-3xl font-bold text-gray-900 mt-1">{teams.length}</h3>
                        </div>
                        <div className="p-3 bg-white rounded-full shadow-sm">
                            <Users className="h-6 w-6 text-yellow-600" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-blue-50 to-white border-blue-100">
                    <CardContent className="p-6 flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-blue-700">المباراة القادمة</p>
                            <h3 className="text-lg font-bold text-gray-900 mt-1 truncate max-w-[150px]">
                                {upcomingMatches[0] ? `${upcomingMatches[0].homeTeamName} vs ${upcomingMatches[0].awayTeamName}` : 'لا يوجد'}
                            </h3>
                        </div>
                        <div className="p-3 bg-white rounded-full shadow-sm">
                            <Calendar className="h-6 w-6 text-blue-600" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-green-50 to-white border-green-100">
                    <CardContent className="p-6 flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-green-700">حالة البطولة</p>
                            <h3 className="text-xl font-bold text-gray-900 mt-1">
                                {upcomingMatches.length > 0 ? 'جارية' : 'لم تبدأ'}
                            </h3>
                        </div>
                        <div className="p-3 bg-white rounded-full shadow-sm">
                            <Activity className="h-6 w-6 text-green-600" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Standings Tables (Takes up 2 cols) */}
                <div className="lg:col-span-2 space-y-6">
                    <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                        <Trophy className="h-5 w-5 text-yellow-600" />
                        جدول الترتيب
                    </h3>

                    {Object.keys(groupedTeams).sort().map(group => (
                        <Card key={group} className="overflow-hidden">
                            <CardHeader className="bg-gray-50 py-3 border-b">
                                <CardTitle className="text-base font-semibold text-gray-900">المجموعة {group}</CardTitle>
                            </CardHeader>
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-gray-50/50">
                                        <TableHead className="w-[40%] text-right">الفريق</TableHead>
                                        <TableHead className="text-center">لعب</TableHead>
                                        <TableHead className="text-center">فاز</TableHead>
                                        <TableHead className="text-center">تعادل</TableHead>
                                        <TableHead className="text-center">خسر</TableHead>
                                        <TableHead className="text-center">له/عليه</TableHead>
                                        <TableHead className="text-center font-bold text-gray-900">نقاط</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {groupedTeams[group].map((team, index) => (
                                        <TableRow key={team.id}>
                                            <TableCell className="font-medium flex items-center gap-2">
                                                <span className="text-gray-400 w-4">{index + 1}</span>
                                                {team.logo ? (
                                                    <img src={team.logo} alt="" className="w-6 h-6 rounded-full object-cover" />
                                                ) : (
                                                    <div className="w-6 h-6 rounded-full bg-gray-100" />
                                                )}
                                                <span className="truncate">{team.name}</span>
                                            </TableCell>
                                            <TableCell className="text-center">{team.matchesPlayed}</TableCell>
                                            <TableCell className="text-center text-green-600">{team.wins}</TableCell>
                                            <TableCell className="text-center text-gray-600">{team.draws}</TableCell>
                                            <TableCell className="text-center text-red-600">{team.losses}</TableCell>
                                            <TableCell className="text-center dir-ltr text-xs">
                                                {team.goalsFor}:{team.goalsAgainst}
                                            </TableCell>
                                            <TableCell className="text-center font-bold text-gray-900 bg-gray-50">{team.points}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </Card>
                    ))}

                    {Object.keys(groupedTeams).length === 0 && (
                        <div className="p-8 text-center border-2 border-dashed rounded-lg text-gray-500">
                            لا توجد مجموعات لعرضها. قم بإضافة فرق وتعيين المجموعات.
                        </div>
                    )}
                </div>

                {/* Upcoming Matches Sidebar */}
                <div className="space-y-6">
                    <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                        <Calendar className="h-5 w-5 text-blue-600" />
                        المباريات القادمة
                    </h3>
                    <div className="space-y-4">
                        {upcomingMatches.length === 0 ? (
                            <div className="p-6 text-center bg-gray-50 rounded-lg text-gray-500 text-sm">
                                لا توجد مباريات قادمة
                            </div>
                        ) : upcomingMatches.map(match => (
                            <Card key={match.id} className="hover:shadow-md transition-shadow">
                                <CardContent className="p-4">
                                    <div className="flex justify-between items-center text-sm text-gray-500 mb-3">
                                        <span className="flex items-center gap-1">
                                            <Calendar className="h-3 w-3" />
                                            {formatDate(match.date)}
                                        </span>
                                        <Badge variant="outline" className="text-xs">{match.time}</Badge>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <div className="flex flex-col items-center gap-2 w-1/3">
                                            {match.homeTeamLogo ? (
                                                <img src={match.homeTeamLogo} alt="" className="w-10 h-10 rounded-full border" />
                                            ) : (
                                                <div className="w-10 h-10 rounded-full bg-gray-100 border" />
                                            )}
                                            <span className="text-xs font-semibold text-center truncate w-full">{match.homeTeamName}</span>
                                        </div>
                                        <div className="text-lg font-bold text-gray-300">VS</div>
                                        <div className="flex flex-col items-center gap-2 w-1/3">
                                            {match.awayTeamLogo ? (
                                                <img src={match.awayTeamLogo} alt="" className="w-10 h-10 rounded-full border" />
                                            ) : (
                                                <div className="w-10 h-10 rounded-full bg-gray-100 border" />
                                            )}
                                            <span className="text-xs font-semibold text-center truncate w-full">{match.awayTeamName}</span>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}

                        {upcomingMatches.length > 0 && (
                            <Button variant="outline" className="w-full text-xs" onClick={() => document.querySelector('[value="matches"]')?.dispatchEvent(new Event('click', { bubbles: true }))}>
                                عرض الجدول الكامل
                            </Button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
