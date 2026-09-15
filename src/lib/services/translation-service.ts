/**
 * Translation service for opportunities and platform entities
 * Translates Arabic text into en, fr, es, pt
 */

export interface TranslatedFields {
  title: string;
  description: string;
  requirements?: string;
}

export type OpportunityTranslations = Record<'en' | 'fr' | 'es' | 'pt', TranslatedFields>;

const TARGET_LANGUAGES = ['en', 'fr', 'es', 'pt'] as const;

/**
 * Translate a single text string using free high-availability translation providers
 */
export async function translateText(text: string, targetLang: string, sourceLang = 'ar'): Promise<string> {
  if (!text || !text.trim()) return '';
  if (targetLang === sourceLang) return text;

  try {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text.trim())}&langpair=${sourceLang}|${targetLang}`;
    const res = await fetch(url, {
      headers: { 'Accept': 'application/json' },
      next: { revalidate: 86400 } // cache for 24h
    });

    if (res.ok) {
      const data = await res.json();
      const translated = data?.responseData?.translatedText;
      if (translated && typeof translated === 'string' && !translated.startsWith('MYMEMORY WARNING')) {
        return translated;
      }
    }
  } catch (err) {
    console.warn(`[translateText] Failed for ${targetLang}:`, err);
  }

  return text; // Fallback to original
}

/**
 * Translate all text fields of an opportunity into all supported platform languages
 */
export async function translateOpportunityFields(
  title: string,
  description?: string | null,
  requirements?: string | null
): Promise<OpportunityTranslations> {
  const result: Partial<OpportunityTranslations> = {};

  await Promise.all(
    TARGET_LANGUAGES.map(async (lang) => {
      const [tTitle, tDesc, tReq] = await Promise.all([
        translateText(title, lang),
        description ? translateText(description, lang) : Promise.resolve(''),
        requirements ? translateText(requirements, lang) : Promise.resolve(undefined),
      ]);

      result[lang] = {
        title: tTitle || title,
        description: tDesc || (description ?? ''),
        ...(tReq ? { requirements: tReq } : {}),
      };
    })
  );

  return result as OpportunityTranslations;
}
