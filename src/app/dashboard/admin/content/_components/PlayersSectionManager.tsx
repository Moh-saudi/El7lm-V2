'use client';

import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { Save, Check, X } from 'lucide-react';
import { getPlayersSection, savePlayersSection, PlayersSectionData } from '@/lib/content/players-section-service';
import { supabase } from '@/lib/supabase/config';

interface PlayerLite {
  id: string;
  name: string;
  position: string;
  avatar: string;
  country: string;
}

export default function PlayersSectionManager() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [availablePlayers, setAvailablePlayers] = useState<PlayerLite[]>([]);
  const [data, setData] = useState<PlayersSectionData>({
    isEnabled: true,
    titleAr: '',
    subAr: '',
    titleEn: '',
    subEn: '',
    selectedPlayerIds: []
  });

  const [filterType, setFilterType] = useState<'all' | 'completed'>('completed');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await getPlayersSection();
      
      const { data: playersData, error: playersErr } = await supabase
        .from('players')
        .select(`id, full_name, name, displayName, primary_position, position, profile_image, avatar, country, isDeleted`);

      const { data: usersData, error: usersErr } = await supabase
        .from('users')
        .select(`id, full_name, name, displayName, primary_position, position, profile_image, avatar, country, isDeleted`)
        .eq('accountType', 'player');

      const playersMap = new Map<string, PlayerLite>();

      const getImageUrl = (img: any): string => {
        if (!img) return '';
        let url = '';
        if (typeof img === 'string') url = img;
        else if (Array.isArray(img) && img.length > 0) return getImageUrl(img[0]);
        else if (typeof img === 'object') url = img.url || img.path || img.src || '';
        
        if (url && url.includes('supabase.co/storage/v1/object/public/')) {
          const parts = url.split('supabase.co/storage/v1/object/public/');
          if (parts.length === 2) {
            const r2Url = process.env.NEXT_PUBLIC_CLOUDFLARE_R2_PUBLIC_URL || 'https://pub-d4c7563dad1f41f3adf319c6a25a5f44.r2.dev';
            url = `${r2Url}/${parts[1]}`;
          }
        } else if (url && url.includes('ekyerljzfokqimbabzxm.supabase.co')) {
          url = url.replace('https://ekyerljzfokqimbabzxm.supabase.co/storage/v1/object/public/', 'https://pub-d4c7563dad1f41f3adf319c6a25a5f44.r2.dev/');
        }
        return url;
      };

      (playersData || []).forEach(p => {
        if (!p.isDeleted) {
          playersMap.set(p.id, {
            id: p.id,
            name: p.full_name || p.displayName || p.name || 'بدون اسم',
            position: p.primary_position || p.position || 'غير محدد',
            avatar: getImageUrl(p.profile_image) || getImageUrl(p.avatar),
            country: p.country || ''
          });
        }
      });

      (usersData || []).forEach(p => {
        if (!p.isDeleted && !playersMap.has(p.id)) {
          playersMap.set(p.id, {
            id: p.id,
            name: p.full_name || p.displayName || p.name || 'بدون اسم',
            position: p.primary_position || p.position || 'غير محدد',
            avatar: getImageUrl(p.profile_image) || getImageUrl(p.avatar),
            country: p.country || ''
          });
        }
      });

      setAvailablePlayers(Array.from(playersMap.values()));
      setData({ ...res, selectedPlayerIds: res.selectedPlayerIds || [] });
    } catch (error) {
      toast.error('حدث خطأ أثناء تحميل بيانات قسم اللاعبين');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const success = await savePlayersSection(data);
      if (success) {
        toast.success('تم حفظ بيانات قسم اللاعبين بنجاح');
      } else {
        throw new Error('Failed to save');
      }
    } catch (error) {
      toast.error('حدث خطأ أثناء الحفظ');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setData((prev) => ({ ...prev, [name]: value }));
  };

  const toggleEnabled = () => {
    setData((prev) => ({ ...prev, isEnabled: !prev.isEnabled }));
  };

  const togglePlayer = (id: string) => {
    setData(prev => {
      const selected = prev.selectedPlayerIds || [];
      if (selected.includes(id)) {
        return { ...prev, selectedPlayerIds: selected.filter(pid => pid !== id) };
      } else {
        if (selected.length >= 8) {
          toast.error('يمكنك اختيار 8 لاعبين كحد أقصى للظهور في الصفحة الرئيسية');
          return prev;
        }
        return { ...prev, selectedPlayerIds: [...selected, id] };
      }
    });
  };

  if (loading) {
    return <div className="text-center p-8">جاري التحميل...</div>;
  }

  const filteredPlayers = availablePlayers.filter(p => {
    if (filterType === 'completed') {
      return p.avatar && p.name !== 'بدون اسم' && p.position !== 'غير محدد';
    }
    return true;
  });

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-800 dark:text-white">إعدادات قسم أبرز المواهب</h2>
        <div className="flex items-center gap-4">
          <button
            onClick={toggleEnabled}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
              data.isEnabled 
                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
                : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
            }`}
          >
            {data.isEnabled ? <><Check size={18} /> مفعل</> : <><X size={18} /> معطل</>}
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
          >
            <Save size={18} />
            {saving ? 'جاري الحفظ...' : 'حفظ التغييرات'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-slate-700 dark:text-gray-200 border-b pb-2">النصوص (عربي)</h3>
          
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">
              العنوان الرئيسي
            </label>
            <input
              type="text"
              name="titleAr"
              value={data.titleAr}
              onChange={handleChange}
              className="w-full p-2 border border-slate-300 dark:border-gray-600 rounded bg-white dark:bg-[#0b1120] text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">
              النص الفرعي (الوصف)
            </label>
            <textarea
              name="subAr"
              value={data.subAr}
              onChange={handleChange}
              rows={3}
              className="w-full p-2 border border-slate-300 dark:border-gray-600 rounded bg-white dark:bg-[#0b1120] text-slate-900 dark:text-white"
            />
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-bold text-slate-700 dark:text-gray-200 border-b pb-2">النصوص (إنجليزي)</h3>
          
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">
              العنوان الرئيسي
            </label>
            <input
              type="text"
              name="titleEn"
              value={data.titleEn}
              onChange={handleChange}
              dir="ltr"
              className="w-full p-2 border border-slate-300 dark:border-gray-600 rounded bg-white dark:bg-[#0b1120] text-slate-900 dark:text-white text-left"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">
              النص الفرعي (الوصف)
            </label>
            <textarea
              name="subEn"
              value={data.subEn}
              onChange={handleChange}
              rows={3}
              dir="ltr"
              className="w-full p-2 border border-slate-300 dark:border-gray-600 rounded bg-white dark:bg-[#0b1120] text-slate-900 dark:text-white text-left"
            />
          </div>
        </div>
      </div>

      <div className="space-y-4 mt-8 pt-8 border-t border-slate-200 dark:border-white/10">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-700 dark:text-gray-200">اختر اللاعبين للظهور (بحد أقصى 8)</h3>
            <p className="text-sm text-slate-500 dark:text-gray-400">هؤلاء اللاعبون سيظهرون كأبرز المواهب في الصفحة الرئيسية.</p>
          </div>
          <div className="flex bg-slate-100 dark:bg-[#0b1120] rounded-lg p-1 border border-slate-200 dark:border-gray-700">
            <button
              onClick={() => setFilterType('completed')}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${
                filterType === 'completed' 
                  ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm' 
                  : 'text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-gray-200'
              }`}
            >
              مكتملي البيانات بصورة
            </button>
            <button
              onClick={() => setFilterType('all')}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${
                filterType === 'all' 
                  ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm' 
                  : 'text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-gray-200'
              }`}
            >
              الكل
            </button>
          </div>
        </div>
        
        {filteredPlayers.length === 0 ? (
          <p className="text-slate-500 text-center py-4 bg-slate-50 dark:bg-white/5 rounded-lg">لا يوجد لاعبين متاحين بناءً على التصنيف الحالي.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 max-h-[500px] overflow-y-auto p-2">
            {filteredPlayers.map((player) => (
              <div 
                key={player.id} 
                onClick={() => togglePlayer(player.id)}
                className={`flex gap-3 p-3 border rounded-xl cursor-pointer transition-all ${
                  (data.selectedPlayerIds || []).includes(player.id)
                    ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-900/20 shadow-sm'
                    : 'border-slate-200 dark:border-gray-700 hover:border-slate-300 hover:bg-slate-50 dark:hover:bg-white/5'
                }`}
              >
                <img 
                  src={player.avatar || '/images/default-avatar.png'} 
                  alt={player.name} 
                  className="w-12 h-12 rounded-full object-cover shrink-0 bg-slate-200"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start">
                    <h4 className="font-bold text-sm text-slate-800 dark:text-gray-100 truncate">{player.name}</h4>
                    <div className={`w-4 h-4 mt-0.5 rounded flex items-center justify-center shrink-0 ${
                      (data.selectedPlayerIds || []).includes(player.id) ? 'bg-blue-500 text-white' : 'border border-slate-300 dark:border-gray-600'
                    }`}>
                      {(data.selectedPlayerIds || []).includes(player.id) && <Check size={12} />}
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-gray-400 truncate">{player.position}</p>
                  <p className="text-xs text-slate-500 dark:text-gray-400 truncate mt-1">{player.country}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
