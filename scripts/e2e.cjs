// End-to-end walkthrough at phone size. Run `npm run build && npx vite preview --port 4173` first,
// then: node scripts/e2e.cjs [outDir]
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const URL = process.env.APP_URL || 'http://localhost:4173/';
const OUT = process.argv[2] || 'test-results';
fs.mkdirSync(OUT, { recursive: true });

const results = [];
const check = (name, ok, detail = '') => {
  results.push({ name, ok });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  (' + detail + ')' : ''}`);
};

let dbgPage;
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: +(process.env.VW || 390), height: +(process.env.VH || 844) }, deviceScaleFactor: +(process.env.DSF || 1), hasTouch: true, isMobile: true, acceptDownloads: true });
  const page = await ctx.newPage();
  dbgPage = page;
  const errors = [];
  global.__errors = errors;
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  page.on('pageerror', (e) => errors.push(String(e)));

  // The sandbox cannot reach Open Food Facts, so answer with the documented response shape.
  const product = { code: '3017620422003', product_name: 'Nutella', brands: 'Ferrero', serving_size: '15 g', serving_quantity: 15, nutriments: { 'energy-kcal_100g': 539, proteins_100g: 6.3, carbohydrates_100g: 57.5, fat_100g: 30.9 } };
  await ctx.route('https://world.openfoodfacts.org/**', (route) => {
    const u = route.request().url();
    const body = u.includes('/api/v2/product/') ? (u.includes('3017620422003') ? { status: 1, product } : { status: 0 }) : { products: [product, { code: '1', product_name: '' }] };
    route.fulfill({ contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(body) });
  });

  const shot = (n) => page.screenshot({ path: path.join(OUT, n + '.png') });
  const overflow = async (label) => {
    const w = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    check(`no sideways scroll: ${label}`, w <= 0, `overflow ${w}px`);
    const out = await page.evaluate(() => {
      const vw = window.innerWidth;
      const bad = [];
      for (const el of document.querySelectorAll('body *')) {
        if (el.offsetParent === null || el.closest('.chips.scroll') || el.closest('svg')) continue;
        const r = el.getBoundingClientRect();
        if (r.width === 0) continue;
        if (r.right > vw + 1 || r.left < -1) bad.push(`${el.tagName}.${el.className} sticks out (${Math.round(r.left)}..${Math.round(r.right)})`);
        else if (el.matches('button, .pill, h1, h2, strong') && el.scrollWidth > el.clientWidth + 1 && getComputedStyle(el).overflow !== 'visible' && !el.matches('.page-head h1'))
          bad.push(`${el.tagName}.${el.className} text clipped: ${el.textContent.slice(0, 25)}`);
      }
      return bad.slice(0, 5);
    });
    check(`nothing cut off: ${label}`, out.length === 0, out.join('; '));
  };
  const smallTargets = async (label) => {
    const bad = await page.evaluate(() =>
      [...document.querySelectorAll('button, a, input:not([type=checkbox]):not([hidden]), select')]
        .filter((el) => el.offsetParent !== null)
        .map((el) => ({ r: el.getBoundingClientRect(), t: (el.getAttribute('aria-label') || el.textContent || el.placeholder || '').trim().slice(0, 30) }))
        .filter((x) => x.r.width > 0 && (x.r.height < 40 || x.r.width < 40))
        .map((x) => `${x.t} ${Math.round(x.r.width)}x${Math.round(x.r.height)}`),
    );
    check(`tap targets at least 40px: ${label}`, bad.length === 0, bad.slice(0, 6).join('; '));
  };

  await page.goto(URL);
  // ----- Onboarding -----
  await page.getByRole('heading', { name: "What's your main goal?" }).waitFor();
  check('Continue is disabled until a goal is picked', await page.getByRole('button', { name: 'Continue' }).isDisabled());
  await shot('01-onboarding-goal');
  await page.getByRole('button', { name: /Build muscle/ }).click();
  await page.getByRole('button', { name: 'Continue' }).click();
  check('Continue is disabled until a sport is picked', await page.getByRole('button', { name: 'Continue' }).isDisabled());
  await page.getByRole('radio', { name: 'No sport, just the gym' }).click();
  await page.getByRole('button', { name: 'Continue' }).click();
  check('Continue is disabled with empty body stats', await page.getByRole('button', { name: 'Continue' }).isDisabled());
  await page.getByLabel('Age').fill('25');
  await page.getByLabel('Height').fill('180');
  await page.getByLabel('Current weight').fill('80');
  await page.getByLabel('Goal weight (optional)').fill('85');
  await overflow('onboarding about');
  await shot('02-onboarding-about');
  for (let i = 0; i < 4; i++) await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('heading', { name: 'Your plan is ready' }).waitFor();
  check('summary shows calculated calories', await page.getByText('2620 kcal').isVisible().catch(() => false), await page.locator('.big').first().textContent());
  await shot('03-onboarding-summary');
  await page.getByRole('button', { name: 'Start', exact: true }).click();

  // ----- Today -----
  await page.getByRole('heading', { name: 'Today', exact: true }).waitFor();
  check('Today shows the next workout', await page.getByText('Full Body A').first().isVisible());
  await overflow('today');
  await smallTargets('today');
  await shot('04-today');
  await page.getByRole('button', { name: '+ 250 ml' }).click();
  check('water adds up', await page.getByText('0.25 / 2.5 L').isVisible());

  // ----- Workout -----
  await page.getByRole('button', { name: 'Start workout' }).click();
  await page.getByRole('button', { name: 'Finish', exact: true }).waitFor();
  const firstEx = await page.locator('.page .card h2').first().textContent();
  for (let j = 1; j <= 3; j++) {
    await page.getByLabel(`${firstEx} set ${j} weight`).fill('60');
    await page.getByLabel(`${firstEx} set ${j} reps`).fill('12');
    await page.getByRole('button', { name: `${firstEx} set ${j} mark done` }).click();
  }
  check('rest timer starts after ticking a set', await page.getByRole('timer').isVisible());
  await page.getByRole('radiogroup', { name: `${firstEx} effort` }).getByRole('radio', { name: 'Good' }).click();
  check('effort rating can be picked', (await page.getByRole('radiogroup', { name: `${firstEx} effort` }).getByRole('radio', { name: 'Good' }).getAttribute('aria-checked')) === 'true');
  await overflow('workout');
  await smallTargets('workout');
  await shot('05-workout');
  await page.getByRole('button', { name: 'Skip' }).click();
  // Leave and come back: the workout must still be there.
  await page.locator('.page-head').getByLabel('Back').click();
  await page.getByRole('button', { name: /Workout in progress/ }).first().click();
  check('workout survives leaving the screen', (await page.getByLabel(`${firstEx} set 1 weight`).inputValue()) === '60');
  await page.reload();
  await page.getByRole('button', { name: /Resume/ }).first().click();
  check('workout survives a reload', (await page.getByLabel(`${firstEx} set 2 reps`).inputValue()) === '12');
  await page.getByRole('button', { name: 'Swap', exact: true }).nth(1).click();
  await page.getByRole('dialog').getByRole('button').nth(1).click();
  await page.getByRole('button', { name: 'Finish workout' }).click();
  await page.getByRole('heading', { name: 'Workout complete' }).waitFor();
  check('finish screen shows volume', await page.getByText('2,160').isVisible(), await page.locator('.stats').textContent());
  await shot('06-workout-done');
  await page.getByRole('button', { name: 'Done', exact: true }).click();
  check('Today marks the workout done', await page.getByText('Workout done today').isVisible());

  // Second session: weight should go up after hitting 12s.
  await page.getByRole('button', { name: 'Train', exact: true }).click();
  await overflow('train');
  await smallTargets('train');
  await shot('07-train');
  await page.getByRole('button', { name: 'Open Full Body A' }).click();
  await page.getByRole('button', { name: 'How to do it' }).first().click();
  await shot('08-day-detail');
  await page.getByRole('button', { name: 'Start this workout' }).click();
  const w = await page.getByLabel(`${firstEx} set 1 weight`).inputValue();
  check('next session suggests more weight after hitting the top reps', w === '65' || w === '62.5', `got ${w} for ${firstEx}`);
  await page.getByLabel(`${firstEx} set 1 reps`).fill('8');
  await page.getByRole('button', { name: `${firstEx} set 1 mark done` }).click();
  await page.getByRole('button', { name: 'Finish workout' }).click();
  check('personal record is shown', await page.getByText('Personal records').isVisible());
  await page.getByRole('button', { name: 'Done', exact: true }).click();
  await page.getByRole('button', { name: /Workout history \(2\)/ }).click();
  await page.locator('.page .card-link').first().click();
  await shot('09-history');
  await page.locator('.page-head').getByLabel('Back').click();
  await page.getByRole('button', { name: 'Exercise library' }).click();
  await page.getByLabel('Search exercises').fill('curl');
  check('exercise library search works', await page.getByRole('button', { name: /^Barbell Curl/ }).isVisible());
  await page.locator('.page-head').getByLabel('Back').click();

  // ----- Food -----
  await page.getByRole('button', { name: 'Eat', exact: true }).click();
  await page.getByRole('button', { name: 'Add food to Lunch' }).click();
  await page.getByLabel('Search foods').fill('chicken br');
  await page.getByRole('button', { name: /Chicken breast, cooked/ }).click();
  await shot('10-food-sheet');
  await page.getByLabel('How many?').fill('2');
  await page.getByRole('button', { name: 'Add food' }).click();
  await page.getByRole('button', { name: /Search branded products/ }).click();
  await page.getByRole('button', { name: /Nutella/ }).click();
  await page.getByRole('button', { name: 'Add food' }).click();
  await overflow('add food');
  await smallTargets('add food');
  await shot('11-add-food');
  await page.getByRole('button', { name: 'Scan barcode' }).click();
  await page.getByLabel('Barcode number').fill('3017620422003');
  await page.getByRole('button', { name: 'Look up' }).click();
  check('barcode lookup opens the product', await page.getByRole('dialog', { name: 'Nutella' }).waitFor({ timeout: 5000 }).then(() => true, () => false));
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await page.getByRole('button', { name: 'Scan barcode' }).click();
  await page.getByLabel('Barcode number').fill('99999999');
  await page.getByRole('button', { name: 'Look up' }).click();
  check('unknown barcode offers to create the food', await page.getByRole('dialog', { name: 'Create a food' }).waitFor({ timeout: 5000 }).then(() => true, () => false));
  await page.getByLabel('Food name').fill('Home protein bar');
  await page.getByLabel('Calories').fill('210');
  await page.getByLabel('Protein').fill('20');
  await page.getByRole('button', { name: 'Save food' }).click();
  await page.getByRole('button', { name: 'Add food' }).click();
  await page.getByRole('button', { name: 'Quick add' }).click();
  await page.getByLabel('Calories').fill('300');
  await page.getByRole('button', { name: 'Add to lunch' }).click();
  await page.getByRole('heading', { name: 'Eat' }).waitFor();
  // 2 breasts (240 g) = 396, Nutella 15 g = 81, bar 210, quick 300
  check('food diary totals are right', await page.getByText('987 of 2620 kcal eaten').isVisible(), await page.locator('.card').first().textContent());
  await overflow('eat');
  await smallTargets('eat');
  await shot('12-eat');
  await page.reload();
  await page.getByRole('button', { name: 'Eat', exact: true }).click();
  check('food log is still there after a reload', await page.getByText('987 of 2620 kcal eaten').isVisible());
  await page.getByRole('button', { name: /Quick add/ }).first().click();
  await page.getByRole('button', { name: 'Remove', exact: true }).click();
  check('removing an entry updates the total', await page.getByText('687 of 2620 kcal eaten').isVisible());
  await page.getByRole('button', { name: 'Save as meal' }).click();
  await page.getByLabel('Meal name').fill('Usual lunch');
  await page.getByRole('button', { name: 'Save meal' }).click();
  await page.getByRole('button', { name: 'Add food to Dinner' }).click();
  await page.getByRole('button', { name: 'Meals', exact: true }).click();
  await overflow('saved meals');
  await shot('12b-saved-meals');
  await page.getByRole('button', { name: 'Add Usual lunch to Dinner' }).click();
  await page.getByRole('heading', { name: 'Eat' }).waitFor();
  check('a saved meal logs all its foods in one tap', await page.getByText('1374 of 2620 kcal eaten').isVisible(), await page.locator('.card').first().textContent());

  // ----- Progress -----
  await page.getByRole('button', { name: 'Progress', exact: true }).click();
  await page.getByLabel("Today's weight").fill('80.4');
  await page.getByRole('button', { name: 'Update' }).click();
  check('weight is logged', await page.getByText('80.4 kg').first().isVisible());
  await page.getByRole('button', { name: 'Log measurements' }).click();
  await page.getByLabel('Waist').fill('84');
  await page.getByLabel('Arm').fill('36.5');
  await shot('13b-measurements');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  check('measurements are saved', await page.getByText('84 cm').isVisible() && await page.getByText('36.5 cm').isVisible());
  // A small real image stands in for a camera photo.
  const png = await page.evaluate(() => { const c = document.createElement('canvas'); c.width = 300; c.height = 400; const g = c.getContext('2d'); g.fillStyle = '#3a7'; g.fillRect(0, 0, 300, 400); return c.toDataURL('image/png').split(',')[1]; });
  for (let i = 0; i < 2; i++) {
    await page.getByLabel('Progress photo file').setInputFiles({ name: `p${i}.png`, mimeType: 'image/png', buffer: Buffer.from(png, 'base64') });
    await page.getByRole('button', { name: 'Add front photo' }).waitFor();
  }
  check('progress photos are saved', await page.waitForFunction(() => document.querySelectorAll('.photo-tile img').length === 2, null, { timeout: 5000 }).then(() => true, () => false));
  await page.getByRole('button', { name: 'Compare', exact: true }).click();
  check('before and after view shows two photos', await page.waitForFunction(() => document.querySelectorAll('[role=dialog] img').length === 2, null, { timeout: 5000 }).then(() => true, () => false));
  await shot('13c-photos-compare');
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await page.reload();
  await page.getByRole('button', { name: 'Progress', exact: true }).click();
  check('photos are still there after a reload', await page.waitForFunction(() => document.querySelectorAll('.photo-tile img').length === 2, null, { timeout: 5000 }).then(() => true, () => false));
  check('strength chart lists the lift', (await page.getByLabel('Choose a lift').inputValue()).length > 0);
  await overflow('progress');
  await smallTargets('progress');
  await shot('13-progress');

  // ----- Settings: backup, erase, restore -----
  await page.getByRole('button', { name: 'Today', exact: true }).click();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByRole('radio', { name: '+50 g' }).click();
  await overflow('settings');
  await smallTargets('settings');
  await shot('14-settings');
  await page.locator('.page-head').getByLabel('Back').click();
  await page.getByRole('button', { name: 'Eat', exact: true }).click();
  check('training day gets extra carbs', await page.getByText('of 2820 kcal eaten').isVisible(), await page.locator('.card').first().textContent());
  await page.getByRole('radio', { name: 'Rest day' }).click();
  const restKcal = Number((await page.getByText(/of \d+ kcal eaten/).textContent()).match(/of (\d+)/)[1]);
  check('rest day gives the carbs back', restKcal < 2620, String(restKcal));
  await shot('12c-eat-rest-day');
  await page.getByRole('button', { name: 'Today', exact: true }).click();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Save a backup file' }).click()]);
  const file = path.join(OUT, 'backup.json');
  await download.saveAs(file);
  const backup = JSON.parse(fs.readFileSync(file, 'utf8'));
  check('backup file contains workouts and food', backup.state.sessions.length === 2 && backup.state.foodEntries.length === 6 && backup.state.savedMeals.length === 1 && backup.state.measurements.length === 1 && backup.state.photos.length === 0);
  await page.getByRole('button', { name: 'Erase everything' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Erase everything' }).click();
  await page.getByRole('heading', { name: "What's your main goal?" }).waitFor();
  check('erase returns to setup', true);
  // Set up again quickly, then restore.
  await page.getByRole('button', { name: /Lose fat/ }).click();
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('radio', { name: 'No sport, just the gym' }).click();
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByLabel('Age').fill('30');
  await page.getByLabel('Height').fill('170');
  await page.getByLabel('Current weight').fill('70');
  for (let i = 0; i < 4; i++) await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('button', { name: 'Start', exact: true }).click();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByLabel('Backup file').setInputFiles({ name: 'bad.json', mimeType: 'application/json', buffer: Buffer.from('{"hello":1}') });
  await page.getByRole('dialog').getByRole('button', { name: 'Restore' }).click();
  check('a wrong file is rejected with a message', await page.getByText('That file is not a Sunup backup.').isVisible());
  await page.getByLabel('Backup file').setInputFiles(file);
  await page.getByRole('dialog').getByRole('button', { name: 'Restore' }).click();
  await page.getByRole('button', { name: 'Train', exact: true }).click();
  check('restore brings back the workouts', await page.getByRole('button', { name: /Workout history \(2\)/ }).isVisible());

  // ----- Offline -----
  await page.waitForFunction(() => navigator.serviceWorker?.controller != null, null, { timeout: 15000 }).catch(() => undefined);
  await ctx.setOffline(true);
  let offlineOk = false;
  try {
    await page.reload();
    await page.getByRole('heading', { name: 'Today', exact: true }).waitFor({ timeout: 8000 });
    offlineOk = true;
  } catch {}
  check('app opens with no internet', offlineOk);
  await ctx.setOffline(false);

  const real = errors.filter((e) => !/favicon/.test(e));
  check('no console errors', real.length === 0, real.slice(0, 3).join(' | '));
  await browser.close();
  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length} of ${results.length} checks passed`);
  process.exit(failed.length ? 1 : 0);
})().catch(async (e) => {
  console.error('console errors:', global.__errors);
  try {
    console.error((await dbgPage.locator('body').innerText()).slice(0, 80));
    console.error(await dbgPage.evaluate(async()=>{const r=indexedDB.open('keyval-store');return await new Promise(res=>{r.onerror=()=>res('openerr');r.onsuccess=()=>{const tx=r.result.transaction('keyval').objectStore('keyval').get('sunup-state-v1');tx.onsuccess=()=>res(JSON.stringify({has:!!tx.result,prof:!!tx.result?.profile,active:!!tx.result?.active,ls:(localStorage.getItem('sunup-state-v1')||'').length}))}})}));
  } catch {}
  console.error('ABORTED', e.message.split('\n').slice(0, 6).join('\n'));
  process.exit(2);
});
