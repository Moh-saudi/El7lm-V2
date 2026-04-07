import { supabase } from '@/lib/supabase/config';

export interface OppsSectionData {
  isEnabled: boolean;
  titleAr: string;
  subAr: string;
  titleEn: string;
  subEn: string;
  selectedOpportunityIds?: string[];
}

const CONTENT_ID = 'opps_section';

const DEFAULT_DATA: OppsSectionData = {
  isEnabled: true,
  titleAr: 'تصفح وزد فرصك الان',
  subAr: 'تصفح الان احدث الفرص المتاحة التي يقدمها الحلم لجميع الاعبين لفرص الاحتراف الخارجي',
  titleEn: 'Browse and Increase Your Opportunities',
  subEn: 'Browse now the latest opportunities offered by El7lm for all players to play professionally abroad',
  selectedOpportunityIds: []
};

export async function getOppsSection(): Promise<OppsSectionData> {
  try {
    const { data, error } = await supabase
      .from('content')
      .select('items')
      .eq('id', CONTENT_ID)
      .maybeSingle();
    
    if (error || !data) return DEFAULT_DATA;
    return (data.items as OppsSectionData) || DEFAULT_DATA;
  } catch (error) {
    console.error('Error fetching Opportunities Section params:', error);
    return DEFAULT_DATA;
  }
}

export async function saveOppsSection(data: OppsSectionData): Promise<boolean> {
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
    console.error('Error saving Opportunities Section params:', error);
    return false;
  }
}
