import { supabase } from '@/lib/supabase/config';

export interface AiFeature {
  title: string;
  desc: string;
  color: string;
  icon: string;
}

export interface AiSectionData {
  badge: string;
  title: string;
  desc: string;
  features: AiFeature[];
}

const CONTENT_ID = 'ai_section';

const DEFAULT_DATA: AiSectionData = {
  badge: 'التحليل بالذكاء الاصطناعي',
  title: 'كاميرات الملاعب، الآن في جيبك.',
  desc: 'لا تحتاج إلى أطقم تصوير، أو معدات معقدة. ارسم لنفسك مساراً احترافياً بمجرد رفع فيديو أداء لكابنتك وتحليله بدقة عالية عبر الذكاء الاصطناعي الذي يحدد نقاط قوتك ونقاط تحسينك.',
  features: [
    { title: 'دقة التحليل 99%', desc: 'نموذج مطور خصيصاً باستخدام ملايين البيانات الخاصة بالمباريات الحقيقية للوصول لدقة كشاف حقيقي.', color: '#bdc4ef', icon: 'auto_graph' },
    { title: 'اكتشاف المهارات', desc: 'تحليل التمريرات، السرعة، التسديد، التمركز الفني، وحتى حركة الجسم بدون كرة.', color: '#fdba45', icon: 'model_training' },
    { title: 'ربط مباشر بالكشافين', desc: 'الكشاف لا يقرأ سيرتك فقط، بل يرى تحليل المهارات الرياضية مثبتة بالأرقام والفيديو.', color: '#84d993', icon: 'track_changes' }
  ]
};

export async function getAiSection(): Promise<AiSectionData> {
  try {
    const { data, error } = await supabase
      .from('content')
      .select('items')
      .eq('id', CONTENT_ID)
      .maybeSingle();
    
    if (error || !data) return DEFAULT_DATA;
    return (data.items as AiSectionData) || DEFAULT_DATA;
  } catch (error) {
    console.error('Error fetching AI Section:', error);
    return DEFAULT_DATA;
  }
}

export async function saveAiSection(data: AiSectionData): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('content')
      .upsert({
        id: CONTENT_ID,
        items: data
      });
    
    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error saving AI section:', error);
    return false;
  }
}
