# Design System & Content Guidelines

**Project:** Bodhisamadhi Center — Dharma Web Platform
**Related:** [PRD](./PRD-Bodhisamadhi-Center.md) · [Tech note](./1-Tech-Note-Data-Storage-Research.md) · [App flow decisions](./2-App-Flow-Open-Questions.md) · [Tech stack](./3-Tech-Stack-and-Version-Lock.md)
**Date:** August 30, 2026
**Status:** Authoritative — this document, not the v4 prototype, is the source of truth for all UI

---

## 1. How to use this document

This is the implementation specification for every screen in the application. It exists so that no design decision is made during implementation.

### Rules of engagement — non-negotiable

1. **Never invent a value.** Every colour, size, space, radius, shadow, duration and font weight comes from §2. If a value you need is not here, that is a gap in this document — stop and ask, do not choose one.
2. **Never introduce a colour outside the palette**, including for charts, illustrations, status indicators or hover states.
3. **Never use a raw hex value in component CSS.** Reference the custom property: `color: var(--text-mid)`, never `color: #5A4232`.
4. **Every interactive element gets the focus treatment in §2.9.** No exceptions, including icon-only buttons and cards that act as links.
5. **Every component must be specified for all its states** before it is considered done: default, hover, focus-visible, active, disabled, loading, error, empty.
6. **Copy follows §7.** UI text is not filler to be improvised — the terminology rules are about a religious tradition and are not stylistic preferences.
7. **All three languages reach parity.** No string ships in English only. See §7.9.
8. **When this document and `bodhisamadhi-v4.html` disagree, this document wins.** v4 is the origin of the visual language, not its specification; §2 corrects four defects in it.

### What changed from v4, and why

| Change | Reason |
|---|---|
| `--text-soft` darkened from `#8A7258` to `#786249` | The original measures 4.36:1 on `--n-50` and 3.68:1 on `--n-200` — below the 4.5:1 AA floor for body text. It is used for captions, placeholders and metadata throughout. |
| Gold is banned as a text colour on light surfaces | `--go-500` on parchment measures 2.36:1. Gold is for chrome, rules, borders and text **on dark surfaces only**. |
| Chinese typefaces added | v4 loads no CJK face, so 中文 renders in whatever the visitor's OS supplies. |
| Focus ring defined and mandatory | v4 contains three focus-related declarations in 2,200 lines. Keyboard navigation is effectively unimplemented. |
| Semantic colours added | v4 has no success, warning, error or info colour. Forms, admin and every error state need them. |
| The `.l-en` / `.l-zh` / `.l-bo` triple-span mechanism is **removed** | In the Next.js app, language is a route (`/en`, `/zh`, `/bo`) resolved by `next-intl`. Components render one language. Do not reproduce the three-span pattern anywhere. |

---

## 2. Foundations

### 2.1 Token file

This is the complete token set. Save as `src/styles/tokens.css` and import once in the root layout. It is the only place hex values may appear.

```css
:root {
  /* ── Type scale ───────────────────────────────── */
  --fs-h1:    clamp(40px, 6vw, 66px);
  --fs-h2:    clamp(30px, 3.5vw, 42px);
  --fs-h3:    22px;
  --fs-h4:    17px;
  --fs-body:  15px;
  --fs-sm:    13px;
  --fs-label: 11px;

  /* ── Line heights ─────────────────────────────── */
  --lh-display: 1.12;
  --lh-heading: 1.25;
  --lh-body:    1.65;
  --lh-tight:   1.4;
  --lh-tibetan: 2.0;   /* Tibetan needs far more leading — see §3.2 */

  /* ── Font weights ─────────────────────────────── */
  --fw-light:  300;
  --fw-normal: 400;
  --fw-medium: 500;
  --fw-semi:   600;
  --fw-bold:   700;

  /* ── Letter spacing ───────────────────────────── */
  --ls-label:  0.14em;   /* uppercase eyebrows only */
  --ls-tight: -0.01em;
  --ls-normal: 0;

  /* ── Spacing (8px base) ───────────────────────── */
  --sp-0:  0;
  --sp-x:  4px;
  --sp-1:  8px;
  --sp-2:  16px;
  --sp-3:  24px;
  --sp-4:  32px;
  --sp-5:  48px;
  --sp-6:  64px;
  --sp-7:  96px;
  --sp-8:  128px;

  /* ── Crimson / Claret ─────────────────────────── */
  --cr-950: #1C0008;
  --cr-900: #3A0010;
  --cr-800: #5C0019;
  --cr-700: #7B0D1E;
  --cr-600: #9B1B30;
  --cr-500: #B52035;

  /* ── Gold ─────────────────────────────────────── */
  --go-300: #F5DC88;
  --go-400: #E8C96A;
  --go-500: #C8A040;
  --go-600: #A07828;

  /* ── Warm neutrals (surfaces) ─────────────────── */
  --n-50:  #FDFAF5;
  --n-100: #F6F1E9;
  --n-200: #EDE7D9;
  --n-300: #DDD5C2;

  /* ── Text ─────────────────────────────────────── */
  --text:      #1A100A;
  --text-mid:  #5A4232;
  --text-soft: #786249;   /* CORRECTED from #8A7258 — see §1 */
  --text-inv:  #FAF3E8;

  /* ── Semantic (NEW — measured in §2.4) ────────── */
  --success:      #1F6B47;
  --success-bg:   #EAF3EE;
  --warning:      #7D5200;
  --warning-bg:   #FBF1DE;
  --error:        #B3261E;
  --error-bg:     #FBEBEA;
  --info:         #1F5673;
  --info-bg:      #E9F1F5;

  /* ── Focus (NEW — mandatory, see §2.9) ────────── */
  --focus-light:  #9B1B30;   /* on light surfaces */
  --focus-dark:   #E8C96A;   /* on dark surfaces */
  --focus-width:  3px;
  --focus-offset: 2px;

  /* ── Form controls (NEW) ──────────────────────── */
  --field-bg:          #FFFFFF;
  --field-border:      #DDD5C2;
  --field-border-hov:  #B8AC94;
  --field-border-foc:  #9B1B30;
  --field-disabled-bg: #F6F1E9;
  --field-h:           44px;   /* minimum touch target */
  --field-px:          14px;

  /* ── Gradients ────────────────────────────────── */
  --g-crimson: linear-gradient(135deg, #C83A52 0%, #6B0D1E 100%);
  --g-gold:    linear-gradient(135deg, #F0D070 0%, #A07828 100%);
  --g-hero:    linear-gradient(150deg, #0C0203 0%, #1C0508 42%, #110309 78%, #0A0612 100%);
  --g-cta:     linear-gradient(140deg, #7B0D1E 0%, #3A0010 55%, #260012 100%);
  --g-library: linear-gradient(150deg, #0E0304 0%, #1C0609 60%, #0C0210 100%);
  --g-footer:  linear-gradient(170deg, #0E0605 0%, #1A0A08 100%);
  --g-divider: linear-gradient(90deg, transparent 0%, rgba(155,27,48,.35) 20%, rgba(200,160,64,.60) 50%, rgba(155,27,48,.35) 80%, transparent 100%);

  /* ── Glass ────────────────────────────────────── */
  --glass:          rgba(255,255,255,0.62);
  --glass-border:   rgba(255,255,255,0.50);
  --glass-d:        rgba(255,255,255,0.07);
  --glass-d-border: rgba(255,255,255,0.13);

  /* ── Shadows ──────────────────────────────────── */
  --sh-card:  0 4px 24px rgba(0,0,0,0.055), inset 0 1px 0 rgba(255,255,255,0.72);
  --sh-hover: 0 16px 48px rgba(155,27,48,0.18), 0 4px 12px rgba(0,0,0,0.08);
  --sh-btn:   0 4px 18px rgba(155,27,48,0.42);
  --sh-gold:  0 4px 18px rgba(200,160,64,0.38);
  --sh-dark:  0 8px 36px rgba(0,0,0,0.40);
  --sh-modal: 0 24px 64px rgba(0,0,0,0.30);

  /* ── Radii ────────────────────────────────────── */
  --r-xs:   6px;
  --r-sm:   10px;
  --r-md:   16px;
  --r-lg:   24px;
  --r-full: 999px;

  /* ── Layout ───────────────────────────────────── */
  --wrap:       1180px;   /* standard content container */
  --wrap-text:  720px;    /* long-form reading measure */
  --wrap-admin: 1440px;
  --nav-h:      72px;
  --nav-h-sm:   60px;

  /* ── Z-index scale (NEW — never write a raw z) ── */
  --z-base:      0;
  --z-sticky:    100;
  --z-nav:       200;
  --z-drawer:    300;
  --z-modal:     400;
  --z-toast:     500;

  /* ── Motion ───────────────────────────────────── */
  --ease:     cubic-bezier(.25,.46,.45,.94);
  --t-fast:   .15s var(--ease);
  --t:        .28s var(--ease);
  --t-slow:   .5s var(--ease);
}
```

