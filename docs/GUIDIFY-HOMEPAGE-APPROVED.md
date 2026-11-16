# Guidify Homepage — Approved Design (Concept C · Search-led)

**Status:** Approved by the owner after Round 2 (Concept C). **Revision 2:** the scroll-driven chapter story was removed by the owner; the hero is search-led.
**Repository:** `investedia/guidify-frontend` · implement on a branch from `main`, never directly on `main`.
**Previews:** `docs/approved-previews/` (desktop 1440 px, phone iPhone 13 / 390 px). These are the visual reference. Where this document and a preview disagree, this document wins.
**Not authorised by this document:** pushing, merging or deploying. Those need separate owner approval.

| Preview | Shows |
|---|---|
| `d1-hero.jpg` | Full desktop homepage (the chapter kicker and progress bar shown there are superseded) |
| `d2-chapter.jpg` | *Superseded (scroll story removed)* — use `d4-filter.jpg` for the selected-company card |
| `d3-search.jpg` | Search with suggestions |
| `d4-filter.jpg` | Sector filter applied |
| `d5-empty.jpg` | Search with no results |
| `d6-loading.jpg` | Globe loading state |
| `d7-expanded.jpg` | Expanded company panel (desktop) |
| `m1-hero.jpg` | Full phone homepage |
| `m2-sheet.jpg` | Tapped company, bottom sheet (phone) |
| `m3-search.jpg` | Search on phone |

The previews are static mock-ups built on the real globe. The cards in them are placeholders. Their example text (Spotify, Nubank) is **not verified** and must not ship as fact.

---

## 1. Positioning and copy

Guidify is an independent digital product company. It started building digital products in 2024, and it develops Investedia and Droplates. It serves investors, traders, entrepreneurs, creators and learners. It is **not** an agency. Never promise financial results or guaranteed earnings.

### Final copy (use verbatim)

**Hero**
- Kicker: `From ideas to impact`
- H1: **Every big product began somewhere.**
- Subtitle: *Explore the stories behind products people use every day: the problem, the solution, and where it started.*
- Search placeholder: `Search companies`

**Mission**
- Kicker: `From ideas to impact`
- H2: **The right tools change what's possible.**
- Body: *Every company on the globe started by solving a problem with the knowledge and tools it had. Guidify builds independent products that put better knowledge and tools within reach of people who invest, trade, build and learn.*
- Audience chips, not interactive: Investors · Traders · Entrepreneurs · Creators · Learners

**Products**
- H2: **One vision. Different solutions.**
- Intro: *Independent products, each with its own audience, brand and roadmap.*
- Investedia: pill `Live`; "For investors, traders and learners"; *Financial news, markets and investment intelligence, with education for people learning to invest.*; link `Visit investedia.com →`; screenshot `assets/img/investedia-home.png`
- Droplates: pill `In development`; "For creators and people building online businesses"; *Website templates and creation tools to launch a site faster.*; link `Visit droplates.com →`; screenshot `assets/img/droplates-home.png`
- Do **not** mention certificates or any other feature that isn't confirmed live.

**Our story since 2024**
- H2: **Our story since 2024.**
- Intro: *Guidify began building digital products in 2024. That work became independent products.*
- Three steps: `2024` / Work on digital products begins · `Investedia` / Live at investedia.com · `Droplates` / In development
- No other milestones, figures or legal dates. 2024 is when the work began, not the date of formal registration.

**Text discovery and disclaimer**
- Collapsible row: `Browse all companies as a list` with the published count (for example `73 ↓`). It expands to the accessible list in §4.6.
- Small note: *Featured companies are not affiliated with or endorsed by Guidify. Logos belong to their owners.*

**Contact:** H2 **Let's connect.** · *For questions about Guidify or its products.* · button `Email us` → `mailto:contact@guidify.eu`.

