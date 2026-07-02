---
name: responsive-ui
description: MANDATORY for any UI work in apps/app, apps/portal, or packages/design-system — every component, page, or layout change must work on mobile (~375px), tablet (~768px), desktop (~1280px), and large desktop (~1920px) BY DEFAULT, without being asked. Read this before writing or editing any JSX/TSX that renders visible UI. Triggers on: new component, page, layout, table, toolbar, form, modal/sheet, dashboard, "build UI", "add a column", "add a filter", any styling change.
---

# Responsive UI — default, not a feature request

## The rule

**Every UI change ships working at all four device classes. Nobody has to ask.**

| Device | Test width | Tailwind context |
|---|---|---|
| Mobile | 375px | base (no prefix) |
| Tablet | 768px | `md:` |
| Desktop | 1280px | `xl:` |
| Large desktop | 1920px | beyond `2xl:` |

Tailwind is **mobile-first**: unprefixed classes are the mobile layout; prefixes add
behavior at wider screens (`sm:` 640, `md:` 768, `lg:` 1024, `xl:` 1280, `2xl:` 1536).
Write the mobile layout first, then widen — not the other way around.

A change is NOT done until you have reasoned through (or better, viewed via the
`webapp-testing` skill / browser dev tools) what it looks like at 375, 768, 1280,
and 1920. If you only checked one width, you checked none.

## Works WITH the design system — precedence rules

This skill layers on top of the `ui` skill; **where they touch, the design-system
rules win**. Responsiveness is achieved THROUGH the DS, never around it:

- **Never put responsive classes (or any `className`) on DS components**
  (`Text`, `Stack`, `HStack`, `Badge`, `Button`, …) — they don't accept it. Put
  breakpoint utilities on a wrapper `<div>` (the `ui` skill's "Layout with Wrapper
  Divs" pattern):
  ```tsx
  // ✅ breakpoints on the wrapper, DS component untouched
  <div className="hidden sm:block"><Badge variant="outline">Active</Badge></div>
  // ❌ className on a DS component
  <Badge className="hidden sm:block">Active</Badge>
  ```
- **Reach for DS layout primitives first** (`PageLayout`, `Stack`, `HStack`,
  `Section`) — they carry responsive spacing already. Raw responsive divs are for
  what the primitives don't cover, not a replacement for them.
- **Arbitrary pixel values stay an anti-pattern** (`w-[847px]` ❌ — per the `ui`
  skill). Prefer the standard Tailwind scale (`max-w-sm`, `w-48`, `max-w-xs`). A
  fixed control width like `w-[200px]` is acceptable ONLY when it matches an
  established pattern already used on that surface, and it must still carry a
  responsive strategy (see below).

## Non-negotiables

1. **The page body never scrolls horizontally.** Wide content (tables, code, diagrams)
   scrolls inside its own container, never the page.
2. **No fixed width without a responsive strategy.** A fixed-width control is only
   acceptable if the element hides, shrinks, or wraps on smaller screens
   (`hidden sm:block`, `w-full md:max-w-xs`, or a wrapping parent) — with the
   breakpoint classes on a wrapper div, never on a DS component.
3. **Touch targets** on mobile: interactive elements ≥40px tall; don't rely on hover
   for anything essential (no hover on touch devices).
4. **Test with real content lengths** — long names, emails, 33-item counts. Use
   `truncate` / `min-w-0` on flex children that hold text.
5. **Large desktops:** content must not stretch into unreadable full-width lines —
   cap with `max-w-*` containers where the layout doesn't already.

## Repo patterns (use these, don't invent)

- **Tables**: the design-system `Table` already wraps rows in `overflow-x-auto` —
  wide tables scroll horizontally inside themselves on mobile. That is the accepted
  pattern for dense admin tables. Do NOT try to reflow table columns per breakpoint;
  do keep cells reasonable (`min-w-* max-w-*` on cell content is fine).
- **Toolbars / filter rows**: primary control (search) is `w-full md:max-w-[300px]`;
  secondary controls (filters, source selectors) collapse on phones with
  `hidden sm:block`. Example: the People tab toolbar in
  `apps/app/.../people/all/components/TeamMembersClient.tsx`.
- **Page shells**: use design-system `PageLayout` / `Stack` / `HStack` — they carry
  the responsive spacing; don't rebuild them with raw divs.
- **Grids**: `grid-cols-1 md:grid-cols-2 xl:grid-cols-3` style progressions — never a
  fixed column count for all widths.
- **Sheets/Modals**: design-system `Sheet`/`Dialog` are responsive already; don't fix
  their widths with arbitrary values.
- **Images/logos**: constrain (`max-w-full`, explicit small sizes); never let an
  image force layout width.

## Checklist before "done" (run mentally or in the browser)

- [ ] 375px — nothing overflows the viewport; controls usable or intentionally hidden; text truncates instead of breaking layout
- [ ] 768px — secondary controls visible; layout uses available width sensibly
- [ ] 1280px — the intended "design" width; matches mockups
- [ ] 1920px — no absurdly stretched content; whitespace balanced
- [ ] Long content (names, emails, high counts) doesn't break any of the above
- [ ] Tests: if a component hides/reflows per breakpoint in a way that matters, its test asserts the class contract (e.g. `hidden sm:block`)

## When you can skip a width

Admin-only dense screens (e.g. internal tooling) may treat mobile as "usable via
horizontal scroll" rather than fully reflowed — but that must be a conscious choice
following the existing pattern of that page, never an accident of not checking.
