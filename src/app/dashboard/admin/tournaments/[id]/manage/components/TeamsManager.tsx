import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Users, Shield, Search, Plus, Trash2, Edit, Save, X,
    Check, UserPlus, Image as ImageIcon, Upload
} from 'lucide-react';
import { toast } from 'sonner';
import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { Tournament } from '@/app/dashboard/admin/tournaments/utils';

interface Team {
    id?: string;
    name: string;
    logo?: string;
    captainName?: string;
    contactPhone?: string;
    group?: string; // A, B, C...
    points?: number; // For group stage
    matchesPlayed?: number;
    wins?: number;
    draws?: number;
    losses?: number;
    goalsFor?: number;
    goalsAgainst?: number;
    players: Player[];
    createdAt: any;
}

interface Player {
    id: string; // Could be auth ID or generated
    name: string;
    number?: number;
    position?: string;
    isCaptain?: boolean;
    avatar?: string;
}

interface TeamsManagerProps {
    tournament: Tournament;
}

export const TeamsManager: React.FC<TeamsManagerProps> = ({ tournament }) => {
    const [teams, setTeams] = useState<Team[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddTeamDialog, setShowAddTeamDialog] = useState(false);
    const [editingTeam, setEditingTeam] = useState<Team | null>(null);

    // Registration Import State
    const [showImportDialog, setShowImportDialog] = useState(false);
    const [importSource, setImportSource] = useState<'individual' | 'club'>('individual');
    const [pendingRegistrations, setPendingRegistrations] = useState<any[]>([]);

    const [formData, setFormData] = useState<Partial<Team>>({
        name: '',
        logo: '',
        captainName: '',
        contactPhone: '',
        group: '',
        players: []
    });

    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [logoPreview, setLogoPreview] = useState<string>('');
    const [logoUploading, setLogoUploading] = useState(false);

    useEffect(() => {
        fetchTeams();
    }, [tournament.id]);

    const fetchTeams = async () => {
        try {
            if (!tournament.id) return;
            const q = query(collection(db, `tournaments/${tournament.id}/teams`));
            const snapshot = await getDocs(q);
            const teamsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Team));
            setTeams(teamsData);
        } catch (error) {
            console.error('Error fetching teams:', error);
            toast.error('فشل في تحميل الفرق');
        } finally {
            setLoading(false);
        }
    };

    const handleLogoFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            if (!file.type.startsWith('image/')) {
                toast.error('يرجى اختيار ملف صورة صالح');
                return;
            }
            setLogoFile(file);
            const reader = new FileReader();
            reader.onload = (e) => {
                setLogoPreview(e.target?.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const uploadLogo = async (): Promise<string | null> => {
        if (!logoFile) return null;
        try {
            setLogoUploading(true);
            const fileName = `tournaments/${tournament.id}/teams/${Date.now()}_${logoFile.name}`;
            const { storageManager } = await import('@/lib/storage');
            const result = await storageManager.upload('tournaments', fileName, logoFile, {
                contentType: logoFile.type
            });
            return result?.publicUrl || null;
        } catch (error) {
            console.error('Error uploading logo:', error);
            return null;
        } finally {
            setLogoUploading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            let logoUrl = formData.logo;
            if (logoFile) {
                const uploadedUrl = await uploadLogo();
                if (uploadedUrl) logoUrl = uploadedUrl;
            }

            const teamData = {
                ...formData,
                logo: logoUrl,
                updatedAt: new Date()
            };

            if (editingTeam) {
                await updateDoc(doc(db, `tournaments/${tournament.id}/teams`, editingTeam.id!), teamData);
                toast.success('تم تحديث الفريق بنجاح');
            } else {
                await addDoc(collection(db, `tournaments/${tournament.id}/teams`), {
                    ...teamData,
                    players: [], // Initialize empty roster
                    createdAt: new Date(),
                    // Initialize stats
                    points: 0,
                    matchesPlayed: 0,
                    wins: 0,
                    draws: 0,
                    losses: 0,
                    goalsFor: 0,
                    goalsAgainst: 0
                });
                toast.success('تم إضافة الفريق بنجاح');
            }

            setShowAddTeamDialog(false);
            resetForm();
            fetchTeams();
        } catch (error) {
            console.error('Error saving team:', error);
            toast.error('فشل في حفظ الفريق');
        }
    };

    const handleDelete = async (teamId: string) => {
        if (confirm('هل أنت متأكد من حذف هذا الفريق؟ سيتم حذف جميع بياناته.')) {
            try {
                await deleteDoc(doc(db, `tournaments/${tournament.id}/teams`, teamId));
                toast.success('تم حذف الفريق');
                fetchTeams();
            } catch (error) {
                toast.error('فشل حذف الفريق');
            }
        }
    };

    const resetForm = () => {
        setFormData({
            name: '',
            logo: '',
            captainName: '',
            contactPhone: '',
            group: '',
        });
        setLogoFile(null);
        setLogoPreview('');
        setEditingTeam(null);
    };

    // --- Import Logic ---
    const fetchPendingRegistrations = async () => {
        try {
            // Fetch registrations for this tournament
            // We look in 'tournamentRegistrations' (new system)
            // We might also need to look in 'tournament_registrations' (old system) if needed, but let's stick to new for now.

            const q = query(
                collection(db, 'tournamentRegistrations'),
                where('tournamentId', '==', tournament.id)
            );

            const snapshot = await getDocs(q);
            const registrations = snapshot.docs.map(doc => {
                const data = doc.data();
                // Try to determine a team name.
                // If it's a club/academy registration, use accountName or clubName
                // If individual, use playerName
                let teamName = data.teamName || data.clubName || data.academyName || data.accountName || data.playerName || 'فريق غير مسمى';

                return {
                    id: doc.id,
                    ...data,
                    displayTeamName: teamName,
                    playerCount: data.players?.length || (data.playerId ? 1 : 0)
                };
            });

            // Filter out registrations that are likely already converted to teams (optional check by name?)
            // For now, just show all. 
            setPendingRegistrations(registrations);
            setShowImportDialog(true);
        } catch (error) {
            console.error("Error fetching registrations:", error);
            toast.error("فشل في جلب قائمة التسجيلات");
        }
    };

    const handleImport = async (registration: any) => {
        try {
            // Convert registration to Team
            // 1. Extract Players
            let players: Player[] = [];
            if (registration.players && Array.isArray(registration.players)) {
                players = registration.players.map((p: any) => ({
                    id: p.id || String(Math.random()),
                    name: p.name || p.playerName || 'لاعب',
                    position: p.position,
                    number: p.number,
                    avatar: p.avatar || p.image
                }));
            } else if (registration.playerId) {
                // Individual registration
                players = [{
                    id: registration.playerId,
                    name: registration.playerName || 'لاعب',
                    position: registration.playerPosition,
                    avatar: registration.playerImage
                }];
            }

            // 2. Create Team Object
            const newTeam: any = {
                name: registration.displayTeamName,
                logo: registration.logo || registration.clubLogo || '', // Try to find a logo
                captainName: registration.contactName || registration.accountName || '',
                contactPhone: registration.contactPhone || registration.accountPhone || registration.playerPhone || '',
                group: '',
                players: players,
                createdAt: new Date(),
                // Stats
                points: 0,
                matchesPlayed: 0,
                wins: 0,
                draws: 0,
                losses: 0,
                goalsFor: 0,
                goalsAgainst: 0,
                originalRegistrationId: registration.id // Link back to registration
            };

            // 3. Save to Firestore
            await addDoc(collection(db, `tournaments/${tournament.id}/teams`), newTeam);

            toast.success(`تم استيراد فريق "${newTeam.name}" بنجاح`);

            // Remove from pending list (client-side only for now)
            setPendingRegistrations(prev => prev.filter(r => r.id !== registration.id));

            // Refresh teams list
            fetchTeams();

        } catch (error) {
            console.error("Error importing team:", error);
            toast.error("فشل في استيراد الفريق");
        }
    };

    return (
        <div className="space-y-6">
            {/* Actions Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <Shield className="h-6 w-6 text-yellow-600" />
                        إدارة الفرق ({teams.length})
                    </h2>
                    <p className="text-gray-500">إدارة الفرق المشاركة وقوائم اللاعبين</p>
                </div>
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        onClick={fetchPendingRegistrations}
                        className="flex items-center gap-2"
                    >
                        <UserPlus className="h-4 w-4" />
                        استيراد من المسجلين
                    </Button>
                    <Button
                        onClick={() => { resetForm(); setShowAddTeamDialog(true); }}
                        className="bg-yellow-600 hover:bg-yellow-700 text-white flex items-center gap-2"
                    >
                        <Plus className="h-4 w-4" />
                        إضافة فريق يدوياً
                    </Button>
                </div>
            </div>

            {/* Teams Grid */}
            {teams.length === 0 ? (
                <Card className="border-dashed border-2">
                    <CardContent className="flex flex-col items-center justify-center py-12">
                        <Shield className="h-16 w-16 text-gray-300 mb-4" />
                        <h3 className="text-lg font-medium text-gray-900">لا توجد فرق مضافة</h3>
                        <p className="text-gray-500 mb-6 text-center max-w-sm">
                            لم يتم إضافة أي فرق للبطولة بعد. يمكنك إضافة فرق يدوياً أو استيرادها من قائمة التسجيلات.
                        </p>
                        <Button onClick={() => setShowAddTeamDialog(true)}>
                            إضافة فريق جديد
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {teams.map((team) => (
                        <Card key={team.id} className="overflow-hidden hover:shadow-md transition-shadow">
                            <CardHeader className="bg-gray-50 pb-4 border-b">
                                <div className="flex justify-between items-start">
                                    <div className="flex items-center gap-3">
                                        {team.logo ? (
                                            <img src={team.logo} alt={team.name} className="w-12 h-12 rounded-full border bg-white object-cover" />
                                        ) : (
                                            <div className="w-12 h-12 rounded-full bg-white border flex items-center justify-center">
                                                <Shield className="h-6 w-6 text-gray-400" />
                                            </div>
                                        )}
                                        <div>
                                            <CardTitle className="text-lg">{team.name}</CardTitle>
                                            {team.group && <Badge variant="secondary" className="mt-1">المجموعة {team.group}</Badge>}
                                        </div>
                                    </div>
                                    <div className="flex gap-1">
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600" onClick={() => { setEditingTeam(team); setFormData(team); setLogoPreview(team.logo || ''); setShowAddTeamDialog(true); }}>
                                            <Edit className="h-4 w-4" />
                                        </Button>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600" onClick={() => handleDelete(team.id!)}>
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="pt-4">
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">عدد اللاعبين:</span>
                                        <span className="font-semibold">{team.players?.length || 0}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">الكابتن:</span>
                                        <span className="font-medium">{team.captainName || 'غير محدد'}</span>
                                    </div>
                                    <div className="mt-4 pt-3 border-t flex justify-between items-center">
                                        <div className="text-xs text-gray-400">تم الإضافة: {new Date(team.createdAt?.toDate?.() || new Date()).toLocaleDateString('ar-EG')}</div>
                                        <Button variant="secondary" size="sm" className="text-xs h-8">
                                            إدارة القائمة
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Add/Edit Team Dialog */}
            <Dialog open={showAddTeamDialog} onOpenChange={setShowAddTeamDialog}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>{editingTeam ? 'تعديل بيانات الفريق' : 'إضافة فريق جديد'}</DialogTitle>
                        <DialogDescription>
                            أدخل بيانات الفريق الأساسية. يمكنك إضافة اللاعبين لاحقاً.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-3">
                            <div className="flex justify-center mb-4">
                                <div className="relative group cursor-pointer" onClick={() => document.getElementById('team-logo-upload')?.click()}>
                                    {logoPreview || formData.logo ? (
                                        <img
                                            src={logoPreview || formData.logo}
                                            alt="Logo"
                                            className="w-24 h-24 rounded-full object-cover border-2 border-dashed border-gray-300 group-hover:border-yellow-500 transition-colors"
                                        />
                                    ) : (
                                        <div className="w-24 h-24 rounded-full bg-gray-100 flex items-center justify-center border-2 border-dashed border-gray-300 group-hover:border-yellow-500 transition-colors">
                                            <ImageIcon className="h-8 w-8 text-gray-400" />
                                        </div>
                                    )}
                                    <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Upload className="h-6 w-6 text-white" />
                                    </div>
                                </div>
                                <Input
                                    id="team-logo-upload"
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={handleLogoFileChange}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="teamName">اسم الفريق *</Label>
                                <Input
                                    id="teamName"
                                    value={formData.name}
                                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                    placeholder="مثال: نسور العلمين"
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-2">
                                    <Label htmlFor="captainName">اسم الكابتن</Label>
                                    <Input
                                        id="captainName"
                                        value={formData.captainName}
                                        onChange={(e) => setFormData(prev => ({ ...prev, captainName: e.target.value }))}
                                        placeholder="اسم قائد الفريق"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="group">المجموعة</Label>
                                    <Input
                                        id="group"
                                        value={formData.group}
                                        onChange={(e) => setFormData(prev => ({ ...prev, group: e.target.value.toUpperCase() }))}
                                        placeholder="A, B, C..."
                                        maxLength={2}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="contactPhone">رقم للتواصل</Label>
                                <Input
                                    id="contactPhone"
                                    value={formData.contactPhone}
                                    onChange={(e) => setFormData(prev => ({ ...prev, contactPhone: e.target.value }))}
                                    placeholder="01xxxxxxxxx"
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 pt-4">
                            <Button type="button" variant="ghost" onClick={() => setShowAddTeamDialog(false)}>إلغاء</Button>
                            <Button type="submit" disabled={logoUploading} className="bg-yellow-600 hover:bg-yellow-700 text-white">
                                {logoUploading ? 'جاري الرفع...' : (editingTeam ? 'حفظ التغييرات' : 'إنشاء الفريق')}
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Import Dialog */}
            <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>استيراد الفرق من التسجيلات</DialogTitle>
                        <DialogDescription>
                            اختر التسجيلات التي تريد تحويلها إلى فرق مشاركة في البطولة.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 mt-4">
                        {pendingRegistrations.length === 0 ? (
                            <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg border border-dashed">
                                لا توجد تسجيلات جديدة متاحة للاستيراد.
                            </div>
                        ) : (
                            pendingRegistrations.map((reg) => (
                                <div key={reg.id} className="flex items-center justify-between p-4 bg-white border rounded-lg hover:shadow-sm">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
                                            {reg.displayTeamName.charAt(0)}
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-sm">{reg.displayTeamName}</h4>
                                            <p className="text-xs text-gray-500">
                                                {reg.playerCount} لاعب • {new Date(reg.registrationDate?.toDate?.() || new Date()).toLocaleDateString('ar-EG')}
                                            </p>
                                        </div>
                                    </div>
                                    <Button size="sm" onClick={() => handleImport(reg)} className="gap-2">
                                        <UserPlus className="h-4 w-4" />
                                        استيراد كفريق
                                    </Button>
                                </div>
                            ))
                        )}
                    </div>

                    <div className="flex justify-end pt-4">
                        <Button variant="outline" onClick={() => setShowImportDialog(false)}>إغلاق</Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};
