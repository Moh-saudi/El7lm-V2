const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

const TARGET_LANGS = ['en', 'fr', 'es', 'pt'];

async function translateText(text, targetLang) {
  if (!text || !text.trim()) return '';
  try {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text.trim())}&langpair=ar|${targetLang}`;
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      const val = data?.responseData?.translatedText;
      if (val && !val.startsWith('MYMEMORY WARNING')) return val;
    }
  } catch (e) {
    console.error(`Error translating to ${targetLang}:`, e.message);
  }
  return text;
}

async function run() {
  console.log('🚀 Starting translation of existing opportunities...');
  const { data: opps, error } = await supabase.from('opportunities').select('*');
  if (error) {
    console.error('Failed to fetch opportunities:', error);
    process.exit(1);
  }

  console.log(`Found ${opps.length} opportunities in database.`);

  for (const opp of opps) {
    console.log(`\nTranslating [${opp.id}]: "${opp.title}"...`);
    const translations = opp.metadata?.translations || {};

    for (const lang of TARGET_LANGS) {
      if (!translations[lang]?.title) {
        process.stdout.write(` -> translating to ${lang}... `);
        const [tTitle, tDesc] = await Promise.all([
          translateText(opp.title, lang),
          opp.description ? translateText(opp.description, lang) : Promise.resolve(''),
        ]);
        translations[lang] = {
          title: tTitle,
          description: tDesc,
        };
        console.log(`done (${tTitle.slice(0, 30)}...).`);
        await new Promise((resolve) => setTimeout(resolve, 300));
      } else {
        console.log(` -> already has ${lang}.`);
      }
    }

    const updatedMetadata = {
      ...(opp.metadata || {}),
      translations,
    };

    const { error: updateError } = await supabase
      .from('opportunities')
      .update({ metadata: updatedMetadata, updatedAt: new Date().toISOString() })
      .eq('id', opp.id);

    if (updateError) {
      console.error(`❌ Failed to update opportunity ${opp.id}:`, updateError);
    } else {
      console.log(`✅ Successfully updated [${opp.id}] with translations!`);
    }
  }

  console.log('\n🎉 All existing opportunities translated successfully!');
}

run().catch(console.error);
