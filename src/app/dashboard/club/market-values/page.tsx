'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Activity, ArrowDown, ArrowLeft, ArrowUp, BarChart3, DollarSign, Minus, Search, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';
import LanguageSwitcher from '@/components/shared/LanguageSwitcher';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/lib/firebase/auth-provider';
import { useTranslation } from '@/lib/i18n';
import { supabase } from '@/lib/supabase/config';

interface MarketValue {
  id: string;
  playerId: string;
  playerName: string;
  currentValue: number;
  previousValue: number;
  changePercentage: number;
  lastUpdate: string;
  history: { date: string; value: number }[];
  predictions: { nextMonth: number; nextSeason: number };
  factors: { performance: number; age: number; contract: number; market: number };
}

export default function MarketValuesPage() {
  const router = useRouter();
  const { user, userData } = useAuth();
  const { isRTL, getTranslations } = useTranslation();
  const copy = getTranslations<any>('clubMarketValues');
  const [marketValues, setMarketValues] = useState<MarketValue[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (!user || !userData?.clubId) {
      setLoading(false);
      return;
    }

    const fetchMarketValues = async () => {
      try {
        setLoading(true);
        const { data } = await supabase
          .from('market_values')
          .select('*')
          .eq('clubId', userData.clubId);
        setMarketValues((data || []) as MarketValue[]);
      } catch (error) {
        console.error('Error fetching market values:', error);
        toast.error(copy.loadError);
      } finally {
        setLoading(false);
      }
    };

    void fetchMarketValues();
  }, [copy.loadError, user, userData?.clubId]);

  const getChangeIcon = (change: number) => {
    if (change > 0) return <ArrowUp className="h-4 w-4 text-green-600" />;
    if (change < 0) return <ArrowDown className="h-4 w-4 text-red-600" />;
    return <Minus className="h-4 w-4 text-gray-600" />;
  };

  const getChangeColor = (change: number) => {
    if (change > 0) return 'text-green-600';
    if (change < 0) return 'text-red-600';
    return 'text-gray-600';
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

  const stats = [
    { label: copy.totalMarketValue, value: '$45.2M', icon: DollarSign, color: 'text-blue-600' },
    { label: copy.averageChange, value: '+12.5%', icon: TrendingUp, color: 'text-green-600' },
    { label: copy.highestValue, value: '$8.5M', icon: BarChart3, color: 'text-purple-600' },
    { label: copy.dailyUpdates, value: '24', icon: Activity, color: 'text-yellow-600' },
  ];
  const filteredValues = marketValues.filter(
    (item) => !searchTerm || item.playerName.toLowerCase().includes(searchTerm.toLowerCase()),
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

      <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        {stats.map(({ label, value, icon: Icon, color }) => (
          <Card key={label}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">{label}</p>
                  <h3 className={`mt-1 text-2xl font-bold ${color === 'text-green-600' ? color : ''}`}>{value}</h3>
                </div>
                <Icon className={`h-8 w-8 ${color}`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mb-8 flex flex-col gap-4 sm:flex-row">
        <div className="relative flex-1">
          <Search className={`absolute top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400 ${isRTL ? 'right-3' : 'left-3'}`} />
          <Input
            type="text"
            placeholder={copy.searchPlaceholder}
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            className={isRTL ? 'w-full pr-12' : 'w-full pl-12'}
          />
        </div>
      </div>

      {marketValues.length === 0 ? (
        <div className="rounded-xl bg-white p-12 text-center shadow">
          <DollarSign className="mx-auto mb-4 h-16 w-16 text-gray-300" />
          <h3 className="mb-2 text-xl font-bold text-gray-700">{copy.emptyTitle}</h3>
          <p className="text-gray-500">{copy.emptyDescription}</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl bg-white shadow">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {Object.values(copy.columns).map((heading) => (
                  <th key={String(heading)} className={`px-6 py-3 text-xs font-medium uppercase text-gray-500 ${isRTL ? 'text-right' : 'text-left'}`}>
                    {String(heading)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {filteredValues.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">{item.playerName}</td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">{formatValue(item.currentValue)}</td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm">
                    <span className={`flex items-center gap-1 ${getChangeColor(item.changePercentage)}`}>
                      {getChangeIcon(item.changePercentage)}
                      {Math.abs(item.changePercentage).toFixed(1)}%
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">{item.lastUpdate}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
