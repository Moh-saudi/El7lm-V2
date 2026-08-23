/**
 * Imports GeoNames countryInfo, admin1 regions and cities1000 into Supabase.
 * Required env vars: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.
 * No credentials are written to source or client bundles.
 */
import { createReadStream, createWriteStream } from 'node:fs';
import { mkdir, readFile, rm } from 'node:fs/promises';
import { pipeline } from 'node:stream/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';
import unzipper from 'unzipper';

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !serviceRoleKey) {
  throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');
}

const client = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const workDir = path.join(tmpdir(), `el7lm-geonames-${Date.now()}`);
await mkdir(workDir, { recursive: true });

const download = async (url, target) => {
  const response = await fetch(url);
  if (!response.ok || !response.body) {
    throw new Error(`Download failed (${response.status}): ${url}`);
  }
  await pipeline(response.body, createWriteStream(target));
};

const unzipText = async (zipPath, filePattern) => {
  const chunks = [];
  await pipeline(
    createReadStream(zipPath),
    unzipper.ParseOne(filePattern),
    async function* (source) {
      for await (const chunk of source) chunks.push(chunk);
    },
  );
  return Buffer.concat(chunks).toString('utf8');
};

const upsertBatches = async (table, rows, onConflict, batchSize = 500) => {
  for (let index = 0; index < rows.length; index += batchSize) {
    const batch = rows.slice(index, index + batchSize);
    const { error } = await client.from(table).upsert(batch, { onConflict });
    if (error) throw new Error(`${table} batch ${index}: ${error.message}`);
  }
};

const flagEmoji = (iso2) => [...iso2].map((char) =>
  String.fromCodePoint(127397 + char.charCodeAt(0))).join('');
const arabicRegions = new Intl.DisplayNames(['ar'], { type: 'region' });

try {
  const countryInfoPath = path.join(workDir, 'countryInfo.txt');
  const admin1Path = path.join(workDir, 'admin1CodesASCII.txt');
  const citiesZipPath = path.join(workDir, 'cities1000.zip');
  await Promise.all([
    download('https://download.geonames.org/export/dump/countryInfo.txt', countryInfoPath),
    download('https://download.geonames.org/export/dump/admin1CodesASCII.txt', admin1Path),
    download('https://download.geonames.org/export/dump/cities1000.zip', citiesZipPath),
  ]);

  const countryRows = (await readFile(countryInfoPath, 'utf8'))
    .split(/\r?\n/)
    .filter((line) => line && !line.startsWith('#'))
    .map((line) => {
      const field = line.split('\t');
      const iso2 = field[0];
      return {
        iso2,
        iso3: field[1] || null,
        geoname_id: Number(field[16]) || null,
        name: field[4],
        name_ar: arabicRegions.of(iso2) || null,
        phone_code: field[12] ? `+${field[12].split(',')[0]}` : null,
        currency_code: field[10] || null,
        flag_emoji: flagEmoji(iso2),
        is_active: true,
        updated_at: new Date().toISOString(),
      };
    });
  await upsertBatches('location_countries', countryRows, 'iso2');

  const adminRows = (await readFile(admin1Path, 'utf8'))
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => {
      const [compoundCode, name, , geonameId] = line.split('\t');
      const separator = compoundCode.indexOf('.');
      return {
        geoname_id: Number(geonameId),
        country_iso2: compoundCode.slice(0, separator),
        admin1_code: compoundCode.slice(separator + 1),
        name,
        updated_at: new Date().toISOString(),
      };
    })
    .filter((row) => row.geoname_id && row.country_iso2.length === 2);
  await upsertBatches('location_regions', adminRows, 'geoname_id');
  const regionByCode = new Map(
    adminRows.map((row) => [`${row.country_iso2}.${row.admin1_code}`, row.geoname_id]),
  );

  const cityText = await unzipText(citiesZipPath, /cities1000\.txt$/);
  const cityRows = cityText.split(/\r?\n/).filter(Boolean).map((line) => {
    const field = line.split('\t');
    const countryIso2 = field[8];
    const admin1Code = field[10] || null;
    return {
      geoname_id: Number(field[0]),
      country_iso2: countryIso2,
      region_geoname_id: admin1Code
        ? regionByCode.get(`${countryIso2}.${admin1Code}`) ?? null
        : null,
      admin1_code: admin1Code,
      name: field[1],
      ascii_name: field[2] || null,
      latitude: Number(field[4]) || null,
      longitude: Number(field[5]) || null,
      population: Number(field[14]) || 0,
      timezone: field[17] || null,
      updated_at: new Date().toISOString(),
    };
  });
  await upsertBatches('location_cities', cityRows, 'geoname_id');
  process.stdout.write(
    `Imported ${countryRows.length} countries, ${adminRows.length} regions, ` +
    `${cityRows.length} cities.\n`,
  );
} finally {
  await rm(workDir, { recursive: true, force: true });
}