### 2.2 Reduced motion — required

Every animation must be neutralized under this query. Include verbatim in `base.css`:

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

### 2.3 Surface system

Every section sits on exactly one of these. Never invent a background.

| Surface | Background | Body text | Heading | Muted text | Accent | Focus ring |
|---|---|---|---|---|---|---|
| **Parchment** (default) | `--n-50` | `--text` | `--text` | `--text-soft` | `--cr-600` | `--focus-light` |
| **Parchment raised** (cards) | `#FFFFFF` | `--text` | `--text` | `--text-soft` | `--cr-600` | `--focus-light` |
| **Parchment sunken** (wells, alternating bands) | `--n-100` | `--text` | `--text` | `--text-soft` | `--cr-600` | `--focus-light` |
| **Crimson dark** (hero, CTA, footer) | `--g-hero` / `--g-cta` / `--g-footer` | `--text-inv` | `--text-inv` | `rgba(250,243,232,.72)` | `--go-400` | `--focus-dark` |
| **Library dark** | `--g-library` | `--text-inv` | `--text-inv` | `rgba(250,243,232,.72)` | `--go-400` | `--focus-dark` |

### 2.4 Colour contrast — measured, not estimated

Every pairing permitted for text. Ratios computed against WCAG 2.1 relative luminance on 2026-08-30.

| Foreground | Background | Ratio | Verdict |
|---|---|---|---|
| `--text` #1A100A | `--n-50` | **17.97** | AA ✅ AAA ✅ |
| `--text-mid` #5A4232 | `--n-50` | **8.92** | AA ✅ AAA ✅ |
| `--text-soft` #786249 | `--n-50` | **5.54** | AA ✅ |
| `--text-soft` #786249 | `--n-100` | **5.13** | AA ✅ |
| `--text-soft` #786249 | `--n-200` | **4.68** | AA ✅ |
| `--cr-600` #9B1B30 | `--n-50` | **7.78** | AA ✅ AAA ✅ |
| `--cr-500` #B52035 | `--n-50` | **6.26** | AA ✅ |
| `--success` #1F6B47 | `--n-50` | **6.20** | AA ✅ |
| `--warning` #7D5200 | `--n-50` | **6.55** | AA ✅ |
| `--error` #B3261E | `--n-50` | **6.28** | AA ✅ |
| `--info` #1F5673 | `--n-50` | **7.65** | AA ✅ AAA ✅ |
| `--success` on `--success-bg` | — | **5.70** | AA ✅ |
| `--warning` on `--warning-bg` | — | **6.09** | AA ✅ |
| `--error` on `--error-bg` | — | **6.46** | AA ✅ |
| `--info` on `--info-bg` | — | **6.31** | AA ✅ |
| `--text-inv` #FAF3E8 | `--cr-950` | **18.09** | AA ✅ AAA ✅ |
| `--text-inv` #FAF3E8 | `--cr-800` | **12.97** | AA ✅ AAA ✅ |
| `--go-300` #F5DC88 | `--cr-950` | **14.70** | AA ✅ AAA ✅ |
| `--go-400` #E8C96A | `--cr-950` | **12.34** | AA ✅ AAA ✅ |
| `--go-500` #C8A040 | `--cr-950` | **8.13** | AA ✅ AAA ✅ |
| `#FFFFFF` | `--success` / `--warning` / `--error` / `--info` | 6.46 / 6.82 / 6.54 / 7.96 | AA ✅ |

**Forbidden pairings — never produce these:**

| Never | Ratio | Instead |
|---|---|---|
| `--go-500` as text on any light surface | 2.36 ❌ | `--cr-600`, or gold on a dark surface |
| `--go-600` as body text on light | 3.87 ❌ | Permitted for **large text only** (≥24px or ≥19px bold); prefer `--text-mid` |
| Old `--text-soft` #8A7258 | 4.36 ❌ | Use the corrected `#786249` |
| `--cr-500` on `--cr-950` | 1.7 ❌ | `--go-400` or `--text-inv` |
| Colour alone to signal state | — | Always pair colour with an icon or text label (§8) |

### 2.5 Typography — families

Loaded through `next/font/google` in the root layout. Never load fonts with a `<link>` tag; never use `@import` in CSS.

| Role | Family | Weights | Applies to |
|---|---|---|---|
| Display / headings (Latin) | **Cormorant Garamond** | 400, 500, 600, 700 + italic 400, 600 | `h1`–`h4`, pull quotes, the brand wordmark |
| Body / UI (Latin) | **Inter** | 300, 400, 500, 600 | All body copy, labels, buttons, forms, tables, admin |
| Headings (Chinese) | **Noto Serif SC** | 400, 600 | `h1`–`h4` when locale is `zh` |
| Body (Chinese) | **Noto Sans SC** | 400, 500 | Body and UI when locale is `zh` |
| All Tibetan | **Noto Serif Tibetan** | 400, 600 | Everything when locale is `bo` |

