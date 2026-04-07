'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import {
  FileText,
  Calendar,
  DollarSign,
  Clock,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Plus,
  Search,
  Filter,
  Download,
  Eye,
  Edit,
  Trash2,
  ArrowLeft
} from 'lucide-react';
import { supabase } from '@/lib/supabase/config';
import { useAuth } from '@/lib/firebase/auth-provider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

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
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string[]>([]);
  const [selectedType, setSelectedType] = useState<string[]>([]);

  useEffect(() => {
    if (!user || !userData || !userData.clubId) {
      setLoading(false);
      return;
    }

    fetchContracts();
  }, [user, userData]);

  const fetchContracts = async () => {
    try {
      setLoading(true);
      const { data: contractsData } = await supabase
        .from('contracts')
        .select('*')
        .eq('clubId', userData?.clubId);

      setContracts((contractsData || []) as Contract[]);
    } catch (error) {
      console.error('Error fetching contracts:', error);
      toast.error('حدث خطأ أثناء جلب بيانات العقود');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'expired':
        return 'bg-red-100 text-red-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'terminated':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle2 className="w-4 h-4" />;
      case 'expired':
        return <XCircle className="w-4 h-4" />;
      case 'pending':
        return <Clock className="w-4 h-4" />;
      case 'terminated':
        return <AlertCircle className="w-4 h-4" />;
      default:
        return null;
    }
  };

  const filteredContracts = contracts.filter(contract => {
    const matchesSearch = contract.playerName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = selectedStatus.length === 0 || selectedStatus.includes(contract.status);
    const matchesType = selectedType.length === 0 || selectedType.includes(contract.type);
    return matchesSearch && matchesStatus && matchesType;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 border-4 border-blue-200 rounded-full border-t-blue-600 animate-spin"></div>
          <p className="text-gray-600">جاري تحميل العقود...</p>
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
        <h1 className="text-3xl font-bold text-gray-900 mb-2">إدارة العقود</h1>
        <p className="text-gray-600">إدارة عقود اللاعبين والموظفين</p>
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
        <Button
          onClick={() => router.push('/dashboard/club/contracts/new')}
          className="flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          عقد جديد
        </Button>
      </div>

      {/* Contracts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredContracts.map((contract) => (
          <motion.div
            key={contract.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl shadow-lg overflow-hidden"
          >
            <Card>
              <CardHeader className="pb-4">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-xl">{contract.playerName}</CardTitle>
                  <Badge className={getStatusColor(contract.status)}>
                    <span className="flex items-center gap-1">
                      {getStatusIcon(contract.status)}
                      {contract.status === 'active' ? 'نشط' :
                       contract.status === 'expired' ? 'منتهي' :
                       contract.status === 'pending' ? 'قيد الانتظار' : 'ملغي'}
                    </span>
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-gray-600">
                    <Calendar className="w-5 h-5" />
                    <span>من {contract.startDate} إلى {contract.endDate}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <DollarSign className="w-5 h-5" />
                    <span>{contract.salary?.toLocaleString()} / شهر</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <FileText className="w-5 h-5" />
                    <span>
                      {contract.type === 'full' ? 'عقد كامل' :
                       contract.type === 'loan' ? 'إعارة' : 'ناشئين'}
                    </span>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button variant="outline" size="sm" className="flex-1">
                      <Eye className="w-4 h-4 ml-1" /> عرض
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1">
                      <Edit className="w-4 h-4 ml-1" /> تعديل
                    </Button>
                    <Button variant="outline" size="sm" className="text-red-600 hover:bg-red-50">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {filteredContracts.length === 0 && (
        <div className="bg-white rounded-xl p-12 text-center shadow">
          <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-700 mb-2">لا توجد عقود</h3>
          <p className="text-gray-500 mb-4">لم يتم إضافة أي عقود بعد.</p>
          <Button onClick={() => router.push('/dashboard/club/contracts/new')}>
            <Plus className="w-4 h-4 ml-2" />
            إضافة عقد جديد
          </Button>
        </div>
      )}
    </div>
  );
}
