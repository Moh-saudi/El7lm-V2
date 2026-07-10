'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/lib/firebase/auth-provider';
import { supabase } from '@/lib/supabase/config';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  MapPin,
  Star,
  MessageSquare,
  UserPlus,
  UserCheck,
  Building,
  Briefcase,
  Eye,
  Mail,
  Phone,
  Globe,
  Award,
  Target,
  Trophy,
  CheckCircle,
  Loader2,
  Sparkles,
  User,
  Users,
  Calendar,
  Languages,
  Share2
} from 'lucide-react';
import { fixReceiptUrl } from '@/lib/utils/cloudflare-r2-utils';
import { useTranslation } from '@/lib/i18n';

// أنواع البيانات
interface EntityProfile {
  id: string;
  name: string;
  type: 'club' | 'agent' | 'scout' | 'academy' | 'sponsor' | 'trainer';
  email: string;
  phone?: string;
  website?: string;
  profileImage?: string;
  coverImage?: string;
  location: {
    country: string;
    city: string;
    address?: string;
  };
  description: string;
  specialization?: string;
  verified: boolean;
  rating: number;
  reviewsCount: number;
  followersCount: number;
  connectionsCount: number;
  achievements?: string[];
  services?: string[];
  established?: string;
  languages?: string[];
  contactInfo: {
    email: string;
    phone: string;
    whatsapp?: string;
  };
  stats?: {
    successfulDeals: number;
    playersRepresented: number;
    activeContracts: number;
  };
  isFollowing?: boolean;
}

const ENTITY_TYPES = {
  club: { icon: Building, color: 'bg-blue-500' },
  agent: { icon: Briefcase, color: 'bg-purple-500' },
  scout: { icon: Eye, color: 'bg-green-500' },
  academy: { icon: Trophy, color: 'bg-orange-500' },
  sponsor: { icon: Award, color: 'bg-red-500' },
  trainer: { icon: User, color: 'bg-cyan-500' }
};

