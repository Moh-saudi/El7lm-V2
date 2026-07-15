'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { AlertCircle, ArrowLeft, Calendar, CheckCircle2, Clock, DollarSign, Edit, Eye, FileText, Plus, Search, Trash2, XCircle } from 'lucide-react';
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
  clauses: { releaseClause: number; buyoutClause: number; performanceBonus: boolean };
}

export default function MarketerContractsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { isRTL, getTranslations } = useTranslation();
  const shared = getTranslations<any>('clubContracts');
  const copy = getTranslations<any>('marketerContracts');
  const common = getTranslations<any>('common');
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    const fetchContracts = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase.from('contracts').select('*').eq('marketerId', user.id);
        if (error) throw error;
        setContracts((data || []) as Contract[]);
      } catch (error) {
        console.error('Error fetching contracts:', error);
        toast.error(shared.loadError);
      } finally {
        setLoading(false);
      }
    };
    void fetchContracts();
  }, [shared.loadError, user]);

  const getStatusColor = (status: Contract['status']) => status === 'active' ? 'bg-green-100 text-green-800' : status === 'expired' ? 'bg-red-100 text-red-800' : status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800';
  const getStatusIcon = (status: Contract['status']) => status === 'active' ? <CheckCircle2 className="h-4 w-4" /> : status === 'expired' ? <XCircle className="h-4 w-4" /> : status === 'pending' ? <Clock className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />;
  const interpolate = (template: string, values: Record<string, string>) => Object.entries(values).reduce((result, [key, value]) => result.replace(`{{${key}}}`, value), template);
  const filteredContracts = contracts.filter((contract) => contract.playerName.toLowerCase().includes(searchTerm.toLowerCase()));

  if (loading) return <div className="flex min-h-screen items-center justify-center" dir={isRTL ? 'rtl' : 'ltr'}><div className="text-center"><div className="mx-auto mb-4 h-16 w-16 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" /><p className="text-gray-600">{shared.loading}</p></div></div>;

  return (
    <div className="min-h-screen bg-gray-50 p-6" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="mb-8"><div className="mb-4 flex items-center justify-between gap-4"><button onClick={() => router.back()} className="flex items-center gap-2 text-gray-600 hover:text-gray-900"><ArrowLeft className={`h-5 w-5 ${isRTL ? 'rotate-180' : ''}`} /> {shared.back}</button><LanguageSwitcher /></div><h1 className="mb-2 text-3xl font-bold text-gray-900">{shared.title}</h1><p className="text-gray-600">{copy.subtitle}</p></div>
      <div className="mb-8 flex flex-col gap-4 sm:flex-row"><div className="relative flex-1"><Search className={`absolute top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400 ${isRTL ? 'right-3' : 'left-3'}`} /><Input type="text" placeholder={shared.searchPlaceholder} value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} className={isRTL ? 'w-full pr-12' : 'w-full pl-12'} /></div><Button onClick={() => router.push('/dashboard/marketer/contracts/new')}><Plus className="h-5 w-5" /> {shared.newContract}</Button></div>
      {filteredContracts.length === 0 ? (
        <div className="py-12 text-center"><FileText className="mx-auto mb-4 h-16 w-16 text-gray-300" /><h3 className="mb-2 text-xl font-semibold text-gray-900">{shared.emptyTitle}</h3><p className="text-gray-600">{copy.emptyDescription}</p></div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredContracts.map((contract) => (
            <motion.div key={contract.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="overflow-hidden rounded-xl bg-white shadow-lg">
              <Card><CardHeader className="pb-4"><div className="flex items-start justify-between gap-2"><CardTitle className="text-xl">{contract.playerName}</CardTitle><Badge className={getStatusColor(contract.status)}><span className="flex items-center gap-1">{getStatusIcon(contract.status)} {shared.statuses[contract.status]}</span></Badge></div></CardHeader>
                <CardContent><div className="space-y-4"><div className="flex items-center gap-2 text-gray-600"><Calendar className="h-5 w-5" /><span>{interpolate(shared.dateRange, { start: contract.startDate, end: contract.endDate })}</span></div><div className="flex items-center gap-2 text-gray-600"><DollarSign className="h-5 w-5" /><span>{interpolate(copy.salaryPerMonth, { salary: contract.salary.toLocaleString() })}</span></div><div className="flex items-center gap-2 text-gray-600"><FileText className="h-5 w-5" /><span>{shared.types[contract.type]}</span></div><div className="flex justify-end gap-2 pt-4"><Button variant="outline" size="sm" onClick={() => router.push(`/dashboard/marketer/contracts/${contract.id}`)}><Eye className="h-4 w-4" /> {shared.view}</Button><Button variant="outline" size="sm" onClick={() => router.push(`/dashboard/marketer/contracts/${contract.id}/edit`)}><Edit className="h-4 w-4" /> {shared.edit}</Button><Button variant="outline" size="sm" className="text-red-600 hover:text-red-700"><Trash2 className="h-4 w-4" /> {common.delete}</Button></div></div></CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
