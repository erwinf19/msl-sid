import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { pbkdf2Sync } from 'node:crypto';
import { preparePlayers, createDraft, generateRole, chooseName, lockDraft, ROLES } from '../draft.js';
import { canExportDraft, exportDraft, validatePublishedTeams, applyPublishedTeams, DOWNLOAD_FILENAME } from '../published-teams.js';
import { verifyDownloadPassword, DOWNLOAD_LOCK } from '../download-password.js';
import { tournament } from '../tournament-data.js';
import { validateTournament, getStandings } from '../league.js';
import { ALLOW_FINAL_TEAM_CHANGES, draftPermissions, publishedToDraft } from '../draft-policy.js';

const json = path => JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8').replace(/^\uFEFF/, ''));
const players = preparePlayers(json('../assets/player-msl.json'));
const logos = json('../assets/logo-team.json').map(file => ({ name: file.replace(/\.[^.]+$/, ''), src: `assets/logo-team/${encodeURIComponent(file)}` }));
const names = logos.map(l => l.name);
function completeDraft() {
  let draft = createDraft();
  for (const role of ROLES) draft = generateRole(draft, players);
  return draft;
}
function namedDraft() {
  let draft = completeDraft();
  for (let i = 0; i < 8; i++) draft = chooseName(draft, i, names[i], names);
  return draft;
}

test('export stays locked until every role and every team identity is complete', () => {
  let draft = createDraft();
  assert.equal(canExportDraft(draft, players, logos), false);
  draft = completeDraft();
  for (let i = 0; i < 8; i++) {
    assert.equal(canExportDraft(draft, players, logos), false);
    assert.throws(() => exportDraft(draft, players, logos));
    draft = chooseName(draft, i, names[i], names);
  }
  assert.equal(canExportDraft(draft, players, logos), true);
  assert.throws(() => exportDraft(draft, players, logos));
  const bad = structuredClone(draft);
  bad.teams[7].name = bad.teams[0].name;
  assert.equal(canExportDraft(bad, players, logos), false);
});

test('downloaded JSON round-trips into homepage rosters, logos, standings and schedule', () => {
  const draft = lockDraft(namedDraft(), players, names);
  const value = JSON.parse(JSON.stringify(exportDraft(draft, players, logos)));
  assert.equal(DOWNLOAD_FILENAME, 'draft-team-msl.json');
  assert.ok(validatePublishedTeams(value, players, logos));
  assert.equal(value.teams.flatMap(t => t.players).length, 42);
  const data = applyPublishedTeams(tournament, value);
  validateTournament(data);
  assert.equal(data.teams.length, 8);
  assert.equal(data.teams[0].name, names[0]);
  assert.equal(data.teams[0].logo, logos[0].src);
  assert.equal(data.teams.reduce((sum, t) => sum + t.players.length, 0), 42);
  assert.ok(getStandings(data).every(row => row.points === 0));
  assert.ok(data.matches.every(m => !m.previewScore));
  const scored = structuredClone(tournament);
  scored.matches[0].score = [2, 1];
  const updated = applyPublishedTeams(scored, value);
  assert.deepEqual(updated.matches[0].score, [2, 1]);
  assert.equal(updated.matches[0].a, tournament.matches[0].a);
});

test('empty published file shows eight waiting slots and rejects partial/invalid publications', () => {
  const empty = { version: 1, finalized: false, generatedAt: null, teams: createDraft().teams.map(t => ({ ...t, logo: null })) };
  assert.ok(validatePublishedTeams(empty, players, logos));
  const data = applyPublishedTeams(tournament, empty);
  validateTournament(data);
  assert.equal(data.teams.length, 8);
  assert.ok(data.teams.every(t => t.players.length === 0 && t.pendingRoster));
  for (const change of [v => { v.teams[0].players[0].role = 'Roamer'; }, v => { v.teams[0].logo = 'https://example.com/logo.png'; }, v => { v.teams[0].players[0].username = 'changed'; }, v => { v.teams[0].players.push(v.teams[1].players[0]); }, v => { v.teams[0] = null; }]) {
    const value = exportDraft(lockDraft(namedDraft(), players, names), players, logos);
    change(value);
    assert.equal(validatePublishedTeams(value, players, logos), false);
  }
});

test('password verification accepts the matching PBKDF2 value and rejects wrong passwords', async () => {
  const configuration = { ...DOWNLOAD_LOCK, digest: pbkdf2Sync('test-password-only', Buffer.from(DOWNLOAD_LOCK.salt, 'hex'), DOWNLOAD_LOCK.iterations, 32, 'sha256').toString('hex') };
  assert.equal(await verifyDownloadPassword('test-password-only', configuration), true);
  assert.equal(await verifyDownloadPassword('incorrect-password', configuration), false);
  assert.equal(await verifyDownloadPassword(''), false);
  assert.equal(await verifyDownloadPassword('x'.repeat(257)), false);
});

test('completed drafts can reset and rename until the explicit lock action', () => {
  assert.equal(ALLOW_FINAL_TEAM_CHANGES, false);
  const draft = completeDraft();
  let policy = draftPermissions(draft, null);
  assert.equal(policy.canGenerate, false);
  assert.equal(policy.canReset, true);
  assert.equal(policy.rosterLocked, false);
  assert.equal(policy.canChooseName(draft.teams[0]), true);
  const named = chooseName(draft, 0, names[0], names);
  policy = draftPermissions(named, null);
  assert.equal(policy.canChooseName(named.teams[0]), true);
  assert.equal(policy.canChooseName(named.teams[1]), true);
  assert.equal(chooseName(named, 0, names[1], names).teams[0].name, names[1]);
  assert.throws(() => lockDraft(named, players, names));
  const allNamed = namedDraft();
  assert.equal(draftPermissions(allNamed, null).canReset, true);
  assert.equal(draftPermissions(allNamed, null).locked, false);
});

test('final data stays locked after JSON round-trip and requires the code maintenance flag', () => {
  const draft = lockDraft(namedDraft(), players, names);
  assert.equal(draftPermissions(draft, null).locked, true);
  const file = JSON.parse(JSON.stringify(exportDraft(draft, players, logos)));
  assert.equal(file.locked, true);
  assert.ok(validatePublishedTeams(file, players, logos));
  const restored = publishedToDraft(file);
  assert.deepEqual(restored, draft);
  const policy = draftPermissions(restored, file);
  assert.equal(policy.locked, true);
  assert.equal(policy.canReset, false);
  assert.equal(policy.canGenerate, false);
  assert.ok(restored.teams.every(t => !policy.canChooseName(t)));
  const maintenance = draftPermissions(restored, file, true);
  assert.equal(maintenance.locked, false);
  assert.equal(maintenance.canReset, true);
  assert.ok(restored.teams.every(t => maintenance.canChooseName(t)));
  const legacy = structuredClone(file);
  delete legacy.locked;
  assert.ok(validatePublishedTeams(legacy, players, logos));
  assert.equal(draftPermissions(publishedToDraft(legacy), legacy).locked, true);
});
