'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Calendar, Edit, Eye, Facebook, Instagram, Linkedin, Plus, Search, Share2, Trash2, Twitter, Youtube } from 'lucide-react';
import { Toaster, toast } from 'sonner';
import PlayerProfileForm from '@/components/club/PlayerProfileForm';
import LanguageSwitcher from '@/components/shared/LanguageSwitcher';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/lib/firebase/auth-provider';
import { useTranslation } from '@/lib/i18n';
import { supabase } from '@/lib/supabase/config';

interface MarketingCampaign {
  id: string;
  playerId: string;
  playerName: string;
  title: string;
  startDate: string;
  endDate: string;
  status: 'active' | 'completed' | 'scheduled';
  platforms: string[];
  metrics: { reach: number; engagement: number; conversions: number };
  budget: string;
  type: 'social' | 'traditional' | 'digital';
  clubId: string;
}

type CampaignFilters = { status: string; type: string; platform: string };

export default function MarketingPage() {
  const router = useRouter();
  const { user, userData } = useAuth();
  const { isRTL, getTranslations } = useTranslation();
  const copy = getTranslations<any>('clubMarketing');
  const [campaigns, setCampaigns] = useState<MarketingCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilters, setSelectedFilters] = useState<CampaignFilters>({ status: '', type: '', platform: '' });
  const [showAddPlayer, setShowAddPlayer] = useState(false);
  const [clubPlayers, setClubPlayers] = useState<any[]>([]);
  const clubId = (userData?.clubId as string) || (user?.id as string) || '';

  const getDemoCampaigns = (currentClubId: string): MarketingCampaign[] => [
    {
      id: '1', playerId: 'player1', playerName: copy.demo.playerOne, title: copy.demo.campaignOne,
      startDate: '2024-03-01', endDate: '2024-04-01', status: 'active',
      platforms: ['Facebook', 'Instagram', 'Twitter'],
      metrics: { reach: 50000, engagement: 15, conversions: 1200 },
      budget: copy.demo.budgetOne, type: 'social', clubId: currentClubId,
    },
    {
      id: '2', playerId: 'player2', playerName: copy.demo.playerTwo, title: copy.demo.campaignTwo,
      startDate: '2024-03-15', endDate: '2024-04-15', status: 'scheduled',
      platforms: ['Youtube', 'Linkedin'],
      metrics: { reach: 30000, engagement: 12, conversions: 800 },
      budget: copy.demo.budgetTwo, type: 'digital', clubId: currentClubId,
    },
  ];

  const fetchCampaigns = async (filters: CampaignFilters) => {
    if (!userData?.clubId) {
      setCampaigns([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      let query = supabase.from('marketing_campaigns').select('*').eq('clubId', userData.clubId);
      if (filters.status) query = query.eq('status', filters.status);
      if (filters.type) query = query.eq('type', filters.type);
      const { data } = await query;

      if (data?.length) {
        setCampaigns(data as MarketingCampaign[]);
      } else {
        setCampaigns(getDemoCampaigns(userData.clubId));
        toast.info(copy.demoNotice);
      }
    } catch (error) {
      console.error('Error fetching campaigns:', error);
      toast.error(copy.loadError);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) {
      router.push('/auth/login');
      return;
    }
    if (!userData) return;
    if (userData.accountType !== 'club') {
      router.push('/dashboard');
      return;
    }
    if (!userData.clubId) {
      setLoading(false);
      return;
    }
    void fetchCampaigns(selectedFilters);
    // Initial fetch and language refresh only; filters are handled explicitly below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [copy.demoNotice, copy.loadError, router, user, userData]);

  useEffect(() => {
    if (!clubId) return;
    const fetchPlayers = async () => {
      const { data } = await supabase.from('players').select('*').eq('club_id', clubId);
      setClubPlayers(data || []);
    };
    void fetchPlayers();
  }, [clubId, showAddPlayer]);

  const handleFilterChange = (filterType: 'status' | 'type', value: string) => {
    const nextFilters = { ...selectedFilters, [filterType]: value };
    setSelectedFilters(nextFilters);
    void fetchCampaigns(nextFilters);
  };

  const getStatusColor = (status: MarketingCampaign['status']) => {
    if (status === 'active') return 'text-green-600 bg-green-50';
    if (status === 'completed') return 'text-blue-600 bg-blue-50';
    return 'text-yellow-600 bg-yellow-50';
  };

  const getPlatformIcon = (platform: string) => {
    switch (platform.toLowerCase()) {
      case 'facebook': return <Facebook className="h-4 w-4" />;
      case 'twitter': return <Twitter className="h-4 w-4" />;
      case 'instagram': return <Instagram className="h-4 w-4" />;
      case 'youtube': return <Youtube className="h-4 w-4" />;
      case 'linkedin': return <Linkedin className="h-4 w-4" />;
      default: return <Share2 className="h-4 w-4" />;
    }
  };

  const filteredCampaigns = campaigns.filter((campaign) =>
    campaign.title.toLowerCase().includes(searchTerm.toLowerCase())
    || campaign.playerName.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center" dir={isRTL ? 'rtl' : 'ltr'}>
        <div className="text-center">
          <div className="mx-auto mb-4 h-16 w-16 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
          <p className="text-gray-600">{copy.loading}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6" dir={isRTL ? 'rtl' : 'ltr'}>
      <Toaster position="top-center" richColors />
      <div className="mb-8">
        <div className="mb-4 flex items-center justify-between gap-4">
          <button onClick={() => router.back()} className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
            <ArrowLeft className={`h-5 w-5 ${isRTL ? 'rotate-180' : ''}`} />
            {copy.back}
          </button>
          <LanguageSwitcher />
        </div>
        <h1 className="mb-2 text-3xl font-bold text-gray-900">{copy.title}</h1>
        <p className="text-gray-600">{copy.subtitle}</p>
        {userData?.accountType === 'club' && (
          <Dialog open={showAddPlayer} onOpenChange={setShowAddPlayer}>
            <DialogTrigger asChild>
              <Button className="mt-4 bg-blue-600 text-white hover:bg-blue-700">
                <Plus className="h-4 w-4" /> {copy.addPlayer}
              </Button>
            </DialogTrigger>
            <DialogContent className="w-full max-w-2xl">
              <PlayerProfileForm clubId={userData.clubId || user?.id || ''} onSuccess={() => setShowAddPlayer(false)} />
              <Button variant="outline" className="mt-4 w-full" onClick={() => setShowAddPlayer(false)}>{copy.close}</Button>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="mb-8 flex flex-col gap-4 sm:flex-row">
        <div className="relative flex-1">
          <Search className={`absolute top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400 ${isRTL ? 'right-3' : 'left-3'}`} />
          <Input
            type="text" placeholder={copy.searchPlaceholder} value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            className={isRTL ? 'w-full pr-10' : 'w-full pl-10'}
          />
        </div>
        <select value={selectedFilters.status} onChange={(event) => handleFilterChange('status', event.target.value)} className="rounded-lg border border-gray-300 px-4 py-2">
          <option value="">{copy.allStatuses}</option>
          {Object.entries(copy.statuses).map(([value, label]) => <option key={value} value={value}>{String(label)}</option>)}
        </select>
        <select value={selectedFilters.type} onChange={(event) => handleFilterChange('type', event.target.value)} className="rounded-lg border border-gray-300 px-4 py-2">
          <option value="">{copy.allTypes}</option>
          {Object.entries(copy.types).map(([value, label]) => <option key={value} value={value}>{String(label)}</option>)}
        </select>
        <Button onClick={() => router.push('/dashboard/club/marketing/new')}>
          <Plus className="h-5 w-5" /> {copy.newCampaign}
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredCampaigns.map((campaign) => (
          <Card key={campaign.id} className="overflow-hidden">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-lg">{campaign.title}</CardTitle>
                <Badge className={getStatusColor(campaign.status)}>{copy.statuses[campaign.status]}</Badge>
              </div>
              <p className="text-sm text-gray-600">{campaign.playerName}</p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Calendar className="h-4 w-4" /><span>{campaign.startDate} - {campaign.endDate}</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {campaign.platforms.map((platform) => (
                    <span key={platform} className="flex items-center gap-1 rounded-full bg-gray-100 px-2 py-1 text-sm text-gray-600">
                      {getPlatformIcon(platform)} {platform}
                    </span>
                  ))}
                </div>
                <div className="grid grid-cols-3 gap-4 pt-4">
                  <div className="text-center"><p className="text-2xl font-bold text-blue-600">{campaign.metrics.reach}</p><p className="text-sm text-gray-600">{copy.metrics.reach}</p></div>
                  <div className="text-center"><p className="text-2xl font-bold text-green-600">{campaign.metrics.engagement}%</p><p className="text-sm text-gray-600">{copy.metrics.engagement}</p></div>
                  <div className="text-center"><p className="text-2xl font-bold text-purple-600">{campaign.metrics.conversions}</p><p className="text-sm text-gray-600">{copy.metrics.conversions}</p></div>
                </div>
                <div className="flex items-center justify-between pt-4">
                  <span className="text-sm font-medium text-gray-900">{campaign.budget}</span>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm"><Eye className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="sm"><Edit className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="sm"><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {clubPlayers.length > 0 && (
        <div className="mt-8 overflow-x-auto">
          <table className="min-w-full rounded-lg border bg-white">
            <thead><tr><th className="border-b p-2">{copy.playersTable.image}</th><th className="border-b p-2">{copy.playersTable.name}</th><th className="border-b p-2">{copy.playersTable.position}</th></tr></thead>
            <tbody>
              {clubPlayers.map((player) => (
                <tr key={player.id}>
                  <td className="border-b p-2">{player.profile_image && <img src={player.profile_image} alt={player.full_name || player.name} className="h-10 w-10 rounded-full object-cover" />}</td>
                  <td className="border-b p-2">{player.full_name || player.name}</td>
                  <td className="border-b p-2">{player.primary_position || player.position}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