```css
--ff-display: 'Cormorant Garamond', Georgia, 'Times New Roman', serif;
--ff-body:    'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif;
--ff-zh-display: 'Noto Serif SC', 'Songti SC', 'SimSun', serif;
--ff-zh-body:    'Noto Sans SC', 'PingFang SC', 'Microsoft YaHei', sans-serif;
--ff-bo:         'Noto Serif Tibetan', 'Jomolhari', serif;
```

**CJK weight rule:** Chinese webfonts are large. Load **only** the weights listed, subset to the glyphs in use, and load them **only when the active locale is `zh`**. Never ship a CJK face to an `/en` visitor.

Applied per locale on `<html lang>`:

```css
html[lang="en"] { --ff-heading: var(--ff-display); --ff-text: var(--ff-body); }
html[lang="zh-Hans"] { --ff-heading: var(--ff-zh-display); --ff-text: var(--ff-zh-body); }
html[lang="bo"] { --ff-heading: var(--ff-bo); --ff-text: var(--ff-bo); }
```

### 2.6 Typography — scale

| Element | Size | Family | Weight | Line height | Spacing | Colour |
|---|---|---|---|---|---|---|
| `h1` hero | `--fs-h1` | heading | 600 | `--lh-display` | `--ls-tight` | context |
| `h2` section | `--fs-h2` | heading | 600 | `--lh-heading` | `--ls-tight` | context |
| `h3` card | `--fs-h3` | heading | 600 | `--lh-heading` | `--ls-normal` | `--text` |
| `h4` sub | `--fs-h4` | body | 600 | `--lh-tight` | `--ls-normal` | `--text` |
| Body | `--fs-body` | body | 400 | `--lh-body` | `--ls-normal` | `--text-mid` |
| Body emphasis | `--fs-body` | body | 500 | `--lh-body` | `--ls-normal` | `--text` |
| Small / caption | `--fs-sm` | body | 400 | `--lh-tight` | `--ls-normal` | `--text-soft` |
| Eyebrow label | `--fs-label` | body | 600 | 1 | `--ls-label` | `--cr-600` (light) / `--go-400` (dark). **Uppercase for Latin only** — never apply `text-transform: uppercase` to Chinese or Tibetan. |
| Button | `--fs-body` | body | 500 | 1 | `--ls-normal` | per variant |
| Form label | `--fs-sm` | body | 500 | 1.4 | `--ls-normal` | `--text` |
| Table header | `--fs-sm` | body | 600 | 1.4 | `--ls-normal` | `--text-mid` |

**Tibetan rendering** — required wherever Tibetan may appear:

```css
:lang(bo) {
  font-family: var(--ff-bo);
  line-height: var(--lh-tibetan);
  word-break: keep-all;
}
```

Tibetan stacked glyphs are clipped at normal leading. Never set a fixed `height` on an element that can contain Tibetan; use `min-height` and let it grow.

### 2.7 Layout & breakpoints

Breakpoints are **desktop-first** (`max-width`), matching the ported v4 stylesheet. Do not mix in `min-width` queries — one direction only.

| Name | Query | Behaviour |
|---|---|---|
| `--bp-lg` | `(max-width: 960px)` | 3-col grids → 2-col; nav collapses to hamburger |
| `--bp-md` | `(max-width: 700px)` | all grids → 1-col; section padding drops one step |
| `--bp-sm` | `(max-width: 480px)` | full-bleed cards; buttons go full width |
| `--bp-xs` | `(max-width: 360px)` | tighten type one step |

```css
.wrap {
  width: 100%;
  max-width: var(--wrap);
  margin-inline: auto;
  padding-inline: var(--sp-3);
}
@media (max-width: 700px) { .wrap { padding-inline: var(--sp-2); } }
```

**Section rhythm:** `padding-block: var(--sp-7)` on desktop, `var(--sp-5)` below `--bp-md`. Consecutive sections alternate Parchment → Parchment sunken, with dark sections used only where §2.3 lists them.

**Grids:** `.g2`, `.g3`, `.g4` — `display: grid; gap: var(--sp-3);` with 2/3/4 equal columns, collapsing per the breakpoint table.

### 2.8 Icons

Icons are **emoji**, as in v4. This is a deliberate choice and the rules below are what make it safe.

| Rule | Detail |
|---|---|
| Font stack | `--ff-emoji: 'Apple Color Emoji','Segoe UI Emoji','Noto Color Emoji',sans-serif`. Always set it explicitly on the icon element — without it, glyphs fall back inconsistently. |
| Decorative use | `<span className={styles.icon} aria-hidden="true">🪷</span>` — always `aria-hidden` when adjacent text already carries the meaning. This is the default case. |
| Meaningful use | If the icon is the only content, it needs `role="img"` and an `aria-label` from the translation file — never a hard-coded English label. |
| Sizing | Set `font-size`, never `width`/`height`. Sizes: `--fs-h2` (feature cards), `--fs-h3` (list rows), `--fs-body` (inline). |
| Alignment | `line-height: 1; display: inline-flex; align-items: center;` — emoji baselines differ between platforms and will otherwise sit low. |
| Never | Do not put emoji inside buttons alongside a label, in table headers, in form labels, in error messages, or anywhere in the admin panel. |
| Approved set | ☸ 🪷 🛕 🙏 🤲 🔁 🎬 🎵 📄 — this is the whole vocabulary. Adding one is a decision for the project owner, not an implementation choice. |

*Recorded tradeoff: emoji render differently on every operating system and several appear in full colour against the crimson-and-gold palette. Accepted deliberately for warmth. If it ever reads as inconsistent, the migration path is a custom SVG set at one stroke weight, drawn to match.*

### 2.9 Focus — mandatory on every interactive element

```css
:focus { outline: none; }          /* only ever paired with the rule below */

:focus-visible {
  outline: var(--focus-width) solid var(--focus-light);
  outline-offset: var(--focus-offset);
  border-radius: var(--r-xs);
}

.surfaceDark :focus-visible { outline-color: var(--focus-dark); }
```

`--focus-light` on parchment measures **7.78:1**; `--focus-dark` on crimson measures **12.34:1**. Both exceed the 3:1 minimum for non-text indicators.

Never remove an outline without replacing it. Never rely on a colour change alone to indicate focus.

### 2.10 Motion

| Surface | Permitted |
|---|---|
| **Marketing** (Home, Masters, Services, Visit, About) | Scroll reveals, staggered card entrance, count-up statistics, the word-by-word quotation effect. All carried over from v4. |
| **Application** (Library, item pages, Live, Account, booking, auth) | **Functional motion only** — hover, focus, open/close, loading. No scroll reveals, no staggers, no count-ups. |
| **Admin** | Functional motion only, and nothing above `--t-fast`. |

Durations: `--t-fast` for hover and focus; `--t` for open/close and card lifts; `--t-slow` for marketing reveals only. Animate `transform` and `opacity` only — never `width`, `height`, `top` or `left`.

---

## 3. Components

Every component lives at `src/components/<Name>/<Name>.tsx` with `<Name>.module.css` beside it. Class names in modules are **camelCase** (`styles.libCard`). No component defines a colour, size or radius of its own — all values come from §2.

