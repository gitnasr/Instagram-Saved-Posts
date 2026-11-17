# Design system

The app dashboard and the landing page share one set of tokens. The landing page is the source of truth for the look; this file is the source of truth for how the app applies it. Change this file in the same commit as any token, radius, button or focus rule.

Source (read-only): `instagram-saved-posts-landing@751ed2b`, `public/_landing.html` (the `:root` `--p-*` palette) and `public/assets/system.css` (tokens, buttons, radius, nav, focus ring, type scale). Rationale and dates: `wiki/landing-design-system.md`.

Where the code lives:

| Concern | File |
| --- | --- |
| Palette, radii, fonts, focus, `text-eyebrow` | `src/app/globals.css` |
| Font loading | `src/app/layout.tsx` |
| Buttons | `src/components/ui/button.tsx` |
| Status as dot plus word | `src/components/ui/status-text.tsx` |
| Sidebar and mobile bar | `src/components/layout/sidebar.tsx`, `nav-link.tsx` |

## Rules

1. No raw colour in a component. Use a token (`bg-surface-1`, `text-ink-muted`, `text-highlight`, `text-danger`). Hex lives only in `globals.css`.
2. No Tailwind palette colour (`amber-500`, `zinc-400`, `red-400`, `emerald-400`) in a component.
3. One radius scale, one button pair, one focus ring, one hairline. Do not add a second.
4. Behaviour never depends on colour alone: a status is a dot plus a word, an icon has a label.

## Palette

Dark is the landing palette as is. Light is the landing's inverse set (`--p-inv-*`).

| Token | Dark | Light | Landing name |
| --- | --- | --- | --- |
| `canvas`, `background` | `#09090b` | `#fafafa` | `--p-bg`, `--p-inv-bg` |
| `surface-1`, `card`, `popover` | `#121215` | `#e6e6e7` | `--p-surface`, `--p-inv-surface` |
| `surface-2` | ink 6% over `surface-1` | same rule | derived |
| `surface-3` | ink 12% over `surface-1` | same rule | derived |
| `ink`, `foreground` | `#fafafa` | `#09090b` | `--p-ink`, `--p-inv-ink` |
| `ink-muted` | `#a1a1aa` | `#58585a` | `--p-muted`, `--p-inv-muted` |
| `ink-subtle` | `ink-muted` 90% over `canvas` | same rule | derived (placeholders, hints) |
| `hairline` | ink 12% | ink 12% | `--line` (landing 11%) |
| `hairline-strong` | ink 22% | ink 22% | `--line-strong` (landing 20%) |
| `primary` | `#f59e0b` | `#f59e0b` | `--p-action` |
| `primary-foreground` | `#09090b` | `#09090b` | `--p-action-ink` |
| `primary-hover` | `primary` 86% with `ink` | same rule | `.btn--primary:hover` |
| `tonal`, `tonal-hover` | ink 8%, 14% over `canvas` | same rule | `.btn--secondary` (tonal) |
| `highlight` | `#f59e0b` | `#a04508` | amber as text, icon and ring |
| `ring` | `highlight` | `highlight` | `--action` on `:focus-visible` |
| `success` | `#34d399` | `#065f46` | none |
| `danger` | `#f87171` | `#b91c1c` | none |
| `destructive` | `#dc2626` | `#dc2626` | none (fill for destructive buttons) |
| `scrim` | `#09090b` 75% | same | none (modal backdrop) |

Why `highlight` exists: amber `#f59e0b` is 9.3:1 on the dark canvas but 2.0:1 on the light one, so amber text, icons and the focus ring need a darker amber in light (`#a04508`, 6.0:1 on `#fafafa`, 5.0:1 on `#e6e6e7`). Fills (primary button, progress bars) stay `#f59e0b` because the ink on them is `#09090b` (9.3:1). Warning is `highlight`; there is no separate token.

Contrast checked 2026-11-17 with WCAG relative luminance: `ink-muted` on `canvas` 7.8:1 dark and 6.8:1 light; `ink-subtle` 6.4:1 dark and 5.3:1 light on `canvas` (4.5:1 on `surface-1` in light; kept for placeholders and hints only).

## Fonts

- Host Grotesk for display and text, JetBrains Mono for code, ids, counts and timestamps. Loaded with `next/font/google` in `layout.tsx`, `display: "swap"`, variable files, subset `latin`. `next/font` generates a size-adjusted fallback face, so the swap does not move layout (the `visually-stable-font-fallbacks` guide names `size-adjust` descriptors as the alternative to `font-size-adjust`).
- Weights: 400 and 500 only. Headlines 500. No 600, 700 or 800 anywhere (`font-medium` is the heaviest class).
- Headings (`h1` to `h3`) are 500 with tracking `-0.01em`. The landing uses `-0.035em` at 40px and above; the app has no type that large, and the landing's own rule limits tight tracking to 40px and up.
- Numbers in tables and stats use `tabular-nums`.

## Type scale (app density)

| Use | Size | Weight |
| --- | --- | --- |
| Page title | 20px, 24px from `sm` | 500 |
| Card and dialog title | 16px to 18px | 500 |
| Body, controls | 14px | 400, 500 |
| Tables, toolbars, meta | 12px to 14px | 400, 500 |
| Label (`text-eyebrow`) | 12px, sentence case | 500 |
| Stat figure | 24px, mono or tabular | 500 |

Nothing under 12px. The landing's floor is 13px; the app uses 12px in tables and toolbars because rows are 36px to 44px high and the data is the content.

## Radius

The landing's `soft` scale, as Tailwind theme values in `globals.css`:

