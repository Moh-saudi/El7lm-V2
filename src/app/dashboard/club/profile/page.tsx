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
import { doc, getDoc, updateDoc, setDoc } from 'firebase/firestore';
import { toast } from 'sonner';
import { db } from '@/lib/firebase/config';
import { broadcastClubWhatsApp } from '@/lib/notifications/broadcast-dispatcher';

// ─── Types ───────────────────────────────────────────────────────────────────

interface TrophyRecord {
  name: string;
  year: string;
  category: string;
}

interface BoardMember {
  role: string;   // عنوان المنصب (قابل للتخصيص)
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
  colors: string;            // الألوان الرسمية
  current_league: string;   // الدوري الحالي
  current_season: string;   // الموسم الحالي
  stadium_name: string;     // اسم الملعب
  stadium_capacity: string; // سعة الملعب
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
    const targetId = clubId || user?.uid;
    if (!targetId) return;

    const isOther = !!(clubId && clubId !== user?.uid);
    setIsViewingOtherClub(isOther);

    try {
      const ref = doc(db, 'clubs', targetId);
      const snap = await getDoc(ref);
      let data: Record<string, unknown> = {};

      if (snap.exists()) {
        data = snap.data() as Record<string, unknown>;
      } else if (!isOther) {
        const basic = {
          ...initialClubData,
          name: userData?.name || '',
          email: userData?.email || '',
          phone: userData?.phone || '',
          createdAt: new Date(), updatedAt: new Date(), accountType: 'club'
        };
        await setDoc(ref, basic);
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

  const BANNER_SNOOZE_KEY = `club_profile_banner_snoozed_${user?.uid}`;
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
    if (!user?.uid) return;
    if (!file.type.startsWith('image/')) { toast.error('اختر صورة صالحة'); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error('حجم الصورة أكبر من 5 ميجابايت'); return; }

    setUploadingField(type);
    try {
      const folder = type === 'cover' ? 'cover' : type === 'logo' ? 'logo' : type.startsWith('board') ? 'board' : 'gallery';
      const url = await uploadToR2(file, user.uid, folder);

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
    if (!user?.uid) return;
    if (!validateForm()) return;
    setSaving(true);
    try {
      const toSave = {
        ...clubData,
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
        updatedAt: new Date(), accountType: 'club',
      };
      const ref = doc(db, 'clubs', user.uid);
      const snap = await getDoc(ref);
      const isNewClub = !snap.exists();
      if (snap.exists()) { await updateDoc(ref, toSave); }
      else { await setDoc(ref, { ...toSave, createdAt: new Date() }); }
      try {
        const usersRef = doc(db, 'users', user.uid);
        const usersSnap = await getDoc(usersRef);
        if (usersSnap.exists()) {
          await updateDoc(usersRef, { name: clubData.name, club_name: clubData.name });
        }
      } catch (_) { /* ignore */ }
      // Broadcast WhatsApp + in-app to all users when a new club joins
      if (isNewClub && clubData.name) {
        broadcastClubWhatsApp({
          clubId: user.uid,
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
              <img src={clubData.coverImage} alt="الغلاف" className="object-cover w-full h-full" />
            ) : (
              <div className="flex justify-center items-center h-full">
                <Building2 className="w-16 h-16 text-blue-300 opacity-40" />
              </div>
            )}
            {editMode && (
              <label className="flex absolute inset-0 justify-center items-center transition cursor-pointer bg-black/30 hover:bg-black/50">
                <input type="file" accept="image/*" className="hidden"
                  onChange={e => e.target.files?.[0] && handleImageUpload(e.target.files[0], 'cover')} />
                <span className="px-3 py-1 text-sm font-medium text-white bg-black/40 rounded-lg">
                  {uploadingField === 'cover' ? 'جاري الرفع...' : 'تغيير الغلاف'}
                </span>
              </label>
            )}
          </div>

          <div className="px-6 pb-5 -mt-12 bg-white">
            <div className="flex gap-4 items-end">
              <div className="relative flex-shrink-0">
                <div className="overflow-hidden w-24 h-24 rounded-full border-4 border-white shadow-md bg-gray-100">
                  {clubData.logo
                    ? <img src={clubData.logo} alt="شعار النادي" className="object-cover w-full h-full" />
                    : <div className="flex justify-center items-center w-full h-full"><Building2 className="w-10 h-10 text-gray-300" /></div>
                  }
                </div>
                {editMode && (
                  <label className="flex absolute inset-0 justify-center items-center rounded-full transition cursor-pointer bg-black/40 hover:bg-black/60">
                    <input type="file" accept="image/*" className="hidden"
                      onChange={e => e.target.files?.[0] && handleImageUpload(e.target.files[0], 'logo')} />
                    {uploadingField === 'logo'
                      ? <div className="w-5 h-5 rounded-full border-2 border-white animate-spin border-t-transparent" />
                      : <Edit2 className="w-5 h-5 text-white" />}
                  </label>
                )}
              </div>

              <div className="flex-1 pt-12">
                {editMode
                  ? <div>
                      <input value={clubData.name} onChange={e => { set('name', e.target.value); setErrors(p => ({ ...p, name: '' })); }}
                        className={inpCls + ' text-xl font-bold ' + (errors.name ? 'border-red-400' : 'border-gray-200')} placeholder="اسم النادي" />
                      {errors.name && <p className="mt-0.5 text-xs text-red-500">{errors.name}</p>}
                    </div>
                  : (
                    <div className="flex gap-2 items-center">
                      <h2 className="text-2xl font-bold text-gray-900">{clubData.name || 'اسم النادي'}</h2>
                      {clubData.isVerified && <span title="حساب موثق"><CheckCircle2 className="w-5 h-5 text-blue-500" /></span>}
                      {clubData.isPremium && <span title="عضوية مميزة"><Star className="w-5 h-5 text-yellow-500 fill-yellow-500" /></span>}
                    </div>
                  )
                }
                <div className="flex flex-wrap gap-3 mt-1 text-sm text-gray-500">
                  {(clubData.city || clubData.country) && (
                    <span className="flex gap-1 items-center"><MapPin className="w-4 h-4" />{clubData.city}{clubData.country ? `, ${clubData.country}` : ''}</span>
                  )}
                  {clubData.founded && <span className="flex gap-1 items-center"><Calendar className="w-4 h-4" />تأسس {clubData.founded}</span>}
                  {clubData.colors && <span className="flex gap-1 items-center"><Layers className="w-4 h-4" />{clubData.colors}</span>}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Stats Cards ────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {([
            { key: 'players', label: 'اللاعبون', icon: <Users className="w-6 h-6" />, color: 'from-blue-500 to-blue-700' },
            { key: 'contracts', label: 'العقود', icon: <FileText className="w-6 h-6" />, color: 'from-green-500 to-green-700' },
            { key: 'trophies', label: 'البطولات', icon: <Trophy className="w-6 h-6" />, color: 'from-yellow-500 to-yellow-700' },
            { key: 'staff', label: 'الكادر', icon: <User className="w-6 h-6" />, color: 'from-purple-500 to-purple-700' },
          ] as const).map(({ key, label, icon, color }) => (
            <div key={key} className={`bg-gradient-to-br ${color} rounded-xl p-4 text-white text-center shadow`}>
              <div className="flex justify-center mb-1">{icon}</div>
              {editMode
                ? <input type="number" value={clubData.stats[key]} min={0}
                    onChange={e => setStat(key, parseInt(e.target.value) || 0)}
                    className="w-16 text-center text-2xl font-bold bg-white/20 rounded border border-white/40 text-white focus:outline-none" />
                : <div className="text-2xl font-bold">{clubData.stats[key]}</div>
              }
              <div className="mt-1 text-sm opacity-90">{label}</div>
            </div>
          ))}
        </div>

        {/* ── League & Stadium ───────────────────────────────────────────── */}
        <div className="p-6 bg-white rounded-xl shadow">
          <h3 className="flex gap-2 items-center mb-4 text-base font-bold text-gray-800">
            <Trophy className="w-5 h-5 text-blue-600" /> الدوري والملعب
          </h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {[
              { field: 'current_league' as const, label: 'الدوري الحالي' },
              { field: 'current_season' as const, label: 'الموسم' },
              { field: 'stadium_name' as const, label: 'اسم الملعب' },
              { field: 'stadium_capacity' as const, label: 'سعة الملعب' },
              { field: 'colors' as const, label: 'الألوان الرسمية' },
              { field: 'manager' as const, label: 'المدير الفني' },
            ].map(({ field, label }) => (
              <div key={field}>
                <label className="block mb-1 text-xs font-medium text-gray-500">{label}</label>
                {editMode
                  ? <input type="text" value={clubData[field] as string || ''} onChange={e => set(field, e.target.value)} className={inpCls} placeholder={label} />
                  : <p className="text-gray-800">{(clubData[field] as string) || '—'}</p>
                }
              </div>
            ))}
          </div>
        </div>

        {/* ── Basic Info ─────────────────────────────────────────────────── */}
        <div className="p-6 bg-white rounded-xl shadow">
          <h3 className="mb-4 text-base font-bold text-gray-800">المعلومات الأساسية</h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {[
              { field: 'type' as const, label: 'نوع النادي', isSelect: true },
              { field: 'founded' as const, label: 'سنة التأسيس', isSelect: false },
              { field: 'city' as const, label: 'المدينة', isSelect: false },
              { field: 'country' as const, label: 'الدولة', isSelect: false },
              { field: 'address' as const, label: 'العنوان', isSelect: false },
            ].map(({ field, label, isSelect }) => (
              <div key={field}>
                <label className="block mb-1 text-xs font-medium text-gray-500">{label}</label>
                {editMode
                  ? isSelect
                    ? <>
                        <select value={clubData[field] as string} onChange={e => { set(field, e.target.value); setErrors(p => ({ ...p, [field]: '' })); }}
                          className={inpCls + (errors[field] ? ' border-red-400' : '')}>
                          <option value="">اختر...</option>
                          {CLUB_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                        {errors[field] && <p className="mt-0.5 text-xs text-red-500">{errors[field]}</p>}
                      </>
                    : <>
                        <input type="text" value={clubData[field] as string || ''} onChange={e => { set(field, e.target.value); setErrors(p => ({ ...p, [field]: '' })); }}
                          className={inpCls + (errors[field] ? ' border-red-400' : '')} placeholder={label} />
                        {errors[field] && <p className="mt-0.5 text-xs text-red-500">{errors[field]}</p>}
                      </>
                  : <p className="text-gray-800">{(clubData[field] as string) || '—'}</p>
                }
              </div>
            ))}
          </div>
          <div className="mt-4">
            <label className="block mb-1 text-xs font-medium text-gray-500">نبذة عن النادي</label>
            {editMode
              ? <>
                  <textarea value={clubData.description} onChange={e => { set('description', e.target.value); setErrors(p => ({ ...p, description: '' })); }} rows={3}
                    className={inpCls + (errors.description ? ' border-red-400' : '')} placeholder="تاريخ النادي وأهدافه..." />
                  {errors.description && <p className="mt-0.5 text-xs text-red-500">{errors.description}</p>}
                </>
              : <p className="text-gray-800 whitespace-pre-wrap">{clubData.description || '—'}</p>
            }
          </div>
        </div>

        {/* ── Academies & Schools ─────────────────────────────────────────── */}
        <div className="p-6 bg-white rounded-xl shadow">
          <h3 className="flex gap-2 items-center mb-4 text-base font-bold text-gray-800">
            <School className="w-5 h-5 text-blue-600" /> الأكاديميات والمدارس
          </h3>
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'الأكاديميات', val: clubData.academies.total, setter: (v: number) => setClubData(p => ({ ...p, academies: { ...p.academies, total: v } })) },
              { label: 'مدارس رجال', val: clubData.schools.men, setter: (v: number) => setClubData(p => ({ ...p, schools: { ...p.schools, men: v } })) },
              { label: 'مدارس سيدات', val: clubData.schools.women, setter: (v: number) => setClubData(p => ({ ...p, schools: { ...p.schools, women: v } })) },
            ].map(({ label, val, setter }) => (
              <div key={label} className="text-center">
                <label className="block mb-1 text-xs font-medium text-gray-500">{label}</label>
                {editMode
                  ? <input type="number" value={val} min={0} onChange={e => setter(parseInt(e.target.value) || 0)} className={inpCls + ' text-center'} />
                  : <p className="text-2xl font-bold text-blue-600">{val}</p>
                }
              </div>
            ))}
          </div>
        </div>

        {/* ── Trophies ───────────────────────────────────────────────────── */}
        <div className="p-6 bg-white rounded-xl shadow">
          <h3 className="flex gap-2 items-center mb-4 text-base font-bold text-gray-800">
            <Award className="w-5 h-5 text-yellow-600" /> البطولات والألقاب
          </h3>
          <div className="space-y-2">
            {clubData.trophies.map((t, i) => (
              <div key={i} className="flex gap-2 items-center p-2 bg-yellow-50 rounded-lg">
                <Trophy className="flex-shrink-0 w-4 h-4 text-yellow-600" />
                <span className="flex-1 text-sm font-medium">{t.name}</span>
                {t.year && <span className="text-xs text-gray-500">{t.year}</span>}
                {t.category && <span className="text-xs text-gray-400 hidden sm:inline"> · {t.category}</span>}
                {editMode && (
                  <button onClick={() => setClubData(prev => ({ ...prev, trophies: prev.trophies.filter((_, j) => j !== i) }))}
                    className="text-red-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                )}
              </div>
            ))}
            {clubData.trophies.length === 0 && !editMode && (
              <p className="py-3 text-sm text-center text-gray-400">لا توجد بطولات مسجّلة</p>
            )}
            {editMode && (
              <div className="flex gap-2 pt-2">
                <input value={newTrophy.name} onChange={e => setNewTrophy(p => ({ ...p, name: e.target.value }))}
                  className={inpCls} placeholder="اسم البطولة" />
                <input value={newTrophy.year} onChange={e => setNewTrophy(p => ({ ...p, year: e.target.value }))}
                  className={inpCls} placeholder="السنة" style={{ maxWidth: 80 }} />
                <input value={newTrophy.category} onChange={e => setNewTrophy(p => ({ ...p, category: e.target.value }))}
                  className={inpCls} placeholder="الفئة" style={{ maxWidth: 100 }} />
                <button onClick={() => {
                  if (!newTrophy.name) return;
                  setClubData(prev => ({ ...prev, trophies: [...prev.trophies, { ...newTrophy }] }));
                  setNewTrophy({ name: '', year: '', category: '' });
                }} className="flex-shrink-0 p-2 text-white bg-yellow-500 rounded-lg hover:bg-yellow-600">
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ── Current Players ─────────────────────────────────────────────── */}
        <div className="p-6 bg-white rounded-xl shadow">
          <h3 className="flex gap-2 items-center mb-4 text-base font-bold text-gray-800">
            <Users className="w-5 h-5 text-blue-600" /> اللاعبون الحاليون
          </h3>
          {clubData.current_players.length > 0 && (
            <div className="overflow-x-auto mb-3">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs font-medium text-gray-500 border-b">
                    <th className="pb-2 text-right">الاسم</th>
                    <th className="pb-2 text-right">المركز</th>
                    <th className="pb-2 text-right">العمر</th>
                    <th className="pb-2 text-right">الجنسية</th>
                    {editMode && <th />}
                  </tr>
                </thead>
                <tbody>
                  {clubData.current_players.map((p, i) => (
                    <tr key={i} className="border-b border-gray-50">
                      <td className="py-2 font-medium">{editMode
                        ? <input value={p.name} onChange={e => { const arr = [...clubData.current_players]; arr[i] = { ...arr[i], name: e.target.value }; set('current_players', arr); }} className={inpCls} />
                        : p.name}
                      </td>
                      <td className="py-2">{editMode
                        ? <select value={p.position} onChange={e => { const arr = [...clubData.current_players]; arr[i] = { ...arr[i], position: e.target.value }; set('current_players', arr); }} className={inpCls}>
                            <option value="">—</option>
                            {POSITIONS.map(pos => <option key={pos} value={pos}>{pos}</option>)}
                          </select>
                        : p.position}
                      </td>
                      <td className="py-2">{editMode
                        ? <input value={p.age} onChange={e => { const arr = [...clubData.current_players]; arr[i] = { ...arr[i], age: e.target.value }; set('current_players', arr); }} className={inpCls} style={{ maxWidth: 60 }} />
                        : p.age}
                      </td>
                      <td className="py-2">{editMode
                        ? <input value={p.nationality} onChange={e => { const arr = [...clubData.current_players]; arr[i] = { ...arr[i], nationality: e.target.value }; set('current_players', arr); }} className={inpCls} />
                        : p.nationality}
                      </td>
                      {editMode && (
                        <td className="py-2">
                          <button onClick={() => setClubData(prev => ({ ...prev, current_players: prev.current_players.filter((_, j) => j !== i) }))}
                            className="text-red-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {clubData.current_players.length === 0 && !editMode && (
            <p className="py-3 text-sm text-center text-gray-400">لا يوجد لاعبون مسجّلون</p>
          )}
          {editMode && (
            <div className="flex flex-wrap gap-2 pt-2">
              <input value={newPlayer.name} onChange={e => setNewPlayer(p => ({ ...p, name: e.target.value }))} className={inpCls} placeholder="الاسم" />
              <select value={newPlayer.position} onChange={e => setNewPlayer(p => ({ ...p, position: e.target.value }))} className={inpCls} style={{ maxWidth: 130 }}>
                <option value="">المركز</option>
                {POSITIONS.map(pos => <option key={pos} value={pos}>{pos}</option>)}
              </select>
              <input value={newPlayer.age} onChange={e => setNewPlayer(p => ({ ...p, age: e.target.value }))} className={inpCls} placeholder="العمر" style={{ maxWidth: 70 }} />
              <input value={newPlayer.nationality} onChange={e => setNewPlayer(p => ({ ...p, nationality: e.target.value }))} className={inpCls} placeholder="الجنسية" style={{ maxWidth: 110 }} />
              <button onClick={() => {
                if (!newPlayer.name) return;
                setClubData(prev => ({ ...prev, current_players: [...prev.current_players, { ...newPlayer }] }));
                setNewPlayer(emptyPlayer());
              }} className="flex-shrink-0 p-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700">
                <Plus className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* ── Notable Alumni ──────────────────────────────────────────────── */}
        <div className="p-6 bg-white rounded-xl shadow">
          <h3 className="flex gap-2 items-center mb-4 text-base font-bold text-gray-800">
            <Star className="w-5 h-5 text-yellow-500" /> لاعبون بارزون (خريجو النادي)
          </h3>
          <div className="flex flex-wrap gap-2">
            {clubData.notable_alumni.map((name, i) => (
              <span key={i} className="flex gap-1 items-center px-3 py-1 text-sm text-yellow-800 bg-yellow-50 rounded-full border border-yellow-200">
                {name}
                {editMode && (
                  <button onClick={() => setClubData(prev => ({ ...prev, notable_alumni: prev.notable_alumni.filter((_, j) => j !== i) }))}
                    className="ml-1 text-yellow-500 hover:text-red-500"><X className="w-3 h-3" /></button>
                )}
              </span>
            ))}
            {clubData.notable_alumni.length === 0 && !editMode && (
              <p className="text-sm text-gray-400">لم يُسجَّل لاعبون بارزون</p>
            )}
          </div>
          {editMode && (
            <div className="flex gap-2 mt-3">
              <input value={newAlumni} onChange={e => setNewAlumni(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && newAlumni.trim()) { setClubData(prev => ({ ...prev, notable_alumni: [...prev.notable_alumni, newAlumni.trim()] })); setNewAlumni(''); } }}
                className={inpCls} placeholder="اسم اللاعب" />
              <button onClick={() => {
                if (!newAlumni.trim()) return;
                setClubData(prev => ({ ...prev, notable_alumni: [...prev.notable_alumni, newAlumni.trim()] }));
                setNewAlumni('');
              }} className="flex-shrink-0 p-2 text-white bg-yellow-500 rounded-lg hover:bg-yellow-600">
                <Plus className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* ── Board ──────────────────────────────────────────────────────── */}
        <div className="p-6 bg-white rounded-xl shadow">
          <div className="flex justify-between items-center mb-4">
            <h3 className="flex gap-2 items-center text-base font-bold text-gray-800">
              <UserCircle2 className="w-5 h-5 text-blue-600" /> مجلس الإدارة والكادر الفني
            </h3>
            {editMode && (
              <button onClick={() => setClubData(prev => ({ ...prev, board: [...prev.board, emptyBoardMember()] }))}
                className="flex gap-1 items-center px-3 py-1 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700">
                <Plus className="w-4 h-4" /> إضافة
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {clubData.board.map((member, i) => (
              <div key={i} className="flex gap-3 items-start p-4 rounded-xl border border-gray-100">
                <div className="relative flex-shrink-0">
                  <div className="overflow-hidden w-16 h-16 rounded-full border-2 border-gray-200 bg-gray-100">
                    {member.image
                      ? <img src={member.image} alt={member.name} className="object-cover w-full h-full" />
                      : <div className="flex justify-center items-center w-full h-full"><User className="w-7 h-7 text-gray-300" /></div>
                    }
                  </div>
                  {editMode && (
                    <label className="flex absolute inset-0 justify-center items-center rounded-full transition cursor-pointer bg-black/40 hover:bg-black/60">
                      <input type="file" accept="image/*" className="hidden"
                        onChange={e => e.target.files?.[0] && handleImageUpload(e.target.files[0], `board-${i}`)} />
                      {uploadingField === `board-${i}`
                        ? <div className="w-4 h-4 rounded-full border-2 border-white animate-spin border-t-transparent" />
                        : <Edit2 className="w-4 h-4 text-white" />}
                    </label>
                  )}
                </div>
                <div className="flex-1 min-w-0 space-y-1">
                  {editMode ? (
                    <>
                      <select value={member.role}
                        onChange={e => { const b = [...clubData.board]; b[i] = { ...b[i], role: e.target.value }; set('board', b); }}
                        className={inpCls + ' text-xs'}>
                        <option value="">المنصب</option>
                        {BOARD_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                      </select>
                      <input value={member.name}
                        onChange={e => { const b = [...clubData.board]; b[i] = { ...b[i], name: e.target.value }; set('board', b); }}
                        className={inpCls} placeholder="الاسم" />
                      <input value={member.phone}
                        onChange={e => { const b = [...clubData.board]; b[i] = { ...b[i], phone: e.target.value }; set('board', b); }}
                        className={inpCls} placeholder="الهاتف" />
                      <input value={member.email}
                        onChange={e => { const b = [...clubData.board]; b[i] = { ...b[i], email: e.target.value }; set('board', b); }}
                        className={inpCls} placeholder="البريد" />
                      <button onClick={() => setClubData(prev => ({ ...prev, board: prev.board.filter((_, j) => j !== i) }))}
                        className="flex gap-1 items-center text-xs text-red-500 hover:text-red-700">
                        <Trash2 className="w-3 h-3" /> حذف
                      </button>
                    </>
                  ) : (
                    <>
                      <p className="text-xs font-semibold text-blue-600">{member.role || '—'}</p>
                      <p className="font-bold text-gray-900 truncate">{member.name || '—'}</p>
                      {member.phone && <p className="flex gap-1 items-center text-xs text-gray-500"><Phone className="w-3 h-3" />{member.phone}</p>}
                      {member.email && <p className="flex gap-1 items-center text-xs text-gray-500"><Mail className="w-3 h-3" />{member.email}</p>}
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Contact ────────────────────────────────────────────────────── */}
        <div className="p-6 bg-white rounded-xl shadow">
          <h3 className="mb-4 text-base font-bold text-gray-800">معلومات التواصل</h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {([
              { field: 'phone', label: 'الهاتف', icon: <Phone className="w-4 h-4" />, type: 'tel' },
              { field: 'whatsapp', label: 'واتساب', icon: <MessageCircle className="w-4 h-4" />, type: 'tel' },
              { field: 'email', label: 'البريد الإلكتروني', icon: <Mail className="w-4 h-4" />, type: 'email' },
              { field: 'website', label: 'الموقع الإلكتروني', icon: <Globe className="w-4 h-4" />, type: 'url' },
              { field: 'facebook', label: 'Facebook', icon: <Facebook className="w-4 h-4" />, type: 'url' },
              { field: 'twitter', label: 'Twitter / X', icon: <Twitter className="w-4 h-4" />, type: 'url' },
              { field: 'instagram', label: 'Instagram', icon: <Instagram className="w-4 h-4" />, type: 'url' },
              { field: 'tiktok', label: 'TikTok', icon: <Link className="w-4 h-4" />, type: 'url' },
            ] as const).map(({ field, label, icon, type }) => (
              <div key={field}>
                <label className="flex gap-1 items-center mb-1 text-xs font-medium text-gray-500">{icon}{label}</label>
                {editMode
                  ? <>
                      <input type={type} value={(clubData[field as keyof ClubData] as string) || ''}
                        onChange={e => { set(field as keyof ClubData, e.target.value); setErrors(p => ({ ...p, [field]: '' })); }}
                        className={inpCls + (errors[field as keyof ClubData] ? ' border-red-400' : '')} placeholder={label} />
                      {errors[field as keyof ClubData] && <p className="mt-0.5 text-xs text-red-500">{errors[field as keyof ClubData]}</p>}
                    </>
                  : <p className="text-gray-800">{(clubData[field as keyof ClubData] as string) || '—'}</p>
                }
              </div>
            ))}
          </div>
        </div>

        {/* ── Gallery ────────────────────────────────────────────────────── */}
        <div className="p-6 bg-white rounded-xl shadow">
          <h3 className="flex gap-2 items-center mb-4 text-base font-bold text-gray-800">
            <Building2 className="w-5 h-5 text-blue-600" /> معرض الصور
          </h3>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {clubData.gallery.map((img, i) => (
              <div key={i} onClick={() => !editMode && setLightboxImg(img)}
                className="overflow-hidden relative rounded-lg shadow cursor-pointer aspect-square hover:opacity-90">
                <img src={img} alt={`صورة ${i + 1}`} className="object-cover w-full h-full" />
                {editMode && (
                  <button onClick={e => { e.stopPropagation(); setClubData(prev => ({ ...prev, gallery: prev.gallery.filter((_, j) => j !== i) })); }}
                    className="flex absolute top-1 left-1 justify-center items-center w-6 h-6 text-white bg-red-500 rounded-full shadow hover:bg-red-600">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
            {editMode && (
              <label className="flex flex-col gap-1 justify-center items-center rounded-lg border-2 border-blue-300 border-dashed transition cursor-pointer aspect-square hover:bg-blue-50">
                <input type="file" accept="image/*" className="hidden"
                  onChange={e => e.target.files?.[0] && handleImageUpload(e.target.files[0], 'gallery')} />
                {uploadingField === 'gallery'
                  ? <div className="w-6 h-6 rounded-full border-2 border-blue-400 animate-spin border-t-transparent" />
                  : <Plus className="w-6 h-6 text-blue-400" />}
                <span className="text-xs text-blue-400">إضافة صورة</span>
              </label>
            )}
          </div>
          {clubData.gallery.length === 0 && !editMode && (
            <p className="py-4 text-sm text-center text-gray-400">لا توجد صور في المعرض</p>
          )}
        </div>

      </div>

      {/* ── Lightbox ─────────────────────────────────────────────────────── */}
      {lightboxImg && (
        <div className="flex fixed inset-0 z-[100] justify-center items-center bg-black/80"
          onClick={() => setLightboxImg(null)}>
          <img src={lightboxImg} alt="عرض الصورة" className="object-contain max-w-full max-h-full rounded-xl shadow-2xl" style={{ maxWidth: '90vw', maxHeight: '90vh' }} />
          <button onClick={() => setLightboxImg(null)}
            className="flex absolute top-4 left-4 justify-center items-center w-10 h-10 text-white bg-white/20 rounded-full hover:bg-white/40">
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* ── PDF Resume Modal ─────────────────────────────────────────────── */}
      {showResume && (
        <ClubResume clubData={clubData} onClose={() => setShowResume(false)} />
      )}

    </div>
  );
}

// ─── Club Resume PDF ──────────────────────────────────────────────────────────

function ClubResume({ clubData, onClose }: { clubData: ClubData; onClose: () => void }) {
  const [generating, setGenerating] = useState(false);

  const handleDownload = async () => {
    setGenerating(true);
    try {
      const { default: html2canvas } = await import('html2canvas');
      const { default: jsPDF } = await import('jspdf');
      const el = document.getElementById('club-resume-content');
      if (!el) return;
      const canvas = await html2canvas(el, { scale: 2, useCORS: true, backgroundColor: '#fff' });
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const w = pdf.internal.pageSize.getWidth();
      const h = (canvas.height * w) / canvas.width;
      if (h > pdf.internal.pageSize.getHeight()) {
        const pages = Math.ceil(h / pdf.internal.pageSize.getHeight());
        for (let i = 0; i < pages; i++) {
          if (i > 0) pdf.addPage();
          const srcY = i * (canvas.height / pages);
          const srcH = canvas.height / pages;
          const pageCanvas = document.createElement('canvas');
          pageCanvas.width = canvas.width;
          pageCanvas.height = srcH;
          const ctx = pageCanvas.getContext('2d');
          ctx?.drawImage(canvas, 0, -srcY);
          pdf.addImage(pageCanvas.toDataURL('image/jpeg', 0.95), 'JPEG', 0, 0, w, pdf.internal.pageSize.getHeight());
        }
      } else {
        pdf.addImage(canvas.toDataURL('image/jpeg', 0.95), 'JPEG', 0, 0, w, h);
      }
      pdf.save(`${clubData.name || 'club'}-profile.pdf`);
    } catch (e) {
      console.error(e);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="flex fixed inset-0 z-[200] flex-col bg-black/60" dir="rtl">
      {/* toolbar */}
      <div className="flex flex-shrink-0 gap-3 justify-between items-center px-6 py-3 bg-gray-900">
        <span className="font-bold text-white">ملف النادي — PDF</span>
        <div className="flex gap-2">
          <button onClick={() => window.print()}
            className="px-4 py-2 text-sm text-gray-200 bg-gray-700 rounded-lg hover:bg-gray-600">طباعة</button>
          <button onClick={handleDownload} disabled={generating}
            className="flex gap-1 items-center px-4 py-2 text-sm text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-50">
            <FileDown className="w-4 h-4" />{generating ? 'جاري التحميل...' : 'تحميل PDF'}
          </button>
          <button onClick={onClose}
            className="flex gap-1 items-center px-4 py-2 text-sm text-white bg-red-600 rounded-lg hover:bg-red-700">
            <X className="w-4 h-4" />إغلاق
          </button>
        </div>
      </div>

      {/* content */}
      <div className="overflow-y-auto flex-1 p-8 bg-gray-100">
        <div id="club-resume-content" className="mx-auto bg-white shadow-xl" style={{ width: '210mm', minHeight: '297mm', fontFamily: 'Cairo, Arial, sans-serif' }}>

          {/* header */}
          <div className="p-8 text-white" style={{ background: 'linear-gradient(135deg,#1d4ed8,#1e40af)' }}>
            <div className="flex gap-6 items-center">
              {clubData.logo && <img src={clubData.logo} alt="شعار" className="object-cover w-24 h-24 rounded-full border-4 border-white/40 shadow-lg" />}
              <div>
                <h1 className="text-3xl font-bold">{clubData.name}</h1>
                <p className="mt-1 text-blue-200">{clubData.type} · {clubData.city}{clubData.country ? `, ${clubData.country}` : ''}</p>
                {clubData.founded && <p className="text-sm text-blue-300">تأسس {clubData.founded}</p>}
              </div>
            </div>
          </div>

          {/* stats */}
          <div className="grid grid-cols-4 gap-0 border-b">
            {[
              { label: 'اللاعبون', val: clubData.stats.players },
              { label: 'العقود', val: clubData.stats.contracts },
              { label: 'البطولات', val: clubData.stats.trophies },
              { label: 'الكادر', val: clubData.stats.staff },
            ].map(({ label, val }) => (
              <div key={label} className="p-4 text-center border-l last:border-0">
                <div className="text-2xl font-bold text-blue-700">{val}</div>
                <div className="text-xs text-gray-500">{label}</div>
              </div>
            ))}
          </div>

          <div className="p-8 space-y-6">
            {/* league & stadium */}
            {(clubData.current_league || clubData.stadium_name) && (
              <section>
                <h2 className="pb-1 mb-3 text-lg font-bold text-blue-800 border-b border-blue-100">الدوري والملعب</h2>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  {clubData.current_league && <div><span className="font-medium text-gray-500">الدوري: </span>{clubData.current_league} {clubData.current_season && `· ${clubData.current_season}`}</div>}
                  {clubData.stadium_name && <div><span className="font-medium text-gray-500">الملعب: </span>{clubData.stadium_name} {clubData.stadium_capacity && `(${clubData.stadium_capacity})`}</div>}
                  {clubData.colors && <div><span className="font-medium text-gray-500">الألوان: </span>{clubData.colors}</div>}
                  {clubData.manager && <div><span className="font-medium text-gray-500">المدير الفني: </span>{clubData.manager}</div>}
                </div>
              </section>
            )}

            {/* description */}
            {clubData.description && (
              <section>
                <h2 className="pb-1 mb-3 text-lg font-bold text-blue-800 border-b border-blue-100">نبذة عن النادي</h2>
                <p className="text-sm leading-relaxed text-gray-700">{clubData.description}</p>
              </section>
            )}

            {/* trophies */}
            {clubData.trophies.length > 0 && (
              <section>
                <h2 className="pb-1 mb-3 text-lg font-bold text-blue-800 border-b border-blue-100">البطولات</h2>
                <div className="grid grid-cols-2 gap-2">
                  {clubData.trophies.map((t, i) => (
                    <div key={i} className="flex gap-2 items-center p-2 rounded-lg bg-yellow-50">
                      <Trophy className="w-4 h-4 text-yellow-600 flex-shrink-0" />
                      <span className="text-sm font-medium">{t.name}</span>
                      {t.year && <span className="text-xs text-gray-500 mr-auto">{t.year}</span>}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* players */}
            {clubData.current_players.length > 0 && (
              <section>
                <h2 className="pb-1 mb-3 text-lg font-bold text-blue-800 border-b border-blue-100">اللاعبون الحاليون</h2>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-gray-500 border-b">
                      <th className="pb-1 text-right font-medium">الاسم</th>
                      <th className="pb-1 text-right font-medium">المركز</th>
                      <th className="pb-1 text-right font-medium">العمر</th>
                      <th className="pb-1 text-right font-medium">الجنسية</th>
                    </tr>
                  </thead>
                  <tbody>
                    {clubData.current_players.map((p, i) => (
                      <tr key={i} className="border-b border-gray-50">
                        <td className="py-1 font-medium">{p.name}</td>
                        <td className="py-1">{p.position}</td>
                        <td className="py-1">{p.age}</td>
                        <td className="py-1">{p.nationality}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            )}

            {/* alumni */}
            {clubData.notable_alumni.length > 0 && (
              <section>
                <h2 className="pb-1 mb-3 text-lg font-bold text-blue-800 border-b border-blue-100">لاعبون بارزون</h2>
                <div className="flex flex-wrap gap-2">
                  {clubData.notable_alumni.map((n, i) => (
                    <span key={i} className="px-3 py-1 text-sm text-yellow-800 bg-yellow-50 rounded-full border border-yellow-200">{n}</span>
                  ))}
                </div>
              </section>
            )}

            {/* board */}
            {clubData.board.some(b => b.name) && (
              <section>
                <h2 className="pb-1 mb-3 text-lg font-bold text-blue-800 border-b border-blue-100">مجلس الإدارة</h2>
                <div className="grid grid-cols-2 gap-3">
                  {clubData.board.filter(b => b.name).map((m, i) => (
                    <div key={i} className="p-3 rounded-lg bg-gray-50">
                      <p className="text-xs font-semibold text-blue-600">{m.role}</p>
                      <p className="font-bold">{m.name}</p>
                      {m.phone && <p className="text-xs text-gray-500">{m.phone}</p>}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* contact */}
            <section>
              <h2 className="pb-1 mb-3 text-lg font-bold text-blue-800 border-b border-blue-100">التواصل</h2>
              <div className="grid grid-cols-2 gap-2 text-sm">
                {clubData.phone && <p><span className="font-medium text-gray-500">هاتف: </span>{clubData.phone}</p>}
                {clubData.email && <p><span className="font-medium text-gray-500">بريد: </span>{clubData.email}</p>}
                {clubData.website && <p><span className="font-medium text-gray-500">موقع: </span>{clubData.website}</p>}
                {clubData.address && <p><span className="font-medium text-gray-500">عنوان: </span>{clubData.address}</p>}
              </div>
            </section>

            {/* gallery strip */}
            {clubData.gallery.length > 0 && (
              <section>
                <h2 className="pb-1 mb-3 text-lg font-bold text-blue-800 border-b border-blue-100">معرض الصور</h2>
                <div className="flex overflow-hidden gap-2">
                  {clubData.gallery.slice(0, 6).map((img, i) => (
                    <img key={i} src={img} alt="" className="object-cover w-24 h-24 rounded-lg" />
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* footer */}
          <div className="px-8 py-4 text-xs text-center text-gray-400 bg-gray-50 border-t">
            تم إنشاء هذا الملف عبر منصة إل7لم · el7lm.com
          </div>
        </div>
      </div>
    </div>
  );
}
