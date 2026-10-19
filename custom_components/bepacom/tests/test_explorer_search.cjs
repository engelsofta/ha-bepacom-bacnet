// Run with: node --test tests/test_explorer_search.cjs
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const source = fs.readFileSync(path.join(__dirname, '../frontend/src/explorer-view.ts'), 'utf8')
  .replace(/^import .*;\r?\n/gm, '')
  .replace('export class BepacomExplorerView', 'class BepacomExplorerView');

function fixture() {
  const timers = new Map();
  let timerId = 0;
  const context = vm.createContext({
    HTMLElement: class {},
    customElements: { get: () => true },
    document: { hidden: false },
    queueMicrotask,
    window: {
      setTimeout: (fn) => { timers.set(++timerId, fn); return timerId; },
      clearTimeout: (id) => timers.delete(id),
    },
  });
  vm.runInContext(ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2022 },
  }).outputText + '\nglobalThis.View = BepacomExplorerView;', context);
  const view = Object.create(context.View.prototype);
  Object.defineProperty(view, 'hass', { value: {}, writable: true });
  const toolbar = new EventTarget();
  toolbar.dataset = {};
  const table = { scrollTop: 900 };
  Object.assign(view, {
    hass: {}, _connected: true, _pointsGeneration: 0, _filters: { search: '' },
    _runtimeVersions: {}, _pendingTableUpdates: new Set(), _refreshGeneration: 0,
    _points: [], _selected: null, _debounce: null, _loading: false,
    shadowRoot: { getElementById: (id) => id === 'tableWrap' ? table : toolbar },
    _allVirtualEntities: () => [], _scheduleLocalization() {},
    _trackClientHistory() {}, _updateListDom() {}, _updateHeaderDom() {},
    _updateDetailDom() {}, _render() {}, _formatError: (err) => err.message,
  });
  return { view, toolbar, table, timers };
}

function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

test('reconfiguring the toolbar binds exactly one handler', () => {
  const { view, toolbar } = fixture();
  let calls = 0;
  view._setFilter = () => calls++;
  for (let i = 0; i < 20; i++) view._configureExplorerToolbar();
  const event = new Event('bepacom-toolbar-action');
  event.detail = { action: 'filter', key: 'search', value: 'heizung' };
  toolbar.dispatchEvent(event);
  assert.equal(calls, 1);
});

test('an older response cannot overwrite a newer result', async () => {
  const { view } = fixture();
  const old = deferred(), latest = deferred();
  const requests = [old, latest];
  view._callWSWithTimeout = () => requests.shift().promise;
  const first = view._loadPoints(false);
  const second = view._loadPoints(false);
  latest.resolve({ points: [{ unique_id: 'latest' }] });
  await second;
  old.resolve({ points: [{ unique_id: 'old' }] });
  await first;
  assert.equal(view._points[0].unique_id, 'latest');
});

test('typing invalidates an old request before the debounce fires', async () => {
  const { view, timers, table } = fixture();
  const old = deferred();
  view._callWSWithTimeout = () => old.promise;
  const first = view._loadPoints(false);
  view._setFilter('search', 'h');
  view._setFilter('search', 'heizung');
  assert.equal(timers.size, 1);
  assert.equal(table.scrollTop, 0);
  old.resolve({ points: [{ unique_id: 'obsolete' }] });
  await first;
  assert.equal(view._points.length, 0);
});

test('stale errors do not replace the successful current query', async () => {
  const { view } = fixture();
  const old = deferred(), latest = deferred();
  const requests = [old, latest];
  view._callWSWithTimeout = () => requests.shift().promise;
  const first = view._loadPoints(false);
  const second = view._loadPoints(false);
  latest.resolve({ points: [{ unique_id: 'latest' }] });
  await second;
  old.reject(new Error('stale timeout'));
  await first;
  assert.equal(view._error, null);
});

test('device filtering is local and preserves the pending text query', () => {
  const { view, timers } = fixture();
  view._setFilter('search', 'heizung');
  const generation = view._pointsGeneration;
  view._setFilter('device_id', '123');
  assert.equal(timers.size, 1);
  assert.equal(view._pointsGeneration, generation);
  assert.equal(view._filters.device_id, '123');
});

test('responses after disconnect do not change the view', async () => {
  const { view } = fixture();
  const request = deferred();
  view._callWSWithTimeout = () => request.promise;
  const pending = view._loadPoints(false);
  view._connected = false;
  request.resolve({ points: [{ unique_id: 'obsolete' }] });
  await pending;
  assert.equal(view._points.length, 0);
});

