import { supabase } from '@/lib/supabase/config';
import ar from '@/lib/i18n/locales/ar.json';
import en from '@/lib/i18n/locales/en.json';
import es from '@/lib/i18n/locales/es.json';
import pt from '@/lib/i18n/locales/pt.json';

export interface AiFeature {
  title: string;
  desc: string;
  color: string;
  icon: string;
}

export interface AiSectionLocale {
  badge: string;
  title: string;
  desc: string;
  features: AiFeature[];
}

export interface AiSectionData {
  ar: AiSectionLocale;
  en: AiSectionLocale;
  es: AiSectionLocale;
  pt: AiSectionLocale;
}

const CONTENT_ID = 'ai_section';

const createDefaultLocale = (translations: any): AiSectionLocale => ({
  badge: translations.homePage.copy.aiVideoBadge,
  title: translations.homePage.copy.aiVideoTitle,
  desc: translations.homePage.copy.aiVideoDesc,
  features: translations.homePage.copy.aiVideoFeatures,
});

const DEFAULT_DATA: AiSectionData = {
  ar: createDefaultLocale(ar),
  en: createDefaultLocale(en),
  es: createDefaultLocale(es),
  pt: createDefaultLocale(pt),
};

const mergeLocale = (base: AiSectionLocale, value?: Partial<AiSectionLocale>): AiSectionLocale => ({
  ...base,
  ...(value || {}),
  features: Array.isArray(value?.features) && value.features.length > 0 ? value.features : base.features,
});

const normalizeAiSection = (value: any): AiSectionData => {
  if (!value) return DEFAULT_DATA;

  if (value.ar || value.en || value.es || value.pt) {
    return {
      ar: mergeLocale(DEFAULT_DATA.ar, value.ar),
      en: mergeLocale(DEFAULT_DATA.en, value.en),
      es: mergeLocale(DEFAULT_DATA.es, value.es),
      pt: mergeLocale(DEFAULT_DATA.pt, value.pt),
    };
  }

  // Legacy records were a single Arabic object. Preserve them as Arabic and
  // use the central translations as defaults for the other languages.
  return {
    ...DEFAULT_DATA,
    ar: mergeLocale(DEFAULT_DATA.ar, value),
  };
};

export async function getAiSection(): Promise<AiSectionData> {
  try {
    const { data, error } = await supabase
      .from('content')
      .select('items')
      .eq('id', CONTENT_ID)
      .maybeSingle();

    if (error || !data) return DEFAULT_DATA;
    return normalizeAiSection(data.items);
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
        items: data,
      });

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error saving AI section:', error);
    return false;
  }
}
