import React, { useState, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Calendar as CalendarIcon,
    Clock,
    Plus,
    Trophy,
    Trash2,
    Edit,
    Activity,
    Check
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase/config';
import { Tournament, formatDate } from '@/app/dashboard/admin/tournaments/utils';
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils/index";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { DateTimePicker } from "@/components/ui/datetime-picker";
import { ScrollArea } from "@/components/ui/scroll-area";



// Define Interfaces
export interface MatchEvent {
    id: string;
    type: 'goal' | 'yellow_card' | 'red_card' | 'substitution';
    teamId: string;
    teamName: string;
    minute: number;
    playerName: string;
    secondaryPlayerName?: string; // For substitution (player in)
}

interface Match {
    id?: string;
    homeTeamId: string;
    homeTeamName: string;
    homeTeamLogo?: string;
    awayTeamId: string;
    awayTeamName: string;
    awayTeamLogo?: string;
    date: any; // ISO string
    time: string;
    location: string;
    round: string;
    status: 'scheduled' | 'live' | 'finished';
    homeScore?: number;
    awayScore?: number;
    createdAt: any;

    // Statistics Fields
    events?: MatchEvent[];
    manOfTheMatch?: string;
}

interface Team {
    id: string;
    name: string;
    logo?: string;
    group?: string;
    players?: { name: string; id?: string }[];
}

interface MatchesManagerProps {
    tournament: Tournament;
}

export const MatchesManager: React.FC<MatchesManagerProps> = ({ tournament }) => {
    const [matches, setMatches] = useState<Match[]>([]);
    const [teams, setTeams] = useState<Team[]>([]);
    const [loading, setLoading] = useState(true);
    const [showDialog, setShowDialog] = useState(false);
    const [editingMatch, setEditingMatch] = useState<Match | null>(null);

    // Form States
    const [activeTab, setActiveTab] = useState('basic');

    // We store date as a Date object in state for the Calendar component
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);

    const [formData, setFormData] = useState<Partial<Match>>({
        homeTeamId: '',
        awayTeamId: '',
        time: '20:00', // Default time
        location: '',
        round: 'Group Stage',
        status: 'scheduled',
        homeScore: 0,
        awayScore: 0,
        events: [],
        manOfTheMatch: ''
    });

    // New Event Input State
    const [newEvent, setNewEvent] = useState<Partial<MatchEvent>>({
        type: 'goal',
        minute: 0,
        playerName: ''
    });

    const rounds = [
        'Group Stage', 'Round of 32', 'Round of 16', 'Quarter Final', 'Semi Final', 'Final', 'Third Place'
    ];

    useEffect(() => {
        fetchData();
    }, [tournament.id]);

    const fetchData = async () => {
        try {
            setLoading(true);
            if (!tournament.id) return;

            // Fetch Teams
            const { data: teamsData } = await supabase
                .from('tournament_teams')
                .select('*')
                .eq('tournamentId', tournament.id);
            setTeams((teamsData || []) as Team[]);

            // Fetch Matches
            const { data: matchesData } = await supabase
                .from('tournament_matches')
                .select('*')
                .eq('tournamentId', tournament.id)
                .order('date', { ascending: true });
            setMatches((matchesData || []).map(row => ({ ...row, events: row.events || [] })) as Match[]);

        } catch (error) {
            console.error('Error fetching data:', error);
            toast.error('فشل في تحميل البيانات');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!tournament.id) return;

        // Validate teams
        if (formData.homeTeamId === formData.awayTeamId) {
            toast.error('لا يمكن اختيار نفس الفريق للمباراة');
            return;
        }

        if (!selectedDate) {
            toast.error('يرجى تحديد تاريخ المباراة');
            return;
        }

        try {
            // Find selected team details
            const homeTeam = teams.find(t => t.id === formData.homeTeamId);
            const awayTeam = teams.find(t => t.id === formData.awayTeamId);

            const matchData = {
                ...formData,
                tournament_id: tournament.id,
                homeTeamName: homeTeam?.name || 'Unknown',
                homeTeamLogo: homeTeam?.logo || '',
                awayTeamName: awayTeam?.name || 'Unknown',
                awayTeamLogo: awayTeam?.logo || '',
                date: selectedDate.toISOString(),
                updatedAt: new Date().toISOString()
            };

            if (editingMatch) {
                await supabase
                    .from('tournament_matches')
                    .update(matchData)
                    .eq('id', editingMatch.id!);
                toast.success('تم تحديث بيانات المباراة والإحصائيات');
            } else {
                await supabase
                    .from('tournament_matches')
                    .insert({ id: crypto.randomUUID(), ...matchData, createdAt: new Date().toISOString() });
                toast.success('تم جدولة المباراة');
            }

            setShowDialog(false);
            resetForm();
            fetchData();
        } catch (error) {
            console.error('Error saving match:', error);
            toast.error('فشل في حفظ المباراة');
        }
    };

    const handleDelete = async (matchId: string) => {
        if (confirm('هل أنت متأكد من حذف هذه المباراة؟')) {
            try {
                await supabase.from('tournament_matches').delete().eq('id', matchId);
                toast.success('تم حذف المباراة');
                fetchData();
            } catch (error) {
                toast.error('فشل حذف المباراة');
            }
        }
    };

    const resetForm = () => {
        setFormData({
            homeTeamId: '',
            awayTeamId: '',
            time: '20:00',
            location: tournament.location || '',
            round: 'Group Stage',
            status: 'scheduled',
            homeScore: 0,
            awayScore: 0,
            events: [],
            manOfTheMatch: ''
        });
        setSelectedDate(undefined);
        setEditingMatch(null);
        setActiveTab('basic');
    };

    const handleEdit = (match: Match) => {
        setEditingMatch(match);
        // Convert ISO string to JS Date
        let dateObj = undefined;
        if (match.date) {
            dateObj = new Date(match.date);
        }

        setSelectedDate(dateObj);
        setFormData({
            ...match,
            events: match.events || [],
            manOfTheMatch: match.manOfTheMatch || ''
        });
        setShowDialog(true);
    };

    // Event Handling
    const addEvent = () => {
        if (!newEvent.teamId || !newEvent.type || !newEvent.playerName) {
            toast.error('يرجى تعبئة جميع حقول الحدث');
            return;
        }

        const team = teams.find(t => t.id === newEvent.teamId);

        const eventToAdd: MatchEvent = {
            id: Math.random().toString(36).substr(2, 9),
            type: newEvent.type as any,
            teamId: newEvent.teamId,
            teamName: team?.name || 'Unknown',
            minute: Number(newEvent.minute) || 0,
            playerName: newEvent.playerName,
            secondaryPlayerName: newEvent.secondaryPlayerName
        };

        setFormData(prev => ({
            ...prev,
            events: [...(prev.events || []), eventToAdd].sort((a, b) => a.minute - b.minute)
        }));

        setNewEvent({ ...newEvent, playerName: '', secondaryPlayerName: '' }); // Reset player inputs
        toast.success('تم إضافة الحدث');
    };

    const removeEvent = (eventId: string) => {
        setFormData(prev => ({
            ...prev,
            events: prev.events?.filter(e => e.id !== eventId)
        }));
    };

    const generateFixtures = async (type: 'league' | 'knockout') => {
        if (teams.length < 2) {
            toast.error("يجب وجود فريقين على الأقل لتوليد المباريات");
            return;
        }

        const confirm = window.confirm("سيتم توليد مباريات جديدة. هل أنت متأكد؟");
        if (!confirm) return;

        try {
            let newMatches: any[] = [];
            if (type === 'league') {
                const groupedTeams: { [key: string]: Team[] } = {};
                teams.forEach(t => {
                    const g = t.group || 'General';
                    if (!groupedTeams[g]) groupedTeams[g] = [];
                    groupedTeams[g].push(t);
                });

                Object.entries(groupedTeams).forEach(([groupName, groupTeams]) => {
                    if (groupTeams.length < 2) return;
                    for (let i = 0; i < groupTeams.length; i++) {
                        for (let j = i + 1; j < groupTeams.length; j++) {
                            const home = groupTeams[i];
                            const away = groupTeams[j];
                            newMatches.push({
                                homeTeamId: home.id,
                                homeTeamName: home.name,
                                homeTeamLogo: home.logo || '',
                                awayTeamId: away.id,
                                awayTeamName: away.name,
                                awayTeamLogo: away.logo || '',
                                date: new Date(),
                                time: '20:00',
                                location: tournament.location || 'الملعب الرئيسي',
                                round: `Group ${groupName} - Round 1`,
                                status: 'scheduled',
                                homeScore: 0,
                                awayScore: 0,
                                createdAt: new Date()
                            });
                        }
                    }
                });
            }

            if (newMatches.length === 0) {
                toast.warning("لم يتم توليد أي مباريات. تأكد من وجود فرق.");
                return;
            }

            await supabase
                .from('tournament_matches')
                .insert(newMatches.map(m => ({ id: crypto.randomUUID(), tournament_id: tournament.id, ...m, date: new Date(m.date).toISOString(), createdAt: new Date().toISOString() })));
            toast.success(`تم توليد ${newMatches.length} مباراة بنجاح!`);
            fetchData();
        } catch (error) {
            console.error(error);
            toast.error("حدث خطأ أثناء توليد المباريات");
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <CalendarIcon className="h-6 w-6 text-yellow-600" />
                        جدول المباريات ({matches.length})
                    </h2>
                    <p className="text-gray-500">إدارة المباريات، النتائج، والإحصائيات التفصيلية</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => generateFixtures('league')} className="gap-2 border-yellow-200 hover:bg-yellow-50 text-yellow-700">
                        <Activity className="h-4 w-4" />
                        توليد الدوري تلقائياً
                    </Button>
                    <Button
                        onClick={() => { resetForm(); setShowDialog(true); }}
                        className="bg-yellow-600 hover:bg-yellow-700 text-white flex items-center gap-2 shadow-lg hover:shadow-xl transition-all"
                    >
                        <Plus className="h-4 w-4" />
                        إضافة مباراة
                    </Button>
                </div>
            </div>

            {matches.length === 0 ? (
                <Card className="border-dashed border-2 bg-gray-50/50">
                    <CardContent className="flex flex-col items-center justify-center py-16">
                        <div className="bg-white p-4 rounded-full shadow-sm mb-4">
                            <Trophy className="h-12 w-12 text-yellow-500" />
                        </div>
                        <h3 className="text-xl font-semibold text-gray-900 mb-1">لا توجد مباريات مجدولة</h3>
                        <p className="text-gray-500 mb-6 text-center max-w-sm text-sm">
                            ابدأ ببناء جدول البطولة وإضافة المباريات بين الفرق المشاركة.
                        </p>
                        <Button onClick={() => setShowDialog(true)} disabled={teams.length < 2}>
                            <Plus className="h-4 w-4 mr-2" />
                            جدولة أول مباراة
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-4">
                    {matches.map((match) => (
                        <Card key={match.id} className="hover:shadow-lg transition-all duration-300 relative overflow-hidden group border-muted/60">
                            <div className={`absolute top-0 right-0 w-1.5 h-full transition-all duration-300 ${match.status === 'finished' ? 'bg-gray-500' : match.status === 'live' ? 'bg-green-500' : 'bg-blue-600'}`}></div>
                            <CardContent className="p-0">
                                <div className="flex flex-col md:flex-row items-center">
                                    <div className="p-5 flex-1 flex flex-col md:flex-row items-center justify-between w-full gap-6">

                                        {/* Date Info */}
                                        <div className="flex flex-col items-center md:items-start min-w-[140px] text-center md:text-right space-y-2">
                                            <div className="flex items-center gap-2 text-sm font-bold text-gray-800">
                                                <CalendarIcon className="h-4 w-4 text-blue-600" /> {formatDate(match.date)}
                                            </div>
                                            <div className="flex items-center gap-2 text-xs text-gray-500 font-medium">
                                                <Clock className="h-3.5 w-3.5" /> {match.time}
                                            </div>
                                            <Badge variant="secondary" className="text-[10px] font-normal px-2 bg-gray-100">{match.round}</Badge>
                                        </div>

                                        {/* Scoreboard */}
                                        <div className="flex items-center justify-center flex-1 gap-6 md:gap-12 w-full">
                                            {/* Home Team */}
                                            <div className="flex flex-col items-center gap-3 flex-1 relative group/team">
                                                <div className="relative transition-transform duration-300 group-hover/team:scale-105">
                                                    {match.homeTeamLogo ? (
                                                        <img src={match.homeTeamLogo} alt={match.homeTeamName} className="w-16 h-16 rounded-full object-cover border-4 border-white shadow-md" />
                                                    ) : (
                                                        <div className="w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center border font-bold text-gray-400">?</div>
                                                    )}
                                                    {match.homeScore !== undefined && match.homeScore > (match.awayScore || 0) && match.status === 'finished' && (
                                                        <div className="absolute -top-1 -right-1 bg-yellow-400 text-white rounded-full p-1.5 shadow-sm animate-in zoom-in"><Trophy className="h-3 w-3" /></div>
                                                    )}
                                                </div>
                                                <span className="text-sm font-bold text-center text-gray-900 line-clamp-1">{match.homeTeamName}</span>

                                                {/* Goals List (Home) */}
                                                <div className="flex flex-col items-center gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    {match.events?.filter(e => e.type === 'goal' && e.teamId === match.homeTeamId).map(e => (
                                                        <span key={e.id} className="text-[10px] text-gray-500 flex items-center gap-1 bg-gray-50 px-1.5 py-0.5 rounded-full border border-gray-100">
                                                            ⚽ {e.playerName} {e.minute}'
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* VS / Score */}
                                            <div className="flex flex-col items-center px-2 min-w-[100px]">
                                                {match.status === 'scheduled' ? (
                                                    <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-xs font-black text-gray-300 font-mono shadow-inner">VS</div>
                                                ) : (
                                                    <div className="flex flex-col items-center">
                                                        <div className="flex items-center gap-4 bg-gray-900 text-white py-2 px-4 rounded-xl shadow-lg">
                                                            <span className="text-3xl font-bold font-mono min-w-[30px] text-center">{match.homeScore}</span>
                                                            <span className="text-gray-500 text-xl mx-[-4px]">:</span>
                                                            <span className="text-3xl font-bold font-mono min-w-[30px] text-center">{match.awayScore}</span>
                                                        </div>
                                                        <Badge className={`mt-3 border-0 ${match.status === 'live' ? 'bg-green-100 text-green-700 animate-pulse' : match.status === 'finished' ? 'bg-gray-100 text-gray-600' : 'bg-blue-50 text-blue-700'}`}>
                                                            {match.status === 'live' ? '• جارية الآن' : match.status === 'finished' ? 'انتهت' : 'مجدولة'}
                                                        </Badge>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Away Team */}
                                            <div className="flex flex-col items-center gap-3 flex-1 relative group/team">
                                                <div className="relative transition-transform duration-300 group-hover/team:scale-105">
                                                    {match.awayTeamLogo ? (
                                                        <img src={match.awayTeamLogo} alt={match.awayTeamName} className="w-16 h-16 rounded-full object-cover border-4 border-white shadow-md" />
                                                    ) : (
                                                        <div className="w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center border font-bold text-gray-400">?</div>
                                                    )}
                                                    {match.awayScore !== undefined && match.awayScore > (match.homeScore || 0) && match.status === 'finished' && (
                                                        <div className="absolute -top-1 -left-1 bg-yellow-400 text-white rounded-full p-1.5 shadow-sm animate-in zoom-in"><Trophy className="h-3 w-3" /></div>
                                                    )}
                                                </div>
                                                <span className="text-sm font-bold text-center text-gray-900 line-clamp-1">{match.awayTeamName}</span>
                                                {/* Goals List (Away) */}
                                                <div className="flex flex-col items-center gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    {match.events?.filter(e => e.type === 'goal' && e.teamId === match.awayTeamId).map(e => (
                                                        <span key={e.id} className="text-[10px] text-gray-500 flex items-center gap-1 bg-gray-50 px-1.5 py-0.5 rounded-full border border-gray-100">
                                                            ⚽ {e.playerName} {e.minute}'
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Actions */}
                                        <div className="flex items-center gap-2 md:border-r md:pr-6 md:pl-2">
                                            <Button variant="ghost" size="icon" onClick={() => handleEdit(match)} className="h-9 w-9 text-blue-600 hover:bg-blue-50 hover:text-blue-700 transition-colors">
                                                <Edit className="h-4 w-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" onClick={() => handleDelete(match.id!)} className="h-9 w-9 text-red-500 hover:bg-red-50 hover:text-red-700 transition-colors">
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>

                                    {/* Footer Stats Summary (Optional) */}
                                    {match.manOfTheMatch && (
                                        <div className="w-full bg-gradient-to-r from-yellow-50 to-orange-50 border-t border-yellow-100/50 px-6 py-2.5 flex items-center justify-center gap-3 text-xs text-yellow-800">
                                            <div className="flex items-center gap-1.5 bg-white/50 px-2 py-1 rounded-full shadow-sm">
                                                <Trophy className="h-3.5 w-3.5 text-yellow-600" />
                                                <span className="font-bold">رجل المباراة:</span>
                                            </div>
                                            <span className="font-medium text-sm">{match.manOfTheMatch}</span>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Comprehensive Match Dialog */}
            <Dialog open={showDialog} onOpenChange={setShowDialog}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col p-0 gap-0 border-0 rounded-2xl shadow-2xl">
                    <DialogHeader className="px-8 py-6 border-b bg-gradient-to-br from-gray-50 to-white">
                        <DialogTitle className="text-xl text-gray-800">{editingMatch ? 'تعديل تفاصيل المباراة والإحصائيات' : 'جدولة مباراة جديدة'}</DialogTitle>
                        <DialogDescription className="text-gray-500 mt-1.5">إدارة بيانات المباراة، الأهداف، البطاقات، والجوائز</DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleSubmit} className="flex-1 overflow-hidden flex flex-col bg-white">
                        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full flex-1 flex flex-col overflow-hidden">
                            <TabsList className="px-8 border-b justify-start rounded-none bg-white p-0 h-14 w-full gap-8 shadow-sm z-10">
                                <TabsTrigger value="basic" className="h-full rounded-none border-b-[3px] border-transparent data-[state=active]:border-blue-600 data-[state=active]:text-blue-700 data-[state=active]:shadow-none radius-0 font-medium px-2 transition-all">البيانات الأساسية</TabsTrigger>
                                <TabsTrigger value="events" className="h-full rounded-none border-b-[3px] border-transparent data-[state=active]:border-blue-600 data-[state=active]:text-blue-700 data-[state=active]:shadow-none radius-0 font-medium px-2 transition-all" disabled={!formData.homeTeamId || !formData.awayTeamId}>أحداث المباراة</TabsTrigger>
                                <TabsTrigger value="stats" className="h-full rounded-none border-b-[3px] border-transparent data-[state=active]:border-blue-600 data-[state=active]:text-blue-700 data-[state=active]:shadow-none radius-0 font-medium px-2 transition-all" disabled={!formData.homeTeamId || !formData.awayTeamId}>إحصائيات إضافية</TabsTrigger>
                            </TabsList>

                            <ScrollArea className="flex-1 bg-gray-50/30">
                                <div className="p-8 pb-20">
                                    <TabsContent value="basic" className="space-y-6 m-0 animate-in fade-in slide-in-from-right-4 duration-300">

                                        {/* Teams Selection */}
                                        <div className="grid grid-cols-2 gap-6 p-6 bg-white rounded-xl border border-gray-100 shadow-sm">
                                            <div className="space-y-3">
                                                <Label className="text-gray-700 font-semibold">الفريق الأول (Home)</Label>
                                                <Select value={formData.homeTeamId} onValueChange={(val) => setFormData(p => ({ ...p, homeTeamId: val }))}>
                                                    <SelectTrigger className="h-11 bg-gray-50 border-gray-200 focus:ring-yellow-500"><SelectValue placeholder="اختر الفريق" /></SelectTrigger>
                                                    <SelectContent>{teams.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
                                                </Select>
                                            </div>
                                            <div className="space-y-3">
                                                <Label className="text-gray-700 font-semibold">الفريق الثاني (Away)</Label>
                                                <Select value={formData.awayTeamId} onValueChange={(val) => setFormData(p => ({ ...p, awayTeamId: val }))}>
                                                    <SelectTrigger className="h-11 bg-gray-50 border-gray-200 focus:ring-yellow-500"><SelectValue placeholder="اختر الفريق" /></SelectTrigger>
                                                    <SelectContent>{teams.map(t => <SelectItem key={t.id} value={t.id} disabled={t.id === formData.homeTeamId}>{t.name}</SelectItem>)}</SelectContent>
                                                </Select>
                                            </div>
                                        </div>

                                        {/* Date & Time */}
                                        <div className="space-y-3">
                                            <Label className="text-gray-700 font-semibold">التاريخ والوقت</Label>
                                            <DateTimePicker
                                                date={selectedDate}
                                                setDate={setSelectedDate}
                                                timeString={formData.time}
                                                setTimeString={(t) => setFormData(p => ({ ...p, time: t }))}
                                            />
                                        </div>

                                        {/* Location & Round */}
                                        <div className="grid grid-cols-2 gap-6">
                                            <div className="space-y-3">
                                                <Label className="text-gray-700 font-semibold">المكان</Label>
                                                <Input className="h-11" value={formData.location} onChange={(e) => setFormData(p => ({ ...p, location: e.target.value }))} placeholder="اسم الملعب" />
                                            </div>
                                            <div className="space-y-3">
                                                <Label className="text-gray-700 font-semibold">الجولة</Label>
                                                <Select value={formData.round} onValueChange={(val) => setFormData(p => ({ ...p, round: val }))}>
                                                    <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                                                    <SelectContent>{rounds.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                                                </Select>
                                            </div>
                                        </div>

                                        {/* Score Section */}
                                        <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm bg-white">
                                            <div className="bg-gray-50 border-b border-gray-100 px-4 py-3">
                                                <Label className="font-bold text-gray-800">النتيجة والحالة</Label>
                                            </div>
                                            <div className="p-6 flex flex-col md:flex-row gap-8 items-center justify-between">
                                                <div className="w-full md:w-auto">
                                                    <Select value={formData.status} onValueChange={(val: any) => setFormData(p => ({ ...p, status: val }))}>
                                                        <SelectTrigger className="w-full md:w-[180px] h-11"><SelectValue /></SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="scheduled">مجدولة</SelectItem>
                                                            <SelectItem value="live">جارية الآن</SelectItem>
                                                            <SelectItem value="finished">انتهت</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>

                                                {formData.status !== 'scheduled' && (
                                                    <div className="flex items-center gap-6 flex-1 justify-center md:justify-end bg-gray-50 px-6 py-3 rounded-lg border border-gray-100">
                                                        <div className="text-center">
                                                            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1.5">Home</span>
                                                            <Input type="number" className="w-20 h-12 text-center font-bold text-xl bg-white shadow-sm border-gray-200" value={formData.homeScore} onChange={(e) => setFormData(p => ({ ...p, homeScore: parseInt(e.target.value) || 0 }))} />
                                                        </div>
                                                        <span className="font-bold text-3xl text-gray-300 pb-6">:</span>
                                                        <div className="text-center">
                                                            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1.5">Away</span>
                                                            <Input type="number" className="w-20 h-12 text-center font-bold text-xl bg-white shadow-sm border-gray-200" value={formData.awayScore} onChange={(e) => setFormData(p => ({ ...p, awayScore: parseInt(e.target.value) || 0 }))} />
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </TabsContent>

                                    <TabsContent value="events" className="space-y-6 m-0 animate-in fade-in slide-in-from-right-4 duration-300">
                                        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-4">
                                            <h4 className="font-bold text-gray-900 flex items-center gap-2 pb-2 border-b"><Plus className="h-5 w-5 text-blue-600" /> إضافة حدث جديد</h4>

                                            <div className="grid grid-cols-12 gap-3 items-end">
                                                <div className="col-span-12 sm:col-span-4 space-y-1.5">
                                                    <Label className="text-xs text-muted-foreground">الفريق</Label>
                                                    <Select value={newEvent.teamId} onValueChange={(val) => setNewEvent(p => ({ ...p, teamId: val }))}>
                                                        <SelectTrigger className="bg-gray-50"><SelectValue placeholder="اختر الفريق" /></SelectTrigger>
                                                        <SelectContent>
                                                            {teams.filter(t => t.id === formData.homeTeamId || t.id === formData.awayTeamId).map(t => (
                                                                <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>

                                                <div className="col-span-6 sm:col-span-3 space-y-1.5">
                                                    <Label className="text-xs text-muted-foreground">الحدث</Label>
                                                    <Select value={newEvent.type} onValueChange={(val: any) => setNewEvent(p => ({ ...p, type: val }))}>
                                                        <SelectTrigger className="bg-gray-50"><SelectValue placeholder="نوع الحدث" /></SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="goal">⚽ هدف</SelectItem>
                                                            <SelectItem value="yellow_card">🟨 كرت أصفر</SelectItem>
                                                            <SelectItem value="red_card">🟥 كرت أحمر</SelectItem>
                                                            <SelectItem value="substitution">🔄 تبديل</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>

                                                <div className="col-span-6 sm:col-span-2 space-y-1.5">
                                                    <Label className="text-xs text-muted-foreground">الدقيقة</Label>
                                                    <Input
                                                        type="number"
                                                        placeholder="د."
                                                        value={newEvent.minute}
                                                        onChange={(e) => setNewEvent(p => ({ ...p, minute: parseInt(e.target.value) }))}
                                                        className="bg-gray-50 text-center"
                                                    />
                                                </div>

                                                <div className="col-span-12 sm:col-span-3">
                                                    <Button type="button" onClick={addEvent} className="w-full bg-blue-600 hover:bg-blue-700 text-white">إضافة</Button>
                                                </div>

                                                <div className="col-span-12 grid grid-cols-2 gap-3 pt-2">
                                                    <Input
                                                        placeholder="اسم اللاعب"
                                                        value={newEvent.playerName}
                                                        onChange={(e) => setNewEvent(p => ({ ...p, playerName: e.target.value }))}
                                                        className="bg-white"
                                                    />
                                                    {newEvent.type === 'substitution' && (
                                                        <Input
                                                            placeholder="اللاعب البديل (خروج)"
                                                            value={newEvent.secondaryPlayerName}
                                                            onChange={(e) => setNewEvent(p => ({ ...p, secondaryPlayerName: e.target.value }))}
                                                            className="bg-white"
                                                        />
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex-1 min-h-[200px] border border-gray-200 rounded-xl bg-white overflow-hidden flex flex-col">
                                            <div className="bg-gray-50 border-b border-gray-100 px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">سجل الأحداث</div>
                                            {(!formData.events || formData.events.length === 0) ? (
                                                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-gray-400">
                                                    <Activity className="h-10 w-10 mb-2 opacity-20" />
                                                    <p className="text-sm">لا توجد أحداث مسجلة لهذه المباراة بعد</p>
                                                </div>
                                            ) : (
                                                <div className="divide-y relative">
                                                    {formData.events.map((event) => (
                                                        <div key={event.id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                                                            <div className="flex items-center gap-4">
                                                                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-sm font-bold text-gray-600 shadow-sm border border-gray-200">
                                                                    {event.minute}'
                                                                </div>
                                                                <div className="flex flex-col">
                                                                    <span className="text-xs text-gray-500 mb-0.5">{event.teamName}</span>
                                                                    <div className="flex items-center gap-2">
                                                                        {event.type === 'goal' && <span className="text-lg" title="هدف">⚽</span>}
                                                                        {event.type === 'yellow_card' && <div className="w-3 h-4 bg-yellow-400 rounded-sm border border-yellow-500 shadow-sm" title="كرت أصفر"></div>}
                                                                        {event.type === 'red_card' && <div className="w-3 h-4 bg-red-600 rounded-sm border border-red-700 shadow-sm" title="كرت أحمر"></div>}
                                                                        {event.type === 'substitution' && <span className="text-lg" title="تبديل">🔄</span>}

                                                                        <span className="font-bold text-gray-900 text-sm">{event.playerName}</span>
                                                                        {event.secondaryPlayerName && <span className="text-gray-400 text-xs"> بدلاً من {event.secondaryPlayerName}</span>}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <Button type="button" variant="ghost" size="icon" onClick={() => removeEvent(event.id)} className="text-gray-400 hover:text-red-600 hover:bg-red-50 h-8 w-8 rounded-full">
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </TabsContent>

                                    <TabsContent value="stats" className="space-y-6 m-0 animate-in fade-in slide-in-from-right-4 duration-300">
                                        <div className="bg-gradient-to-br from-yellow-50 to-white p-6 rounded-xl border border-yellow-100 shadow-sm space-y-4">
                                            <div className="space-y-3">
                                                <Label className="flex items-center gap-2 text-yellow-800 font-bold text-lg">
                                                    <Trophy className="h-5 w-5 text-yellow-600" />
                                                    رجل المباراة (Man of the Match)
                                                </Label>
                                                <Input
                                                    className="h-12 bg-white border-yellow-200 focus:ring-yellow-500 text-lg"
                                                    placeholder="اكتب اسم اللاعب الأفضل..."
                                                    value={formData.manOfTheMatch}
                                                    onChange={(e) => setFormData(p => ({ ...p, manOfTheMatch: e.target.value }))}
                                                />
                                                <p className="text-sm text-gray-500 flex items-center gap-1"><Activity className="h-3 w-3" /> سيتم عرض هذا الاسم في ملخص المباراة.</p>
                                            </div>
                                        </div>

                                        <div className="bg-blue-50/50 p-6 rounded-xl border border-blue-100 flex items-start gap-3">
                                            <div className="bg-blue-100 p-2 rounded-full">
                                                <Activity className="h-5 w-5 text-blue-600" />
                                            </div>
                                            <div>
                                                <h4 className="text-blue-900 font-semibold text-sm mb-1">إحصائيات متقدمة قريباً</h4>
                                                <p className="text-blue-700 text-sm leading-relaxed">
                                                    نعمل على إضافة إحصائيات الاستحواذ، التسديدات، والركنيات لتوفير تحليل شامل للمباراة.
                                                </p>
                                            </div>
                                        </div>
                                    </TabsContent>
                                </div>
                            </ScrollArea>
                        </Tabs>

                        <div className="px-8 py-5 border-t bg-white flex justify-end gap-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.02)] z-20">
                            <Button type="button" variant="outline" onClick={() => setShowDialog(false)} className="h-11 px-6 border-gray-300 text-gray-700">إلغاء</Button>
                            <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white h-11 px-8 shadow-md hover:shadow-lg transition-all min-w-[160px] text-lg">
                                {editingMatch ? 'حفظ التغييرات' : 'جدولة المباراة'}
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
};