### 3.1 Button

**Anatomy:** optional leading icon · label · optional trailing icon. Minimum height 44px. Never icon-only without an `aria-label`.

| Variant | Use | Background | Text | Border | Shadow |
|---|---|---|---|---|---|
| `primary` | The single main action on a screen | `--g-crimson` | `--text-inv` | none | `--sh-btn` |
| `gold` | Primary action on **dark** surfaces only | `--g-gold` | `--cr-950` | none | `--sh-gold` |
| `glass` | Secondary on dark surfaces | `--glass-d` | `--text-inv` | 1px `--glass-d-border` | none |
| `secondary` | Secondary on light surfaces | `#FFFFFF` | `--cr-600` | 1px `--field-border` | `--sh-card` |
| `ghost` | Tertiary, toolbars, admin | transparent | `--text-mid` | none | none |
| `danger` | Destructive only — delete, reject, cancel a booking | `--error` | `#FFFFFF` | none | none |

| Size | Height | Padding X | Font |
|---|---|---|---|
| `sm` | 36px | `--sp-2` | `--fs-sm` |
| `md` (default) | 44px | `--sp-3` | `--fs-body` |
| `lg` | 52px | `--sp-4` | `--fs-body` |

**States:** hover — lift `translateY(-2px)` and deepen shadow. Active — `translateY(0)`, no shadow. Focus-visible — §2.9. Disabled — `opacity: .45`, `cursor: not-allowed`, no hover. Loading — replace the label with a spinner, keep the button's width fixed, set `aria-busy="true"`, and keep it disabled.

Below `--bp-sm`, buttons in a form or a CTA row go `width: 100%`.

```css
.btn {
  display: inline-flex; align-items: center; justify-content: center;
  gap: var(--sp-1);
  min-height: 44px; padding-inline: var(--sp-3);
  font-family: var(--ff-body); font-size: var(--fs-body); font-weight: var(--fw-medium);
  line-height: 1; text-decoration: none; white-space: nowrap;
  border: none; border-radius: var(--r-full); cursor: pointer;
  transition: transform var(--t-fast), box-shadow var(--t-fast), background var(--t-fast);
}
.primary { background: var(--g-crimson); color: var(--text-inv); box-shadow: var(--sh-btn); }
.gold    { background: var(--g-gold);    color: var(--cr-950);  box-shadow: var(--sh-gold); }
.glass   { background: var(--glass-d);   color: var(--text-inv); border: 1px solid var(--glass-d-border); }
.secondary { background:#fff; color: var(--cr-600); border:1px solid var(--field-border); box-shadow: var(--sh-card); }
.ghost   { background: transparent; color: var(--text-mid); }
.danger  { background: var(--error); color: #fff; }

.btn:hover:not(:disabled) { transform: translateY(-2px); box-shadow: var(--sh-hover); }
.btn:active:not(:disabled) { transform: translateY(0); box-shadow: none; }
.btn:disabled { opacity: .45; cursor: not-allowed; transform: none; box-shadow: none; }
.sm { min-height:36px; padding-inline: var(--sp-2); font-size: var(--fs-sm); }
.lg { min-height:52px; padding-inline: var(--sp-4); }
@media (max-width: 480px) { .block { width: 100%; } }
```

### 3.2 Link

Inline links: `color: var(--cr-600)`, underlined with `text-underline-offset: 3px`. Hover → `--cr-500`, underline thickens to 2px. On dark surfaces → `--go-400`, hover `--go-300`. Never remove the underline from an inline text link; navigation and button-styled links are exempt.

### 3.3 Field, Input, Textarea, Select

**Anatomy:** label · optional help text · control · error message. Label is always visible — **never use a placeholder as a label.**

| Element | Spec |
|---|---|
| Label | `--fs-sm`, weight 500, `--text`, margin-bottom `--sp-x`. Required fields get a `--cr-600` asterisk with `aria-hidden`, and the field itself carries `required`. |
| Help text | `--fs-sm`, `--text-soft`, margin-top `--sp-x`. Linked by `aria-describedby`. |
| Control | height `--field-h`, padding-inline `--field-px`, `--fs-body`, background `--field-bg`, 1px `--field-border`, radius `--r-sm` |
| Error | `--fs-sm`, `--error`, prefixed with a `⚠` set `aria-hidden`. Linked by `aria-describedby`; the control gets `aria-invalid="true"`. |
| Textarea | same, `min-height: 120px`, `resize: vertical`, `padding-block: var(--sp-1)` |
| Select | same as input plus a chevron; never use a native `<select>` styling hack — set `appearance: none` and supply the chevron as a background image |

**States:** hover → border `--field-border-hov`. Focus → border `--field-border-foc` plus the §2.9 outline. Disabled → background `--field-disabled-bg`, text `--text-soft`. Error → border `--error`, and on focus the outline colour becomes `--error`.

```css
.field { display: flex; flex-direction: column; margin-bottom: var(--sp-3); }
.label { font-size: var(--fs-sm); font-weight: var(--fw-medium); color: var(--text); margin-bottom: var(--sp-x); }
.control {
  min-height: var(--field-h); padding: 0 var(--field-px);
  font-family: var(--ff-text); font-size: var(--fs-body); color: var(--text);
  background: var(--field-bg); border: 1px solid var(--field-border);
  border-radius: var(--r-sm); transition: border-color var(--t-fast);
}
.control::placeholder { color: var(--text-soft); }
.control:hover:not(:disabled) { border-color: var(--field-border-hov); }
.control:focus-visible { border-color: var(--field-border-foc); }
.control:disabled { background: var(--field-disabled-bg); color: var(--text-soft); cursor: not-allowed; }
.control[aria-invalid="true"] { border-color: var(--error); }
.control[aria-invalid="true"]:focus-visible { outline-color: var(--error); }
.help  { font-size: var(--fs-sm); color: var(--text-soft); margin-top: var(--sp-x); }
.error { font-size: var(--fs-sm); color: var(--error); margin-top: var(--sp-x); }
```

### 3.4 Checkbox & radio

20px box, radius `--r-xs` for checkbox and `--r-full` for radio, 1px `--field-border`, checked state fills `--cr-600` with a white mark. Label sits to the right, `--fs-body`, and the whole label is clickable. Hit area is at least 44×44 even though the visual box is 20px. Never hide the native input from assistive technology — position it over the visual box at `opacity: 0`.

### 3.5 Card

**Base:** background `#FFFFFF`, radius `--r-md`, padding `--sp-3`, shadow `--sh-card`, 1px solid `--n-200`.
**Hover** (only when the whole card is a link): `translateY(-4px)`, shadow `--sh-hover`, border `--n-300`, `--t`.
**On dark surfaces:** background `--glass-d`, border `--glass-d-border`, `backdrop-filter: blur(12px)`, text `--text-inv`.

If the card is a link, the **whole card is one `<a>`** — never nest a second interactive element inside it. Use `::after { position:absolute; inset:0 }` on the title link so the entire card is clickable while the accessible name stays the title.

