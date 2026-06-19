# UI Rules

Concise rules for building the Glam AI dashboard. The design at `context/designs/glam-ai.html` is the source of truth — open it and match it. These rules cover the patterns that keep the UI consistent.

---

## Source of Truth

`context/designs/glam-ai.html` is a working, styled mockup of the entire dashboard. Before building any panel, open it and match its layout, spacing, and classes. When this file and the design disagree, the design wins.

---

## Fonts

Two fonts, imported in `client/index.html` head or via `@import` in `index.css`:

```
Playfair Display (italic) — brand name + page titles only
DM Sans — everything else
```

Both `--font-display` and `--font-sans` are declared in `@theme`. Apply `font-sans` to the root and use `font-display` only on the brand name and page titles. Never use a system font as primary.

---

## Layout

- Two-column shell: fixed 220px sidebar + flexible main area.
- Shell max-width ~900px, centered, with the page background showing around it.
- Shell has rounded corners (14px) and a soft shadow — it floats on the page background.
- Main area is a vertical stack: topbar (fixed height) + active panel (scrolls).
- Sidebar never scrolls with content — it's a fixed rail.

---

## Sidebar

- Brand block at top (Playfair brand name + uppercase subtitle).
- Nav grouped under small uppercase labels ("Workspace", "Comms").
- Active item: `bg-pink-light`, `text-pink`, weight 500.
- Inactive item: `text-text-secondary`, hover lightens background.
- Each item has a 16px icon + label; some have a count badge pushed right.
- Avatar block pinned at the bottom (initials avatar + name + handle).

---

## Panels

Only one panel is visible at a time. Switching nav swaps the panel and updates the page title. The page title uses Playfair with the last word in italic pink (e.g. "Trending *Now*").

---

## Cards

Every content block is a white card:

```
background: bg-surface
border: 0.5px solid var(--color-border)
border-radius: 14px
```

Colour goes inside the card — badges, dots, accents — never on the card surface.

---

## Chat Panel

- Messages stack vertically with 14px gaps.
- AI messages: small `✦` avatar in `pink-light`, bubble in `surface-secondary`.
- User messages: right-aligned, initials avatar, bubble in `pink-light`.
- Quick-action chips sit above the input; they disappear after first use.
- Input row: rounded textarea that auto-grows + circular pink send button.
- A three-dot typing indicator shows while waiting for a reply.

---

## Trends Grid

- Responsive grid, min card width ~158px.
- Each card: coloured thumbnail block (emoji or image) with a platform badge top-right, then platform label, title, and a metric line in pink.
- Cards are clickable — clicking sends a prompt to the chat (in the live app, routes to the content agent).

---

## Calendar Panel

- Month grid with weekday labels; today highlighted in `pink-light`.
- Days with events show a small pink dot.
- Below the grid: an event list with coloured dots, titles, and times.
- "Add event" is a chip that starts the propose-event flow — remember adds are **proposed**, never written silently.

---

## DMs Panel

- A short note at top: "AI-filtered: brand inquiries & active collabs only".
- Each row: avatar, name + classification badge, message preview, timestamp, unread dot.
- New inquiry badge = pink; active collab badge = green.
- Rows are clickable — opens the summary + draft reply.
- Never show a "send" action that fires without confirmation.

---

## Contracts Panel

- List of contract cards: brand, deal summary, status badge (draft/sent).
- Each card has a "Download PDF" action and an "Edit terms" action.
- Make clear the PDF is editable — she downloads, tweaks, and sends herself.

---

## Settings Panel

- WhatsApp briefing section: rows for each briefing type with an "On / time" status in green.
- Connected accounts: Instagram, YouTube, Google Calendar, WhatsApp — each with a connection status.

---

## Empty States

Every panel that can be empty needs a minimal empty state: short muted text, optional icon, and a CTA chip if there's a logical next step.

---

## Tailwind v4 Note

Tokens live in `@theme` in `index.css` — no `tailwind.config.ts`. Add new tokens to `@theme`, never to a config file.

---

## Do Nots

- Never use built-in Tailwind colour classes (`bg-pink-500`, `text-gray-600`) — project tokens only.
- Never put colour on a card background — cards are white.
- Never reverse the classification badge colours (collab = green, inquiry = pink).
- Never show a DM "send" or calendar "add" button that acts without confirmation.
- Never introduce a third font.
- Never use `position: fixed` for panels — use normal flow inside the shell.
- Never stack more than two levels of border-radius.
