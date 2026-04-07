import { supabase } from '../supabase/config';

export interface PlayersSectionData {
  isEnabled: boolean;
  titleAr: string;
  subAr: string;
  titleEn: string;
  subEn: string;
  selectedPlayerIds?: string[];
}

const CONTENT_ID = 'players_section';

const DEFAULT_DATA: PlayersSectionData = {
  isEnabled: true,
  titleAr: 'أبرز المواهب المسجلة',
  subAr: 'شاهد بعض من أفضل اللاعبين الذين انضموا لمنصة الحلم مؤخراً',
  titleEn: 'Top Registered Talents',
  subEn: 'See some of the best players who recently joined El7lm platform',
  selectedPlayerIds: []
};

export async function getPlayersSection(): Promise<PlayersSectionData> {
  const { data, error } = await supabase
    .from('content')
    .select('items')
    .eq('id', CONTENT_ID)
    .maybeSingle();

  if (error || !data) {
    return DEFAULT_DATA;
  }

  return { ...DEFAULT_DATA, ...(data.items as Partial<PlayersSectionData>) };
}

export async function savePlayersSection(data: PlayersSectionData): Promise<boolean> {
  const { error } = await supabase
    .from('content')
    .upsert({ id: CONTENT_ID, items: data });

  if (error) {
    console.error('Error saving players section:', error);
    return false;
  }

  return true;
}