### 3.6 Library item card

**Anatomy:** thumbnail (16:9, `--r-sm`, `object-fit: cover`) · type badge, top-left over the thumbnail · lock badge, top-right, only for members-only items · duration pill, bottom-right · title (`h3`, max 2 lines, `-webkit-line-clamp: 2`) · teacher name (`--fs-sm`, `--text-soft`) · date and series (`--fs-sm`, `--text-soft`).

Thumbnail placeholder while loading: `--n-200` block, no spinner. Missing thumbnail: `--n-200` with the type emoji centred at 32px, `aria-hidden`.

Grid: `.g3` on desktop, 2-col at `--bp-lg`, 1-col at `--bp-md`.

### 3.7 Badge

| Variant | Background | Text | Use |
|---|---|---|---|
| `type` | `--glass-d` + blur | `--text-inv` | Video / Audio / Script, over a thumbnail |
| `lock` | `--cr-800` | `--go-300` | Members-only |
| `live` | `--error` | `#FFFFFF` | On air. Includes a pulsing dot — suppressed under reduced motion. |
| `status-pending` | `--warning-bg` | `--warning` | Comment or booking pending |
| `status-ok` | `--success-bg` | `--success` | Approved, confirmed, published |
| `status-off` | `--n-200` | `--text-mid` | Draft, inactive |
| `master` | `--go-600` | `#FFFFFF` | Beside a master's name on their comments |

All badges: `--fs-label`, weight 600, `--ls-label`, padding `4px 10px`, radius `--r-full`. Uppercase for Latin only.

### 3.8 Tabs

Used for the library type filter (`All · Video · Audio · Scripts`). Each tab is a real link to its own URL, not a click handler.

Inactive: `--text-mid`, transparent 2px bottom border. Active: `--text`, weight 600, 2px `--cr-600` bottom border. Hover: `--text`, border `--n-300`. Container has a 1px `--n-200` bottom rule. Overflows horizontally with `overflow-x: auto` below `--bp-md` — never wrap to a second line. Mark up as `<nav>` with `aria-current="page"` on the active tab.

### 3.9 Filter facet

Desktop: left sidebar, 260px, sticky at `top: calc(var(--nav-h) + var(--sp-2))`. Below `--bp-lg`: a "Filters" button opening a bottom sheet with Apply and Clear all.

Each group: a heading (`--fs-sm`, weight 600) and checkbox rows with a result count in `--text-soft`. Applied filters appear above the results as removable chips (radius `--r-full`, `--n-100` background, `×` button with an `aria-label` from the translations). Every filter change updates the URL query string.

### 3.10 Table — admin only

Header: `--n-100` background, `--fs-sm`, weight 600, `--text-mid`, `text-align: start`, padding `var(--sp-1) var(--sp-2)`. Rows: 1px `--n-200` bottom border, padding `var(--sp-2)`, hover `--n-50`. Numeric columns are right-aligned and use `font-variant-numeric: tabular-nums`.

Below `--bp-md` tables do **not** scroll horizontally — each row becomes a stacked card with `label: value` pairs. Row actions live in a trailing cell as `ghost` buttons, never as an icon whose meaning is unlabelled.

Selection: a checkbox in the leading cell, plus a select-all in the header. When any row is selected, a bar appears above the table with the count and the bulk actions.

### 3.11 Modal / dialog

Implement with the native `<dialog>` element. Overlay `rgba(28,0,8,.55)`, panel `#FFFFFF`, radius `--r-md`, shadow `--sh-modal`, `max-width: 520px`, `width: calc(100% - var(--sp-4))`, `max-height: 85vh` with the body scrolling.

Header: title (`h3`) plus a close button (`ghost`, `aria-label` from translations). Footer: actions right-aligned, primary last; stacked full-width below `--bp-sm`.

Required behaviour: focus moves to the panel on open and returns to the trigger on close; focus is trapped while open; Escape closes; the background does not scroll; `aria-labelledby` points at the title. Below `--bp-sm` the modal becomes a bottom sheet — full width, radius on the top corners only, entering with `translateY`.

### 3.12 Toast

Provided by `sonner`, restyled to these tokens. Bottom-right on desktop, top and full width below `--bp-sm`. Background `#FFFFFF`, 1px `--n-200`, radius `--r-sm`, shadow `--sh-card`, with a 3px leading bar in the semantic colour. Auto-dismiss after 5s; error toasts do not auto-dismiss. Container is an `aria-live="polite"` region — `assertive` for errors. Never put a destructive action inside a toast; the only permitted action is Undo.

### 3.13 Pagination

Used wherever a list can exceed 24 items. Previous / page numbers / Next, each a real link with its own URL. Current page: `--cr-600` background, `--text-inv`, `aria-current="page"`. Disabled arrows are dimmed and non-focusable. Below `--bp-sm` show only Previous, "Page 3 of 12", and Next.

### 3.14 Breadcrumb

On library item and service detail pages only (App Flow A6). Separator is `·` set `aria-hidden`. Items are `--fs-sm`, `--text-soft`; the current page is `--text-mid`, not a link, and carries `aria-current="page"`. Wrap in `<nav aria-label>` with the label from the translations.

### 3.15 Empty state

**Anatomy:** emoji at 32px (`aria-hidden`) · heading (`h4`) · one sentence of body (`--fs-body`, `--text-soft`, `max-width: 42ch`) · exactly one action, or none.

Centred, `padding-block: var(--sp-6)`, no border, no card, no illustration. Never leave a container simply blank. Copy comes from §7.7 — do not write it fresh.

### 3.16 Skeleton

Background `--n-200`, radius matching the element it replaces, with a shimmer sweeping over 1.4s — replaced by a static `--n-200` block under reduced motion. Use for grids and lists. Never for a button or an action already in flight; those use the button's own loading state. Skeleton containers carry `aria-busy="true"` and the count of skeletons matches the expected result count where known.

### 3.17 Avatar

Circle, sizes 32 / 40 / 64px. Fallback is initials on `--cr-700` with `--text-inv`, weight 600. If no name exists, a neutral `--n-300` circle with no glyph — never a stock silhouette. `alt=""` when a name sits beside it.

### 3.18 Comment

**Anatomy:** avatar (32px) · author name (weight 500) with the `master` badge where applicable · relative timestamp (`--fs-sm`, `--text-soft`, with the absolute date in `title`) · body (`--fs-body`, `--text-mid`, preserving line breaks) · actions row (Reply, Delete own, Report).

Replies indent one level only, `margin-inline-start: var(--sp-4)`, with a 2px `--n-200` rule on the leading edge. **Never a second level.**

A pending comment (visible to its author alone) sits on `--warning-bg` with a `status-pending` badge reading the §7.7 string. Deleted-by-moderator comments are removed entirely, not tombstoned.

### 3.19 Inline alert

Four variants matching the semantic colours: background is the `-bg` token, 1px border in the solid colour at 30% opacity, 3px leading bar in the solid colour, radius `--r-sm`, padding `--sp-2`. Icon plus text — never colour alone. Error alerts summarising a failed form must list each failing field as a link to it. Placed above the element they describe, never below.

