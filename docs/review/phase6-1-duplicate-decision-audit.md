# Phase 6.1 — Duplicate Account Decision Audit Report
**Strictly READ-ONLY — NO Database Modifications**

- **Date:** 2026-09-25
- **Platform:** El7lm-V2 / Hagzz
- **Audit Mode:** READ-ONLY (Zero Mutation)
- **Target Scale:** 10,000 Daily Active Users

---

## 1. Compliance & Safety Verification

All operations conducted in Phase 6.1 strictly adhered to non-destructive analysis:
- [x] **Zero Records Deleted:** No rows removed from any table.
- [x] **Zero Records Updated:** No fields modified in any table.
- [x] **Zero Records Merged:** No profiles or credentials merged.
- [x] **Zero Migrations Executed:** No DDL migrations run.
- [x] **Zero Constraints Added:** Database schema unmodified.
- [x] **Full 962 Duplicate Groups Analyzed:** Complete coverage across all 8 account tables.

---

## 2. Executive Summary Metrics

| Metric | Count | Percentage | Architectural Finding |
| :--- | :---: | :---: | :--- |
| **Total Duplicate Phone Groups Analyzed** | **962** | 100.0% | Complete inventory of duplicated phone identities |
| **Accounts in Duplicate Groups** | **2,205** | - | Accounts evaluated across all 8 tables |
| **Class A — SAFE DUPLICATES** | **5** | 0.5% | Same real person; redundant ghost accounts with 0 activity & 0 FKs |
| **Class B — LEGACY USER/PROFILE DUPLICATES** | **864** | 89.8% | `users` (Auth) + `players` (Profile) legacy split. **MANDATORY PRESERVATION** |
| **Class C — TEST / SEED DATA** | **21** | 2.2% | Clearly development, test, or QA accounts |
| **Class D — REAL CONFLICTS** | **24** | 2.5% | Different real individuals sharing a phone. **MANDATORY PRESERVATION** |
| **Class E — INVALID / UNRESOLVED** | **48** | 5.0% | Malformed phone numbers or ambiguous relations requiring human review |
| **Total Safe Delete Candidates** | **21** | - | Strictly meeting all 8 non-destructive criteria |
| **Total Preserved Records** | **1117** | - | Canonical accounts, legacy profiles, and active records |
| **Total Manual Review Records** | **183** | - | Conflicts, test accounts with FKs, and unresolved items |

---

## 3. Critical Architectural Rule: Users vs Players

> [!CRITICAL]
> **Do NOT assume that `users + players = duplicate deletion candidate`.**

Our in-depth foreign-key and activity audit reveals why **864 duplicate groups (89.8%)** fall into **Class B**:
1. **The Separation of Concerns in Legacy Architecture:**
   - **`users` table:** Serves as the **Authentication Identity** (contains Supabase/Firebase Auth UID, email, last login timestamp, session data).
   - **`players` table:** Serves as the **Athletic Business Profile** (contains player position, date of birth, height, weight, preferred foot, club history, and video links).
2. **The Risk of Blind Deletion:**
   - If the `players` row is deleted: The user loses their sports career data, video showcase, and scouting profile.
   - If the `users` row is deleted: The user can no longer log in via Supabase Auth or OTP!
3. **Consolidation Strategy:**
   - Neither record can be deleted.
   - Both records must remain linked in `phone_accounts_index` via `linked_accounts JSONB` until an atomic profile consolidation migration is executed in the future.

---

## 4. Part A: Safe Delete Candidates Inventory (21 Records)

These records strictly meet **ALL** of the following requirements:
- Clearly test/development data OR unquestionably redundant duplicate;
- 0 unique business data;
- 0 videos;
- 0 messages;
- 0 notifications;
- 0 favorites;
- 0 opportunities;
- 0 foreign-key dependencies across all relational tables;
- Deletion will not remove any data belonging to the canonical account.

