import { load, JSON_SCHEMA } from './vendor/js-yaml.mjs';

export const REPO = 'haydenYang666/SYSEN5300_hackathon';
export const INTERVAL_SECONDS = 600;
export const STORAGE_KEY = 'chinese-can-fly-progress-browser-v2';
const API = 'https://api.github.com/repos/' + REPO;
const REPO_URL = 'https://github.com/' + REPO;
const TITLES = ['方案与接口', '正式演示数据', '统计核心', '前后端联调', '演示与录屏', '上线部署', '使用文档', '最终提交'];
const WEIGHTS = [10, 10, 25, 25, 10, 10, 5, 5];
const OWNERS = ['Shifeng / 全队', 'Jingyao', 'Shifeng', 'Julian / Pingchuan', 'Jingyao / Pingchuan', 'Hayden', 'Jingyao', 'Hayden'];
const SCOPES = [['SPEC.md', 'docs/plan.md', 'docs/interfaces.md'], ['data/'], ['app/qc.py', 'tests/test_qc.py', 'tests/fixtures/qc/'], ['app/', 'tests/test_api.py', 'tests/fixtures/api/'], ['demo/'], ['.github/workflows/', '.github/scripts/', 'app/manifest.json', 'app/.python-version'], ['README.md', 'app/README.md'], ['.gitignore']];
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const clone = value => JSON.parse(JSON.stringify(value));
export function parseLedger(text) {
  if (typeof text !== 'string' || text.length > 1000000) throw new Error('任务表缺失或过大，保留上次进度。');
  const ledger = load(text, { schema: JSON_SCHEMA, json: false });
  if (!object(ledger) || !Array.isArray(ledger.tasks)) throw new Error('任务表格式无效，保留上次进度。');
  return ledger;
}
export function taskPaths(index, files) {
  // CONTRACT assigns these deployment files to H-06, outside H-04 acceptance.
  const excluded = index === 3 ? ['app/manifest.json', 'app/.python-version'] : [];
  return Object.fromEntries(Object.entries(files).filter(([p]) => !excluded.includes(p) && SCOPES[index].some(s => s.endsWith('/') ? p.startsWith(s) : p === s)).sort(([a], [b]) => a.localeCompare(b)));
}
// Same deterministic milestones and acceptance scopes as the local Python monitor.
// accepted is intentionally updated in place; persist it with the returned rows.
export function compute(files, texts, ledger, accepted = {}) {
  const tasks = new Map((ledger.tasks || []).filter(t => object(t) && 'id' in t).map(t => [t.id, t]));
  if (WEIGHTS.some((_, i) => !tasks.has('H-' + String(i + 1).padStart(2, '0')))) throw new Error('任务表缺少 H-01 至 H-08，保留上次进度。');
  return WEIGHTS.map((weight, i) => {
    const id = 'H-' + String(i + 1).padStart(2, '0'), task = tasks.get(id), result = String(task.result || '').trim();
    const evidence = [], remaining = [], paths = Object.keys(files), has = p => Object.hasOwn(files, p);
    let earned = 0, checks, gate;
    const add = (ok, points, yes, no) => { earned += ok ? points : 0; (ok ? evidence : remaining).push(ok ? yes : no); return Boolean(ok); };
    if (i === 0) {
      checks = [add(Boolean(texts['SPEC.md']) && !/FILL IN[.,]/.test(texts['SPEC.md']), 2, 'SPEC 已填写', 'SPEC 尚未填齐'), add(has('docs/plan.md'), 2, '实施计划已提交', '待提交实施计划'), add(has('docs/interfaces.md'), 2, '接口文档已提交', '待提交接口文档')]; gate = 4;
    } else if (i === 1) {
      const csvPaths = paths.filter(p => p.startsWith('data/') && p.endsWith('.csv'));
      const groups = new Map();
      for (const path of csvPaths) { const dir = path.slice(0, path.lastIndexOf('/')); groups.set(dir, (groups.get(dir) || 0) + 1); }
      const candidates = [...groups].filter(([, count]) => count >= 2 && count <= 3);
      const codebook = has('data/README.md') || candidates.some(([dir]) => has(dir + '/README.md'));
      checks = [add(candidates.length > 0, 3, '已提交 ' + candidates.length + ' 个候选数据组（每组 2–3 份 CSV；合计 ' + csvPaths.length + ' 份 CSV）', '待提交一个含 2–3 份 CSV 的数据组'), add(codebook, 2, 'Codebook 文件已提交（内容待验收）', '待提交 data/README.md 或数据组 README.md')]; gate = 5;
    } else if (i === 2) {
      checks = [add(has('app/qc.py'), 4, '统计核心已提交', '待提交统计核心'), add(has('tests/test_qc.py'), 4, '核心测试已提交', '待提交核心测试'), add(has('tests/fixtures/qc/REVIEW.md'), 2, '独立审查记录已提交', '待提交独立审查记录')]; gate = 15;
    } else if (i === 3) {
      checks = [add(['app/app.py', 'app/testme.sh', 'tests/test_api.py'].every(has), 5, '后端与启动脚本已合入主分支', '后端尚未完整合入主分支'), add(has('app/frontend/src/App.jsx'), 5, '前端已合入主分支', '待合入前端'), add(/passed|通过/i.test(result), 5, '任务表有测试通过记录（非本轮重跑）', '待登记测试结果')]; gate = 10;
    } else if (i === 4) {
      checks = [add(has('demo/README.md'), 3, '演示流程已提交', '待提交演示流程'), add(paths.some(p => p.startsWith('demo/recordings/') && /\.(mp4|webm|mov|md|txt)$/i.test(p)), 2, '录屏或录屏链接材料已提交', '待提交录屏或链接材料')]; gate = 5;
    } else if (i === 5) {
      checks = [add(paths.some(p => p.startsWith('.github/workflows/') && /\.(yml|yaml)$/.test(p)), 2, '部署工作流文件已提交（运行状态待验收）', '待提交部署工作流'), add(has('app/manifest.json'), 2, '部署 manifest 已提交', '待提交部署 manifest')]; gate = 6;
    } else if (i === 6) {
      checks = [add([...(texts['README.md'] || '').trim()].length >= 600, 2, '项目 README 已展开（内容待验收）', '待补齐项目 README'), add(has('app/README.md'), 1, '应用运行说明已提交', '待提交应用运行说明')]; gate = 2;
    } else { checks = [add(true, 1, '公开团队仓库可访问', '')]; gate = 4; }
    const fingerprint = taskPaths(i, files), reportedDone = task.status === 'done' && Boolean(result);
    let record = accepted[id];
    if (!reportedDone) { delete accepted[id]; record = null; }
    else if (!record || record.result !== result) record = accepted[id] = { result, files: fingerprint };
    const prior = record && object(record.files) ? taskPaths(i, record.files) : null;
    const fresh = Boolean(record) && JSON.stringify(prior) === JSON.stringify(fingerprint);
    const complete = reportedDone && fresh && checks.every(Boolean);
    add(complete, gate, '任务表已验收：done + 结果记录', reportedDone && !fresh ? '文件已变化，需更新验收记录' : '待任务负责人完成验收并更新 CONTRACT');
    if (result) evidence.push('任务表记录：' + [...result].slice(0, 700).join(''));
    return { id, title: TITLES[i], owner: OWNERS[i], earned, max: weight, status: complete ? '已验收' : earned ? '进行中' : '待交付', evidence, remaining };
  });
}
export const evaluate = compute;

