-- ==============================================================================
-- Phase 10.3: Safe Canonical Identity Population Commit
-- Project: El7lm-V2 / Hagzz
-- File: docs/review/phase10-3-population-commit.sql
-- Generated At: 2026-09-25T21:40:50.965Z
-- Execution Mode: Strictly Atomic Transaction — Rollback on ANY assertion failure
-- Operation: Scoped Column Population for public.users
-- Baseline Target: 8 verified tables, 2,623 accounts
-- ==============================================================================

BEGIN;

-- ------------------------------------------------------------------------------
-- STEP 1: Pre-Execution Safety Invariant Checks (8 Baseline Tables)
-- ------------------------------------------------------------------------------
DO $$
DECLARE
  v_users_count INT;
  v_players_count INT;
  v_clubs_count INT;
  v_academies_count INT;
  v_trainers_count INT;
  v_agents_count INT;
  v_marketers_count INT;
  v_admins_count INT;
  v_total_count INT;
BEGIN
  SELECT count(*) INTO v_users_count FROM public.users;
  IF v_users_count != 1357 THEN
    RAISE EXCEPTION 'Pre-flight check failed: public.users count expected 1357, got %', v_users_count;
  END IF;

  SELECT count(*) INTO v_players_count FROM public.players;
  IF v_players_count != 1079 THEN
    RAISE EXCEPTION 'Pre-flight check failed: public.players count expected 1079, got %', v_players_count;
  END IF;

  SELECT count(*) INTO v_clubs_count FROM public.clubs;
  IF v_clubs_count != 39 THEN
    RAISE EXCEPTION 'Pre-flight check failed: public.clubs count expected 39, got %', v_clubs_count;
  END IF;

  SELECT count(*) INTO v_academies_count FROM public.academies;
  IF v_academies_count != 39 THEN
    RAISE EXCEPTION 'Pre-flight check failed: public.academies count expected 39, got %', v_academies_count;
  END IF;

  SELECT count(*) INTO v_trainers_count FROM public.trainers;
  IF v_trainers_count != 50 THEN
    RAISE EXCEPTION 'Pre-flight check failed: public.trainers count expected 50, got %', v_trainers_count;
  END IF;

  SELECT count(*) INTO v_agents_count FROM public.agents;
  IF v_agents_count != 29 THEN
    RAISE EXCEPTION 'Pre-flight check failed: public.agents count expected 29, got %', v_agents_count;
  END IF;

  SELECT count(*) INTO v_marketers_count FROM public.marketers;
  IF v_marketers_count != 27 THEN
    RAISE EXCEPTION 'Pre-flight check failed: public.marketers count expected 27, got %', v_marketers_count;
  END IF;

  SELECT count(*) INTO v_admins_count FROM public.admins;
  IF v_admins_count != 3 THEN
    RAISE EXCEPTION 'Pre-flight check failed: public.admins count expected 3, got %', v_admins_count;
  END IF;

  v_total_count := v_users_count + v_players_count + v_clubs_count + v_academies_count +
                   v_trainers_count + v_agents_count + v_marketers_count + v_admins_count;
  IF v_total_count != 2623 THEN
    RAISE EXCEPTION 'Pre-flight check failed: total accounts across 8 tables expected 2623, got %', v_total_count;
  END IF;

  RAISE NOTICE 'Pre-flight baseline checks passed: exactly 2,623 records across 8 verified tables.';
END $$;

-- ------------------------------------------------------------------------------
-- STEP 2: Pre-Update Snapshot Capture for Accurate Delta Accounting
-- ------------------------------------------------------------------------------
CREATE TEMP TABLE _phase10_pre_state ON COMMIT DROP AS
SELECT id, supabase_uid, phone_e164, country_code
FROM public.users;

-- ------------------------------------------------------------------------------
-- STEP 3: Manifest-Driven Atomic UPDATE Statements (1088 accounts)
-- Scoped strictly to WHERE id = <users.id> with No-Overwrite Guards
-- ------------------------------------------------------------------------------

