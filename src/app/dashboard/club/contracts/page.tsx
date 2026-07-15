'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import {
  AlertCircle,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  DollarSign,
  Edit,
  Eye,
  FileText,
  Plus,
  Search,
  Trash2,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import LanguageSwitcher from '@/components/shared/LanguageSwitcher';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/lib/firebase/auth-provider';
import { useTranslation } from '@/lib/i18n';
import { supabase } from '@/lib/supabase/config';

interface Contract {
  id: string;
  playerId: string;
  playerName: string;
  startDate: string;
  endDate: string;
  salary: number;
  status: 'active' | 'expired' | 'pending' | 'terminated';
  type: 'full' | 'loan' | 'youth';
  documents: string[];
  clauses: {
    releaseClause: number;
    buyoutClause: number;
    performanceBonus: boolean;
  };
}

export default function ContractsPage() {
  const router = useRouter();
  const { user, userData } = useAuth();
  const { isRTL, getTranslations } = useTranslation();
  const copy = getTranslations<any>('clubContracts');
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus] = useState<string[]>([]);
  const [selectedType] = useState<string[]>([]);

  const interpolate = (template: string, values: Record<string, string>) =>
    Object.entries(values).reduce(
      (result, [key, value]) => result.replace(`{{${key}}}`, value),
      template,
    );

  useEffect(() => {
    if (!user || !userData?.clubId) {
      setLoading(false);
      return;
    }

    const fetchContracts = async () => {
      try {
        setLoading(true);
        const { data: contractsData } = await supabase
          .from('contracts')
          .select('*')
          .eq('clubId', userData.clubId);

        setContracts((contractsData || []) as Contract[]);
      } catch (error) {
        console.error('Error fetching contracts:', error);
        toast.error(copy.loadError);
      } finally {
        setLoading(false);
      }
    };

    void fetchContracts();
  }, [copy.loadError, user, userData?.clubId]);

  const getStatusColor = (status: Contract['status']) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'expired':
        return 'bg-red-100 text-red-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: Contract['status']) => {
    switch (status) {
      case 'active':
        return <CheckCircle2 className="h-4 w-4" />;
      case 'expired':
        return <XCircle className="h-4 w-4" />;
      case 'pending':
        return <Clock className="h-4 w-4" />;
      case 'terminated':
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  const filteredContracts = contracts.filter((contract) => {
    const matchesSearch = contract.playerName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = selectedStatus.length === 0 || selectedStatus.includes(contract.status);
    const matchesType = selectedType.length === 0 || selectedType.includes(contract.type);
    return matchesSearch && matchesStatus && matchesType;
  });

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
      <div className="mb-8">
        <div className="mb-4 flex items-center justify-between gap-4">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
          >
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
            type="text"
            placeholder={copy.searchPlaceholder}
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            className={isRTL ? 'w-full pr-12' : 'w-full pl-12'}
          />
        </div>
        <Button onClick={() => router.push('/dashboard/club/contracts/new')} className="flex items-center gap-2">
          <Plus className="h-5 w-5" />
          {copy.newContract}
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredContracts.map((contract) => (
          <motion.div
            key={contract.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="overflow-hidden rounded-xl bg-white shadow-lg"
          >
            <Card>
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-xl">{contract.playerName}</CardTitle>
                  <Badge className={getStatusColor(contract.status)}>
                    <span className="flex items-center gap-1">
                      {getStatusIcon(contract.status)}
                      {copy.statuses[contract.status]}
                    </span>
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-gray-600">
                    <Calendar className="h-5 w-5" />
                    <span>{interpolate(copy.dateRange, { start: contract.startDate, end: contract.endDate })}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <DollarSign className="h-5 w-5" />
                    <span>{contract.salary?.toLocaleString()} {copy.perMonth}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <FileText className="h-5 w-5" />
                    <span>{copy.types[contract.type]}</span>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button variant="outline" size="sm" className="flex-1">
                      <Eye className="h-4 w-4" /> {copy.view}
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1">
                      <Edit className="h-4 w-4" /> {copy.edit}
                    </Button>
                    <Button variant="outline" size="sm" className="text-red-600 hover:bg-red-50">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {filteredContracts.length === 0 && (
        <div className="rounded-xl bg-white p-12 text-center shadow">
          <FileText className="mx-auto mb-4 h-16 w-16 text-gray-300" />
          <h3 className="mb-2 text-xl font-bold text-gray-700">{copy.emptyTitle}</h3>
          <p className="mb-4 text-gray-500">{copy.emptyDescription}</p>
          <Button onClick={() => router.push('/dashboard/club/contracts/new')}>
            <Plus className="h-4 w-4" />
            {copy.addContract}
          </Button>
        </div>
      )}
    </div>
  );
}
