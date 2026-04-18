import { supabase } from '@/lib/supabase/config';

export interface StoreHighlight {
  title: string;
  desc: string;
}

export interface StoreSectionData {
  isEnabled: boolean;
  badgeAr: string;
  badgeEn: string;
  titleAr: string;
  titleEn: string;
  subAr: string;
  subEn: string;
  ctaAr: string;
  ctaEn: string;
  secondaryAr: string;
  secondaryEn: string;
  highlightsAr: StoreHighlight[];
  highlightsEn: StoreHighlight[];
  selectedProductIds?: string[];
  maxItems?: number;
}

const CONTENT_ID = 'store_section';

function looksMojibake(value?: string | null) {
  if (!value) return false;
  return /[ØÙÃÂ]/.test(value);
}

const DEFAULT_DATA: StoreSectionData = {
  isEnabled: true,
  badgeAr: 'المتجر المشترك + التقسيط',
  badgeEn: 'Shared Store + Installments',
  titleAr: 'المتجر الرياضي',
  titleEn: 'Sports Store',
  subAr:
    'قسم مخصص لبيع المنتجات والخدمات الرياضية لكل أنواع الحسابات، مع إبراز خيارات الدفع المرنة والتقسيط.',
  subEn:
    'A dedicated section for selling sports products and services to all account types, with flexible payment choices and installments highlighted.',
  ctaAr: 'ادخل المتجر',
  ctaEn: 'Enter The Store',
  secondaryAr: 'اعرف خيارات الدفع',
  secondaryEn: 'Explore Payment Options',
  highlightsAr: [
    {
      title: 'متجر واحد للجميع',
      desc: 'اللاعبون والأندية والأكاديميات وبقية الحسابات يمكنها تصفح نفس المتجر وإرسال الطلبات.',
    },
    {
      title: 'دفع مباشر واحترافي',
      desc: 'ادعم البطاقات والمحافظ الرقمية عبر Geidea و SkipCash والحلول المحلية.',
    },
    {
      title: 'ميزة التقسيط',
      desc: 'أبرز عروضك مع خيارات تقسيط مثل Tamara و Tabby لتقليل الحاجز أمام الشراء.',
    },
  ],
  highlightsEn: [
    {
      title: 'One Store For Everyone',
      desc: 'Players, clubs, academies, and all other account types can browse the same store and submit orders.',
    },
    {
      title: 'Professional Payment Methods',
      desc: 'Support cards and digital wallets through Geidea, SkipCash, and regional payment methods.',
    },
    {
      title: 'Installments As A Sales Advantage',
      desc: 'Highlight installment options like Tamara and Tabby to reduce friction and increase conversion.',
    },
  ],
  selectedProductIds: [],
  maxItems: 6,
};

export async function getStoreSection(): Promise<StoreSectionData> {
  try {
    const { data, error } = await supabase
      .from('content')
      .select('items')
      .eq('id', CONTENT_ID)
      .maybeSingle();

    if (error || !data) return DEFAULT_DATA;

    const merged = { ...DEFAULT_DATA, ...((data.items as Partial<StoreSectionData>) || {}) };

    return {
      ...merged,
      badgeAr: looksMojibake(merged.badgeAr) ? DEFAULT_DATA.badgeAr : merged.badgeAr,
      titleAr: looksMojibake(merged.titleAr) ? DEFAULT_DATA.titleAr : merged.titleAr,
      subAr: looksMojibake(merged.subAr) ? DEFAULT_DATA.subAr : merged.subAr,
      ctaAr: looksMojibake(merged.ctaAr) ? DEFAULT_DATA.ctaAr : merged.ctaAr,
      secondaryAr: looksMojibake(merged.secondaryAr) ? DEFAULT_DATA.secondaryAr : merged.secondaryAr,
      highlightsAr: Array.isArray(merged.highlightsAr)
        ? merged.highlightsAr.map((item, index) => ({
            title: looksMojibake(item?.title) ? DEFAULT_DATA.highlightsAr[index]?.title || '' : item?.title || '',
            desc: looksMojibake(item?.desc) ? DEFAULT_DATA.highlightsAr[index]?.desc || '' : item?.desc || '',
          }))
        : DEFAULT_DATA.highlightsAr,
    };
  } catch (error) {
    console.error('Error fetching Store Section:', error);
    return DEFAULT_DATA;
  }
}

export async function saveStoreSection(data: StoreSectionData): Promise<boolean> {
  try {
    const { error } = await supabase.from('content').upsert({
      id: CONTENT_ID,
      items: data,
    });

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error saving Store Section:', error);
    return false;
  }
}
