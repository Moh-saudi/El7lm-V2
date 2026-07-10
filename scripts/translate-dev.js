const fs = require('fs');
const path = require('path');

const localesDir = path.join(__dirname, '../src/lib/i18n/locales');
const arPath = path.join(localesDir, 'ar.json');

// Supported target languages
const targets = ['en', 'es', 'pt'];

// Helper to delay between requests to avoid rate limits
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Free Google Translate Endpoint (Keyless)
async function translateText(text, targetLang) {
  if (!text || typeof text !== 'string') return text;
  
  // If it's a number, percentage, or URL, don't translate
  if (/^\d+(\.\d+)?%?$/.test(text.trim()) || text.trim().startsWith('http')) {
    return text;
  }

  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=ar&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;
  
  try {
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }
    const json = await res.json();
    if (json && json[0] && json[0][0] && json[0][0][0]) {
      return json[0][0][0];
    }
    return text;
  } catch (error) {
    console.error(`❌ Failed to translate "${text}" to ${targetLang}:`, error.message);
    return text; // Fallback to original text
  }
}

// Recursively translate JSON object
async function translateObject(obj, targetLang, existingObj = {}, pathPrefix = '') {
  const result = { ...existingObj };

  for (const key of Object.keys(obj)) {
    const value = obj[key];
    const currentPath = pathPrefix ? `${pathPrefix}.${key}` : key;

    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      // If it's a nested object, translate recursively
      result[key] = await translateObject(
        value, 
        targetLang, 
        existingObj[key] || {}, 
        currentPath
      );
    } else if (Array.isArray(value)) {
      // If it's an array of strings or objects
      const existingArray = Array.isArray(existingObj[key]) ? existingObj[key] : [];
      result[key] = [];
      
      for (let i = 0; i < value.length; i++) {
        const item = value[i];
        if (typeof item === 'object' && item !== null) {
          result[key][i] = await translateObject(
            item, 
            targetLang, 
            existingArray[i] || {}, 
            `${currentPath}[${i}]`
          );
        } else if (typeof item === 'string') {
          if (existingArray[i]) {
            result[key][i] = existingArray[i]; // Keep existing translation
          } else {
            console.log(`Translating array item: [${targetLang}] ${item}`);
            result[key][i] = await translateText(item, targetLang);
            await delay(100); // polite delay
          }
        } else {
          result[key][i] = item;
        }
      }
    } else if (typeof value === 'string') {
      // If it's a string, translate it if not already translated
      if (existingObj[key] && existingObj[key] !== value) {
        // Keeps manually corrected or previously translated strings
        result[key] = existingObj[key];
      } else {
        console.log(`Translating: [${targetLang}] ${currentPath} -> "${value}"`);
        result[key] = await translateText(value, targetLang);
        await delay(100); // polite delay
      }
    } else {
      result[key] = value;
    }
  }

  return result;
}

async function run() {
  console.log('🚀 Starting developer auto-translation process...');
  
  if (!fs.existsSync(arPath)) {
    console.error(`❌ Source Arabic file not found at: ${arPath}`);
    process.exit(1);
  }

  const arSource = JSON.parse(fs.readFileSync(arPath, 'utf8'));

  for (const lang of targets) {
    const langPath = path.join(localesDir, `${lang}.json`);
    let existingTranslations = {};

    if (fs.existsSync(langPath)) {
      try {
        existingTranslations = JSON.parse(fs.readFileSync(langPath, 'utf8'));
        console.log(`\nFound existing translations for: ${lang}.json. Will only translate missing keys.`);
      } catch (e) {
        console.log(`\nWarning: Could not parse ${lang}.json. Overwriting file.`);
      }
    } else {
      console.log(`\nCreating new translation file for: ${lang}.json`);
    }

    console.log(`\n--- Translating to [${lang.toUpperCase()}] ---`);
    const translated = await translateObject(arSource, lang, existingTranslations);
    
    fs.writeFileSync(langPath, JSON.stringify(translated, null, 2), 'utf8');
    console.log(`✅ Completed and saved ${lang}.json`);
  }

  console.log('\n🎉 Auto-translation completed successfully for all target languages!');
}

run();
