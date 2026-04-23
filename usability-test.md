# Spaceforge Usability Test — feat/multi-tenant

End-to-end local check of every user-facing flow on `feat/multi-tenant`.
Run against `task dev` (AUTH_DRIVER=dev, local Docker Postgres,
FsBlobDriver). Driven by Playwright MCP, screenshots attached per
section.

The goal is **"everything works"** — every click, every nav, every
persistence path round-trips. Any test that fails blocks merge; fix it
on the branch and re-run until green.

## Legend

- ✅ — passed as expected
- ❌ — failed; tracked with a fix commit
- ⏭ — deliberately skipped (prod-only, e.g. Clerk flow)

## Setup

1. `docker compose up -d` (Postgres healthy)
2. `task setup` (idempotent: npm install, migrate, seed dev user)
3. `task dev` (Next.js on :3000)
4. Visit `http://localhost:3000/` — lands on `/dashboard` as
   `dev@spaceforge.local`.

## Test matrix

### A. Routing / auth

| # | Flow | Expected |
|---|---|---|
| A1 | `/` | 307 → `/dashboard`, hydrates Mantine UI |
| A2 | `/sign-in` | 307 → `/dashboard` (dev-auth bypass) |
| A3 | `/sign-up` | 307 → `/dashboard` |
| A4 | `/dashboard` | Shows "Your sites" heading, Trash + Team links, New site button |
| A5 | `/team` | Team page with roster, Dashboard back-link |
| A6 | `/dashboard/trash` | Trash view (empty or populated) |
| A7 | `/sites/:invalid-id` | 404 |
| A8 | `/s/:missing-slug` | 404 |

### B. Site CRUD

| # | Flow | Expected |
|---|---|---|
| B1 | New site with valid name + slug | Navigates to `/sites/:id` |
| B2 | New site with bad slug (`UPPERCASE!`) | Inline 400 error |
| B3 | New site with duplicate slug | Inline 400 error |
| B4 | New site with empty name | Blocked by HTML required |
| B5 | Delete site from dashboard (confirm) | Disappears from list, appears in trash |
| B6 | Reload dashboard | State persists |

### C. Editor — file handling

| # | Flow | Expected |
|---|---|---|
| C1 | Seed files via API then open editor | Loading indicator → files visible in Edit tab tree |
| C2 | Click Edit tab, select `index.md` | Visual editor loads with content |
| C3 | Type into WYSIWYG | Changes persist (debounced save → PUT) |
| C4 | Switch to Source tab | Monaco shows the same file |
| C5 | Edit in Monaco → switch back to Visual | Round-trip holds |
| C6 | New file button | Prompts name, creates file |
| C7 | Delete file | Removes from tree, server |
| C8 | Switch to another file | No stale state |
| C9 | Reload page | Files persist |
| C10 | Open same site in 2nd tab | Latest files load |

### D. Templates

| # | Flow | Expected |
|---|---|---|
| D1 | Open Templates tab | 11 cards with previews |
| D2 | Click "Journal" template | "In use" badge moves to Journal |
| D3 | Return to Preview | Rendered with Journal styles |
| D4 | Switch back to Custom | Generated styles.css restored |

### E. Publish

| # | Flow | Expected |
|---|---|---|
| E1 | Click Publish on draft | PUBLISHED chip, Republish/Unpublish/View appear, site_versions row inserted |
| E2 | Open `/s/<slug>/` (View link) | Rendered site with Pico CSS, header partial baked in |
| E3 | Click internal `<a href="about.html">` | Navigates within /s/ correctly (base-href) |
| E4 | Edit draft, click Republish | New version id, `/s/` serves new content |
| E5 | Click Unpublish (confirm) | DRAFT chip, `/s/` returns 404 |
| E6 | Click Publish again | Back to PUBLISHED |

### F. Version history

| # | Flow | Expected |
|---|---|---|
| F1 | Publish 2 times (different content) | 2 versions in history |
| F2 | Open clock icon (history) | Popover with times + sizes, one LIVE |
| F3 | Activate earlier version | LIVE flips, `/s/` serves old artifact, no re-render |
| F4 | Activate newer version | Flips back |

### G. Team + sharing

| # | Flow | Expected |
|---|---|---|
| G1 | `/team` shows dev user as owner | Owner badge, no remove button |
| G2 | Invite `alice@example.com` as editor | Synthesized user, row in table |
| G3 | Change Alice role → admin | Updates |
| G4 | Remove Alice | Row gone |
| G5 | Share site with `bob@example.com` as viewer | Appears in modal collaborators list |
| G6 | Remove Bob from site | Disappears |

### H. Trash lifecycle

| # | Flow | Expected |
|---|---|---|
| H1 | Delete site X from dashboard | Disappears from "Your sites" |
| H2 | Open `/dashboard/trash` | X present with DELETED badge |
| H3 | `/s/<X's slug>/` | 404 |
| H4 | Click Restore on X | Returns to dashboard |
| H5 | Delete X again + permanent-delete (hard) | Removed from trash forever |

### I. Viewer role enforcement (API-only — no 2nd identity in dev)

| # | Flow | Expected |
|---|---|---|
| I1 | POST site as self | 201 (editor role) |
| I2 | Add dev user as viewer via fixture | N/A in dev — covered in Clerk mode |
| I3 | curl with viewer → PUT files | 403 |

### J. Regression smoke

| # | Flow | Expected |
|---|---|---|
| J1 | `npm run typecheck` | Clean |
| J2 | `npm run test` | 112 pass + 1 skipped |
| J3 | `npm run e2e` | 20/20 pass |

## Fix log

Any failures + the fix commit that resolved them:

_(populated during execution)_
