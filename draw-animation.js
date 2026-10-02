import { ROLES, TEAM_COUNT, generateRole, validateDraft } from './draft.js';

export const DRAW_STORAGE_KEY = 'msl-team-draw-animation-v1';
export const REVEAL_INTERVAL_MS = 3000;

export function createDrawAnimation(draft, players, random = Math.random) {
  return { version: 1, base: structuredClone(draft), next: generateRole(draft, players, random), revealed: 0 };
}

// Reveal each team's main player first, then any surplus Mid Lane/Roamer.
export function drawAssignments(animation) {
  const additions = animation.next.teams.map((team, index) => team.players.slice(animation.base.teams[index].players.length));
  return [
    ...additions.map((ids, teamId) => ({ teamId, playerId: ids[0], extra: false })),
    ...additions.flatMap((ids, teamId) => ids.slice(1).map(playerId => ({ teamId, playerId, extra: true })))
  ];
}

export function previewDraw(animation) {
  const preview = structuredClone(animation.base);
  for (const assignment of drawAssignments(animation).slice(0, animation.revealed)) preview.teams[assignment.teamId].players.push(assignment.playerId);
  return preview;
}

export function sameDraft(a, b) {
  return a?.step === b?.step && Boolean(a?.locked) === Boolean(b?.locked) && a?.lockedAt === b?.lockedAt && a?.teams?.length === b?.teams?.length && a.teams.every((team, index) => {
    const other = b.teams[index];
    return team.id === other.id && team.name === other.name && JSON.stringify(team.players) === JSON.stringify(other.players);
  });
}

export function validateDrawAnimation(animation, players, names) {
  if (!animation || animation.version !== 1 || !validateDraft(animation.base, players, names) || !validateDraft(animation.next, players, names) || animation.next.step !== animation.base.step + 1) return false;
  for (const [index, team] of animation.next.teams.entries()) {
    const previous = animation.base.teams[index];
    if (team.name !== previous.name || !previous.players.every((id, i) => team.players[i] === id)) return false;
    const additions = team.players.slice(previous.players.length);
    if (!additions.length || additions.some(id => players.find(p => p.id === id)?.role !== ROLES[animation.base.step])) return false;
  }
  const count = drawAssignments(animation).length;
  return count >= TEAM_COUNT && Number.isInteger(animation.revealed) && animation.revealed >= 0 && animation.revealed <= count;
}

export function readDrawAnimation(players, names, draft, storage = localStorage) {
  const raw = storage.getItem(DRAW_STORAGE_KEY);
  if (!raw) return null;
  const animation = JSON.parse(raw);
  if (!validateDrawAnimation(animation, players, names)) throw new Error('Progress animasi undian tidak valid.');
  // A reload after completion can encounter the previous checkpoint.
  if (sameDraft(draft, animation.next)) return null;
  return sameDraft(draft, animation.base) ? animation : null;
}

function waitForReveal(milliseconds, signal) {
  return new Promise((resolve, reject) => {
    const abort = () => { clearTimeout(timer); reject(new DOMException('Undian dijeda.', 'AbortError')); };
    if (signal?.aborted) { reject(new DOMException('Undian dijeda.', 'AbortError')); return; }
    const timer = setTimeout(() => { signal?.removeEventListener('abort', abort); resolve(); }, milliseconds);
    signal?.addEventListener('abort', abort, { once: true });
  });
}

export async function playDrawAnimation(animation, { onPending, onReveal, signal, wait = waitForReveal }) {
  let current = animation;
  const assignments = drawAssignments(animation);
  for (let index = animation.revealed; index < assignments.length; index++) {
    if (signal?.aborted) throw new DOMException('Undian dijeda.', 'AbortError');
    onPending(assignments[index], current);
    await wait(REVEAL_INTERVAL_MS, signal);
    if (signal?.aborted) throw new DOMException('Undian dijeda.', 'AbortError');
    current = { ...current, revealed: index + 1 };
    onReveal(assignments[index], current);
  }
  return current.next;
}
