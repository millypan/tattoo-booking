import assert from 'node:assert/strict';
import test from 'node:test';
process.env.NOTION_TOKEN = 'test-token';
process.env.BOOKINGS_DB = 'bookings';
process.env.SLOTS_DB = 'slots';
const { syncBookingMinimalSchedules, syncMissingMinimalSchedules, syncTattooTimes } = await import('../lib/notion.js');
const date = '2026-11-02T11:00:00+08:00';
function booking(extra = {}) {
  return { id: 'target', parent: { database_id: 'bookings' }, properties: {
    '工作行程時間': { date: { start: date } }, '行程分類': { select: { name: '補色' } },
    '狀態': { select: { name: '時間已確認' } }, ...extra,
  } };
}
function mock(t, target, existing = null) {
  const calls = [];
  const original = globalThis.fetch;
  globalThis.fetch = async (url, options) => {
    const path = new URL(url).pathname.replace('/v1', '');
    const body = options.body ? JSON.parse(options.body) : null;
    calls.push({ path, method: options.method, body });
    let result;
    if (path === '/pages/target' && options.method === 'GET') result = target;
    else if (path === '/databases/bookings') result = { properties: { '極簡排程': { relation: { database_id: 'minimal' } } } };
    else if (path === '/databases/bookings/query') result = { results: [target] };
    else if (path === '/databases/slots/query') result = { results: [] };
    else if (path === '/databases/minimal/query') result = { results: existing ? [existing] : [] };
    else if (path.startsWith('/pages') && ['POST', 'PATCH'].includes(options.method)) result = { id: 'written', ...body };
    else throw new Error('Unexpected ' + options.method + ' ' + path);
    return { ok: true, json: async () => result };
  };
  t.after(() => { globalThis.fetch = original; });
  return calls;
}
const writes = calls => calls.filter(c => c.path.startsWith('/pages') && c.method !== 'GET');

test('webhook handles only the changed booking, without a global booking scan', async t => {
  const item = booking({ '類型': { select: { name: '客製圖' } }, '刺青時間': { date: { start: date } } });
  const calls = mock(t, item);
  await syncBookingMinimalSchedules(item.id);
  assert.equal(calls.some(c => c.path === '/databases/bookings/query'), false);
  assert.ok(writes(calls).length > 0);
  for (const c of writes(calls)) assert.deepEqual(c.body.properties['關聯預約'].relation, [{ id: 'target' }]);
});

test('backup repairs an existing touch-up time instead of only filling empty relations', async t => {
  const item = booking();
  const calls = mock(t, item, { id: 'minimal-target', properties: { '時間': { date: { start: '2026-11-02T09:00:00+08:00' } } } });
  assert.equal(await syncMissingMinimalSchedules({ reconcile: true }), 1);
  const write = writes(calls).find(c => c.path === '/pages/minimal-target');
  assert.equal(write.body.properties['時間'].date.start, date);
  assert.equal(write.body.properties['排程'].title[0].text.content, '11:00 補色');
  const filter = calls.find(c => c.path === '/databases/bookings/query').body.filter;
  assert.ok(filter.and.some(c => c.or?.some(f => f.property === '工作行程時間')));
});

test('matching instants and manually cancelled schedules cause no writes', async t => {
  for (const properties of [
    { '時間': { date: { start: '2026-11-02T03:00:00Z' } } },
    { '時間': { date: { start: '2026-11-02T01:00:00Z' } }, '狀態': { select: { name: '已取消' } } },
  ]) {
    const calls = mock(t, booking(), { id: 'minimal-target', properties });
    assert.equal(await syncMissingMinimalSchedules({ reconcile: true }), 0);
    assert.deepEqual(writes(calls), []);
  }
});

test('historical work time cannot overwrite the separate tattoo appointment', async t => {
  const item = booking({ '行程分類': { select: { name: '刺青｜已付定金' } }, '類型': { select: { name: '客製圖' } }, '刺青時間': { date: { start: '2026-11-07T11:00:00+08:00' } } });
  const calls = mock(t, item);
  await syncBookingMinimalSchedules(item.id);
  for (const c of writes(calls)) {
    const start = c.body.properties['時間']?.date.start || c.body.properties['日期時間']?.date.start;
    assert.equal(start, '2026-11-07T11:00:00+08:00');
  }
});

test('targeted tattoo sync ignores completed, cancelled, archived and ineligible bookings', async t => {
  const calls = mock(t, booking());
  for (const item of [booking(), { ...booking(), archived: true }, booking({ '狀態': { select: { name: '完成' } } }), booking({ '狀態': { select: { name: '取消' } } })]) await syncTattooTimes(item);
  assert.deepEqual(calls, []);
});

test('scheduled tattoo sync retains the full booking query', async t => {
  const calls = mock(t, booking());
  await syncTattooTimes();
  assert.ok(calls.some(c => c.path === '/databases/bookings/query'));
});