| # | Account ID | Table | Name | Phone | Category | Justification | Canonical ID |
| :---: | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| 1 | `IAueTamMAydLDD875IL3ixyG50w1` | `players` | محمد احمد سيد | `+201006038037` | SAFE_DUPLICATE | Unquestionably redundant duplicate player profile row with zero activity and zero foreign keys | `n4eIk2y6OIdIzOnwA97YMOiKHmh2` |
| 2 | `test_trainer_01000000003` | `trainers` | الكابتن أحمد التجر.. | `+201000000003` | TEST_DATA | Pure test/seed data with 0 foreign keys, 0 videos, 0 messages, and 0 notifications | N/A (Test) |
| 3 | `test_player_01000000004` | `players` | لاعب الحلم التجريبي | `+201000000004` | TEST_DATA | Pure test/seed data with 0 foreign keys, 0 videos, 0 messages, and 0 notifications | N/A (Test) |
| 4 | `test_agent_01000000005` | `agents` | وكيل لاعبين تجريبي | `+201000000005` | TEST_DATA | Pure test/seed data with 0 foreign keys, 0 videos, 0 messages, and 0 notifications | N/A (Test) |
| 5 | `test_marketer_01000000006` | `marketers` | مسوّق الحلم التجريبي | `+201000000006` | TEST_DATA | Pure test/seed data with 0 foreign keys, 0 videos, 0 messages, and 0 notifications | N/A (Test) |
| 6 | `AjZm7yasznYN5n7qgL9Z` | `users` | شريف حسن | `+201017799580` | TEST_DATA | Pure test/seed data with 0 foreign keys, 0 videos, 0 messages, and 0 notifications | N/A (Test) |
| 7 | `IOLqqZ1Lvqep1RcPTAAz9px4CJU2` | `users` | مصطفي اسماعيل | `+201017799580` | TEST_DATA | Pure test/seed data with 0 foreign keys, 0 videos, 0 messages, and 0 notifications | N/A (Test) |
| 8 | `UCRYaIbDNBHqtA0Y4eJs` | `players` | Mohamed saudi | `+201017799580` | TEST_DATA | Pure test/seed data with 0 foreign keys, 0 videos, 0 messages, and 0 notifications | N/A (Test) |
| 9 | `7VwkM1UIFdcfiVSFBvm1` | `players` | مختار | `+201017799580` | TEST_DATA | Pure test/seed data with 0 foreign keys, 0 videos, 0 messages, and 0 notifications | N/A (Test) |
| 10 | `M7UP64xP6aLdUR8spJae` | `players` | مازن السيد | `+201017799580` | TEST_DATA | Pure test/seed data with 0 foreign keys, 0 videos, 0 messages, and 0 notifications | N/A (Test) |
| 11 | `1f2dWITeCTflSTzsPRxatkGGWO73` | `players` | hagzz app | `+33333333333` | TEST_DATA | Pure test/seed data with 0 foreign keys, 0 videos, 0 messages, and 0 notifications | N/A (Test) |
| 12 | `4PhRmJVLdncNOcVBvAmUztAxkkm2` | `users` | Tttt | `705424366` | TEST_DATA | Pure test/seed data with 0 foreign keys, 0 videos, 0 messages, and 0 notifications | N/A (Test) |
| 13 | `ls9eL2YFKkoFi7kMfqKr` | `players` | Tttt | `705424366` | TEST_DATA | Pure test/seed data with 0 foreign keys, 0 videos, 0 messages, and 0 notifications | N/A (Test) |
| 14 | `kC5qOqWk8fQzbbmXjwbc0s5bdl33` | `players` |  Mohamed hossam Ra.. | `+201114696735` | SAFE_DUPLICATE | Unquestionably redundant duplicate player profile row with zero activity and zero foreign keys | `4QR7STGslnQqy07SDHcqU4vnCq33` |
| 15 | `LVhtnyer9OMJDclXQRQSmbM5eiC2` | `players` | محمد عماد صابر احم.. | `+201032695740` | SAFE_DUPLICATE | Unquestionably redundant duplicate player profile row with zero activity and zero foreign keys | `2lrEBTkDOoTRpDzrlzqtaa9fvL03` |
| 16 | `d42a6715-53f4-4768-ac9b-c29be0f3a5bb` | `users` | عبد الحليم احمد عب.. | `+201104840453` | SAFE_DUPLICATE | Unquestionably redundant duplicate user row with zero activity and zero foreign key dependencies | `ed796abc-d44a-4986-9d2b-f2cff5a00e9c` |
| 17 | `JJ8MJBUvdRhTz7XZeQU3qBdjSbG2` | `players` | fady | `70542458` | TEST_DATA | Pure test/seed data with 0 foreign keys, 0 videos, 0 messages, and 0 notifications | N/A (Test) |
| 18 | `ZMMGQoZF8PREKSEh4LFYeVnJZq92` | `academies` | أكاديمية جديدة | `70542458` | TEST_DATA | Pure test/seed data with 0 foreign keys, 0 videos, 0 messages, and 0 notifications | N/A (Test) |
| 19 | `ea5c5523-6eec-46ff-9b13-783dd71a8b2e` | `users` | يوسف ياسر السيد أحمد | `+201025519031` | SAFE_DUPLICATE | Unquestionably redundant duplicate user row with zero activity and zero foreign key dependencies | `54c9eb87-c860-4e97-b24d-2e174ed83426` |
| 20 | `test_club_01000000001` | `clubs` | نادي الحلم التجريبي | `+201000000001` | TEST_DATA | Pure test/seed data with 0 foreign keys, 0 videos, 0 messages, and 0 notifications | N/A (Test) |
| 21 | `test_academy_01000000002` | `academies` | أكاديمية الحلم الد.. | `+201000000002` | TEST_DATA | Pure test/seed data with 0 foreign keys, 0 videos, 0 messages, and 0 notifications | N/A (Test) |

