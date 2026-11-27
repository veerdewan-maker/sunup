// Athlete setup walkthrough at phone size (diving). Run `npm run build && npx vite preview --port 4173` first,
// then: node scripts/e2e-sport.cjs [outDir]
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const URL = process.env.APP_URL || 'http://localhost:4173/';
const OUT = process.argv[2] || 'test-results-sport';
fs.mkdirSync(OUT, { recursive: true });
const results = [];
const check = (name, ok, detail = '') => {
  results.push({ name, ok });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  (' + detail + ')' : ''}`);
};

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: +(process.env.VW || 390), height: +(process.env.VH || 844) }, hasTouch: true, isMobile: true });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  const shot = (n) => page.screenshot({ path: path.join(OUT, n + '.png') });
  const fits = async (label) => {
    const bad = await page.evaluate(() => {
      const vw = window.innerWidth;
      const out = [];
      if (document.documentElement.scrollWidth > vw) out.push('page scrolls sideways');
      for (const el of document.querySelectorAll('body *')) {
        if (el.offsetParent === null || el.closest('.chips.scroll') || el.closest('svg')) continue;
        const r = el.getBoundingClientRect();
        if (r.width && (r.right > vw + 1 || r.left < -1)) out.push(`${el.tagName}.${el.className} sticks out`);
      }
      for (const el of document.querySelectorAll('button, select, input:not([hidden])')) {
        if (el.offsetParent === null) continue;
        const r = el.getBoundingClientRect();
        if (r.width > 0 && (r.height < 40 || r.width < 40)) out.push(`small tap target: ${(el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 20)}`);
      }
      return out.slice(0, 5);
    });
    check(`fits the phone: ${label}`, bad.length === 0, bad.join('; '));
  };

  await page.goto(URL);
  await page.getByRole('button', { name: /Play my sport better/ }).click();
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('radio', { name: 'Diving' }).click();
  check('diving explains what the sport needs', await page.getByText(/rigid body line/).isVisible());
  await page.getByRole('radiogroup', { name: 'Practices and games per week' }).getByRole('radio', { name: '6' }).click();
  await page.getByRole('radio', { name: 'Pre-season' }).click();
  await fits('sport step');
  await shot('s1-sport');
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByLabel('Age').fill('16');
  await page.getByLabel('Height').fill('175');
  await page.getByLabel('Current weight').fill('65');
  await page.getByRole('button', { name: 'Continue' }).click();
  check('activity question mentions practice', await page.getByText('Outside practice and the gym, I am…').isVisible());
  await page.getByRole('button', { name: 'Continue' }).click();
  check('schedule suggests gym days around the sport', await page.getByText(/6 diving sessions a week in pre-season, 2 gym days/).isVisible());
  check('suggested days are preselected', (await page.getByRole('radiogroup', { name: 'Days per week' }).getByRole('radio', { name: '2' }).getAttribute('aria-checked')) === 'true');
  await page.getByRole('radiogroup', { name: 'Days per week' }).getByRole('radio', { name: '3' }).click();
  await fits('schedule');
  await shot('s2-schedule');
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('heading', { name: 'Your plan is ready' }).waitFor();
  check('summary says it is built for diving', await page.getByText('Built for diving').isVisible());
  const planText = await page.locator('.plan-preview').allTextContents();
  check('plan has takeoff jumps, body shape and flexibility', /Arm-Swing Jump/.test(planText.join()) && /Hollow Body Hold/.test(planText.join()) && /Pike Stretch/.test(planText.join()), planText.join(' | ').slice(0, 200));
  check('plan has 3 diving days', planText.length === 3 && /Takeoff power/.test(planText[0]));
  await fits('summary');
  await shot('s3-summary');
  await page.getByRole('button', { name: 'Start', exact: true }).click();
  await page.getByRole('button', { name: 'Train', exact: true }).click();
  check('Train shows the diving focus', await page.getByRole('heading', { name: 'Built for diving' }).isVisible());
  await fits('train');
  await shot('s4-train');
  await page.getByRole('button', { name: 'Open Takeoff power' }).click();
  await page.getByRole('button', { name: 'Start this workout' }).click();
  const first = await page.locator('.page .card h2').first().textContent();
  check('workout opens with the jump', first === 'Arm-Swing Jump', first);
  check('jumps are low rep', await page.locator('.page .card').first().getByText('3–5 reps').isVisible());
  await fits('workout');
  await shot('s5-workout');
  await page.locator('.page-head').getByLabel('Back').click();
  await page.getByRole('button', { name: 'Today', exact: true }).click();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  check('sport can be changed in Settings', (await page.getByLabel('Sport').inputValue()) === 'diving');
  await page.getByLabel('Sport').selectOption('soccer');
  await page.getByRole('button', { name: 'Rebuild my plan' }).click();
  await page.getByRole('dialog').getByRole('button', { name: /Rebuild/ }).click();
  await page.getByRole('button', { name: 'Train', exact: true }).click();
  check('switching sport rebuilds the plan', await page.getByRole('heading', { name: 'Built for soccer' }).isVisible() && (await page.getByText('Nordic Curl').count()) > 0);
  await fits('soccer plan');

  check('no console errors', errors.length === 0, errors.slice(0, 3).join(' | '));
  await browser.close();
  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length} of ${results.length} checks passed`);
  process.exit(failed.length ? 1 : 0);
})().catch((e) => {
  console.error('ABORTED', e.message.split('\n').slice(0, 6).join('\n'));
  process.exit(2);
});
