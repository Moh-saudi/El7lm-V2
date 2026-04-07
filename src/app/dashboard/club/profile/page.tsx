'use client';
import { useAuth } from '@/lib/firebase/auth-provider';
import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Edit2, Save, X, Users, FileText, Trophy, User, MapPin, Phone, Mail,
  Globe, Facebook, Twitter, Instagram, Calendar, ArrowLeft, School,
  Award, Building2, UserCircle2, Plus, Trash2, Link, MessageCircle,
  CheckCircle2, FileDown, Star, Layers
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase/config';
import { broadcastClubWhatsApp } from '@/lib/notifications/broadcast-dispatcher';

// ─── Types ───────────────────────────────────────────────────────────────────

interface TrophyRecord {
  name: string;
  year: string;
  category: string;
}

interface BoardMember {
  role: string;
  name: string;
  phone: string;
  email: string;
  image: string;
}

interface Player {
  name: string;
  position: string;
  age: string;
  nationality: string;
}

interface ClubData {
  name: string;
  logo: string;
  coverImage: string;
  gallery: string[];
  phone: string;
  whatsapp: string;
  email: string;
  city: string;
  country: string;
  founded: string;
  type: string;
  description: string;
  colors: string;
  current_league: string;
  current_season: string;
  stadium_name: string;
  stadium_capacity: string;
  manager: string;
  address: string;
  website: string;
  facebook: string;
  twitter: string;
  instagram: string;
  tiktok: string;
  stats: {
    players: number;
    contracts: number;
    trophies: number;
    staff: number;
  };
  academies: {
    total: number;
    locations: string[];
  };
  schools: {
    men: number;
    women: number;
    locations: string[];
  };
  trophies: TrophyRecord[];
  current_players: Player[];
  notable_alumni: string[];
  board: BoardMember[];
  isVerified?: boolean;
  isPremium?: boolean;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const emptyBoardMember = (): BoardMember => ({ role: '', name: '', phone: '', email: '', image: '' });
const emptyPlayer = (): Player => ({ name: '', position: '', age: '', nationality: '' });

const BOARD_ROLES = ['رئيس مجلس الإدارة', 'المدير التنفيذي', 'المدير الفني', 'مدير الانتقالات', 'رئيس قطاع الناشئين', 'المدير الإداري'];
const POSITIONS = ['حارس مرمى', 'مدافع', 'وسط', 'جناح', 'مهاجم'];
const CLUB_TYPES = ['دوري أول', 'دوري ثانٍ', 'دوري ثالث', 'هواة', 'ناشئين'];

const REQUIRED_FIELDS_CLUB: { key: keyof ClubData; label: string }[] = [
  { key: 'name',        label: 'اسم النادي' },
  { key: 'country',     label: 'الدولة' },
  { key: 'city',        label: 'المدينة' },
  { key: 'phone',       label: 'رقم الهاتف' },
  { key: 'email',       label: 'البريد الإلكتروني' },
  { key: 'description', label: 'نبذة عن النادي' },
  { key: 'founded',     label: 'سنة التأسيس' },
  { key: 'type',        label: 'نوع النادي' },
];

const initialClubData: ClubData = {
  name: '', logo: '', coverImage: '', gallery: [],
  phone: '', whatsapp: '', email: '', city: '', country: '',
  founded: '', type: '', description: '', colors: '',
  current_league: '', current_season: '', stadium_name: '', stadium_capacity: '',
  manager: '', address: '', website: '',
  facebook: '', twitter: '', instagram: '', tiktok: '',
  stats: { players: 0, contracts: 0, trophies: 0, staff: 0 },
  academies: { total: 0, locations: [] },
  schools: { men: 0, women: 0, locations: [] },
  trophies: [], current_players: [], notable_alumni: [],
  board: [
    { role: 'رئيس مجلس الإدارة', name: '', phone: '', email: '', image: '' },
    { role: 'رئيس قطاع الناشئين', name: '', phone: '', email: '', image: '' },
  ]
};

// ─── Upload Helper ────────────────────────────────────────────────────────────

async function uploadToR2(file: File, uid: string, folder: string): Promise<string> {
  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const filename = `${Date.now()}.${ext}`;
  const formData = new FormData();
  formData.append('file', file);
  formData.append('bucket', 'clubs');
  formData.append('path', `${uid}/${folder}/${filename}`);
  const res = await fetch('/api/storage/upload', { method: 'POST', body: formData });
  if (!res.ok) throw new Error('فشل رفع الصورة');
  const data = await res.json();
  return data.url as string;
}

// ─── Profile Completion ───────────────────────────────────────────────────────

function calcCompletion(d: ClubData): number {
  const checks = [
    !!d.name, !!d.logo, !!d.coverImage, !!d.phone, !!d.email,
    !!d.city, !!d.country, !!d.description, !!d.founded, !!d.type,
    !!d.stadium_name, !!d.current_league, d.trophies.length > 0,
    d.current_players.length > 0, d.board.some(b => !!b.name),
    d.gallery.length > 0,
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ClubProfilePage() {
  const { userData, user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [editMode, setEditMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingField, setUploadingField] = useState<string | null>(null);
  const [clubData, setClubData] = useState<ClubData>(initialClubData);
  const [original, setOriginal] = useState<ClubData>(initialClubData);
  const [isViewingOtherClub, setIsViewingOtherClub] = useState(false);
  const [showResume, setShowResume] = useState(false);
  const [lightboxImg, setLightboxImg] = useState<string | null>(null);
  const [errors, setErrors] = useState<Partial<Record<keyof ClubData, string>>>({});
  const [showCompletionBanner, setShowCompletionBanner] = useState(false);

  // forms
  const [newTrophy, setNewTrophy] = useState<TrophyRecord>({ name: '', year: '', category: '' });
  const [newPlayer, setNewPlayer] = useState<Player>(emptyPlayer());
  const [newAlumni, setNewAlumni] = useState('');

  // ── helpers ──────────────────────────────────────────────────────────────

  const set = (field: keyof ClubData, value: unknown) =>
    setClubData(prev => ({ ...prev, [field]: value }));

  const setStat = (key: keyof ClubData['stats'], value: number) =>
    setClubData(prev => ({ ...prev, stats: { ...prev.stats, [key]: value } }));

  // ── fetch ─────────────────────────────────────────────────────────────────

  const fetchClubData = useCallback(async () => {
    const clubId = searchParams?.get('id');
    const targetId = clubId || user?.id;
    if (!targetId) return;

    const isOther = !!(clubId && clubId !== user?.id);
    setIsViewingOtherClub(isOther);

    try {
      const { data: snap } = await supabase
        .from('clubs')
        .select('*')
        .eq('id', targetId)
        .maybeSingle();

      let data: Record<string, unknown> = {};

      if (snap) {
        data = snap as Record<string, unknown>;
      } else if (!isOther) {
        const basic = {
          ...initialClubData,
          id: targetId,
          name: userData?.name || '',
          email: userData?.email || '',
          phone: userData?.phone || '',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          accountType: 'club'
        };
        await supabase.from('clubs').upsert(basic);
        data = basic;
      } else {
        toast.error('النادي غير موجود');
        router.back();
        return;
      }

      const merged: ClubData = {
        ...initialClubData,
        ...(data as Partial<ClubData>),
        name: (data.name as string) || userData?.name || '',
        email: (data.email as string) || userData?.email || '',
        phone: (data.phone as string) || userData?.phone || '',
        stats: { ...initialClubData.stats, ...((data.stats as ClubData['stats']) || {}) },
        academies: { ...initialClubData.academies, ...((data.academies as ClubData['academies']) || {}) },
        schools: { ...initialClubData.schools, ...((data.schools as ClubData['schools']) || {}) },
        trophies: Array.isArray(data.trophies) ? (data.trophies as TrophyRecord[]) : [],
        current_players: Array.isArray(data.current_players) ? (data.current_players as Player[]) : [],
        notable_alumni: Array.isArray(data.notable_alumni) ? (data.notable_alumni as string[]) : [],
        gallery: Array.isArray(data.gallery) ? (data.gallery as string[]) : [],
        board: Array.isArray(data.board) && (data.board as BoardMember[]).length > 0
          ? (data.board as BoardMember[])
          : initialClubData.board,
      };
      setClubData(merged);
      setOriginal(merged);
    } catch (err) {
      console.error(err);
      toast.error('حدث خطأ أثناء جلب البيانات');
    } finally {
      setLoading(false);
    }
  }, [user, userData, searchParams, router]);

  useEffect(() => { if (user && userData) fetchClubData(); }, [user, userData, fetchClubData]);

  // ── profile completion banner ─────────────────────────────────────────────

  const BANNER_SNOOZE_KEY = `club_profile_banner_snoozed_${user?.id}`;
  const SNOOZE_DAYS = 3;

  const missingFields = REQUIRED_FIELDS_CLUB.filter(({ key }) => {
    const val = clubData[key];
    return !val || (typeof val === 'string' && !val.trim());
  });

  useEffect(() => {
    if (loading || missingFields.length === 0) return;
    const snoozedAt = localStorage.getItem(BANNER_SNOOZE_KEY);
    if (snoozedAt) {
      const daysSince = (Date.now() - Number(snoozedAt)) / (1000 * 60 * 60 * 24);
      if (daysSince < SNOOZE_DAYS) return;
    }
    setShowCompletionBanner(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof ClubData, string>> = {};
    REQUIRED_FIELDS_CLUB.forEach(({ key, label }) => {
      const val = clubData[key];
      if (!val || (typeof val === 'string' && !val.trim())) {
        newErrors[key] = `${label} مطلوب`;
      }
    });
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) {
      toast.error('يرجى استكمال البيانات الأساسية المطلوبة');
      return false;
    }
    return true;
  };

  // ── image upload ──────────────────────────────────────────────────────────

  const handleImageUpload = async (
    file: File,
    type: 'logo' | 'cover' | 'gallery' | `board-${number}`
  ) => {
    if (!user?.id) return;
    if (!file.type.startsWith('image/')) { toast.error('اختر صورة صالحة'); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error('حجم الصورة أكبر من 5 ميجابايت'); return; }

    setUploadingField(type);
    try {
      const folder = type === 'cover' ? 'cover' : type === 'logo' ? 'logo' : type.startsWith('board') ? 'board' : 'gallery';
      const url = await uploadToR2(file, user.id, folder);

      if (type === 'gallery') {
        setClubData(prev => ({ ...prev, gallery: [...prev.gallery, url] }));
      } else if (type.startsWith('board-')) {
        const idx = parseInt(type.split('-')[1]);
        setClubData(prev => {
          const board = [...prev.board];
          board[idx] = { ...board[idx], image: url };
          return { ...prev, board };
        });
      } else if (type === 'cover') {
        set('coverImage', url);
      } else {
        set('logo', url);
      }
      toast.success('تم رفع الصورة');
    } catch {
      toast.error('فشل رفع الصورة');
    } finally {
      setUploadingField(null);
    }
  };

  // ── save ──────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!user?.id) return;
    if (!validateForm()) return;
    setSaving(true);
    try {
      const toSave = {
        ...clubData,
        id: user.id,
        gallery: clubData.gallery.filter(Boolean),
        trophies: clubData.trophies.filter(t => t.name),
        current_players: clubData.current_players.filter(p => p.name),
        notable_alumni: clubData.notable_alumni.filter(Boolean),
        board: clubData.board.filter(b => b.name || b.role),
        stats: {
          players: Number(clubData.stats.players) || 0,
          contracts: Number(clubData.stats.contracts) || 0,
          trophies: Number(clubData.stats.trophies) || 0,
          staff: Number(clubData.stats.staff) || 0,
        },
        updatedAt: new Date().toISOString(),
        accountType: 'club',
      };

      // Check if record exists
      const { data: existing } = await supabase
        .from('clubs')
        .select('id')
        .eq('id', user.id)
        .maybeSingle();

      const isNewClub = !existing;

      if (existing) {
        await supabase.from('clubs').update(toSave).eq('id', user.id);
      } else {
        await supabase.from('clubs').insert({ ...toSave, createdAt: new Date().toISOString() });
      }

      // Also update users table
      try {
        const { data: userRow } = await supabase.from('users').select('id').eq('id', user.id).maybeSingle();
        if (userRow) {
          await supabase.from('users').update({ name: clubData.name, club_name: clubData.name }).eq('id', user.id);
        }
      } catch (_) { /* ignore */ }

      // Broadcast WhatsApp + in-app to all users when a new club joins
      if (isNewClub && clubData.name) {
        broadcastClubWhatsApp({
          clubId: user.id,
          clubName: clubData.name,
          country: clubData.country,
        }).catch(() => {});
      }
      setOriginal(clubData);
      setEditMode(false);
      toast.success('تم حفظ بيانات النادي');
    } catch (err) {
      console.error(err);
      toast.error('حدث خطأ أثناء الحفظ');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => { setClubData(original); setEditMode(false); };

  // ── computed ──────────────────────────────────────────────────────────────

  const completion = calcCompletion(clubData);

  // ─────────────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="w-16 h-16 rounded-full border-4 border-blue-200 animate-spin border-t-blue-600" />
      </div>
    );
  }

  const inpCls = 'w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm bg-white';

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">

      {/* ── Sticky Header ──────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-50 border-b border-gray-200 shadow-sm bg-white/95 backdrop-blur-md">
        <div className="px-4 py-3 mx-auto max-w-5xl">
          <div className="flex justify-between items-center">
            <button onClick={() => router.back()} className="flex gap-2 items-center text-gray-600 hover:text-gray-900">
              <ArrowLeft className="w-5 h-5" />
              <span className="font-medium text-sm">رجوع</span>
            </button>
            <div className="text-center">
              <h1 className="text-lg font-bold text-gray-900">ملف النادي</h1>
              <p className="text-xs text-gray-500">{clubData.name}</p>
            </div>
            <div className="flex gap-2 items-center">
              {!isViewingOtherClub && (
                <button onClick={() => setShowResume(true)}
                  className="flex gap-1 items-center px-3 py-2 text-sm text-white bg-emerald-600 rounded-lg hover:bg-emerald-700">
                  <FileDown className="w-4 h-4" /> PDF
                </button>
              )}
              {!isViewingOtherClub && (
                editMode ? (
                  <div className="flex gap-2">
                    <button onClick={handleCancel} className="flex gap-1 items-center px-3 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200">
                      <X className="w-4 h-4" /> إلغاء
                    </button>
                    <button onClick={handleSave} disabled={saving}
                      className="flex gap-1 items-center px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50">
                      <Save className="w-4 h-4" /> {saving ? 'جاري الحفظ...' : 'حفظ'}
                    </button>
                  </div>
                ) : (
                  <button onClick={() => setEditMode(true)}
                    className="flex gap-1 items-center px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700">
                    <Edit2 className="w-4 h-4" /> تعديل
                  </button>
                )
              )}
              {isViewingOtherClub && <div className="w-20" />}
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 py-8 mx-auto space-y-6 max-w-5xl">

        {/* Completion Banner */}
        {showCompletionBanner && !editMode && (
          <div className="flex gap-4 items-start p-4 mb-6 bg-amber-50 rounded-xl border-2 border-amber-300 shadow-sm">
            <div className="flex-shrink-0 mt-0.5 p-2 bg-amber-100 rounded-full">
              <Award className="w-5 h-5 text-amber-600" />
            </div>
            <div className="flex-1">
              <p className="mb-1 text-sm font-bold text-amber-800">الملف الشخصي غير مكتمل</p>
              <p className="mb-2 text-xs text-amber-700">
                أكمل بياناتك الأساسية لتحسين ظهور ناديك وجذب اللاعبين. الحقول الناقصة:
              </p>
              <div className="flex flex-wrap gap-1.5 mb-3">
                {missingFields.map(({ label }) => (
                  <span key={label} className="px-2 py-0.5 text-xs font-medium text-amber-700 bg-amber-100 rounded-full border border-amber-300">
                    {label}
                  </span>
                ))}
              </div>
              <div className="flex gap-3 items-center">
                <button
                  onClick={() => setEditMode(true)}
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-amber-500 rounded-lg transition hover:bg-amber-600">
                  استكمال البيانات الآن
                </button>
                <span className="text-xs text-amber-500">سيتم تذكيرك مجدداً بعد {SNOOZE_DAYS} أيام عند الإغلاق</span>
              </div>
            </div>
            <button
              onClick={() => {
                localStorage.setItem(BANNER_SNOOZE_KEY, String(Date.now()));
                setShowCompletionBanner(false);
              }}
              title={`تذكيري بعد ${SNOOZE_DAYS} أيام`}
              className="text-amber-400 hover:text-amber-600">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* ── Profile Completion Bar ─────────────────────────────────────── */}
        {!isViewingOtherClub && (
          <div className="p-4 bg-white rounded-xl shadow">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-700">اكتمال الملف الشخصي</span>
              <span className={`text-sm font-bold ${completion >= 80 ? 'text-green-600' : completion >= 50 ? 'text-yellow-600' : 'text-red-500'}`}>
                {completion}%
              </span>
            </div>
            <div className="overflow-hidden h-2 bg-gray-200 rounded-full">
              <div
                className={`h-2 rounded-full transition-all duration-500 ${completion >= 80 ? 'bg-green-500' : completion >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
                style={{ width: `${completion}%` }}
              />
            </div>
          </div>
        )}

        {/* ── Cover + Logo ───────────────────────────────────────────────── */}
        <div className="overflow-hidden rounded-2xl shadow-md">
          <div className="relative h-52 bg-gradient-to-br from-blue-600 to-blue-800">
            {clubData.coverImage ? (
              <img src={clubData.coverImage} alt="غلاف النادي" className="object-cover w-full h-full" />
            ) : (
              <div className="flex items-center justify-center w-full h-full">
                <Building2 className="w-20 h-20 text-blue-400" />
              </div>
            )}
            {editMode && !isViewingOtherClub && (
              <label className="flex absolute inset-0 justify-center items-center transition cursor-pointer bg-black/50 hover:bg-black/60">
                <input type="file" accept="image/*" className="hidden"
                  onChange={e => e.target.files?.[0] && handleImageUpload(e.target.files[0], 'cover')} />
                <div className="flex flex-col items-center gap-2 text-white">
                  <Layers className="w-8 h-8" />
                  <span className="text-sm font-medium">تغيير صورة الغلاف</span>
                </div>
              </label>
            )}
          </div>

          <div className="relative px-6 pb-6 bg-white">
            <div className="flex items-end gap-4 -mt-12">
              <div className="relative flex-shrink-0">
                <div className="w-24 h-24 rounded-2xl overflow-hidden border-4 border-white shadow-lg bg-gray-100">
                  {clubData.logo
                    ? <img src={clubData.logo} alt="شعار النادي" className="object-cover w-full h-full" />
                    : <div className="flex items-center justify-center w-full h-full"><Trophy className="w-10 h-10 text-gray-400" /></div>
                  }
                </div>
                {editMode && !isViewingOtherClub && (
                  <label className="flex absolute inset-0 justify-center items-center rounded-2xl transition cursor-pointer bg-black/50 hover:bg-black/60">
                    <input type="file" accept="image/*" className="hidden"
                      onChange={e => e.target.files?.[0] && handleImageUpload(e.target.files[0], 'logo')} />
                    <Star className="w-5 h-5 text-white" />
                  </label>
                )}
              </div>
              <div className="flex-1 pt-14">
                {editMode ? (
                  <input value={clubData.name} onChange={e => set('name', e.target.value)}
                    className={inpCls + (errors.name ? ' border-red-400' : '')}
                    placeholder="اسم النادي *" />
                ) : (
                  <h2 className="text-2xl font-bold text-gray-900">{clubData.name || 'اسم النادي'}</h2>
                )}
                <p className="text-sm text-gray-500 mt-1 flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  {clubData.city}{clubData.city && clubData.country && '، '}{clubData.country}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Basic Info ─────────────────────────────────────────────────── */}
        <div className="p-6 bg-white rounded-xl shadow">
          <h3 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-500" /> المعلومات الأساسية
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { key: 'email', label: 'البريد الإلكتروني', type: 'email', icon: <Mail className="w-4 h-4" /> },
              { key: 'phone', label: 'الهاتف', type: 'tel', icon: <Phone className="w-4 h-4" /> },
              { key: 'whatsapp', label: 'واتساب', type: 'tel', icon: <Phone className="w-4 h-4" /> },
              { key: 'website', label: 'الموقع الإلكتروني', type: 'url', icon: <Globe className="w-4 h-4" /> },
              { key: 'founded', label: 'سنة التأسيس', type: 'text', icon: <Calendar className="w-4 h-4" /> },
              { key: 'address', label: 'العنوان', type: 'text', icon: <MapPin className="w-4 h-4" /> },
              { key: 'manager', label: 'المدير الفني', type: 'text', icon: <User className="w-4 h-4" /> },
              { key: 'colors', label: 'الألوان الرسمية', type: 'text', icon: <Star className="w-4 h-4" /> },
              { key: 'current_league', label: 'الدوري الحالي', type: 'text', icon: <Trophy className="w-4 h-4" /> },
              { key: 'stadium_name', label: 'اسم الملعب', type: 'text', icon: <Building2 className="w-4 h-4" /> },
              { key: 'stadium_capacity', label: 'سعة الملعب', type: 'text', icon: <Users className="w-4 h-4" /> },
            ].map(({ key, label, type, icon }) => (
              <div key={key}>
                <label className="text-xs font-medium text-gray-500 flex items-center gap-1 mb-1">{icon} {label}</label>
                {editMode ? (
                  <input type={type} value={(clubData as any)[key] || ''} onChange={e => set(key as keyof ClubData, e.target.value)}
                    className={inpCls + ((errors as any)[key] ? ' border-red-400' : '')} placeholder={label} />
                ) : (
                  <p className="text-sm text-gray-800">{(clubData as any)[key] || '—'}</p>
                )}
              </div>
            ))}

            {/* Country & City */}
            <div>
              <label className="text-xs font-medium text-gray-500 flex items-center gap-1 mb-1"><MapPin className="w-4 h-4" /> الدولة</label>
              {editMode ? (
                <input value={clubData.country} onChange={e => set('country', e.target.value)}
                  className={inpCls + (errors.country ? ' border-red-400' : '')} placeholder="الدولة *" />
              ) : (
                <p className="text-sm text-gray-800">{clubData.country || '—'}</p>
              )}
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 flex items-center gap-1 mb-1"><MapPin className="w-4 h-4" /> المدينة</label>
              {editMode ? (
                <input value={clubData.city} onChange={e => set('city', e.target.value)}
                  className={inpCls + (errors.city ? ' border-red-400' : '')} placeholder="المدينة *" />
              ) : (
                <p className="text-sm text-gray-800">{clubData.city || '—'}</p>
              )}
            </div>

            {/* Type */}
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">نوع النادي</label>
              {editMode ? (
                <select value={clubData.type} onChange={e => set('type', e.target.value)}
                  className={inpCls + (errors.type ? ' border-red-400' : '')}>
                  <option value="">اختر النوع</option>
                  {CLUB_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              ) : (
                <p className="text-sm text-gray-800">{clubData.type || '—'}</p>
              )}
            </div>

            {/* Description */}
            <div className="sm:col-span-2">
              <label className="text-xs font-medium text-gray-500 mb-1 block">نبذة عن النادي</label>
              {editMode ? (
                <textarea value={clubData.description} onChange={e => set('description', e.target.value)}
                  rows={4} className={inpCls + (errors.description ? ' border-red-400' : '')} placeholder="نبذة عن النادي *" />
              ) : (
                <p className="text-sm text-gray-800 leading-relaxed">{clubData.description || '—'}</p>
              )}
            </div>
          </div>
        </div>

        {/* ── Social Media ───────────────────────────────────────────────── */}
        <div className="p-6 bg-white rounded-xl shadow">
          <h3 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Link className="w-5 h-5 text-blue-500" /> وسائل التواصل الاجتماعي
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { key: 'facebook', label: 'Facebook', icon: <Facebook className="w-4 h-4 text-blue-600" /> },
              { key: 'twitter', label: 'Twitter / X', icon: <Twitter className="w-4 h-4 text-sky-500" /> },
              { key: 'instagram', label: 'Instagram', icon: <Instagram className="w-4 h-4 text-pink-500" /> },
              { key: 'tiktok', label: 'TikTok', icon: <Star className="w-4 h-4 text-gray-800" /> },
            ].map(({ key, label, icon }) => (
              <div key={key}>
                <label className="text-xs font-medium text-gray-500 flex items-center gap-1 mb-1">{icon} {label}</label>
                {editMode ? (
                  <input type="url" value={(clubData as any)[key] || ''} onChange={e => set(key as keyof ClubData, e.target.value)}
                    className={inpCls} placeholder={`رابط ${label}`} />
                ) : (
                  <p className="text-sm text-gray-800">{(clubData as any)[key] || '—'}</p>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ── Stats ──────────────────────────────────────────────────────── */}
        <div className="p-6 bg-white rounded-xl shadow">
          <h3 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Star className="w-5 h-5 text-blue-500" /> الإحصائيات
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { key: 'players', label: 'اللاعبون' },
              { key: 'contracts', label: 'العقود' },
              { key: 'trophies', label: 'الألقاب' },
              { key: 'staff', label: 'الكادر' },
            ].map(({ key, label }) => (
              <div key={key} className="text-center bg-blue-50 p-3 rounded-xl">
                {editMode ? (
                  <input type="number" value={clubData.stats[key as keyof ClubData['stats']]}
                    onChange={e => setStat(key as keyof ClubData['stats'], Number(e.target.value))}
                    className="w-full text-center text-xl font-bold text-blue-700 bg-transparent border-b border-blue-300 focus:outline-none" min={0} />
                ) : (
                  <p className="text-2xl font-bold text-blue-700">{clubData.stats[key as keyof ClubData['stats']]}</p>
                )}
                <p className="text-xs text-gray-600 mt-1">{label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Trophies ───────────────────────────────────────────────────── */}
        <div className="p-6 bg-white rounded-xl shadow">
          <h3 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-500" /> الألقاب والإنجازات
          </h3>
          {clubData.trophies.length > 0 ? (
            <div className="space-y-2 mb-4">
              {clubData.trophies.map((t, i) => (
                <div key={i} className="flex items-center justify-between bg-amber-50 p-3 rounded-lg">
                  <div>
                    <p className="font-medium text-sm text-amber-900">{t.name}</p>
                    <p className="text-xs text-amber-600">{t.year} — {t.category}</p>
                  </div>
                  {editMode && (
                    <button onClick={() => setClubData(prev => ({ ...prev, trophies: prev.trophies.filter((_, j) => j !== i) }))}
                      className="text-red-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                  )}
                </div>
              ))}
            </div>
          ) : <p className="text-sm text-gray-400 mb-4">لا توجد ألقاب مضافة</p>}
          {editMode && (
            <div className="grid grid-cols-3 gap-2">
              <input value={newTrophy.name} onChange={e => setNewTrophy(p => ({ ...p, name: e.target.value }))}
                className={inpCls} placeholder="اسم اللقب" />
              <input value={newTrophy.year} onChange={e => setNewTrophy(p => ({ ...p, year: e.target.value }))}
                className={inpCls} placeholder="السنة" />
              <div className="flex gap-2">
                <input value={newTrophy.category} onChange={e => setNewTrophy(p => ({ ...p, category: e.target.value }))}
                  className={inpCls} placeholder="الفئة" />
                <button onClick={() => {
                  if (!newTrophy.name) return;
                  setClubData(prev => ({ ...prev, trophies: [...prev.trophies, newTrophy] }));
                  setNewTrophy({ name: '', year: '', category: '' });
                }} className="px-3 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 flex-shrink-0">
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── Gallery ────────────────────────────────────────────────────── */}
        {(editMode || clubData.gallery.length > 0) && (
          <div className="p-6 bg-white rounded-xl shadow">
            <h3 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-blue-500" /> معرض الصور
            </h3>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
              {clubData.gallery.map((img, i) => (
                <div key={i} className="relative aspect-square rounded-lg overflow-hidden cursor-pointer group"
                  onClick={() => setLightboxImg(img)}>
                  <img src={img} alt={`صورة ${i + 1}`} className="object-cover w-full h-full group-hover:scale-105 transition-transform" />
                  {editMode && (
                    <button onClick={e => { e.stopPropagation(); setClubData(prev => ({ ...prev, gallery: prev.gallery.filter((_, j) => j !== i) })); }}
                      className="flex absolute top-1 right-1 justify-center items-center w-6 h-6 text-white bg-red-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              ))}
              {editMode && (
                <label className="flex flex-col gap-1 justify-center items-center rounded-lg border-2 border-dashed cursor-pointer aspect-square border-gray-200 hover:border-blue-400 hover:bg-blue-50 transition-colors">
                  <input type="file" accept="image/*" className="hidden"
                    onChange={e => e.target.files?.[0] && handleImageUpload(e.target.files[0], 'gallery')} />
                  <Plus className="w-6 h-6 text-gray-400" />
                  <span className="text-xs text-gray-400">إضافة</span>
                </label>
              )}
            </div>
          </div>
        )}

      </div>

      {/* Lightbox */}
      {lightboxImg && (
        <div className="flex fixed inset-0 z-50 justify-center items-center bg-black/80" onClick={() => setLightboxImg(null)}>
          <img src={lightboxImg} alt="صورة مكبّرة" className="max-h-[90vh] max-w-[90vw] rounded-xl" />
        </div>
      )}
    </div>
  );
}