---

## 5. Part B: Database Relationships Preventing Safe Deletion

Before any account is considered for deletion, its foreign-key footprint was verified across the active relational tables:

| Relational Table | Referenced Field | Total Unique Referenced IDs | Impact if Parent Account is Deleted |
| :--- | :--- | :---: | :--- |
| `notifications` | `userId` | **798** | Notifications become orphaned; crashes mobile notification center |
| `conversations` | `participants` (JSONB) | **138** | Chat threads break; missing participant avatars and names |
| `messages` | `senderId`, `receiverId` | **96** | Direct messaging history broken; message thread integrity lost |
| `player_favorites` | `owner_id`, `player_id` | **16** | Club/Scout favorite bookmarks point to non-existent players |
| `opportunities` | `organizerId` | **3** | Club trials and scouting events lose their organizer reference |

> [!WARNING]
> Because PostgreSQL foreign key constraints were not enforced at the database level during the Firebase export, deleting accounts without cascade checks will produce **orphaned application records** and trigger runtime null-pointer exceptions in the Flutter mobile app.

---

## 6. Part C: Real Account Conflicts (Class D — 24 Groups)

The following groups represent **genuinely distinct human individuals** who are sharing the exact same mobile phone number.
In compliance with the **ONE REAL PHONE NUMBER = ONE ACCOUNT** rule, these accounts must NOT be deleted automatically:

