import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { ROLES, preparePlayers, createDraft, generateRole, validateDraft, chooseName, lockDraft } from '../draft.js';

const source = JSON.parse(readFileSync(new URL('../assets/player-msl.json', import.meta.url), 'utf8'));
const players = preparePlayers(source);
const files = JSON.parse(readFileSync(new URL('../assets/logo-team.json', import.meta.url), 'utf8').replace(/^\uFEFF/, ''));
const names = files.map(file => file.replace(/\.[^.]+$/, ''));

test('every supplied logo is offered using its filename as the identity', () => {
  assert.deepEqual([...files].sort(), readdirSync(new URL('../assets/logo-team/', import.meta.url)).sort());
  assert.equal(new Set(names).size, names.length);
});

test('42 players are allocated once, in role order, with different teams receiving surplus players', () => {
  for (let run = 0; run < 200; run++) {
    let draft = createDraft();
    assert.ok(validateDraft(draft, players, names));
    for (const [step, role] of ROLES.entries()) {
      const previous = structuredClone(draft);
      draft = generateRole(draft, players);
      assert.equal(draft.step, step + 1);
      assert.ok(validateDraft(draft, players, names));
      for (const team of draft.teams) {
        assert.ok(previous.teams[team.id].players.every(id => team.players.includes(id)));
        assert.ok(team.players.some(id => players[id].role === role));
      }
    }
    const ids = draft.teams.flatMap(t => t.players);
    assert.equal(ids.length, 42);
    assert.equal(new Set(ids).size, 42);
    assert.deepEqual(draft.teams.map(t => t.players.length).sort(), [5, 5, 5, 5, 5, 5, 6, 6]);
    const mid = draft.teams.find(t => t.players.filter(id => players[id].role === 'Midlaner').length === 2);
    const roam = draft.teams.find(t => t.players.filter(id => players[id].role === 'Roamer').length === 2);
    assert.notEqual(mid.id, roam.id);
    assert.throws(() => generateRole(draft, players));
  }
});

test('team identities unlock after the final draw and cannot be shared', () => {
  let draft = createDraft();
  assert.throws(() => chooseName(draft, 0, names[0], names));
  for (const role of ROLES) draft = generateRole(draft, players);
  draft = chooseName(draft, 0, names[0], names);
  assert.throws(() => chooseName(draft, 1, names[0], names));
  draft = chooseName(draft, 0, names[1], names);
  draft = chooseName(draft, 1, names[0], names);
  assert.ok(validateDraft(draft, players, names));
  assert.throws(() => chooseName(draft, 1, 'Unknown', names));
  for (let i = 2; i < 8; i++) draft = chooseName(draft, i, names[i], names);
  draft = lockDraft(draft, players, names);
  assert.throws(() => chooseName(draft, 0, names[8], names));
});

test('invalid source and corrupted saved rosters are rejected', () => {
  assert.throws(() => preparePlayers(source.slice(1)));
  assert.throws(() => preparePlayers([...source, source[0]]));
  assert.throws(() => preparePlayers([{ ...source[0], role: 'Unknown' }, ...source.slice(1)]));
  let draft = createDraft();
  for (const role of ROLES) draft = generateRole(draft, players);
  const duplicated = structuredClone(draft);
  duplicated.teams[0].players[0] = duplicated.teams[1].players[0];
  assert.equal(validateDraft(duplicated, players, names), false);
  const incomplete = structuredClone(draft);
  incomplete.teams[0].players.pop();
  assert.equal(validateDraft(incomplete, players, names), false);
  const invalidRole = structuredClone(draft);
  invalidRole.step = 1;
  assert.equal(validateDraft(invalidRole, players, names), false);
  assert.ok(validateDraft(JSON.parse(JSON.stringify(draft)), players, names));
});
