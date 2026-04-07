'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  BarChart3,
  LineChart,
  PieChart,
  Activity,
  AlertCircle,
  CheckCircle2,
  Clock,
  Download,
  Filter,
  Search,
  ArrowUp,
  ArrowDown,
  Minus,
  ArrowLeft
} from 'lucide-react';
import { supabase } from '@/lib/supabase/config';
import { useAuth } from '@/lib/firebase/auth-provider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

interface MarketValue {
  id: string;
  playerId: string;
  playerName: string;
  currentValue: number;
  previousValue: number;
  changePercentage: number;
  lastUpdate: string;
  history: {
    date: string;
    value: number;
  }[];
  predictions: {
    nextMonth: number;
    nextSeason: number;
  };
  factors: {
    performance: number;
    age: number;
    contract: number;
    market: number;
  };
}

export default function MarketValuesPage() {
  const router = useRouter();
  const { user, userData } = useAuth();
  const [marketValues, setMarketValues] = useState<MarketValue[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !userData || !userData.clubId) {
      setLoading(false);
      return;
    }

    fetchMarketValues();
  }, [user, userData]);

  const fetchMarketValues = async () => {
    try {
      setLoading(true);
      const { data: marketValuesData } = await supabase
        .from('market_values')
        .select('*')
        .eq('clubId', userData?.clubId);

      setMarketValues((marketValuesData || []) as MarketValue[]);
    } catch (error) {
      console.error('Error fetching market values:', error);
      toast.error('حدث خطأ أثناء جلب بيانات القيم السوقية');
    } finally {
      setLoading(false);
    }
  };

  const getChangeIcon = (change: number) => {
    if (change > 0) return <ArrowUp className="w-4 h-4 text-green-600" />;
    if (change < 0) return <ArrowDown className="w-4 h-4 text-red-600" />;
    return <Minus className="w-4 h-4 text-gray-600" />;
  };

  const getChangeColor = (change: number) => {
    if (change > 0) return 'text-green-600';
    if (change < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  const formatValue = (value: number) => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
      return `$${(value / 1000).toFixed(1)}K`;
    }
    return `$${value}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 border-4 border-blue-200 rounded-full border-t-blue-600 animate-spin"></div>
          <p className="text-gray-600">جاري تحميل القيم السوقية...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6" dir="rtl">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 mb-4 text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="w-5 h-5" />
          العودة للوحة التحكم
        </button>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">حركة أسعار اللاعبين</h1>
        <p className="text-gray-600">تتبع وتحليل قيم اللاعبين في السوق</p>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">إجمالي القيمة السوقية</p>
                <h3 className="text-2xl font-bold mt-1">$45.2M</h3>
              </div>
              <DollarSign className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">متوسط التغير</p>
                <h3 className="text-2xl font-bold mt-1 text-green-600">+12.5%</h3>
              </div>
              <TrendingUp className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">أعلى قيمة</p>
                <h3 className="text-2xl font-bold mt-1">$8.5M</h3>
              </div>
              <BarChart3 className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">التحديثات اليومية</p>
                <h3 className="text-2xl font-bold mt-1">24</h3>
              </div>
              <Activity className="w-8 h-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-8">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <Input
            type="text"
            placeholder="ابحث عن لاعب..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pr-12"
          />
        </div>
      </div>

      {/* Market Values Table */}
      {marketValues.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center shadow">
          <DollarSign className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-700 mb-2">لا توجد بيانات قيم سوقية</h3>
          <p className="text-gray-500">لم يتم إضافة قيم سوقية للاعبين بعد.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">اللاعب</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">القيمة الحالية</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">التغيير</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">آخر تحديث</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {marketValues
                .filter(mv => !searchTerm || mv.playerName.toLowerCase().includes(searchTerm.toLowerCase()))
                .map((mv) => (
                  <tr key={mv.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{mv.playerName}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatValue(mv.currentValue)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`flex items-center gap-1 ${getChangeColor(mv.changePercentage)}`}>
                        {getChangeIcon(mv.changePercentage)}
                        {Math.abs(mv.changePercentage).toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{mv.lastUpdate}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