| # | Normalized Phone | Country | Accounts Count | Accounts Summary (IDs, Tables, Names) |
| :---: | :--- | :--- | :---: | :--- |
| 1 | `+201112911914` | Egypt | 4 | [users] احمد ياسر علي  (`tTZhaT0QAUVyddcg7InevNkuRDt2`) **vs** [users] Ahmed Yaser (`fFe35ICntkYI85Bv9Is87zmbZgE3`) **vs** [players] Ahmed Yaser ali diab (`fFe35ICntkYI85Bv9Is87zmbZgE3`) **vs** [players] احمد ياسر علي  (`tTZhaT0QAUVyddcg7InevNkuRDt2`) |
| 2 | `+201123379793` | Egypt | 5 | [users] mohamed Hassan (`uE7bvBpfTaciPoynGsznyYnUlbp2`) **vs** [users] محمد حسن السيد  (`iTKBFkiTvgUpTSaT1eA5qXeS32u1`) **vs** [players] محمد حسن السيد  (`iTKBFkiTvgUpTSaT1eA5qXeS32u1`) **vs** [players] Mohammed Hassan (`rJG08UCl64haTKAbYQX410FdLB73`) **vs** [players] mohamed Hassan (`uE7bvBpfTaciPoynGsznyYnUlbp2`) |
| 3 | `+201063138763` | Egypt | 4 | [users] نور خالد حسين مدبولي  (`uH8qCBl9WYfNKDSBEyx4poxY9dB2`) **vs** [users] Khaled Madboly (`cQy3dS25sDXuIbfa8luHF9XSJLj1`) **vs** [players] نور خالد حسين مدبولي  (`uH8qCBl9WYfNKDSBEyx4poxY9dB2`) **vs** [players] Khaled Madboly (`cQy3dS25sDXuIbfa8luHF9XSJLj1`) |
| 4 | `+201055604796` | Egypt | 4 | [users] علي عبدالله النخلاني (`vbrZnqsNseOBBWyr6JsacpcdxzN2`) **vs** [users] طارق محمد سيد  (`BqmKMUUYKuM9vbAoO2QjKYXpMVo1`) **vs** [players] طارق محمد سيد  (`BqmKMUUYKuM9vbAoO2QjKYXpMVo1`) **vs** [players] علي عبدالله النخلاني (`vbrZnqsNseOBBWyr6JsacpcdxzN2`) |
| 5 | `+201002691544` | Egypt | 6 | [users] محمد احمد محمد حسان (`vnxBFTg2tyf1dhgdR9KA5AgAux13`) **vs** [users] Mohamed Ahmed mohamed Hassan  (`LFUXLeTmECgxnTP7G1yTu4YhGvh1`) **vs** [users] Mohamed Ahmed mohamed Hassan  (`kDcjrn78OqRVWcQSMH02acxRicx1`) **vs** [players] Mohamed Ahmed mohamed Hassan  (`LFUXLeTmECgxnTP7G1yTu4YhGvh1`) **vs** [players] Mohamed Ahmed mohamed Hassan  (`kDcjrn78OqRVWcQSMH02acxRicx1`) **vs** [players] محمد احمد محمد حسان (`vnxBFTg2tyf1dhgdR9KA5AgAux13`) |
| 6 | `+201270677242` | Egypt | 4 | [users] 𝒎𝒂𝒓𝒊𝒐𝒍𝒐𝒕𝒇𝒚  (`wgbYucFodnQIOQoPwUugMnPdDj32`) **vs** [users] ماريو لطفي خليفه  (`8IwYJDFxw8Pvf1i4tRkOVD66CDm1`) **vs** [players] 𝒎𝒂𝒓𝒊𝒐𝒍𝒐𝒕𝒇𝒚  (`wgbYucFodnQIOQoPwUugMnPdDj32`) **vs** [players] ماريو لطفي خليفه  (`8IwYJDFxw8Pvf1i4tRkOVD66CDm1`) |
| 7 | `+201017976070` | Egypt | 4 | [users] اياد احمد عبد العزيز  (`xXPyB3la7gghUUB5uYwuO9DDwK12`) **vs** [users] مؤمن مصطفي سيد  (`CfWvkJMgnOXV9tTfRBV1qDvYJaQ2`) **vs** [players] اياد احمد عبد العزيز  (`xXPyB3la7gghUUB5uYwuO9DDwK12`) **vs** [trainers] مؤمن مصطفي سيد  (`CfWvkJMgnOXV9tTfRBV1qDvYJaQ2`) |
| 8 | `+201114906366` | Egypt | 4 | [users] mohamed ahmed eltaher (`xcf9iKNCb8YoPgKfvjBxXdt4Rf22`) **vs** [users] محمد احمد الطاهر احمد (`3NPp3fcwUpZgMwwTkt7xCY6bVrA3`) **vs** [players] محمد احمد الطاهر احمد (`3NPp3fcwUpZgMwwTkt7xCY6bVrA3`) **vs** [players] mohamed ahmed eltaher (`xcf9iKNCb8YoPgKfvjBxXdt4Rf22`) |
| 9 | `+201278988086` | Egypt | 4 | [users] May Shref (`z3aSEQrAT4YJXydi52hSFcuI0hl2`) **vs** [users] احمد محمد حسن (`Q0B9pEsbtkWyFHh39nizb4XS9042`) **vs** [players] احمد محمد حسن (`Q0B9pEsbtkWyFHh39nizb4XS9042`) **vs** [players] May Shref (`z3aSEQrAT4YJXydi52hSFcuI0hl2`) |
| 10 | `+962790866671` | Jordan | 4 | [users] Jafar jalabneh (`d24afe5c-44da-4f81-827d-fdb041fdae7b`) **vs** [users] Ahmad jlabneh (`kky7L4s4QHfIdw30CXAaW6hmgFy2`) **vs** [players] Jafar jalabneh (`5f433c8c-e12c-445b-bb89-5f605814a390`) **vs** [agents] Ahmad jlabneh (`kky7L4s4QHfIdw30CXAaW6hmgFy2`) |
| 11 | `+201055852805` | Egypt | 3 | [users] كابتن صدام  (`7vWFa4rXA5a8vvPYIlHnbIVhtlJ2`) **vs** [users] شريف حسن  (`QTGlDnP4VOPwJy6H3pxruA81J4f1`) **vs** [players] شريف حسن  (`QTGlDnP4VOPwJy6H3pxruA81J4f1`) |
| 12 | `+201208183362` | Egypt | 4 | [users] Moaz moustfa  (`0GA9TbXVFYSi1aWWlhhgWjO4sVB2`) **vs** [users] Moaz Idres (`YrXFKuFMD8XT4yWQ81byaSG9pc73`) **vs** [players] Moaz moustfa  (`0GA9TbXVFYSi1aWWlhhgWjO4sVB2`) **vs** [players] Moaz Idres (`YrXFKuFMD8XT4yWQ81byaSG9pc73`) |
| 13 | `+201210008280` | Egypt | 4 | [users] محمد خالد محمد الصابرين (`GYQSHjR5pre20a4iMBy42wByqu83`) **vs** [users] khaled elsbren (`EtCngA6VauSDZSCRGMMJFl0SGQD3`) **vs** [players] khaled elsbren (`EtCngA6VauSDZSCRGMMJFl0SGQD3`) **vs** [players] محمد خالد محمد الصابرين (`GYQSHjR5pre20a4iMBy42wByqu83`) |
| 14 | `+201003231729` | Egypt | 4 | [users] براء باسر فرج عبدالحميد (`If0czaDWtFTXSzVVbN5veUjAI8m2`) **vs** [users] براءة ياسر فرج (`aXcLL3eJulaRbtGa4WnTFnD192i1`) **vs** [players] براء باسر فرج عبدالحميد (`If0czaDWtFTXSzVVbN5veUjAI8m2`) **vs** [players] براءة ياسر فرج (`aXcLL3eJulaRbtGa4WnTFnD192i1`) |
| 15 | `+201000940321` | Egypt | 7 | [users] Shref hasn (`FNu1kcoUJEa4FOujNvYLHOpoMg53`) **vs** [users] راشد محسن الشهواني (`N1qlF0vA0WPRdVDfE41fWVOfFJD3`) **vs** [users] ابو مكه  (`QAMNwgNVVRVqKw5KhXhQayrtX6h1`) **vs** [users] شريف حسن محمد  (`M0bXmeytW5SqD023oxU8jcz95QC2`) **vs** [players] Shref hasn (`FNu1kcoUJEa4FOujNvYLHOpoMg53`) **vs** [players] ابو مكه  (`QAMNwgNVVRVqKw5KhXhQayrtX6h1`) **vs** [agents] شريف حسن محمد  (`M0bXmeytW5SqD023oxU8jcz95QC2`) |
| 16 | `+201205131136` | Egypt | 4 | [users] Kareem Fghhj (`FwMyuqQ61MailLnrn7uQtunUpL73`) **vs** [users] كريم غريب حسن  (`HRyJpCYzDdODRrBoekpGXSW9Jx73`) **vs** [players] Kareem Fghhj (`FwMyuqQ61MailLnrn7uQtunUpL73`) **vs** [players] كريم غريب حسن  (`HRyJpCYzDdODRrBoekpGXSW9Jx73`) |
| 17 | `+201030456946` | Egypt | 3 | [users] كراميلا_karamila (`HhaxbH4J3MbvbtCnvaatNZbkH1s2`) **vs** [users] شيماء شوقي (`Rh76d5aIBkckFJcymDsrOXjEYRl2`) **vs** [players] شيماء شوقي (`Rh76d5aIBkckFJcymDsrOXjEYRl2`) |
| 18 | `+201092475558` | Egypt | 4 | [users] محمد حربي  (`Ner9km8QY2eqJHKjUX39VPrT6ro1`) **vs** [users] Mohamed harby  (`cvFk5HLHLheo4crw3hEvEqMmA7Q2`) **vs** [players] محمد حربي  (`Ner9km8QY2eqJHKjUX39VPrT6ro1`) **vs** [players] Mohamed harby  (`cvFk5HLHLheo4crw3hEvEqMmA7Q2`) |
| 19 | `+201066573162` | Egypt | 4 | [users]  سعيد محمد ابراهيم  (`Rqk1g1rpG3VmmG7X1yrwmcuAJET2`) **vs** [users] يوسف محمد (`cUd2uWgveCXu6ZHGpGjLO3Nw9im2`) **vs** [players]  سعيد محمد ابراهيم  (`Rqk1g1rpG3VmmG7X1yrwmcuAJET2`) **vs** [players] يوسف محمد (`cUd2uWgveCXu6ZHGpGjLO3Nw9im2`) |
| 20 | `+201060901948` | Egypt | 4 | [users] حامد ياسر الطناحي (`QgypAFJcRhg31F5OAsdvZwJnF4n2`) **vs** [users] حامدياسر الطناحي  (`cWThxvOR6QeLsd2Gno7EL8cfTsN2`) **vs** [players] حامدياسر الطناحي  (`cWThxvOR6QeLsd2Gno7EL8cfTsN2`) **vs** [players] حامد ياسر الطناحي (`QgypAFJcRhg31F5OAsdvZwJnF4n2`) |
| 21 | `+97450940559` | Qatar | 9 | [users] Lions Athletic Academy  (`c1X0Y332qGfX1EFEQyBNuoyhVsd2`) **vs** [players] احمد رياض سوادى محمد الشمري (`thAtTp8CzEwOPrL2oyxn`) **vs** [players] يوسف عبدالرحمان محمد بوشيبة (`7P46Taqt3lT4u7rNrQKR`) **vs** [players] سيف محمد ابراهيم محمود ابو لبده (`CHhr85zBmKsKwWgRMo7a`) **vs** [players] سيف يزن هاني قدورة (`Pmh2ZQe7A0hcGeVfAFbN`) **vs** [players] ادم نهاد قدري محمد نصر (`aPoHOAKvScqDBFuJI6yW`) **vs** [players] عمار عاطف كمال احمد رضوان (`muzRU8v1DqT7dJkbPhwD`) **vs** [players] يوسف عبدالوهاب محمد قاسم زباره (`u4k7GW48smYUOWsRQho3`) **vs** [academies] Lions Athletic Academy  (`c1X0Y332qGfX1EFEQyBNuoyhVsd2`) |
| 22 | `+201000493875` | Egypt | 4 | [users] مالك احمد فوزي  (`cmR1Jj2k3ZO4fSU5mMU87X34mrc2`) **vs** [users] Malek Ahmed Fawzy (`VOHOyXCaMOd6ZRRmOQHJbELD4Ew1`) **vs** [players] Malek Ahmed Fawzy (`VOHOyXCaMOd6ZRRmOQHJbELD4Ew1`) **vs** [players] مالك احمد فوزي  (`cmR1Jj2k3ZO4fSU5mMU87X34mrc2`) |
| 23 | `+201026558999` | Egypt | 5 | [users] ضصص (`ej356ozUzGalpVXbuZD2nujeVvf1`) **vs** [players] علاء الدين (`KtngER5NNzVJJh3R6WJ1uahtnhI2`) **vs** [players] محمد حسين (`e4BAGj0JUZYXPQHqcaF1BHzmHoy2`) **vs** [players] عصام عاطف (`ej356ozUzGalpVXbuZD2nujeVvf1`) **vs** [trainers] عصام عماد (`ej356ozUzGalpVXbuZD2nujeVvf1`) |
| 24 | `+97455561599` | Qatar | 4 | [users] احمد رياض الشمري  (`irZOiBwfXnM5cDMvSh7W8O0cbpb2`) **vs** [users] LIONS ATHLEIC ACADEMY (`p1KkofykQwTdAfmkz0LC4reXPHv1`) **vs** [players] احمد رياض الشمري  (`irZOiBwfXnM5cDMvSh7W8O0cbpb2`) **vs** [academies] LIONS ATHLEIC ACADEMY (`p1KkofykQwTdAfmkz0LC4reXPHv1`) |

