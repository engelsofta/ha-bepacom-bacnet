// Run: node --test tests/test_explorer_layout.cjs
// Requires Playwright (set NODE_PATH to its package directory if necessary).
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const { chromium } = require('playwright');

function styles(file, name) {
  const context = { exports: {} };
  const source = fs.readFileSync(path.join(__dirname, '../frontend/src', file), 'utf8');
  vm.runInNewContext(ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText, context);
  return context.exports[name];
}

test('real table and Inspector headers stay readable while scrolling', async () => {
  const browser = await chromium.launch({ headless: true,
    executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH || undefined });
  try {
    const page = await browser.newPage();
    const css = styles('explorer-base-styles.ts', 'EXPLORER_BASE_STYLES')
      + styles('engelsoft-theme.ts', 'ENGELSOFT_THEME');
    await page.setContent(`<style>${css}</style><div class="wrap theme-dark">
      <bepacom-point-table class="table-wrap"></bepacom-point-table>
      <bepacom-point-inspector class="side"></bepacom-point-inspector></div>`);
    await page.addScriptTag({ type: 'module', content: fs.readFileSync(
      path.join(__dirname, '../frontend/bepacom-panel.js'), 'utf8') });
    await page.evaluate(async () => {
      await customElements.whenDefined('bepacom-point-inspector');
      const table = document.querySelector('bepacom-point-table');
      table.rows = Array.from({ length: 60 }, (_, i) => ({ kind: 'point', uniqueId: `p${i}`,
        objectKey: `analogInput:${i}`, entityName: `Entity ${i}`, entityId: `sensor.p${i}`,
        linkedEntities: [], value: '21', unit: '°C', runtimeLabel: 'Push' }));
      const inspector = document.querySelector('bepacom-point-inspector');
      inspector.model = { ...inspector.model, selected: { object_key: 'analogInput:137',
        object_name: 'Room temperature', unique_id: 'p137' }, dirty: true,
        sectionOpen: { config: true } };
      await Promise.all([table.updateComplete, inspector.updateComplete]);
    });
    // Constrain the real scroll containers without substituting header styles.
    await page.addStyleTag({ content: `.wrap { display:grid!important; grid-template-columns:1fr 400px!important; height:440px!important; padding:12px!important; gap:20px; }
      .wrap .table-wrap,.wrap .side { height:400px!important; min-height:0!important; }
      .side-body::after { content:''; display:block; height:900px; }` });
    for (const theme of ['theme-dark', 'theme-light']) {
      for (const width of [1440, 390]) {
        await page.setViewportSize({ width, height: 700 });
        await page.evaluate(({ theme, width }) => {
          document.querySelector('.wrap').className = `wrap ${theme}`;
          document.querySelector('.wrap').style.setProperty('grid-template-columns', width < 700 ? '1fr' : '1fr 400px', 'important');
          document.querySelector('.table-wrap').style.display = width < 700 ? 'none' : 'block';
          document.querySelector('.side-body').scrollTop = 180;
          document.querySelector('.table-wrap').scrollTop = 400;
        }, { theme, width });
        const result = await page.evaluate(() => {
          const head = document.querySelector('.point-inspector-head');
          const body = document.querySelector('.side-body');
          const rect = head.getBoundingClientRect();
          const buttons = [...head.querySelectorAll('button')].map(b => b.getBoundingClientRect());
          const sample = document.elementFromPoint(rect.x + rect.width / 2, rect.y + 12);
          const th = document.querySelector('thead');
          return { headTop: rect.top, bodyTop: body.getBoundingClientRect().top,
            buttonsInline: buttons.every(b => Math.abs(b.top - buttons[0].top) < 1 && b.right <= rect.right),
            foreground: head.contains(sample), background: getComputedStyle(head).backgroundColor,
            tableTop: th.getBoundingClientRect().top,
            scrollTop: document.querySelector('.table-wrap').getBoundingClientRect().top,
            tableBackground: getComputedStyle(th).backgroundColor };
        });
        assert.ok(Math.abs(result.headTop - result.bodyTop) < 2, `${theme}/${width}: sticky Inspector`);
        assert.ok(result.buttonsInline, `${theme}/${width}: actions stay in one row`);
        assert.ok(result.foreground, `${theme}/${width}: form cannot cover header`);
        assert.match(result.background, /^rgb\(/, 'opaque base remains under glass');
        if (width > 700) {
          assert.ok(Math.abs(result.tableTop - result.scrollTop) < 3, 'table header stays at top');
          assert.match(result.tableBackground, /^rgb\(/, 'table header is opaque');
        }
      }
    }
  } finally { await browser.close(); }
});
