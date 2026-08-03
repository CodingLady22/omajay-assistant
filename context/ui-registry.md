# UI Registry

Living document. **Maintained by the `/imprint` skill** — run `/imprint` after building any UI component and it extracts the component's visual patterns into this file. Run `/imprint audit` to scan the whole codebase and establish a baseline.

Read this before building any new component — match existing patterns before inventing new ones.

---

## How to Use

Before building any component:

1. Check if a similar component already exists here.
2. If yes — match its exact classes and structure.
3. If no — build it following `ui-rules.md`, `ui-tokens.md`, and the design at `context/designs/glam-ai.html`.

After building any component — run **`/imprint`** to capture it here. Don't fill this file by hand unless `/imprint` isn't available.

---

## Components

### Sidebar

File: client/src/components/layout/Sidebar.tsx
Last updated: 2026-06-25

| Property         | Class                                                  |
| ---------------- | ------------------------------------------------------- |
| Background       | `bg-surface-secondary`                                   |
| Border            | `border-border` (right border on the rail)               |
| Border radius     | `rounded-md` (nav items)                                 |
| Text — primary    | `text-text-primary` (hover state)                        |
| Text — secondary  | `text-text-secondary` (default nav text, group labels)   |
| Spacing           | `px-2.5 py-2` item padding · `gap-[9px]` icon/label gap   |
| Hover state       | `hover:bg-surface hover:text-text-primary`               |
| Shadow            | none                                                     |
| Accent usage      | active item: `bg-pink-light text-pink font-medium`        |

**Pattern notes:**
Active state for any nav-style list is always `bg-pink-light text-pink font-medium` — reuse this exact triple, never invent a new "selected" treatment. Responsive label-hiding uses `sm:hidden lg:inline` (text) / `sm:hidden lg:block` (group labels) to collapse into an icon-only rail at tablet width and a full mobile drawer below `sm:` — reuse this exact class pair for any other responsive nav rather than a new collapse mechanism. The mobile drawer's backdrop uses `bg-backdrop/40` (the `--color-backdrop` token from `ui-tokens.md`) — reuse this for any future modal/sheet scrim instead of a one-off `bg-black/*`.

---

### Topbar

File: client/src/components/layout/Topbar.tsx
Last updated: 2026-06-25

| Property         | Class                                            |
| ---------------- | -------------------------------------------------- |
| Background       | `bg-surface`                                       |
| Border            | `border-border` (bottom border)                    |
| Border radius     | `rounded-md` (icon buttons, 30x30px)               |
| Text — primary    | `text-text-primary` (title base word)              |
| Text — secondary  | `text-text-secondary` (icon button default)        |
| Spacing           | `px-[22px] py-[14px]`                              |
| Hover state       | `hover:bg-surface-secondary hover:text-text-primary` |
| Shadow            | none                                               |
| Accent usage      | title accent word: `italic text-pink` + `font-display` |

**Pattern notes:**
Page title pattern is always `{titleBase}<span className="font-display italic text-pink">{titleAccent}</span>` — every future page heading should follow this exact two-part split (plain base word(s), italic pink accent word(s)), driven by the shared config in `client/src/lib/routes.ts`.

---

### ComingSoonPanel

File: client/src/components/layout/ComingSoonPanel.tsx
Last updated: 2026-06-25

| Property         | Class                                  |
| ---------------- | ----------------------------------------- |
| Background       | none (transparent, inherits page surface)  |
| Border            | none                                       |
| Border radius     | none                                       |
| Text — primary    | `text-text-primary` (13px medium heading)  |
| Text — secondary  | `text-text-secondary` (icon + 12px body)   |
| Spacing           | `gap-3` · `px-[22px] py-[18px]`             |
| Hover state       | none (static)                              |
| Shadow            | none                                       |
| Accent usage      | none                                       |

**Pattern notes:**
`px-[22px] py-[18px]` is the standard panel-body padding — every future real panel (Trends, Scripts, Calendar, DMs, Contracts, Settings) should open its content area with this exact padding so the layout doesn't shift when a placeholder gets replaced with real content.

---

### MessageBubble

File: client/src/components/chat/MessageBubble.tsx
Last updated: 2026-06-25

| Property         | Class                                                          |
| ---------------- | ---------------------------------------------------------------- |
| Background       | AI: `bg-surface-secondary` · User: `bg-pink-light`                |
| Border            | none                                                              |
| Border radius     | `rounded-[14px]` with one corner flipped to `rounded-bl-[4px]` (AI) or `rounded-br-[4px]` (user) |
| Text — primary    | AI: `text-text-primary`                                           |
| Text — secondary  | User: `text-pink-dark`                                            |
| Spacing           | `gap-2.5` avatar/bubble gap · `px-3.5 py-2.5` bubble padding       |
| Hover state       | none                                                              |
| Shadow            | none                                                              |
| Accent usage      | AI avatar: `bg-pink-light text-pink` · User avatar: `bg-coral-light text-coral` |

