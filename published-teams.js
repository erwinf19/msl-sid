import { ROLES, ROLE_LABELS, TEAM_COUNT, PLAYER_PROFILE_FIELDS, validateDraft } from './draft.js';

export const PUBLISHED_TEAMS_PATH = 'assets/draft-team-msl.json';
export const DOWNLOAD_FILENAME = 'draft-team-msl.json';

export function canExportDraft(draft, players, logos) {
  return validateDraft(draft, players, logos.map(l => l.name)) && draft.step === ROLES.length && draft.teams.every(t => typeof t.name === 'string' && t.name.trim());
}

export function exportDraft(draft, players, logos) {
  if (!canExportDraft(draft, players, logos)) throw new Error('Selesaikan semua role dan pilih 8 nama team yang unik terlebih dahulu.');
  if (!draft.locked) throw new Error('Kunci roster sebelum mengunduh hasil final.');
  return {
    version: 1, finalized: true, locked: true, generatedAt: draft.lockedAt,
    teams: draft.teams.map(t => ({ id: t.id, name: t.name, logo: logos.find(l => l.name === t.name).src, players: t.players.map(id => ({ ...players.find(p => p.id === id) })) }))
  };
}

export function validatePublishedTeams(value, players, logos) {
  if (!value || value.version !== 1 || typeof value.finalized !== 'boolean' || !Array.isArray(value.teams) || value.teams.length !== TEAM_COUNT) return false;
  if (value.locked !== undefined && (typeof value.locked !== 'boolean' || value.locked !== value.finalized)) return false;
  if (value.teams.some((t, i) => !t || t.id !== i || !Array.isArray(t.players))) return false;
  if (!value.finalized) return value.generatedAt === null && value.teams.every(t => t.name === null && t.logo === null && t.players.length === 0);
  if (typeof value.generatedAt !== 'string' || !Number.isFinite(Date.parse(value.generatedAt))) return false;
  const draft = { version: 1, step: ROLES.length, teams: value.teams.map(t => ({ id: t.id, name: t.name, players: t.players.map(p => p?.id) })) };
  if (!canExportDraft(draft, players, logos)) return false;
  return value.teams.every(team => team.logo === logos.find(l => l.name === team.name)?.src && team.players.every(p => {
    const original = players.find(o => o.id === p?.id);
    return original && p.playername === original.playername && p.username === original.username && p.role === original.role && PLAYER_PROFILE_FIELDS.every(field => p[field] === undefined || p[field] === original[field]);
  }));
}

export async function loadPublishedTeams(players, logos) {
  const response = await fetch(PUBLISHED_TEAMS_PATH, { cache: 'no-store' });
  if (!response.ok) throw new Error('File team yang dipublikasikan belum dapat dimuat.');
  const value = await response.json();
  if (!validatePublishedTeams(value, players, logos)) throw new Error('File team tidak valid. Periksa assets/draft-team-msl.json.');
  return value;
}

export function applyPublishedTeams(tournament, published) {
  const next = structuredClone(tournament);
  next.teams = next.teams.map((team, index) => {
    const saved = published.teams[index];
    return { ...team, name: saved.name || `Team ${String(index + 1).padStart(2, '0')}`, tag: `T${String(index + 1).padStart(2, '0')}`, logo: saved.logo, pendingRoster: !published.finalized, players: saved.players.map(p => p.username), playerNames: saved.players.map(p => p.playername), playerRoles: saved.players.map(p => ROLE_LABELS[p.role]) };
  });
  // Keep match IDs and real scores intact when publishing names and rosters.
  next.matches.forEach(match => { delete match.previewScore; });
  return next;
}