**Footer:** keep the current footer (logo, tagline, social icons, contact@guidify.eu, Products / Company / Legal links, legal line, ©). The KBO/BCE, VAT and address stay `[to be confirmed]` until the owner supplies them. This is a release blocker if Belgian law requires the information.

### Removed
- The "Brought to you by Investedia" credit. It made Investedia look like the parent company.
- The old sections "Two products. One company.", "Our products." (old showcase layout), "An ecosystem of products." and "Independent by design.". They are replaced by the Mission, Products and Story sections above. The quick-links row is removed too.
- The hero copy "Digital solutions for entrepreneurs." and its subtitle.

## 2. Visual system (unchanged tokens)

- Colours: `--bg #080808`, `--bg-2 #121212`, `--fg #FFFFFF`, `--fg-2 #999999`, `--line #292929`, `--line-2 #3a3a3a`. Black, white and greys only; product screenshots may keep their own colours.
- Type: Inter 400/500/600. H1 `clamp(48px, 6vw, 84px)`, weight 500, letter-spacing −0.05em, line-height 1.0. Section H2 `clamp(36px, 5vw, 64px)`, weight 500, −0.04em. Body 16–19px, `--fg-2`. Kickers 12px uppercase, letter-spacing 0.14em.
- Radii: pills 999px; cards 16px; product cards 18px; bottom sheet 20px top corners.
- Motion: 180–300ms for UI transitions; the camera move to a selected company takes about 900ms with ease-in-out. No glow, gradients or glassmorphism. Text over the globe may use a soft dark text-shadow for legibility, as in the previews.
- Container max width 1200px; gutters `clamp(20px, 4vw, 40px)`.

## 3. Hero layout (search-led; no scroll story)

### Desktop (> 900px)
- The hero is at least `100vh − header` tall. The globe fills the background, centred, about `min(1150px, 120vw)` square, at about 62% opacity. Text and controls sit in front of it.
- Two-column grid. Left column: kicker, H1, subtitle, then the search box with the sector chips directly under it. Right column (360px): a short prompt card, *Search or tap a logo to read how a company started.*, which is replaced by the selected company's card. The bottom edges are aligned.
- There is **no scroll story**: no chapters, no progress bar, and no scroll-driven camera moves. The page scrolls normally. The globe auto-rotates slowly until the user selects a company or interacts.
- Zoom buttons (+ / −) sit at the bottom right of the hero. Pinch or Ctrl + scroll also zoom; a plain mouse wheel scrolls the page.

### Phone (≤ 900px)
- The globe sits at the top of the hero (about 62vw high, cropped). The kicker, H1, subtitle, search and chips are stacked below it, left-aligned. A one-line hint sits under the chips: *Search, or tap a logo to read how a company started.*
- There is no hero card on phones. Selecting a company opens the bottom sheet (§4.5).
- One finger scrolls the page; two fingers turn and zoom the globe.

## 4. Globe interaction