**Pattern notes:**
The asymmetric "tail" corner (one corner at 4px, the rest at 14px, mirrored by role) is the canonical chat-bubble shape — reuse for any future bubble-style UI. The AI/user avatar color pairing (pink vs coral) is fixed and shouldn't be swapped or reused for other meanings.

---

### QuickChips

File: client/src/components/chat/QuickChips.tsx
Last updated: 2026-06-25

| Property         | Class                                                  |
| ---------------- | --------------------------------------------------------- |
| Background       | transparent default → `bg-pink-light` on hover              |
| Border            | `border-border` default → `border-pink-mid` on hover        |
| Border radius     | `rounded-full`                                             |
| Text — primary    | n/a                                                        |
| Text — secondary  | `text-text-secondary` default → `text-pink` on hover        |
| Spacing           | `px-[11px] py-1` chip padding · `gap-1.5` between chips      |
| Hover state       | `hover:border-pink-mid hover:bg-pink-light hover:text-pink`  |
| Shadow            | none                                                       |
| Accent usage      | pink on hover                                              |

**Pattern notes:**
This is the canonical "chip" pattern — a transparent pill that fills `pink-light` on hover. Reuse it for any other quick-action/secondary button (e.g. a future "+ Add event" or "Expand script" action) instead of styling a new pill button from scratch.

---

### ChatPanel (input row)

File: client/src/components/chat/ChatPanel.tsx
Last updated: 2026-06-25

| Property         | Class                                          |
| ---------------- | ------------------------------------------------ |
| Background       | textarea: `bg-surface` · send button: `bg-pink`    |
| Border            | `border-border` default → `focus:border-pink-mid` |
| Border radius     | `rounded-md` (both textarea and send button)       |
| Text — primary    | `text-text-primary` (textarea)                    |
| Text — secondary  | n/a                                                |
| Spacing           | `px-[22px] py-3` input area · `gap-2` row          |
| Hover state       | send button: `hover:opacity-85`                    |
| Shadow            | none                                               |
| Accent usage      | send button: `bg-pink` + white icon                |

**Pattern notes:**
`bg-pink` + white icon/text + `hover:opacity-85` + `rounded-md` is the canonical primary-button treatment per `ui-tokens.md` — reuse it for every other primary action (e.g. a future "Approve & send" DM button) instead of introducing a new button style.

---

### TrendCard

File: client/src/components/trends/TrendCard.tsx
Last updated: 2026-08-03

| Property         | Class                                                              |
| ---------------- | ------------------------------------------------------------------- |
| Background       | card: `bg-surface` · thumbnail block: per-item token (e.g. `bg-pink-light`, `bg-yt-bg`, `bg-success-bg`) |
| Border            | `border-[0.5px] border-border` default → `hover:border-pink-mid`   |
| Border radius     | `rounded-lg` (card) · `rounded-full` (platform badge)               |
| Text — primary    | `text-text-primary` (title, 12px medium)                            |
| Text — secondary  | `text-text-secondary` (format label, 10px uppercase, `tracking-[0.08em]`) |
| Spacing           | `px-[11px] py-[9px]` meta padding · `mb-[3px]` / `mb-[5px]` between meta lines |
| Hover state       | `hover:border-pink-mid hover:shadow-card-hover`                     |
| Shadow            | none at rest → `shadow-card-hover` on hover                         |
| Accent usage      | metric line: `text-pink` · platform badge: `bg-ig-bg text-ig` (Instagram) or `bg-yt-bg text-yt` (YouTube), absolute `top-2 right-2` on the thumbnail |

**Pattern notes:**
This is the canonical "clickable card" pattern — a whole-card `<button>` (not a wrapped div+onClick) with `hover:border-pink-mid hover:shadow-card-hover` as the interactive cue instead of a background-color change, since cards stay white per `ui-tokens.md`. `shadow-card-hover` (`--shadow-card-hover`, added this feature) is now the reusable hover-shadow token — any future clickable card (Scripts, Contracts) should reuse this exact hover pair rather than inventing a new one. The thumbnail block's background token is the one place per-item color varies (decorative, not semantic); the platform badge colors are fixed per platform (`ig`/`yt` tokens) and must never swap, matching `ui-tokens.md`'s "Platform badge colours are fixed" invariant.
