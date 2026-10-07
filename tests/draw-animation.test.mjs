import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ROLES, createDraft, preparePlayers, validateDraft, generateRole } from '../draft.js';
import { createDrawAnimation, drawAssignments, previewDraw, validateDrawAnimation, readDrawAnimation, playDrawAnimation, DRAW_STORAGE_KEY } from '../draw-animation.js';

const players = preparePlayers(JSON.parse(readFileSync(new URL('../assets/player-msl.json', import.meta.url), 'utf8')));
const names = JSON.parse(readFileSync(new URL('../assets/logo-team.json', import.meta.url), 'utf8').replace(/^\uFEFF/, '')).map(file => file.replace(/\.[^.]+$/, ''));

test('each role reveals one player every 3000 ms, followed by surplus players, without changing the completed draft early', async () => {
  let draft = createDraft();
  for (const role of ROLES) {
    const previous = structuredClone(draft);
    const animation = createDrawAnimation(draft, players);
    assert.ok(validateDrawAnimation(animation, players, names));
    const assignments = drawAssignments(animation);
    assert.deepEqual(assignments.slice(0, 8).map(a => a.teamId), [0,1,2,3,4,5,6,7]);
    assert.ok(assignments.slice(8).every(a => a.extra));
    const delays = [], received = [];
    const next = await playDrawAnimation(animation, {
      wait: async ms => { delays.push(ms); },
      onPending(assignment, checkpoint) {
        assert.equal(checkpoint.revealed, received.length);
        assert.ok(!previewDraw(checkpoint).teams[assignment.teamId].players.includes(assignment.playerId));
      },
      onReveal(assignment, checkpoint) {
        received.push(assignment.playerId);
        const preview = previewDraw(checkpoint);
        assert.equal(preview.teams.flatMap(t => t.players).length, previous.teams.flatMap(t => t.players).length + received.length);
        assert.equal(preview.step, previous.step);
        assert.ok(preview.teams[assignment.teamId].players.includes(assignment.playerId));
      }
    });
    assert.deepEqual(draft, previous);
    assert.deepEqual(next, animation.next);
    assert.equal(received.length, players.filter(p => p.role === role).length);
    assert.deepEqual(delays, Array(received.length).fill(3000));
    assert.ok(validateDraft(next, players, names));
    draft = next;
  }
  assert.equal(new Set(draft.teams.flatMap(t => t.players)).size,46);
  assert.deepEqual(draft.teams.map(t => t.players.length).sort(), [5,5,6,6,6,6,6,6]);
});

test('no assignment appears before its delay; an interrupted draw resumes the same outcome', async () => {
  const base = createDraft(), animation = createDrawAnimation(base, players);
  const controller = new AbortController();
  let release, checkpoint = animation, reveals = 0;
  const running = playDrawAnimation(animation, {
    signal: controller.signal,
    wait: () => new Promise(resolve => { release = resolve; }),
    onPending() {},
    onReveal(assignment, value) { checkpoint = value; reveals++; controller.abort(); }
  });
  assert.equal(reveals,0);
  assert.equal(previewDraw(checkpoint).teams.flatMap(t=>t.players).length,0);
  release();
  await assert.rejects(running, { name:'AbortError' });
  assert.equal(reveals,1);
  const storage = { getItem: key => key === DRAW_STORAGE_KEY ? JSON.stringify(checkpoint) : null };
  const restored = readDrawAnimation(players,names,base,storage);
  assert.equal(restored.revealed,1);
  const remaining = [];
  const next = await playDrawAnimation(restored, {
    wait: async ms => assert.equal(ms,3000),
    onPending() {},
    onReveal: assignment => remaining.push(assignment.playerId)
  });
  assert.equal(remaining.length,drawAssignments(animation).length-1);
  assert.ok(!remaining.includes(drawAssignments(animation)[0].playerId));
  assert.deepEqual(next,animation.next);
  assert.equal(readDrawAnimation(players,names,next,storage),null);
});

test('invalid progress, changed earlier assignments, and unrelated drafts cannot resume', () => {
  const base = generateRole(createDraft(),players), animation = createDrawAnimation(base,players);
  for (const revealed of [-1,0.5,drawAssignments(animation).length+1]) assert.equal(validateDrawAnimation({...animation,revealed},players,names),false);
  const changed = structuredClone(animation);
  [changed.next.teams[0].players[0],changed.next.teams[1].players[0]] = [changed.next.teams[1].players[0],changed.next.teams[0].players[0]];
  assert.equal(validateDrawAnimation(changed,players,names),false);
  const unrelated = structuredClone(base);
  [unrelated.teams[0].players[0],unrelated.teams[1].players[0]] = [unrelated.teams[1].players[0],unrelated.teams[0].players[0]];
  const storage = { getItem: () => JSON.stringify(animation) };
  assert.equal(readDrawAnimation(players,names,unrelated,storage),null);
});