### 3.20 Navigation

**Desktop:** height `--nav-h`, sticky, `z-index: var(--z-nav)`. Transparent over the hero, transitioning to `--glass` with `backdrop-filter: blur(16px)` and a 1px `--n-200` bottom border once scrolled past 40px. Brand at the leading edge; links centred; search, language switch and account at the trailing edge.

Link: `--fs-body`, `--text-mid`, hover `--text` with a 2px `--cr-600` underline growing from the centre over `--t-fast`. The active section link is `--text`, weight 500, with `aria-current`.

**Mobile** (below `--bp-lg`): hamburger opening a full-height drawer from the trailing edge, `z-index: var(--z-drawer)`, `--n-50` background, links stacked at `--fs-h4`. Focus is trapped while open; Escape closes; the toggle carries `aria-expanded` and `aria-controls`.

**Language switcher:** three buttons labelled `EN` · `中文` · `བོད`, each rendered in its own typeface. The active one has `--cr-600` background and `--text-inv`. Each is a link to the same page under the other locale — never a client-side state toggle, since locale is a route. Group carries an `aria-label` from the translations.

### 3.21 Live banner

Sitewide while a stream is on air (App Flow A4). Full width, above the nav, `--cr-800` background, `--text-inv`, height 44px, `z-index: calc(var(--z-nav) + 1)`. Contains the `live` badge, the session title, and a "Watch now" link to `/live`. Dismissible per session, stored in `sessionStorage`. Adds its height to the sticky offset of everything below it.

### 3.22 Media surfaces

**Video page:** `lite-youtube-embed` in a 16:9 container, radius `--r-md`, `overflow: hidden`, `--n-200` background before load. Never `autoplay`. If the embed is blocked by the viewer's network, show the §7.7 fallback with a link to watch on YouTube.

**Audio mini-player:** fixed to the bottom, full width, height 64px, `--cr-900` background, `--text-inv`, `z-index: var(--z-sticky)`, shadow `--sh-dark`. Contains play/pause, title, elapsed and total time, a seek bar, and close. Survives navigation. Below `--bp-sm` it collapses to 52px and hides the seek bar. Never plays automatically.

**PDF reader:** `react-pdf` in a container capped at `--wrap-text`, with page controls above (page N of M, previous, next, zoom) and the download button present only when the item permits it (App Flow B13). Loading shows a skeleton at page proportions. Failure shows the §7.7 message with a download link where allowed.

### 3.23 Admin shell

A quieter surface. Same tokens, none of the ceremony.

| Property | Admin value | Differs from public how |
|---|---|---|
| Background | `--n-50` | No gradients anywhere |
| Headings | `--ff-body`, weight 600 | **No display serif** — Inter throughout |
| Section padding | `--sp-4` | Denser than `--sp-7` |
| Card radius | `--r-sm` | Tighter than `--r-md` |
| Shadows | none, 1px `--n-200` borders instead | Flat |
| Motion | `--t-fast` only | No reveals, staggers or count-ups |
| Emoji | **forbidden** | Public site only |
| Container | `--wrap-admin` | Wider, for tables |

**Layout:** 240px sidebar at the leading edge (`--n-100` background, 1px trailing border), collapsing to a top bar with a menu button below `--bp-lg`. Sidebar items are `--fs-body`, `--text-mid`; the active item has `--n-200` background, `--text`, and a 3px `--cr-600` leading bar.

**Work queue landing screen** (App Flow H50): a `.g4` row of counter cards. Each card shows the count at `--fs-h2` in `--ff-body` weight 600, the label beneath at `--fs-sm` `--text-soft`, and links to the task. A zero count renders in `--text-soft` and is not a link. When every count is zero, replace the row with the §7.7 all-clear message.

---

## 4. State patterns

Every list, grid and data surface implements all four states. A screen is not done until all four have been seen working.

| State | Treatment |
|---|---|
| **Loading** | Skeletons (§3.16) matching the shape and expected count of the result. Never a bare spinner on a full page. Never a blank screen. |
| **Empty** | Empty state (§3.15) with copy from §7.7. Distinguish "nothing exists yet" from "your filters matched nothing" — they need different copy and different actions. |
| **Error** | Inline alert (§3.19) with copy from §7.8, and a retry action wherever retrying could plausibly help. |
| **Populated** | The normal case. |

### 4.1 Form validation

Validate on **blur** for a field the user has left, and on **submit** for everything. Never validate on every keystroke while a field is still being typed into — the first character of an email address is always invalid and telling someone so is hostile.

On a failed submit: focus moves to the first invalid field; an inline alert above the form summarises the failures, each named field a link to itself; every invalid control carries `aria-invalid="true"` and `aria-describedby` pointing at its message. Nothing the user typed is ever discarded.

### 4.2 Gated content

A members-only item shown to a guest (App Flow B16) keeps its title, teacher, description and thumbnail, and replaces the player or download with a panel: lock badge, the §7.7 gated string, and a `primary` button to sign in that returns the user to this exact item. Never a bare "403". Never hide the item from listings.

### 4.3 Session expiry

If a session expires mid-action, the draft is preserved (App Flow I57), sign-in opens per App Flow D26, and on success the user returns to the same place with their input intact. Losing a half-written comment is not acceptable.

---

## 5. Page templates

| Template | Container | Sections |
|---|---|---|
| **Marketing** (Home, Masters, Services, About, Visit) | `--wrap` | Alternating surfaces per §2.3, `--sp-7` rhythm, full v4 motion |
| **Index** (library, search results) | `--wrap` | Page header · tabs · facets + results grid · pagination |
| **Detail** (video, audio, script, service) | `--wrap`, prose capped at `--wrap-text` | Breadcrumb · media or hero · metadata · body · related · comments |
| **Form** (booking, donate, auth) | `--wrap-text` | Page header · one-column form · optional supporting card below |
| **Account** | `--wrap` | Page header · tab nav · panel |
| **Admin** | `--wrap-admin` | Sidebar · page header · content, per §3.23 |

Every page has exactly one `h1`. Heading levels never skip.

---

## 6. Accessibility requirements

Target is **WCAG 2.1 AA**, enforced, not aspired to.

- Contrast: only the pairings in §2.4. Never a colour combination absent from that table.
- Focus: §2.9 on every interactive element. Tab order follows visual order. Nothing is reachable by mouse but not by keyboard.
- A skip-to-content link is the first focusable element on every page, visible on focus.
- Landmarks: one `<header>`, one `<nav>`, one `<main>`, one `<footer>` per page. All named where more than one of a kind exists.
- Images: meaningful ones get real `alt`; decorative ones get `alt=""`. Never a filename as alt text.
- Every form control has a programmatically associated `<label>`. Placeholders are never labels.
- Live regions: toasts, live chat and validation summaries use `aria-live`.
- `lang` is set correctly on `<html>` per locale, and on any inline span that switches language — a Tibetan phrase inside English copy carries `lang="bo"`, so screen readers pronounce it correctly.
- Touch targets are at least 44×44, including icon-only buttons.
- Nothing conveys meaning by colour alone.
- Video carries captions where available; the player is keyboard operable.
- Layout survives 200% zoom and a 320px viewport without horizontal scrolling.
- `prefers-reduced-motion` is honoured everywhere (§2.2).