### 4.1 Search (`d3`, `d5`, `m3`)
- A pill input with a magnifier, the placeholder `Search companies`, and a `/` key hint (Esc while focused).
- The `/` key focuses search, unless the user is typing in another field.
- Matches company display names, with diacritics ignored (also city names if that's simple to add). It shows up to 6 suggestions, each with the name and `City · Year`.
- Navigation: ↑/↓ to move, Enter to select, Esc to close. ARIA combobox pattern (`role="combobox"`, `aria-expanded`, `aria-activedescendant`, `role="listbox"`/`option`).
- Selecting a company:
  - the globe rotates and focuses on it (about 900ms, ease-in-out; instant with reduced motion);
  - its marker is highlighted;
  - on desktop the compact card opens in the right column; on phones the bottom sheet opens.
- No results: *No companies match “{query}”. Try a company name or a city.* (screen readers hear this through a polite live region).

### 4.2 Sector filters (`d4`)
- Chips: `All` · `Software & AI` · `Finance & Fintech` · `Commerce` · `Media & Entertainment` · `Infrastructure & Technology` (may show as `Infrastructure`) · `Other`.
- One sector at a time. The active chip has a lighter border, a `#1a1a1a` fill and a `×` to clear it, and `aria-pressed="true"`.
- Filtering hides non-matching markers and badges without rebuilding the scene (toggle visibility). Search only suggests companies in the active sector.
- Sectors must come from the structured data (§5), never guessed.

### 4.3 Desktop hover and click
- Hover a badge: the badge enlarges slightly and a tooltip shows the name and `City · Year`.
- Click a badge: the compact card opens in the right column (as in `d4-filter.jpg`).
- The compact card shows:
  - logo or lettermark, name, `City, Country · Founded YYYY`;
  - Original problem, Solution and How it grew, about one line each;
  - the verification badge;
  - `Read the full story →`, which opens the expanded panel.

### 4.4 Expanded panel (`d7`)
- A right-side dialog, 440px wide, full height below the header, over a 35% black scrim. It closes with `✕`, Esc or a click on the scrim. Focus is trapped inside while it's open and returns to the opener afterwards.
- Contents:
  - logo, verification badge, name;
  - a facts grid with Founded, Founding city, Sector and the note *Founding city, not current HQ* (shown when the HQ differs or is unknown);
  - Original problem, Solution and How it grew, as full paragraphs;
  - a Sources box listing reference links (open in a new tab with `rel="noopener noreferrer"`);
  - the line *{Company} is not affiliated with or endorsed by Guidify.*

### 4.5 Phone bottom sheet (`m2`)
- Tapping a badge opens a bottom sheet with a drag handle. The peek state shows the logo, name, `City, Country · Founded YYYY`, the original problem, the verification badge and `Swipe up for the full story ↑`.
- Swiping up, or tapping the sheet, expands it to full height with the same content as the desktop panel. Swiping down, tapping outside or using the back gesture closes it. Scrolling the page with the sheet in its peek state closes it.
- A tap that ends a rotation or pinch must not select a company: ignore taps after pointer movement of more than about 8px.
- Check small screens (360px) and landscape: the sheet stays within the viewport and leaves the browser's own controls usable.

### 4.6 Text discovery (required for accessibility)
- The `Browse all companies as a list` row expands to a semantic list or table of every published company: name, city and country, year, sector. Each row opens the same panel or sheet.
- This route must work without WebGL and without a pointer.

### 4.7 States
- **Loading (`d6`):** show a static image of the globe (a pre-rendered still) straight away. A small card reads *Loading the globe…*. Swap in the canvas when it's ready, without a layout shift.
- **WebGL unavailable or error:** keep the static image. Search and the list still work, and selecting a company opens the panel or sheet without the camera move.
- **Unverified data:** a dashed badge `Unverified · source pending`. Unverified records must not ship in the public dataset (§5). The badge exists so reviewers can see when one slips through.
- **Empty filter result:** *No companies in this sector yet.*

## 5. Company data

- Each public record needs:
  - `id` (stable slug) and `name`;
  - `sector` (one of the enum in §4.2);
  - `founded` (year);
  - `foundingCity`, `foundingCountry`, `lat`, `lon` and `coordPrecision` (`city`/`region`);
  - `hq` (optional; used only for the "not current HQ" note);
  - `problem`, `solution`, `history`;
  - `sources` (one or more URLs);
  - `logo` plus `logoSource` and `logoLicence`, or `logo: null` for a lettermark;
  - `status`: `verified`, `needs-review`, `disputed` or `unsupported`.
- **Only `verified` records ship.** Keep candidate and review data in a separate file that the page never loads.
- The founding location and founding year belong to the company, not a later product or HQ. Parent companies and products need care: for example, M-Pesa is a Safaricom product and TikTok is a ByteDance product. Label them clearly or leave them out.
- 73 existing records and 20 candidates (Canva, Figma, Webflow, Wix, Typeform, Pipedrive, DeepL, Mistral AI, Etsy, Vinted, Carousell, Mercari, Glovo, Supercell, Mailchimp, Monzo, Yoco, Interswitch, Ualá, Bitso). The target is up to 93 **verified** companies; accuracy matters more than the count.
- A validator script must check:
  - required fields and the sector enum;
  - duplicate IDs;
  - coordinate ranges;
  - URL format;
  - logo files exist;
  - no non-verified record in the public file.

## 6. Accessibility

- Visible focus on every control: a 1px white outline with a 4px offset (the existing style).
- Keyboard: `/` for search; Tab through the chips, card actions and list; Esc closes panels and sheets. The globe canvas itself isn't a keyboard trap.
- The globe canvas gets an `aria-label` pointing to the list alternative. Badges aren't the only way to reach any information.
- Contrast: body text at least 4.5:1 on `--bg`. `#7a7a7a` labels are only used at 11–12px uppercase, and must pass 4.5:1 or be lightened to `#8a8a8a`.
- Reduced motion: no auto-rotate, instant camera focus, instant panel transitions.

## 7. Performance

- The hero must never be blank. The static globe still is the LCP element; load Three.js and the scene after first paint (`modulepreload` plus a dynamic import).
- Pause rendering when the globe is off-screen or the tab is hidden (already in place; keep it).
- Logos load in parallel and are cached. Keep badge textures at 256px, and consider a single texture atlas if there are 90+ badges.
- Device pixel ratio up to 2, lowered on low-end devices (for example `hardwareConcurrency ≤ 4` or a slow first frame).
- Measure before and after (transfer size, time to first globe frame, long tasks) on desktop and on a throttled mobile profile. Report the conditions used.

## 8. Discoverability and legal

- Add a reviewed `og:image` (1200×630, monochrome, H1 plus globe still), canonical URLs, `robots.txt` and `sitemap.xml`, plus `Organization` structured data with only true fields (name, url, logo, sameAs for the social profiles, email).
- Document the source and licence of every third-party logo. Replace or remove any asset that can't be cleared.

## 9. Acceptance criteria

1. The hero copy, the Mission, Products and Story sections, contact and footer match §1 word for word, and the removed elements in §1 are gone.
2. Desktop 1440px and phone 390px match the previews in layout and hierarchy; no horizontal scroll at 1440, 768, 390 or 360px.
3. No scroll-driven story: the page scrolls normally; the globe auto-rotates until a company is selected (no auto-rotate with reduced motion).
4. Search: `/` focuses; arrow keys and Enter select; Esc closes; selecting a company focuses the globe and opens the card or sheet; the no-results message shows and is announced.
5. Filters: each chip shows only that sector's markers, without rebuilding the scene; `×` or `All` clears.
6. Desktop: hover shows a tooltip; click opens the compact card; `Read the full story` opens the panel; Esc, ✕ and the scrim close it; focus returns to the opener.
7. Phone: tap opens the peek sheet; swipe up expands; swipe down or tapping outside closes; a rotation or pinch never selects a company; one finger scrolls the page.
8. The list alternative shows every published company and opens the same details without WebGL.
9. The loading still shows immediately; there's no blank hero and no layout shift when the canvas appears; the WebGL failure fallback works.
10. The public dataset contains only `verified` records, each with sources; the validator passes.
11. No console errors; all external links work and open safely.
12. Performance before and after is reported; nothing regresses against the current live site.

## 10. Rejected directions

- **A · Atlas:** centred headline with the globe and search below. Rejected in favour of C.
- **C · Chapters scroll story** (six scroll-driven chapters with a progress bar): removed by the owner in revision 2.
- **B · Split explorer:** headline and list on the left, globe on the right. Rejected, although its accessible list survives as §4.6.
- Hero "Digital solutions for entrepreneurs." / "Build something of your own." (too narrow), the particle and solid 3D "G" heroes, and the "Brought to you by Investedia" credit.
