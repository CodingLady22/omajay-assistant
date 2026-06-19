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

_Empty. Components will be added here as they are built._

<!--
Entry template:

### ComponentName
- **Path:** client/src/components/.../ComponentName.tsx
- **Used in:** which pages
- **Key classes:** bg-surface border-border rounded-[14px] ...
- **Notes:** anything non-obvious
-->