UPDATE public.users SET country_code = '+20' WHERE id = 'qWQfgalM1vgLtbyjHvew6aVv3tH2' AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201013714944', country_code = '+20' WHERE id = 'qZfIOur8FTcNb3oEEl6LH24uMS43' AND (phone_e164 IS NULL OR phone_e164 = '+201013714944') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+9741550750661', country_code = '+974' WHERE id = 'qbCcdxWlx4S7kaupO97XP9Hi66v1' AND (phone_e164 IS NULL OR phone_e164 = '+9741550750661') AND (country_code IS NULL OR country_code = '+974');
UPDATE public.users SET phone_e164 = '+20102546196', country_code = '+20' WHERE id = 'qhAtfyjq4ufwcFLgQaEgoISsbT82' AND (phone_e164 IS NULL OR phone_e164 = '+20102546196') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+212773220551', country_code = '+212' WHERE id = 'qjO2AGuhAwbXF8E6iliiUFw3A1u2' AND (phone_e164 IS NULL OR phone_e164 = '+212773220551') AND (country_code IS NULL OR country_code = '+212');
UPDATE public.users SET phone_e164 = '+97433423370', country_code = '+974' WHERE id = 'qmtxAndV8CfiuTE4C9WBvxHybna2' AND (phone_e164 IS NULL OR phone_e164 = '+97433423370') AND (country_code IS NULL OR country_code = '+974');
UPDATE public.users SET phone_e164 = '+20109831918', country_code = '+20' WHERE id = 'qpzGtUwptqfGMu97EXIDpw95bRj2' AND (phone_e164 IS NULL OR phone_e164 = '+20109831918') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+212673890155', country_code = '+212' WHERE id = 'qsjhkfyIHEdZelPnWFIG6Y0FLpo2' AND (phone_e164 IS NULL OR phone_e164 = '+212673890155') AND (country_code IS NULL OR country_code = '+212');
UPDATE public.users SET phone_e164 = '+201154440480', country_code = '+20' WHERE id = 'r3wkefq30ifrujszxENxggJABdv2' AND (phone_e164 IS NULL OR phone_e164 = '+201154440480') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+96555482547688', country_code = '+965' WHERE id = 'r4DLmOreSPNI4Xkw4ez0JvErrwu2' AND (phone_e164 IS NULL OR phone_e164 = '+96555482547688') AND (country_code IS NULL OR country_code = '+965');
UPDATE public.users SET phone_e164 = '+201028853677', country_code = '+20' WHERE id = 'rRyje9JYZQP741CrTJGleeKN2w42' AND (phone_e164 IS NULL OR phone_e164 = '+201028853677') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201093624088', country_code = '+20' WHERE id = 'rVVgbTKBPefv0QfGr0FDEiDj6l13' AND (phone_e164 IS NULL OR phone_e164 = '+201093624088') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201028596237', country_code = '+20' WHERE id = 'rXsYqxRkfrc1ASXBMrOubnx6E013' AND (phone_e164 IS NULL OR phone_e164 = '+201028596237') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+9741016115093', country_code = '+974' WHERE id = 'rbk7UyZ1sSXE5inPJAaRH1mQPxw2' AND (phone_e164 IS NULL OR phone_e164 = '+9741016115093') AND (country_code IS NULL OR country_code = '+974');
UPDATE public.users SET supabase_uid = '323a0db7-b3c0-4023-a64b-2810066b43b3'::uuid, phone_e164 = '+201200127156', country_code = '+20' WHERE id = '323a0db7-b3c0-4023-a64b-2810066b43b3' AND (supabase_uid IS NULL OR supabase_uid = '323a0db7-b3c0-4023-a64b-2810066b43b3'::uuid) AND (phone_e164 IS NULL OR phone_e164 = '+201200127156') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET country_code = '+20' WHERE id = 'qyADQuQ3tgP0eyda5u3RHirHkv63' AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET country_code = '+20' WHERE id = 'reFtNURHmiPaDYyZAPSmfnhXAGy2' AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201207109370', country_code = '+20' WHERE id = 'reRMWJ0K5keN7gUDxTCUXiaH6Wk2' AND (phone_e164 IS NULL OR phone_e164 = '+201207109370') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+212782093843', country_code = '+212' WHERE id = 'Wp0zyt35EKRTfMtjyYv5Cw2IMWu1' AND (phone_e164 IS NULL OR phone_e164 = '+212782093843') AND (country_code IS NULL OR country_code = '+212');
UPDATE public.users SET phone_e164 = '+213662812447', country_code = '+213' WHERE id = 'rf5s8xPEUfcO0Mdqr8h6aZ4kdqF3' AND (phone_e164 IS NULL OR phone_e164 = '+213662812447') AND (country_code IS NULL OR country_code = '+213');
UPDATE public.users SET phone_e164 = '+201118364619', country_code = '+20' WHERE id = 'rg9qV1OGVUYadCyRaqXTPiwdQxp1' AND (phone_e164 IS NULL OR phone_e164 = '+201118364619') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201070156805', country_code = '+20' WHERE id = 'riVP4fubYcTRf90tUuZFG7q4iNd2' AND (phone_e164 IS NULL OR phone_e164 = '+201070156805') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201111707164', country_code = '+20' WHERE id = 'ro98gLDuHWQyt12jQXBQkp65Ji22' AND (phone_e164 IS NULL OR phone_e164 = '+201111707164') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET supabase_uid = '4468071c-ca3d-44f6-bf8c-283e61bfcad3'::uuid, phone_e164 = '+201007977869', country_code = '+20' WHERE id = '4468071c-ca3d-44f6-bf8c-283e61bfcad3' AND (supabase_uid IS NULL OR supabase_uid = '4468071c-ca3d-44f6-bf8c-283e61bfcad3'::uuid) AND (phone_e164 IS NULL OR phone_e164 = '+201007977869') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+212651897480', country_code = '+212' WHERE id = '045f2n0rLEWgRRvWQZeKOVs1mDS2' AND (phone_e164 IS NULL OR phone_e164 = '+212651897480') AND (country_code IS NULL OR country_code = '+212');
UPDATE public.users SET phone_e164 = '+201126693558', country_code = '+20' WHERE id = 'WnUk54yvCNXsT2fJSle24B7UvJa2' AND (phone_e164 IS NULL OR phone_e164 = '+201126693558') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET supabase_uid = '806dada7-a396-446b-b98a-e3f8cd228a6c'::uuid, phone_e164 = '+201146442256', country_code = '+20' WHERE id = '806dada7-a396-446b-b98a-e3f8cd228a6c' AND (supabase_uid IS NULL OR supabase_uid = '806dada7-a396-446b-b98a-e3f8cd228a6c'::uuid) AND (phone_e164 IS NULL OR phone_e164 = '+201146442256') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201009466575', country_code = '+20' WHERE id = 'ruxkiBurt5XIPmEgEMzvViARKwk1' AND (phone_e164 IS NULL OR phone_e164 = '+201009466575') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201009620895', country_code = '+20' WHERE id = 'rzHL1kGMORYc2W5OPLAIoXGL4Nh1' AND (phone_e164 IS NULL OR phone_e164 = '+201009620895') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201002449655', country_code = '+20' WHERE id = 's11aTOHgJHfBcsrNeBGLQ2hvnAR2' AND (phone_e164 IS NULL OR phone_e164 = '+201002449655') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201200137754', country_code = '+20' WHERE id = 's1VS5lDvzbZaPs0Pn4DAHWRe2Bl1' AND (phone_e164 IS NULL OR phone_e164 = '+201200137754') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET country_code = '+20' WHERE id = 's4q1ZTQVnOe9G1aYDzfEvRPdsca2' AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201094875234', country_code = '+20' WHERE id = 's6Bmr0t3wtWnKxyGBmmhu5N8FrL2' AND (phone_e164 IS NULL OR phone_e164 = '+201094875234') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201109900673', country_code = '+20' WHERE id = 's8cjyEFijBhGhM4I387lN8Wrpun2' AND (phone_e164 IS NULL OR phone_e164 = '+201109900673') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET supabase_uid = 'aa4df54a-bed4-4c69-8e37-651fe3922414'::uuid, phone_e164 = '+201201164771', country_code = '+20' WHERE id = 'aa4df54a-bed4-4c69-8e37-651fe3922414' AND (supabase_uid IS NULL OR supabase_uid = 'aa4df54a-bed4-4c69-8e37-651fe3922414'::uuid) AND (phone_e164 IS NULL OR phone_e164 = '+201201164771') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+20155527226', country_code = '+20' WHERE id = 'sJx3VpeW21OMWHt4UlOIsCbrgl72' AND (phone_e164 IS NULL OR phone_e164 = '+20155527226') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201030572264', country_code = '+20' WHERE id = 'sKBoP50gFhMlNIqvVOPkCqjd1KC3' AND (phone_e164 IS NULL OR phone_e164 = '+201030572264') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET country_code = '+20' WHERE id = 'sLcn3XLCXeSrnIBdkli7mtBrWIz1' AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+212680670323', country_code = '+212' WHERE id = 'sPhnkwyqFjSTUv0aC0TlSodgws72' AND (phone_e164 IS NULL OR phone_e164 = '+212680670323') AND (country_code IS NULL OR country_code = '+212');
UPDATE public.users SET phone_e164 = '+20101575483', country_code = '+20' WHERE id = 'sRtNau3SYXdnSg9aWYPcChYh8ZG2' AND (phone_e164 IS NULL OR phone_e164 = '+20101575483') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201211752395', country_code = '+20' WHERE id = 'sSU4bn1QElOXkX6X45QrZ9C3S4b2' AND (phone_e164 IS NULL OR phone_e164 = '+201211752395') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+97455667128', country_code = '+974' WHERE id = 'sWL6r5yOXTfWlskTYC1lzmldiS53' AND (phone_e164 IS NULL OR phone_e164 = '+97455667128') AND (country_code IS NULL OR country_code = '+974');
UPDATE public.users SET phone_e164 = '+201021190682', country_code = '+20' WHERE id = 'sZ4k7dOJB0PoM2OS7D8Un67ZTr92' AND (phone_e164 IS NULL OR phone_e164 = '+201021190682') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET country_code = '+20' WHERE id = 'shYb04DJmmf3NhIo76TXMb9uBY92' AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+212643482664', country_code = '+212' WHERE id = 'sjlKTafaTbb6bNKlhwZWS9OgaMp1' AND (phone_e164 IS NULL OR phone_e164 = '+212643482664') AND (country_code IS NULL OR country_code = '+212');
UPDATE public.users SET phone_e164 = '+971233123121', country_code = '+971' WHERE id = 'suwmHPcTyqSU7WCWkQIVVFOk77i1' AND (phone_e164 IS NULL OR phone_e164 = '+971233123121') AND (country_code IS NULL OR country_code = '+971');
UPDATE public.users SET supabase_uid = 'c7853003-9323-4adc-a1de-7cb224ac7c14'::uuid, phone_e164 = '+97450554880', country_code = '+974' WHERE id = 'c7853003-9323-4adc-a1de-7cb224ac7c14' AND (supabase_uid IS NULL OR supabase_uid = 'c7853003-9323-4adc-a1de-7cb224ac7c14'::uuid) AND (phone_e164 IS NULL OR phone_e164 = '+97450554880') AND (country_code IS NULL OR country_code = '+974');
UPDATE public.users SET phone_e164 = '+212617610022', country_code = '+212' WHERE id = 'svBQsWX9Qwdt0f67K5iBo6uz4MX2' AND (phone_e164 IS NULL OR phone_e164 = '+212617610022') AND (country_code IS NULL OR country_code = '+212');
UPDATE public.users SET phone_e164 = '+97430080511', country_code = '+974' WHERE id = 't4U9xDYUMrQ95htcbYe237uzO3p1' AND (phone_e164 IS NULL OR phone_e164 = '+97430080511') AND (country_code IS NULL OR country_code = '+974');
UPDATE public.users SET phone_e164 = '+212631119737', country_code = '+212' WHERE id = 't57tgJXStHM39wP5yad2JhT7msV2' AND (phone_e164 IS NULL OR phone_e164 = '+212631119737') AND (country_code IS NULL OR country_code = '+212');
UPDATE public.users SET phone_e164 = '+201111311016', country_code = '+20' WHERE id = 't6UleqtFcdc9WOF4oJETveQtQfe2' AND (phone_e164 IS NULL OR phone_e164 = '+201111311016') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201224669165', country_code = '+20' WHERE id = 't6bLTanLLbNLw83buxv8l9fdZoi2' AND (phone_e164 IS NULL OR phone_e164 = '+201224669165') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+97456882314', country_code = '+974' WHERE id = 'tAQg42DIwJgQ51aFLY75lHgfGjy1' AND (phone_e164 IS NULL OR phone_e164 = '+97456882314') AND (country_code IS NULL OR country_code = '+974');
UPDATE public.users SET country_code = '+20' WHERE id = 'tCCbN4nV7uTiggPjOlFqiH9bPG82' AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET country_code = '+20' WHERE id = 'tE3KltHYnHeANkWIN83O2Au2gIX2' AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET country_code = '+20' WHERE id = 'Xc6RCiKlPmhWOHo0JhIZQMnNlW03' AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET supabase_uid = '76e2982e-3a3c-4db3-8263-cbbdc338c8d2'::uuid, phone_e164 = '+201093054196', country_code = '+20' WHERE id = '76e2982e-3a3c-4db3-8263-cbbdc338c8d2' AND (supabase_uid IS NULL OR supabase_uid = '76e2982e-3a3c-4db3-8263-cbbdc338c8d2'::uuid) AND (phone_e164 IS NULL OR phone_e164 = '+201093054196') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET supabase_uid = '996ce683-cff2-4c7b-87ee-2dd0f506f2c2'::uuid, phone_e164 = '+201202973157', country_code = '+20' WHERE id = '996ce683-cff2-4c7b-87ee-2dd0f506f2c2' AND (supabase_uid IS NULL OR supabase_uid = '996ce683-cff2-4c7b-87ee-2dd0f506f2c2'::uuid) AND (phone_e164 IS NULL OR phone_e164 = '+201202973157') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201229781768', country_code = '+20' WHERE id = 'tH4nBvfLHpPhgw1XCa3YnyVzPBU2' AND (phone_e164 IS NULL OR phone_e164 = '+201229781768') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+212604690853', country_code = '+212' WHERE id = 'Ze6FxhClBkSjw6VBLHeu1WaRCGq2' AND (phone_e164 IS NULL OR phone_e164 = '+212604690853') AND (country_code IS NULL OR country_code = '+212');
UPDATE public.users SET phone_e164 = '+201221489434', country_code = '+20' WHERE id = 'tHjBrW1fb3PnjUSjUeAcQ8DJTMF3' AND (phone_e164 IS NULL OR phone_e164 = '+201221489434') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+204548796565', country_code = '+20' WHERE id = 'tKto8ZS94XcMUhXyWBBaR5cEMFs2' AND (phone_e164 IS NULL OR phone_e164 = '+204548796565') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201122443355', country_code = '+20' WHERE id = 'tWwOa4LndNberC68av6lEGzII923' AND (phone_e164 IS NULL OR phone_e164 = '+201122443355') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+218218720531888', country_code = '+218' WHERE id = 'td8reMOYcQcaWVYA7LLl7NVikDU2' AND (phone_e164 IS NULL OR phone_e164 = '+218218720531888') AND (country_code IS NULL OR country_code = '+218');
UPDATE public.users SET country_code = '+20' WHERE id = '59A2iG6JxFaSSyzG1cbCS2tLhdq1' AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET supabase_uid = 'ee719593-523e-43b7-abe8-c57b1ada9444'::uuid, phone_e164 = '+201098152516', country_code = '+20' WHERE id = 'ee719593-523e-43b7-abe8-c57b1ada9444' AND (supabase_uid IS NULL OR supabase_uid = 'ee719593-523e-43b7-abe8-c57b1ada9444'::uuid) AND (phone_e164 IS NULL OR phone_e164 = '+201098152516') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET supabase_uid = 'ebdd5402-6c25-427a-8381-016dcac34521'::uuid, phone_e164 = '+201276740229', country_code = '+20' WHERE id = 'ebdd5402-6c25-427a-8381-016dcac34521' AND (supabase_uid IS NULL OR supabase_uid = 'ebdd5402-6c25-427a-8381-016dcac34521'::uuid) AND (phone_e164 IS NULL OR phone_e164 = '+201276740229') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+212768244868', country_code = '+212' WHERE id = 'tofp92p0QgcMVxsNs0KYXtqhloK2' AND (phone_e164 IS NULL OR phone_e164 = '+212768244868') AND (country_code IS NULL OR country_code = '+212');
UPDATE public.users SET country_code = '+20' WHERE id = 'ttSoUdgH5yPfPVroOHwk76rGCS42' AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201022991273', country_code = '+20' WHERE id = 'ttYd4rKSQuZrOLcIeHwTNDnDTYk1' AND (phone_e164 IS NULL OR phone_e164 = '+201022991273') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+209857584585', country_code = '+20' WHERE id = 'tyZWVlAEYHaEkDJXOlX9sJVPQi73' AND (phone_e164 IS NULL OR phone_e164 = '+209857584585') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201146420141', country_code = '+20' WHERE id = 'u5e6oZYILmUIQzGpmrlf2eUmjP43' AND (phone_e164 IS NULL OR phone_e164 = '+201146420141') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201273713224', country_code = '+20' WHERE id = 'u68OrfTRNFguN9SJr92Fk07Sx0p1' AND (phone_e164 IS NULL OR phone_e164 = '+201273713224') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET country_code = '+20' WHERE id = 'uBLEHyUSydTDjbVWBX3tVCy91Xr1' AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201154879447', country_code = '+20' WHERE id = 'uFVFVW0gcbU0g45f6wGaqLc3EOE2' AND (phone_e164 IS NULL OR phone_e164 = '+201154879447') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+212703930990', country_code = '+212' WHERE id = 'aRVwQ3bjO3btKPJn5zNt8agQk1A2' AND (phone_e164 IS NULL OR phone_e164 = '+212703930990') AND (country_code IS NULL OR country_code = '+212');
UPDATE public.users SET supabase_uid = 'a1f418bb-6025-41fc-bef6-fb92ba7718d6'::uuid, phone_e164 = '+201141568001', country_code = '+20' WHERE id = 'a1f418bb-6025-41fc-bef6-fb92ba7718d6' AND (supabase_uid IS NULL OR supabase_uid = 'a1f418bb-6025-41fc-bef6-fb92ba7718d6'::uuid) AND (phone_e164 IS NULL OR phone_e164 = '+201141568001') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201013233061', country_code = '+20' WHERE id = 'uOI68sLLZWdWLHKz4pNFuYuGHFg1' AND (phone_e164 IS NULL OR phone_e164 = '+201013233061') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201000015808', country_code = '+20' WHERE id = 'uOkQZCfC5bhb7VncDnedXrEo1MF2' AND (phone_e164 IS NULL OR phone_e164 = '+201000015808') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201104196957', country_code = '+20' WHERE id = 'uRCCqiZCA7M18BVuDRLfwuN0HZw2' AND (phone_e164 IS NULL OR phone_e164 = '+201104196957') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET country_code = '+20' WHERE id = 'uTNhyvCp9QWcVLZax7wXwTQjSyu2' AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET country_code = '+20' WHERE id = 'uWtwwXwtkBg4iGS7J0veMVQINjp1' AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET country_code = '+20' WHERE id = 'uc3GjRdisuOeV6vVu3oYiQo1G6F2' AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201023497103', country_code = '+20' WHERE id = 'uxoHhPvOQ7hBZ82WTpAutcZIXCC2' AND (phone_e164 IS NULL OR phone_e164 = '+201023497103') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201201306758', country_code = '+20' WHERE id = 'v4uT73wEbrRuq7segh11aIrQTcw2' AND (phone_e164 IS NULL OR phone_e164 = '+201201306758') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET country_code = '+20' WHERE id = 'v8pzhcAepKWTK6LRgxRzEzR0uuC2' AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET country_code = '+20' WHERE id = 'vA4uRGSveogXqck2fxztaoV655f1' AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+20155536385', country_code = '+20' WHERE id = 'vAbRMZtAeOPgFXkNVvVsRxtCtSm2' AND (phone_e164 IS NULL OR phone_e164 = '+20155536385') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201205135328', country_code = '+20' WHERE id = 'vDodzjcu7tOLLMztZ7icJY2jUfy2' AND (phone_e164 IS NULL OR phone_e164 = '+201205135328') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET country_code = '+20' WHERE id = 'vH1KNF7jMLTPUPnq3ZRZlPVGERn2' AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+212660702061', country_code = '+212' WHERE id = 'b2yrEwPMI5ek7PgOyZmZqym0k5i2' AND (phone_e164 IS NULL OR phone_e164 = '+212660702061') AND (country_code IS NULL OR country_code = '+212');
UPDATE public.users SET country_code = '+20' WHERE id = 'iF6xsgnrNSQshXw5NNgQsQbH1702' AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201007076921', country_code = '+20' WHERE id = 'iI2CajLjNnMe5EuoZnXPqBCsAos2' AND (phone_e164 IS NULL OR phone_e164 = '+201007076921') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET country_code = '+20' WHERE id = 'v7lDpI2O42VXz3G1aUtqCiwMKcR2' AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+2011493712', country_code = '+20' WHERE id = 'vIN6eq6jSEXIVTcTDX6dzRIKeMr2' AND (phone_e164 IS NULL OR phone_e164 = '+2011493712') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+206565656565', country_code = '+20' WHERE id = 'vUQhCvXasvcU6qe5zQWyeOFmnar1' AND (phone_e164 IS NULL OR phone_e164 = '+206565656565') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+212678192615', country_code = '+212' WHERE id = 'vVkpEltACgWfkjtW3WpO8ZRpyWg1' AND (phone_e164 IS NULL OR phone_e164 = '+212678192615') AND (country_code IS NULL OR country_code = '+212');
UPDATE public.users SET phone_e164 = '+201289629691', country_code = '+20' WHERE id = 'vWpa4uQ0mcf55qlMN7OYIN0DVey1' AND (phone_e164 IS NULL OR phone_e164 = '+201289629691') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201000245477', country_code = '+20' WHERE id = 'vcQ3WCpml1U4P6xBpgyyWShDqzw2' AND (phone_e164 IS NULL OR phone_e164 = '+201000245477') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201158535595', country_code = '+20' WHERE id = 'vhRNJ1iuQtRhnKPUIH7wY19tPsl1' AND (phone_e164 IS NULL OR phone_e164 = '+201158535595') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201006783047', country_code = '+20' WHERE id = 'vizgeZTbR7R4QhFv5gZ2cVqV0PW2' AND (phone_e164 IS NULL OR phone_e164 = '+201006783047') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201116633031', country_code = '+20' WHERE id = 'vnMh4BcnsWgHUqnwnROiFm90u2I2' AND (phone_e164 IS NULL OR phone_e164 = '+201116633031') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201289957300', country_code = '+20' WHERE id = 'w1M2SJv25ZQoqD41ZE7tx1sinz13' AND (phone_e164 IS NULL OR phone_e164 = '+201289957300') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201220756600', country_code = '+20' WHERE id = 'wMkzBjDLB7VNEp4JTGdgCyHblJB3' AND (phone_e164 IS NULL OR phone_e164 = '+201220756600') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201129734279', country_code = '+20' WHERE id = 'wNNBK58wwgf98seBlEc0u9MSdby2' AND (phone_e164 IS NULL OR phone_e164 = '+201129734279') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201003329525', country_code = '+20' WHERE id = 'wNdJadOcijUjHjyh2qVSbcqflIx1' AND (phone_e164 IS NULL OR phone_e164 = '+201003329525') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201229997470', country_code = '+20' WHERE id = 'wgndoaixa4PAzDw21rtEVTFjWbb2' AND (phone_e164 IS NULL OR phone_e164 = '+201229997470') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET country_code = '+20' WHERE id = 'wkSx85N4ldTMKJoU8N6vWJQeBRf1' AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET country_code = '+20' WHERE id = 'wt1B6bvApTXwKvWfS8Gfv5UVGwS2' AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+249912259871', country_code = '+249' WHERE id = 'wvcye2U5s6ROkpbHdkLVKbVHhr73' AND (phone_e164 IS NULL OR phone_e164 = '+249912259871') AND (country_code IS NULL OR country_code = '+249');
UPDATE public.users SET phone_e164 = '+9741000940321', country_code = '+974' WHERE id = 'ww9AqQ5TVBdlaoVzFNTC2LDroLV2' AND (phone_e164 IS NULL OR phone_e164 = '+9741000940321') AND (country_code IS NULL OR country_code = '+974');
UPDATE public.users SET phone_e164 = '+20127898808', country_code = '+20' WHERE id = 'x1TJ1wSSuqRWkpjDZKxqm8TJML92' AND (phone_e164 IS NULL OR phone_e164 = '+20127898808') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+212634202813', country_code = '+212' WHERE id = 'x4tburl90wZZ56h8zb3qDgEWr303' AND (phone_e164 IS NULL OR phone_e164 = '+212634202813') AND (country_code IS NULL OR country_code = '+212');
UPDATE public.users SET phone_e164 = '+201017900593', country_code = '+20' WHERE id = 'x6uDVAqRq6MXVPC9J7zfHwsMdCj1' AND (phone_e164 IS NULL OR phone_e164 = '+201017900593') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201155917714', country_code = '+20' WHERE id = 'xA0Z4qebV3bPCPjMw6Ojne6xTl72' AND (phone_e164 IS NULL OR phone_e164 = '+201155917714') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201019762326', country_code = '+20' WHERE id = 'xB7lP2WPWVPj28yFk7jpUZNdAqB3' AND (phone_e164 IS NULL OR phone_e164 = '+201019762326') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET country_code = '+20' WHERE id = 'xEFxm9Gq9hVeM5olcYF392sxSak1' AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+208787878787', country_code = '+20' WHERE id = 'xHRI6cy95yfjkNyhrvChbOupVwY2' AND (phone_e164 IS NULL OR phone_e164 = '+208787878787') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+205487878788', country_code = '+20' WHERE id = 'xZPSYbYfh0bRUocECgG5rwgCv942' AND (phone_e164 IS NULL OR phone_e164 = '+205487878788') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+97435265981', country_code = '+974' WHERE id = 'xZh0O53IwIeUhJLcxf59XZjgPy43' AND (phone_e164 IS NULL OR phone_e164 = '+97435265981') AND (country_code IS NULL OR country_code = '+974');
UPDATE public.users SET phone_e164 = '+20122553808', country_code = '+20' WHERE id = 'xhAnEcuQBKU2bleAahxkAFQ49Fs2' AND (phone_e164 IS NULL OR phone_e164 = '+20122553808') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET country_code = '+20' WHERE id = 'xk3GbcbPdwQt6lRWnZPxz8adalt2' AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+212704597747', country_code = '+212' WHERE id = 'xxrTjhB8dROUQWIPXab1wluoj1Y2' AND (phone_e164 IS NULL OR phone_e164 = '+212704597747') AND (country_code IS NULL OR country_code = '+212');
UPDATE public.users SET phone_e164 = '+201211334410', country_code = '+20' WHERE id = 'y7OOVVsPGRW7MP4Y0ikLWevsO4j1' AND (phone_e164 IS NULL OR phone_e164 = '+201211334410') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201151373450', country_code = '+20' WHERE id = 'y9RmprvWI5XqrS1UgVbJ3kOvtG22' AND (phone_e164 IS NULL OR phone_e164 = '+201151373450') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+20120131136', country_code = '+20' WHERE id = 'yBqHK7EtbnhX1GDNpkzdnAxfppi2' AND (phone_e164 IS NULL OR phone_e164 = '+20120131136') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+212603623768', country_code = '+212' WHERE id = 'lBKG08P18zSB0U6vNbaVYMMyuj93' AND (phone_e164 IS NULL OR phone_e164 = '+212603623768') AND (country_code IS NULL OR country_code = '+212');
UPDATE public.users SET phone_e164 = '+201122560313', country_code = '+20' WHERE id = 'yGuNBflDXsNtzS2pEEo9IYFufbQ2' AND (phone_e164 IS NULL OR phone_e164 = '+201122560313') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201020255682', country_code = '+20' WHERE id = 'yL06AcfUVINdiNdIwDKHKgdWn052' AND (phone_e164 IS NULL OR phone_e164 = '+201020255682') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+20102077078', country_code = '+20' WHERE id = 'yLSqnAseIfglbRMLuaXU5Jx8Hs93' AND (phone_e164 IS NULL OR phone_e164 = '+20102077078') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201099417015', country_code = '+20' WHERE id = 'yapTR17SaCMjMo5jouPjFrssqlM2' AND (phone_e164 IS NULL OR phone_e164 = '+201099417015') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET country_code = '+20' WHERE id = 'ycQorhkWvihfFBbzVS13e9v6Yiu1' AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201066495586', country_code = '+20' WHERE id = 'ye6n7RXlhsgLi8qK2DHHSVpQKkI2' AND (phone_e164 IS NULL OR phone_e164 = '+201066495586') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201552081666', country_code = '+20' WHERE id = 'yhYVRit7alf2rH5wfaVFb9Cg7Nq1' AND (phone_e164 IS NULL OR phone_e164 = '+201552081666') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+212699029039', country_code = '+212' WHERE id = 'yn0oup0DwLc1oHjZ0298Pj5EQEB2' AND (phone_e164 IS NULL OR phone_e164 = '+212699029039') AND (country_code IS NULL OR country_code = '+212');
UPDATE public.users SET phone_e164 = '+201023457628', country_code = '+20' WHERE id = 'yoGzWxVMUhYmE9s24KItcaiXSxF2' AND (phone_e164 IS NULL OR phone_e164 = '+201023457628') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+97433343932', country_code = '+974' WHERE id = 'yoauBb2K6XNip8xeVrpD5CxRCgJ3' AND (phone_e164 IS NULL OR phone_e164 = '+97433343932') AND (country_code IS NULL OR country_code = '+974');
UPDATE public.users SET phone_e164 = '+212782542866', country_code = '+212' WHERE id = 'yvkVsYIZSuWVpTpcOdJMADsG1Mx1' AND (phone_e164 IS NULL OR phone_e164 = '+212782542866') AND (country_code IS NULL OR country_code = '+212');
UPDATE public.users SET country_code = '+20' WHERE id = 'ywaTW5LUpaSgXHlZIVwPr9pWaJf1' AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET country_code = '+20' WHERE id = 'z7jaTV1cQVYOPRVqgrGnauretdu1' AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201014774333', country_code = '+20' WHERE id = 'zCcLHvyGQZWPwFRLQjjL5RZU8Nx2' AND (phone_e164 IS NULL OR phone_e164 = '+201014774333') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+212704680950', country_code = '+212' WHERE id = 'zE1JkFyhbKbZKPeYdFXShSDgM6n1' AND (phone_e164 IS NULL OR phone_e164 = '+212704680950') AND (country_code IS NULL OR country_code = '+212');
UPDATE public.users SET phone_e164 = '+201017799588', country_code = '+20' WHERE id = 'zVOLijijQMMLByP5wwGq1cxWoeL2' AND (phone_e164 IS NULL OR phone_e164 = '+201017799588') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201128099850', country_code = '+20' WHERE id = '07buPTEpJkPiZUfdMEh3TxizwNi2' AND (phone_e164 IS NULL OR phone_e164 = '+201128099850') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201014387057', country_code = '+20' WHERE id = 'zYzGEZB9G9eRbLn6N0jQywf08py1' AND (phone_e164 IS NULL OR phone_e164 = '+201014387057') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201007622102', country_code = '+20' WHERE id = 'zbrDRXop5NYjCzIzHWmbsTVFQaV2' AND (phone_e164 IS NULL OR phone_e164 = '+201007622102') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201123338530', country_code = '+20' WHERE id = 'zceUfRspSMc2mcNYllfIV8GY8432' AND (phone_e164 IS NULL OR phone_e164 = '+201123338530') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201123343854', country_code = '+20' WHERE id = 'zdvNYDH8xKNkOFPIH2OReMI3UM93' AND (phone_e164 IS NULL OR phone_e164 = '+201123343854') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+212783010393', country_code = '+212' WHERE id = 'zhQpCPqcOzWlc6WwtxCjrkfomUh2' AND (phone_e164 IS NULL OR phone_e164 = '+212783010393') AND (country_code IS NULL OR country_code = '+212');
UPDATE public.users SET country_code = '+20' WHERE id = 'zjM7KGcO2COjItD4qMTdJBZaEl13' AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201144152688', country_code = '+20' WHERE id = 'zsTKTz5wi6YgNsT66XhCVOiXX4m2' AND (phone_e164 IS NULL OR phone_e164 = '+201144152688') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+212620671284', country_code = '+212' WHERE id = 'Avx7ZnyXUJdE9kGiLaiMz47kSSK2' AND (phone_e164 IS NULL OR phone_e164 = '+212620671284') AND (country_code IS NULL OR country_code = '+212');
UPDATE public.users SET phone_e164 = '+212675767649', country_code = '+212' WHERE id = 'eGRGsArjQXcvMBULUlJzOxPToUm1' AND (phone_e164 IS NULL OR phone_e164 = '+212675767649') AND (country_code IS NULL OR country_code = '+212');
UPDATE public.users SET phone_e164 = '+201122821039', country_code = '+20' WHERE id = 'eKoSQJqfvlWga7Q2ilFf6e7BeP52' AND (phone_e164 IS NULL OR phone_e164 = '+201122821039') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+212712366685', country_code = '+212' WHERE id = 'Xv3MxsJd60SFCHUSnw6en1tm7Uk1' AND (phone_e164 IS NULL OR phone_e164 = '+212712366685') AND (country_code IS NULL OR country_code = '+212');
UPDATE public.users SET phone_e164 = '+97423132123132', country_code = '+974' WHERE id = 'uBAiBTwawQbOGJURTKAtWTLIOep1' AND (phone_e164 IS NULL OR phone_e164 = '+97423132123132') AND (country_code IS NULL OR country_code = '+974');
UPDATE public.users SET phone_e164 = '+212612883723', country_code = '+212' WHERE id = '0lDejxSOJiXE9OxoRP5VOjHcyT43' AND (phone_e164 IS NULL OR phone_e164 = '+212612883723') AND (country_code IS NULL OR country_code = '+212');
UPDATE public.users SET supabase_uid = 'bd86fc25-227b-4347-8f69-63373db3af24'::uuid, phone_e164 = '+201092097541', country_code = '+20' WHERE id = 'bd86fc25-227b-4347-8f69-63373db3af24' AND (supabase_uid IS NULL OR supabase_uid = 'bd86fc25-227b-4347-8f69-63373db3af24'::uuid) AND (phone_e164 IS NULL OR phone_e164 = '+201092097541') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET country_code = '+20' WHERE id = '0FuH5wD6PfTtGe4uXhkxcYFfaai1' AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201062025687', country_code = '+20' WHERE id = '00yqbtkOzBTdF1ta3JMFQRbjz7r2' AND (phone_e164 IS NULL OR phone_e164 = '+201062025687') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+9743216547897', country_code = '+974' WHERE id = '0mrTr58kqnQ0bKGsGAVZevHSNH02' AND (phone_e164 IS NULL OR phone_e164 = '+9743216547897') AND (country_code IS NULL OR country_code = '+974');
UPDATE public.users SET phone_e164 = '+201007195177', country_code = '+20' WHERE id = 'e6fy5czs9EUoE2ic5p3wox3x8tm2' AND (phone_e164 IS NULL OR phone_e164 = '+201007195177') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+202010669378', country_code = '+20' WHERE id = '0sG0Q9eSqDhkaYIxsFAV3My99py2' AND (phone_e164 IS NULL OR phone_e164 = '+202010669378') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+209895656888', country_code = '+20' WHERE id = '0tIQ9kKgIxTPUofnLPRaHjRPXEz1' AND (phone_e164 IS NULL OR phone_e164 = '+209895656888') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201204441170', country_code = '+20' WHERE id = '0uGMDTboUKZdJ2q8tTKAizZ6JiI2' AND (phone_e164 IS NULL OR phone_e164 = '+201204441170') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201002690061', country_code = '+20' WHERE id = '0z9AaLWSv5M3Ea0o8fzkJfxA5CY2' AND (phone_e164 IS NULL OR phone_e164 = '+201002690061') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201005270796', country_code = '+20' WHERE id = '0zXet5rhnYNfSeASI4LFX0L5YhC3' AND (phone_e164 IS NULL OR phone_e164 = '+201005270796') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201005346500', country_code = '+20' WHERE id = 'XxQFRHvYssXo0k1XquYVQVAPzvl1' AND (phone_e164 IS NULL OR phone_e164 = '+201005346500') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET supabase_uid = '2fda452b-4738-412b-96dc-24c6108a39b6'::uuid, phone_e164 = '+201016941353', country_code = '+20' WHERE id = '2fda452b-4738-412b-96dc-24c6108a39b6' AND (supabase_uid IS NULL OR supabase_uid = '2fda452b-4738-412b-96dc-24c6108a39b6'::uuid) AND (phone_e164 IS NULL OR phone_e164 = '+201016941353') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201000935903', country_code = '+20' WHERE id = '5ec5c01c-04e2-4c16-bcc0-a3e563245e55' AND (phone_e164 IS NULL OR phone_e164 = '+201000935903') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+212751297926', country_code = '+212' WHERE id = 'dkEmsFPMqtUC6E52uVpExzhn0c22' AND (phone_e164 IS NULL OR phone_e164 = '+212751297926') AND (country_code IS NULL OR country_code = '+212');
UPDATE public.users SET phone_e164 = '+201200603316', country_code = '+20' WHERE id = 'e1AMp7hkvcbfQtSqSwyoN50BWgY2' AND (phone_e164 IS NULL OR phone_e164 = '+201200603316') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201276707396', country_code = '+20' WHERE id = 'e9hMo5h4rBgBhoR9OZVNpXF7xkg2' AND (phone_e164 IS NULL OR phone_e164 = '+201276707396') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201555805236', country_code = '+20' WHERE id = '02Qu9Vmi5oSNGt7uvuW1UibOiBW2' AND (phone_e164 IS NULL OR phone_e164 = '+201555805236') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+209898989898', country_code = '+20' WHERE id = '10lC5QmgqXYiCIICFYBuK8tWTAZ2' AND (phone_e164 IS NULL OR phone_e164 = '+209898989898') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+9743052791', country_code = '+974' WHERE id = '1z04WviU4YOlIb3q9J3dsBxqkeV2' AND (phone_e164 IS NULL OR phone_e164 = '+9743052791') AND (country_code IS NULL OR country_code = '+974');
UPDATE public.users SET phone_e164 = '+97466492112', country_code = '+974' WHERE id = '20Lj0875EZSbNwo1l1lcXFBJAEv1' AND (phone_e164 IS NULL OR phone_e164 = '+97466492112') AND (country_code IS NULL OR country_code = '+974');
UPDATE public.users SET phone_e164 = '+201279618469', country_code = '+20' WHERE id = '2ML6nppKdhVozcVhbzqRg0m10cn1' AND (phone_e164 IS NULL OR phone_e164 = '+201279618469') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201116987035', country_code = '+20' WHERE id = '2QdcLiX02xWy8ClcfJEIrfBj5oj1' AND (phone_e164 IS NULL OR phone_e164 = '+201116987035') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+212779968738', country_code = '+212' WHERE id = '2eQoX9hfngTP0egXUXxforU02Mz1' AND (phone_e164 IS NULL OR phone_e164 = '+212779968738') AND (country_code IS NULL OR country_code = '+212');
UPDATE public.users SET phone_e164 = '+201551387006', country_code = '+20' WHERE id = '2gTqQJ2oXdRdfnIdf73MRBzyBNf2' AND (phone_e164 IS NULL OR phone_e164 = '+201551387006') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+966596890960', country_code = '+966' WHERE id = '281206c3-4306-4946-8193-b9b6c9ab18b0' AND (phone_e164 IS NULL OR phone_e164 = '+966596890960') AND (country_code IS NULL OR country_code = '+966');
UPDATE public.users SET phone_e164 = '+212727187558', country_code = '+212' WHERE id = '2hrs0uaK6ybFUOSM0N5dmHuE8z82' AND (phone_e164 IS NULL OR phone_e164 = '+212727187558') AND (country_code IS NULL OR country_code = '+212');
UPDATE public.users SET phone_e164 = '+201069133414', country_code = '+20' WHERE id = '2hsUikmaLTRvYbSqFedePQS8Vy13' AND (phone_e164 IS NULL OR phone_e164 = '+201069133414') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET supabase_uid = 'd24afe5c-44da-4f81-827d-fdb041fdae7b'::uuid WHERE id = 'd24afe5c-44da-4f81-827d-fdb041fdae7b' AND (supabase_uid IS NULL OR supabase_uid = 'd24afe5c-44da-4f81-827d-fdb041fdae7b'::uuid);
UPDATE public.users SET phone_e164 = '+20122139244', country_code = '+20' WHERE id = '13tgoJEs4ENZ1AUbkPoAFK8YF8u1' AND (phone_e164 IS NULL OR phone_e164 = '+20122139244') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET country_code = '+20' WHERE id = '2kF8GwleA2dzKscpoRkXiYxZz152' AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201061544859', country_code = '+20' WHERE id = '32R6LwnLmWXcMeNOVd4yZqKz10T2' AND (phone_e164 IS NULL OR phone_e164 = '+201061544859') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET country_code = '+20' WHERE id = '39sRiq3QzDW4ckbjSIrml68Xdjp2' AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+97433836465', country_code = '+974' WHERE id = '3F5iCNLJEPgj2vj2Quy1kuCGfhW2' AND (phone_e164 IS NULL OR phone_e164 = '+97433836465') AND (country_code IS NULL OR country_code = '+974');
UPDATE public.users SET country_code = '+20' WHERE id = '3GCLlQmT4QOz5dI4ZaBpXytePLi2' AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201034149375', country_code = '+20' WHERE id = '3GY6hfJ1ChguOYPdUf1u1BBg9B53' AND (phone_e164 IS NULL OR phone_e164 = '+201034149375') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+971155917714', country_code = '+971' WHERE id = '3K3UquO10KZdg62YXelH5C77BTE2' AND (phone_e164 IS NULL OR phone_e164 = '+971155917714') AND (country_code IS NULL OR country_code = '+971');
UPDATE public.users SET phone_e164 = '+201021019436', country_code = '+20' WHERE id = '3ZsQC9BkQDWitF96QPVFDalRcx42' AND (phone_e164 IS NULL OR phone_e164 = '+201021019436') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET supabase_uid = '5a27a71b-8fc0-4bb2-8daf-cf47534b7883'::uuid, phone_e164 = '+201551438366', country_code = '+20' WHERE id = '5a27a71b-8fc0-4bb2-8daf-cf47534b7883' AND (supabase_uid IS NULL OR supabase_uid = '5a27a71b-8fc0-4bb2-8daf-cf47534b7883'::uuid) AND (phone_e164 IS NULL OR phone_e164 = '+201551438366') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET supabase_uid = '06c83e53-b86d-4ed8-a6a2-cbf7a3ad7a51'::uuid, phone_e164 = '+962777606333', country_code = '+962' WHERE id = '06c83e53-b86d-4ed8-a6a2-cbf7a3ad7a51' AND (supabase_uid IS NULL OR supabase_uid = '06c83e53-b86d-4ed8-a6a2-cbf7a3ad7a51'::uuid) AND (phone_e164 IS NULL OR phone_e164 = '+962777606333') AND (country_code IS NULL OR country_code = '+962');
UPDATE public.users SET phone_e164 = '+201141481524', country_code = '+20' WHERE id = '1K1asBqMxEQKF4wQdiBpjy2hliR2' AND (phone_e164 IS NULL OR phone_e164 = '+201141481524') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201008926396', country_code = '+20' WHERE id = '1bLMBEQIPyPO0AQ8kBSKxcmxP6v2' AND (phone_e164 IS NULL OR phone_e164 = '+201008926396') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201009173461', country_code = '+20' WHERE id = '1dNTapHyyeOGKiUlH8Ja4sg4KOt1' AND (phone_e164 IS NULL OR phone_e164 = '+201009173461') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201555509494', country_code = '+20' WHERE id = '3lR7RAix3tcqpfWeEGUeqfAV0ud2' AND (phone_e164 IS NULL OR phone_e164 = '+201555509494') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201012126092', country_code = '+20' WHERE id = '3pLHUtMZQgQr1Jo3wchSbVYNd5k2' AND (phone_e164 IS NULL OR phone_e164 = '+201012126092') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+20100575039', country_code = '+20' WHERE id = '3yQ8QXqdcRNZhqKQvOuSCTVxVnt2' AND (phone_e164 IS NULL OR phone_e164 = '+20100575039') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+212750918202', country_code = '+212' WHERE id = '40Jn9u8C5VN2UTOQk2IsIx0xIex2' AND (phone_e164 IS NULL OR phone_e164 = '+212750918202') AND (country_code IS NULL OR country_code = '+212');
UPDATE public.users SET phone_e164 = '+201095404964', country_code = '+20' WHERE id = '48SatM1rPPVJ0z3dpIA4xxjgBwz1' AND (phone_e164 IS NULL OR phone_e164 = '+201095404964') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET supabase_uid = '28a7be35-5560-4e38-9736-f3ee5e8b762c'::uuid, phone_e164 = '+201000506662', country_code = '+20' WHERE id = '28a7be35-5560-4e38-9736-f3ee5e8b762c' AND (supabase_uid IS NULL OR supabase_uid = '28a7be35-5560-4e38-9736-f3ee5e8b762c'::uuid) AND (phone_e164 IS NULL OR phone_e164 = '+201000506662') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET supabase_uid = 'ebf7e4c8-f2be-4912-892f-a179c44f86fd'::uuid WHERE id = 'ebf7e4c8-f2be-4912-892f-a179c44f86fd' AND (supabase_uid IS NULL OR supabase_uid = 'ebf7e4c8-f2be-4912-892f-a179c44f86fd'::uuid);
UPDATE public.users SET phone_e164 = '+97433412242', country_code = '+974' WHERE id = '1i2S3M1x4vaeFwcBCSp0F59E9DQ2' AND (phone_e164 IS NULL OR phone_e164 = '+97433412242') AND (country_code IS NULL OR country_code = '+974');
UPDATE public.users SET phone_e164 = '+201122222907', country_code = '+20' WHERE id = '1iuEKpyVCGd0uEHOjtvrjVW6CIB2' AND (phone_e164 IS NULL OR phone_e164 = '+201122222907') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+20127888388', country_code = '+20' WHERE id = '3Zg7uIxnOEVKFPLuiJQSaSaSklZ2' AND (phone_e164 IS NULL OR phone_e164 = '+20127888388') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET country_code = '+20' WHERE id = '4C8ZqVArXcgoiH60OQT0Z7Zlk6B2' AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+212652020195', country_code = '+212' WHERE id = '4F5HAM5mYgfu6Fm4wXiBbsj2I2J3' AND (phone_e164 IS NULL OR phone_e164 = '+212652020195') AND (country_code IS NULL OR country_code = '+212');
UPDATE public.users SET phone_e164 = '+20106336631', country_code = '+20' WHERE id = '4G9GTpQPzfQKANP0IrI3aQcLK2Q2' AND (phone_e164 IS NULL OR phone_e164 = '+20106336631') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201018340866', country_code = '+20' WHERE id = '4IRaLMpeNphBrx3SFKDLePTIHEg2' AND (phone_e164 IS NULL OR phone_e164 = '+201018340866') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201144951475', country_code = '+20' WHERE id = '4JXF5z80HTTCbfBDSQ9y9RPcODP2' AND (phone_e164 IS NULL OR phone_e164 = '+201144951475') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET country_code = '+20' WHERE id = '4LxEgHEP8YPcQHUBehYYvizZfDt2' AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET supabase_uid = '85264d7a-0ce0-44ba-9b89-ed598ed78b7a'::uuid, phone_e164 = '+966543411023', country_code = '+966' WHERE id = '85264d7a-0ce0-44ba-9b89-ed598ed78b7a' AND (supabase_uid IS NULL OR supabase_uid = '85264d7a-0ce0-44ba-9b89-ed598ed78b7a'::uuid) AND (phone_e164 IS NULL OR phone_e164 = '+966543411023') AND (country_code IS NULL OR country_code = '+966');
UPDATE public.users SET supabase_uid = '00001c89-ce7a-4688-ada7-3460e3b2f943'::uuid, phone_e164 = '+201009997542', country_code = '+20' WHERE id = '00001c89-ce7a-4688-ada7-3460e3b2f943' AND (supabase_uid IS NULL OR supabase_uid = '00001c89-ce7a-4688-ada7-3460e3b2f943'::uuid) AND (phone_e164 IS NULL OR phone_e164 = '+201009997542') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201061698265', country_code = '+20' WHERE id = '1ldrTvkjT7f8KGenrz4NOlZrDjj1' AND (phone_e164 IS NULL OR phone_e164 = '+201061698265') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET country_code = '+20' WHERE id = '4QR7STGslnQqy07SDHcqU4vnCq33' AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+20115306484', country_code = '+20' WHERE id = '4aCd8CmqoNVsHZUJV8NBydp5PP93' AND (phone_e164 IS NULL OR phone_e164 = '+20115306484') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+97455243560', country_code = '+974' WHERE id = '4dR58sI8UDYNJWnV1nMxytxufOK2' AND (phone_e164 IS NULL OR phone_e164 = '+97455243560') AND (country_code IS NULL OR country_code = '+974');
UPDATE public.users SET phone_e164 = '+97431340200', country_code = '+974' WHERE id = '4r9KLzv59uNGm0KAOto3NxRpFbv2' AND (phone_e164 IS NULL OR phone_e164 = '+97431340200') AND (country_code IS NULL OR country_code = '+974');
UPDATE public.users SET phone_e164 = '+202012808892', country_code = '+20' WHERE id = '56hI0JSnGWR4puy66b0FapPEBi42' AND (phone_e164 IS NULL OR phone_e164 = '+202012808892') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201122386225', country_code = '+20' WHERE id = 'YEbX6Y9cbFgUR1rQVrUTFVFwb8Z2' AND (phone_e164 IS NULL OR phone_e164 = '+201122386225') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+212631737513', country_code = '+212' WHERE id = 'bU0SUi3EhDWcMJ3wqtjjcMxlYPI3' AND (phone_e164 IS NULL OR phone_e164 = '+212631737513') AND (country_code IS NULL OR country_code = '+212');
UPDATE public.users SET phone_e164 = '+218218222222222', country_code = '+218' WHERE id = 'eRHtpnGpYKgph8l6q3Ytpng5xph1' AND (phone_e164 IS NULL OR phone_e164 = '+218218222222222') AND (country_code IS NULL OR country_code = '+218');
UPDATE public.users SET supabase_uid = 'cf12e6b3-88fb-4fa0-9468-292f5b7afa03'::uuid, phone_e164 = '+201005612032', country_code = '+20' WHERE id = 'cf12e6b3-88fb-4fa0-9468-292f5b7afa03' AND (supabase_uid IS NULL OR supabase_uid = 'cf12e6b3-88fb-4fa0-9468-292f5b7afa03'::uuid) AND (phone_e164 IS NULL OR phone_e164 = '+201005612032') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET supabase_uid = 'de3dbf21-f3a1-4399-a713-a22711a6f333'::uuid, phone_e164 = '+966556233022', country_code = '+966' WHERE id = 'de3dbf21-f3a1-4399-a713-a22711a6f333' AND (supabase_uid IS NULL OR supabase_uid = 'de3dbf21-f3a1-4399-a713-a22711a6f333'::uuid) AND (phone_e164 IS NULL OR phone_e164 = '+966556233022') AND (country_code IS NULL OR country_code = '+966');
UPDATE public.users SET phone_e164 = '+201010133583', country_code = '+20' WHERE id = '1rQeAZB0BcURTL6YSnPf1GrsbKF3' AND (phone_e164 IS NULL OR phone_e164 = '+201010133583') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+212604307996', country_code = '+212' WHERE id = '1vRmjc5TWRV6oXu4jtgZ7qJHlut2' AND (phone_e164 IS NULL OR phone_e164 = '+212604307996') AND (country_code IS NULL OR country_code = '+212');
UPDATE public.users SET phone_e164 = '+97455226377', country_code = '+974' WHERE id = '572TMqGjfFdk5pys9Zen9lczzcl2' AND (phone_e164 IS NULL OR phone_e164 = '+97455226377') AND (country_code IS NULL OR country_code = '+974');
UPDATE public.users SET phone_e164 = '+201206292790', country_code = '+20' WHERE id = '6NNDDDE1HoTevgUlUhKlfkTkWME2' AND (phone_e164 IS NULL OR phone_e164 = '+201206292790') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201002198352', country_code = '+20' WHERE id = '6OKXKkRhGlZeg6yLmgxe26tCJwz1' AND (phone_e164 IS NULL OR phone_e164 = '+201002198352') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201019307285', country_code = '+20' WHERE id = '6SiQr9O9jnU1LetC5cCFAT8EacD2' AND (phone_e164 IS NULL OR phone_e164 = '+201019307285') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201019445331', country_code = '+20' WHERE id = '6YBVYj0YOOQkUzBjCeXF6mgmt1e2' AND (phone_e164 IS NULL OR phone_e164 = '+201019445331') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+97431331833', country_code = '+974' WHERE id = '6h8m4zsRjcbZ9dOcWeGB4fpgxzp1' AND (phone_e164 IS NULL OR phone_e164 = '+97431331833') AND (country_code IS NULL OR country_code = '+974');
UPDATE public.users SET phone_e164 = '+212787029786', country_code = '+212' WHERE id = '6kOoV5yK4fY6Hc1Ow2xZddjw8pC3' AND (phone_e164 IS NULL OR phone_e164 = '+212787029786') AND (country_code IS NULL OR country_code = '+212');
UPDATE public.users SET country_code = '+20' WHERE id = '6l0OBQ5nTDRbJftPBPsn6KGWA0n1' AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET country_code = '+20' WHERE id = '6oGrtBeqJTgZJdEmBQhgYaxrlgD3' AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+9743216547898', country_code = '+974' WHERE id = '6ounHzVysQY3VDvlJ5OcF6qF3k02' AND (phone_e164 IS NULL OR phone_e164 = '+9743216547898') AND (country_code IS NULL OR country_code = '+974');
UPDATE public.users SET phone_e164 = '+201070661790', country_code = '+20' WHERE id = '6pgquTIheHZau08PxlEmFWR3C233' AND (phone_e164 IS NULL OR phone_e164 = '+201070661790') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201061126985', country_code = '+20' WHERE id = '6rR6XlueO9VFVkp2bz3V8hB2Gu73' AND (phone_e164 IS NULL OR phone_e164 = '+201061126985') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+97455359414', country_code = '+974' WHERE id = '6s2FbegFZyZnMAU011SGImfYMv52' AND (phone_e164 IS NULL OR phone_e164 = '+97455359414') AND (country_code IS NULL OR country_code = '+974');
UPDATE public.users SET phone_e164 = '+201009532052', country_code = '+20' WHERE id = '6uB3FUrzVdZ8uYCHggNdFC6h2sJ3' AND (phone_e164 IS NULL OR phone_e164 = '+201009532052') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+212690368938', country_code = '+212' WHERE id = 'bXtSxKdgvvThe8ONAQqq1Zgswvz2' AND (phone_e164 IS NULL OR phone_e164 = '+212690368938') AND (country_code IS NULL OR country_code = '+212');
UPDATE public.users SET supabase_uid = 'c2c4f5e9-a6f8-4ed6-8dbc-c7c7b5af76ee'::uuid WHERE id = 'c2c4f5e9-a6f8-4ed6-8dbc-c7c7b5af76ee' AND (supabase_uid IS NULL OR supabase_uid = 'c2c4f5e9-a6f8-4ed6-8dbc-c7c7b5af76ee'::uuid);
UPDATE public.users SET supabase_uid = '1ad3d67e-0a15-42de-a144-a1feb813bac2'::uuid, phone_e164 = '+201151259223', country_code = '+20' WHERE id = '1ad3d67e-0a15-42de-a144-a1feb813bac2' AND (supabase_uid IS NULL OR supabase_uid = '1ad3d67e-0a15-42de-a144-a1feb813bac2'::uuid) AND (phone_e164 IS NULL OR phone_e164 = '+201151259223') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+212782125136', country_code = '+212' WHERE id = '5BER0SdMjhRRXcrBlCdpwSA8RyF2' AND (phone_e164 IS NULL OR phone_e164 = '+212782125136') AND (country_code IS NULL OR country_code = '+212');
UPDATE public.users SET phone_e164 = '+212659794442', country_code = '+212' WHERE id = '5BkBhHiwQvSN9TAc10TwwmbPqd23' AND (phone_e164 IS NULL OR phone_e164 = '+212659794442') AND (country_code IS NULL OR country_code = '+212');
UPDATE public.users SET phone_e164 = '+201025878872', country_code = '+20' WHERE id = '5UgdUkXu6zTGcZqPkUN0pkTmewk1' AND (phone_e164 IS NULL OR phone_e164 = '+201025878872') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+212710966163', country_code = '+212' WHERE id = '5jPRkhIDPZbA4tfx8gthABCTF0c2' AND (phone_e164 IS NULL OR phone_e164 = '+212710966163') AND (country_code IS NULL OR country_code = '+212');
UPDATE public.users SET country_code = '+20' WHERE id = '75v5joY3rZfeFBtwVji8ZyB4QF32' AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201275857191', country_code = '+20' WHERE id = '7BTm1BX7qvenOnfBRGEgKZsszjq1' AND (phone_e164 IS NULL OR phone_e164 = '+201275857191') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201069566870', country_code = '+20' WHERE id = '7KOLUZGzTWTCBNxvzdZh0Jol01E2' AND (phone_e164 IS NULL OR phone_e164 = '+201069566870') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201507633000', country_code = '+20' WHERE id = '7RVay6pG8mMs1Z4NW67rQfj7zfx1' AND (phone_e164 IS NULL OR phone_e164 = '+201507633000') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+209874569888', country_code = '+20' WHERE id = '7VrS7rKCPGU9QxLNOy2zk4W3CkO2' AND (phone_e164 IS NULL OR phone_e164 = '+209874569888') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201002927002', country_code = '+20' WHERE id = '7WGej12iRKOuq25Uq0fwZP24l9J3' AND (phone_e164 IS NULL OR phone_e164 = '+201002927002') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+212613985499', country_code = '+212' WHERE id = '7cSqJ8L5cGhaOsxtVpCqj8Avkyj2' AND (phone_e164 IS NULL OR phone_e164 = '+212613985499') AND (country_code IS NULL OR country_code = '+212');
UPDATE public.users SET phone_e164 = '+201121920430', country_code = '+20' WHERE id = '7egyZRvf1Bclh22FW6A0gf2A0qz2' AND (phone_e164 IS NULL OR phone_e164 = '+201121920430') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201000127470', country_code = '+20' WHERE id = '7gTrsIffMLNvJA89jjKv56lAioH2' AND (phone_e164 IS NULL OR phone_e164 = '+201000127470') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET country_code = '+20' WHERE id = '7ocmQYCs1TQjtclOJ4NBmyCGQGl1' AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET supabase_uid = '8a63600a-1e85-4f8a-ba32-b82f6837f379'::uuid WHERE id = '8a63600a-1e85-4f8a-ba32-b82f6837f379' AND (supabase_uid IS NULL OR supabase_uid = '8a63600a-1e85-4f8a-ba32-b82f6837f379'::uuid);
UPDATE public.users SET supabase_uid = 'fbad1014-878e-45b8-b287-6b8432d889ea'::uuid WHERE id = 'fbad1014-878e-45b8-b287-6b8432d889ea' AND (supabase_uid IS NULL OR supabase_uid = 'fbad1014-878e-45b8-b287-6b8432d889ea'::uuid);
UPDATE public.users SET supabase_uid = '4ff9423b-707f-4b1c-b96a-ff9eb78c3968'::uuid WHERE id = '4ff9423b-707f-4b1c-b96a-ff9eb78c3968' AND (supabase_uid IS NULL OR supabase_uid = '4ff9423b-707f-4b1c-b96a-ff9eb78c3968'::uuid);
UPDATE public.users SET phone_e164 = '+97474424404', country_code = '+974' WHERE id = '7unTY0nZvfZJbvvkdiJpZNXQYZu2' AND (phone_e164 IS NULL OR phone_e164 = '+97474424404') AND (country_code IS NULL OR country_code = '+974');
UPDATE public.users SET phone_e164 = '+201128379679', country_code = '+20' WHERE id = '8ORfq7iWJ8T9OiWyQqXUmyaI4tm2' AND (phone_e164 IS NULL OR phone_e164 = '+201128379679') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET country_code = '+20' WHERE id = '8P9CbolRFsNUX2KPLaogkemuN1p2' AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201021373382', country_code = '+20' WHERE id = '8eA1bKPp4bT1gaUuQBn9QRcafzs2' AND (phone_e164 IS NULL OR phone_e164 = '+201021373382') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+20101017075', country_code = '+20' WHERE id = '8eIfuQ8U1gZ8PHxoeGjkkVWMIAm2' AND (phone_e164 IS NULL OR phone_e164 = '+20101017075') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201120590250', country_code = '+20' WHERE id = '8jeZcZXIFPbbXHd2ANQR6JoiOVE2' AND (phone_e164 IS NULL OR phone_e164 = '+201120590250') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201094439070', country_code = '+20' WHERE id = '8uCNes6z3ehwAPkXyTneCM0pPkN2' AND (phone_e164 IS NULL OR phone_e164 = '+201094439070') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201116066664', country_code = '+20' WHERE id = '8zH8jyy7zwe2NXWr6T57ag81L0n1' AND (phone_e164 IS NULL OR phone_e164 = '+201116066664') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201096720907', country_code = '+20' WHERE id = '8zHqUB9nPGRYBPhq7tER8NMJ4u22' AND (phone_e164 IS NULL OR phone_e164 = '+201096720907') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET country_code = '+20' WHERE id = '9389n0BjJjbMt9eQhalStgBdLKr1' AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201222760057', country_code = '+20' WHERE id = '93ndCQ3SwocAIerS1gIrCRCm4kp2' AND (phone_e164 IS NULL OR phone_e164 = '+201222760057') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+212645157619', country_code = '+212' WHERE id = '1yZnkKxWrTeSHSlo5zHgn1KRgQ63' AND (phone_e164 IS NULL OR phone_e164 = '+212645157619') AND (country_code IS NULL OR country_code = '+212');
UPDATE public.users SET country_code = '+20' WHERE id = '95FCF33YyGP8clwXc0bEE5Hf5ua2' AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET country_code = '+20' WHERE id = '9SiTv8Gi8wVi0b0JrzMdsUUv07t2' AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+212635920358', country_code = '+212' WHERE id = '9bkQMWFqLqRgqTp3QvyEAfCppzT2' AND (phone_e164 IS NULL OR phone_e164 = '+212635920358') AND (country_code IS NULL OR country_code = '+212');
UPDATE public.users SET phone_e164 = '+201228645749', country_code = '+20' WHERE id = '9cPAJK5MTBScLJwBYJmmu3Qc6VV2' AND (phone_e164 IS NULL OR phone_e164 = '+201228645749') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201287263913', country_code = '+20' WHERE id = 'A3gcafwbtVOGlRVAbr3M7Ii8yuA2' AND (phone_e164 IS NULL OR phone_e164 = '+201287263913') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+20127627243', country_code = '+20' WHERE id = 'AEVvAKZs1fTFqhzx15ldq0Ueqd52' AND (phone_e164 IS NULL OR phone_e164 = '+20127627243') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+20127845815', country_code = '+20' WHERE id = 'gLOL72Ul7vYDLlegz87ZNnbRge93' AND (phone_e164 IS NULL OR phone_e164 = '+20127845815') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET supabase_uid = '8334e578-915c-49e5-9b00-768b133ffce3'::uuid WHERE id = '8334e578-915c-49e5-9b00-768b133ffce3' AND (supabase_uid IS NULL OR supabase_uid = '8334e578-915c-49e5-9b00-768b133ffce3'::uuid);
UPDATE public.users SET supabase_uid = '7a5d6046-d64d-44b9-847f-c3ac42e42f29'::uuid WHERE id = '7a5d6046-d64d-44b9-847f-c3ac42e42f29' AND (supabase_uid IS NULL OR supabase_uid = '7a5d6046-d64d-44b9-847f-c3ac42e42f29'::uuid);
UPDATE public.users SET supabase_uid = 'e332a067-0db1-4d5b-9b35-18681da777cf'::uuid WHERE id = 'e332a067-0db1-4d5b-9b35-18681da777cf' AND (supabase_uid IS NULL OR supabase_uid = 'e332a067-0db1-4d5b-9b35-18681da777cf'::uuid);
UPDATE public.users SET supabase_uid = 'ef24d5b3-4f58-4d37-91a7-e285d877e917'::uuid WHERE id = 'ef24d5b3-4f58-4d37-91a7-e285d877e917' AND (supabase_uid IS NULL OR supabase_uid = 'ef24d5b3-4f58-4d37-91a7-e285d877e917'::uuid);
UPDATE public.users SET supabase_uid = 'c0da5a3e-5ca9-4eb2-b58d-e9f0dd45f316'::uuid WHERE id = 'c0da5a3e-5ca9-4eb2-b58d-e9f0dd45f316' AND (supabase_uid IS NULL OR supabase_uid = 'c0da5a3e-5ca9-4eb2-b58d-e9f0dd45f316'::uuid);
UPDATE public.users SET supabase_uid = '805f2a9b-1a67-4141-848e-e29906093555'::uuid, phone_e164 = '+212662068990', country_code = '+212' WHERE id = '805f2a9b-1a67-4141-848e-e29906093555' AND (supabase_uid IS NULL OR supabase_uid = '805f2a9b-1a67-4141-848e-e29906093555'::uuid) AND (phone_e164 IS NULL OR phone_e164 = '+212662068990') AND (country_code IS NULL OR country_code = '+212');
UPDATE public.users SET country_code = '+20' WHERE id = 'AG5bgnYTPRRYNJSpWzHH0cM8vYq1' AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET country_code = '+20' WHERE id = 'Cw2H83AdnlOqeUNscPgxwajJtHq1' AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201224535929', country_code = '+20' WHERE id = 'DFg9LBlZJiPUc8qpupvdnIHqjBq2' AND (phone_e164 IS NULL OR phone_e164 = '+201224535929') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201140704279', country_code = '+20' WHERE id = 'DHVXlk1MoHaAysI4pn5QZJRiYd33' AND (phone_e164 IS NULL OR phone_e164 = '+201140704279') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+966584276553', country_code = '+966' WHERE id = 'DJDhH4jMSzUmBDbNTAtZZXuQlsF3' AND (phone_e164 IS NULL OR phone_e164 = '+966584276553') AND (country_code IS NULL OR country_code = '+966');
UPDATE public.users SET phone_e164 = '+20122701759', country_code = '+20' WHERE id = 'DKq7qw7CMvcFEydz5VQ0y1JTBi43' AND (phone_e164 IS NULL OR phone_e164 = '+20122701759') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET country_code = '+20' WHERE id = 'DUmbOIT7qsYNxL02QdYK4oPGobq1' AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+97433894264', country_code = '+974' WHERE id = 'DZgkuIaUGlbRPVhFoW5UAVZgOh32' AND (phone_e164 IS NULL OR phone_e164 = '+97433894264') AND (country_code IS NULL OR country_code = '+974');
UPDATE public.users SET country_code = '+20' WHERE id = 'Dl4n7PSvk5PCGEAYax1PozH2xwW2' AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201070485183', country_code = '+20' WHERE id = '0JP7NNCQGbPIe1BcVljXUuUrrBy2' AND (phone_e164 IS NULL OR phone_e164 = '+201070485183') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+212627058857', country_code = '+212' WHERE id = '0NKQA1I4yVeAJctk9YMakgUhC4P2' AND (phone_e164 IS NULL OR phone_e164 = '+212627058857') AND (country_code IS NULL OR country_code = '+212');
UPDATE public.users SET phone_e164 = '+212722097166', country_code = '+212' WHERE id = '0PQjcCZyZqWSo41hIsjKENZiNuz1' AND (phone_e164 IS NULL OR phone_e164 = '+212722097166') AND (country_code IS NULL OR country_code = '+212');
UPDATE public.users SET phone_e164 = '+201100666401', country_code = '+20' WHERE id = '0dzSb82nS0fshZ0z5ep0Ypj0DXu1' AND (phone_e164 IS NULL OR phone_e164 = '+201100666401') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET supabase_uid = '3f702913-5515-4c1d-8216-511d6a8c563c'::uuid WHERE id = '3f702913-5515-4c1d-8216-511d6a8c563c' AND (supabase_uid IS NULL OR supabase_uid = '3f702913-5515-4c1d-8216-511d6a8c563c'::uuid);
UPDATE public.users SET phone_e164 = '+212619997503', country_code = '+212' WHERE id = 'q3yJR0GC8sXKfPxDxEG03GvrX9A3' AND (phone_e164 IS NULL OR phone_e164 = '+212619997503') AND (country_code IS NULL OR country_code = '+212');
UPDATE public.users SET supabase_uid = 'aa17f290-c704-41d4-b657-38c98ada0db4'::uuid WHERE id = 'aa17f290-c704-41d4-b657-38c98ada0db4' AND (supabase_uid IS NULL OR supabase_uid = 'aa17f290-c704-41d4-b657-38c98ada0db4'::uuid);
UPDATE public.users SET supabase_uid = 'fff063cc-7394-4ba0-9e01-f0300c812a3b'::uuid WHERE id = 'fff063cc-7394-4ba0-9e01-f0300c812a3b' AND (supabase_uid IS NULL OR supabase_uid = 'fff063cc-7394-4ba0-9e01-f0300c812a3b'::uuid);
UPDATE public.users SET supabase_uid = 'e3ac24cc-ec7c-4e62-93dc-1457ad67dcde'::uuid WHERE id = 'e3ac24cc-ec7c-4e62-93dc-1457ad67dcde' AND (supabase_uid IS NULL OR supabase_uid = 'e3ac24cc-ec7c-4e62-93dc-1457ad67dcde'::uuid);
UPDATE public.users SET phone_e164 = '+201022057526', country_code = '+20' WHERE id = '25FFBDUYJ8dgBR98xIoOk5fioBQ2' AND (phone_e164 IS NULL OR phone_e164 = '+201022057526') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET supabase_uid = 'f4d37c97-82fc-4704-8639-93355e0287dd'::uuid, phone_e164 = '+201276287971', country_code = '+20' WHERE id = 'f4d37c97-82fc-4704-8639-93355e0287dd' AND (supabase_uid IS NULL OR supabase_uid = 'f4d37c97-82fc-4704-8639-93355e0287dd'::uuid) AND (phone_e164 IS NULL OR phone_e164 = '+201276287971') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET supabase_uid = 'ce443cd8-b849-43e8-83a7-975e56aed908'::uuid WHERE id = 'ce443cd8-b849-43e8-83a7-975e56aed908' AND (supabase_uid IS NULL OR supabase_uid = 'ce443cd8-b849-43e8-83a7-975e56aed908'::uuid);
UPDATE public.users SET supabase_uid = 'ed989671-1e03-4d8f-acc8-3fba6591b946'::uuid WHERE id = 'ed989671-1e03-4d8f-acc8-3fba6591b946' AND (supabase_uid IS NULL OR supabase_uid = 'ed989671-1e03-4d8f-acc8-3fba6591b946'::uuid);
UPDATE public.users SET supabase_uid = '30b0d90f-faad-4ad1-8f34-1999a821902a'::uuid WHERE id = '30b0d90f-faad-4ad1-8f34-1999a821902a' AND (supabase_uid IS NULL OR supabase_uid = '30b0d90f-faad-4ad1-8f34-1999a821902a'::uuid);
UPDATE public.users SET supabase_uid = '38c59820-860f-41b6-918b-17f3e5460ee0'::uuid WHERE id = '38c59820-860f-41b6-918b-17f3e5460ee0' AND (supabase_uid IS NULL OR supabase_uid = '38c59820-860f-41b6-918b-17f3e5460ee0'::uuid);
UPDATE public.users SET supabase_uid = '2ea6469c-f3cd-4930-93df-2001019821fc'::uuid WHERE id = '2ea6469c-f3cd-4930-93df-2001019821fc' AND (supabase_uid IS NULL OR supabase_uid = '2ea6469c-f3cd-4930-93df-2001019821fc'::uuid);
UPDATE public.users SET supabase_uid = 'b0188b8c-78eb-43f2-b60f-904a3a0898d3'::uuid WHERE id = 'b0188b8c-78eb-43f2-b60f-904a3a0898d3' AND (supabase_uid IS NULL OR supabase_uid = 'b0188b8c-78eb-43f2-b60f-904a3a0898d3'::uuid);
UPDATE public.users SET supabase_uid = '6f4323ad-783f-4f62-9137-2279b700b8e5'::uuid WHERE id = '6f4323ad-783f-4f62-9137-2279b700b8e5' AND (supabase_uid IS NULL OR supabase_uid = '6f4323ad-783f-4f62-9137-2279b700b8e5'::uuid);
UPDATE public.users SET supabase_uid = '46482112-892e-4061-858a-f96014766364'::uuid WHERE id = '46482112-892e-4061-858a-f96014766364' AND (supabase_uid IS NULL OR supabase_uid = '46482112-892e-4061-858a-f96014766364'::uuid);
UPDATE public.users SET supabase_uid = '82558a79-b746-40fa-94a9-ccae47d0a2da'::uuid WHERE id = '82558a79-b746-40fa-94a9-ccae47d0a2da' AND (supabase_uid IS NULL OR supabase_uid = '82558a79-b746-40fa-94a9-ccae47d0a2da'::uuid);
UPDATE public.users SET supabase_uid = 'c810425a-3c93-4e2c-b648-ebe107a936ed'::uuid WHERE id = 'c810425a-3c93-4e2c-b648-ebe107a936ed' AND (supabase_uid IS NULL OR supabase_uid = 'c810425a-3c93-4e2c-b648-ebe107a936ed'::uuid);
UPDATE public.users SET supabase_uid = '90669b6d-2bef-4b0b-98f0-6270b5b93416'::uuid WHERE id = '90669b6d-2bef-4b0b-98f0-6270b5b93416' AND (supabase_uid IS NULL OR supabase_uid = '90669b6d-2bef-4b0b-98f0-6270b5b93416'::uuid);
UPDATE public.users SET supabase_uid = 'c3c50c40-b493-440a-ba11-80dda4d3f798'::uuid WHERE id = 'c3c50c40-b493-440a-ba11-80dda4d3f798' AND (supabase_uid IS NULL OR supabase_uid = 'c3c50c40-b493-440a-ba11-80dda4d3f798'::uuid);
UPDATE public.users SET supabase_uid = '84e4f992-76b5-4ca3-ac8d-adf499923e05'::uuid WHERE id = '84e4f992-76b5-4ca3-ac8d-adf499923e05' AND (supabase_uid IS NULL OR supabase_uid = '84e4f992-76b5-4ca3-ac8d-adf499923e05'::uuid);
UPDATE public.users SET supabase_uid = '26de6166-4b57-4440-96a9-be23e1cb5021'::uuid WHERE id = '26de6166-4b57-4440-96a9-be23e1cb5021' AND (supabase_uid IS NULL OR supabase_uid = '26de6166-4b57-4440-96a9-be23e1cb5021'::uuid);
UPDATE public.users SET supabase_uid = 'e8fb0497-9eef-46ad-a2e9-31290a6a777b'::uuid WHERE id = 'e8fb0497-9eef-46ad-a2e9-31290a6a777b' AND (supabase_uid IS NULL OR supabase_uid = 'e8fb0497-9eef-46ad-a2e9-31290a6a777b'::uuid);
UPDATE public.users SET supabase_uid = 'b01e7e24-7d9e-4110-be77-999ceef83b44'::uuid WHERE id = 'b01e7e24-7d9e-4110-be77-999ceef83b44' AND (supabase_uid IS NULL OR supabase_uid = 'b01e7e24-7d9e-4110-be77-999ceef83b44'::uuid);
UPDATE public.users SET supabase_uid = '52988a7e-5759-4c66-b81c-991032acce89'::uuid WHERE id = '52988a7e-5759-4c66-b81c-991032acce89' AND (supabase_uid IS NULL OR supabase_uid = '52988a7e-5759-4c66-b81c-991032acce89'::uuid);
UPDATE public.users SET supabase_uid = '73f51cb7-aa4f-42d7-8404-3164e1b01561'::uuid WHERE id = '73f51cb7-aa4f-42d7-8404-3164e1b01561' AND (supabase_uid IS NULL OR supabase_uid = '73f51cb7-aa4f-42d7-8404-3164e1b01561'::uuid);
UPDATE public.users SET supabase_uid = '0cbb0373-e0f1-4e90-86cd-bddada945d43'::uuid WHERE id = '0cbb0373-e0f1-4e90-86cd-bddada945d43' AND (supabase_uid IS NULL OR supabase_uid = '0cbb0373-e0f1-4e90-86cd-bddada945d43'::uuid);
UPDATE public.users SET supabase_uid = 'ec3e7ed6-f40b-4186-9dea-06b3837b8fa2'::uuid WHERE id = 'ec3e7ed6-f40b-4186-9dea-06b3837b8fa2' AND (supabase_uid IS NULL OR supabase_uid = 'ec3e7ed6-f40b-4186-9dea-06b3837b8fa2'::uuid);
UPDATE public.users SET supabase_uid = 'c92e5140-f846-4d04-b713-09323e142834'::uuid, phone_e164 = '+201041804688', country_code = '+20' WHERE id = 'c92e5140-f846-4d04-b713-09323e142834' AND (supabase_uid IS NULL OR supabase_uid = 'c92e5140-f846-4d04-b713-09323e142834'::uuid) AND (phone_e164 IS NULL OR phone_e164 = '+201041804688') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201013250085', country_code = '+20' WHERE id = '2Co1b2ltAMdWGmsse8wQF7n2DZi2' AND (phone_e164 IS NULL OR phone_e164 = '+201013250085') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201000353719', country_code = '+20' WHERE id = '2JCiLmtQindiyFkEdESkluCu56C3' AND (phone_e164 IS NULL OR phone_e164 = '+201000353719') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET country_code = '+20' WHERE id = 'YKHfs5sL0tfjZMel5bE45CwH5vd2' AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+212720933160', country_code = '+212' WHERE id = 'YMA6HVyA3iadAK2Uos9O7NCCsPg2' AND (phone_e164 IS NULL OR phone_e164 = '+212720933160') AND (country_code IS NULL OR country_code = '+212');
UPDATE public.users SET supabase_uid = '8bb97243-ce99-4619-96a6-3222d2c3dbbe'::uuid, phone_e164 = '+201025868043', country_code = '+20' WHERE id = '8bb97243-ce99-4619-96a6-3222d2c3dbbe' AND (supabase_uid IS NULL OR supabase_uid = '8bb97243-ce99-4619-96a6-3222d2c3dbbe'::uuid) AND (phone_e164 IS NULL OR phone_e164 = '+201025868043') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET country_code = '+20' WHERE id = '1qzXo6pOaCRwMy0vD4a0wrXXs1F3' AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET supabase_uid = '7db1db39-0438-48c0-b799-085b13de51a1'::uuid, phone_e164 = '+966531541107', country_code = '+966' WHERE id = '7db1db39-0438-48c0-b799-085b13de51a1' AND (supabase_uid IS NULL OR supabase_uid = '7db1db39-0438-48c0-b799-085b13de51a1'::uuid) AND (phone_e164 IS NULL OR phone_e164 = '+966531541107') AND (country_code IS NULL OR country_code = '+966');
UPDATE public.users SET supabase_uid = 'eb6bfe60-3a51-48e9-b9ca-701cf87b9356'::uuid, phone_e164 = '+201224197617', country_code = '+20' WHERE id = 'eb6bfe60-3a51-48e9-b9ca-701cf87b9356' AND (supabase_uid IS NULL OR supabase_uid = 'eb6bfe60-3a51-48e9-b9ca-701cf87b9356'::uuid) AND (phone_e164 IS NULL OR phone_e164 = '+201224197617') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET supabase_uid = 'ff3854b9-652f-411c-8515-bd0b2c35d4a5'::uuid, phone_e164 = '+201108485852', country_code = '+20' WHERE id = 'ff3854b9-652f-411c-8515-bd0b2c35d4a5' AND (supabase_uid IS NULL OR supabase_uid = 'ff3854b9-652f-411c-8515-bd0b2c35d4a5'::uuid) AND (phone_e164 IS NULL OR phone_e164 = '+201108485852') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET country_code = '+20' WHERE id = '2lrEBTkDOoTRpDzrlzqtaa9fvL03' AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+20109964471', country_code = '+20' WHERE id = '2rEIzZLK8QRsHEH7S5hxTIOSZGr1' AND (phone_e164 IS NULL OR phone_e164 = '+20109964471') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+20114389417', country_code = '+20' WHERE id = '31EOjrArOFQlr77QzTHfxDo8FFH2' AND (phone_e164 IS NULL OR phone_e164 = '+20114389417') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201210926510', country_code = '+20' WHERE id = '49ZujuVWdIW7WH6BG4vgo3g328b2' AND (phone_e164 IS NULL OR phone_e164 = '+201210926510') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET supabase_uid = '46f4bdf4-7be0-4e1a-9088-8b6c35933e2c'::uuid, phone_e164 = '+201065400867', country_code = '+20' WHERE id = '46f4bdf4-7be0-4e1a-9088-8b6c35933e2c' AND (supabase_uid IS NULL OR supabase_uid = '46f4bdf4-7be0-4e1a-9088-8b6c35933e2c'::uuid) AND (phone_e164 IS NULL OR phone_e164 = '+201065400867') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201010603755', country_code = '+20' WHERE id = '3esXLNwh25RBhv8ZT4bPr1MJi5F3' AND (phone_e164 IS NULL OR phone_e164 = '+201010603755') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201154181242', country_code = '+20' WHERE id = '3myQw2QsgFTrDTvpeuqHnxKbMdc2' AND (phone_e164 IS NULL OR phone_e164 = '+201154181242') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+212716389090', country_code = '+212' WHERE id = '4UjX46Sco9MxwIvgQ897ChVyDgi2' AND (phone_e164 IS NULL OR phone_e164 = '+212716389090') AND (country_code IS NULL OR country_code = '+212');
UPDATE public.users SET supabase_uid = '5c401133-40a8-47ab-8dbd-857f14f007fc'::uuid, phone_e164 = '+201283235624', country_code = '+20' WHERE id = '5c401133-40a8-47ab-8dbd-857f14f007fc' AND (supabase_uid IS NULL OR supabase_uid = '5c401133-40a8-47ab-8dbd-857f14f007fc'::uuid) AND (phone_e164 IS NULL OR phone_e164 = '+201283235624') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET supabase_uid = '4744d073-946c-4cf3-83f8-9866ae8d83ce'::uuid, phone_e164 = '+966544436883', country_code = '+966' WHERE id = '4744d073-946c-4cf3-83f8-9866ae8d83ce' AND (supabase_uid IS NULL OR supabase_uid = '4744d073-946c-4cf3-83f8-9866ae8d83ce'::uuid) AND (phone_e164 IS NULL OR phone_e164 = '+966544436883') AND (country_code IS NULL OR country_code = '+966');
UPDATE public.users SET supabase_uid = '3296a8fb-9bbd-42f6-9f4b-0478000c413a'::uuid, phone_e164 = '+201015892219', country_code = '+20' WHERE id = '3296a8fb-9bbd-42f6-9f4b-0478000c413a' AND (supabase_uid IS NULL OR supabase_uid = '3296a8fb-9bbd-42f6-9f4b-0478000c413a'::uuid) AND (phone_e164 IS NULL OR phone_e164 = '+201015892219') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+212602538516', country_code = '+212' WHERE id = '4qrVZnmdNSRR8OTkcvosIwlDXN92' AND (phone_e164 IS NULL OR phone_e164 = '+212602538516') AND (country_code IS NULL OR country_code = '+212');
UPDATE public.users SET phone_e164 = '+212696604672', country_code = '+212' WHERE id = '4sHaQhmbtGcuOSLuVH4PYK6ABoP2' AND (phone_e164 IS NULL OR phone_e164 = '+212696604672') AND (country_code IS NULL OR country_code = '+212');
UPDATE public.users SET phone_e164 = '+212622734204', country_code = '+212' WHERE id = '4yQRbS2uVES6WOlXE3zF6OgC1p53' AND (phone_e164 IS NULL OR phone_e164 = '+212622734204') AND (country_code IS NULL OR country_code = '+212');
UPDATE public.users SET phone_e164 = '+201148391140', country_code = '+20' WHERE id = '5WUVOmtfDjZXw1Ivx4VlJNh7xt03' AND (phone_e164 IS NULL OR phone_e164 = '+201148391140') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201098066099', country_code = '+20' WHERE id = '5e7rLtlYVmWHKusMRlMYChQxqvE2' AND (phone_e164 IS NULL OR phone_e164 = '+201098066099') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201098747897', country_code = '+20' WHERE id = '61Xzmf8Vs3fBKViDoQWZd8TZrhb2' AND (phone_e164 IS NULL OR phone_e164 = '+201098747897') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201152532787', country_code = '+20' WHERE id = 'DmEjkjJInXYVleACjVpeCQr3Brw1' AND (phone_e164 IS NULL OR phone_e164 = '+201152532787') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201008158404', country_code = '+20' WHERE id = 'Dt3ruDltckOc9BZE2QfVCY49UGu2' AND (phone_e164 IS NULL OR phone_e164 = '+201008158404') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201095551221', country_code = '+20' WHERE id = 'DxCcCCDbDPfNgIrB4V9IowAh5T63' AND (phone_e164 IS NULL OR phone_e164 = '+201095551221') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201207115051', country_code = '+20' WHERE id = 'EADT7bGE6NMZFOaG5IcMU7oGxOD3' AND (phone_e164 IS NULL OR phone_e164 = '+201207115051') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201064230348', country_code = '+20' WHERE id = 'EOjO2QJdahO6gR9S00r5jA6zwd33' AND (phone_e164 IS NULL OR phone_e164 = '+201064230348') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+212721646670', country_code = '+212' WHERE id = 'EWW0Jo2vwLfAOU4ipemKDs41lip2' AND (phone_e164 IS NULL OR phone_e164 = '+212721646670') AND (country_code IS NULL OR country_code = '+212');
UPDATE public.users SET phone_e164 = '+212641994829', country_code = '+212' WHERE id = 'EXaUZQEM4qU7j2hmG7UMUvflfGN2' AND (phone_e164 IS NULL OR phone_e164 = '+212641994829') AND (country_code IS NULL OR country_code = '+212');
UPDATE public.users SET country_code = '+20' WHERE id = 'EXfqUPMrhAgzzm245e5rFzLIbSw2' AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+9742543158932', country_code = '+974' WHERE id = 'a1qhiBBOPRcO5BOnlSQre57tGDk2' AND (phone_e164 IS NULL OR phone_e164 = '+9742543158932') AND (country_code IS NULL OR country_code = '+974');
UPDATE public.users SET supabase_uid = 'aee14be6-2c6f-418a-871a-adfd89693990'::uuid, phone_e164 = '+201094974002', country_code = '+20' WHERE id = 'aee14be6-2c6f-418a-871a-adfd89693990' AND (supabase_uid IS NULL OR supabase_uid = 'aee14be6-2c6f-418a-871a-adfd89693990'::uuid) AND (phone_e164 IS NULL OR phone_e164 = '+201094974002') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET supabase_uid = '3975263b-3b77-44e1-adf4-2db13bc876b7'::uuid, phone_e164 = '+201113363303', country_code = '+20' WHERE id = '3975263b-3b77-44e1-adf4-2db13bc876b7' AND (supabase_uid IS NULL OR supabase_uid = '3975263b-3b77-44e1-adf4-2db13bc876b7'::uuid) AND (phone_e164 IS NULL OR phone_e164 = '+201113363303') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+212616175583', country_code = '+212' WHERE id = '6PFzBZTd1pgqppXVn5c9EhqetL33' AND (phone_e164 IS NULL OR phone_e164 = '+212616175583') AND (country_code IS NULL OR country_code = '+212');
UPDATE public.users SET phone_e164 = '+201281198546', country_code = '+20' WHERE id = 'YODjyj5J8oOh0Q4carv7ZUu3Hvu1' AND (phone_e164 IS NULL OR phone_e164 = '+201281198546') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+20125597492', country_code = '+20' WHERE id = 'YQ583jZsnwSiHQS2ZSoGNzM7EMz2' AND (phone_e164 IS NULL OR phone_e164 = '+20125597492') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+212724403906', country_code = '+212' WHERE id = '777GAkchlsQaHOgUWcnRTm6nlgp2' AND (phone_e164 IS NULL OR phone_e164 = '+212724403906') AND (country_code IS NULL OR country_code = '+212');
UPDATE public.users SET supabase_uid = '0ddd82c3-4071-4c70-833a-d49439e8ebaf'::uuid, phone_e164 = '+201147379755', country_code = '+20' WHERE id = '0ddd82c3-4071-4c70-833a-d49439e8ebaf' AND (supabase_uid IS NULL OR supabase_uid = '0ddd82c3-4071-4c70-833a-d49439e8ebaf'::uuid) AND (phone_e164 IS NULL OR phone_e164 = '+201147379755') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET supabase_uid = 'b1e71b8e-6a9b-48c9-99c1-6e08d91fb541'::uuid, phone_e164 = '+201279607762', country_code = '+20' WHERE id = 'b1e71b8e-6a9b-48c9-99c1-6e08d91fb541' AND (supabase_uid IS NULL OR supabase_uid = 'b1e71b8e-6a9b-48c9-99c1-6e08d91fb541'::uuid) AND (phone_e164 IS NULL OR phone_e164 = '+201279607762') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET country_code = '+20' WHERE id = '575YGbCQyZavgQeN92Rke68hypo2' AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+97471541153', country_code = '+974' WHERE id = '58VwmvgTknU1HBv1twuHh1yGJyl2' AND (phone_e164 IS NULL OR phone_e164 = '+97471541153') AND (country_code IS NULL OR country_code = '+974');
UPDATE public.users SET supabase_uid = '99c64080-c7a8-458f-9098-d77395895d30'::uuid, phone_e164 = '+201147299650', country_code = '+20' WHERE id = '99c64080-c7a8-458f-9098-d77395895d30' AND (supabase_uid IS NULL OR supabase_uid = '99c64080-c7a8-458f-9098-d77395895d30'::uuid) AND (phone_e164 IS NULL OR phone_e164 = '+201147299650') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET supabase_uid = 'bff2215f-4b7d-4708-b160-8f45e75493ab'::uuid WHERE id = 'bff2215f-4b7d-4708-b160-8f45e75493ab' AND (supabase_uid IS NULL OR supabase_uid = 'bff2215f-4b7d-4708-b160-8f45e75493ab'::uuid);
UPDATE public.users SET supabase_uid = 'd42a6715-53f4-4768-ac9b-c29be0f3a5bb'::uuid, phone_e164 = '+201104840453', country_code = '+20' WHERE id = 'd42a6715-53f4-4768-ac9b-c29be0f3a5bb' AND (supabase_uid IS NULL OR supabase_uid = 'd42a6715-53f4-4768-ac9b-c29be0f3a5bb'::uuid) AND (phone_e164 IS NULL OR phone_e164 = '+201104840453') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET supabase_uid = '972155e7-3ad8-4ef7-8a24-4d244355e4e2'::uuid, phone_e164 = '+201157304474', country_code = '+20' WHERE id = '972155e7-3ad8-4ef7-8a24-4d244355e4e2' AND (supabase_uid IS NULL OR supabase_uid = '972155e7-3ad8-4ef7-8a24-4d244355e4e2'::uuid) AND (phone_e164 IS NULL OR phone_e164 = '+201157304474') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201111920626', country_code = '+20' WHERE id = '8orguwVmcKaAmOx26zFFbeXFBeR2' AND (phone_e164 IS NULL OR phone_e164 = '+201111920626') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+212630319852', country_code = '+212' WHERE id = 'AMeVJr9quLQpHLpiOVZC4YioYYf2' AND (phone_e164 IS NULL OR phone_e164 = '+212630319852') AND (country_code IS NULL OR country_code = '+212');
UPDATE public.users SET supabase_uid = 'c72f7ef0-d007-46e4-afc5-bc62cf05ebda'::uuid, phone_e164 = '+201151375265', country_code = '+20' WHERE id = 'c72f7ef0-d007-46e4-afc5-bc62cf05ebda' AND (supabase_uid IS NULL OR supabase_uid = 'c72f7ef0-d007-46e4-afc5-bc62cf05ebda'::uuid) AND (phone_e164 IS NULL OR phone_e164 = '+201151375265') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201557707411', country_code = '+20' WHERE id = 'AUoGXIghpSMfeiGWeDmRKmSGRLr2' AND (phone_e164 IS NULL OR phone_e164 = '+201557707411') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201099703064', country_code = '+20' WHERE id = 'BY698LpYaCha2PkPizpoFlklLXf2' AND (phone_e164 IS NULL OR phone_e164 = '+201099703064') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201070828395', country_code = '+20' WHERE id = 'BkiaUDjAwZYZHSWOzBroX6fgNQN2' AND (phone_e164 IS NULL OR phone_e164 = '+201070828395') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201149790687', country_code = '+20' WHERE id = 'Cjz4GRiV2wO4MOFHJYZ2ojByMxA2' AND (phone_e164 IS NULL OR phone_e164 = '+201149790687') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+97452042000', country_code = '+974' WHERE id = 'Cq2wyprgPMaeppXWklKVgwcaQCu1' AND (phone_e164 IS NULL OR phone_e164 = '+97452042000') AND (country_code IS NULL OR country_code = '+974');
UPDATE public.users SET phone_e164 = '+212661705870', country_code = '+212' WHERE id = 'CvkRlfOwIvWiZM14z3M4Im3Aon63' AND (phone_e164 IS NULL OR phone_e164 = '+212661705870') AND (country_code IS NULL OR country_code = '+212');
UPDATE public.users SET phone_e164 = '+201064248245', country_code = '+20' WHERE id = 'Ed8N5aASLDW8BV4M34OSaIubzjE3' AND (phone_e164 IS NULL OR phone_e164 = '+201064248245') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201000101177', country_code = '+20' WHERE id = 'W8QdCwdwMZbc3ijKMgJnFl6Ft843' AND (phone_e164 IS NULL OR phone_e164 = '+201000101177') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET supabase_uid = 'b1ad8134-4347-45fa-9940-00fabc43ef2d'::uuid, phone_e164 = '+201099809993', country_code = '+20' WHERE id = 'b1ad8134-4347-45fa-9940-00fabc43ef2d' AND (supabase_uid IS NULL OR supabase_uid = 'b1ad8134-4347-45fa-9940-00fabc43ef2d'::uuid) AND (phone_e164 IS NULL OR phone_e164 = '+201099809993') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+20777777777', country_code = '+20' WHERE id = '9dXin9IK27ddn7TB2OPQvQepLVz1' AND (phone_e164 IS NULL OR phone_e164 = '+20777777777') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET country_code = '+20' WHERE id = '9ldATcSXuPSormBMjtC7cIzDn5S2' AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+20222222222', country_code = '+20' WHERE id = '9qDARZrusgcRsyZPRHfvTQCefvp2' AND (phone_e164 IS NULL OR phone_e164 = '+20222222222') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201114547570', country_code = '+20' WHERE id = '9uAsNX00TMNEUImZWM0g1Efu0ia2' AND (phone_e164 IS NULL OR phone_e164 = '+201114547570') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+97433805553', country_code = '+974' WHERE id = '9xe0Bp1pyWVAdLhsWwPAG4pUmXz2' AND (phone_e164 IS NULL OR phone_e164 = '+97433805553') AND (country_code IS NULL OR country_code = '+974');
UPDATE public.users SET phone_e164 = '+201211735464', country_code = '+20' WHERE id = '9zvBnkuxiDUXgCYUA5CfjZbjGm33' AND (phone_e164 IS NULL OR phone_e164 = '+201211735464') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+212709454486', country_code = '+212' WHERE id = 'A0XXRLZIz2eA1YaSOcegq3OLK473' AND (phone_e164 IS NULL OR phone_e164 = '+212709454486') AND (country_code IS NULL OR country_code = '+212');
UPDATE public.users SET phone_e164 = '+201278988085', country_code = '+20' WHERE id = 'A0ufqXmLW6cfGa7V9UuajHAAeBV2' AND (phone_e164 IS NULL OR phone_e164 = '+201278988085') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+218218122121212', country_code = '+218' WHERE id = 'A2CoJhIglggDynZQc999dbuA6Wv2' AND (phone_e164 IS NULL OR phone_e164 = '+218218122121212') AND (country_code IS NULL OR country_code = '+218');
UPDATE public.users SET supabase_uid = '7fe299d5-03a2-40ba-a04c-adc8dacec6e7'::uuid, phone_e164 = '+201101973515', country_code = '+20' WHERE id = '7fe299d5-03a2-40ba-a04c-adc8dacec6e7' AND (supabase_uid IS NULL OR supabase_uid = '7fe299d5-03a2-40ba-a04c-adc8dacec6e7'::uuid) AND (phone_e164 IS NULL OR phone_e164 = '+201101973515') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET supabase_uid = '09014029-f980-405a-8bc4-ee5afe87171d'::uuid, phone_e164 = '+201033002199', country_code = '+20' WHERE id = '09014029-f980-405a-8bc4-ee5afe87171d' AND (supabase_uid IS NULL OR supabase_uid = '09014029-f980-405a-8bc4-ee5afe87171d'::uuid) AND (phone_e164 IS NULL OR phone_e164 = '+201033002199') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201090062436', country_code = '+20' WHERE id = 'BMb71oCNpuRXzAqv9ijmtLl3pHa2' AND (phone_e164 IS NULL OR phone_e164 = '+201090062436') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET supabase_uid = 'df5bb735-3605-431b-a353-03900ed8ccd1'::uuid, phone_e164 = '+201288845799', country_code = '+20' WHERE id = 'df5bb735-3605-431b-a353-03900ed8ccd1' AND (supabase_uid IS NULL OR supabase_uid = 'df5bb735-3605-431b-a353-03900ed8ccd1'::uuid) AND (phone_e164 IS NULL OR phone_e164 = '+201288845799') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET supabase_uid = 'bd9c3094-0665-4dd8-ba70-c5e99f1e7772'::uuid WHERE id = 'bd9c3094-0665-4dd8-ba70-c5e99f1e7772' AND (supabase_uid IS NULL OR supabase_uid = 'bd9c3094-0665-4dd8-ba70-c5e99f1e7772'::uuid);
UPDATE public.users SET phone_e164 = '+201277316645', country_code = '+20' WHERE id = 'ABjIjm3DoTZ5AYRemTHb9n3Pd3f1' AND (phone_e164 IS NULL OR phone_e164 = '+201277316645') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+20114337186', country_code = '+20' WHERE id = 'BBjZhKxijcVDYgkY4PEo73Wxyvx1' AND (phone_e164 IS NULL OR phone_e164 = '+20114337186') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201019509878', country_code = '+20' WHERE id = 'BCKFvHOTsSMCQTlheVRWreDfur42' AND (phone_e164 IS NULL OR phone_e164 = '+201019509878') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201066055833', country_code = '+20' WHERE id = 'BEr0HzEuGxdXwMLhP1iEMfF4C7p2' AND (phone_e164 IS NULL OR phone_e164 = '+201066055833') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+202565656566', country_code = '+20' WHERE id = 'BIVvbBVvGYYNWxYbs88km8aM6Ek2' AND (phone_e164 IS NULL OR phone_e164 = '+202565656566') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET country_code = '+20' WHERE id = 'BSgBYEV28DTigLYzPUQ9TRLKmrZ2' AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET supabase_uid = '4ab24ee5-2286-47d5-bcd8-5899cabe8aa7'::uuid, phone_e164 = '+201152419395', country_code = '+20' WHERE id = '4ab24ee5-2286-47d5-bcd8-5899cabe8aa7' AND (supabase_uid IS NULL OR supabase_uid = '4ab24ee5-2286-47d5-bcd8-5899cabe8aa7'::uuid) AND (phone_e164 IS NULL OR phone_e164 = '+201152419395') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET country_code = '+20' WHERE id = 'DAmzLbIdIDdgBFkpEPvQntVhQCC3' AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+96888888888', country_code = '+968' WHERE id = 'D2KO1qbOf3XHxoI0IrqwT6GGuNQ2' AND (phone_e164 IS NULL OR phone_e164 = '+96888888888') AND (country_code IS NULL OR country_code = '+968');
UPDATE public.users SET phone_e164 = '+212638635440', country_code = '+212' WHERE id = 'D3M8gAVaNgbP4dTydx0ysUks5iR2' AND (phone_e164 IS NULL OR phone_e164 = '+212638635440') AND (country_code IS NULL OR country_code = '+212');
UPDATE public.users SET phone_e164 = '+212614265727', country_code = '+212' WHERE id = 'EKPSuSoIPnQPB2QVYGzinNlm2If1' AND (phone_e164 IS NULL OR phone_e164 = '+212614265727') AND (country_code IS NULL OR country_code = '+212');
UPDATE public.users SET supabase_uid = 'ac46e8d5-445b-4001-8836-e69dabfd87bd'::uuid, phone_e164 = '+201223995473', country_code = '+20' WHERE id = 'ac46e8d5-445b-4001-8836-e69dabfd87bd' AND (supabase_uid IS NULL OR supabase_uid = 'ac46e8d5-445b-4001-8836-e69dabfd87bd'::uuid) AND (phone_e164 IS NULL OR phone_e164 = '+201223995473') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201002629473', country_code = '+20' WHERE id = 'F896cwz0DcMRMxuX4MKvHuDCvyF2' AND (phone_e164 IS NULL OR phone_e164 = '+201002629473') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET supabase_uid = 'd162e1d0-75ea-4c68-b1de-cf3438063c3e'::uuid, phone_e164 = '+201225217230', country_code = '+20' WHERE id = 'd162e1d0-75ea-4c68-b1de-cf3438063c3e' AND (supabase_uid IS NULL OR supabase_uid = 'd162e1d0-75ea-4c68-b1de-cf3438063c3e'::uuid) AND (phone_e164 IS NULL OR phone_e164 = '+201225217230') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET country_code = '+20' WHERE id = 'G0jJVt23N5WcuZwPiclLZFxE7Ny1' AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+212766056647', country_code = '+212' WHERE id = 'GTm4YiM7QDRPHAWRlBa4bvHPC1M2' AND (phone_e164 IS NULL OR phone_e164 = '+212766056647') AND (country_code IS NULL OR country_code = '+212');
UPDATE public.users SET phone_e164 = '+201000568183', country_code = '+20' WHERE id = 'iUPAXPH6judWxrwZ5eXGM7ijvuz1' AND (phone_e164 IS NULL OR phone_e164 = '+201000568183') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+212661421831', country_code = '+212' WHERE id = 'BZ6xvbsRKIQH1uxMWXkecs6TkB92' AND (phone_e164 IS NULL OR phone_e164 = '+212661421831') AND (country_code IS NULL OR country_code = '+212');
UPDATE public.users SET phone_e164 = '+201114104239', country_code = '+20' WHERE id = 'EgfXajNX0QXtsIwRDA9XkfEZYgK2' AND (phone_e164 IS NULL OR phone_e164 = '+201114104239') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201225151161', country_code = '+20' WHERE id = 'kmDGC3daLaMZg3XXaONvmg78t5p1' AND (phone_e164 IS NULL OR phone_e164 = '+201225151161') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201103234767', country_code = '+20' WHERE id = 'kmDqxXa1RqTPDV9mR9IxfYtRbW22' AND (phone_e164 IS NULL OR phone_e164 = '+201103234767') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET supabase_uid = 'bff3ce30-9096-4045-9e9a-3219a8c02b97'::uuid, phone_e164 = '+201148167472', country_code = '+20' WHERE id = 'bff3ce30-9096-4045-9e9a-3219a8c02b97' AND (supabase_uid IS NULL OR supabase_uid = 'bff3ce30-9096-4045-9e9a-3219a8c02b97'::uuid) AND (phone_e164 IS NULL OR phone_e164 = '+201148167472') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201007038484', country_code = '+20' WHERE id = 'EkDl80B9HOUR2ER7elxxRovSUDo1' AND (phone_e164 IS NULL OR phone_e164 = '+201007038484') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+20100363963', country_code = '+20' WHERE id = 'En6cMssUnsUzKdHwRJMzPkkBvYs1' AND (phone_e164 IS NULL OR phone_e164 = '+20100363963') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+9741210008280', country_code = '+974' WHERE id = 'EtCngA6VauSDZSCRGMMJFl0SGQD3' AND (phone_e164 IS NULL OR phone_e164 = '+9741210008280') AND (country_code IS NULL OR country_code = '+974');
UPDATE public.users SET phone_e164 = '+212654727645', country_code = '+212' WHERE id = 'YcpDaa4H9cXcBtlDrV2UzTBysqq1' AND (phone_e164 IS NULL OR phone_e164 = '+212654727645') AND (country_code IS NULL OR country_code = '+212');
UPDATE public.users SET supabase_uid = '4bd8c112-65f0-4b94-84f8-9fb8b19d5c48'::uuid WHERE id = '4bd8c112-65f0-4b94-84f8-9fb8b19d5c48' AND (supabase_uid IS NULL OR supabase_uid = '4bd8c112-65f0-4b94-84f8-9fb8b19d5c48'::uuid);
UPDATE public.users SET phone_e164 = '+201029391918', country_code = '+20' WHERE id = 'EyHzrkB3VOeaI9AcnRuoXaaRls82' AND (phone_e164 IS NULL OR phone_e164 = '+201029391918') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+212632186098', country_code = '+212' WHERE id = 'YfSl7h9riaaL2mkKg7Rk05GGTC72' AND (phone_e164 IS NULL OR phone_e164 = '+212632186098') AND (country_code IS NULL OR country_code = '+212');
UPDATE public.users SET supabase_uid = 'a167a323-3d04-445a-a84d-3e154cd76424'::uuid WHERE id = 'a167a323-3d04-445a-a84d-3e154cd76424' AND (supabase_uid IS NULL OR supabase_uid = 'a167a323-3d04-445a-a84d-3e154cd76424'::uuid);
UPDATE public.users SET supabase_uid = 'd6a1974e-1b13-493c-a8aa-6f797fdda791'::uuid WHERE id = 'd6a1974e-1b13-493c-a8aa-6f797fdda791' AND (supabase_uid IS NULL OR supabase_uid = 'd6a1974e-1b13-493c-a8aa-6f797fdda791'::uuid);
UPDATE public.users SET phone_e164 = '+207205318855', country_code = '+20' WHERE id = 'F0uq3IBdvmZZFWlNcBLrwam7O2P2' AND (phone_e164 IS NULL OR phone_e164 = '+207205318855') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201146848521', country_code = '+20' WHERE id = 'F1hBxaCIe2ceteJcG5FOpw6kmIY2' AND (phone_e164 IS NULL OR phone_e164 = '+201146848521') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+202010504', country_code = '+20' WHERE id = 'F5Z1ieUdQFfJPWTewPEiQdiPbtb2' AND (phone_e164 IS NULL OR phone_e164 = '+202010504') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET supabase_uid = '687fd46b-a2e5-4fc1-9130-e85bca3ac8d7'::uuid WHERE id = '687fd46b-a2e5-4fc1-9130-e85bca3ac8d7' AND (supabase_uid IS NULL OR supabase_uid = '687fd46b-a2e5-4fc1-9130-e85bca3ac8d7'::uuid);
UPDATE public.users SET supabase_uid = '2b1539da-6f64-4093-b4c9-ceb203e7d899'::uuid WHERE id = '2b1539da-6f64-4093-b4c9-ceb203e7d899' AND (supabase_uid IS NULL OR supabase_uid = '2b1539da-6f64-4093-b4c9-ceb203e7d899'::uuid);
UPDATE public.users SET supabase_uid = '9e5673e1-ed6f-4185-aed2-750331ed3a98'::uuid WHERE id = '9e5673e1-ed6f-4185-aed2-750331ed3a98' AND (supabase_uid IS NULL OR supabase_uid = '9e5673e1-ed6f-4185-aed2-750331ed3a98'::uuid);
UPDATE public.users SET supabase_uid = '0a595fd5-1ced-42ec-9e02-0749a5ad3087'::uuid WHERE id = '0a595fd5-1ced-42ec-9e02-0749a5ad3087' AND (supabase_uid IS NULL OR supabase_uid = '0a595fd5-1ced-42ec-9e02-0749a5ad3087'::uuid);
UPDATE public.users SET supabase_uid = '0dfb4571-6b23-4954-9eae-d2820ecca62d'::uuid WHERE id = '0dfb4571-6b23-4954-9eae-d2820ecca62d' AND (supabase_uid IS NULL OR supabase_uid = '0dfb4571-6b23-4954-9eae-d2820ecca62d'::uuid);
UPDATE public.users SET phone_e164 = '+201157389303', country_code = '+20' WHERE id = 'BmvxoQk9xCOgfiuywWLm7inLmXf2' AND (phone_e164 IS NULL OR phone_e164 = '+201157389303') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET supabase_uid = 'dbb7f432-a703-4103-afe5-6eaff25487a8'::uuid WHERE id = 'dbb7f432-a703-4103-afe5-6eaff25487a8' AND (supabase_uid IS NULL OR supabase_uid = 'dbb7f432-a703-4103-afe5-6eaff25487a8'::uuid);
UPDATE public.users SET supabase_uid = '6f827667-1755-45e2-9c64-23e8f685d367'::uuid WHERE id = '6f827667-1755-45e2-9c64-23e8f685d367' AND (supabase_uid IS NULL OR supabase_uid = '6f827667-1755-45e2-9c64-23e8f685d367'::uuid);
UPDATE public.users SET supabase_uid = 'b28aa8b8-34da-494f-9b65-53e2860fb411'::uuid WHERE id = 'b28aa8b8-34da-494f-9b65-53e2860fb411' AND (supabase_uid IS NULL OR supabase_uid = 'b28aa8b8-34da-494f-9b65-53e2860fb411'::uuid);
UPDATE public.users SET supabase_uid = '8fa02c3f-d54a-40d5-b858-35cdfa95d71a'::uuid WHERE id = '8fa02c3f-d54a-40d5-b858-35cdfa95d71a' AND (supabase_uid IS NULL OR supabase_uid = '8fa02c3f-d54a-40d5-b858-35cdfa95d71a'::uuid);
UPDATE public.users SET phone_e164 = '+20155208166', country_code = '+20' WHERE id = 'KOI6u94kicVq77orkVKevjvBcry2' AND (phone_e164 IS NULL OR phone_e164 = '+20155208166') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+974557239278', country_code = '+974' WHERE id = 'KY5vDl95W0Q4rR1g6YZN38EPzA33' AND (phone_e164 IS NULL OR phone_e164 = '+974557239278') AND (country_code IS NULL OR country_code = '+974');
UPDATE public.users SET supabase_uid = '4cc84c4e-1e0d-4b9f-9254-c0c1ed2206e6'::uuid WHERE id = '4cc84c4e-1e0d-4b9f-9254-c0c1ed2206e6' AND (supabase_uid IS NULL OR supabase_uid = '4cc84c4e-1e0d-4b9f-9254-c0c1ed2206e6'::uuid);
UPDATE public.users SET phone_e164 = '+201456589466', country_code = '+20' WHERE id = 'BqoCWqwNh2ZRvmQjslsAVra1NNt1' AND (phone_e164 IS NULL OR phone_e164 = '+201456589466') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET country_code = '+20' WHERE id = 'MQjLp8F8Htduxw44TNZomfo1oXO2' AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201064221139', country_code = '+20' WHERE id = 'MSTqRYMODtYZwJYoxFjiupZmd9Z2' AND (phone_e164 IS NULL OR phone_e164 = '+201064221139') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201066663201', country_code = '+20' WHERE id = 'MSc6OZX4LnYPBjQYLYwsZGohGB62' AND (phone_e164 IS NULL OR phone_e164 = '+201066663201') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201556370448', country_code = '+20' WHERE id = 'MVQTWAkEXMbecxGPEG3nzi52Mvs1' AND (phone_e164 IS NULL OR phone_e164 = '+201556370448') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+212644432914', country_code = '+212' WHERE id = 'MXUUOBNIRocGXvqNe9VV5ckeHtN2' AND (phone_e164 IS NULL OR phone_e164 = '+212644432914') AND (country_code IS NULL OR country_code = '+212');
UPDATE public.users SET country_code = '+20' WHERE id = 'gzPgIjjWwaQESEv0NdbYru8BGlz1' AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET supabase_uid = 'c3333207-6247-4139-ab03-2ca0b522a05a'::uuid WHERE id = 'c3333207-6247-4139-ab03-2ca0b522a05a' AND (supabase_uid IS NULL OR supabase_uid = 'c3333207-6247-4139-ab03-2ca0b522a05a'::uuid);
UPDATE public.users SET phone_e164 = '+201124013550', country_code = '+20' WHERE id = 'FE9bkM2aDRNoSvBNrXD43tUCBAj1' AND (phone_e164 IS NULL OR phone_e164 = '+201124013550') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+212669569332', country_code = '+212' WHERE id = 'FFkhWJiKbPhGJ9lzP78aStlakki2' AND (phone_e164 IS NULL OR phone_e164 = '+212669569332') AND (country_code IS NULL OR country_code = '+212');
UPDATE public.users SET phone_e164 = '+212603763067', country_code = '+212' WHERE id = 'FIlVm01HyIOoqPdxipovKd5189k2' AND (phone_e164 IS NULL OR phone_e164 = '+212603763067') AND (country_code IS NULL OR country_code = '+212');
UPDATE public.users SET phone_e164 = '+201005721693', country_code = '+20' WHERE id = 'FJtbCP6aHrfZ05EkrdYIvk9aTQl1' AND (phone_e164 IS NULL OR phone_e164 = '+201005721693') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201007215526', country_code = '+20' WHERE id = 'FTdZI9tT8hNiP6KJIpjuSARYWQ13' AND (phone_e164 IS NULL OR phone_e164 = '+201007215526') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+212714276632', country_code = '+212' WHERE id = 'FUlBT8VrZ8PM3FZM6c5bZ8yhZ1x1' AND (phone_e164 IS NULL OR phone_e164 = '+212714276632') AND (country_code IS NULL OR country_code = '+212');
UPDATE public.users SET supabase_uid = 'd2b6b82b-6689-40dd-880d-481b82c184f0'::uuid WHERE id = 'd2b6b82b-6689-40dd-880d-481b82c184f0' AND (supabase_uid IS NULL OR supabase_uid = 'd2b6b82b-6689-40dd-880d-481b82c184f0'::uuid);
UPDATE public.users SET phone_e164 = '+212606737317', country_code = '+212' WHERE id = 'FYsdWzlBp8hVZjjZdM159j5gXc42' AND (phone_e164 IS NULL OR phone_e164 = '+212606737317') AND (country_code IS NULL OR country_code = '+212');
UPDATE public.users SET supabase_uid = 'c9564f9c-4562-4690-8e9a-4342ff29ed3c'::uuid, phone_e164 = '+201028234617', country_code = '+20' WHERE id = 'c9564f9c-4562-4690-8e9a-4342ff29ed3c' AND (supabase_uid IS NULL OR supabase_uid = 'c9564f9c-4562-4690-8e9a-4342ff29ed3c'::uuid) AND (phone_e164 IS NULL OR phone_e164 = '+201028234617') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET country_code = '+20' WHERE id = 'FfX9wD3YhpXvoBTn7kBbNn0gIow1' AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201202437327', country_code = '+20' WHERE id = 'Ffpc8Rta8NbYH8GgSZ6Vn2tbiTi2' AND (phone_e164 IS NULL OR phone_e164 = '+201202437327') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET country_code = '+974' WHERE id = 'FhNmAqluG7P7WTwlyRqnTnf0qf23' AND (country_code IS NULL OR country_code = '+974');
UPDATE public.users SET supabase_uid = 'e439a4b1-35c0-4c64-a246-5958f4a01d41'::uuid, phone_e164 = '+201278834105', country_code = '+20' WHERE id = 'e439a4b1-35c0-4c64-a246-5958f4a01d41' AND (supabase_uid IS NULL OR supabase_uid = 'e439a4b1-35c0-4c64-a246-5958f4a01d41'::uuid) AND (phone_e164 IS NULL OR phone_e164 = '+201278834105') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201557842395', country_code = '+20' WHERE id = 'PncEnFUtxnUfjV2Pm7p4J68dKBZ2' AND (phone_e164 IS NULL OR phone_e164 = '+201557842395') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201060789558', country_code = '+20' WHERE id = 'ByzRWubLrKbpGbhtfTe9MTmGLTI3' AND (phone_e164 IS NULL OR phone_e164 = '+201060789558') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201027519175', country_code = '+20' WHERE id = 'FiB3X6Q1ebVC10CFLCqw35wDGya2' AND (phone_e164 IS NULL OR phone_e164 = '+201027519175') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+212694017342', country_code = '+212' WHERE id = 'QXvKLUIfwOhfn2Yu4NRV6ClG04H2' AND (phone_e164 IS NULL OR phone_e164 = '+212694017342') AND (country_code IS NULL OR country_code = '+212');
UPDATE public.users SET supabase_uid = '8d5ac810-cd68-4a3b-b8df-f5c9c96dce4a'::uuid, phone_e164 = '+201006178735', country_code = '+20' WHERE id = '8d5ac810-cd68-4a3b-b8df-f5c9c96dce4a' AND (supabase_uid IS NULL OR supabase_uid = '8d5ac810-cd68-4a3b-b8df-f5c9c96dce4a'::uuid) AND (phone_e164 IS NULL OR phone_e164 = '+201006178735') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201125202674', country_code = '+20' WHERE id = 'G3M9SsIy0PNZTq9lpxNbJxfOkVb2' AND (phone_e164 IS NULL OR phone_e164 = '+201125202674') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+204456545646', country_code = '+20' WHERE id = 'G6rJMziZ31Vrv8gxcxGBpfiEY4l2' AND (phone_e164 IS NULL OR phone_e164 = '+204456545646') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201552710009', country_code = '+20' WHERE id = 'GH0nltEwWrZ04QckamoYYBKGNJ63' AND (phone_e164 IS NULL OR phone_e164 = '+201552710009') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+20111068402', country_code = '+20' WHERE id = 'GVm2P5gt71Rd7Tu18n2FdR3HJYY2' AND (phone_e164 IS NULL OR phone_e164 = '+20111068402') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+212775433648', country_code = '+212' WHERE id = 'QZUQa7NOExdZ4fuwQfftvYLnNgG2' AND (phone_e164 IS NULL OR phone_e164 = '+212775433648') AND (country_code IS NULL OR country_code = '+212');
UPDATE public.users SET phone_e164 = '+201017799554', country_code = '+20' WHERE id = 'Qowdt4AUekMmYVgBE31Fieq78sf1' AND (phone_e164 IS NULL OR phone_e164 = '+201017799554') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+212670871904', country_code = '+212' WHERE id = 'QqLFeSzaWpN9ayz4o2GdzpikF2Q2' AND (phone_e164 IS NULL OR phone_e164 = '+212670871904') AND (country_code IS NULL OR country_code = '+212');
UPDATE public.users SET phone_e164 = '+212648573287', country_code = '+212' WHERE id = 'QxAyFyR3CUTUZzGnM2nZSdpyIM93' AND (phone_e164 IS NULL OR phone_e164 = '+212648573287') AND (country_code IS NULL OR country_code = '+212');
UPDATE public.users SET phone_e164 = '+212611414202', country_code = '+212' WHERE id = 'wRQUUGzGIxhIfRnkehtfoi0JcBi2' AND (phone_e164 IS NULL OR phone_e164 = '+212611414202') AND (country_code IS NULL OR country_code = '+212');
UPDATE public.users SET phone_e164 = '+201020665364', country_code = '+20' WHERE id = 'ROXwkp86lhcwI4uzeQm3Jvr1Tv72' AND (phone_e164 IS NULL OR phone_e164 = '+201020665364') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201222595512', country_code = '+20' WHERE id = 'SKRumOF8H5SltAyGXHYDq5pw5up2' AND (phone_e164 IS NULL OR phone_e164 = '+201222595512') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201026967601', country_code = '+20' WHERE id = 'SL4uu33dCoeZWo2ckwEanEEWjWP2' AND (phone_e164 IS NULL OR phone_e164 = '+201026967601') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+212631062915', country_code = '+212' WHERE id = 'Yyd0SVJqulX33NA89XoXcqtA3p53' AND (phone_e164 IS NULL OR phone_e164 = '+212631062915') AND (country_code IS NULL OR country_code = '+212');
UPDATE public.users SET phone_e164 = '+212627268249', country_code = '+212' WHERE id = 'Z9A25Jy7KrMxse4a9DXmDIKvzZJ2' AND (phone_e164 IS NULL OR phone_e164 = '+212627268249') AND (country_code IS NULL OR country_code = '+212');
UPDATE public.users SET phone_e164 = '+212600239457', country_code = '+212' WHERE id = 'BzVEoFM2voXzN2uksoyKGPNQspq1' AND (phone_e164 IS NULL OR phone_e164 = '+212600239457') AND (country_code IS NULL OR country_code = '+212');
UPDATE public.users SET phone_e164 = '+212602506617', country_code = '+212' WHERE id = 'BziF30DInhhb2H4G93uh1fSkggg2' AND (phone_e164 IS NULL OR phone_e164 = '+212602506617') AND (country_code IS NULL OR country_code = '+212');
UPDATE public.users SET phone_e164 = '+201229807313', country_code = '+20' WHERE id = 'CNgZvut98rQMNDV11gUulPjYFLn1' AND (phone_e164 IS NULL OR phone_e164 = '+201229807313') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201091888588', country_code = '+20' WHERE id = 'CU88PANTPzeZkReP5ahWwThiDdh2' AND (phone_e164 IS NULL OR phone_e164 = '+201091888588') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET country_code = '+20' WHERE id = 'sHPy0L0k21QnPzRdUIKbKE5crnh1' AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+20120105920', country_code = '+20' WHERE id = 'CWTWYBVqETOdDit0A7izYUAiVjF3' AND (phone_e164 IS NULL OR phone_e164 = '+20120105920') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+20666666666', country_code = '+20' WHERE id = 'a4i3fk7xU6T9Mn4Vtjzdb5jlTC93' AND (phone_e164 IS NULL OR phone_e164 = '+20666666666') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET supabase_uid = '8eea190f-30bb-4006-ba23-d2fc7ec1f25b'::uuid, phone_e164 = '+201207801940', country_code = '+20' WHERE id = '8eea190f-30bb-4006-ba23-d2fc7ec1f25b' AND (supabase_uid IS NULL OR supabase_uid = '8eea190f-30bb-4006-ba23-d2fc7ec1f25b'::uuid) AND (phone_e164 IS NULL OR phone_e164 = '+201207801940') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+212669277676', country_code = '+212' WHERE id = 'SB0UbJg5f0Nb0yjA128rKOq5Kxp2' AND (phone_e164 IS NULL OR phone_e164 = '+212669277676') AND (country_code IS NULL OR country_code = '+212');
UPDATE public.users SET phone_e164 = '+201225298238', country_code = '+20' WHERE id = 'ZCACHjwZBWXgrNeVA7AiNcLLZb12' AND (phone_e164 IS NULL OR phone_e164 = '+201225298238') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+212654727654', country_code = '+212' WHERE id = 'a9RB9pEQ2IMKsjI5Az6Har4iISy2' AND (phone_e164 IS NULL OR phone_e164 = '+212654727654') AND (country_code IS NULL OR country_code = '+212');
UPDATE public.users SET phone_e164 = '+212633678362', country_code = '+212' WHERE id = 'RsoahrVAQSM2LYrC1vAyjIp70Hi1' AND (phone_e164 IS NULL OR phone_e164 = '+212633678362') AND (country_code IS NULL OR country_code = '+212');
UPDATE public.users SET country_code = '+20' WHERE id = 'STbQGj6NZmSaC2BEFujJmDNhwdr2' AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201032003859', country_code = '+20' WHERE id = 'SfIFkEOqccTqLBPWtppcqwb2dU42' AND (phone_e164 IS NULL OR phone_e164 = '+201032003859') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET supabase_uid = 'c914c55c-eaba-4dea-9505-026babf16e9a'::uuid, phone_e164 = '+201122963034', country_code = '+20' WHERE id = 'c914c55c-eaba-4dea-9505-026babf16e9a' AND (supabase_uid IS NULL OR supabase_uid = 'c914c55c-eaba-4dea-9505-026babf16e9a'::uuid) AND (phone_e164 IS NULL OR phone_e164 = '+201122963034') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+212703844119', country_code = '+212' WHERE id = 'T5RKdXIX9bP2SRyeVEdXR0IttSd2' AND (phone_e164 IS NULL OR phone_e164 = '+212703844119') AND (country_code IS NULL OR country_code = '+212');
UPDATE public.users SET phone_e164 = '+97433294642', country_code = '+974' WHERE id = 'h1MljZwxcxVAKO0or2QmIKRujri1' AND (phone_e164 IS NULL OR phone_e164 = '+97433294642') AND (country_code IS NULL OR country_code = '+974');
UPDATE public.users SET phone_e164 = '+212687806444', country_code = '+212' WHERE id = 'Fry96211XbOtn1rCNvCNM5QMTDy2' AND (phone_e164 IS NULL OR phone_e164 = '+212687806444') AND (country_code IS NULL OR country_code = '+212');
UPDATE public.users SET phone_e164 = '+212766858092', country_code = '+212' WHERE id = 'TLxxCY8dh5YJUNoEiJ1PQUAfLUz2' AND (phone_e164 IS NULL OR phone_e164 = '+212766858092') AND (country_code IS NULL OR country_code = '+212');
UPDATE public.users SET country_code = '+20' WHERE id = 'U3wAb0XAnOc076bQRYTSuS4qynF2' AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET country_code = '+20' WHERE id = 'VGpdSJ6w6nO27kbF9tfzSqXFwm93' AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201500381149', country_code = '+20' WHERE id = 'WMLwP8Qz2MdrpNibNrX8gL8ffC12' AND (phone_e164 IS NULL OR phone_e164 = '+201500381149') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201019622227', country_code = '+20' WHERE id = 'WNubUmax57bOPq0b4MoiZSezWSf1' AND (phone_e164 IS NULL OR phone_e164 = '+201019622227') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+97477888641', country_code = '+974' WHERE id = 'WPZiyjjjbJaYNjtk2Ie6rkYnAgE3' AND (phone_e164 IS NULL OR phone_e164 = '+97477888641') AND (country_code IS NULL OR country_code = '+974');
UPDATE public.users SET phone_e164 = '+201055583529', country_code = '+20' WHERE id = 'WV3mRGMVEJXUFGRhCKVeh5aRNXH2' AND (phone_e164 IS NULL OR phone_e164 = '+201055583529') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201117631806', country_code = '+20' WHERE id = 'H2uhbNETdYfS7XRvzKJWsnx1KbH3' AND (phone_e164 IS NULL OR phone_e164 = '+201117631806') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET supabase_uid = 'eb25c4bd-9136-4ad2-b28d-776807e59868'::uuid, phone_e164 = '+201282824121', country_code = '+20' WHERE id = 'eb25c4bd-9136-4ad2-b28d-776807e59868' AND (supabase_uid IS NULL OR supabase_uid = 'eb25c4bd-9136-4ad2-b28d-776807e59868'::uuid) AND (phone_e164 IS NULL OR phone_e164 = '+201282824121') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET country_code = '+20' WHERE id = 'VLgqXm1tyITI3JMrfpJoEC1IAIM2' AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201020064327', country_code = '+20' WHERE id = 'H9G7dwRaCcbiRZ9MNWiwadxKOgC3' AND (phone_e164 IS NULL OR phone_e164 = '+201020064327') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201080266423', country_code = '+20' WHERE id = 'HE8hG2wDy9OlGnYrivH6wlPxJgV2' AND (phone_e164 IS NULL OR phone_e164 = '+201080266423') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201000225767', country_code = '+20' WHERE id = 'HHJFRWbk9uWkW2whO6umaqaAvKw1' AND (phone_e164 IS NULL OR phone_e164 = '+201000225767') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+97470688715', country_code = '+974' WHERE id = 'HKi4hS0wceYRBV5cxGLMxCE8dhs2' AND (phone_e164 IS NULL OR phone_e164 = '+97470688715') AND (country_code IS NULL OR country_code = '+974');
UPDATE public.users SET phone_e164 = '+9741016740761', country_code = '+974' WHERE id = 'HP9zd3AwRlZLqVEL3XhzUGiFIeP2' AND (phone_e164 IS NULL OR phone_e164 = '+9741016740761') AND (country_code IS NULL OR country_code = '+974');
UPDATE public.users SET phone_e164 = '+212728837879', country_code = '+212' WHERE id = 'VZYYx5WSQVaxcqjJS3GAcaJ0jt52' AND (phone_e164 IS NULL OR phone_e164 = '+212728837879') AND (country_code IS NULL OR country_code = '+212');
UPDATE public.users SET country_code = '+20' WHERE id = 'HPJaSUeMxpYPhNmHGnCTlBjnwdH3' AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+212649287511', country_code = '+212' WHERE id = 'HQQdKwiQMvZawiykwEdkfAiQUb13' AND (phone_e164 IS NULL OR phone_e164 = '+212649287511') AND (country_code IS NULL OR country_code = '+212');
UPDATE public.users SET country_code = '+20' WHERE id = 'HRSXGWiFrheWOBTWn7QS17Qqj2D2' AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET country_code = '+20' WHERE id = 'HTMembYmTsS4enT58DlGFNu6X8B2' AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+212677620627', country_code = '+212' WHERE id = 'HTcTZXN6eJSLxPPRqA9zLkmW1d33' AND (phone_e164 IS NULL OR phone_e164 = '+212677620627') AND (country_code IS NULL OR country_code = '+212');
UPDATE public.users SET phone_e164 = '+201154564418', country_code = '+20' WHERE id = 'HVyr9b1sQ5hGJQFb9KgvRnaSh773' AND (phone_e164 IS NULL OR phone_e164 = '+201154564418') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+212664154517', country_code = '+212' WHERE id = 'HXk405rOk0ViYefTBWnvQE3hVXi1' AND (phone_e164 IS NULL OR phone_e164 = '+212664154517') AND (country_code IS NULL OR country_code = '+212');
UPDATE public.users SET phone_e164 = '+201122335566', country_code = '+20' WHERE id = 'HcIZ563zPnMNxYtA779Sr8XtHof2' AND (phone_e164 IS NULL OR phone_e164 = '+201122335566') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+97477779704', country_code = '+974' WHERE id = 'Hf4R5rYJj3SCe9ThEqmWCNhIfFM2' AND (phone_e164 IS NULL OR phone_e164 = '+97477779704') AND (country_code IS NULL OR country_code = '+974');
UPDATE public.users SET phone_e164 = '+201201721001', country_code = '+20' WHERE id = 'Hr3OG3kn14XJ9dlKXlTM9vOUmtT2' AND (phone_e164 IS NULL OR phone_e164 = '+201201721001') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+20100096071', country_code = '+20' WHERE id = 'HvvK8bginEQmpsoNsj7jQg8OuE83' AND (phone_e164 IS NULL OR phone_e164 = '+20100096071') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+212773749558', country_code = '+212' WHERE id = 'I1ZVb32tOkaFV3zNxGp2H3VGnlr1' AND (phone_e164 IS NULL OR phone_e164 = '+212773749558') AND (country_code IS NULL OR country_code = '+212');
UPDATE public.users SET phone_e164 = '+201062536598', country_code = '+20' WHERE id = 'I1ejDCJMVxbFk6qBUU8RiplDWwE3' AND (phone_e164 IS NULL OR phone_e164 = '+201062536598') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201285912282', country_code = '+20' WHERE id = 'I4Jy1XiL2eRofD5Gy0fHe3zuN9x1' AND (phone_e164 IS NULL OR phone_e164 = '+201285912282') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET country_code = '+20' WHERE id = 'IAueTamMAydLDD875IL3ixyG50w1' AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+212625926508', country_code = '+212' WHERE id = 'IQtD1HwKMyTyVkhmpBeiNwiGacI3' AND (phone_e164 IS NULL OR phone_e164 = '+212625926508') AND (country_code IS NULL OR country_code = '+212');
UPDATE public.users SET country_code = '+20' WHERE id = 'ISXPhEDZKnaZpMDNq38JYlb5k593' AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET country_code = '+20' WHERE id = 'IT83aO1vtsPMb8ClCW6uNR6wLj73' AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET country_code = '+20' WHERE id = 'IX34KOCXrccUHSaj7JGOgMO7nzA2' AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201090237308', country_code = '+20' WHERE id = 'IaahNO4wD5UeK1BuhmnbyM4x7kL2' AND (phone_e164 IS NULL OR phone_e164 = '+201090237308') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201226577812', country_code = '+20' WHERE id = 'Ic3L1PS826TcSzlcSSKfGZBErYD2' AND (phone_e164 IS NULL OR phone_e164 = '+201226577812') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+97455068608', country_code = '+974' WHERE id = 'IffDSxVutafhqUSoCcnNErUiUcJ2' AND (phone_e164 IS NULL OR phone_e164 = '+97455068608') AND (country_code IS NULL OR country_code = '+974');
UPDATE public.users SET phone_e164 = '+201148181720', country_code = '+20' WHERE id = 'IkjOYpGeurVrNPc13TSDTYMAaGi2' AND (phone_e164 IS NULL OR phone_e164 = '+201148181720') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+212675831949', country_code = '+212' WHERE id = 'IqP4WQ0lZyeoGPWNxvnPcjVUW6i1' AND (phone_e164 IS NULL OR phone_e164 = '+212675831949') AND (country_code IS NULL OR country_code = '+212');
UPDATE public.users SET supabase_uid = 'c7f04927-e513-490d-a295-760916ba3829'::uuid, phone_e164 = '+201033687146', country_code = '+20' WHERE id = 'c7f04927-e513-490d-a295-760916ba3829' AND (supabase_uid IS NULL OR supabase_uid = 'c7f04927-e513-490d-a295-760916ba3829'::uuid) AND (phone_e164 IS NULL OR phone_e164 = '+201033687146') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201129601210', country_code = '+20' WHERE id = 'IrdubgeLKzOYNnb2DLE8E1Q51xv2' AND (phone_e164 IS NULL OR phone_e164 = '+201129601210') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET country_code = '+20' WHERE id = 'J0MbCZ4LENSI3Ej0waTBVTizAgm2' AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201210700343', country_code = '+20' WHERE id = 'J0bdOf9ykKSz93XylbZyLGzUj9A2' AND (phone_e164 IS NULL OR phone_e164 = '+201210700343') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201111001214', country_code = '+20' WHERE id = 'J6rpAamOoIRGVU3z06WKuW3aupJ2' AND (phone_e164 IS NULL OR phone_e164 = '+201111001214') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+212601665200', country_code = '+212' WHERE id = 'J9h1Sgm6HagOUmpiL9XDwCDWtzd2' AND (phone_e164 IS NULL OR phone_e164 = '+212601665200') AND (country_code IS NULL OR country_code = '+212');
UPDATE public.users SET phone_e164 = '+20128995730', country_code = '+20' WHERE id = 'JGLDBGacmqfcdTpK2f2DKuHSWMD3' AND (phone_e164 IS NULL OR phone_e164 = '+20128995730') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+351351789898989', country_code = '+351' WHERE id = 'JHTNivt4OxPkpng5lFhJK8G6bGC2' AND (phone_e164 IS NULL OR phone_e164 = '+351351789898989') AND (country_code IS NULL OR country_code = '+351');
UPDATE public.users SET country_code = '+974' WHERE id = 'JJ8MJBUvdRhTz7XZeQU3qBdjSbG2' AND (country_code IS NULL OR country_code = '+974');
UPDATE public.users SET country_code = '+20' WHERE id = 'JR0m7RpSDfUTHp5C6umqJe3Pwpz2' AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+20120502767', country_code = '+20' WHERE id = 'JUkFzxyb3PW3Kpxs1sZjDGHLSco1' AND (phone_e164 IS NULL OR phone_e164 = '+20120502767') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+20100142457', country_code = '+20' WHERE id = 'JUp6mu51MCMfxN0L7DHKNoyMXU73' AND (phone_e164 IS NULL OR phone_e164 = '+20100142457') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+212727505135', country_code = '+212' WHERE id = 'JWBCciJWJibNo9EsYwP32YZHwiI2' AND (phone_e164 IS NULL OR phone_e164 = '+212727505135') AND (country_code IS NULL OR country_code = '+212');
UPDATE public.users SET phone_e164 = '+201095395057', country_code = '+20' WHERE id = 'JkYzpvv8EBhIqUh9o1U4qqIV9m83' AND (phone_e164 IS NULL OR phone_e164 = '+201095395057') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+9747253333', country_code = '+974' WHERE id = 'GQSMfDZabaaMbQxI22ZqOsWmcA32' AND (phone_e164 IS NULL OR phone_e164 = '+9747253333') AND (country_code IS NULL OR country_code = '+974');
UPDATE public.users SET phone_e164 = '+201095256603', country_code = '+20' WHERE id = 'JlSbCWqyFKO6okrmtjiu7DJoa703' AND (phone_e164 IS NULL OR phone_e164 = '+201095256603') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET country_code = '+20' WHERE id = 'JsErzrhUtpRmYbwCcO6BHRYtPDf2' AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201123667113', country_code = '+20' WHERE id = 'K1Ja36xkDSPDAyCx4fXRTPA8v8R2' AND (phone_e164 IS NULL OR phone_e164 = '+201123667113') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET country_code = '+20' WHERE id = 'K3KO6eTf64fuJnOtIf2cDOxzrs83' AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201202225465', country_code = '+20' WHERE id = 'K5NI3QEQQieG652hVCJmZ6uoN6w1' AND (phone_e164 IS NULL OR phone_e164 = '+201202225465') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+212698826526', country_code = '+212' WHERE id = 'b6d2316e-d64b-41ec-8a2f-055326d2ac9d' AND (phone_e164 IS NULL OR phone_e164 = '+212698826526') AND (country_code IS NULL OR country_code = '+212');
UPDATE public.users SET supabase_uid = '2bcdadc8-e526-4d24-8102-e6e5a8531d91'::uuid, phone_e164 = '+97455954119', country_code = '+974' WHERE id = '2bcdadc8-e526-4d24-8102-e6e5a8531d91' AND (supabase_uid IS NULL OR supabase_uid = '2bcdadc8-e526-4d24-8102-e6e5a8531d91'::uuid) AND (phone_e164 IS NULL OR phone_e164 = '+97455954119') AND (country_code IS NULL OR country_code = '+974');
UPDATE public.users SET phone_e164 = '+201275824964', country_code = '+20' WHERE id = '5qAmW8jxdEV6AkMgZI0QXnKOTww1' AND (phone_e164 IS NULL OR phone_e164 = '+201275824964') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201013225081', country_code = '+20' WHERE id = '5tWDIdkYL2btIdXZRH7tamkNUKj1' AND (phone_e164 IS NULL OR phone_e164 = '+201013225081') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+97455452211', country_code = '+974' WHERE id = '9Kdp3IhbyKPAozGUKdPLxEEtkME3' AND (phone_e164 IS NULL OR phone_e164 = '+97455452211') AND (country_code IS NULL OR country_code = '+974');
UPDATE public.users SET phone_e164 = '+212676179921', country_code = '+212' WHERE id = 'HBHpftF49XYAUNEOriHbPXVsSPy1' AND (phone_e164 IS NULL OR phone_e164 = '+212676179921') AND (country_code IS NULL OR country_code = '+212');
UPDATE public.users SET phone_e164 = '+201284025789', country_code = '+20' WHERE id = 'HBTwHoejMebD5jBYjNOaWjeKOl02' AND (phone_e164 IS NULL OR phone_e164 = '+201284025789') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+20127641623', country_code = '+20' WHERE id = 'HDnBSGWF8sXiQBupzxKwMt8WT5X2' AND (phone_e164 IS NULL OR phone_e164 = '+20127641623') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201203090532', country_code = '+20' WHERE id = 'K7mg7N5eS1dVGbPKeXbgnEb0OPE3' AND (phone_e164 IS NULL OR phone_e164 = '+201203090532') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201101716533', country_code = '+20' WHERE id = 'KA8kV594TXYHzrVwwQtj60tWWVq1' AND (phone_e164 IS NULL OR phone_e164 = '+201101716533') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201101306024', country_code = '+20' WHERE id = 'KFoFpPcCcCf73AEtgT9j86itZqD3' AND (phone_e164 IS NULL OR phone_e164 = '+201101306024') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET country_code = '+974' WHERE id = 'KZmKBAzGDAVMqgGSkrIgy7UbaXJ2' AND (country_code IS NULL OR country_code = '+974');
UPDATE public.users SET phone_e164 = '+201556016264', country_code = '+20' WHERE id = 'KZpZlVCuEHdJEf2gXx1nPUjn0i82' AND (phone_e164 IS NULL OR phone_e164 = '+201556016264') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+212694506352', country_code = '+212' WHERE id = 'Kc0Vn8kepbc6fId864rR2T2Sp0e2' AND (phone_e164 IS NULL OR phone_e164 = '+212694506352') AND (country_code IS NULL OR country_code = '+212');
UPDATE public.users SET phone_e164 = '+201127584187', country_code = '+20' WHERE id = 'KlgXkgd3cMYR0g4fxQReMJVY86b2' AND (phone_e164 IS NULL OR phone_e164 = '+201127584187') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+212641412824', country_code = '+212' WHERE id = 'jMaJBEMXQ0U34UAQJ7szxTE4ukN2' AND (phone_e164 IS NULL OR phone_e164 = '+212641412824') AND (country_code IS NULL OR country_code = '+212');
UPDATE public.users SET phone_e164 = '+20111609715', country_code = '+20' WHERE id = 'jNQtdcytj5aNuB9HH1k82GTz97E3' AND (phone_e164 IS NULL OR phone_e164 = '+20111609715') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201061346838', country_code = '+20' WHERE id = '5uJI54XelQdt5DJqGr9O6wLPirq2' AND (phone_e164 IS NULL OR phone_e164 = '+201061346838') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+212715594316', country_code = '+212' WHERE id = '9OSUGSPGlXV3qc6JokeE8xsA0Ax1' AND (phone_e164 IS NULL OR phone_e164 = '+212715594316') AND (country_code IS NULL OR country_code = '+212');
UPDATE public.users SET phone_e164 = '+9741030456946', country_code = '+974' WHERE id = 'HhaxbH4J3MbvbtCnvaatNZbkH1s2' AND (phone_e164 IS NULL OR phone_e164 = '+9741030456946') AND (country_code IS NULL OR country_code = '+974');
UPDATE public.users SET phone_e164 = '+212687929385', country_code = '+212' WHERE id = 'HytjCjQiPNcMlch13vxh2YYUyK03' AND (phone_e164 IS NULL OR phone_e164 = '+212687929385') AND (country_code IS NULL OR country_code = '+212');
UPDATE public.users SET country_code = '+20' WHERE id = 'Kn3NlMQA0iT5TEIsr9DNvcCnJ1j2' AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+213222222222', country_code = '+213' WHERE id = 'Kn3upyHurkW7maswxakvyPTBcvS2' AND (phone_e164 IS NULL OR phone_e164 = '+213222222222') AND (country_code IS NULL OR country_code = '+213');
UPDATE public.users SET supabase_uid = '105884aa-4466-426e-9225-5befaf3c6686'::uuid, phone_e164 = '+201141567473', country_code = '+20' WHERE id = '105884aa-4466-426e-9225-5befaf3c6686' AND (supabase_uid IS NULL OR supabase_uid = '105884aa-4466-426e-9225-5befaf3c6686'::uuid) AND (phone_e164 IS NULL OR phone_e164 = '+201141567473') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+212775162764', country_code = '+212' WHERE id = 'KnVLCquylsWHG7oz6M1khHr37bO2' AND (phone_e164 IS NULL OR phone_e164 = '+212775162764') AND (country_code IS NULL OR country_code = '+212');
UPDATE public.users SET phone_e164 = '+212648547161', country_code = '+212' WHERE id = 'KrQCJxoVWgZ4LpTAsxT93cPO6502' AND (phone_e164 IS NULL OR phone_e164 = '+212648547161') AND (country_code IS NULL OR country_code = '+212');
UPDATE public.users SET phone_e164 = '+201026860494', country_code = '+20' WHERE id = 'KyxoJBn2rXaeJ3OFLlGzhMpmhCn2' AND (phone_e164 IS NULL OR phone_e164 = '+201026860494') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET country_code = '+20' WHERE id = 'L0q5pWIWNoeQTNAHTofFVBZR4Is2' AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201002029869', country_code = '+20' WHERE id = 'jHziIlEiXGNMNkzaw2Wn4ByPPKs1' AND (phone_e164 IS NULL OR phone_e164 = '+201002029869') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET supabase_uid = 'd1fd1166-6712-48ec-855a-40ced1158dec'::uuid, phone_e164 = '+212762080488', country_code = '+212' WHERE id = 'd1fd1166-6712-48ec-855a-40ced1158dec' AND (supabase_uid IS NULL OR supabase_uid = 'd1fd1166-6712-48ec-855a-40ced1158dec'::uuid) AND (phone_e164 IS NULL OR phone_e164 = '+212762080488') AND (country_code IS NULL OR country_code = '+212');
UPDATE public.users SET phone_e164 = '+21821817799580', country_code = '+218' WHERE id = '5F3g5pzrSQapdGvTkLI2ma6wKdq1' AND (phone_e164 IS NULL OR phone_e164 = '+21821817799580') AND (country_code IS NULL OR country_code = '+218');
UPDATE public.users SET country_code = '+20' WHERE id = '5GkuT3BavpYJTUqAqywKmyVIo4A2' AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201050956350', country_code = '+20' WHERE id = '5JPmJBLElRMwsKNrMldxE2CuP0B3' AND (phone_e164 IS NULL OR phone_e164 = '+201050956350') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+212695696671', country_code = '+212' WHERE id = '5K4gfHOFGCenUvnItFl0UbUF9Gu1' AND (phone_e164 IS NULL OR phone_e164 = '+212695696671') AND (country_code IS NULL OR country_code = '+212');
UPDATE public.users SET phone_e164 = '+20102025868', country_code = '+20' WHERE id = '5LMSTd1FXLbFVW6KHxKjsnXqJn03' AND (phone_e164 IS NULL OR phone_e164 = '+20102025868') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201285223867', country_code = '+20' WHERE id = 'IEYrpMe9b8S0Pp4KdbG4h9vc12B2' AND (phone_e164 IS NULL OR phone_e164 = '+201285223867') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET country_code = '+20' WHERE id = '5GPkOLHk0KhgzDPr3NrSR9yNfVl1' AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET country_code = '+20' WHERE id = '5MXk1L5ccyXWPZsRxCjX7THZLox2' AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+212629409295', country_code = '+212' WHERE id = '5PrtRJF6kVRuOm7u8ZjgXlAmduV2' AND (phone_e164 IS NULL OR phone_e164 = '+212629409295') AND (country_code IS NULL OR country_code = '+212');
UPDATE public.users SET phone_e164 = '+201226320633', country_code = '+20' WHERE id = '5Su7eBztcsRvpDwlZHpqFEZ2qA22' AND (phone_e164 IS NULL OR phone_e164 = '+201226320633') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET country_code = '+20' WHERE id = 'LGBFQZrBUzLxEmh77aLQRtv7KRw2' AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+212608219789', country_code = '+212' WHERE id = 'LK8Clz76cgYRviY7mrhzBPydN2i1' AND (phone_e164 IS NULL OR phone_e164 = '+212608219789') AND (country_code IS NULL OR country_code = '+212');
UPDATE public.users SET phone_e164 = '+201060376594', country_code = '+20' WHERE id = 'MXcRMvAjd2edeRZf1cBSWS2MG7a2' AND (phone_e164 IS NULL OR phone_e164 = '+201060376594') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+9741121159090', country_code = '+974' WHERE id = 'MkJ2n17BTESMOeYVtzkMLgCErnP2' AND (phone_e164 IS NULL OR phone_e164 = '+9741121159090') AND (country_code IS NULL OR country_code = '+974');
UPDATE public.users SET country_code = '+20' WHERE id = 'N1tkT6Wln1QpadFxt6mWNjA5aTp1' AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201501761512', country_code = '+20' WHERE id = 'N2LrhU83rlaAtOVSIhRUPnkzvPl2' AND (phone_e164 IS NULL OR phone_e164 = '+201501761512') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201097539804', country_code = '+20' WHERE id = 'N3Hl5ccABcURNebJDwHHlKiY1ZK2' AND (phone_e164 IS NULL OR phone_e164 = '+201097539804') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201116610417', country_code = '+20' WHERE id = 'NCH2NfcQBgRe3q1lWY6XIclAsn72' AND (phone_e164 IS NULL OR phone_e164 = '+201116610417') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201550243549', country_code = '+20' WHERE id = 'NDQQicfzJLTcl5aTrrswfnT84aB3' AND (phone_e164 IS NULL OR phone_e164 = '+201550243549') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201033092617', country_code = '+20' WHERE id = 'NMAIpNCiJCch67kvQZ9ycOOScqq1' AND (phone_e164 IS NULL OR phone_e164 = '+201033092617') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+212638791325', country_code = '+212' WHERE id = 'NZmjptPAQjWqCP6MIrtHDmdrtUm1' AND (phone_e164 IS NULL OR phone_e164 = '+212638791325') AND (country_code IS NULL OR country_code = '+212');
UPDATE public.users SET supabase_uid = 'c35f5a45-a41c-43b4-a88e-ca7ed5eaa3cc'::uuid, phone_e164 = '+212643249243', country_code = '+212' WHERE id = 'c35f5a45-a41c-43b4-a88e-ca7ed5eaa3cc' AND (supabase_uid IS NULL OR supabase_uid = 'c35f5a45-a41c-43b4-a88e-ca7ed5eaa3cc'::uuid) AND (phone_e164 IS NULL OR phone_e164 = '+212643249243') AND (country_code IS NULL OR country_code = '+212');
UPDATE public.users SET phone_e164 = '+201055171982', country_code = '+20' WHERE id = 'NerofJR03HfZhLyPibVIJhliJyr2' AND (phone_e164 IS NULL OR phone_e164 = '+201055171982') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201062270525', country_code = '+20' WHERE id = 'NfweLsmRb1dJ2hRQf5tq5rMSkGi1' AND (phone_e164 IS NULL OR phone_e164 = '+201062270525') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+212647079548', country_code = '+212' WHERE id = 'NgRCGO3EfCaWthIvoGI3xGzfGVs1' AND (phone_e164 IS NULL OR phone_e164 = '+212647079548') AND (country_code IS NULL OR country_code = '+212');
UPDATE public.users SET phone_e164 = '+201151013815', country_code = '+20' WHERE id = 'NlOi1PkruUZpRpt1DfDGmd4okon1' AND (phone_e164 IS NULL OR phone_e164 = '+201151013815') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+212674763526', country_code = '+212' WHERE id = 'Nm8io3IcQiZSsRwirGj4ldJx4gH2' AND (phone_e164 IS NULL OR phone_e164 = '+212674763526') AND (country_code IS NULL OR country_code = '+212');
UPDATE public.users SET phone_e164 = '+212633408549', country_code = '+212' WHERE id = 'Ns7DDdpgPDSjY9holFUajoHicTg2' AND (phone_e164 IS NULL OR phone_e164 = '+212633408549') AND (country_code IS NULL OR country_code = '+212');
UPDATE public.users SET phone_e164 = '+20444444444', country_code = '+20' WHERE id = 'Nwr78w2YdYQhsKqHzPlCPGwGN2B3' AND (phone_e164 IS NULL OR phone_e164 = '+20444444444') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201091815777', country_code = '+20' WHERE id = 'O2mOHoqDClW6QK78nm5gP2WEkUd2' AND (phone_e164 IS NULL OR phone_e164 = '+201091815777') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+212698949601', country_code = '+212' WHERE id = 'O62pAFzSZqaYT8gVJeiqFD0dGbo1' AND (phone_e164 IS NULL OR phone_e164 = '+212698949601') AND (country_code IS NULL OR country_code = '+212');
UPDATE public.users SET country_code = '+20' WHERE id = 'O8wZXjwHSRP5nlM4oIFb5Wur4Mk2' AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201270373926', country_code = '+20' WHERE id = 'OAf6DADcnhRroiN0fyNvPIPNSe83' AND (phone_e164 IS NULL OR phone_e164 = '+201270373926') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201016801250', country_code = '+20' WHERE id = 'OBKJKQwr0zOq3yL4moTPKOBdhXw2' AND (phone_e164 IS NULL OR phone_e164 = '+201016801250') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+212636041025', country_code = '+212' WHERE id = 'OFOX7NRSOKNmjhgprCXVssg68GJ3' AND (phone_e164 IS NULL OR phone_e164 = '+212636041025') AND (country_code IS NULL OR country_code = '+212');
UPDATE public.users SET phone_e164 = '+201010992705', country_code = '+20' WHERE id = 'OSRlRVKBUdd3G5Ky8FDa3BimPlp2' AND (phone_e164 IS NULL OR phone_e164 = '+201010992705') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201274594332', country_code = '+20' WHERE id = 'Oebg1YOS76UmwSnAXiC6Engx7ih2' AND (phone_e164 IS NULL OR phone_e164 = '+201274594332') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+9741069025998', country_code = '+974' WHERE id = 'OnBRC7AReRPtdK1BSnTGMlHUrcn2' AND (phone_e164 IS NULL OR phone_e164 = '+9741069025998') AND (country_code IS NULL OR country_code = '+974');
UPDATE public.users SET phone_e164 = '+201222556024', country_code = '+20' WHERE id = 'OrwHGKgCSda7QnvwjPaSEIHZGVu2' AND (phone_e164 IS NULL OR phone_e164 = '+201222556024') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201155140323', country_code = '+20' WHERE id = 'OuzZ5SL6n1Nl65OCHNVxfQgEZum2' AND (phone_e164 IS NULL OR phone_e164 = '+201155140323') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201091031653', country_code = '+20' WHERE id = 'Oy53q1OfzHSgDxpDtqNTnTOXktL2' AND (phone_e164 IS NULL OR phone_e164 = '+201091031653') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201028826748', country_code = '+20' WHERE id = 'OyGt65U5ZIdCV31MLMwzVV1iRAu2' AND (phone_e164 IS NULL OR phone_e164 = '+201028826748') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET country_code = '+20' WHERE id = 'PAzrupsysETgIInrMHaqT3fsM5B3' AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET country_code = '+20' WHERE id = 'PGAdTYh8xpSF81fj8yxxG7cnDWD2' AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201015650475', country_code = '+20' WHERE id = 'PHisHn8WL0OUhuSaEh61JQPPdd42' AND (phone_e164 IS NULL OR phone_e164 = '+201015650475') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201015508329', country_code = '+20' WHERE id = 'PJxtZWpFAuZWgGB9zHQnbnOUiNX2' AND (phone_e164 IS NULL OR phone_e164 = '+201015508329') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201227072600', country_code = '+20' WHERE id = 'POdlGZH6nrhA0ETSYL4GuwQqV7E3' AND (phone_e164 IS NULL OR phone_e164 = '+201227072600') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET country_code = '+20' WHERE id = 'POpgZJSJJXVqPNND56lleyZpGix2' AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201500686333', country_code = '+20' WHERE id = 'PRLVcHkn55e9FLbOHbEZUQGPCS22' AND (phone_e164 IS NULL OR phone_e164 = '+201500686333') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201229355715', country_code = '+20' WHERE id = 'PW9oX3w8X3TxFk5V7VNL5i3opgo2' AND (phone_e164 IS NULL OR phone_e164 = '+201229355715') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+212661871431', country_code = '+212' WHERE id = 'MOizAZ33MUaL6RoS9uObVB3hwcO2' AND (phone_e164 IS NULL OR phone_e164 = '+212661871431') AND (country_code IS NULL OR country_code = '+212');
UPDATE public.users SET phone_e164 = '+201012114574', country_code = '+20' WHERE id = 'PX3owXTb07gPBNwjjfXAtfYqzcE2' AND (phone_e164 IS NULL OR phone_e164 = '+201012114574') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+212677065913', country_code = '+212' WHERE id = 'CA3wul1HY4fzy8ak7J6GdQfWSym1' AND (phone_e164 IS NULL OR phone_e164 = '+212677065913') AND (country_code IS NULL OR country_code = '+212');
UPDATE public.users SET phone_e164 = '+201063666763', country_code = '+20' WHERE id = 'CC9HyxCKqZZF9fMpDfquNyogrJs1' AND (phone_e164 IS NULL OR phone_e164 = '+201063666763') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET country_code = '+20' WHERE id = 'CMFsf6cBpscpEFjGsTPRPmeQcwY2' AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+97450105713', country_code = '+974' WHERE id = 'L6yqYf8WGRY3ilInnpefBczUrw73' AND (phone_e164 IS NULL OR phone_e164 = '+97450105713') AND (country_code IS NULL OR country_code = '+974');
UPDATE public.users SET country_code = '+20' WHERE id = 'PY5Nr0L7qZQJoceL8D2SgeD9mcv2' AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET country_code = '+20' WHERE id = 'LD6sBBbrtyVnOG4ErNyh3wsgCOl1' AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET country_code = '+20' WHERE id = 'LVhtnyer9OMJDclXQRQSmbM5eiC2' AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+212614985638', country_code = '+212' WHERE id = 'LZAIa6LsIoYs56pUZqRUiKXVYzY2' AND (phone_e164 IS NULL OR phone_e164 = '+212614985638') AND (country_code IS NULL OR country_code = '+212');
UPDATE public.users SET phone_e164 = '+20120166795', country_code = '+20' WHERE id = 'MN8Cmn8rBnQlj9q87k7skX3zDKJ2' AND (phone_e164 IS NULL OR phone_e164 = '+20120166795') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET supabase_uid = '54ca7554-a39e-4dce-bf9d-40d1a3af7070'::uuid, phone_e164 = '+201065966525', country_code = '+20' WHERE id = '54ca7554-a39e-4dce-bf9d-40d1a3af7070' AND (supabase_uid IS NULL OR supabase_uid = '54ca7554-a39e-4dce-bf9d-40d1a3af7070'::uuid) AND (phone_e164 IS NULL OR phone_e164 = '+201065966525') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+97471581350', country_code = '+974' WHERE id = 'B6B6ShQPX3X05m0CSztLRenXggE2' AND (phone_e164 IS NULL OR phone_e164 = '+97471581350') AND (country_code IS NULL OR country_code = '+974');
UPDATE public.users SET phone_e164 = '+9741275906543', country_code = '+974' WHERE id = 'gTToNbC0mDZjdTohL0V18KmJH8q1' AND (phone_e164 IS NULL OR phone_e164 = '+9741275906543') AND (country_code IS NULL OR country_code = '+974');
UPDATE public.users SET phone_e164 = '+201010880777', country_code = '+20' WHERE id = 'go7BsSGSWMXOh5WO9rq1mmBQRBE3' AND (phone_e164 IS NULL OR phone_e164 = '+201010880777') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201223109269', country_code = '+20' WHERE id = 'goN5fg3aLdbOdYKEANPoGfFldhY2' AND (phone_e164 IS NULL OR phone_e164 = '+201223109269') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201025874324', country_code = '+20' WHERE id = 'ko1vZd52dPVI67PK3QhTJdhjyvl1' AND (phone_e164 IS NULL OR phone_e164 = '+201025874324') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+20169730590', country_code = '+20' WHERE id = 'B6HEBDRSaMRS6kztnFh4epJDePt1' AND (phone_e164 IS NULL OR phone_e164 = '+20169730590') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201110463963', country_code = '+20' WHERE id = 'B8qnhTMPKJeVt7RrKgCDOvbxWht2' AND (phone_e164 IS NULL OR phone_e164 = '+201110463963') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201102052225', country_code = '+20' WHERE id = 'B9kPPZTvvgTYi4AxReypo9lGBbx2' AND (phone_e164 IS NULL OR phone_e164 = '+201102052225') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201009442546', country_code = '+20' WHERE id = 'PdQOsszJOYe6iVEecaMm5GvPBdh2' AND (phone_e164 IS NULL OR phone_e164 = '+201009442546') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+20111789289', country_code = '+20' WHERE id = 'PfGgcxqtDGMiuA3ng2tApxdATh72' AND (phone_e164 IS NULL OR phone_e164 = '+20111789289') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201279090193', country_code = '+20' WHERE id = 'PjfrNAy5fMSj8MKmYTZEkovZ3FA3' AND (phone_e164 IS NULL OR phone_e164 = '+201279090193') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201284032685', country_code = '+20' WHERE id = 'PkXyHmRTWaM6HTuh5LG2KzvqZDf2' AND (phone_e164 IS NULL OR phone_e164 = '+201284032685') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201111881401', country_code = '+20' WHERE id = 'PrbABzVT41NPAJhRbj3XTMKuyOh2' AND (phone_e164 IS NULL OR phone_e164 = '+201111881401') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+212666346087', country_code = '+212' WHERE id = 'PtgxX3XM7gR7j17K1H1WKbSHBqx2' AND (phone_e164 IS NULL OR phone_e164 = '+212666346087') AND (country_code IS NULL OR country_code = '+212');
UPDATE public.users SET country_code = '+20' WHERE id = 'Q2yKTAqbmeYxIeFqZmlljL1NJsS2' AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201009720725', country_code = '+20' WHERE id = 'Q4PCh5rzcgV50sDC6BOahd3giMy1' AND (phone_e164 IS NULL OR phone_e164 = '+201009720725') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201069982787', country_code = '+20' WHERE id = 'Q7HYydri7FPEBs6xljAeRbQomUR2' AND (phone_e164 IS NULL OR phone_e164 = '+201069982787') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201279761491', country_code = '+20' WHERE id = 'Q7biWOhdMoTt97xnE1EwX2vGuPx2' AND (phone_e164 IS NULL OR phone_e164 = '+201279761491') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET country_code = '+20' WHERE id = 'QCLzhQx5aQTDu9ykz4B935YXOqS2' AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+20120013003', country_code = '+20' WHERE id = 'QFCtxdLHnvdJLkoqsRljHmCJUEJ2' AND (phone_e164 IS NULL OR phone_e164 = '+20120013003') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+20888888888', country_code = '+20' WHERE id = 'QFVcHFmqISf2q6dzO6jINWZnNmz1' AND (phone_e164 IS NULL OR phone_e164 = '+20888888888') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET country_code = '+20' WHERE id = 'QIx4Z7U3AEPBXG0eRtVyL24qkgy2' AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201233555666', country_code = '+20' WHERE id = 'QLihANyiTaVLhLXhwirLLD88iwF2' AND (phone_e164 IS NULL OR phone_e164 = '+201233555666') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET country_code = '+20' WHERE id = 'QNDqSUN8cHX7VGVZw8BZ5qKXJZ53' AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201120406786', country_code = '+20' WHERE id = 'QPgneVqtqZNLmDLrKXlb9Epal4E2' AND (phone_e164 IS NULL OR phone_e164 = '+201120406786') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET country_code = '+20' WHERE id = 'RF46N9BxiQRLVKB5s36LMzdWKYn2' AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+20122231920', country_code = '+20' WHERE id = 'ROkmfqa2c5aCvevU4CzHr3zAUAw1' AND (phone_e164 IS NULL OR phone_e164 = '+20122231920') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+212661599990', country_code = '+212' WHERE id = 'RTkzSkW5nLX25hh7PfTZtCjkggJ2' AND (phone_e164 IS NULL OR phone_e164 = '+212661599990') AND (country_code IS NULL OR country_code = '+212');
UPDATE public.users SET country_code = '+20' WHERE id = 'RWM6ipzXWCTlWKhVPuafwVLsEPf1' AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET supabase_uid = 'c0249db0-ae5c-4e1c-9b5f-19c6b737343a'::uuid, phone_e164 = '+212679541241', country_code = '+212' WHERE id = 'c0249db0-ae5c-4e1c-9b5f-19c6b737343a' AND (supabase_uid IS NULL OR supabase_uid = 'c0249db0-ae5c-4e1c-9b5f-19c6b737343a'::uuid) AND (phone_e164 IS NULL OR phone_e164 = '+212679541241') AND (country_code IS NULL OR country_code = '+212');
UPDATE public.users SET phone_e164 = '+201016626698', country_code = '+20' WHERE id = 'RbErzWphORb6Z3ZsqLCIVlAy06B2' AND (phone_e164 IS NULL OR phone_e164 = '+201016626698') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201148362519', country_code = '+20' WHERE id = 'SAcB7RCYSOS4aqBd45WhdHyd8Aa2' AND (phone_e164 IS NULL OR phone_e164 = '+201148362519') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201280427802', country_code = '+20' WHERE id = 'Shq1RZIiTddjrdzDsMLTCNWGTzI3' AND (phone_e164 IS NULL OR phone_e164 = '+201280427802') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201272685651', country_code = '+20' WHERE id = 'SjLKWnbvZeOw83nCsCBYU3qSyzo2' AND (phone_e164 IS NULL OR phone_e164 = '+201272685651') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+20100137722', country_code = '+20' WHERE id = 'Skmoq122hGauihRREkS4QdGkXxv1' AND (phone_e164 IS NULL OR phone_e164 = '+20100137722') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201283200101', country_code = '+20' WHERE id = 'Snqi7pyFuoNFKaCJl27SjMIL4853' AND (phone_e164 IS NULL OR phone_e164 = '+201283200101') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201272846548', country_code = '+20' WHERE id = 'Std8PhwLi5RY8lNc4fjnVpVljl92' AND (phone_e164 IS NULL OR phone_e164 = '+201272846548') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET country_code = '+20' WHERE id = 'SvwVqAYieDhjyFhEhewDBtHHV4p1' AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201065733432', country_code = '+20' WHERE id = 'SwYdBCh0ATOoLb1ubuulpdHZ6iE2' AND (phone_e164 IS NULL OR phone_e164 = '+201065733432') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET country_code = '+20' WHERE id = 'SxgIwuaZYTSqePs5uEAk8UO1ek72' AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201025701736', country_code = '+20' WHERE id = 'T0GQWSpBLzeyw7lXkJ0g1mBOrzx1' AND (phone_e164 IS NULL OR phone_e164 = '+201025701736') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+20127624786', country_code = '+20' WHERE id = 'T21Kj6ruTThjjgFhN7BFyrp03ft1' AND (phone_e164 IS NULL OR phone_e164 = '+20127624786') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET country_code = '+20' WHERE id = 'T2YwllYRmiWOTHycjW6tdUzjGuD3' AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201069515455', country_code = '+20' WHERE id = 'T2zFkcADrQPeOX2cwmF5DMQuGBB2' AND (phone_e164 IS NULL OR phone_e164 = '+201069515455') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201096920250', country_code = '+20' WHERE id = 'gpCUioBkEkRFrG49tPAjTK3edL53' AND (phone_e164 IS NULL OR phone_e164 = '+201096920250') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+212771632338', country_code = '+212' WHERE id = 'gu9pPZcChaX8OOR69lJk4FVfzmm2' AND (phone_e164 IS NULL OR phone_e164 = '+212771632338') AND (country_code IS NULL OR country_code = '+212');
UPDATE public.users SET phone_e164 = '+212640361826', country_code = '+212' WHERE id = 'gzNBCTxMZoQzrF7j8aeb2Zdea4F3' AND (phone_e164 IS NULL OR phone_e164 = '+212640361826') AND (country_code IS NULL OR country_code = '+212');
UPDATE public.users SET supabase_uid = '81d64653-8c26-48cb-ac49-e8b560d9e6cf'::uuid, phone_e164 = '+201018430001', country_code = '+20' WHERE id = '81d64653-8c26-48cb-ac49-e8b560d9e6cf' AND (supabase_uid IS NULL OR supabase_uid = '81d64653-8c26-48cb-ac49-e8b560d9e6cf'::uuid) AND (phone_e164 IS NULL OR phone_e164 = '+201018430001') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+97466187377', country_code = '+974' WHERE id = 'GaneOFHVBbSDCiUo2jd4L2FRs3j1' AND (phone_e164 IS NULL OR phone_e164 = '+97466187377') AND (country_code IS NULL OR country_code = '+974');
UPDATE public.users SET phone_e164 = '+201007062050', country_code = '+20' WHERE id = 'Gb4ZWtPrQcWZQhHc9ecqIu39dZE2' AND (phone_e164 IS NULL OR phone_e164 = '+201007062050') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+20102537469', country_code = '+20' WHERE id = 'GgTclj60V4SlYUyCtCLYhjCjjSZ2' AND (phone_e164 IS NULL OR phone_e164 = '+20102537469') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201028256747', country_code = '+20' WHERE id = 'GgWU5q8pi5eTYcSNbo4lClTGr8w2' AND (phone_e164 IS NULL OR phone_e164 = '+201028256747') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201505460450', country_code = '+20' WHERE id = 'GnJByfr4lbXHTsHHLBk21zsnUt72' AND (phone_e164 IS NULL OR phone_e164 = '+201505460450') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+9741225090519', country_code = '+974' WHERE id = 'GwHdKRdjoabzY6w56B0KqDneLK92' AND (phone_e164 IS NULL OR phone_e164 = '+9741225090519') AND (country_code IS NULL OR country_code = '+974');
UPDATE public.users SET phone_e164 = '+963963123456789', country_code = '+963' WHERE id = 'KugxKRoTH6ZUQ3jOjhClBagrvVH2' AND (phone_e164 IS NULL OR phone_e164 = '+963963123456789') AND (country_code IS NULL OR country_code = '+963');
UPDATE public.users SET phone_e164 = '+201125007847', country_code = '+20' WHERE id = 'QaBJWz8tcdNYuZNjkf0KJiBp5402' AND (phone_e164 IS NULL OR phone_e164 = '+201125007847') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+97430611359', country_code = '+974' WHERE id = 'QcUXfGxkqKe7nIGkexypwMKGJ6i2' AND (phone_e164 IS NULL OR phone_e164 = '+97430611359') AND (country_code IS NULL OR country_code = '+974');
UPDATE public.users SET country_code = '+20' WHERE id = 'QiBSJ8dBCJgIV78wjnHWBJMam9c2' AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+20106947184', country_code = '+20' WHERE id = 'QijFmblUM4fty46FuZTntgQwe7o2' AND (phone_e164 IS NULL OR phone_e164 = '+20106947184') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET supabase_uid = '3daf0dec-2408-42f3-8c7d-c7296769cf3c'::uuid, phone_e164 = '+201032604086', country_code = '+20' WHERE id = '3daf0dec-2408-42f3-8c7d-c7296769cf3c' AND (supabase_uid IS NULL OR supabase_uid = '3daf0dec-2408-42f3-8c7d-c7296769cf3c'::uuid) AND (phone_e164 IS NULL OR phone_e164 = '+201032604086') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET country_code = '+20' WHERE id = 'T5MlUstpczLESKbFxO5f9MD7UDJ3' AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201061521051', country_code = '+20' WHERE id = 'T9iE4456dFOwSLUnICL6CgzQdOp2' AND (phone_e164 IS NULL OR phone_e164 = '+201061521051') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+249123825105', country_code = '+249' WHERE id = 'THDVrc5WD8XPEKaCrzQ3WaqqM662' AND (phone_e164 IS NULL OR phone_e164 = '+249123825105') AND (country_code IS NULL OR country_code = '+249');
UPDATE public.users SET phone_e164 = '+201225209392', country_code = '+20' WHERE id = 'TLvWrlyerZetPw8h63bvnTTIrIg1' AND (phone_e164 IS NULL OR phone_e164 = '+201225209392') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+212610032557', country_code = '+212' WHERE id = 'TM6uOdyowjeQIsFMkKjpsdLYSiV2' AND (phone_e164 IS NULL OR phone_e164 = '+212610032557') AND (country_code IS NULL OR country_code = '+212');
UPDATE public.users SET phone_e164 = '+20106693782', country_code = '+20' WHERE id = 'TOvk2C6z1BgjW4ZaegjEASKH8Iq1' AND (phone_e164 IS NULL OR phone_e164 = '+20106693782') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201066630458', country_code = '+20' WHERE id = 'TPM15wPX1QdwwVMj3Z9lERAariA3' AND (phone_e164 IS NULL OR phone_e164 = '+201066630458') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201025152990', country_code = '+20' WHERE id = 'TaIRYk6AIOQs67n6iNuFedIv6KF3' AND (phone_e164 IS NULL OR phone_e164 = '+201025152990') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201028344671', country_code = '+20' WHERE id = 'TbUs1IRBHJUaYhslJZ5EcXd4AaA3' AND (phone_e164 IS NULL OR phone_e164 = '+201028344671') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201116418298', country_code = '+20' WHERE id = 'TdB1jULAlMQHPj5UvtgTKg3GUOE3' AND (phone_e164 IS NULL OR phone_e164 = '+201116418298') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+97433358521', country_code = '+974' WHERE id = 'Tf4TGgeVx5cYAI3sNq9EJgpexm23' AND (phone_e164 IS NULL OR phone_e164 = '+97433358521') AND (country_code IS NULL OR country_code = '+974');
UPDATE public.users SET phone_e164 = '+201500174599', country_code = '+20' WHERE id = 'TidKO21BAqbVQSBUo0P6mRdsIzU2' AND (phone_e164 IS NULL OR phone_e164 = '+201500174599') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+213550215378', country_code = '+213' WHERE id = 'Tjgj2x0tMKcelwpaf9CZFLSpatP2' AND (phone_e164 IS NULL OR phone_e164 = '+213550215378') AND (country_code IS NULL OR country_code = '+213');
UPDATE public.users SET phone_e164 = '+20108035132', country_code = '+20' WHERE id = 'TlpgkIFhZUTyFrtxAKQWwYd0z3E3' AND (phone_e164 IS NULL OR phone_e164 = '+20108035132') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201151506571', country_code = '+20' WHERE id = 'TnREoKxIcQSAXecBrvKU6UijAer2' AND (phone_e164 IS NULL OR phone_e164 = '+201151506571') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET supabase_uid = '5a161ea7-c7ca-4f16-a75b-f5595fcdf392'::uuid, phone_e164 = '+201159841308', country_code = '+20' WHERE id = '5a161ea7-c7ca-4f16-a75b-f5595fcdf392' AND (supabase_uid IS NULL OR supabase_uid = '5a161ea7-c7ca-4f16-a75b-f5595fcdf392'::uuid) AND (phone_e164 IS NULL OR phone_e164 = '+201159841308') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+218555555555', country_code = '+218' WHERE id = 'TnSvLJgehmftXNY024Y0cjib6NI3' AND (phone_e164 IS NULL OR phone_e164 = '+218555555555') AND (country_code IS NULL OR country_code = '+218');
UPDATE public.users SET country_code = '+20' WHERE id = 'TsGr4WoVi6aJEcjgtCx2dPUwRj23' AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201153332423', country_code = '+20' WHERE id = 'TuOan8STLAb05zwNF7rkGw5gznP2' AND (phone_e164 IS NULL OR phone_e164 = '+201153332423') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+212610756872', country_code = '+212' WHERE id = 'TvmkOtTLbcRCDwFUV7VSf9ppIU82' AND (phone_e164 IS NULL OR phone_e164 = '+212610756872') AND (country_code IS NULL OR country_code = '+212');
UPDATE public.users SET phone_e164 = '+201128983572', country_code = '+20' WHERE id = 'U0lHAdBZQKhG0S9ps7bkdKvTMi33' AND (phone_e164 IS NULL OR phone_e164 = '+201128983572') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET country_code = '+20' WHERE id = 'U2rwlxjXOjOhaoRdQU97HmvsOAB3' AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET country_code = '+20' WHERE id = 'U8uCBLvcK6Udx0fwEQIF4OyZJYZ2' AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET country_code = '+20' WHERE id = 'UDCxylXetKdJyM3W2ZiroNuUsxq2' AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+96522222222', country_code = '+965' WHERE id = 'UEGG8IkSAGUw1JFQdHQwddPHy9R2' AND (phone_e164 IS NULL OR phone_e164 = '+96522222222') AND (country_code IS NULL OR country_code = '+965');
UPDATE public.users SET country_code = '+20' WHERE id = 'ULjImhjbSSf9luZHcHYPCmI0HMA3' AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201122667739', country_code = '+20' WHERE id = 'UPYnXDY87IaFnLK2gcfhklzOy5Z2' AND (phone_e164 IS NULL OR phone_e164 = '+201122667739') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201227017597', country_code = '+20' WHERE id = 'UR7iHPC2F2USatDhqHGNV16RQ7S2' AND (phone_e164 IS NULL OR phone_e164 = '+201227017597') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+20112040678', country_code = '+20' WHERE id = 'UUUPV8MRYhNxofVfFxtsAi4uWLI3' AND (phone_e164 IS NULL OR phone_e164 = '+20112040678') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201559412556', country_code = '+20' WHERE id = 'UWqCSVQBxzd9aZFxP5ulY3zsZNW2' AND (phone_e164 IS NULL OR phone_e164 = '+201559412556') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201001076732', country_code = '+20' WHERE id = 'UdVt36xk74fPGY0hrMfHP9kgpir2' AND (phone_e164 IS NULL OR phone_e164 = '+201001076732') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201002597123', country_code = '+20' WHERE id = 'UeMMC8znUFPHYnlXhvvJQukXsNs1' AND (phone_e164 IS NULL OR phone_e164 = '+201002597123') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201286879610', country_code = '+20' WHERE id = 'Uhm9KPj0AofPO1MghwEGunOSADR2' AND (phone_e164 IS NULL OR phone_e164 = '+201286879610') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201055605796', country_code = '+20' WHERE id = 'UpWnzKYROHNSa4Zi42lIpiwpYqt2' AND (phone_e164 IS NULL OR phone_e164 = '+201055605796') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201289952261', country_code = '+20' WHERE id = 'V1BoS880nDe33oaD7iLN0mJ7mDk2' AND (phone_e164 IS NULL OR phone_e164 = '+201289952261') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201070385160', country_code = '+20' WHERE id = 'V3lTDZod0RcjP8UV3oVbD2cPP0g1' AND (phone_e164 IS NULL OR phone_e164 = '+201070385160') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET country_code = '+20' WHERE id = 'VedaUMH83eONWlwyl6CAieECbWy2' AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET country_code = '+20' WHERE id = 'VgsqNRUq1nVJeare4NLBy2eCdsK2' AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+212665319990', country_code = '+212' WHERE id = 'ViKdefi76yf3FYuJe9ilMpf9kJa2' AND (phone_e164 IS NULL OR phone_e164 = '+212665319990') AND (country_code IS NULL OR country_code = '+212');
UPDATE public.users SET phone_e164 = '+201229508782', country_code = '+20' WHERE id = 'Vlq6LN52g6dgYYR4iyzTh6YpWho1' AND (phone_e164 IS NULL OR phone_e164 = '+201229508782') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+212719454421', country_code = '+212' WHERE id = 'W3xGSUi0oheMDthfoaCNw0Oyuaw1' AND (phone_e164 IS NULL OR phone_e164 = '+212719454421') AND (country_code IS NULL OR country_code = '+212');
UPDATE public.users SET supabase_uid = '3038c10a-84d9-4d27-b2e9-67ab7c9465ef'::uuid, phone_e164 = '+212661505949', country_code = '+212' WHERE id = '3038c10a-84d9-4d27-b2e9-67ab7c9465ef' AND (supabase_uid IS NULL OR supabase_uid = '3038c10a-84d9-4d27-b2e9-67ab7c9465ef'::uuid) AND (phone_e164 IS NULL OR phone_e164 = '+212661505949') AND (country_code IS NULL OR country_code = '+212');
UPDATE public.users SET phone_e164 = '+201061215290', country_code = '+20' WHERE id = 'WXbNefcbNUXvfeldz6OfoVIoAiE2' AND (phone_e164 IS NULL OR phone_e164 = '+201061215290') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET country_code = '+20' WHERE id = 'WeO0yGDoNtaMhHk2RzkkOLqclXF2' AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+2183216547891', country_code = '+218' WHERE id = 'WiXjvlF7DZSqykzGNI9FojHjcQU2' AND (phone_e164 IS NULL OR phone_e164 = '+2183216547891') AND (country_code IS NULL OR country_code = '+218');
UPDATE public.users SET phone_e164 = '+201000940322', country_code = '+20' WHERE id = 'Wlnav1lCN9WN7cmEuqa5bohESqn1' AND (phone_e164 IS NULL OR phone_e164 = '+201000940322') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET country_code = '+20' WHERE id = 'WoNvMiVmELMr7rYSgH2VJEazPwx1' AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET country_code = '+20' WHERE id = 'Wp27ygxiyGO6q7vhcc1S1W743ra2' AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET country_code = '+20' WHERE id = 'WumU6iY5g7eRMMNlMBvnwiJBoYZ2' AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET country_code = '+20' WHERE id = 'Wx31fahOrVNDAqVkzJiC985nRqM2' AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201004540339', country_code = '+20' WHERE id = 'ksEKIQObshMLQwKmDeIHj0DpNYC3' AND (phone_e164 IS NULL OR phone_e164 = '+201004540339') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET supabase_uid = 'a8712d57-5eb0-46a1-acfd-276fffbaa44f'::uuid, phone_e164 = '+201203747852', country_code = '+20' WHERE id = 'a8712d57-5eb0-46a1-acfd-276fffbaa44f' AND (supabase_uid IS NULL OR supabase_uid = 'a8712d57-5eb0-46a1-acfd-276fffbaa44f'::uuid) AND (phone_e164 IS NULL OR phone_e164 = '+201203747852') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201094261472', country_code = '+20' WHERE id = 'LbwJxfTvR9hrdtLn8qdjZoh5uTG2' AND (phone_e164 IS NULL OR phone_e164 = '+201094261472') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201289072570', country_code = '+20' WHERE id = 'Li3kxccb8lVzUOZnVMWy5lneBYz2' AND (phone_e164 IS NULL OR phone_e164 = '+201289072570') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET country_code = '+20' WHERE id = 'Lj3AAdjTecQOhi64EMjdBPOR97B2' AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201286976642', country_code = '+20' WHERE id = 'LtYLJqqdm2htp8DilNsOho6IzxB3' AND (phone_e164 IS NULL OR phone_e164 = '+201286976642') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+212603511236', country_code = '+212' WHERE id = 'M50LQQIQY4dfMF8EAtzOmXM0ngl2' AND (phone_e164 IS NULL OR phone_e164 = '+212603511236') AND (country_code IS NULL OR country_code = '+212');
UPDATE public.users SET supabase_uid = '16159fc2-d37b-4ad3-b03f-6abc60eed6d6'::uuid, phone_e164 = '+212679793072', country_code = '+212' WHERE id = '16159fc2-d37b-4ad3-b03f-6abc60eed6d6' AND (supabase_uid IS NULL OR supabase_uid = '16159fc2-d37b-4ad3-b03f-6abc60eed6d6'::uuid) AND (phone_e164 IS NULL OR phone_e164 = '+212679793072') AND (country_code IS NULL OR country_code = '+212');
UPDATE public.users SET phone_e164 = '+212608371813', country_code = '+212' WHERE id = 'M6ZCyPn4RydrCP1FfsakXHpZHeB2' AND (phone_e164 IS NULL OR phone_e164 = '+212608371813') AND (country_code IS NULL OR country_code = '+212');
UPDATE public.users SET phone_e164 = '+201034195255', country_code = '+20' WHERE id = 'MI7SY7HCvHX7eEkr7yDQ3gGfTnj2' AND (phone_e164 IS NULL OR phone_e164 = '+201034195255') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET supabase_uid = 'dd75bcf8-bb79-4cbb-9086-4b2545710c51'::uuid, phone_e164 = '+249116395085', country_code = '+249' WHERE id = 'dd75bcf8-bb79-4cbb-9086-4b2545710c51' AND (supabase_uid IS NULL OR supabase_uid = 'dd75bcf8-bb79-4cbb-9086-4b2545710c51'::uuid) AND (phone_e164 IS NULL OR phone_e164 = '+249116395085') AND (country_code IS NULL OR country_code = '+249');
UPDATE public.users SET phone_e164 = '+212628379660', country_code = '+212' WHERE id = 'MLE5zWdJMgPefpIuq7wxV4IqlSm1' AND (phone_e164 IS NULL OR phone_e164 = '+212628379660') AND (country_code IS NULL OR country_code = '+212');
UPDATE public.users SET phone_e164 = '+212687373651', country_code = '+212' WHERE id = 'UJo8CHYMwCVPaB39K1gZkHywHUp1' AND (phone_e164 IS NULL OR phone_e164 = '+212687373651') AND (country_code IS NULL OR country_code = '+212');
UPDATE public.users SET country_code = '+20' WHERE id = 'X4WTZrz5HRbbdMJGPkm0Ae524fI3' AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+212702294838', country_code = '+212' WHERE id = 'X9jfWW5tvZZ8Z4lIPNFVnA1G2K83' AND (phone_e164 IS NULL OR phone_e164 = '+212702294838') AND (country_code IS NULL OR country_code = '+212');
UPDATE public.users SET phone_e164 = '+201098046142', country_code = '+20' WHERE id = 'XEHrLJXFHcgBvUZBmb7miEx5n9Z2' AND (phone_e164 IS NULL OR phone_e164 = '+201098046142') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+212772854804', country_code = '+212' WHERE id = 'XEkdSCaFDkhFBnIrZylSJ6O36xH2' AND (phone_e164 IS NULL OR phone_e164 = '+212772854804') AND (country_code IS NULL OR country_code = '+212');
UPDATE public.users SET phone_e164 = '+9741126287331', country_code = '+974' WHERE id = 'XHvIfAx2WjSOKStc2ME7bijsO7o1' AND (phone_e164 IS NULL OR phone_e164 = '+9741126287331') AND (country_code IS NULL OR country_code = '+974');
UPDATE public.users SET phone_e164 = '+201146161723', country_code = '+20' WHERE id = 'XJuLeuPYp6bdyYLlD6goLLjLqfi1' AND (phone_e164 IS NULL OR phone_e164 = '+201146161723') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+20128153147', country_code = '+20' WHERE id = 'Y3zRuamZOxcLJM5spsgzvR77XJI2' AND (phone_e164 IS NULL OR phone_e164 = '+20128153147') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201113149388', country_code = '+20' WHERE id = 'Y585b2vsLwNo0RsQiKuY0txayTd2' AND (phone_e164 IS NULL OR phone_e164 = '+201113149388') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+20999999999', country_code = '+20' WHERE id = 'Y8pLIIOPNhhAgNvwxeAC7oCoaFr2' AND (phone_e164 IS NULL OR phone_e164 = '+20999999999') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201097188448', country_code = '+20' WHERE id = 'VoJmQooFxEMKotTKpTRve707cul2' AND (phone_e164 IS NULL OR phone_e164 = '+201097188448') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET country_code = '+20' WHERE id = 'Vq69WqMpMLY88RbJdeDkGIV0HvI2' AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+20100269154', country_code = '+20' WHERE id = 'Vsf3CwaydFYgnDNL2RBttcB1m193' AND (phone_e164 IS NULL OR phone_e164 = '+20100269154') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201016062783', country_code = '+20' WHERE id = 'VuphvCoCZ4dpk8KSLqqJBWqQadf1' AND (phone_e164 IS NULL OR phone_e164 = '+201016062783') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+97477853805', country_code = '+974' WHERE id = 'VwE4xp1bQjdda7w7N8kezhuzYAE2' AND (phone_e164 IS NULL OR phone_e164 = '+97477853805') AND (country_code IS NULL OR country_code = '+974');
UPDATE public.users SET phone_e164 = '+201553532485', country_code = '+20' WHERE id = 'W8jPFh0OOYXJxGPQjNxRTDAsGvt2' AND (phone_e164 IS NULL OR phone_e164 = '+201553532485') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201121917281', country_code = '+20' WHERE id = 'jQPepf2SLObTekZAYa5xHgheBMA3' AND (phone_e164 IS NULL OR phone_e164 = '+201121917281') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET country_code = '+20' WHERE id = 'jQprN3XSQ0T22vOtriGPiKHWQ3O2' AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+212682333657', country_code = '+212' WHERE id = 'fbc20927-4dc7-4025-8403-be8f15a37e5a' AND (phone_e164 IS NULL OR phone_e164 = '+212682333657') AND (country_code IS NULL OR country_code = '+212');
UPDATE public.users SET phone_e164 = '+201557459727', country_code = '+20' WHERE id = 'YGFIZg6E9ER3m3GZBHUKBKLrqRW2' AND (phone_e164 IS NULL OR phone_e164 = '+201557459727') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201014420642', country_code = '+20' WHERE id = 'YHW8V8PxveMfFRzzedIYlQC2KrN2' AND (phone_e164 IS NULL OR phone_e164 = '+201014420642') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201154267904', country_code = '+20' WHERE id = 'YSsuQT2p5ba5j9MAiAdSXgpYuay2' AND (phone_e164 IS NULL OR phone_e164 = '+201154267904') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET country_code = '+20' WHERE id = 'YUezyttc4WPUTiq1wHgbwMsGnB82' AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201105104882', country_code = '+20' WHERE id = 'YlwHLO8v7ZTQj7LRkkcMq4yxb7N2' AND (phone_e164 IS NULL OR phone_e164 = '+201105104882') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201028397961', country_code = '+20' WHERE id = 'YrEGJxrV9rXHhnsp5L58nwLiLP63' AND (phone_e164 IS NULL OR phone_e164 = '+201028397961') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201020770784', country_code = '+20' WHERE id = 'ZGnkXmBRd9WgHd2rO8OUpqRg7BC2' AND (phone_e164 IS NULL OR phone_e164 = '+201020770784') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+212606701179', country_code = '+212' WHERE id = 'ZHHqspdoL2V1I9ItrSwudZ8Iq1N2' AND (phone_e164 IS NULL OR phone_e164 = '+212606701179') AND (country_code IS NULL OR country_code = '+212');
UPDATE public.users SET country_code = '+20' WHERE id = 'ZINDYoIpWOX4LxwuCQP3CSd1F2l2' AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201159882040', country_code = '+20' WHERE id = 'ZJB58SaLoqfvALiwVXj1pSgQl363' AND (phone_e164 IS NULL OR phone_e164 = '+201159882040') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201103057131', country_code = '+20' WHERE id = 'ZJEK28cIjQaraPRvzB785mMuNRM2' AND (phone_e164 IS NULL OR phone_e164 = '+201103057131') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201012149535', country_code = '+20' WHERE id = 'ZYjtPsRCksWstI5BKPHavv0ukhz1' AND (phone_e164 IS NULL OR phone_e164 = '+201012149535') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201286946332', country_code = '+20' WHERE id = 'ZaKRS1e1hrayff0R3w9LvMRnRy62' AND (phone_e164 IS NULL OR phone_e164 = '+201286946332') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201226160818', country_code = '+20' WHERE id = 'ZiMV03Pcg1Qhlay2SkmQWnudehA2' AND (phone_e164 IS NULL OR phone_e164 = '+201226160818') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET supabase_uid = '5f464155-5406-4f75-a78d-fa024e0daa2c'::uuid, phone_e164 = '+212649235356', country_code = '+212' WHERE id = '5f464155-5406-4f75-a78d-fa024e0daa2c' AND (supabase_uid IS NULL OR supabase_uid = '5f464155-5406-4f75-a78d-fa024e0daa2c'::uuid) AND (phone_e164 IS NULL OR phone_e164 = '+212649235356') AND (country_code IS NULL OR country_code = '+212');
UPDATE public.users SET phone_e164 = '+201017995800', country_code = '+20' WHERE id = 'Tjuo4cipd4PUc90GuPyfTLUDye92' AND (phone_e164 IS NULL OR phone_e164 = '+201017995800') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201023007061', country_code = '+20' WHERE id = 'X5XZYtRKvjRnUOijRKd27GgHxIV2' AND (phone_e164 IS NULL OR phone_e164 = '+201023007061') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET country_code = '+20' WHERE id = 'ZvsXEQJbJSZzdR5gIESuvtcWAvu1' AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201021067664', country_code = '+20' WHERE id = 'ZxktTeSIhJZAbxUykFhmiPIIBdu1' AND (phone_e164 IS NULL OR phone_e164 = '+201021067664') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201029575467', country_code = '+20' WHERE id = 'a1lFBnvEATYcXat37xXvZb1Mkjw1' AND (phone_e164 IS NULL OR phone_e164 = '+201029575467') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET country_code = '+20' WHERE id = 'aGU9fWjVkQOmIYoj4hDpzvHv6M42' AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201273912844', country_code = '+20' WHERE id = 'aH1OlR2etkgZlyuTbsWxefQ9RTA2' AND (phone_e164 IS NULL OR phone_e164 = '+201273912844') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+20106283884', country_code = '+20' WHERE id = 'aKzNnkYgfdZR15IvUTFWQcS7NJf2' AND (phone_e164 IS NULL OR phone_e164 = '+20106283884') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201227758510', country_code = '+20' WHERE id = 'aUaHepuU0xTfWRFEidtWxfNT42t1' AND (phone_e164 IS NULL OR phone_e164 = '+201227758510') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET supabase_uid = '0a910159-146c-4389-a80e-855ad0c51bf0'::uuid, phone_e164 = '+212611173232', country_code = '+212' WHERE id = '0a910159-146c-4389-a80e-855ad0c51bf0' AND (supabase_uid IS NULL OR supabase_uid = '0a910159-146c-4389-a80e-855ad0c51bf0'::uuid) AND (phone_e164 IS NULL OR phone_e164 = '+212611173232') AND (country_code IS NULL OR country_code = '+212');
UPDATE public.users SET phone_e164 = '+20100645666', country_code = '+20' WHERE id = 'TjVfbp6YzrUEqG1z6Qr4zHsT13A3' AND (phone_e164 IS NULL OR phone_e164 = '+20100645666') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201148287649', country_code = '+20' WHERE id = 'abPLlWJLpLThheNU3VmBGbCgpiB3' AND (phone_e164 IS NULL OR phone_e164 = '+201148287649') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET country_code = '+20' WHERE id = 'accPwFz6FpVa7TwMuYfK18bOzpG3' AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+966596077960', country_code = '+966' WHERE id = 'anMZspTtPxaWZd5FC0EG4xYvP4t1' AND (phone_e164 IS NULL OR phone_e164 = '+966596077960') AND (country_code IS NULL OR country_code = '+966');
UPDATE public.users SET country_code = '+20' WHERE id = 'aygnJ71o5tTBXgtmLCCYKVw2zg82' AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201102720461', country_code = '+20' WHERE id = 'b0QtYUen5lTZZmfIz115i21vkcm1' AND (phone_e164 IS NULL OR phone_e164 = '+201102720461') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+212717248341', country_code = '+212' WHERE id = 'b0V305mRfEXEUUyrZxaf4oaoG0b2' AND (phone_e164 IS NULL OR phone_e164 = '+212717248341') AND (country_code IS NULL OR country_code = '+212');
UPDATE public.users SET phone_e164 = '+201158622852', country_code = '+20' WHERE id = 'b2nVjGCNFEPPy8KrhLNfm5MvIqf1' AND (phone_e164 IS NULL OR phone_e164 = '+201158622852') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201021188378', country_code = '+20' WHERE id = 'bHXMyBc7ktNa9q9yB2rAHnN52Hn1' AND (phone_e164 IS NULL OR phone_e164 = '+201021188378') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+212638984021', country_code = '+212' WHERE id = 'bKPa8FoDY1YuVwvPNtsJrCsfyAW2' AND (phone_e164 IS NULL OR phone_e164 = '+212638984021') AND (country_code IS NULL OR country_code = '+212');
UPDATE public.users SET supabase_uid = 'a332b8f9-501d-45cc-a92b-816ba1d02c02'::uuid, phone_e164 = '+212625081940', country_code = '+212' WHERE id = 'a332b8f9-501d-45cc-a92b-816ba1d02c02' AND (supabase_uid IS NULL OR supabase_uid = 'a332b8f9-501d-45cc-a92b-816ba1d02c02'::uuid) AND (phone_e164 IS NULL OR phone_e164 = '+212625081940') AND (country_code IS NULL OR country_code = '+212');
UPDATE public.users SET country_code = '+20' WHERE id = 'R2ZaN8OF0mTFg1Dd9Rct4UeK5vt2' AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+212679180941', country_code = '+212' WHERE id = 'R5ME4dgfRCWmP4KKka19fZZMaP13' AND (phone_e164 IS NULL OR phone_e164 = '+212679180941') AND (country_code IS NULL OR country_code = '+212');
UPDATE public.users SET phone_e164 = '+201015054726', country_code = '+20' WHERE id = 'R8OFOiSHMLS9GiTDeWQh7QcmriF2' AND (phone_e164 IS NULL OR phone_e164 = '+201015054726') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET country_code = '+20' WHERE id = 'RDI3Z291phd0MJitZX8ydeYGp3E3' AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET country_code = '+20' WHERE id = 'ZMQsR8ZVmhMkNIuL6ZlSnLvnDyr2' AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+20102889793', country_code = '+20' WHERE id = 'ZNV9aYcGXXR6zGvHQ840xNcjx6n1' AND (phone_e164 IS NULL OR phone_e164 = '+20102889793') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201016474516', country_code = '+20' WHERE id = 'ZQKOPk8v3nOUrYnkonUkBrpb6af1' AND (phone_e164 IS NULL OR phone_e164 = '+201016474516') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+96524563156', country_code = '+965' WHERE id = 'ZU2o0xvYPAQ2CpsClD41tqblWfn2' AND (phone_e164 IS NULL OR phone_e164 = '+96524563156') AND (country_code IS NULL OR country_code = '+965');
UPDATE public.users SET phone_e164 = '+9647705162048', country_code = '+964' WHERE id = 'bLsioYcPTCQmCDjHIdSzuyw0mZa2' AND (phone_e164 IS NULL OR phone_e164 = '+9647705162048') AND (country_code IS NULL OR country_code = '+964');
UPDATE public.users SET phone_e164 = '+201044674115', country_code = '+20' WHERE id = 'ZwoBE9saIOXnGgjRbjIEU9liHUa2' AND (phone_e164 IS NULL OR phone_e164 = '+201044674115') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET country_code = '+20' WHERE id = 'ZxDD9qvjolYbpcpoXcP2FDetHL43' AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+212712027888', country_code = '+212' WHERE id = 'ZyChE5kW7UOaDjoWCLh7XJuGHP82' AND (phone_e164 IS NULL OR phone_e164 = '+212712027888') AND (country_code IS NULL OR country_code = '+212');
UPDATE public.users SET phone_e164 = '+212699069039', country_code = '+212' WHERE id = 'aXXofqAG7CWigT9OnwVJOjeXDs93' AND (phone_e164 IS NULL OR phone_e164 = '+212699069039') AND (country_code IS NULL OR country_code = '+212');
UPDATE public.users SET phone_e164 = '+9743216547892', country_code = '+974' WHERE id = 'bQ6Uz4zNfWZhyEHqFPGZUNS5NmU2' AND (phone_e164 IS NULL OR phone_e164 = '+9743216547892') AND (country_code IS NULL OR country_code = '+974');
UPDATE public.users SET country_code = '+20' WHERE id = 'bonFn23XS0eZ1Yf9Jt3pC272tiB3' AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201099248767', country_code = '+20' WHERE id = 'bqLRGZetDYMPC6L4k4gCdu9aGny1' AND (phone_e164 IS NULL OR phone_e164 = '+201099248767') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+20967733916657', country_code = '+20' WHERE id = 'buRrwbjxUpOVmUUDUUikQtib1I32' AND (phone_e164 IS NULL OR phone_e164 = '+20967733916657') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+212633875885', country_code = '+212' WHERE id = 'byUFKsxqa7X3YloFjwiZXEtgFcn2' AND (phone_e164 IS NULL OR phone_e164 = '+212633875885') AND (country_code IS NULL OR country_code = '+212');
UPDATE public.users SET phone_e164 = '+201233323212', country_code = '+20' WHERE id = 'lbsj8fUxYGcmt59JGMDTkm82o8E2' AND (phone_e164 IS NULL OR phone_e164 = '+201233323212') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET supabase_uid = '6fe0c2c1-f839-4ad2-be2a-a95fcbeaed6b'::uuid WHERE id = '6fe0c2c1-f839-4ad2-be2a-a95fcbeaed6b' AND (supabase_uid IS NULL OR supabase_uid = '6fe0c2c1-f839-4ad2-be2a-a95fcbeaed6b'::uuid);
UPDATE public.users SET phone_e164 = '+20128088926', country_code = '+20' WHERE id = 'c97myBuWgMSXxIlsDj4sV6NQha13' AND (phone_e164 IS NULL OR phone_e164 = '+20128088926') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+207205318829', country_code = '+20' WHERE id = 'c9F975YF3XWBssiXaaZItbBVM2Q2' AND (phone_e164 IS NULL OR phone_e164 = '+207205318829') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201017799555', country_code = '+20' WHERE id = 'c9cOOZKqvxfOomCK453tPRLf0Zb2' AND (phone_e164 IS NULL OR phone_e164 = '+201017799555') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+9741234567890', country_code = '+974' WHERE id = 'cAcwfAjp4WdKFRIekjzJOtTNVn72' AND (phone_e164 IS NULL OR phone_e164 = '+9741234567890') AND (country_code IS NULL OR country_code = '+974');
UPDATE public.users SET phone_e164 = '+20102661345', country_code = '+20' WHERE id = 'cNG9awY5pNafHNgnadEqIkMk4La2' AND (phone_e164 IS NULL OR phone_e164 = '+20102661345') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201023852512', country_code = '+20' WHERE id = 'cUbtZuSlvuhkmdXhLDK83L1G2dt1' AND (phone_e164 IS NULL OR phone_e164 = '+201023852512') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET supabase_uid = 'e332d5a5-3864-448b-a18e-b29701b4c178'::uuid, phone_e164 = '+212722296068', country_code = '+212' WHERE id = 'e332d5a5-3864-448b-a18e-b29701b4c178' AND (supabase_uid IS NULL OR supabase_uid = 'e332d5a5-3864-448b-a18e-b29701b4c178'::uuid) AND (phone_e164 IS NULL OR phone_e164 = '+212722296068') AND (country_code IS NULL OR country_code = '+212');
UPDATE public.users SET country_code = '+20' WHERE id = 'bu4zB0Ec1bVddI3x800xxPzQXSl1' AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET country_code = '+20' WHERE id = 'cboFvgjr8dU7RbcvHgfc3h7Eexo1' AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201231255589', country_code = '+20' WHERE id = 'ccLiRw5iPIVVc3oUmlC3Yctclcl2' AND (phone_e164 IS NULL OR phone_e164 = '+201231255589') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201019638481', country_code = '+20' WHERE id = 'cd3KO9otsuTWEuyGKX2ZOgaKpa73' AND (phone_e164 IS NULL OR phone_e164 = '+201019638481') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201068085549', country_code = '+20' WHERE id = 'cfmEhpwUWpUTk7iw0QcMjwdgnG33' AND (phone_e164 IS NULL OR phone_e164 = '+201068085549') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+20122466956', country_code = '+20' WHERE id = 'chKrJSWi8kadtbq58GYyOSPrqcc2' AND (phone_e164 IS NULL OR phone_e164 = '+20122466956') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201098393940', country_code = '+20' WHERE id = 'ciCcUWj9oZRjG4UHpy9fGg9qyfs1' AND (phone_e164 IS NULL OR phone_e164 = '+201098393940') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+212665814082', country_code = '+212' WHERE id = 'ct8tlYwOeyd7pqTSTUXoegw3v8a2' AND (phone_e164 IS NULL OR phone_e164 = '+212665814082') AND (country_code IS NULL OR country_code = '+212');
UPDATE public.users SET supabase_uid = '5625bf8c-3e43-4ccf-81ba-23d51f474184'::uuid, phone_e164 = '+213797105114', country_code = '+213' WHERE id = '5625bf8c-3e43-4ccf-81ba-23d51f474184' AND (supabase_uid IS NULL OR supabase_uid = '5625bf8c-3e43-4ccf-81ba-23d51f474184'::uuid) AND (phone_e164 IS NULL OR phone_e164 = '+213797105114') AND (country_code IS NULL OR country_code = '+213');
UPDATE public.users SET phone_e164 = '+201159222981', country_code = '+20' WHERE id = 'dONnXV0t9saoFbXU2bYqN6qGrCF2' AND (phone_e164 IS NULL OR phone_e164 = '+201159222981') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201129734219', country_code = '+20' WHERE id = 'd3yO0cC0KXQ4K1pN1vU2kjnDgME2' AND (phone_e164 IS NULL OR phone_e164 = '+201129734219') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201000510577', country_code = '+20' WHERE id = 'd6NMZNPgx3TgLz7oyxzlMnS2FKV2' AND (phone_e164 IS NULL OR phone_e164 = '+201000510577') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201091473206', country_code = '+20' WHERE id = 'd7cChmNgjBZ9BdUrnuPF9NGrWVk1' AND (phone_e164 IS NULL OR phone_e164 = '+201091473206') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+20102930652', country_code = '+20' WHERE id = 'dFGM2cnJuEamQ4LwLTqmvfcaeh12' AND (phone_e164 IS NULL OR phone_e164 = '+20102930652') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201091831430', country_code = '+20' WHERE id = 'dHF0pZencuheLkq71oMf967LfEf1' AND (phone_e164 IS NULL OR phone_e164 = '+201091831430') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET country_code = '+20' WHERE id = 'dMDSgrqY2KTtQ5gfHUaYSgFQEmv2' AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET country_code = '+20' WHERE id = 'dRYELrC4msfBSb8IVRcmhENq0UN2' AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+20115487944', country_code = '+20' WHERE id = 'ePnA3HUuWnT4F5B84ReIOqWjGO73' AND (phone_e164 IS NULL OR phone_e164 = '+20115487944') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+213676722252', country_code = '+213' WHERE id = '0c096320-1e6d-425c-af41-ea1468025590' AND (phone_e164 IS NULL OR phone_e164 = '+213676722252') AND (country_code IS NULL OR country_code = '+213');
UPDATE public.users SET phone_e164 = '+212705978643', country_code = '+212' WHERE id = 'URVJ11EzMIfPLwQpdg9jJtwqhg12' AND (phone_e164 IS NULL OR phone_e164 = '+212705978643') AND (country_code IS NULL OR country_code = '+212');
UPDATE public.users SET phone_e164 = '+212633950047', country_code = '+212' WHERE id = 'd9CAYrdkFwRVtbnFAgpQ0cHxyyl1' AND (phone_e164 IS NULL OR phone_e164 = '+212633950047') AND (country_code IS NULL OR country_code = '+212');
UPDATE public.users SET phone_e164 = '+201503971676', country_code = '+20' WHERE id = 'eZUpzFjsrMUeZ1sYOe6P8qdcgUv2' AND (phone_e164 IS NULL OR phone_e164 = '+201503971676') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+20100110699', country_code = '+20' WHERE id = 'ebA3CLw77OTsMfbtfo0fzmQDPLO2' AND (phone_e164 IS NULL OR phone_e164 = '+20100110699') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201015755385', country_code = '+20' WHERE id = 'f8WKTlammiZCIPKWdEbC0AqISlP2' AND (phone_e164 IS NULL OR phone_e164 = '+201015755385') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201280889262', country_code = '+20' WHERE id = 'fQpJGjZD16fP2aWCMwwcRD4v1LK2' AND (phone_e164 IS NULL OR phone_e164 = '+201280889262') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201061055578', country_code = '+20' WHERE id = 'fTjnLfCJVVRmIjvuF3tVsyJL0O22' AND (phone_e164 IS NULL OR phone_e164 = '+201061055578') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201005194060', country_code = '+20' WHERE id = 'fY49RtVJXHdX4n9UJo1YRZix0Oc2' AND (phone_e164 IS NULL OR phone_e164 = '+201005194060') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+212661901517', country_code = '+212' WHERE id = 'fZSbS50rifOifT1XyJwW9UFOoeI2' AND (phone_e164 IS NULL OR phone_e164 = '+212661901517') AND (country_code IS NULL OR country_code = '+212');
UPDATE public.users SET country_code = '+20' WHERE id = 'g0HWnFzeCVVTko50yIfHN51vopv2' AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201003313381', country_code = '+20' WHERE id = 'g1jVtWwNGXRbzx1nDJEWosuTYiY2' AND (phone_e164 IS NULL OR phone_e164 = '+201003313381') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET supabase_uid = '63327e3c-491b-4836-831f-4d46fafd3f8f'::uuid WHERE id = '63327e3c-491b-4836-831f-4d46fafd3f8f' AND (supabase_uid IS NULL OR supabase_uid = '63327e3c-491b-4836-831f-4d46fafd3f8f'::uuid);
UPDATE public.users SET phone_e164 = '+212606077154', country_code = '+212' WHERE id = 'VW9Wlq4bNWV1nEo0jJq1vPXrXnn2' AND (phone_e164 IS NULL OR phone_e164 = '+212606077154') AND (country_code IS NULL OR country_code = '+212');
UPDATE public.users SET phone_e164 = '+201227467734', country_code = '+20' WHERE id = 'gQVnk7W75oev6blRMQAyoWg1HMB2' AND (phone_e164 IS NULL OR phone_e164 = '+201227467734') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+20967776965616', country_code = '+20' WHERE id = 'gxjE3FsW9ibM4puzUPwOUBuav5l1' AND (phone_e164 IS NULL OR phone_e164 = '+20967776965616') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+20109145487', country_code = '+20' WHERE id = 'gy488K9RIHS6YDVf4e9sVd7HaVL2' AND (phone_e164 IS NULL OR phone_e164 = '+20109145487') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201151438471', country_code = '+20' WHERE id = 'hC0OteCqnfX1WEtnikVB9eUO8Lp2' AND (phone_e164 IS NULL OR phone_e164 = '+201151438471') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201227402939', country_code = '+20' WHERE id = 'hDxHq5JND3U7KX2uSpM166S6xbj1' AND (phone_e164 IS NULL OR phone_e164 = '+201227402939') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET country_code = '+20' WHERE id = 'VNjIYvmeXEdE8Wa9R0qtiZtQ0vD2' AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+20120884032', country_code = '+20' WHERE id = 'VQs9xXVoEbT6znfJPBPrTfr4JVm2' AND (phone_e164 IS NULL OR phone_e164 = '+20120884032') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201220285072', country_code = '+20' WHERE id = 'VSXZrzJuhQTGNeNxhtDOAS9Jmx52' AND (phone_e164 IS NULL OR phone_e164 = '+201220285072') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+212613512643', country_code = '+212' WHERE id = 'VSwKFhRKR2b05HU1RMfHsD7I0Ti1' AND (phone_e164 IS NULL OR phone_e164 = '+212613512643') AND (country_code IS NULL OR country_code = '+212');
UPDATE public.users SET phone_e164 = '+201122036594', country_code = '+20' WHERE id = 'VWaq6HeEQcQXutBKK7wY0IdVxK13' AND (phone_e164 IS NULL OR phone_e164 = '+201122036594') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+212611092130', country_code = '+212' WHERE id = 'hO93WQBhJFPGBtkPuWb1Upi2bQ32' AND (phone_e164 IS NULL OR phone_e164 = '+212611092130') AND (country_code IS NULL OR country_code = '+212');
UPDATE public.users SET phone_e164 = '+212678174428', country_code = '+212' WHERE id = 'WfBB2z2PWwd4fTdxCumZhCMuuGj2' AND (phone_e164 IS NULL OR phone_e164 = '+212678174428') AND (country_code IS NULL OR country_code = '+212');
UPDATE public.users SET supabase_uid = '64d02c3e-a928-43be-a0fa-57f7e4ffae4e'::uuid WHERE id = '64d02c3e-a928-43be-a0fa-57f7e4ffae4e' AND (supabase_uid IS NULL OR supabase_uid = '64d02c3e-a928-43be-a0fa-57f7e4ffae4e'::uuid);
UPDATE public.users SET phone_e164 = '+212606527871', country_code = '+212' WHERE id = 'WcEFJboEsbYganOoC0OnILwPnGH2' AND (phone_e164 IS NULL OR phone_e164 = '+212606527871') AND (country_code IS NULL OR country_code = '+212');
UPDATE public.users SET supabase_uid = '2a4a973c-269b-4688-bc90-a8248b2fff76'::uuid, phone_e164 = '+212653245521', country_code = '+212' WHERE id = '2a4a973c-269b-4688-bc90-a8248b2fff76' AND (supabase_uid IS NULL OR supabase_uid = '2a4a973c-269b-4688-bc90-a8248b2fff76'::uuid) AND (phone_e164 IS NULL OR phone_e164 = '+212653245521') AND (country_code IS NULL OR country_code = '+212');
UPDATE public.users SET supabase_uid = 'ddcde892-3349-44eb-a9c9-c78501f649e3'::uuid, phone_e164 = '+213558046066', country_code = '+213' WHERE id = 'ddcde892-3349-44eb-a9c9-c78501f649e3' AND (supabase_uid IS NULL OR supabase_uid = 'ddcde892-3349-44eb-a9c9-c78501f649e3'::uuid) AND (phone_e164 IS NULL OR phone_e164 = '+213558046066') AND (country_code IS NULL OR country_code = '+213');
UPDATE public.users SET country_code = '+20' WHERE id = 'YMIT1W1wxTX2oe7kWRAcqI7UPrE2' AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201000522414', country_code = '+20' WHERE id = 'YNFKTHWcypNhjFMkaFwX0IbJzSg2' AND (phone_e164 IS NULL OR phone_e164 = '+201000522414') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201273427549', country_code = '+20' WHERE id = 'ZLBykM0SDFezwXUsFGJqe7xscTn2' AND (phone_e164 IS NULL OR phone_e164 = '+201273427549') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET country_code = '+974' WHERE id = 'ZMMGQoZF8PREKSEh4LFYeVnJZq92' AND (country_code IS NULL OR country_code = '+974');
UPDATE public.users SET supabase_uid = '766dfc43-0eaf-45c3-b3d8-cff3f2f71d26'::uuid, phone_e164 = '+201146767590', country_code = '+20' WHERE id = '766dfc43-0eaf-45c3-b3d8-cff3f2f71d26' AND (supabase_uid IS NULL OR supabase_uid = '766dfc43-0eaf-45c3-b3d8-cff3f2f71d26'::uuid) AND (phone_e164 IS NULL OR phone_e164 = '+201146767590') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+20102508194', country_code = '+20' WHERE id = 'Zgp8GjkamkUxapqbdjRhxoKq6YT2' AND (phone_e164 IS NULL OR phone_e164 = '+20102508194') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+212661224808', country_code = '+212' WHERE id = 'hlIqc4aiUWb3fXRPLrafMkyYvuy2' AND (phone_e164 IS NULL OR phone_e164 = '+212661224808') AND (country_code IS NULL OR country_code = '+212');
UPDATE public.users SET phone_e164 = '+212604364462', country_code = '+212' WHERE id = 'httKHilatkcdwaAjeutpWiJNnD42' AND (phone_e164 IS NULL OR phone_e164 = '+212604364462') AND (country_code IS NULL OR country_code = '+212');
UPDATE public.users SET phone_e164 = '+212777685831', country_code = '+212' WHERE id = 'i58i2WrAmwaIGsHeGAwx9hwMvxo2' AND (phone_e164 IS NULL OR phone_e164 = '+212777685831') AND (country_code IS NULL OR country_code = '+212');
UPDATE public.users SET phone_e164 = '+212715309950', country_code = '+212' WHERE id = 'i62hvtw349fIXPNrgyt4JZjgbgO2' AND (phone_e164 IS NULL OR phone_e164 = '+212715309950') AND (country_code IS NULL OR country_code = '+212');
UPDATE public.users SET phone_e164 = '+201001414180', country_code = '+20' WHERE id = 'iCB9S5cl9JaFkqCiotHCpEKqugA2' AND (phone_e164 IS NULL OR phone_e164 = '+201001414180') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+212654169309', country_code = '+212' WHERE id = 'iOTSgqxbmghKaQroyBtvuEF9PJ63' AND (phone_e164 IS NULL OR phone_e164 = '+212654169309') AND (country_code IS NULL OR country_code = '+212');
UPDATE public.users SET supabase_uid = '687c9538-bec4-4cc7-bae5-c5aadc568ab9'::uuid, phone_e164 = '+201207671631', country_code = '+20' WHERE id = '687c9538-bec4-4cc7-bae5-c5aadc568ab9' AND (supabase_uid IS NULL OR supabase_uid = '687c9538-bec4-4cc7-bae5-c5aadc568ab9'::uuid) AND (phone_e164 IS NULL OR phone_e164 = '+201207671631') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201273070443', country_code = '+20' WHERE id = 'Zuama03JDHUDIjpJeRJoiwubsHi2' AND (phone_e164 IS NULL OR phone_e164 = '+201273070443') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET country_code = '+20' WHERE id = 'ZytoZphDMsaYUe1amP9sIoRSYuW2' AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+303052791705', country_code = '+30' WHERE id = 'ZzGCJgPxr6T9WRWJr3DU6zIpYG83' AND (phone_e164 IS NULL OR phone_e164 = '+303052791705') AND (country_code IS NULL OR country_code = '+30');
UPDATE public.users SET phone_e164 = '+20105083069', country_code = '+20' WHERE id = 'aWN4X0IuiZXIWyUS76hoiXP8USt1' AND (phone_e164 IS NULL OR phone_e164 = '+20105083069') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET supabase_uid = 'b0f57f87-8928-4604-937b-11d79ede3937'::uuid, phone_e164 = '+201286100392', country_code = '+20' WHERE id = 'b0f57f87-8928-4604-937b-11d79ede3937' AND (supabase_uid IS NULL OR supabase_uid = 'b0f57f87-8928-4604-937b-11d79ede3937'::uuid) AND (phone_e164 IS NULL OR phone_e164 = '+201286100392') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+212722419611', country_code = '+212' WHERE id = 'ajdLfIDnKfWMRRYWTuNu4kKHIar2' AND (phone_e164 IS NULL OR phone_e164 = '+212722419611') AND (country_code IS NULL OR country_code = '+212');
UPDATE public.users SET supabase_uid = '30b443a6-d2b7-446b-adf9-6b00f809a441'::uuid, phone_e164 = '+201289885189', country_code = '+20' WHERE id = '30b443a6-d2b7-446b-adf9-6b00f809a441' AND (supabase_uid IS NULL OR supabase_uid = '30b443a6-d2b7-446b-adf9-6b00f809a441'::uuid) AND (phone_e164 IS NULL OR phone_e164 = '+201289885189') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+212713927305', country_code = '+212' WHERE id = 'birOc08ZRBde7SDtPCJeKhKiwHB3' AND (phone_e164 IS NULL OR phone_e164 = '+212713927305') AND (country_code IS NULL OR country_code = '+212');
UPDATE public.users SET supabase_uid = '2d6b42e2-2689-4022-b987-80b213d23d19'::uuid, phone_e164 = '+201147363472', country_code = '+20' WHERE id = '2d6b42e2-2689-4022-b987-80b213d23d19' AND (supabase_uid IS NULL OR supabase_uid = '2d6b42e2-2689-4022-b987-80b213d23d19'::uuid) AND (phone_e164 IS NULL OR phone_e164 = '+201147363472') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+212667893475', country_code = '+212' WHERE id = 'cjYZ9YAAguVHa4wjFNlFYswxptw2' AND (phone_e164 IS NULL OR phone_e164 = '+212667893475') AND (country_code IS NULL OR country_code = '+212');
UPDATE public.users SET phone_e164 = '+201229921936', country_code = '+20' WHERE id = 'dRYkaFCdNuQfufvHi9qJS4YppT22' AND (phone_e164 IS NULL OR phone_e164 = '+201229921936') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET country_code = '+20' WHERE id = 'dhwK15grDSavcxfQW7k7jfMnH7z1' AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201067629044', country_code = '+20' WHERE id = 'e7hgnH5bqnYjy8d40zsnZeQDYGw2' AND (phone_e164 IS NULL OR phone_e164 = '+201067629044') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+97466429898', country_code = '+974' WHERE id = 'eE7bacUdiZMbfPaj4LUo8HxHbPx1' AND (phone_e164 IS NULL OR phone_e164 = '+97466429898') AND (country_code IS NULL OR country_code = '+974');
UPDATE public.users SET phone_e164 = '+201006808165', country_code = '+20' WHERE id = 'eOjCdk2X0lMhH1zlOnmZhsFNoK82' AND (phone_e164 IS NULL OR phone_e164 = '+201006808165') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+212667063922', country_code = '+212' WHERE id = 'egLRKdQFPnTCHqHyTx2qoSCB8VZ2' AND (phone_e164 IS NULL OR phone_e164 = '+212667063922') AND (country_code IS NULL OR country_code = '+212');
UPDATE public.users SET phone_e164 = '+212625813353', country_code = '+212' WHERE id = 'f55GlSPzOiaYPeB4tqu1hRdZKdy2' AND (phone_e164 IS NULL OR phone_e164 = '+212625813353') AND (country_code IS NULL OR country_code = '+212');
UPDATE public.users SET phone_e164 = '+97459961783', country_code = '+974' WHERE id = 'iX50AfR6LiPwhyMm56dyugmudvG2' AND (phone_e164 IS NULL OR phone_e164 = '+97459961783') AND (country_code IS NULL OR country_code = '+974');
UPDATE public.users SET phone_e164 = '+212689105253', country_code = '+212' WHERE id = 'if3MVXXvYdheKgxvMcQl8d1F9Qh1' AND (phone_e164 IS NULL OR phone_e164 = '+212689105253') AND (country_code IS NULL OR country_code = '+212');
UPDATE public.users SET phone_e164 = '+20111314938', country_code = '+20' WHERE id = 'ig76COC3j8X9WUexHhzX6sO2LdG3' AND (phone_e164 IS NULL OR phone_e164 = '+20111314938') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+212641190626', country_code = '+212' WHERE id = 'ikZLad9SSygESqHtrkeVxRlEh3g2' AND (phone_e164 IS NULL OR phone_e164 = '+212641190626') AND (country_code IS NULL OR country_code = '+212');
UPDATE public.users SET phone_e164 = '+201022803802', country_code = '+20' WHERE id = 'imlqom1qBxXt7N0T3fIZCGjwO7g1' AND (phone_e164 IS NULL OR phone_e164 = '+201022803802') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201002307144', country_code = '+20' WHERE id = 'io2Xo7fxgUaHk2wLlXpxzP6iZa02' AND (phone_e164 IS NULL OR phone_e164 = '+201002307144') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201060038054', country_code = '+20' WHERE id = 'irErkP8w5bQtOdkzOhsxz1Gjxe43' AND (phone_e164 IS NULL OR phone_e164 = '+201060038054') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET supabase_uid = 'ac667525-d258-4533-a699-a68424ef2c1f'::uuid, phone_e164 = '+201281354490', country_code = '+20' WHERE id = 'ac667525-d258-4533-a699-a68424ef2c1f' AND (supabase_uid IS NULL OR supabase_uid = 'ac667525-d258-4533-a699-a68424ef2c1f'::uuid) AND (phone_e164 IS NULL OR phone_e164 = '+201281354490') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+20127585719', country_code = '+20' WHERE id = 'eprVwRqnjDZr7vYodFUHfPDnp8I3' AND (phone_e164 IS NULL OR phone_e164 = '+20127585719') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201023121852', country_code = '+20' WHERE id = 'fMrgy34xIqfIKF1iiqCcsVkH17g2' AND (phone_e164 IS NULL OR phone_e164 = '+201023121852') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201016724484', country_code = '+20' WHERE id = 'fQaZJqpxp9gOw6rzi9SIlNX30Vc2' AND (phone_e164 IS NULL OR phone_e164 = '+201016724484') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET country_code = '+20' WHERE id = 'fYeGA8gL5ifUmOAmDa8glPnV25h1' AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET supabase_uid = 'cd2d0e3c-3064-426b-8e1b-b94ebf967523'::uuid, phone_e164 = '+201274812850', country_code = '+20' WHERE id = 'cd2d0e3c-3064-426b-8e1b-b94ebf967523' AND (supabase_uid IS NULL OR supabase_uid = 'cd2d0e3c-3064-426b-8e1b-b94ebf967523'::uuid) AND (phone_e164 IS NULL OR phone_e164 = '+201274812850') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+212694555151', country_code = '+212' WHERE id = 'fkRo9CKRcsR547oFnfP6r82SXsF3' AND (phone_e164 IS NULL OR phone_e164 = '+212694555151') AND (country_code IS NULL OR country_code = '+212');
UPDATE public.users SET phone_e164 = '+20102025682', country_code = '+20' WHERE id = 'fsNmacRu4qO8sepi9Nv6fS4yCgo1' AND (phone_e164 IS NULL OR phone_e164 = '+20102025682') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+20108086993', country_code = '+20' WHERE id = 'fxnbZII3aNcr6MPEx1mqD21RQ1c2' AND (phone_e164 IS NULL OR phone_e164 = '+20108086993') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET supabase_uid = '0f4e976d-c0a7-4f3b-b471-0fca25281b01'::uuid, phone_e164 = '+201142131844', country_code = '+20' WHERE id = '0f4e976d-c0a7-4f3b-b471-0fca25281b01' AND (supabase_uid IS NULL OR supabase_uid = '0f4e976d-c0a7-4f3b-b471-0fca25281b01'::uuid) AND (phone_e164 IS NULL OR phone_e164 = '+201142131844') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET supabase_uid = '9b8de15e-725e-4dd2-bff6-3786f87122c4'::uuid, phone_e164 = '+201274603025', country_code = '+20' WHERE id = '9b8de15e-725e-4dd2-bff6-3786f87122c4' AND (supabase_uid IS NULL OR supabase_uid = '9b8de15e-725e-4dd2-bff6-3786f87122c4'::uuid) AND (phone_e164 IS NULL OR phone_e164 = '+201274603025') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET supabase_uid = '5530ff89-9067-4341-b426-6dfb24fb910a'::uuid, phone_e164 = '+201277573426', country_code = '+20' WHERE id = '5530ff89-9067-4341-b426-6dfb24fb910a' AND (supabase_uid IS NULL OR supabase_uid = '5530ff89-9067-4341-b426-6dfb24fb910a'::uuid) AND (phone_e164 IS NULL OR phone_e164 = '+201277573426') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET country_code = '+20' WHERE id = 'is6JRqYXTeepkMKAV1tWE057SrB3' AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+20111584990', country_code = '+20' WHERE id = 'itoWbKRxKjZYIKOAhK98ybZIOTe2' AND (phone_e164 IS NULL OR phone_e164 = '+20111584990') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+20103310591', country_code = '+20' WHERE id = 'iuWdC8qytaWRW8uTkfW3FcOqIW72' AND (phone_e164 IS NULL OR phone_e164 = '+20103310591') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+20102407640', country_code = '+20' WHERE id = 'k0N2FoT7viYGz3wBEwpXVnma9PC3' AND (phone_e164 IS NULL OR phone_e164 = '+20102407640') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201092478411', country_code = '+20' WHERE id = 'k1jlDatzG3bzMWX0Br7jiCiz0NJ3' AND (phone_e164 IS NULL OR phone_e164 = '+201092478411') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET supabase_uid = 'b552b068-2646-4fe1-b1ee-a423eb0e5887'::uuid, phone_e164 = '+201276390127', country_code = '+20' WHERE id = 'b552b068-2646-4fe1-b1ee-a423eb0e5887' AND (supabase_uid IS NULL OR supabase_uid = 'b552b068-2646-4fe1-b1ee-a423eb0e5887'::uuid) AND (phone_e164 IS NULL OR phone_e164 = '+201276390127') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201022263528', country_code = '+20' WHERE id = 'kFuIMpFXsDPfGCojBa3ojwHPzMm2' AND (phone_e164 IS NULL OR phone_e164 = '+201022263528') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201102105991', country_code = '+20' WHERE id = 'kHaM5XyRJJgDnsMpZJzMacDWp9z1' AND (phone_e164 IS NULL OR phone_e164 = '+201102105991') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+20272846548', country_code = '+20' WHERE id = 'kJGJWQVngPZaK6mROd9FcJVjsU63' AND (phone_e164 IS NULL OR phone_e164 = '+20272846548') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+20128250339', country_code = '+20' WHERE id = 'kMdCJAUAp7fVbBcFg1g9bPwnfIH3' AND (phone_e164 IS NULL OR phone_e164 = '+20128250339') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET supabase_uid = 'ea5c5523-6eec-46ff-9b13-783dd71a8b2e'::uuid, phone_e164 = '+201025519031', country_code = '+20' WHERE id = 'ea5c5523-6eec-46ff-9b13-783dd71a8b2e' AND (supabase_uid IS NULL OR supabase_uid = 'ea5c5523-6eec-46ff-9b13-783dd71a8b2e'::uuid) AND (phone_e164 IS NULL OR phone_e164 = '+201025519031') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+212661674807', country_code = '+212' WHERE id = 'lF5gRzPlwGUWdmrYA9vugKtmfGL2' AND (phone_e164 IS NULL OR phone_e164 = '+212661674807') AND (country_code IS NULL OR country_code = '+212');
UPDATE public.users SET phone_e164 = '+212605470587', country_code = '+212' WHERE id = 'lp082OcLGNeFMVUn6JmuqFINqyl2' AND (phone_e164 IS NULL OR phone_e164 = '+212605470587') AND (country_code IS NULL OR country_code = '+212');
UPDATE public.users SET supabase_uid = '740b19e5-287b-4b8c-8773-213a267f411d'::uuid, phone_e164 = '+962785119306', country_code = '+962' WHERE id = '740b19e5-287b-4b8c-8773-213a267f411d' AND (supabase_uid IS NULL OR supabase_uid = '740b19e5-287b-4b8c-8773-213a267f411d'::uuid) AND (phone_e164 IS NULL OR phone_e164 = '+962785119306') AND (country_code IS NULL OR country_code = '+962');
UPDATE public.users SET phone_e164 = '+201004617408', country_code = '+20' WHERE id = 'nZu5xko8WhPRHylH5dwDwemw8Rg1' AND (phone_e164 IS NULL OR phone_e164 = '+201004617408') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET country_code = '+20' WHERE id = 'neEfb9khgDNT0EmA9zfmuakaLTi2' AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET supabase_uid = '2479885e-ec95-43b7-8f17-5e105b6fcba0'::uuid, phone_e164 = '+201150964617', country_code = '+20' WHERE id = '2479885e-ec95-43b7-8f17-5e105b6fcba0' AND (supabase_uid IS NULL OR supabase_uid = '2479885e-ec95-43b7-8f17-5e105b6fcba0'::uuid) AND (phone_e164 IS NULL OR phone_e164 = '+201150964617') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201153962175', country_code = '+20' WHERE id = 'hepgkzRGM8bQVljSte54Wfk0Rza2' AND (phone_e164 IS NULL OR phone_e164 = '+201153962175') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET country_code = '+20' WHERE id = 'hk1WcoGFc2bKDofWl7kOCeKilI53' AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET country_code = '+20' WHERE id = 'neqG4GAs7fWFSPew5xNBllh8wNC2' AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201015782616', country_code = '+20' WHERE id = 'pcO8FblrN6SVjkmtMEyvEMUZkGP2' AND (phone_e164 IS NULL OR phone_e164 = '+201015782616') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET supabase_uid = '3908e0a6-501c-46af-b2fb-4ea7f7bdc0d0'::uuid, phone_e164 = '+201558579767', country_code = '+20' WHERE id = '3908e0a6-501c-46af-b2fb-4ea7f7bdc0d0' AND (supabase_uid IS NULL OR supabase_uid = '3908e0a6-501c-46af-b2fb-4ea7f7bdc0d0'::uuid) AND (phone_e164 IS NULL OR phone_e164 = '+201558579767') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201559267800', country_code = '+20' WHERE id = 'pncKTRBx9Me83ipLJCMXGWm483G2' AND (phone_e164 IS NULL OR phone_e164 = '+201559267800') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201099948167', country_code = '+20' WHERE id = 'ppBLaaNJMkhP5MThd47UvX0KQk52' AND (phone_e164 IS NULL OR phone_e164 = '+201099948167') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+212699542882', country_code = '+212' WHERE id = 'prwivvdSGHZHrfUYCG4cutLUML13' AND (phone_e164 IS NULL OR phone_e164 = '+212699542882') AND (country_code IS NULL OR country_code = '+212');
UPDATE public.users SET phone_e164 = '+201144982872', country_code = '+20' WHERE id = 'ptOGArcYR9UeHFLzslloNpSaubO2' AND (phone_e164 IS NULL OR phone_e164 = '+201144982872') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+212697984030', country_code = '+212' WHERE id = 'q5yvZePfbrYybkDlEUYKaR2Hc1l1' AND (phone_e164 IS NULL OR phone_e164 = '+212697984030') AND (country_code IS NULL OR country_code = '+212');
UPDATE public.users SET phone_e164 = '+201009934003', country_code = '+20' WHERE id = 'qHrMwoJQQhZrXsZAqwvjzsBTvC33' AND (phone_e164 IS NULL OR phone_e164 = '+201009934003') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+212649030477', country_code = '+212' WHERE id = 'qPImuxTYcJWFVrROPcnld6zjSmF2' AND (phone_e164 IS NULL OR phone_e164 = '+212649030477') AND (country_code IS NULL OR country_code = '+212');
UPDATE public.users SET phone_e164 = '+201149938208', country_code = '+20' WHERE id = 'qPeUIxuGh1eCi2s6Cse5C9FNwTg1' AND (phone_e164 IS NULL OR phone_e164 = '+201149938208') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET country_code = '+20' WHERE id = 'qTU43iobqSQY5CthgWQIYiUOqMn2' AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+20114993820', country_code = '+20' WHERE id = 'dYy2s1AO2wXq3ba541u0tjFzU1j2' AND (phone_e164 IS NULL OR phone_e164 = '+20114993820') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201201667950', country_code = '+20' WHERE id = 'daSObss87QOqZb23unKBFGyteEA2' AND (phone_e164 IS NULL OR phone_e164 = '+201201667950') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201003713630', country_code = '+20' WHERE id = 'dgQBoLykZSdy6JWpMbPAJQdMqYL2' AND (phone_e164 IS NULL OR phone_e164 = '+201003713630') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201204978347', country_code = '+20' WHERE id = 'fIou8xLsdCdqiIpvpVdzkP1GucB3' AND (phone_e164 IS NULL OR phone_e164 = '+201204978347') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+9741553494085', country_code = '+974' WHERE id = 'fKQRNNgi9HYCesk1s7HYliDDAkC2' AND (phone_e164 IS NULL OR phone_e164 = '+9741553494085') AND (country_code IS NULL OR country_code = '+974');
UPDATE public.users SET phone_e164 = '+201002986947', country_code = '+20' WHERE id = 'fKUKl1wGiiZSEMne5dNtlWn8G7A2' AND (phone_e164 IS NULL OR phone_e164 = '+201002986947') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET supabase_uid = 'b20cb2bb-b8c7-4870-b91e-2be8ee718ecf'::uuid, phone_e164 = '+201120971566', country_code = '+20' WHERE id = 'b20cb2bb-b8c7-4870-b91e-2be8ee718ecf' AND (supabase_uid IS NULL OR supabase_uid = 'b20cb2bb-b8c7-4870-b91e-2be8ee718ecf'::uuid) AND (phone_e164 IS NULL OR phone_e164 = '+201120971566') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+212715106138', country_code = '+212' WHERE id = 'iu1A1msz7PXmgQ1uKbSJuYmtWqA3' AND (phone_e164 IS NULL OR phone_e164 = '+212715106138') AND (country_code IS NULL OR country_code = '+212');
UPDATE public.users SET phone_e164 = '+201125111231', country_code = '+20' WHERE id = 'iyjIru1OVqVSdceSvEFFKUzQZW62' AND (phone_e164 IS NULL OR phone_e164 = '+201125111231') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201280489158', country_code = '+20' WHERE id = 'j0Vu3YdaH2RuNFBCX0qDvo63DyE3' AND (phone_e164 IS NULL OR phone_e164 = '+201280489158') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201010700806', country_code = '+20' WHERE id = 'j7X17sdUBZRAkJyUU6v7HAHif1I3' AND (phone_e164 IS NULL OR phone_e164 = '+201010700806') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201031499452', country_code = '+20' WHERE id = 'jRs30jBqVlUTcb0zNxaT8mPHsCw1' AND (phone_e164 IS NULL OR phone_e164 = '+201031499452') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+20127284654', country_code = '+20' WHERE id = 'jVuBh2TkjISFQmM7qQ3w0iuC0iI3' AND (phone_e164 IS NULL OR phone_e164 = '+20127284654') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201000478120', country_code = '+20' WHERE id = 'jWzshhPiEAMmTWUIuLpoaGXou782' AND (phone_e164 IS NULL OR phone_e164 = '+201000478120') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+212703553626', country_code = '+212' WHERE id = 'jc6bJENgWSeN245Z5ZNKE3wJtj43' AND (phone_e164 IS NULL OR phone_e164 = '+212703553626') AND (country_code IS NULL OR country_code = '+212');
UPDATE public.users SET supabase_uid = 'e7007518-4f79-420a-b3de-a917a1d00bb9'::uuid, phone_e164 = '+201285088661', country_code = '+20' WHERE id = 'e7007518-4f79-420a-b3de-a917a1d00bb9' AND (supabase_uid IS NULL OR supabase_uid = 'e7007518-4f79-420a-b3de-a917a1d00bb9'::uuid) AND (phone_e164 IS NULL OR phone_e164 = '+201285088661') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+97433839075', country_code = '+974' WHERE id = 'jcshH3oFUsdjl6h1vsVVvgzRax92' AND (phone_e164 IS NULL OR phone_e164 = '+97433839075') AND (country_code IS NULL OR country_code = '+974');
UPDATE public.users SET phone_e164 = '+6666768888997', country_code = '+66' WHERE id = 'jelfu5JHDbS3M01uy2DPLFllsVS2' AND (phone_e164 IS NULL OR phone_e164 = '+6666768888997') AND (country_code IS NULL OR country_code = '+66');
UPDATE public.users SET phone_e164 = '+201029749759', country_code = '+20' WHERE id = 'jexV3WfLXTNWpLmrQIyyLf6Bvy73' AND (phone_e164 IS NULL OR phone_e164 = '+201029749759') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201080136569', country_code = '+20' WHERE id = 'jgfy4Wkn2FUHGG57DindrfeQFwU2' AND (phone_e164 IS NULL OR phone_e164 = '+201080136569') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+966510510939', country_code = '+966' WHERE id = 'jlUkv62YbXZ2cWMpiDFGw0Nj5o72' AND (phone_e164 IS NULL OR phone_e164 = '+966510510939') AND (country_code IS NULL OR country_code = '+966');
UPDATE public.users SET phone_e164 = '+212639768829', country_code = '+212' WHERE id = 'jm1P4umgU2NZEUKHpT9pqptYVTu2' AND (phone_e164 IS NULL OR phone_e164 = '+212639768829') AND (country_code IS NULL OR country_code = '+212');
UPDATE public.users SET phone_e164 = '+201092380838', country_code = '+20' WHERE id = 'jnjMg6GfDrNIfcTVhrkCWHeUfxH3' AND (phone_e164 IS NULL OR phone_e164 = '+201092380838') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+9741289952261', country_code = '+974' WHERE id = 'jwrRxE9O3vO3cynZU8lgm9w9bf63' AND (phone_e164 IS NULL OR phone_e164 = '+9741289952261') AND (country_code IS NULL OR country_code = '+974');
UPDATE public.users SET phone_e164 = '+201096471845', country_code = '+20' WHERE id = 'jzhWgy0QKnTmcRcbVTjdf1MMopX2' AND (phone_e164 IS NULL OR phone_e164 = '+201096471845') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET country_code = '+20' WHERE id = 'k0Grzn7im4g1zKSQKsGohsyVlLQ2' AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201068762272', country_code = '+20' WHERE id = 'k6CyPSw7ZRZNlbQsAcnLNjslY8E2' AND (phone_e164 IS NULL OR phone_e164 = '+201068762272') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET country_code = '+20' WHERE id = 'kC5qOqWk8fQzbbmXjwbc0s5bdl33' AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201097104791', country_code = '+20' WHERE id = 'kJpk8nu5jqZ0g2Hr8upMAB8ID1E2' AND (phone_e164 IS NULL OR phone_e164 = '+201097104791') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201563686857', country_code = '+20' WHERE id = 'kNRSIQbZ53g5qcrngde5Lb66z1q1' AND (phone_e164 IS NULL OR phone_e164 = '+201563686857') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET country_code = '+20' WHERE id = 'kR0O15keETgjGOc7bv8bmfTWHRi2' AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201227555733', country_code = '+20' WHERE id = 'kVOsdQjnpDXvmzH5c2b4x9DBiSK2' AND (phone_e164 IS NULL OR phone_e164 = '+201227555733') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+212665934692', country_code = '+212' WHERE id = 'kgfH8vJLZHTvduPU7RXFmVPIzi03' AND (phone_e164 IS NULL OR phone_e164 = '+212665934692') AND (country_code IS NULL OR country_code = '+212');
UPDATE public.users SET phone_e164 = '+212666226088', country_code = '+212' WHERE id = 'kiYr2MrRdEfRzaGJhaUU20onsc12' AND (phone_e164 IS NULL OR phone_e164 = '+212666226088') AND (country_code IS NULL OR country_code = '+212');
UPDATE public.users SET phone_e164 = '+201221681381', country_code = '+20' WHERE id = 'lh7ifxuMnLOvLfU8PRE1yQMo25f2' AND (phone_e164 IS NULL OR phone_e164 = '+201221681381') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+966533854529', country_code = '+966' WHERE id = 'liMqt1ePtSeMN3PnfzTgysaN1ro1' AND (phone_e164 IS NULL OR phone_e164 = '+966533854529') AND (country_code IS NULL OR country_code = '+966');
UPDATE public.users SET phone_e164 = '+96650595555', country_code = '+966' WHERE id = 'lkUAHZ1MG5ZqUEa7GbZvtpBh58u1' AND (phone_e164 IS NULL OR phone_e164 = '+96650595555') AND (country_code IS NULL OR country_code = '+966');
UPDATE public.users SET country_code = '+20' WHERE id = 'llJ632EVTWgge0tkJasf8Nk9MW83' AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+20109874789', country_code = '+20' WHERE id = 'lp2tzfrt6wNxX0TUjO1DsEh9j9h1' AND (phone_e164 IS NULL OR phone_e164 = '+20109874789') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201097637940', country_code = '+20' WHERE id = 'lvZq0Iv3XVR7MYBfCVTKkLjqs1l1' AND (phone_e164 IS NULL OR phone_e164 = '+201097637940') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201221034013', country_code = '+20' WHERE id = 'lz0OQvX3uxT8RUqY0hSLCxtECmn2' AND (phone_e164 IS NULL OR phone_e164 = '+201221034013') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201234567891', country_code = '+20' WHERE id = 'm0fduSBldXV8qr4qdMyVv4eKoGz1' AND (phone_e164 IS NULL OR phone_e164 = '+201234567891') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201103452590', country_code = '+20' WHERE id = 'm3QbyrTbVlMqCNTuxCBZx5XSKNI2' AND (phone_e164 IS NULL OR phone_e164 = '+201103452590') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201097149836', country_code = '+20' WHERE id = 'm59wUEiigVPeDcb45Jx1cFwrG6m1' AND (phone_e164 IS NULL OR phone_e164 = '+201097149836') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+97431001146', country_code = '+974' WHERE id = 'mCo1Y8F9JqRdaOwLxG4mc9Np7yI3' AND (phone_e164 IS NULL OR phone_e164 = '+97431001146') AND (country_code IS NULL OR country_code = '+974');
UPDATE public.users SET phone_e164 = '+201103639744', country_code = '+20' WHERE id = 'mHkrfg2AandkiWuGqqgztAtio103' AND (phone_e164 IS NULL OR phone_e164 = '+201103639744') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+97455988261', country_code = '+974' WHERE id = 'mHrxySV8lteAZaK1awSS71eQ9qY2' AND (phone_e164 IS NULL OR phone_e164 = '+97455988261') AND (country_code IS NULL OR country_code = '+974');
UPDATE public.users SET phone_e164 = '+201201565907', country_code = '+20' WHERE id = 'mSGH6G93JdQu8taGPA4Tcju6GJf2' AND (phone_e164 IS NULL OR phone_e164 = '+201201565907') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201122335556', country_code = '+20' WHERE id = 'mTOiJlfc4qhFb1e7f5becorFw0r2' AND (phone_e164 IS NULL OR phone_e164 = '+201122335556') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+967775236699', country_code = '+967' WHERE id = 'mb7av2YuXAUf7GCK45d8VWGxqyH3' AND (phone_e164 IS NULL OR phone_e164 = '+967775236699') AND (country_code IS NULL OR country_code = '+967');
UPDATE public.users SET phone_e164 = '+968199999999', country_code = '+968' WHERE id = 'mcXyLKDH9cdQ5zRnSzaLfbvSqjO2' AND (phone_e164 IS NULL OR phone_e164 = '+968199999999') AND (country_code IS NULL OR country_code = '+968');
UPDATE public.users SET phone_e164 = '+201030446539', country_code = '+20' WHERE id = 'meMcnrX04pNEXVnveaYUrKX1Oiu1' AND (phone_e164 IS NULL OR phone_e164 = '+201030446539') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+20128337358', country_code = '+20' WHERE id = 'mf8Wow6DEFh7ADOEfUbNfqfBPkz2' AND (phone_e164 IS NULL OR phone_e164 = '+20128337358') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+212657260332', country_code = '+212' WHERE id = 'mpUcIAiY7Bbn62t3ScOQhJ2NRPx1' AND (phone_e164 IS NULL OR phone_e164 = '+212657260332') AND (country_code IS NULL OR country_code = '+212');
UPDATE public.users SET phone_e164 = '+204444444444', country_code = '+20' WHERE id = 'mrkelUsn6BOLtCo3QnDIO1SwIPT2' AND (phone_e164 IS NULL OR phone_e164 = '+204444444444') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201551738817', country_code = '+20' WHERE id = 'mu6kWFbJMrRRmntW2XEtklZ6sko2' AND (phone_e164 IS NULL OR phone_e164 = '+201551738817') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET supabase_uid = '11c173a2-7f0e-4f11-9f7a-9840182696d9'::uuid, phone_e164 = '+201062711521', country_code = '+20' WHERE id = '11c173a2-7f0e-4f11-9f7a-9840182696d9' AND (supabase_uid IS NULL OR supabase_uid = '11c173a2-7f0e-4f11-9f7a-9840182696d9'::uuid) AND (phone_e164 IS NULL OR phone_e164 = '+201062711521') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201066269051', country_code = '+20' WHERE id = 'mv9cBC6ObqTjcZ2Pi8qSNL2b0pt1' AND (phone_e164 IS NULL OR phone_e164 = '+201066269051') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET country_code = '+20' WHERE id = 'mvzPYdyrvVMez9LULFi2t7BB1NJ3' AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+20100193825', country_code = '+20' WHERE id = 'mytYjbbg2ESlvpwpyEEzzxTwbAV2' AND (phone_e164 IS NULL OR phone_e164 = '+20100193825') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201093712815', country_code = '+20' WHERE id = 'n0l6BrwNWEWtAjitjUbEJ57BZ503' AND (phone_e164 IS NULL OR phone_e164 = '+201093712815') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET country_code = '+20' WHERE id = 'n4eIk2y6OIdIzOnwA97YMOiKHmh2' AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201066937816', country_code = '+20' WHERE id = 'nEzby4lXj4aG7gln5X4OahKOAez2' AND (phone_e164 IS NULL OR phone_e164 = '+201066937816') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+2010179760', country_code = '+20' WHERE id = 'nLFvBfqZOkMJFMuErnVoVkTXtTn2' AND (phone_e164 IS NULL OR phone_e164 = '+2010179760') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+212687300049', country_code = '+212' WHERE id = 'nPVmSV5KssbzRGU3rN7ABfTZfei1' AND (phone_e164 IS NULL OR phone_e164 = '+212687300049') AND (country_code IS NULL OR country_code = '+212');
UPDATE public.users SET phone_e164 = '+201009834700', country_code = '+20' WHERE id = 'nWcjtByp56XFXmlpUYq2fnqrQzd2' AND (phone_e164 IS NULL OR phone_e164 = '+201009834700') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+20102943479', country_code = '+20' WHERE id = 'nXuiYIgNO1b8QzpHI94oTMqQGSg2' AND (phone_e164 IS NULL OR phone_e164 = '+20102943479') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201146706212', country_code = '+20' WHERE id = 'ngK6oTNfyDXB7NRbNdlR2fhxIuU2' AND (phone_e164 IS NULL OR phone_e164 = '+201146706212') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201014477580', country_code = '+20' WHERE id = 'nrc5xAoMLdPIoc33Rcqw27wjNjd2' AND (phone_e164 IS NULL OR phone_e164 = '+201014477580') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+218218222222223', country_code = '+218' WHERE id = 'oAsshvM54jgoZSkhhNbt2LxuQhI2' AND (phone_e164 IS NULL OR phone_e164 = '+218218222222223') AND (country_code IS NULL OR country_code = '+218');
UPDATE public.users SET phone_e164 = '+212772627584', country_code = '+212' WHERE id = 'oAwVqA68UzXDJYSz8KsShgUSbOs2' AND (phone_e164 IS NULL OR phone_e164 = '+212772627584') AND (country_code IS NULL OR country_code = '+212');
UPDATE public.users SET phone_e164 = '+201091067678', country_code = '+20' WHERE id = 'oCsnjLTM9jYmz4PGXHQvafEHDjI3' AND (phone_e164 IS NULL OR phone_e164 = '+201091067678') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201064687320', country_code = '+20' WHERE id = 'oEb7iQ2qewRG8FVEee0JK3YxHY72' AND (phone_e164 IS NULL OR phone_e164 = '+201064687320') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET country_code = '+20' WHERE id = 'oNgttfditYdVJwvWfFocbOQFqD83' AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET country_code = '+974' WHERE id = 'oWOfAwoRh3PzBWNDq8GTO5YSA1P2' AND (country_code IS NULL OR country_code = '+974');
UPDATE public.users SET phone_e164 = '+201008348537', country_code = '+20' WHERE id = 'oZq7v1suduUY2aArIF582VaCPV52' AND (phone_e164 IS NULL OR phone_e164 = '+201008348537') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201032913974', country_code = '+20' WHERE id = 'oaHtPNzkCkYYhiSXEecy0g9X5NX2' AND (phone_e164 IS NULL OR phone_e164 = '+201032913974') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+212645230675', country_code = '+212' WHERE id = 'nkZIFhL6GVSAD9BXgEk20ig09C22' AND (phone_e164 IS NULL OR phone_e164 = '+212645230675') AND (country_code IS NULL OR country_code = '+212');
UPDATE public.users SET country_code = '+20' WHERE id = 'oc0Shm8XjLTDaFlU7aIr2Dp0lo43' AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201557900714', country_code = '+20' WHERE id = 'ohSJipwIi5YpTIpCD4aK8bLIpOe2' AND (phone_e164 IS NULL OR phone_e164 = '+201557900714') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+212774237249', country_code = '+212' WHERE id = 'ojY3bUP3aNTpCPbzuheIk2OEXPH2' AND (phone_e164 IS NULL OR phone_e164 = '+212774237249') AND (country_code IS NULL OR country_code = '+212');
UPDATE public.users SET phone_e164 = '+2030511350', country_code = '+20' WHERE id = 'opmVXYFpMTPPusJGgwcuxrxkb0T2' AND (phone_e164 IS NULL OR phone_e164 = '+2030511350') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201028080377', country_code = '+20' WHERE id = 'opnPwPee9sMnwbDWKDqI36PxfQv2' AND (phone_e164 IS NULL OR phone_e164 = '+201028080377') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201159444565', country_code = '+20' WHERE id = 'orITh8iCJyNprnkW9r72PnHqVb22' AND (phone_e164 IS NULL OR phone_e164 = '+201159444565') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201044662785', country_code = '+20' WHERE id = 'ordTzfrBdDN7mW87tZg1dxtsVpg1' AND (phone_e164 IS NULL OR phone_e164 = '+201044662785') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201552463795', country_code = '+20' WHERE id = 'ov1WicYglUUfHE9nX4R3HW9nvy93' AND (phone_e164 IS NULL OR phone_e164 = '+201552463795') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201060064925', country_code = '+20' WHERE id = 'p2cVeCIIiqQ9ZiQaYWaPfaDQsBo1' AND (phone_e164 IS NULL OR phone_e164 = '+201060064925') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201028950638', country_code = '+20' WHERE id = 'p5N2nLBpuZWQAYLagjnxKI5Au8E3' AND (phone_e164 IS NULL OR phone_e164 = '+201028950638') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201027035421', country_code = '+20' WHERE id = 'pOWlZOzWOENC3hvwAG9tS7cnCYq1' AND (phone_e164 IS NULL OR phone_e164 = '+201027035421') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET supabase_uid = 'c6163e68-5039-497d-9de5-ef87cc030b37'::uuid, phone_e164 = '+201069220205', country_code = '+20' WHERE id = 'c6163e68-5039-497d-9de5-ef87cc030b37' AND (supabase_uid IS NULL OR supabase_uid = 'c6163e68-5039-497d-9de5-ef87cc030b37'::uuid) AND (phone_e164 IS NULL OR phone_e164 = '+201069220205') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET supabase_uid = '8ed58f01-2aeb-41ec-ab88-f573d3e78edd'::uuid, phone_e164 = '+201091260771', country_code = '+20' WHERE id = '8ed58f01-2aeb-41ec-ab88-f573d3e78edd' AND (supabase_uid IS NULL OR supabase_uid = '8ed58f01-2aeb-41ec-ab88-f573d3e78edd'::uuid) AND (phone_e164 IS NULL OR phone_e164 = '+201091260771') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+201272160686', country_code = '+20' WHERE id = 'phlpKd0c3jS1ZdAy40QDYDoY0Jg1' AND (phone_e164 IS NULL OR phone_e164 = '+201272160686') AND (country_code IS NULL OR country_code = '+20');
UPDATE public.users SET phone_e164 = '+212672936872', country_code = '+212' WHERE id = 'pkQ0in1zz1Tm2Wc7kl3NypvaxqK2' AND (phone_e164 IS NULL OR phone_e164 = '+212672936872') AND (country_code IS NULL OR country_code = '+212');
UPDATE public.users SET phone_e164 = '+201065529068', country_code = '+20' WHERE id = 'pnGPdSZnmnbsxrv2ShBR4RNhLKn2' AND (phone_e164 IS NULL OR phone_e164 = '+201065529068') AND (country_code IS NULL OR country_code = '+20');

