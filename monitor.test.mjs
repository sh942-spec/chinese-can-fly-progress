import assert from 'node:assert/strict';
import test from 'node:test';
import { compute, taskPaths } from './monitor.mjs';

const ledger = (status = 'in_progress', result = '') => ({ tasks: Array.from({ length: 8 }, (_, i) => ({
  id: `H-${String(i + 1).padStart(2, '0')}`, status: i === 1 ? status : 'todo', result: i === 1 ? result : ''
})) });
const files = paths => Object.fromEntries(paths.map(path => [path, 'initial-blob']));
const group = dir => ['stable.csv', 'zone_shift.csv', 'edge_cases.csv'].map(name => `${dir}/${name}`);
const h02 = (paths, status, result, accepted = {}) => compute(files(paths), {}, ledger(status, result), accepted)[1];
const threeCollections = ['data/README.md', ...group('data/shifeng_synthetic'), ...group('data/jingyao_synthetic'), 'data/real_nyc.csv'];

test('two synthetic groups plus real CSV receive file credit, without final acceptance', () => {
  const row = h02(threeCollections);
  assert.equal(row.earned, 5);
  assert.equal(row.status, '进行中');
  assert.match(row.evidence[0], /2 个候选数据组/);
  assert.match(row.evidence[0], /合计 7 份 CSV/);
});
test('legacy root group still earns the same file credit', () => {
  assert.equal(h02(['data/README.md', ...group('data')]).earned, 5);
});
test('a nested group may supply its own codebook', () => {
  assert.equal(h02(['data/examples/README.md', ...group('data/examples')]).earned, 5);
});
test('unrelated single CSV collections are not treated as one demonstration group', () => {
  assert.equal(h02(['data/README.md', 'data/a/one.csv', 'data/b/one.csv']).earned, 2);
});
test('data alone does not earn codebook or acceptance points', () => {
  assert.equal(h02(group('data/examples')).earned, 3);
});
test('done without a result does not earn the acceptance gate', () => {
  assert.equal(h02(threeCollections, 'done', '').earned, 5);
});
test('recorded acceptance earns full points and changed files invalidate it', () => {
  const accepted = {};
  assert.equal(h02(threeCollections, 'done', 'Verified collection', accepted).earned, 10);
  const changed = files(threeCollections);
  changed['data/jingyao_synthetic/stable.csv'] = 'changed-blob';
  assert.equal(compute(changed, {}, ledger('done', 'Verified collection'), accepted)[1].earned, 5);
  assert.equal(compute(changed, {}, ledger('done', 'Reverified changed collection'), accepted)[1].earned, 10);
});

const appFiles = files(['app/app.py', 'app/qc.py', 'app/testme.sh', 'app/frontend/src/App.jsx', 'tests/test_api.py']);
const appLedger = ledger();
appLedger.tasks[3] = { id: 'H-04', status: 'done', result: 'Application and browser checks passed' };

test('H-06 deployment additions and updates preserve H-04 acceptance', () => {
  const accepted = {};
  assert.equal(compute(appFiles, {}, appLedger, accepted)[3].earned, 25);
  const deployed = { ...appFiles, 'app/manifest.json': 'manifest-v1', 'app/.python-version': 'version-v1' };
  assert.equal(compute(deployed, {}, appLedger, accepted)[3].earned, 25);
  deployed['app/manifest.json'] = 'manifest-v2';
  deployed['app/.python-version'] = 'version-v2';
  assert.equal(compute(deployed, {}, appLedger, accepted)[3].earned, 25);
  assert.deepEqual(taskPaths(5, deployed), { 'app/.python-version': 'version-v2', 'app/manifest.json': 'manifest-v2' });
});

test('old browser fingerprints normalize deployment files without hiding application changes', () => {
  const accepted = { 'H-04': { result: appLedger.tasks[3].result, files: { ...appFiles, 'app/manifest.json': 'old-manifest', 'app/.python-version': 'old-version' } } };
  const deployed = { ...appFiles, 'app/manifest.json': 'new-manifest', 'app/.python-version': 'new-version' };
  assert.equal(compute(deployed, {}, appLedger, accepted)[3].earned, 25);
  assert.equal(compute({ ...deployed, 'app/app.py': 'changed-app' }, {}, appLedger, accepted)[3].earned, 15);
  assert.equal(compute({ ...deployed, 'app/qc.py': 'changed-core' }, {}, appLedger, accepted)[3].earned, 15);
  assert.equal(compute({ ...deployed, 'app/frontend/src/App.jsx': 'changed-ui' }, {}, appLedger, accepted)[3].earned, 15);
});
