import test from 'node:test';
import assert from 'node:assert/strict';
import { anchor, reopen, composeOverview, verifyOverview, blocksAt, dependents } from '../organs/overview.js';
const source = (text = 'Tenants are affected.\nThe council approved it.') => ({ id: 'report', title: 'Report', text, space: 'received-text', coverage: 'complete', giver: 'Council publisher; speaker not inferred', limitations: 'Received text only; no original-media mapping.' });
const input = () => ({ sources: [source()], frame: { question: 'Who is represented?', viewpoint: 'Tenant consequences', owner: 'Researcher', experiencer: 'Researcher', selection: 'All nonempty lines in selected sources', query: '' }, expectations: [{ expected: 'Tenant first-person testimony', basis: 'Researcher asks whether tenants have spoken', owner: 'Researcher', standing: 'owned', query: 'I am a tenant', next: 'Seek tenant testimony', stakes: 'Tenants may bear consequences' }] });
test('UTF-8 byte addresses reopen Unicode, emoji, repeated text and CRLF without relocation', async () => {
  const s = source('é🙂\r\nsame\r\nsame'); const r = await anchor(s, 11, 15);
  assert.equal(r.start, 14); assert.equal(r.quote, 'same');
  const got = await reopen(r, [s]); assert.equal(got.ok, true); assert.equal(got.before, 'é🙂\r\nsame\r\n');
  assert.equal((await reopen(r, [source('x' + s.text)])).gap, 'stale-source');
});
test('invalid and split character / byte addresses are refused', async () => {
  const s = source('é🙂x'); await assert.rejects(anchor(s, 2, 3), /surrogate/);
  const r = await anchor(s, 0, 1);
  assert.equal((await reopen({ ...r, start: 1 }, [s])).gap, 'utf8-seam');
  assert.equal((await reopen({ ...r, end: 999 }, [s])).gap, 'invalid-address');
  assert.equal((await reopen({ ...r, quote: 'invented' }, [s])).gap, 'altered-quote');
  assert.equal((await reopen(r, [])).gap, 'missing-source');
});
test('negative spaces are bounded lexical findings, with owned stakes and actionable inquiry', async () => {
  const o = await composeOverview(input()); const gap = o.blocks.find(b => b.type === 'negative-space');
  assert.equal(gap.status, 'not-found-in-scope'); assert.equal(gap.stakes.standing, 'owned-hypothesis');
  assert.match(gap.limits, /does not establish a missing voice/); assert.equal(gap.manifest[0].version.length, 64);
  assert.equal((await verifyOverview(o)).ok, true);
});
test('partial, empty and unread material cannot produce complete absence claims', async () => {
  for (const [coverage, value] of [['partial', 'No testimony'], ['unread', 'I am a tenant'], ['complete', '']]) {
    const i = input(); i.sources = [{ ...source(value), coverage }]; const o = await composeOverview(i);
    assert.equal(o.blocks.find(b => b.type === 'negative-space').status, 'incomplete-search');
  }
});
test('matches expose bytes without promoting a mention to represented testimony', async () => {
  const i = input(); i.sources = [source('The phrase "I am a tenant" appears in a form.')];
  const o = await composeOverview(i); const g = o.blocks.find(b => b.type === 'negative-space');
  assert.equal(g.status, 'literal-matches'); assert.match(g.text, /remains open/); assert.equal(g.refs[0].quote, 'I am a tenant');
});
test('forged quote, measure, manifest, reverse index, and omitted gap all fail replay', async () => {
  const o = await composeOverview(input());
  for (const mutate of [x => x.blocks[1].text = 'Invented', x => x.blocks.find(b => b.type === 'measure').value = 900,
    x => x.frame.manifest[0].coverage = 'complete-ish', x => x.reverse.report = [], x => x.blocks = x.blocks.filter(b => b.type !== 'negative-space')]) {
    const bad = structuredClone(o); mutate(bad); assert.equal((await verifyOverview(bad)).ok, false);
  }
});
test('source revision or deleted scope invalidates dependent overview even if selected passage stays the same', async () => {
  const o = await composeOverview(input());
  assert.equal((await verifyOverview(o, [source(source().text + '\nNew evidence')])).gap, 'stale-source-or-scope');
  assert.equal((await verifyOverview(o, [])).ok, false);
});
test('missing standpoint, duplicate identities, fabricated sourced expectation and dangling premises refuse', async () => {
  const mutations = [i => delete i.frame.owner, i => delete i.frame.experiencer, i => i.sources.push(source()), i => i.expectations[0].standing = 'sourced', i => i.expectations[0].basisIds = ['fake']];
  for (const mutate of mutations) { const i = input(); mutate(i); await assert.rejects(composeOverview(i)); }
});
test('reverse lookup includes direct and derived uses; arrangements stay owned', async () => {
  const i = input(); let o = await composeOverview(i); const w = o.blocks[1];
  i.expectations[0].basisIds = [w.id]; i.expectations[0].standing = 'sourced';
  i.arrangements = [{ type: 'relation', id: 'relation', owner: 'Researcher', text: 'Proposed consequence connection', basis: 'Researcher comparison', premises: [w.id] }];
  o = await composeOverview(i);
  assert.deepEqual(new Set(blocksAt(o, 'report', 0, 4)), new Set([w.id, 'measure', 'negative:0', 'inquiry:0', 'relation']));
  assert.ok(dependents(o, w.id).includes('inquiry:0'));
  assert.equal(o.blocks.at(-1).standing, 'owned-arrangement');
});
test('ill-formed Unicode cannot receive a lossless UTF-8 identity; frame cannot overwrite block type', async () => {
  const i = input(); i.sources = [source('\ud800')]; await assert.rejects(composeOverview(i), /surrogates/);
  const j = input(); j.frame.type = 'witness'; j.frame.id = 'forged'; const o = await composeOverview(j);
  assert.equal(o.frame.type, 'frame'); assert.equal(o.frame.id, 'frame');
});