---

## 7. Content & voice guidelines

These are not stylistic preferences. This is a religious institution with a lineage, three languages, and services people approach at the hardest moments of their lives.

### 7.1 Voice

**Serene, plain, welcoming, never transactional.** The reader may be a lifelong practitioner or someone who has never met a Buddhist. Write so both are addressed without either being patronised.

| Do | Don't |
|---|---|
| "All teachings are offered freely." | "Get free access now!" |
| "Please call before your first visit." | "Book your slot today!" |
| "The recording will appear in the library shortly." | "Coming soon!!" |
| "We will reply to your request." | "We'll get back to you ASAP." |
| Sentence case for all UI text | Title Case For Interface Labels |
| One clear action per screen | Competing calls to action |

Never use: urgency ("limited time", "don't miss out"), growth-marketing framing ("join 1,000+ members", "unlock"), exclamation marks outside a genuine greeting, emoji inside body copy, or the word "free" as a selling point — the dharma is not free as a promotion, it is not for sale at all.

### 7.2 Names and honorifics — exact forms

These are fixed. Never abbreviate, reorder or paraphrase.

| Person | Full form on first mention | Subsequent | Never |
|---|---|---|---|
| Founder | **Venerable Geshe Sonam Topgyal** | Geshe Sonam Topgyal, or **Geshe-la** in warm context | "Sonam", "Mr. Topgyal", "the Geshe" |
| | Sera Mey Monastery graduate; Gyuto (Upper Tantric College) certified; originally from Litang | | |
| Master | **His Eminence Gazi Rinpoche** | Gazi Rinpoche | "Gazi" |
| Master | **His Eminence Aza Rinpoche** | Aza Rinpoche | "Aza" |
| | Ngarampa (Ph.D.) from Gyuto | | |

"Rinpoche" and "Geshe" are titles, never surnames. "-la" is an honorific suffix — correct in Tibetan-inflected English (Geshe-la), never appended to an English title.

### 7.3 The centre's own name

| Language | Form |
|---|---|
| English | **Bodhisamadhi Center** (American spelling — matches the charity registration and the existing domain) |
| Tibetan | **བྱང་ཆུབ་བསམ་གཏན་གླིང་།** |
| Descriptor | "A Gelug Tibetan Buddhist dharma centre in Toronto" |

> **⚠ NEEDS A DECISION — do not resolve this in code.** The Chinese name is inconsistent across existing materials: `bodhisamadhi-v4.html` and the PRD use **菩提禅院**, while the June project overview uses **菩提三摩地中心**. Both appear in committed documents. The project owner must choose one; until then, use **菩提禅院** (the newer, and the one the Master has seen in v4) and flag any occurrence of the other.

Note the mixed spelling convention: "Center" in the organisation's name, "centre" in prose. That is deliberate — the legal name is fixed, the surrounding prose follows Canadian usage.

### 7.4 Dharma terminology — canonical spellings

Use exactly these forms. They match v4 and are internally consistent; do not "correct" them toward other transliteration schemes.

| Use | Not |
|---|---|
| Vajrayāna (with macron) | Vajrayana, Vajrayanna |
| Lamrim | Lam Rim, Lam-rim |
| Madhyamaka | Madhyamika |
| Yamantaka | Yamāntaka |
| Vajrayogini | Vajrayoginī |
| puja | pūjā, Puja (mid-sentence) |
| sadhana | sādhana |
| tsog | tsok, tshogs |
| phowa | 'pho ba, powa |
| Gelug | Geluk, Gelugpa (in prose) |
| Dzambhala | Jambhala, Zambala |
| Geshe, Rinpoche, Ngarampa | geshe, rinpoche (lowercase) |
| dharma (common noun) | Dharma, unless part of a proper name such as "Dharma Intro" |
| Guru Puja (Tsok) | guru puja |
| Lungta (Wind Horse Flags) | lungta, wind-horse |
| Life Release (Tse Tar) | tse tar, life-release |
| Empowerment & Fire Puja (Homa) | homa puja, fire-puja |

Capitalise the names of specific practices, deities and services. Lowercase generic nouns: "a puja", "the dharma", "our masters", "the lineage".

### 7.5 The nine services — fixed trilingual names

Extracted from v4 and canonical. Never re-translate these in code; they live in the message catalogue.

| English | 中文 | བོད་ཡིག |
|---|---|---|
| Dharma Intro | 佛法导论 | ཆོས་ཀྱི་འཇུག་སྒོ། |
| Scripture Study | 经典研习 | གཞུང་ཆེན་བཀའ་པོད། |
| Meditation | 禅修指导 | སྒོམ་ཉམས་ལེན། |
| Blessings | 祈福法会 | སྨོན་ལམ་ཆོ་ག། |
| Butter Lamp | 供灯积福 | མར་མེ་ཕུལ་བ། |
| Dedication | 超荐回向 | བསྔོ་བ་སྨོན་ལམ། |
| Counseling | 心灵辅导 | སེམས་ཁམས་བརྟག་དཔྱད། |
| Guidance (End-of-Life) | 临终关怀 | འདས་ལམ་འདྲེན་པ། |
| Assembly | 居士共修 | ཆོས་ཚོགས། |

> **All Tibetan in the prototype is machine-generated and unreviewed.** It must be read by Geshe-la or a fluent reader before publication. Do not treat the Tibetan column as final.

### 7.6 Fixed facts — never paraphrase, never localise

| Field | Exact value |
|---|---|
| Charity registration | **713674927RT0001** |
| Address | 602 Gordon Baker Rd, North York, ON M2H 3B4, Canada |
| Phone | +1 647-708-5877 |
| Email | bodhisamadhicenter@gmail.com |
| Hours | Mon–Sun, 6:00–11:00 am (call before visiting) |
| Founded | 2016, Toronto |
| Facebook | facebook.com/bodhi.samadhi.3 |

These render identically in all three languages. Only the surrounding label is translated.

### 7.7 Empty-state copy — use verbatim

English canonical; `zh` and `bo` come from the message catalogue. Warm and plain, never cute (App Flow I55).

