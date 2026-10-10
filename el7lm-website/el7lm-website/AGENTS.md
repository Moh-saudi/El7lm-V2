# El7lm website — agent instructions

Static, dependency-free marketing site for **El7lm**, a football-talent platform (HQ: Qatar Financial Centre, Doha).
No build step. Open `index.html` through any static server (e.g. `python3 -m http.server`).

## Structure
- `index.html` — all markup. Text is NOT hard-coded: elements use `data-i` (text), `data-h` (HTML), `data-a` (aria-label), `data-alt` (alt) keys.
- `js/i18n.js` — the dictionary `D5`: `key: [en, ar, fr, es, pt]`. Language order is fixed. `tr(key)` reads it.
- `js/main.js` — preloader, language switch (`applyLang`), services accordion, offices globe (canvas), hash routing (`#offices`, `#p/<slug>`), app-download popup, mobile menu.
- `css/style.css` — design tokens on `:root` (navy `#161653`, gold `#DB9B2C`, green `#0F723C`, bg `#F3F1EF`).
- `assets/` — logo, hero video (muted, looped), poster, Nisr app screenshot, country flags.

## Rules (do not break)
- Default language is **English**. Arabic switches `<html dir="rtl">`; all other languages are LTR. Use logical CSS (`inline-start/end`) so both directions work.
- Brand name is written **El7lm** (Arabic: الحلم). Never "Mesk El7lm".
- The AI assistant is **Nisr** (Arabic: نسر). Never "Nasr". The only allowed "Nasr" is the district name **Nasr City** (Cairo office).
- Never show phone numbers as text on the page. Use `wa.me` / `tel:` links only. Official email: `info@el7lm.com`.
- Do not invent facts: partner clubs, legal text, prices, addresses. Missing data stays as a visible TODO, not made-up copy.
- Use real logos/icons only (brand icons are in the inline SVG sprite in `index.html`). Do not hand-draw logos or flags.
- Respect `prefers-reduced-motion` (animations and the hero video must stop).
- Every user-visible string must exist in all 5 languages in `i18n.js`.

## Open TODOs (waiting on the El7lm team)
1. Partner club logos + names — replace the generated placeholder crests in `buildPartners()` (`js/main.js`) with real `<img>` logos.
2. Privacy Policy and Terms & Conditions text (`pb_legal` key; pages `#p/privacy`, `#p/terms`).
3. App Store link — in `index.html` the App Store badge is a disabled `<span class="st">`; make it an `<a>` and remove the "Coming soon" tag when live.
4. Official Google Play / App Store badge artwork (current badges are CSS + brand icon).
5. Sub-services under each service (`s11`…`s83` keys) are drafts — confirm with the team.
6. Native-speaker review of FR / ES / PT translations.

## Testing checklist
Switch each of the 5 languages; open `#offices` and click every country; open `#p/clubs`; resize to 390px wide; check the hero video plays and the popup appears after ~7s (once per session).