| Class | Value | Use |
| --- | --- | --- |
| `rounded-sm` | 8px | Controls: button, input, select, tab, badge, nav item, checkbox, code, kbd |
| `rounded-md` | 12px | Panels: cards, list rows, tiles, menus, popovers, tooltips, alerts, table frame, skeletons |
| `rounded-lg` | 20px | Large floating surfaces: dialog, drawer |
| `rounded-full` | 9999px | Avatars, dots, switch |

Landing maps `--r-lg` to cards. The app maps cards to `md` because at 12px to 14px type a 20px corner takes a third of a 64px row. Do not use `rounded-xl`, `rounded-2xl` or a bare `rounded`.

## Buttons

One pair, as the landing: a filled primary and a tonal secondary.

| Variant | Look |
| --- | --- |
| `default` (primary) | `primary` fill, `primary-foreground` ink, hover `primary-hover` |
| `secondary` | `tonal` fill, no border, hover `tonal-hover` |
| `outline` | `hairline` border, transparent, hover `tonal` (for toolbars next to a primary) |
| `ghost` | no fill, hover `tonal` |
| `destructive` | `destructive` fill, white ink; use only to confirm deletion |
| `link` | `highlight` text, underline on hover |

Heights: `default` 36px (the landing's `--btn-h-sm`), `lg` 44px (the landing's `--btn-h`), icon buttons the same two squares. On a coarse pointer `default` is 44px. One filled button per view marks the main action. Labels are sentence case, weight 500, 14px. No shadow, no gradient.

## Focus

One ring for every control: `:focus-visible { outline: 2px solid var(--ring); outline-offset: 2px }` in `globals.css`. Components do not draw their own ring, and they do not use `outline-none` on anything a keyboard can reach (menu items are the exception: the highlighted item is the indicator). The ring never animates: controls use `transition-colors`, never `transition-all`, and an unlayered `:focus-visible { transition-property: none }` beats any component transition so the ring does not tween. Ring colour `highlight` is 9.3:1 on the dark canvas and 6.0:1 on the light, above the 3:1 required by WCAG 1.4.11.

## Navigation

The landing nav is an opaque ground, one hairline, words with no pill or fill, a 2px line under the current page and under a word on hover or focus. The sidebar applies the same rules vertically:

- Sidebar and mobile bar sit on `canvas` with a hairline, not on a tinted fill.
- A link is 36px high, `rounded-sm`, `ink-muted`, `ink` on hover. No background fill on hover or active.
- The current link is `ink`, weight 500, with a 2px underline, and its icon is `highlight`. Hover draws the same underline colour from transparent.
- The profile switcher and theme toggle use the secondary (tonal) look.

## Surfaces and status

- Fields (input, textarea, select) sit on `canvas` with a `hairline-strong` border, so they read as sunken inside a `surface-1` card.
- Card, panel and settings section: `surface-1`, 1px `hairline`, `rounded-md`, no shadow. Hover on a clickable card steps the border to `hairline-strong`, not the fill.
- Dialog: `surface-1`, `hairline`, `rounded-lg`, backdrop `scrim` with blur.
- Table: header row is a label (12px, 500, `ink-muted`) on a hairline; rows are separated by hairlines, no zebra.
- Status is `StatusText`: a 6px dot and a word, tone `success`, `warn`, `danger` or `muted`. A bordered pill (`Badge`) is for a count or a category, not a state.
- `warn` uses `highlight`; `danger` uses `danger`; `success` uses `success`. Callouts tint the panel with the same token at 5% and the border at 30%.

## Motion

180ms ease-out (`cubic-bezier(.2, .8, .2, 1)`) for colour changes, as the landing's `--dur` and `--ease`. Nothing moves on hover except colour. Pulse and spin are for live work only and stop under `prefers-reduced-motion: reduce` (the `motion` guide: opt in with `no-preference` when reduced motion means no animation). Never flash more than three times a second.

## Intentionally different from the landing

| Landing | App | Why |
| --- | --- | --- |
| Fixed-screen sections, hero, `--padt` rhythm | Sidebar plus scrolling pages | The app is a tool, not a page. |
| 13px label floor, 44px buttons | 12px floor, 36px default button, 44px `lg` and on coarse pointers | Dense tables and toolbars. |
| Cards at 20px | Cards at 12px, dialogs at 20px | Row density. |
| `-0.035em` display tracking | `-0.01em` on headings of 16px to 24px | The landing's rule applies from 40px. |
| Light ground action is the ink | Light primary stays amber with dark ink; light text and ring use `highlight` `#a04508` | One brand colour in both themes; a dark action button would read as a different product. |
| Tracked capital labels never | Sentence case labels | Same rule; the app used `uppercase` until this change. |
| Self-hosted CSS, no framework | Tailwind 4 theme variables | Same values, different carrier. Keep both in step. |

Media overlays on photographs (post tiles, the carousel) keep white text on a black scrim in both themes, because they sit on an image, not on the canvas.

Two more raw-colour exceptions, both data and not chrome: the eight tile colours a profile can be given (`src/lib/profile-avatar.ts`, they tell profiles apart), and the `#ccc` selector string in `chart.tsx` that targets a Recharts attribute.

Known gaps on 2026-11-17: a few buttons still carry a local `text-xs` or `h-auto` override (`accounts/page.tsx`, `account-filters.tsx`, `account-notes.tsx`, `scrape-history-table.tsx`, `onboarding-wizard.tsx`), the onboarding wizard keeps its own card sizes, and no lint rule forbids raw hex, palette colours or `rounded-xl`; the rules in this file are checked by hand.

## Landing sync

`AGENTS.md` requires a landing review for every app change. A token or component change here does not need landing copy, but if the landing quotes app UI (screenshots, button names, nav labels, the sidebar order), check them against this file.