| Context | Heading | Body | Action |
|---|---|---|---|
| Library, nothing uploaded | The library is being prepared | Teachings will appear here as they are recorded. Please return soon. | — |
| Filters match nothing | No teachings match these filters | Try removing a filter, or browse everything. | Clear all filters |
| Search, no results | No results for "{query}" | Try a different word, or browse the library by topic. | Browse the library |
| Live, nothing scheduled | No live session is scheduled | The weekly teaching is held on Saturdays. Times are announced here and by email. | See the schedule |
| Item, no comments | No comments yet | Be the first to share a reflection. | — |
| Account, no bookings | You have no requests yet | When you request a service, it will appear here. | Browse services |
| Account, no donations | You have no offerings recorded | Offerings you make will appear here, with your tax receipts. | — |
| Account, no comments | You have not commented yet | Comments you post will appear here with their status. | — |
| Master, no teachings | No teachings from this master yet | Recordings will appear here as they are published. | — |
| Admin queue empty | Nothing needs your attention | The moderation queue is clear. | — |
| Gated item, guest | This teaching is for members | Sign in to watch. Membership is free — it exists so the center knows who is studying, not to restrict the dharma. | Sign in |
| Pending comment (author only) | Pending review — visible to you | Your comment will appear once a moderator has reviewed it. | — |

### 7.8 Error copy — use verbatim

State what happened, then what to do. Never blame the user, never expose a stack trace, never say "oops".

| Situation | Message |
|---|---|
| 404 | This page could not be found. It may have moved. Try searching, or start from the library. |
| 500 | Something went wrong on our side. Please try again in a moment. If it keeps happening, please let us know at bodhisamadhicenter@gmail.com. |
| Offline | You appear to be offline. Your work has been kept — reconnect and try again. |
| Session expired | You have been signed out. Sign in again and you will return to where you were. |
| Payment declined | The payment was not completed. No offering has been taken. Please check the card details or try another method. |
| Upload too large | This file is larger than the {limit} limit. Please upload a smaller file. |
| Upload failed | The upload did not complete. Please try again. |
| YouTube blocked | This video cannot be shown on your network. You can watch it on YouTube instead. |
| PDF failed to load | This text could not be displayed. You can download it instead. |
| Live stream dropped | The stream has been interrupted. This page will reconnect automatically. |
| Form has errors | Please check the fields marked below. |
| Required field | This field is required. |
| Invalid email | Please enter a valid email address. |
| Booking submitted | Your request has been received. We will reply by email. |

### 7.9 Trilingual parity — hard rules

1. **No string ships in one language only.** Every key exists in `en`, `zh` and `bo` message files.
2. **Never hard-code display text in a component.** Every visible string comes from the catalogue, including `aria-label`, `alt`, `title` and placeholder text.
3. **Never concatenate translated fragments.** Use interpolation — `t('greeting', {name})` — because word order differs across the three languages.
4. **Never machine-translate at build or run time.**
5. **Missing content translation:** show the best available language with an inline note (App Flow K64) — "This teaching is not yet available in བོད་ཡིག." Never hide the item, never show a blank page.
6. **Never apply `text-transform: uppercase`** to Chinese or Tibetan. Latin only.
7. **Dates, times and numbers** are formatted with `date-fns` locales, never assembled by hand. Times display in America/Toronto with the zone named, since the audience is partly overseas.
8. **Layout must survive a 40% text-length increase.** German is not a target, but Tibetan runs long and Chinese runs short — never size a container to the English string.

### 7.10 Donation copy — the hardest rule

The PRD principle is that the dharma is never traded for profit. That has concrete consequences for copy:

- Never place a donation prompt above, beside, or adjacent to the submit button of a service request (App Flow F40).
- Never phrase access in commercial terms: no "unlock", "get", "purchase", "upgrade", "premium", "supporter-only".
- Say "offering" or "support" in preference to "payment" wherever the mechanism allows it. "Payment" is acceptable only in the checkout itself, where clarity about money matters more than register.
- Never imply that giving improves access, standing, or the master's attention.
- Always state that giving is optional, on every surface where it is offered.
- Suggested amounts are suggestions and must be presented as such, with a free-entry field of equal prominence.
- Tax-receipt language is regulatory and precise — never rewritten for tone.

### 7.11 Sensitive services — Counseling, End-of-Life Guidance, Puja by Request

- The pastoral disclaimer appears **above the form fields**, prominently (App Flow F37): these are spiritual and pastoral guidance, **not licensed clinical therapy or medical advice**, with a line directing anyone in crisis to professional and emergency resources.
- Never phrase the disclaimer as legal self-protection. It is there so a person in distress finds the right help.
- A privacy note states that requests are handled confidentially by the masters.
- No urgency, no marketing, no testimonials, no photography of grieving people, no emoji anywhere on these pages.
- Field labels are gentle: "How can we help?" rather than "Describe your issue".

---

## 8. Definition of done

A component or page is complete only when every line is true:

- [ ] No hard-coded colours, sizes, spacings, radii or durations — tokens only
- [ ] Default, hover, focus-visible, active, disabled, loading, empty and error states all implemented
- [ ] Keyboard-operable end to end; focus visible per §2.9; tab order matches visual order
- [ ] Contrast verified against §2.4 — no pairing outside that table
- [ ] Every string from the message catalogue, present in `en`, `zh` and `bo`
- [ ] Tested at 320px, 480px, 700px, 960px and 1440px
- [ ] Renders correctly in all three locales, including Tibetan line height and Chinese fonts
- [ ] `prefers-reduced-motion` honoured
- [ ] Screen-reader pass: landmarks, labels, live regions, heading order
- [ ] Copy taken from §7, not improvised

---

## 9. Implementation conventions

```
src/
├── app/[locale]/...              # next-intl routing
├── components/
│   └── Button/
│       ├── Button.tsx
│       └── Button.module.css
├── styles/
│   ├── tokens.css                # §2.1 — the ONLY file with hex values
│   ├── base.css                  # reset, base type, focus, reduced motion
│   └── surfaces.css              # §2.3 surface classes
└── messages/{en,zh,bo}.json
```

- CSS Modules only. No global class names except surfaces and layout helpers (`.wrap`, `.g2`, `.g3`, `.g4`).
- Class names camelCase; one component per folder.
- Logical properties (`padding-inline`, `margin-block`, `inset-inline-start`) rather than left/right.
- Server Components by default; `'use client'` only where interaction requires it.
- No inline `style` attributes except for genuinely dynamic values such as a progress width.
- No `!important` outside the reduced-motion block in §2.2.

---

## 10. Open items

| # | Item | Needs |
|---|---|---|
| 1 | **Chinese name of the centre** — 菩提禅院 vs 菩提三摩地中心 (§7.3) | Project owner decides. Both are in committed documents today. |
| 2 | **Tibetan review** — all Tibetan across v4 and this document is machine-generated | Geshe-la or a fluent reader, before publication |
| 3 | **The App Flow Document does not exist yet.** This document's component inventory was derived from the answered decisions in `2-App-Flow-Open-Questions.md`, not from an agreed screen list. | Write the App Flow Document, then reconcile §3 and §5 against it |
| 4 | Real photography for masters and gallery — currently CSS/SVG placeholders | Replace before launch; `next/image` defaults changed in Next 16 (see stack doc §11) |
| 5 | Emoji icon set (§2.8) | Chosen deliberately; revisit if cross-platform rendering proves distracting |

---

*Prepared for Bodhisamadhi Center. Contrast ratios measured 2026-08-30. May all sentient beings be happy.*
