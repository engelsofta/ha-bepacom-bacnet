const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const context = { exports: {} };
vm.runInNewContext(ts.transpileModule(fs.readFileSync(
  path.join(__dirname, '../frontend/src/i18n.ts'), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText, context);
const { translateText, normalizeLanguage } = context.exports;

test('dynamic messages translate before individual words', () => {
  for (const [input, expected] of [
    ['1 Änderung wartet', '1 pending change'],
    ['3 Änderungen warteten', '3 pending changes'],
    ['3 Änderungen warten', '3 pending changes'],
    ['1 Änderung', '1 change'],
    ['3 Änderungen', '3 changes'],
    ['1 verknüpfte Entität', '1 linked entity'],
    ['2 verknüpfte virtuelle Entitäten', '2 linked virtual entities'],
    ['vor 12 s', '12 s ago'],
    ['3 Overrides importieren', 'Import 3 overrides'],
    ['3 Overrides importiert, 2 unbekannte Punkte übersprungen. Bitte Integration neu laden.',
      '3 overrides imported, 2 unknown points skipped. Please reload the integration.'],
  ]) assert.equal(translateText(input, 'en'), expected, input);
});

test('live controls translate without corrupting words or German mode', () => {
  for (const [input, expected] of [
    ['Pausieren', 'Pause'], ['Fortsetzen', 'Resume'], ['gespeichert', 'stored'],
    ['im Filter', 'matching filters'], ['letzte Minute', 'last minute'], ['Spitze', 'Peak'],
    ['Unterdrückte gleiche Werte', 'Suppressed unchanged values'],
    ['Aktualisierungsmodus', 'Update mode'],
    ['Push-Verbindung', 'Push connection'], ['Verarbeitung', 'Processing'],
    ['Ringpuffer: maximal 10.000 Änderungen · angezeigt werden die neuesten 120 Treffer',
      'Ring buffer: up to 10,000 changes · showing the latest 120 matches'],
    ['Keine Bewegung', 'No motion'], ['Batterie in Ordnung', 'Battery normal'],
    ['verknüpfte virtuelle Entitäten', 'linked virtual entities'],
  ]) {
    assert.equal(translateText(input, 'en'), expected);
    assert.equal(translateText(input, 'de'), input);
    assert.equal(translateText(expected, 'en'), expected);
  }
  assert.equal(translateText('Wertpapier sensor.Wert_1', 'en'), 'Wertpapier sensor.Wert_1');
  assert.equal(normalizeLanguage('en-GB'), 'en');
  assert.equal(normalizeLanguage('de-AT'), 'de');
});

test('setup translations have identical keys and link placeholders', () => {
  const read = (name) => JSON.parse(fs.readFileSync(path.join(__dirname, '../translations', name), 'utf8'));
  const keys = (value, prefix = '') => Object.entries(value).flatMap(([key, item]) =>
    typeof item === 'object' ? keys(item, prefix + key + '.') : [prefix + key]);
  const de = read('de.json'), en = read('en.json');
  assert.deepEqual(keys(en).sort(), keys(de).sort());
  for (const step of ['user', 'app_unavailable', 'app_incompatible']) {
    assert.match(en.config.step[step].description, /\{bacstac_repository_url\}/);
  }
});