export function createMonitor(options = {}) {
  const now = options.now || Date.now, fetcher = options.fetch || globalThis.fetch.bind(globalThis);
  let storage = options.storage;
  if (storage === undefined) { try { storage = globalThis.localStorage; } catch { storage = null; } }
  const listeners = new Set(), lockKey = STORAGE_KEY + '-lease';
  let cache = {}, accepted = {}, lastAttempt = 0, blockedUntil = 0, calls = [], running = false, stopped = true, timer;
  let state = { monitor_id: 'chinese-can-fly-progress-browser-v2', repo: REPO_URL, score: null, tasks: [], history: [], sha: '', commit_message: '', open_prs: [], checked_at: null, last_success_at: null, next_check_at: null, interval_seconds: INTERVAL_SECONDS, checking: false, stale: true, error: null, cache_warning: null, manual_available_at: null };
  const iso = value => new Date(value).toISOString();
  function readSaved() {
    try { const s = JSON.parse(storage?.getItem(STORAGE_KEY) || 'null'); return s?.version === 2 && s.display?.repo === REPO_URL && object(s.cache) && object(s.acceptance) ? s : null; } catch { return null; }
  }
  function absorb(saved) {
    if (!saved) return;
    state = { ...state, ...saved.display, checking: false };
    cache = saved.cache; accepted = saved.acceptance; lastAttempt = Number(saved.last_attempt_at) || 0; blockedUntil = Number(saved.blocked_until) || 0;
    calls = Array.isArray(saved.api_calls) ? saved.api_calls.filter(t => Number.isFinite(t) && t > now() - 3600000) : [];
    state.stale = Boolean(state.stale || !state.last_success_at || now() - Date.parse(state.last_success_at) >= INTERVAL_SECONDS * 1000);
    state.manual_available_at = iso(Math.max(lastAttempt + 60000, blockedUntil));
  }
  absorb(readSaved());
  function save() {
    try { if (!storage) throw new Error(); storage.setItem(STORAGE_KEY, JSON.stringify({ version: 2, display: { ...state, checking: false }, cache, acceptance: accepted, last_attempt_at: lastAttempt, blocked_until: blockedUntil, api_calls: calls })); }
    catch { state.cache_warning = '浏览器未允许保存缓存；当前页面仍可检查，关闭后不保留历史。'; }
  }
  function emit() { for (const fn of listeners) { try { fn(clone(state)); } catch (e) { console.error('Monitor display error', e); } } }
  function schedule() {
    clearTimeout(timer); if (stopped) return;
    const at = Math.max(Date.parse(state.next_check_at) || 0, blockedUntil);
    timer = setTimeout(() => refresh(), Math.max(1000, at - now()));
  }
  async function request(url, raw = false) {
    if (!raw) {
      calls = calls.filter(t => t > now() - 3600000);
      if (now() < blockedUntil || calls.length >= 48) {
        blockedUntil = Math.max(blockedUntil, calls.length >= 48 ? calls[0] + 3600000 : 0);
        throw new Error('浏览器请求预算已达上限，稍后自动重试。');
      }
      calls.push(now()); save();
    }
    const response = await fetcher(url, { headers: { Accept: raw ? 'text/plain' : 'application/vnd.github+json' }, credentials: 'omit', referrerPolicy: 'no-referrer', cache: 'no-store', signal: AbortSignal.timeout(20000) });
    if (!response.ok) {
      if (response.status === 403 || response.status === 429) {
        const reset = Number(response.headers.get('x-ratelimit-reset')) * 1000, retry = Number(response.headers.get('retry-after')) * 1000;
        blockedUntil = Math.max(now() + (retry || 600000), Number.isFinite(reset) ? reset + 1000 : 0);
        throw new Error('GitHub 暂时限制匿名请求，已暂停检查并保留最近成功数据。');
      }
      throw new Error('GitHub 读取失败（HTTP ' + response.status + '）。');
    }
    if (!raw && response.headers.get('x-ratelimit-remaining') === '0') blockedUntil = Math.max(now() + 60000, Number(response.headers.get('x-ratelimit-reset')) * 1000 + 1000 || 0);
    const text = await response.text(); if (text.length > 4000000) throw new Error('GitHub 返回内容过大，保留上次进度。');
    return raw ? text : JSON.parse(text);
  }
  async function check(manual) {
    absorb(readSaved());
    const due = Date.parse(state.next_check_at) || 0;
    if (now() < blockedUntil || now() < lastAttempt + 60000 || (!manual && now() < due)) { emit(); return; }
    lastAttempt = now(); state = { ...state, checking: true, checked_at: iso(lastAttempt), manual_available_at: iso(lastAttempt + 60000), next_check_at: iso(lastAttempt + INTERVAL_SECONDS * 1000) }; save(); emit();
    try {
      const ref = await request(API + '/git/ref/heads/main'), sha = ref?.object?.sha;
      if (!/^[a-f0-9]{40}$/i.test(sha || '')) throw new Error('GitHub 未返回有效的主分支提交。');
      const pulls = await request(API + '/pulls?state=open&per_page=30');
      if (!Array.isArray(pulls)) throw new Error('GitHub PR 列表格式无效。');
      let nextCache = cache;
      if (cache.sha !== sha || !object(cache.files) || !object(cache.texts)) {
        const tree = await request(API + '/git/trees/' + sha + '?recursive=1');
        if (tree.truncated || !Array.isArray(tree.tree)) throw new Error('GitHub 文件列表不完整，保留上次进度。');
        const files = Object.fromEntries(tree.tree.filter(x => x.type === 'blob').map(x => [x.path, x.sha])), texts = {};
        for (const name of ['CONTRACT.yaml', 'SPEC.md', 'README.md']) if (Object.hasOwn(files, name)) texts[name] = await request('https://raw.githubusercontent.com/' + REPO + '/' + sha + '/' + name, true);
        const commit = await request(API + '/git/commits/' + sha);
        nextCache = { sha, files, texts, message: String(commit.message || '').split(/\r?\n/)[0] };
      }
      const nextAcceptance = clone(accepted), rows = compute(nextCache.files, nextCache.texts, parseLedger(nextCache.texts['CONTRACT.yaml']), nextAcceptance), score = rows.reduce((sum, t) => sum + t.earned, 0), at = iso(now());
      const history = Array.isArray(state.history) ? [...state.history] : [], last = history.at(-1);
      if (!last || last.score !== score || last.sha !== sha) history.push({ at, score, sha });
      cache = nextCache; accepted = nextAcceptance;
      state = { ...state, score, tasks: rows, sha, commit_message: cache.message, open_prs: pulls.map(p => ({ number: p.number, title: p.title, url: p.html_url })), last_success_at: at, error: null, stale: false, history: history.slice(-40) };
    } catch (error) { state.error = String(error.message || error).slice(0, 240); state.stale = true; }
    finally { state.checking = false; state.next_check_at = iso(Math.max(now() + INTERVAL_SECONDS * 1000, blockedUntil)); state.manual_available_at = iso(Math.max(lastAttempt + 60000, blockedUntil)); save(); emit(); }
  }
  async function withLease(action) {
    if (!storage) return action();
    const token = globalThis.crypto?.randomUUID?.() || String(Math.random());
    try {
      const previous = JSON.parse(storage.getItem(lockKey) || 'null');
      if (previous?.until > now()) { absorb(readSaved()); state.next_check_at = iso(Math.max(now() + 15000, Date.parse(state.next_check_at) || 0)); emit(); return; }
      storage.setItem(lockKey, JSON.stringify({ token, until: now() + 180000 }));
      await new Promise(resolve => setTimeout(resolve, 30));
      if (JSON.parse(storage.getItem(lockKey) || 'null')?.token !== token) return;
    } catch { return action(); }
    const renew = setInterval(() => { try { storage.setItem(lockKey, JSON.stringify({ token, until: now() + 180000 })); } catch {} }, 30000);
    try { return await action(); } finally { clearInterval(renew); try { if (JSON.parse(storage.getItem(lockKey) || 'null')?.token === token) storage.removeItem(lockKey); } catch {} }
  }
  async function refresh({ manual = false } = {}) {
    if (running) return clone(state); running = true;
    try {
      const locks = options.locks === undefined ? globalThis.navigator?.locks : options.locks;
      if (locks?.request) await locks.request(STORAGE_KEY, { mode: 'exclusive' }, () => check(manual));
      else await withLease(() => check(manual));
    } finally { running = false; schedule(); }
    return clone(state);
  }
  const storageChanged = event => { if (event.key === STORAGE_KEY && !running) { absorb(readSaved()); emit(); schedule(); } };
  const visible = () => { if (globalThis.document?.visibilityState === 'visible' && !stopped) refresh(); };
  return {
    getState: () => clone(state), refresh,
    subscribe(fn) { listeners.add(fn); fn(clone(state)); return () => listeners.delete(fn); },
    start() { if (!stopped) return; stopped = false; globalThis.addEventListener?.('storage', storageChanged); globalThis.document?.addEventListener('visibilitychange', visible); refresh(); },
    stop() { stopped = true; clearTimeout(timer); globalThis.removeEventListener?.('storage', storageChanged); globalThis.document?.removeEventListener('visibilitychange', visible); }
  };
}