export default function EntityProfilePage() {
  const { user, loading } = useAuth();
  const { t } = useTranslation();
  const router = useRouter();
  const params = useParams();

  const [entity, setEntity] = useState<EntityProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const entityType = params.type as string;
  const entityId = params.id as string;

  // جلب بيانات الكيان
  useEffect(() => {
    const fetchEntity = async () => {
      if (!entityType || !entityId) return;

      try {
        setIsLoading(true);
        setError('');

        // تحديد المجموعة حسب النوع
        let collectionName = '';
        switch (entityType) {
          case 'club':
            collectionName = 'clubs';
            break;
          case 'agent':
            collectionName = 'agents';
            break;
          case 'academy':
            collectionName = 'academies';
            break;
          case 'trainer':
            collectionName = 'trainers';
            break;
          case 'scout':
            collectionName = 'scouts';
            break;
          case 'sponsor':
            collectionName = 'sponsors';
            break;
          default:
            setError(t('playerEntitySearch.unsupportedType'));
            return;
        }

        const { data: docData, error: fetchError } = await supabase
          .from(collectionName)
          .select('*')
          .eq('id', entityId)
          .single();

        if (!!docData) {
          const data = docData;

          // منع عرض ملفات المشرف
          if (data.accountType === 'admin' || data.type === 'admin') {
            setError(t('playerEntitySearch.profileNotAllowed'));
            setIsLoading(false);
            return;
          }

          // تحويل البيانات إلى تنسيق EntityProfile
          const profile: EntityProfile = {
            id: data.id,
            name: data.name || data.full_name || data.display_name || data.fullName || t('playerEntitySearch.notSpecified'),
            type: entityType as any,
            email: data.email || '',
            phone: data.phone || '',
            website: data.website || '',
            profileImage: fixReceiptUrl(
              data.profile_image ||
              data.logo ||
              data.profile_photo ||
              data.profileImage ||
              data.photoURL ||
              data.avatar ||
              data.image ||
              data.profile_image_url ||
              data.profile_picture ||
              data.brand_logo ||
              data.business_logo
            ) || '/images/default-avatar.png',
            coverImage: fixReceiptUrl(
              data.coverImage ||
              data.backCover ||
              data.header_image ||
              data.banner
            ) || '/images/hero-1.jpg',
            location: {
              country: data.country || data.nationality || '',
              city: data.city || data.current_location?.split(' - ')[1] || data.current_location || '',
              address: data.address || data.office_address || ''
            },
            description: data.description || t('playerEntitySearch.noDescription'),
            specialization: data.specialization || data.type || '',
            verified: data.is_fifa_licensed || data.is_certified || true,
            rating: 4.5,
            reviewsCount: data.reviewsCount ?? 0,
            followersCount: (Array.isArray(data.followers) ? data.followers.length : (data.followersCount ?? 0)),
            connectionsCount: data.stats?.contracts || data.stats?.completed_deals || 0,
            achievements: data.trophies?.map((t: any) => `${t.name} (${t.year})`) ||
              (data.is_fifa_licensed ? [t('playerEntitySearch.fifaAgent')] : []) ||
              (data.is_certified ? [t('playerEntitySearch.certifiedTrainer')] : []) ||
              [t('playerEntitySearch.distinguishedExperience')],
            services: data.programs || [t('playerEntitySearch.variedServices')],
            established: data.founded || data.established ||
              (data.createdAt ? new Date(data.createdAt).getFullYear().toString() : ''),
            languages: data.spoken_languages || [t('playerEntitySearch.arabicLanguage')],
            contactInfo: {
              email: data.email || '',
              phone: data.phone || '',
              whatsapp: data.phone || ''
            },
            stats: {
              successfulDeals: data.stats?.completed_deals || data.stats?.contracts || 0,
              playersRepresented: data.stats?.active_players || data.stats?.players || data.stats?.students || 0,
              activeContracts: data.stats?.success_rate || data.stats?.training_sessions || 0
            },
            isFollowing: Array.isArray(data.followers) ? data.followers.includes(user?.id) : false
          };

          setEntity(profile);
        } else {
          setError(t('playerEntitySearch.profileNotFound'));
        }
      } catch (error) {
        console.error('Error fetching entity data:', error);
        setError(t('playerEntitySearch.loadError'));
      } finally {
        setIsLoading(false);
      }
    };

    fetchEntity();
  }, [entityType, entityId]);

  // متابعة الكيان
  const handleFollow = async () => {
    if (!user || !entity) return;
    setActionLoading('follow');
    const originalFollowing = entity.isFollowing ?? false;
    const nextFollowing = !originalFollowing;
    setEntity(prev => prev ? { ...prev, isFollowing: nextFollowing } : prev);

    try {
      const collectionName =
        entity.type === 'club' ? 'clubs' :
          entity.type === 'agent' ? 'agents' :
            entity.type === 'academy' ? 'academies' :
              entity.type === 'trainer' ? 'trainers' : 'entities';

      const { data: existingData } = await supabase
        .from(collectionName)
        .select('followers')
        .eq('id', entity.id)
        .single();

      if (!!existingData) {
        const currentFollowers: string[] = Array.isArray(existingData.followers) ? existingData.followers : [];
        const updatedFollowers = originalFollowing
          ? currentFollowers.filter((f: string) => f !== user!.id)
          : [...currentFollowers, user!.id];
        await supabase
          .from(collectionName)
          .update({ followers: updatedFollowers })
          .eq('id', entity.id);
      } else {
        await supabase
          .from(collectionName)
          .insert({
            id: entity.id,
            followers: nextFollowing ? [user!.id] : [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          });
      }
    } catch (error) {
      console.error('Follow error:', error);
      setEntity(prev => prev ? { ...prev, isFollowing: originalFollowing } : prev);
    } finally {
      setActionLoading(null);
    }
  };

  // إرسال رسالة
  const handleMessage = () => {
    if (!user || !entity) return;
    router.push(`/dashboard/messages?recipient=${entity.id}`);
  };

  // تنسيق الأرقام
  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  // التحقق من تسجيل الدخول
  if (loading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (!user) {
    router.push('/auth/login');
    return null;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-pink-50 flex items-center justify-center">
        <Card className="p-8 text-center max-w-md">
          <h2 className="text-2xl font-bold text-red-600 mb-4">{t('playerEntitySearch.errorTitle')}</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button onClick={() => router.back()}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t('playerEntitySearch.goBack')}
          </Button>
        </Card>
      </div>
    );
  }

  if (!entity) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50 flex items-center justify-center">
        <Card className="p-8 text-center max-w-md">
          <h2 className="text-2xl font-bold text-gray-600 mb-4">{t('playerEntitySearch.profileNotFoundTitle')}</h2>
          <Button onClick={() => router.back()}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t('playerEntitySearch.goBack')}
          </Button>
        </Card>
      </div>
    );
  }

  const entityTypeInfo = ENTITY_TYPES[entity.type];
  const EntityIcon = entityTypeInfo.icon;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50">
      {/* Header بسيط */}
      <div className="sticky top-0 z-50 border-b border-gray-200 shadow-sm backdrop-blur-md bg-white/95">
        <div className="px-4 py-4 mx-auto max-w-7xl">
          <div className="flex justify-between items-center">
            {/* زر العودة */}
            <button
              onClick={() => router.back()}
              className="flex gap-2 items-center px-4 py-2 text-gray-600 rounded-lg transition-all hover:text-gray-800 hover:bg-gray-100"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="font-medium">{t('playerEntitySearch.backToSearch')}</span>
            </button>

            {/* عنوان الصفحة */}
            <div className="text-center">
              <h1 className="text-xl font-bold text-gray-900">
                {t('playerEntitySearch.profileTitle').replace('{{type}}', t(`playerEntitySearch.types.${entity.type}`))}
              </h1>
              {entity && (
                <p className="text-sm text-gray-600">{entity.name}</p>
              )}
            </div>

            {/* مساحة فارغة للتوازن */}
            <div className="w-24"></div>
          </div>
        </div>
      </div>

      {/* المحتوى الرئيسي */}
      <div className="px-4 py-8 mx-auto max-w-7xl">
        <div className="flex-1 min-h-0 p-6 mx-4 my-6 overflow-auto rounded-lg shadow-inner md:p-10 bg-gray-50 dark:bg-gray-900">
          <div className="max-w-4xl px-4 py-10 mx-auto">
            {/* بطاقة الملف الرئيسية */}
            <Card className="overflow-hidden mb-8">
              {/* صورة الغلاف */}
              <div className="h-64 bg-gradient-to-r from-blue-400 to-purple-500 relative">
                {entity.coverImage && (
                  <img
                    src={entity.coverImage}
                    alt={entity.name}
                    className="w-full h-full object-cover"
                  />
                )}
                <div className="absolute inset-0 bg-black bg-opacity-30"></div>

                {/* شارات الحالة */}
                <div className="absolute top-4 right-4 flex gap-2">
                  {entity.verified && (
                    <Badge className="bg-blue-500 text-white">
                      <CheckCircle className="w-4 h-4 mr-1" />
                      {t('playerEntitySearch.verified')}
                    </Badge>
                  )}
                  <Badge className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white">
                    <Sparkles className="w-4 h-4 mr-1" />
                    {t('playerEntitySearch.featured')}
                  </Badge>
                </div>

                {/* معلومات الملف الشخصي */}
                <div className="absolute bottom-4 left-4 right-4">
                  <div className="flex items-end gap-4">
                    {/* صورة الملف الشخصي */}
                    <div className="relative">
                      <img
                        src={entity.profileImage}
                        alt={entity.name}
                        className="w-24 h-24 rounded-full border-4 border-white shadow-lg object-cover"
                      />
                      <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                        <EntityIcon className="w-5 h-5 text-white" />
                      </div>
                    </div>

                    {/* معلومات أساسية */}
                    <div className="flex-1 text-white">
                      <h1 className="text-3xl font-bold mb-2">{entity.name}</h1>
                      <div className="flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-1">
                          <MapPin className="w-4 h-4" />
                          {entity.location.city}, {entity.location.country}
                        </div>
                        <div className="flex items-center gap-1">
                          <Star className="w-4 h-4 text-yellow-300" />
                          {entity.rating} ({formatNumber(entity.reviewsCount)} {t('playerEntitySearch.rating')})
                        </div>
                      </div>
                    </div>

                    {/* أزرار الإجراءات */}
                    <div className="flex gap-2">
                      <Button
                        onClick={handleFollow}
                        disabled={actionLoading === 'follow'}
                        variant={entity.isFollowing ? "outline" : "default"}
                        className="bg-white text-gray-900 hover:bg-gray-100"
                      >
                        {actionLoading === 'follow' ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : entity.isFollowing ? (
                          <>
                            <UserCheck className="w-4 h-4 mr-2" />
                            {t('playerEntitySearch.following')}
                          </>
                        ) : (
                          <>
                            <UserPlus className="w-4 h-4 mr-2" />
                            {t('playerEntitySearch.follow')}
                          </>
                        )}
                      </Button>

                      <Button
                        onClick={handleMessage}
                        className="bg-white text-gray-900 hover:bg-gray-100"
                      >
                        <MessageSquare className="w-4 h-4 mr-2" />
                        {t('playerEntitySearch.message')}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* إحصائيات سريعة */}
              <div className="p-6 bg-white">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{formatNumber(entity.followersCount)}</div>
                    <div className="text-sm text-gray-600">{t('playerEntitySearch.followers')}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{formatNumber(entity.connectionsCount)}</div>
                    <div className="text-sm text-gray-600">{t('playerEntitySearch.connections')}</div>
                  </div>
                  {entity.stats && (
                    <>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-purple-600">{entity.stats.successfulDeals}</div>
                        <div className="text-sm text-gray-600">{t('playerEntitySearch.successfulDeals')}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-orange-600">{entity.stats.playersRepresented}</div>
                        <div className="text-sm text-gray-600">{t('playerEntitySearch.playersRepresented')}</div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </Card>

            {/* معلومات تفصيلية */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* العمود الأيسر - معلومات أساسية */}
              <div className="lg:col-span-2 space-y-6">
                {/* الوصف */}
                <Card className="p-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-4">{t('playerEntitySearch.description')}</h3>
                  <p className="text-gray-700 leading-relaxed">{entity.description}</p>
                </Card>

                {/* الإنجازات */}
                {entity.achievements && entity.achievements.length > 0 && (
                  <Card className="p-6">
                    <h3 className="text-xl font-bold text-gray-900 mb-4">{t('playerEntitySearch.achievements')}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {entity.achievements.map((achievement, index) => (
                        <div key={index} className="flex items-center gap-2 p-3 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg">
                          <Trophy className="w-5 h-5 text-yellow-500" />
                          <span className="text-gray-700">{achievement}</span>
                        </div>
                      ))}
                    </div>
                  </Card>
                )}

                {/* الخدمات */}
                {entity.services && entity.services.length > 0 && (
                  <Card className="p-6">
                    <h3 className="text-xl font-bold text-gray-900 mb-4">{t('playerEntitySearch.services')}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {entity.services.map((service, index) => (
                        <div key={index} className="flex items-center gap-2 p-3 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg">
                          <Target className="w-5 h-5 text-blue-500" />
                          <span className="text-gray-700">{service}</span>
                        </div>
                      ))}
                    </div>
                  </Card>
                )}
              </div>

              {/* العمود الأيمن - معلومات الاتصال */}
              <div className="space-y-6">
                {/* معلومات الاتصال */}
                <Card className="p-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-4">{t('playerEntitySearch.contactInfo')}</h3>
                  <div className="space-y-4">
                    {entity.contactInfo.email && (
                      <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                        <Mail className="w-5 h-5 text-gray-500" />
                        <div>
                          <div className="text-sm text-gray-500">{t('playerEntitySearch.email')}</div>
                          <div className="font-medium">{entity.contactInfo.email}</div>
                        </div>
                      </div>
                    )}

                    {entity.contactInfo.phone && (
                      <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                        <Phone className="w-5 h-5 text-gray-500" />
                        <div>
                          <div className="text-sm text-gray-500">{t('playerEntitySearch.phone')}</div>
                          <div className="font-medium">{entity.contactInfo.phone}</div>
                        </div>
                      </div>
                    )}

                    {entity.website && (
                      <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                        <Globe className="w-5 h-5 text-gray-500" />
                        <div>
                          <div className="text-sm text-gray-500">{t('playerEntitySearch.website')}</div>
                          <a href={entity.website} target="_blank" rel="noopener noreferrer" className="font-medium text-blue-600 hover:underline">
                            {entity.website}
                          </a>
                        </div>
                      </div>
                    )}
                  </div>
                </Card>

                {/* معلومات إضافية */}
                <Card className="p-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-4">{t('playerEntitySearch.additionalInfo')}</h3>
                  <div className="space-y-4">
                    {entity.specialization && (
                      <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                        <Target className="w-5 h-5 text-gray-500" />
                        <div>
                          <div className="text-sm text-gray-500">{t('playerEntitySearch.specialization')}</div>
                          <div className="font-medium">{entity.specialization}</div>
                        </div>
                      </div>
                    )}

                    {entity.established && (
                      <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                        <Calendar className="w-5 h-5 text-gray-500" />
                        <div>
                          <div className="text-sm text-gray-500">{t('playerEntitySearch.establishedDate')}</div>
                          <div className="font-medium">{entity.established}</div>
                        </div>
                      </div>
                    )}

                    {entity.languages && entity.languages.length > 0 && (
                      <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                        <Languages className="w-5 h-5 text-gray-500" />
                        <div>
                          <div className="text-sm text-gray-500">{t('playerEntitySearch.languages')}</div>
                          <div className="font-medium">{entity.languages.join(', ')}</div>
                        </div>
                      </div>
                    )}
                  </div>
                </Card>

                {/* أزرار الإجراءات */}
                <Card className="p-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-4">{t('playerEntitySearch.actions')}</h3>
                  <div className="space-y-3">
                    <Button
                      onClick={handleFollow}
                      disabled={actionLoading === 'follow'}
                      variant={entity.isFollowing ? "outline" : "default"}
                      className="w-full"
                    >
                      {actionLoading === 'follow' ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      ) : entity.isFollowing ? (
                        <>
                          <UserCheck className="w-4 h-4 mr-2" />
                          {t('playerEntitySearch.following')}
                        </>
                      ) : (
                        <>
                          <UserPlus className="w-4 h-4 mr-2" />
                          {t('playerEntitySearch.follow')}
                        </>
                      )}
                    </Button>

                    <Button
                      onClick={handleMessage}
                      variant="outline"
                      className="w-full"
                    >
                      <MessageSquare className="w-4 h-4 mr-2" />
                      {t('playerEntitySearch.sendMessage')}
                    </Button>

                    <Button
                      variant="outline"
                      className="w-full"
                    >
                      <Share2 className="w-4 h-4 mr-2" />
                      {t('playerEntitySearch.share')}
                    </Button>
                  </div>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
