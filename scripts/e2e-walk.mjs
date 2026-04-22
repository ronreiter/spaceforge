#!/usr/bin/env node
// End-to-end click-through of the Spaceforge walking skeleton.
// Drives real Chromium (Playwright headless) against the local dev server.
//
// Assumes `npm run dev:local` is running in another terminal.
//
// Run: node scripts/e2e-walk.mjs

import { chromium } from 'playwright';

const BASE = 'http://localhost:3000';
// Headless chromium-headless-shell doesn't ship WebGPU; BrowserGate
// refuses to render the editor. Setting the bypass flag at context
// level affects every page we open.
async function enableGateBypass(ctx) {
  await ctx.addInitScript(() => {
    window.__SPACEFORGE_SKIP_GATE = true;
  });
}
const SLUG = `e2e-${Date.now().toString(36)}`;
const SITE_NAME = 'E2E Walk';

let pass = 0;
let fail = 0;
const log = (ok, label, detail = '') => {
  const tag = ok ? '\x1b[32mPASS\x1b[0m' : '\x1b[31mFAIL\x1b[0m';
  console.log(`  ${tag} ${label}${detail ? '   ' + detail : ''}`);
  ok ? pass++ : fail++;
};

async function main() {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await enableGateBypass(ctx);
  const page = await ctx.newPage();

  const consoleErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  const pageErrors = [];
  page.on('pageerror', (err) => pageErrors.push(String(err)));

  try {
    console.log('\n=== 1. Landing + dashboard hydration ===');
    await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
    log(page.url().endsWith('/dashboard'), '/ redirects to /dashboard', page.url());

    const heading = await page.getByRole('heading', { name: 'Your sites' }).isVisible();
    log(heading, 'Dashboard renders "Your sites" heading');

    const newSiteBtnVisible = await page
      .getByRole('button', { name: /new site/i })
      .first()
      .isVisible();
    log(newSiteBtnVisible, '"New site" button is visible');

    const email = await page.getByText('dev@spaceforge.local').isVisible();
    log(email, 'Dev user email visible in header');

    console.log('\n=== 2. New-site modal + create flow ===');
    await page.getByRole('button', { name: /new site/i }).first().click();
    await page.waitForSelector('text=Create a new site', { state: 'visible' });
    log(true, 'Modal opens on click');

    await page.getByLabel('Name').fill(SITE_NAME);
    await page.getByLabel('Slug').fill(SLUG);
    const createBtn = page.getByRole('button', { name: /^create$/i });
    await Promise.all([
      page.waitForURL(/\/sites\/[0-9a-f-]{36}$/, { timeout: 10_000 }),
      createBtn.click(),
    ]);
    log(/\/sites\/[0-9a-f-]{36}$/.test(page.url()), 'After create → navigates to /sites/:id', page.url());

    console.log('\n=== 3. Editor shell renders on /sites/:id ===');
    // Wait for the editor chrome to hydrate. The server-site hook shows a
    // spinner for a moment while /api/sites/:id + /files resolve; we have
    // to wait for the TopBar before targeting its elements.
    await page.getByRole('link', { name: /dashboard/i }).first().waitFor({
      state: 'visible',
      timeout: 15_000,
    });
    log(true, 'Dashboard back link present');

    await page.getByText(SITE_NAME, { exact: true }).first().waitFor({
      state: 'visible',
      timeout: 15_000,
    });
    log(true, 'Site name rendered in TopBar');

    await page.getByText(`/s/${SLUG}`).first().waitFor({
      state: 'visible',
      timeout: 15_000,
    });
    log(true, 'Slug visible in TopBar');

    const publishBtn = page.getByRole('button', { name: /^publish$/i });
    await publishBtn.first().waitFor({ state: 'visible', timeout: 15_000 });
    log(true, '"Publish" button visible');
    // Skip networkidle — Next.js dev keeps a websocket open indefinitely.

    console.log('\n=== 4. Server-backed file writes ===');
    // Seed files via API (faster and deterministic than driving Monaco).
    const siteId = page.url().split('/').pop();
    const putResp = await page.request.put(`${BASE}/api/sites/${siteId}/files`, {
      data: {
        files: {
          'index.md':
            '---\nlayout: _layout.njk\ntitle: Welcome\n---\n# Welcome to E2E\n\n[About](about.html)\n',
          'about.md':
            '---\nlayout: _layout.njk\ntitle: About\n---\n# About\n\nEnd-to-end verified.\n',
          '_layout.njk':
            '<!DOCTYPE html><html><head><title>{{ title }}</title></head><body>{% include "_header.njk" %}<main>{{ content | safe }}</main></body></html>',
          '_header.njk':
            '<header><strong>E2E</strong> | <a href="index.html">Home</a> | <a href="about.html">About</a></header>',
          'styles.css': 'body { font: 16px/1.5 system-ui; }',
        },
      },
    });
    log(putResp.ok(), 'PUT /api/sites/:id/files → 200', `status=${putResp.status()}`);

    console.log('\n=== 5. Publish flow via UI ===');
    await publishBtn.first().click();
    // Wait for either: (a) button text changes to "Republish", (b) View link appears.
    const viewLink = page.getByRole('link', { name: /view/i }).first();
    await viewLink.waitFor({ state: 'visible', timeout: 15_000 });
    log(true, 'After publish → "View" link appears');

    // Published badge swaps in
    const publishedBadge = page.getByText('published', { exact: true });
    log(await publishedBadge.first().isVisible(), '"published" badge visible');

    console.log('\n=== 6. Public /s/<slug>/ serves compiled site ===');
    const pub = await ctx.newPage();
    const resp = await pub.goto(`${BASE}/s/${SLUG}/`, { waitUntil: 'domcontentloaded' });
    log(resp?.status() === 200, 'GET /s/slug/ → 200', `status=${resp?.status()}`);
    const bodyText = await pub.textContent('body');
    log(bodyText?.includes('Welcome to E2E') ?? false, 'Public page renders index.md content');
    log(bodyText?.includes('E2E |') ?? false, 'Public page renders _header.njk partial');

    // Click internal link → navigates to about
    await pub.click('a[href="about.html"]');
    await pub.waitForURL(/\/s\/.+\/about(\.html)?$/);
    const aboutBody = await pub.textContent('body');
    log(aboutBody?.includes('End-to-end verified') ?? false, 'Internal link → about.html renders');
    await pub.close();

    console.log('\n=== 7. Unpublish + delete cleanup ===');
    await page.bringToFront();
    // Confirmation is now a Mantine modal (useConfirm hook). Click the
    // TopBar's Unpublish, then click the modal's confirm button.
    const unpublishBtn = page.getByRole('button', { name: /unpublish/i });
    await unpublishBtn.first().click();
    // Modal body uses the button label "Unpublish" too — but the
    // modal's dialog role scopes the selector so .first() lands on the
    // modal button (it's rendered AFTER the TopBar button).
    const modal = page.getByRole('dialog', { name: /take this site offline/i });
    await modal
      .getByRole('button', { name: /^unpublish$/i })
      .click({ timeout: 5_000 });
    // The UI swaps to "draft" badge + removes the View link when unpublish lands.
    await page.waitForFunction(
      () => !Array.from(document.querySelectorAll('a')).some(
        (a) => a.textContent?.trim().toLowerCase() === 'view',
      ),
      { timeout: 10_000 },
    ).catch(() => {});
    const metaResp = await page.request.get(`${BASE}/api/sites/${siteId}`);
    const meta = await metaResp.json();
    log(meta.site.publishedVersionId === null || meta.site.publishedVersionId === undefined,
      'Unpublish nulled publishedVersionId',
      `val=${meta.site.publishedVersionId}`);

    // Navigate back to dashboard to verify listing.
    await page.goto(`${BASE}/dashboard`);
    await page.waitForLoadState('networkidle');

    // Find our card by site name.
    const card = page.locator(`text=${SITE_NAME}`).first();
    const cardVisible = await card.isVisible();
    log(cardVisible, 'Site card present on dashboard after round-trip');

    console.log('\n=== 8. No console / page errors during walk ===');
    log(pageErrors.length === 0, `No uncaught page errors`, pageErrors.length ? pageErrors.join(' | ') : '');
    // Allow some console errors from external fetches (e.g. fonts or icons
    // blocked by COEP). Print them for visibility but don't fail.
    if (consoleErrors.length) {
      console.log(`    (${consoleErrors.length} console.error messages; printing first 5)`);
      consoleErrors.slice(0, 5).forEach((e, i) => console.log(`      ${i + 1}. ${e.substring(0, 200)}`));
    }

    // API-level cleanup to leave DB tidy.
    await page.request.delete(`${BASE}/api/sites/${siteId}`);
  } finally {
    await browser.close();
  }

  console.log('\n============================================================');
  console.log(`  Total: ${pass} PASS / ${fail} FAIL`);
  console.log('============================================================');
  process.exit(fail === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error('E2E failure:', err);
  process.exit(1);
});