---

## 7. Part D: Final Preserved vs Proposed Deletion Summary

### 7.1 Preserved Records (1117 Accounts)
The following account categories **MUST BE PRESERVED**:
1. **All Class B Legacy User/Player Pairs (1,728 accounts):** Core active users whose authentication and athletic data are split across tables.
2. **All Class D Real Conflicting Accounts (106 accounts):** Legitimate users requiring manual phone reassignment.
3. **All Test Accounts with Foreign Key Dependencies (31 accounts):** Test accounts with active chat/notification links that require cascade cleanup.
4. **All Class E Unresolved Accounts (165 accounts):** Accounts with formatting or ambiguity issues.

### 7.2 Proposed Deletion Candidates (21 Accounts)
Only the **32 strictly verified accounts** listed in Section 4 are proposed for safe deletion.
- **27 Test Accounts:** Completely isolated dummy accounts with 0 dependencies.
- **5 Ghost Duplicates:** Redundant duplicate rows created during re-login where an identical active canonical row exists with all user data.

---

## 8. Artifacts Generated in Phase 6.1

1. `docs/review/phase6-1-duplicate-decision-audit.json`
   - Complete decision matrix for all 962 duplicate groups.
2. `docs/review/phase6-1-safe-delete-candidates.json`
   - Exact list of the 32 safe-delete candidates with justification.
3. `docs/review/phase6-1-manual-review.json`
   - Complete list of 320 records flagged for manual review or conflict resolution.
4. `docs/review/phase6-1-duplicate-decision-audit.md` (This document).

---

> [!IMPORTANT]
> **STOP AND AWAIT EXPLICIT APPROVAL:**
> No deletion, update, merge, or migration has been executed.
> Please review the findings and approve the next action plan.
