// Run with NODE_PATH pointing to Playwright and PLAYWRIGHT_EXECUTABLE_PATH set.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

test('production Explorer renders English controls, diagnostics and locale formats', async () => {
  const browser = await chromium.launch({ headless: true,
    executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH || undefined });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    await page.route('http://bepacom.test/**', route => route.fulfill({ contentType: 'text/html', body: '<html><body></body></html>' }));
    await page.goto('http://bepacom.test/');
    await page.addScriptTag({ type: 'module', content: fs.readFileSync(
      path.join(__dirname, '../frontend/bepacom-panel.js'), 'utf8') });
    await page.evaluate(async () => {
      await customElements.whenDefined('bepacom-explorer-view');
      const view = document.createElement('bepacom-explorer-view');
      view._startInitialLoad = view._startRefreshTimer = view._startLiveTimer = () => {};
      view._language = 'en';
      view._mainSection = 'live';
      view._dashboardTab = 'live';
      view._liveChanges = Array.from({ length: 1234 }, (_, i) => ({
        unique_id: 'demo', ts: new Date().toISOString(), object_name: 'Demo point',
        value: i, previous_value: i - 1, source: 'cov' }));
      document.body.append(view);
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    });
    const root = page.locator('bepacom-explorer-view');
    await assert.doesNotReject(() => root.getByRole('button', { name: 'Pause', exact: true }).waitFor());
    const summary = await root.locator('.live-summary').innerText();
    assert.match(summary, /1,234 stored/);
    assert.match(summary, /matching filters/);
    assert.match(summary, /20\.57\/s/);
    assert.match(summary, /last minute/);
    assert.match(summary, /Peak/);
    assert.match(await root.locator('.live-foot').innerText(), /Ring buffer: up to 10,000 changes/);
    assert.match(await root.locator('.api-protocol-title').innerText(), /processing/i);
    const time = await root.locator('.live-table tbody tr').first().locator('td').first().innerText();
    assert.match(time, /(?:AM|PM)/);
    if (process.env.BEPACOM_GUI_SCREENSHOT_DIR) {
      await page.screenshot({ path: path.join(process.env.BEPACOM_GUI_SCREENSHOT_DIR, 'beacon-english-live.png') });
      await page.setViewportSize({ width: 390, height: 844 });
      await page.screenshot({ path: path.join(process.env.BEPACOM_GUI_SCREENSHOT_DIR, 'beacon-english-mobile.png') });
      await page.setViewportSize({ width: 1440, height: 1000 });
    }
    await root.getByRole('button', { name: 'Pause', exact: true }).click();
    await root.getByRole('button', { name: 'Resume', exact: true }).waitFor();
    assert.match(await root.locator('.live-chart i').first().getAttribute('title'), /changes?/);
    for (const section of ['configuration', 'diagnostics', 'live']) {
      await page.evaluate(section => {
        const view = document.querySelector('bepacom-explorer-view');
        view._mainSection = section;
        view._dashboardTab = section === 'diagnostics' ? 'developer' : 'live';
        view._render();
      }, section);
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      const texts = await root.evaluate(el => {
        const walker = document.createTreeWalker(el.shadowRoot, NodeFilter.SHOW_TEXT);
        const result = []; let node;
        while ((node = walker.nextNode())) if (!node.parentElement?.closest('style,script')) result.push(node.textContent);
        return result.join(' ');
      });
      assert.doesNotMatch(texts, /[äöüßÄÖÜ]|\b(?:Pausieren|Fortsetzen|gespeichert|Spitze|letzte Minute|warteten)\b/, section + ': ' + texts);
    }
    for (const sideTab of ['inspector', 'technical', 'engineering', 'virtual']) {
      await page.evaluate(sideTab => {
        const view = document.querySelector('bepacom-explorer-view');
        view._mainSection = 'configuration'; view._activeView = 'explorer';
        view._detailsVisible = true; view._sideTab = sideTab;
        view._selected = { unique_id: 'demo', device_id: '1', object_type: 'multiStateOutput',
          object_id: '1', object_key: 'multiStateOutput:1', object_name: 'Demo point',
          entity_id: 'number.demo', present_value: 2, enabled: true, writable: true };
        view._points = [view._selected];
        view._pendingReloadIds = new Set(['demo']);
        view._render();
      }, sideTab);
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      const text = await root.locator('bepacom-point-inspector').innerText();
      assert.doesNotMatch(text, /[äöüßÄÖÜ]|\b(?:Keine|Nicht|Wartet|warteten|Speichern|Zurücksetzen)\b/, sideTab + ': ' + text);
      assert.match(await root.locator('.pending-reload').innerText(), /1 pending change/);
    }
    await page.evaluate(() => {
      const view = document.querySelector('bepacom-explorer-view');
      view._language = 'de'; view._mainSection = 'live'; view._dashboardTab = 'live'; view._livePaused = false; view._render();
    });
    await root.getByRole('button', { name: 'Pausieren', exact: true }).waitFor();
    assert.match(await root.locator('.live-summary').innerText(), /1\.234 gespeichert/);
    assert.match(await root.locator('.live-summary').innerText(), /20,57\/s/);
  } finally { await browser.close(); }
});
