# UI Tokens

Design tokens for the Glam AI dashboard. Every colour, font, and radius comes from the delivered design at `context/designs/glam-ai.html`. Use these exact values — never hardcode hex in components, never use raw Tailwind colour classes.

---

## How to Use

This project uses **Tailwind CSS v4**. Tokens are defined with the `@theme` directive in `web/src/index.css`. No `tailwind.config.ts` is needed for colours or tokens — Tailwind v4 generates utility classes from the `@theme` variables automatically.

```tsx
// Correct — generated utility class
className="bg-surface text-text-primary border-border"

// Correct — CSS variable directly
style={{ color: 'var(--color-pink)' }}

// Never — hardcoded hex
className="bg-[#D4537E]"

// Never — raw Tailwind colours
className="bg-pink-500 text-gray-600"
```

---

## index.css — Complete Token Definition

```css
@import "tailwindcss";

@theme {
  /* Fonts */
  --font-display: "Playfair Display", serif;
  --font-sans: "DM Sans", sans-serif;

  /* Brand — pink */
  --color-pink: #d4537e;
  --color-pink-light: #fbeaf0;
  --color-pink-mid: #ed93b1;
  --color-pink-dark: #4b1528;

  /* Accent — coral */
  --color-coral: #d85a30;
  --color-coral-light: #faece7;

  /* Surfaces */
  --color-background: #f3edf0;
  --color-surface: #ffffff;
  --color-surface-secondary: #faf7f9;

  /* Borders */
  --color-border: #e8dde4;

  /* Text */
  --color-text-primary: #1a1118;
  --color-text-secondary: #7a6472;

  /* Success — green (active collabs, "on" states) */
  --color-success: #3b6d11;
  --color-success-bg: #eaf3de;

  /* Info — blue (badges, secondary platforms) */
  --color-info: #185fa5;
  --color-info-bg: #e6f1fb;

  /* Platform accents */
  --color-ig: #993556;
  --color-ig-bg: #fbeaf0;
  --color-tt: #444441;
  --color-tt-bg: #f1efe8;
  --color-yt: #a32d2d;
  --color-yt-bg: #fcebeb;

  /* Radius */
  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 14px;
  --radius-full: 9999px;
}
```

Tailwind v4 turns every `--color-*` token into utilities:
`bg-pink`, `text-pink`, `border-pink`, `bg-surface`, `text-text-secondary`, `bg-success-bg`, and so on.

---

## Colour Usage Guide

### Page Layout

| Element           | Token                  |
| ----------------- | ---------------------- |
| Page background   | `bg-background`        |
| Card / panel      | `bg-surface`           |
| Sidebar / muted   | `bg-surface-secondary` |
| Default border    | `border-border`        |

### Typography

| Element                  | Token                   |
| ------------------------ | ----------------------- |
| Headings, primary text   | `text-text-primary`     |
| Secondary, labels, muted | `text-text-secondary`   |
| Brand name / page titles | `text-pink` + display font |

### Brand (Pink)

Used for: active nav item, primary buttons, send button, brand accents, unread dots.

| Element                | Token              |
| ---------------------- | ------------------ |
| Primary background     | `bg-pink`          |
| Light badge background | `bg-pink-light`    |
| Active nav text        | `text-pink`        |

### DM Classification Badges

| Type          | Background        | Text            |
| ------------- | ----------------- | --------------- |
| New inquiry   | `bg-pink-light`   | `text-pink`     |
| Active collab | `bg-success-bg`   | `text-success`  |

### Platform Badges (Trends)

| Platform  | Background | Text       |
| --------- | ---------- | ---------- |
| Instagram | `bg-ig-bg` | `text-ig`  |
| TikTok    | `bg-tt-bg` | `text-tt`  |
| YouTube   | `bg-yt-bg` | `text-yt`  |

### WhatsApp "On" States

Toggle/status text that reads "On" uses `text-success`.

---

## Typography

Two fonts only:

- **Playfair Display** (italic) — brand name, page titles. Decorative, editorial.
- **DM Sans** — everything else. Clean, readable body font.

| Element             | Font     | Size | Weight | Notes                       |
| ------------------- | -------- | ---- | ------ | --------------------------- |
| Brand name          | Playfair | 20px | 400 it | `--color-pink`              |
| Page title          | Playfair | 17px | 400    | accent word in `--color-pink` italic |
| Section heading     | DM Sans  | 13px | 500    | `--color-text-primary`      |
| Body / message text | DM Sans  | 13px | 400    | line-height 1.55            |
| Nav item            | DM Sans  | 13px | 400/500| 500 when active             |
| Label / muted       | DM Sans  | 10-11px | 400 | uppercase 0.1em for section labels |

Import both via Google Fonts in `web/index.html` or `@import` in `index.css`. Never fall back to a system font as the primary.

---

## Spacing

| Token       | Value      | Usage                |
| ----------- | ---------- | -------------------- |
| `gap-1`     | 4px        | Tight inline gaps    |
| `gap-2`     | 8px        | Chip / badge gaps    |
| `gap-3`     | 12px       | Card grid gaps       |
| `gap-4`     | 16px       | Section gaps         |
| `p-4`       | 16px       | Panel body padding   |
| `px-3 py-2` | 12/8px     | Button padding       |
| `px-3 py-1` | 12/4px     | Badge padding        |

---

## Component Tokens

### Shell / Cards

```
background: bg-surface
border: 0.5px solid var(--color-border)
border-radius: 14px (--radius-lg)
box-shadow: 0 8px 40px rgba(80,20,40,0.10), 0 1.5px 4px rgba(80,20,40,0.06)
```

Panels and cards are always white surfaces. Colour lives inside via badges, dots, and text — never on the card background.

### Buttons

**Primary (send / confirm):**

```
background: bg-pink
text: white
border-radius: 10px (--radius-md)
padding: px-3 py-2
```

**Chip (quick action / secondary):**

```
background: transparent
border: 0.5px solid var(--color-border)
text: text-text-secondary
border-radius: 9999px (--radius-full)
padding: 4px 11px
font-size: 11px
hover: border-pink-mid, text-pink, bg-pink-light
```

### Message Bubbles

```
AI bubble:    bg-surface-secondary, text-text-primary, radius 14px, bottom-left 4px
User bubble:  bg-pink-light, text-pink-dark, radius 14px, bottom-right 4px
max-width: 75%
```

### Input

```
background: bg-surface
border: 0.5px solid var(--color-border)
border-radius: 10px
padding: 8px 12px
focus: border-pink-mid
```

### Badges (pills)

```
border-radius: 9999px
padding: 2px 7px
font-size: 10px
font-weight: 500 (collab) / 400 (inquiry)
```

### Avatar

```
size: 32-38px circle
gradient avatar: linear-gradient(135deg, #ED93B1, #D85A30)
text: white, weight 600
```

---

## Invariants

- Never use hex in components — always tokens via Tailwind v4 utilities or CSS vars.
- Two fonts only: Playfair Display (display) and DM Sans (body). Never introduce a third.
- `--color-pink` (#D4537E) is the only brand pink — never use Tailwind's built-in pink scale.
- Cards are always white (`bg-surface`) — never a coloured card background.
- Platform badge colours are fixed per platform — never swap them.
- Active collab is always green (`success`), new inquiry always pink — never reversed.
- Borders default to `--color-border` — never `border-gray-*`.
- Tokens defined in `@theme` in `index.css` — never in a `tailwind.config.ts`.