-- ------------------------------------------------------------------------------
-- STEP 4: Post-Execution Safety Assertions
-- Verifies delta accounting, untouched accounts, phone validity, and auth match
-- ------------------------------------------------------------------------------
DO $$
DECLARE
  v_users_touched INT;
  v_supabase_uid_changed INT;
  v_phone_e164_changed INT;
  v_country_code_changed INT;
  v_untargeted_modified INT;
  v_invalid_e164_count INT;
  v_phone_collisions INT;
  v_test_phone_count INT;
  v_conflict_phone_count INT;
  v_invalid_auth_count INT;
  v_uid_collisions INT;
BEGIN
  -- 4.1 Verify exact accounting of changed rows based on pre-state delta
  SELECT count(*) INTO v_users_touched
  FROM public.users curr
  JOIN _phase10_pre_state pre ON curr.id = pre.id
  WHERE curr.supabase_uid IS DISTINCT FROM pre.supabase_uid
     OR curr.phone_e164 IS DISTINCT FROM pre.phone_e164
     OR curr.country_code IS DISTINCT FROM pre.country_code;
  IF v_users_touched != 1088 THEN
    RAISE EXCEPTION 'Assertion failed: expected 1088 users touched, got %', v_users_touched;
  END IF;

  SELECT count(*) INTO v_supabase_uid_changed
  FROM public.users curr
  JOIN _phase10_pre_state pre ON curr.id = pre.id
  WHERE curr.supabase_uid IS DISTINCT FROM pre.supabase_uid;
  IF v_supabase_uid_changed != 149 THEN
    RAISE EXCEPTION 'Assertion failed: expected 149 supabase_uid changed, got %', v_supabase_uid_changed;
  END IF;

  SELECT count(*) INTO v_phone_e164_changed
  FROM public.users curr
  JOIN _phase10_pre_state pre ON curr.id = pre.id
  WHERE curr.phone_e164 IS DISTINCT FROM pre.phone_e164;
  IF v_phone_e164_changed != 877 THEN
    RAISE EXCEPTION 'Assertion failed: expected 877 phone_e164 changed, got %', v_phone_e164_changed;
  END IF;

  SELECT count(*) INTO v_country_code_changed
  FROM public.users curr
  JOIN _phase10_pre_state pre ON curr.id = pre.id
  WHERE curr.country_code IS DISTINCT FROM pre.country_code;
  IF v_country_code_changed != 1033 THEN
    RAISE EXCEPTION 'Assertion failed: expected 1033 country_code changed, got %', v_country_code_changed;
  END IF;

  -- 4.2 Verify untargeted users (269 accounts) were NOT touched
  SELECT count(*) INTO v_untargeted_modified
  FROM public.users curr
  JOIN _phase10_pre_state pre ON curr.id = pre.id
  WHERE curr.id IN (
      'qaErpuOEbXd9DZSccTIVx9qtiSZ2',
      'qoub7u60uHVLuCZwAoGjda2Fzkz2',
      'r3ngUV3ie6QOtKmmG7dtKytVyNb2',
      'b782f833-c9f9-4177-b9a7-5c87cee5d0cf',
      'ryz6qxPZwma3pu5qUbvhJlkDztE3',
      's1C4zwiPQ1gLbTisL9MfEKmXMb93',
      's1ZU0wIOLLVb4WJvJIWKZK08R033',
      'd5e6eefb-893c-4b69-8730-a5f1f6655aad',
      'sSOJ195XvAOk9DChjTVwZGgv9xZ2',
      'XTx6sHL0Bta5B6iBMIko79A398k1',
      'tTZhaT0QAUVyddcg7InevNkuRDt2',
      'u9WZa15arwggXSINHzjS0ODYzSJ3',
      'uE7bvBpfTaciPoynGsznyYnUlbp2',
      'uH8qCBl9WYfNKDSBEyx4poxY9dB2',
      'vHD866cv0Vf08y1oEJpOVoCgELk1',
      'test_trainer_01000000003',
      'test_player_01000000004',
      'test_agent_01000000005',
      'test_marketer_01000000006',
      'vbrZnqsNseOBBWyr6JsacpcdxzN2',
      'vl0FGlYgQKfvHnOn6DjqpQ3vJPy1',
      'vlXRVOYLg6OUaZExFJPnjzLZS1q1',
      'd4b849c1-724c-408c-979f-9424a39fc189',
      'vnxBFTg2tyf1dhgdR9KA5AgAux13',
      'vwZzS7CGrMcpmu0pYjB9fdKMLNJ2',
      'w2v7THsfpnZ4yhXOSs5Yl2AueXD2',
      'wAWGoQT7aOQHQAy2eWpTnMYIdSu2',
      'wNW5alr50JNgjFsCtykehz8fihu2',
      'wUiwAboNpDe2oOayvXKKAbRN8SH2',
      'wgbYucFodnQIOQoPwUugMnPdDj32',
      'wyUONW9McwWRjOXI84D8bAQt85p2',
      'xOigdOTNGXMvACA1ql6XrriY5yg1',
      'xOqFL0agzofZMwLCEAqsSEymedv1',
      'xXPyB3la7gghUUB5uYwuO9DDwK12',
      'xcf9iKNCb8YoPgKfvjBxXdt4Rf22',
      'xuFmDltpeAdezlTzCPDfZoVANvJ3',
      'yFHmO11sxaOgG38Qu1QwmezhEQ73',
      '87e66202-e3ec-4c9d-b9c6-d73b8060558c',
      'yGPX4jD4D0M9FmnTMkPoXJWsgro2',
      'yf0b8T8xuuMfP8QAfvS9TLOJjVt2',
      'z0LpdkoowybyLKMVkgRqtec4CNr2',
      'zZWxSR7beOhpZYjhlTRUkE7ynyB3',
      'XjACCvujhmcl2r00K8PlgLmXfXd2',
      '3d5e0b68-5efc-4b71-91af-7ccb86ad3dce',
      't1ev0surGVWVj3b5XOSxB22sycL2',
      'z3aSEQrAT4YJXydi52hSFcuI0hl2',
      '0hHX4qaTDkhCQRyEhFLfFpq62Tu1',
      '0npACMPeIjbrVQQsrRDwBcbEupm1',
      '3NPp3fcwUpZgMwwTkt7xCY6bVrA3',
      'g8juT6ZOThazW0oz2ICXgkGhELJ2',
      '0y0lSfLFtzNvVEB4IvI7Xhle4G53',
      '1Se9v9xNpHP0AQPyaLbA',
      '0A3SR9xok5ZBuYD8tCxsrb3dy8p2',
      '0f0SnXZp1VQDoNtoPlSw9CIYy4k1',
      '12b3EOIr62bjDZaMPZjvgIsVxRD3',
      '23n2S2WzxqUqmcElNk0419bqnLC2',
      'Y11zdWUGvbathSOEC7oq8cXAZ3k1',
      '2Uj9vwRn9jfVsQtrvX4B',
      '2hLPCeQszng4TQrjQlpYZ3PtYmm2',
      'Y5Gn3ZfQDpUz0S395y3UlInjiee2',
      'iZrmLGzCIlfsehZKhRSGcZhjpaF3',
      '1B1xUMuxCPSZQMpLZ8PJoEiPSsO2',
      '1doSzlixr1ZrorGdVlQu3Xj0dMM2',
      '1f2dWITeCTflSTzsPRxatkGGWO73',
      '4BmGgLrpuQeITU6vYt3Sm0Z3x312',
      '4PhRmJVLdncNOcVBvAmUztAxkkm2',
      '4vVi7gKBFYPCRd0Hr9BKq5RDwI03',
      '6vzSxkrG7EcSV1HsYlOxSFxZ6wZ2',
      '7MbA6OPn3DZaDmWvzHcIJvoKbQJ3',
      '7S7KJZLqGkVrbTRXMkMtHdQdNwI3',
      '7X68xFKXGiMowqv8RbfyKEsQMVK2',
      '7be37m8KKmS4MKwAluaBFnUxvUw1',
      '7tWjTbW09FeMaopaaMiTzr4NMMo2',
      '7vWFa4rXA5a8vvPYIlHnbIVhtlJ2',
      '8IwYJDFxw8Pvf1i4tRkOVD66CDm1',
      '8Ob2POqHV8RgXuBfe4XQCLMxRus2',
      '8vPQ9kgnm2O4wDgMwYMpKLtvCso2',
      '9ASkat7O3HesI0q86BMWEUmZ2st1',
      '9PMp4eMZAfWlwvmTJtPbDTMYW2K3',
      '9UuKaSAiRETgcXOVfTD23q1RFIR2',
      '9VaLr3sAVzPm8RxZnVgATiBl3ro1',
      'A9C8GWe0rMemHmYOcCXgzy99Us52',
      'iTKBFkiTvgUpTSaT1eA5qXeS32u1',
      'D863hdt127bDWh7PrithgkkjFvJ2',
      '0GA9TbXVFYSi1aWWlhhgWjO4sVB2',
      '2qEmubLWjtU8yUyHJQtkJX9Fw582',
      '3FOzYIBLxgdrYJJIy5ZsbWRMYGu1',
      'QehA3zrCzhbKIyVm8XUhgxMy3t33',
      '3dOQ70vLVVSdDiEmpcMtgCcGAiO2',
      '3m3lupYYshZQaKziD0OoZN0pe9q1',
      '4cxSk9zhIegPFAU1ICx2sclJbpF3',
      'ENf2lk9L9IYFPqeW2PfPnIGoqmi1',
      '6Gq4BkwlMkegW37Mh7pEaz4viO62',
      '7Ac8rE6IKUY63PcsYJPe4mzqOi62',
      'B1rGTd3k8yg7aOVCJ4znuvUmVRU2',
      'AVBhLGnDreYL0pIhsp8cRUmek1A3',
      'BgvcBwSls9WG97LSHAnMf53CSAx2',
      'EZOZbgJQK6Y0kXh05a2pHi4xjPf2',
      'bmT6W4c1m4RWr90qeaKy28b8Oy73',
      '9zvLr8EVFRdD8RASuWaGFRQjFEx2',
      'BOBEWIhFyMgMXuRxGbvZh0J7ZKy1',
      'D4ou6IVVbNd8R2V0bCsZkgf9W4g1',
      'ed796abc-d44a-4986-9d2b-f2cff5a00e9c',
      'F3nMh0kmnndrmzmaFFW5NZw8UBI2',
      'GYQSHjR5pre20a4iMBy42wByqu83',
      '9Je1Rc8BUjXlB3EsOsOewK3qgRt2',
      'YZY2MRc752O9lmv9fomIVkYMi9M2',
      'GHBBf11bKfP0KdyYQJlmbskEpe93',
      'a7xbWiw02Db2cfBJvtAzFsE1Ok52',
      'EeajpOrhW8MBIToKM8n7KMaRfjq1',
      'AjZm7yasznYN5n7qgL9Z',
      'Ei7gofYLCKc9oPFqmDcqLQhp0VS2',
      'EkiLBOEVIFgt9ylork2wxQCa4tQ2',
      'If0czaDWtFTXSzVVbN5veUjAI8m2',
      'JaeAqnQkFXSy8DGzC7G6MaGUJv33',
      'BqmKMUUYKuM9vbAoO2QjKYXpMVo1',
      'BtwnCzqLlOe4I3kZIsss6umtjbx1',
      'LFlGCQP8fUX4tlr41aicCzRnfRf2',
      'F9UvdjTrtJbPvGf8F1ZzbFSKx6m1',
      'FAi0pLVvsyRSu0Cz0EeHyK4KHKj2',
      'FNu1kcoUJEa4FOujNvYLHOpoMg53',
      'Fh9naqi4M9OBpnXNCsijMxkQkTv2',
      'c185b291-b20b-4d60-8228-0f10f97e9bff',
      'PtgE4q5kRFgLmpgmnY46ZuIO2CQ2',
      'YyT8JUaykbZcr3XD16NdtfMSTha2',
      'QU7WtY4IoKYcXQWIFafOBKOeBYm1',
      'FwMyuqQ61MailLnrn7uQtunUpL73',
      'GcC5qovG3oZ8Awk5YAqWKESh2vs2',
      'Qur0D5eA6oYdbZneU5ijvLmS5F23',
      'REkFXtaVhsTxOjaUad8ODSOqGK72',
      'kJX2S0u9oqb0UduRPd1zrfKXlvJ2',
      'Z9YKrfsQG8XkbWaVO6RKRsyiAjf1',
      'CRCz2cdsfCZi9Aoeb42Ld2PBJrs1',
      'CfWvkJMgnOXV9tTfRBV1qDvYJaQ2',
      'aTHiR77XitZe8IZQm2ulgvFpyye2',
      '2553a278-7316-42d8-a42c-359534dca268',
      'de79b9c3-9984-4699-90cb-fc2c176a46f6',
      'UIWgWvR02tWi6dUQvH5VSyGSNWl2',
      '61d60f90-c881-4ba0-b518-c427dfd051cf',
      '01METNFmZIhS7OtQBt6OVh9Trdl2',
      'G0UZjRKxjzeq6pLsrEgEI9XEaAN2',
      'H4lC3ZphxnZ53M8I6UiDaDUx5uq1',
      'VaJTYdpOwWPhTHKUlqvZvMGSQkv2',
      'HRyJpCYzDdODRrBoekpGXSW9Jx73',
      'HxibD8KGk3X5FK0UCLE9DhcTFTF3',
      'I6IjHup0FfRdyciTyCK1fctwZL43',
      'DjrccM9JILOWefrET9xkMLH42OI3',
      'E4P1SrsL2ban2fd5vwnnRJwmiLo1',
      'IX7VihuM2SVdAQygFOvuUZJVwJA3',
      'J2LU38bwNYShjocTQEMF3hisvrm1',
      'Jkzcp3U15UWgG8GD97oqPZFSvt92',
      'fdc05d9d-5f3e-4868-8f0a-3b7d92d39824',
      'JmEqn9W0G5YFZ6iKvpWuEXcTP8q2',
      'Km5jUaWm7JaCNCjk3HdXzhwoNSB3',
      'KtngER5NNzVJJh3R6WJ1uahtnhI2',
      'jBtXzp78PZOII3Tr3kOus3ONAEr2',
      'LFUXLeTmECgxnTP7G1yTu4YhGvh1',
      'N1qlF0vA0WPRdVDfE41fWVOfFJD3',
      'N3jDMrrEOnaEgeSLaYYTR0entOY2',
      'Ner9km8QY2eqJHKjUX39VPrT6ro1',
      'O8DvLyDWShVTK8Cyt8MIfn64FXv2',
      'OCgBvznTUHc8XQOH4j4q1gv8Cg43',
      'ODW8SGj01nYhx5cdGD3x32Gj3rV2',
      'IOLqqZ1Lvqep1RcPTAAz9px4CJU2',
      'ORKuE6lna7aBw0oCKrJBKDBA1Kg1',
      'OZ1rdcNVSEcTXMZ8QBzST4CXBB02',
      'PMNNcBxD9wetE3IpHupGk4dFSFq1',
      'PP0ygW3xOHVpD36yPedUHRzpuwz2',
      'e95eadf6-c711-4512-9860-f55ab16285ec',
      'C93xRsNgC3aN1FrnYbBU71gEWl13',
      'AoY0T8v1o8SxS3xcfYZdBVo2Gm92',
      'B7liXflx48VFsdhUvZxYQWcR2uE3',
      'Q0B9pEsbtkWyFHh39nizb4XS9042',
      'Q3wZoUTVdxfpnFcdZsWxo34ShI63',
      'Q6DTUiJGEORgN9l3jmbyNAnoHM32',
      'Q6hQQaQ9u5hSgDS6ZSruqVQ1Y5B3',
      'QAMNwgNVVRVqKw5KhXhQayrtX6h1',
      'QTGlDnP4VOPwJy6H3pxruA81J4f1',
      'RLNYo85tIRS3xPiC8q8DLPaKouy1',
      'RLZXK2oL73UZtLLFQmN0G3ZGDBs1',
      'Rh76d5aIBkckFJcymDsrOXjEYRl2',
      'Rqk1g1rpG3VmmG7X1yrwmcuAJET2',
      'GjiRyuVIrTZIdbO8qk76E68nBsY2',
      'h78I2G5Ht1YivLFgmGYtgTXrEBF2',
      '546afaa3-6134-488c-a43b-2ce731300daf',
      'IOhTCai7wYdCsC6751XV8nAif3d2',
      'KyPAdexsUaWnVoFzCZ0wtXRmV3G3',
      'QalmDk7gXDQg6a8emh8Zx4nWrS12',
      'QgypAFJcRhg31F5OAsdvZwJnF4n2',
      'QiaDJ3PLgUa9DCrcZd0M8Z4S0Dy2',
      'QlnzzFM5D3Nit9sOVwxPwhdHSpb2',
      'TbgFJCLz4ud6Y0n6TGrTZMr3Fmu1',
      'Tdklnn7D2Wf6We74unvguenG0P12',
      '5a6c6926-b7ef-48dd-8d5e-0dddb75ee0f3',
      'hETXR6J0xmQM6u0CiTbcUpnKr8Z2',
      'UdrK6FgBkif7AcOvIhFUamEl3C42',
      'WlTzUIGmmVhvzWLikagNpZrtmuC3',
      'Wzlk6NKY4eeUAW8bNuekTH6PKhr2',
      'LrJxvfxEVlgutkXglAt5IV3LhSH2',
      'LrZ96RteFrOB9YHtj3Dw1VY1COi2',
      'M0bXmeytW5SqD023oxU8jcz95QC2',
      'MAxWRZhFj3cmh6laoUo28PsacUo1',
      'PbHxMJIghyUsZLZaomWpHqd40Rf2',
      'XBFHyupdxsaSIbD5OTs1D2fBXAW2',
      'XeiioYl6l3RXRiUqJyPi7jjrmz32',
      'Y9Jpw2MGHpdu0fk3AGpo3lxCl9m1',
      'YXYvy1LYBwbgpabpfhcWojAEAMG2',
      'Ylhb5jCuosOrz2TG7sQ9LlIh2Sj2',
      'YozN7KZgl4gRPmPnfk8zT5TAAFp1',
      'YrXFKuFMD8XT4yWQ81byaSG9pc73',
      'kzL1To36eUUtbEGCBMAFu0OKvIs1',
      'cb565d72-5cfe-4437-a81c-3ace55aa37ae',
      'Y5sohks9g0dTxyKmF02X8TwfyLY2',
      'bMu9qPx7m3VhhqxBpeCU2lyvKR13',
      'bq2zhEkxaAgX1z4ozrC8eGsBoWk2',
      'c1X0Y332qGfX1EFEQyBNuoyhVsd2',
      'c4JUuZLgZWcTS9ciA3Z6BK5Wsir1',
      'cUd2uWgveCXu6ZHGpGjLO3Nw9im2',
      'cWThxvOR6QeLsd2Gno7EL8cfTsN2',
      'cmR1Jj2k3ZO4fSU5mMU87X34mrc2',
      'cvFk5HLHLheo4crw3hEvEqMmA7Q2',
      'Tp9EA5ZZEvcyYLKR7UPAeQo5ElA2',
      'cQy3dS25sDXuIbfa8luHF9XSJLj1',
      'dz2iSvbk50P8oYwzreFJ37v97182',
      '0f57f8a9-8e18-48f9-8132-5f12e1c96f3c',
      'cn69wUxfwkhx2Ubmgz0ng2tnw3A2',
      'efk8zj4yHfd8mde85fCOuW0kBr72',
      'dWKNzUpvhwRSzbB7CImaylqN52z1',
      'VOHOyXCaMOd6ZRRmOQHJbELD4Ew1',
      'aXcLL3eJulaRbtGa4WnTFnD192i1',
      'ZoeubJdgzAFSVhpcPY72',
      'hWAd3JRCJnXAowZKJ5W9qSJlA7i1',
      'hrtBIIoxLgayggJwectGK9O8BNP2',
      'hzzMcIK48iYhklXx6dFtz93QQw93',
      'i8W9XjmDgSMyncM8nEjMPa97Wrt1',
      'iECspbD3owOAGNzggi5BXPQ8eUB2',
      'iU2Eykf5YcNhdly0sIOheOxfQR32',
      'cGYnwT4ETCQfUvxHjRJDbUmpfbz1',
      '2ae878e8-13b5-469e-9733-6ca4bd3fd4e1',
      'd4c00ab4-0915-44d4-ad4e-fc8f0496a610',
      'ej356ozUzGalpVXbuZD2nujeVvf1',
      'fFe35ICntkYI85Bv9Is87zmbZgE3',
      'htEsRFGRWnMZz3FmecYJ0uKHQpl1',
      'irZOiBwfXnM5cDMvSh7W8O0cbpb2',
      'j0IbrKaVnlf9qh5ay0utumS9K5i1',
      'nqSL42juKobTiGIRnMGetptMvRu2',
      '54c9eb87-c860-4e97-b24d-2e174ed83426',
      'pbn1EvUNvfeFaQymSBIAmmZ5sK82',
      'q8acWP0TjQbavMLgiIHVMOAUxTB3',
      'iuvzZODK2tWWOk0duN4afs3Fh4X2',
      'iyP92WP1I7h2lC0qX1GSl0JHfBc2',
      'j9xFeN1M7yMG46AIRuMf1sy8q1i2',
      'juargkF9ekMgd19TQlDZURU4ipl2',
      'jxECQWp1G0OHZe5sd7pcsv3EDLX2',
      'kDcjrn78OqRVWcQSMH02acxRicx1',
      'kiQktw04FaZwoQQ8JT1WEZ7QcIP2',
      'kivfwPEOdoXsWXugzUCcKIKvBBB2',
      'kky7L4s4QHfIdw30CXAaW6hmgFy2',
      'lARADAS91uaTu3ZwSkPwoCodZqg2',
      'lF4rNIbq1ChuLroPimEg7Z1lO4J3',
      'mCp3B5xQG9PQ12TxdBb0GXte79p1',
      'mUxlPynOagMHlbUb2RbCGA7EN8u2',
      'mclKJEuV2OaZJGilxSjooi1hRA43',
      'ml99m6hRCYe2F9By1G7uDTBk8cn1',
      'nLDeaSbXAnU14LYME2t977G8SO23',
      'nw07cFw3ojVtny9XDthrXFolGli2',
      'p1KkofykQwTdAfmkz0LC4reXPHv1',
      'test_club_01000000001',
      'test_academy_01000000002'
  ) AND (
    curr.supabase_uid IS DISTINCT FROM pre.supabase_uid
    OR curr.phone_e164 IS DISTINCT FROM pre.phone_e164
    OR curr.country_code IS DISTINCT FROM pre.country_code
  );
  IF v_untargeted_modified > 0 THEN
    RAISE EXCEPTION 'Assertion failed: % untargeted accounts were modified', v_untargeted_modified;
  END IF;

  -- 4.3 Critical phone validation (E.164 syntax, zero collisions, zero test/conflict phones)
  SELECT count(*) INTO v_invalid_e164_count
  FROM public.users
  WHERE phone_e164 IS NOT NULL
    AND phone_e164 !~ '^\+[1-9][0-9]{6,14}$';
  IF v_invalid_e164_count > 0 THEN
    RAISE EXCEPTION 'Assertion failed: % phone numbers violate E.164 regex', v_invalid_e164_count;
  END IF;

  SELECT count(*) INTO v_phone_collisions FROM (
    SELECT phone_e164 FROM public.users WHERE phone_e164 IS NOT NULL GROUP BY phone_e164 HAVING count(*) > 1
  ) t;
  IF v_phone_collisions > 0 THEN
    RAISE EXCEPTION 'Assertion failed: % phone collisions detected in phone_e164', v_phone_collisions;
  END IF;

  -- Assert zero phones assigned to known test accounts (22 accounts)
  SELECT count(*) INTO v_test_phone_count
  FROM public.users
  WHERE id IN (
      'r3ngUV3ie6QOtKmmG7dtKytVyNb2',
      'sSOJ195XvAOk9DChjTVwZGgv9xZ2',
      'test_trainer_01000000003',
      'test_player_01000000004',
      'test_agent_01000000005',
      'test_marketer_01000000006',
      't1ev0surGVWVj3b5XOSxB22sycL2',
      '2qEmubLWjtU8yUyHJQtkJX9Fw582',
      'BgvcBwSls9WG97LSHAnMf53CSAx2',
      'F3nMh0kmnndrmzmaFFW5NZw8UBI2',
      'Ei7gofYLCKc9oPFqmDcqLQhp0VS2',
      'QU7WtY4IoKYcXQWIFafOBKOeBYm1',
      '01METNFmZIhS7OtQBt6OVh9Trdl2',
      'HxibD8KGk3X5FK0UCLE9DhcTFTF3',
      'E4P1SrsL2ban2fd5vwnnRJwmiLo1',
      'Jkzcp3U15UWgG8GD97oqPZFSvt92',
      'IOLqqZ1Lvqep1RcPTAAz9px4CJU2',
      'hWAd3JRCJnXAowZKJ5W9qSJlA7i1',
      'kiQktw04FaZwoQQ8JT1WEZ7QcIP2',
      'ml99m6hRCYe2F9By1G7uDTBk8cn1',
      'test_club_01000000001',
      'test_academy_01000000002'
  ) AND phone_e164 IS NOT NULL;
  IF v_test_phone_count > 0 THEN
    RAISE EXCEPTION 'Assertion failed: % test accounts received phone_e164', v_test_phone_count;
  END IF;

  -- Assert zero phones assigned to blocked conflict / duplicate accounts
  SELECT count(*) INTO v_conflict_phone_count
  FROM public.users
  WHERE id IN (
      'qWQfgalM1vgLtbyjHvew6aVv3tH2',
      'qyADQuQ3tgP0eyda5u3RHirHkv63',
      'reFtNURHmiPaDYyZAPSmfnhXAGy2',
      's4q1ZTQVnOe9G1aYDzfEvRPdsca2',
      'd5e6eefb-893c-4b69-8730-a5f1f6655aad',
      'sLcn3XLCXeSrnIBdkli7mtBrWIz1',
      'shYb04DJmmf3NhIo76TXMb9uBY92',
      'tCCbN4nV7uTiggPjOlFqiH9bPG82',
      'tE3KltHYnHeANkWIN83O2Au2gIX2',
      'XTx6sHL0Bta5B6iBMIko79A398k1',
      'Xc6RCiKlPmhWOHo0JhIZQMnNlW03',
      'tTZhaT0QAUVyddcg7InevNkuRDt2',
      '59A2iG6JxFaSSyzG1cbCS2tLhdq1',
      'ttSoUdgH5yPfPVroOHwk76rGCS42',
      'uBLEHyUSydTDjbVWBX3tVCy91Xr1',
      'uE7bvBpfTaciPoynGsznyYnUlbp2',
      'uH8qCBl9WYfNKDSBEyx4poxY9dB2',
      'uTNhyvCp9QWcVLZax7wXwTQjSyu2',
      'uWtwwXwtkBg4iGS7J0veMVQINjp1',
      'uc3GjRdisuOeV6vVu3oYiQo1G6F2',
      'v8pzhcAepKWTK6LRgxRzEzR0uuC2',
      'vA4uRGSveogXqck2fxztaoV655f1',
      'vH1KNF7jMLTPUPnq3ZRZlPVGERn2',
      'vHD866cv0Vf08y1oEJpOVoCgELk1',
      'iF6xsgnrNSQshXw5NNgQsQbH1702',
      'v7lDpI2O42VXz3G1aUtqCiwMKcR2',
      'vbrZnqsNseOBBWyr6JsacpcdxzN2',
      'd4b849c1-724c-408c-979f-9424a39fc189',
      'vnxBFTg2tyf1dhgdR9KA5AgAux13',
      'w2v7THsfpnZ4yhXOSs5Yl2AueXD2',
      'wgbYucFodnQIOQoPwUugMnPdDj32',
      'wkSx85N4ldTMKJoU8N6vWJQeBRf1',
      'wt1B6bvApTXwKvWfS8Gfv5UVGwS2',
      'wyUONW9McwWRjOXI84D8bAQt85p2',
      'xEFxm9Gq9hVeM5olcYF392sxSak1',
      'xOqFL0agzofZMwLCEAqsSEymedv1',
      'xXPyB3la7gghUUB5uYwuO9DDwK12',
      'xcf9iKNCb8YoPgKfvjBxXdt4Rf22',
      'xk3GbcbPdwQt6lRWnZPxz8adalt2',
      '87e66202-e3ec-4c9d-b9c6-d73b8060558c',
      'ycQorhkWvihfFBbzVS13e9v6Yiu1',
      'yf0b8T8xuuMfP8QAfvS9TLOJjVt2',
      'ywaTW5LUpaSgXHlZIVwPr9pWaJf1',
      'z7jaTV1cQVYOPRVqgrGnauretdu1',
      'zjM7KGcO2COjItD4qMTdJBZaEl13',
      '3d5e0b68-5efc-4b71-91af-7ccb86ad3dce',
      'z3aSEQrAT4YJXydi52hSFcuI0hl2',
      '0hHX4qaTDkhCQRyEhFLfFpq62Tu1',
      '3NPp3fcwUpZgMwwTkt7xCY6bVrA3',
      '0FuH5wD6PfTtGe4uXhkxcYFfaai1',
      'g8juT6ZOThazW0oz2ICXgkGhELJ2',
      '1Se9v9xNpHP0AQPyaLbA',
      '0f0SnXZp1VQDoNtoPlSw9CIYy4k1',
      '12b3EOIr62bjDZaMPZjvgIsVxRD3',
      '2Uj9vwRn9jfVsQtrvX4B',
      '2hLPCeQszng4TQrjQlpYZ3PtYmm2',
      'd24afe5c-44da-4f81-827d-fdb041fdae7b',
      '2kF8GwleA2dzKscpoRkXiYxZz152',
      '39sRiq3QzDW4ckbjSIrml68Xdjp2',
      '3GCLlQmT4QOz5dI4ZaBpXytePLi2',
      '1f2dWITeCTflSTzsPRxatkGGWO73',
      'ebf7e4c8-f2be-4912-892f-a179c44f86fd',
      '4C8ZqVArXcgoiH60OQT0Z7Zlk6B2',
      '4LxEgHEP8YPcQHUBehYYvizZfDt2',
      '4PhRmJVLdncNOcVBvAmUztAxkkm2',
      '4QR7STGslnQqy07SDHcqU4vnCq33',
      '4vVi7gKBFYPCRd0Hr9BKq5RDwI03',
      '6l0OBQ5nTDRbJftPBPsn6KGWA0n1',
      '6oGrtBeqJTgZJdEmBQhgYaxrlgD3',
      '75v5joY3rZfeFBtwVji8ZyB4QF32',
      '7be37m8KKmS4MKwAluaBFnUxvUw1',
      '7ocmQYCs1TQjtclOJ4NBmyCGQGl1',
      '7vWFa4rXA5a8vvPYIlHnbIVhtlJ2',
      '8IwYJDFxw8Pvf1i4tRkOVD66CDm1',
      '8P9CbolRFsNUX2KPLaogkemuN1p2',
      '9389n0BjJjbMt9eQhalStgBdLKr1',
      '95FCF33YyGP8clwXc0bEE5Hf5ua2',
      '9PMp4eMZAfWlwvmTJtPbDTMYW2K3',
      '9SiTv8Gi8wVi0b0JrzMdsUUv07t2',
      'A9C8GWe0rMemHmYOcCXgzy99Us52',
      'iTKBFkiTvgUpTSaT1eA5qXeS32u1',
      'AG5bgnYTPRRYNJSpWzHH0cM8vYq1',
      'Cw2H83AdnlOqeUNscPgxwajJtHq1',
      'D863hdt127bDWh7PrithgkkjFvJ2',
      'DUmbOIT7qsYNxL02QdYK4oPGobq1',
      'Dl4n7PSvk5PCGEAYax1PozH2xwW2',
      '0GA9TbXVFYSi1aWWlhhgWjO4sVB2',
      'YKHfs5sL0tfjZMel5bE45CwH5vd2',
      '1qzXo6pOaCRwMy0vD4a0wrXXs1F3',
      '2lrEBTkDOoTRpDzrlzqtaa9fvL03',
      '3dOQ70vLVVSdDiEmpcMtgCcGAiO2',
      'EXfqUPMrhAgzzm245e5rFzLIbSw2',
      '6Gq4BkwlMkegW37Mh7pEaz4viO62',
      '575YGbCQyZavgQeN92Rke68hypo2',
      'bff2215f-4b7d-4708-b160-8f45e75493ab',
      '9ldATcSXuPSormBMjtC7cIzDn5S2',
      'bd9c3094-0665-4dd8-ba70-c5e99f1e7772',
      'BOBEWIhFyMgMXuRxGbvZh0J7ZKy1',
      'BSgBYEV28DTigLYzPUQ9TRLKmrZ2',
      'DAmzLbIdIDdgBFkpEPvQntVhQCC3',
      'D4ou6IVVbNd8R2V0bCsZkgf9W4g1',
      'ed796abc-d44a-4986-9d2b-f2cff5a00e9c',
      'GYQSHjR5pre20a4iMBy42wByqu83',
      'G0jJVt23N5WcuZwPiclLZFxE7Ny1',
      'a7xbWiw02Db2cfBJvtAzFsE1Ok52',
      'EeajpOrhW8MBIToKM8n7KMaRfjq1',
      'AjZm7yasznYN5n7qgL9Z',
      'EkiLBOEVIFgt9ylork2wxQCa4tQ2',
      'If0czaDWtFTXSzVVbN5veUjAI8m2',
      'BqmKMUUYKuM9vbAoO2QjKYXpMVo1',
      'MQjLp8F8Htduxw44TNZomfo1oXO2',
      'gzPgIjjWwaQESEv0NdbYru8BGlz1',
      'LFlGCQP8fUX4tlr41aicCzRnfRf2',
      'F9UvdjTrtJbPvGf8F1ZzbFSKx6m1',
      'FNu1kcoUJEa4FOujNvYLHOpoMg53',
      'FfX9wD3YhpXvoBTn7kBbNn0gIow1',
      'Fh9naqi4M9OBpnXNCsijMxkQkTv2',
      'FhNmAqluG7P7WTwlyRqnTnf0qf23',
      'c185b291-b20b-4d60-8228-0f10f97e9bff',
      'YyT8JUaykbZcr3XD16NdtfMSTha2',
      'FwMyuqQ61MailLnrn7uQtunUpL73',
      'GcC5qovG3oZ8Awk5YAqWKESh2vs2',
      'sHPy0L0k21QnPzRdUIKbKE5crnh1',
      'CfWvkJMgnOXV9tTfRBV1qDvYJaQ2',
      'STbQGj6NZmSaC2BEFujJmDNhwdr2',
      '2553a278-7316-42d8-a42c-359534dca268',
      'de79b9c3-9984-4699-90cb-fc2c176a46f6',
      'U3wAb0XAnOc076bQRYTSuS4qynF2',
      '61d60f90-c881-4ba0-b518-c427dfd051cf',
      'VGpdSJ6w6nO27kbF9tfzSqXFwm93',
      'VLgqXm1tyITI3JMrfpJoEC1IAIM2',
      'HPJaSUeMxpYPhNmHGnCTlBjnwdH3',
      'HRSXGWiFrheWOBTWn7QS17Qqj2D2',
      'HRyJpCYzDdODRrBoekpGXSW9Jx73',
      'HTMembYmTsS4enT58DlGFNu6X8B2',
      'IAueTamMAydLDD875IL3ixyG50w1',
      'ISXPhEDZKnaZpMDNq38JYlb5k593',
      'IT83aO1vtsPMb8ClCW6uNR6wLj73',
      'IX34KOCXrccUHSaj7JGOgMO7nzA2',
      'IX7VihuM2SVdAQygFOvuUZJVwJA3',
      'J0MbCZ4LENSI3Ej0waTBVTizAgm2',
      'JJ8MJBUvdRhTz7XZeQU3qBdjSbG2',
      'JR0m7RpSDfUTHp5C6umqJe3Pwpz2',
      'fdc05d9d-5f3e-4868-8f0a-3b7d92d39824',
      'JsErzrhUtpRmYbwCcO6BHRYtPDf2',
      'K3KO6eTf64fuJnOtIf2cDOxzrs83',
      'KZmKBAzGDAVMqgGSkrIgy7UbaXJ2',
      'Kn3NlMQA0iT5TEIsr9DNvcCnJ1j2',
      'KtngER5NNzVJJh3R6WJ1uahtnhI2',
      'L0q5pWIWNoeQTNAHTofFVBZR4Is2',
      'jBtXzp78PZOII3Tr3kOus3ONAEr2',
      '5GkuT3BavpYJTUqAqywKmyVIo4A2',
      '5GPkOLHk0KhgzDPr3NrSR9yNfVl1',
      '5MXk1L5ccyXWPZsRxCjX7THZLox2',
      'LFUXLeTmECgxnTP7G1yTu4YhGvh1',
      'LGBFQZrBUzLxEmh77aLQRtv7KRw2',
      'N1qlF0vA0WPRdVDfE41fWVOfFJD3',
      'N1tkT6Wln1QpadFxt6mWNjA5aTp1',
      'Ner9km8QY2eqJHKjUX39VPrT6ro1',
      'O8wZXjwHSRP5nlM4oIFb5Wur4Mk2',
      'PAzrupsysETgIInrMHaqT3fsM5B3',
      'PGAdTYh8xpSF81fj8yxxG7cnDWD2',
      'PMNNcBxD9wetE3IpHupGk4dFSFq1',
      'POpgZJSJJXVqPNND56lleyZpGix2',
      'e95eadf6-c711-4512-9860-f55ab16285ec',
      'CMFsf6cBpscpEFjGsTPRPmeQcwY2',
      'PY5Nr0L7qZQJoceL8D2SgeD9mcv2',
      'LD6sBBbrtyVnOG4ErNyh3wsgCOl1',
      'LVhtnyer9OMJDclXQRQSmbM5eiC2',
      'Q0B9pEsbtkWyFHh39nizb4XS9042',
      'Q2yKTAqbmeYxIeFqZmlljL1NJsS2',
      'QAMNwgNVVRVqKw5KhXhQayrtX6h1',
      'QCLzhQx5aQTDu9ykz4B935YXOqS2',
      'QIx4Z7U3AEPBXG0eRtVyL24qkgy2',
      'QNDqSUN8cHX7VGVZw8BZ5qKXJZ53',
      'QTGlDnP4VOPwJy6H3pxruA81J4f1',
      'RF46N9BxiQRLVKB5s36LMzdWKYn2',
      'RWM6ipzXWCTlWKhVPuafwVLsEPf1',
      'Rh76d5aIBkckFJcymDsrOXjEYRl2',
      'Rqk1g1rpG3VmmG7X1yrwmcuAJET2',
      'SvwVqAYieDhjyFhEhewDBtHHV4p1',
      'SxgIwuaZYTSqePs5uEAk8UO1ek72',
      'T2YwllYRmiWOTHycjW6tdUzjGuD3',
      '546afaa3-6134-488c-a43b-2ce731300daf',
      'IOhTCai7wYdCsC6751XV8nAif3d2',
      'QgypAFJcRhg31F5OAsdvZwJnF4n2',
      'QiBSJ8dBCJgIV78wjnHWBJMam9c2',
      'QlnzzFM5D3Nit9sOVwxPwhdHSpb2',
      'T5MlUstpczLESKbFxO5f9MD7UDJ3',
      'TsGr4WoVi6aJEcjgtCx2dPUwRj23',
      'U2rwlxjXOjOhaoRdQU97HmvsOAB3',
      'U8uCBLvcK6Udx0fwEQIF4OyZJYZ2',
      'UDCxylXetKdJyM3W2ZiroNuUsxq2',
      'ULjImhjbSSf9luZHcHYPCmI0HMA3',
      '5a6c6926-b7ef-48dd-8d5e-0dddb75ee0f3',
      'hETXR6J0xmQM6u0CiTbcUpnKr8Z2',
      'VedaUMH83eONWlwyl6CAieECbWy2',
      'VgsqNRUq1nVJeare4NLBy2eCdsK2',
      'WeO0yGDoNtaMhHk2RzkkOLqclXF2',
      'WoNvMiVmELMr7rYSgH2VJEazPwx1',
      'Wp27ygxiyGO6q7vhcc1S1W743ra2',
      'WumU6iY5g7eRMMNlMBvnwiJBoYZ2',
      'Wx31fahOrVNDAqVkzJiC985nRqM2',
      'Lj3AAdjTecQOhi64EMjdBPOR97B2',
      'LrJxvfxEVlgutkXglAt5IV3LhSH2',
      'LrZ96RteFrOB9YHtj3Dw1VY1COi2',
      'M0bXmeytW5SqD023oxU8jcz95QC2',
      'X4WTZrz5HRbbdMJGPkm0Ae524fI3',
      'XBFHyupdxsaSIbD5OTs1D2fBXAW2',
      'XeiioYl6l3RXRiUqJyPi7jjrmz32',
      'Vq69WqMpMLY88RbJdeDkGIV0HvI2',
      'jQprN3XSQ0T22vOtriGPiKHWQ3O2',
      'Y9Jpw2MGHpdu0fk3AGpo3lxCl9m1',
      'YUezyttc4WPUTiq1wHgbwMsGnB82',
      'YXYvy1LYBwbgpabpfhcWojAEAMG2',
      'YrXFKuFMD8XT4yWQ81byaSG9pc73',
      'ZINDYoIpWOX4LxwuCQP3CSd1F2l2',
      'cb565d72-5cfe-4437-a81c-3ace55aa37ae',
      'ZvsXEQJbJSZzdR5gIESuvtcWAvu1',
      'aGU9fWjVkQOmIYoj4hDpzvHv6M42',
      'accPwFz6FpVa7TwMuYfK18bOzpG3',
      'aygnJ71o5tTBXgtmLCCYKVw2zg82',
      'R2ZaN8OF0mTFg1Dd9Rct4UeK5vt2',
      'RDI3Z291phd0MJitZX8ydeYGp3E3',
      'ZMQsR8ZVmhMkNIuL6ZlSnLvnDyr2',
      'bMu9qPx7m3VhhqxBpeCU2lyvKR13',
      'ZxDD9qvjolYbpcpoXcP2FDetHL43',
      'bonFn23XS0eZ1Yf9Jt3pC272tiB3',
      '6fe0c2c1-f839-4ad2-be2a-a95fcbeaed6b',
      'c1X0Y332qGfX1EFEQyBNuoyhVsd2',
      'cUd2uWgveCXu6ZHGpGjLO3Nw9im2',
      'bu4zB0Ec1bVddI3x800xxPzQXSl1',
      'cWThxvOR6QeLsd2Gno7EL8cfTsN2',
      'cboFvgjr8dU7RbcvHgfc3h7Eexo1',
      'cmR1Jj2k3ZO4fSU5mMU87X34mrc2',
      'cvFk5HLHLheo4crw3hEvEqMmA7Q2',
      'cQy3dS25sDXuIbfa8luHF9XSJLj1',
      'dMDSgrqY2KTtQ5gfHUaYSgFQEmv2',
      'dRYELrC4msfBSb8IVRcmhENq0UN2',
      '0f57f8a9-8e18-48f9-8132-5f12e1c96f3c',
      'efk8zj4yHfd8mde85fCOuW0kBr72',
      'g0HWnFzeCVVTko50yIfHN51vopv2',
      '63327e3c-491b-4836-831f-4d46fafd3f8f',
      'VNjIYvmeXEdE8Wa9R0qtiZtQ0vD2',
      'VOHOyXCaMOd6ZRRmOQHJbELD4Ew1',
      '64d02c3e-a928-43be-a0fa-57f7e4ffae4e',
      'aXcLL3eJulaRbtGa4WnTFnD192i1',
      'YMIT1W1wxTX2oe7kWRAcqI7UPrE2',
      'ZMMGQoZF8PREKSEh4LFYeVnJZq92',
      'ZoeubJdgzAFSVhpcPY72',
      'hrtBIIoxLgayggJwectGK9O8BNP2',
      'iECspbD3owOAGNzggi5BXPQ8eUB2',
      'ZytoZphDMsaYUe1amP9sIoRSYuW2',
      '2ae878e8-13b5-469e-9733-6ca4bd3fd4e1',
      'd4c00ab4-0915-44d4-ad4e-fc8f0496a610',
      'dhwK15grDSavcxfQW7k7jfMnH7z1',
      'ej356ozUzGalpVXbuZD2nujeVvf1',
      'fFe35ICntkYI85Bv9Is87zmbZgE3',
      'fYeGA8gL5ifUmOAmDa8glPnV25h1',
      'irZOiBwfXnM5cDMvSh7W8O0cbpb2',
      'is6JRqYXTeepkMKAV1tWE057SrB3',
      'neEfb9khgDNT0EmA9zfmuakaLTi2',
      'hk1WcoGFc2bKDofWl7kOCeKilI53',
      'neqG4GAs7fWFSPew5xNBllh8wNC2',
      '54c9eb87-c860-4e97-b24d-2e174ed83426',
      'qTU43iobqSQY5CthgWQIYiUOqMn2',
      'iuvzZODK2tWWOk0duN4afs3Fh4X2',
      'j9xFeN1M7yMG46AIRuMf1sy8q1i2',
      'k0Grzn7im4g1zKSQKsGohsyVlLQ2',
      'kC5qOqWk8fQzbbmXjwbc0s5bdl33',
      'kDcjrn78OqRVWcQSMH02acxRicx1',
      'kR0O15keETgjGOc7bv8bmfTWHRi2',
      'kky7L4s4QHfIdw30CXAaW6hmgFy2',
      'llJ632EVTWgge0tkJasf8Nk9MW83',
      'mCp3B5xQG9PQ12TxdBb0GXte79p1',
      'mvzPYdyrvVMez9LULFi2t7BB1NJ3',
      'n4eIk2y6OIdIzOnwA97YMOiKHmh2',
      'nw07cFw3ojVtny9XDthrXFolGli2',
      'oNgttfditYdVJwvWfFocbOQFqD83',
      'oWOfAwoRh3PzBWNDq8GTO5YSA1P2',
      'oc0Shm8XjLTDaFlU7aIr2Dp0lo43',
      'p1KkofykQwTdAfmkz0LC4reXPHv1'
  ) AND phone_e164 IS NOT NULL;
  IF v_conflict_phone_count > 0 THEN
    RAISE EXCEPTION 'Assertion failed: % blocked conflict/duplicate accounts received phone_e164', v_conflict_phone_count;
  END IF;

  -- 4.4 Critical supabase_uid validation (auth.users match and zero duplicates)
  SELECT count(*) INTO v_invalid_auth_count
  FROM public.users u
  WHERE u.supabase_uid IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM auth.users a
      WHERE a.id = u.supabase_uid
        AND a.id::text = u.uid
    );
  IF v_invalid_auth_count > 0 THEN
    RAISE EXCEPTION 'Assertion failed: % supabase_uid values do not match auth.users.id / users.uid', v_invalid_auth_count;
  END IF;

  SELECT count(*) INTO v_uid_collisions FROM (
    SELECT supabase_uid FROM public.users WHERE supabase_uid IS NOT NULL GROUP BY supabase_uid HAVING count(*) > 1
  ) t;
  IF v_uid_collisions > 0 THEN
    RAISE EXCEPTION 'Assertion failed: % duplicate supabase_uid values detected', v_uid_collisions;
  END IF;

  RAISE NOTICE 'All Post-Execution Safety Assertions PASSED successfully.';
  RAISE NOTICE 'Delta summary: % users touched, % supabase_uid changed, % phone_e164 changed, % country_code changed.', v_users_touched, v_supabase_uid_changed, v_phone_e164_changed, v_country_code_changed;
END $$;

COMMIT;
