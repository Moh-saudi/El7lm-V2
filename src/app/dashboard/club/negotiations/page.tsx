'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { ArrowLeft, CheckCircle2, Clock, Edit, Eye, Mail, Phone, Plus, Search, Trash2, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import LanguageSwitcher from '@/components/shared/LanguageSwitcher';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/lib/firebase/auth-provider';
import { useTranslation } from '@/lib/i18n';
import { supabase } from '@/lib/supabase/config';

interface Negotiation {
  id: string;
  playerId: string;
  playerName: string;
  type: 'transfer' | 'contract' | 'sponsorship' | 'loan';
  status: 'active' | 'completed' | 'cancelled' | 'pending';
  startDate: string;
  lastUpdate: string;
  parties: {
    name: string;
    type: 'club' | 'agent' | 'player' | 'sponsor';
    contact: { phone: string; email: string; address: string };
  }[];
  details: { initialOffer: number; currentOffer: number; demands: string[]; notes: string[] };
  timeline: { date: string; action: string; party: string; notes: string }[];
  documents: { name: string; type: string; url: string; date: string }[];
}

export default function NegotiationsPage() {
  const router = useRouter();
  const { user, userData } = useAuth();
  const { isRTL, getTranslations } = useTranslation();
  const copy = getTranslations<any>('clubNegotiations');
  const [negotiations, setNegotiations] = useState<Negotiation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

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

    const fetchNegotiations = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('negotiations')
          .select('*')
          .eq('clubId', userData.clubId);
        if (error) throw error;
        setNegotiations((data || []) as Negotiation[]);
      } catch (error) {
        console.error('Error fetching negotiations:', error);
        toast.error(copy.loadError);
      } finally {
        setLoading(false);
      }
    };

    void fetchNegotiations();
  }, [copy.loadError, router, user, userData]);

  const getStatusColor = (status: Negotiation['status']) => {
    if (status === 'active') return 'bg-green-100 text-green-800';
    if (status === 'completed') return 'bg-blue-100 text-blue-800';
    if (status === 'cancelled') return 'bg-red-100 text-red-800';
    return 'bg-yellow-100 text-yellow-800';
  };

  const getStatusIcon = (status: Negotiation['status']) => {
    if (status === 'active' || status === 'completed') return <CheckCircle2 className="h-4 w-4" />;
    if (status === 'cancelled') return <XCircle className="h-4 w-4" />;
    return <Clock className="h-4 w-4" />;
  };

  const formatValue = (value: number) => {
    if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
    if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
    return `$${value}`;
  };

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

  if (userData?.accountType === 'club' && !userData.clubId) {
    return (
      <div className="flex min-h-screen items-center justify-center" dir={isRTL ? 'rtl' : 'ltr'}>
        <div className="text-center">
          <p className="mb-2 text-lg font-bold text-red-600">{copy.missingClubTitle}</p>
          <p className="text-gray-500">{copy.missingClubHelp}</p>
        </div>
      </div>
    );
  }

  const filteredNegotiations = negotiations.filter((negotiation) =>
    negotiation.playerName.toLowerCase().includes(searchTerm.toLowerCase())
    || copy.types[negotiation.type].toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <div className="min-h-screen bg-gray-50 p-6" dir={isRTL ? 'rtl' : 'ltr'}>
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
      </div>

      <div className="mb-8 flex flex-col gap-4 sm:flex-row">
        <div className="relative flex-1">
          <Search className={`absolute top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400 ${isRTL ? 'right-3' : 'left-3'}`} />
          <Input
            type="text" placeholder={copy.searchPlaceholder} value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            className={isRTL ? 'w-full pr-12' : 'w-full pl-12'}
          />
        </div>
        <Button onClick={() => router.push('/dashboard/club/negotiations/new')} className="flex items-center gap-2">
          <Plus className="h-5 w-5" /> {copy.newNegotiation}
        </Button>
      </div>

      {filteredNegotiations.length === 0 ? (
        <div className="rounded-xl bg-white p-12 text-center text-gray-500 shadow">{copy.empty}</div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredNegotiations.map((negotiation) => (
            <motion.div key={negotiation.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="overflow-hidden rounded-xl bg-white shadow-lg">
              <Card>
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between gap-2">
                    <div><CardTitle className="text-xl">{negotiation.playerName}</CardTitle><p className="mt-1 text-sm text-gray-600">{copy.types[negotiation.type]}</p></div>
                    <Badge className={getStatusColor(negotiation.status)}>
                      <span className="flex items-center gap-1">{getStatusIcon(negotiation.status)} {copy.statuses[negotiation.status]}</span>
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <h4 className="mb-2 text-sm font-semibold">{copy.latestUpdates}</h4>
                      <div className="space-y-2">
                        {negotiation.timeline.slice(-2).map((event, index) => (
                          <div key={index} className="flex items-start gap-2 text-sm">
                            <div className="mt-2 h-2 w-2 rounded-full bg-blue-600" />
                            <div><p className="font-medium">{event.action}</p><p className="text-xs text-gray-600">{event.date}</p></div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h4 className="mb-2 text-sm font-semibold">{copy.parties}</h4>
                      <div className="space-y-2">
                        {negotiation.parties.map((party, index) => (
                          <div key={index} className="flex items-center gap-2 text-sm">
                            <div className="flex-1"><p className="font-medium">{party.name}</p><p className="text-xs text-gray-600">{copy.partyTypes[party.type]}</p></div>
                            <div className="flex gap-1"><Button variant="ghost" size="sm" className="h-8 w-8 p-0"><Phone className="h-4 w-4" /></Button><Button variant="ghost" size="sm" className="h-8 w-8 p-0"><Mail className="h-4 w-4" /></Button></div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h4 className="mb-2 text-sm font-semibold">{copy.financialDetails}</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="rounded-lg bg-gray-50 p-2 text-center"><p className="text-sm text-gray-600">{copy.initialOffer}</p><p className="text-lg font-semibold">{formatValue(negotiation.details.initialOffer)}</p></div>
                        <div className="rounded-lg bg-gray-50 p-2 text-center"><p className="text-sm text-gray-600">{copy.currentOffer}</p><p className="text-lg font-semibold">{formatValue(negotiation.details.currentOffer)}</p></div>
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-4">
                      <Button variant="outline" size="sm" onClick={() => router.push(`/dashboard/club/negotiations/${negotiation.id}`)}><Eye className="h-4 w-4" /> {copy.view}</Button>
                      <Button variant="outline" size="sm" onClick={() => router.push(`/dashboard/club/negotiations/${negotiation.id}/edit`)}><Edit className="h-4 w-4" /> {copy.edit}</Button>
                      <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700"><Trash2 className="h-4 w-4" /> {copy.delete}</Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