test('hover and focused buttons do not block updates, active inputs do', () => {
  const { view, table } = fixture();
  table.contains = () => true;
  table.matches = () => { throw new Error('hover must not be queried'); };
  assert.equal(view._isUserInteractingWithTable(), false);
  view.shadowRoot.activeElement = { tagName: 'BUTTON' };
  assert.equal(view._isUserInteractingWithTable(), false);
  for (const tagName of ['INPUT', 'SELECT', 'TEXTAREA']) {
    view.shadowRoot.activeElement = { tagName };
    assert.equal(view._isUserInteractingWithTable(), true);
  }
});

test('runtime deltas retain unchanged point identities and update only changed history', async () => {
  const { view } = fixture();
  const unchanged = { unique_id: 'a', present_value: 10 };
  const changed = { unique_id: 'b', present_value: 20 };
  view._points = [unchanged, changed];
  view._entryId = 'entry';
  view._callWSWithTimeout = async () => ({
    points: [{ unique_id: 'b', present_value: 25, runtime_version: 'v2' }],
  });
  let updatedIds, history;
  view._updateListDom = (ids) => { updatedIds = ids; };
  view._trackClientHistory = (points) => { history = points; };
  await view._refreshPointsInPlace();
  assert.equal(view._points[0], unchanged);
  assert.equal(view._points[1].present_value, 25);
  assert.deepEqual([...updatedIds], ['b']);
  assert.equal(history.length, 1);
  assert.equal(view._runtimeVersions.b, 'v2');
});

test('empty delta does not update table and sends known versions', async () => {
  const { view } = fixture();
  view._points = [{ unique_id: 'a', present_value: 10 }];
  view._entryId = 'entry';
  view._runtimeVersions = { a: 'v1' };
  let request, redraws = 0;
  view._callWSWithTimeout = async (message) => { request = message; return { points: [] }; };
  view._updateListDom = () => redraws++;
  await view._refreshPointsInPlace();
  assert.equal(redraws, 0);
  assert.equal(request.known_versions.a, 'v1');
});

test('deferred edit updates flush after input loses focus even with an empty delta', async () => {
  const { view, table } = fixture();
  view._points = [{ unique_id: 'a', present_value: 10 }];
  view._entryId = 'entry';
  table.contains = () => true;
  view.shadowRoot.activeElement = { tagName: 'INPUT' };
  let redraws = 0;
  view._updateListDom = () => redraws++;
  view._callWSWithTimeout = async () => ({ points: [{ unique_id: 'a', present_value: 11 }] });
  await view._refreshPointsInPlace();
  assert.equal(redraws, 0);
  assert.equal(view._pendingTableUpdates.size, 1);
  view.shadowRoot.activeElement = null;
  view._callWSWithTimeout = async () => ({ points: [] });
  await view._refreshPointsInPlace();
  assert.equal(redraws, 1);
  assert.equal(view._pendingTableUpdates.size, 0);
});

test('runtime response for a superseded search is ignored', async () => {
  const { view } = fixture();
  view._entryId = 'entry';
  view._points = [{ unique_id: 'a', present_value: 10 }];
  const old = deferred();
  view._callWSWithTimeout = () => old.promise;
  const pending = view._refreshPointsInPlace();
  view._pointsGeneration++;
  old.resolve({ points: [{ unique_id: 'a', present_value: 99 }] });
  await pending;
  assert.equal(view._points[0].present_value, 10);
});

test('row models for unchanged points are reused during a delta refresh', () => {
  const { view, table } = fixture();
  const oldRow = { kind: 'point', uniqueId: 'a', value: '10' };
  table.rows = [oldRow];
  table.dataset = { actionsBound: '1' };
  view._displayItems = () => [{ kind: 'point', point: { unique_id: 'a' } }];
  view._configurePointTable(new Set());
  assert.equal(table.rows[0], oldRow);
});

test('independent HA changes update only the linked source row', async () => {
  const { view, table } = fixture();
  const previous = { state: 'off' };
  view.hass = { states: { 'binary_sensor.feedback': previous } };
  table.rows = [{ kind: 'point', uniqueId: 'a',
    linkedEntities: [{ entityId: 'binary_sensor.feedback' }], linkedStates: [previous] }];
  view._updateVirtualStateDom = () => {};
  let redraws = 0, ids;
  view._updateListDom = (changedIds) => { redraws++; ids = changedIds; };
  view._scheduleVirtualStateDomUpdate();
  await Promise.resolve();
  assert.equal(redraws, 0);
  view.hass.states['binary_sensor.feedback'] = { state: 'on' };
  view._scheduleVirtualStateDomUpdate();
  await Promise.resolve();
  assert.equal(redraws, 1);
  assert.deepEqual([...ids], ['a']);
});
