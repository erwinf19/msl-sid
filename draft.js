import { ALLOW_FINAL_TEAM_CHANGES } from './draft-policy.js';
import { loadDataJSON } from './data-sources.js';
export const TEAM_COUNT = 8;
export const STORAGE_KEY = 'msl-team-draft-v1';
export const ROLES = ['Jungler', 'Goldlaner', 'Explaner', 'Midlaner', 'Roamer'];
export const ROLE_LABELS = { Jungler: 'Jungler', Goldlaner: 'Gold Lane', Explaner: 'EXP Lane', Midlaner: 'Mid Lane', Roamer: 'Roamer' };
export const PLAYER_PROFILE_FIELDS = ['businessUnit', 'jobTitle', 'telegram', 'email'];
const playerSignature = players => JSON.stringify(players.map(({ id, playername, username, role }) => ({ id, playername, username, role })));

export function preparePlayers(source) {
  if (!Array.isArray(source)) throw new Error('Daftar player tidak valid.');
  const players = source.map((p, id) => ({ id, playername: p.playername, username: p.username, role: p.role, ...Object.fromEntries(PLAYER_PROFILE_FIELDS.filter(field => p[field] !== undefined).map(field => [field, typeof p[field] === 'string' ? p[field].trim() : p[field]])) }));
  if (players.some(p => !ROLES.includes(p.role) || typeof p.playername !== 'string' || !p.playername.trim() || typeof p.username !== 'string' || !p.username.trim())) throw new Error('Nama atau role player tidak valid.');
  const identities = players.map(p => JSON.stringify([p.playername.trim().toLowerCase(), p.username.trim().toLowerCase()]));
  if (new Set(identities).size !== players.length) throw new Error('Player yang sama tidak boleh didaftarkan dua kali.');
  if (players.some(p => PLAYER_PROFILE_FIELDS.some(field => p[field] !== undefined && (typeof p[field] !== 'string' || !p[field])) || p.telegram !== undefined && !/^@[a-z0-9_]{5,32}$/i.test(p.telegram))) throw new Error('Profil atau ID Telegram player tidak valid.');
  if (players.some(p => p.email !== undefined && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p.email))) throw new Error('Email player tidak valid.');
  for (const role of ROLES) {
    const count = players.filter(p => p.role === role).length;
    if (count < TEAM_COUNT) throw new Error(`${role} harus memiliki minimal ${TEAM_COUNT} player.`);
  }
  if (players.length > TEAM_COUNT * 6) throw new Error('Jumlah player melebihi kapasitas 8 team × 6 orang.');
  return players;
}

export const createDraft = () => ({ version: 1, step: 0, locked: false, teams: Array.from({ length: TEAM_COUNT }, (_, i) => ({ id: i, name: null, players: [] })) });

export function shuffle(items, random = Math.random) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function generateRole(draft, players, random = Math.random) {
  if (draft.step >= ROLES.length) throw new Error('Semua role sudah dibagikan.');
  const next = structuredClone(draft);
  const pool = shuffle(players.filter(p => p.role === ROLES[next.step]), random);
  if (pool.length < TEAM_COUNT) throw new Error('Player untuk role ini belum cukup.');
  const teamOrder = shuffle(next.teams, random);
  teamOrder.forEach((team, i) => team.players.push(pool[i].id));
  // A team may receive only one extra player across all surplus roles.
  const eligible = shuffle(next.teams.filter(t => t.players.length === next.step + 1), random);
  const extras = pool.slice(TEAM_COUNT);
  if (extras.length > eligible.length) throw new Error('Tidak ada slot player tambahan yang tersedia.');
  extras.forEach((p, i) => eligible[i].players.push(p.id));
  next.step++;
  return next;
}

export function validateDraft(draft, players, names) {
  if (!draft || draft.version !== 1 || !Number.isInteger(draft.step) || draft.step < 0 || draft.step > ROLES.length || !Array.isArray(draft.teams) || draft.teams.length !== TEAM_COUNT) return false;
  if (draft.locked !== undefined && typeof draft.locked !== 'boolean') return false;
  if (draft.locked && (draft.step !== ROLES.length || typeof draft.lockedAt !== 'string' || !Number.isFinite(Date.parse(draft.lockedAt)) || draft.teams.some(t => !t?.name))) return false;
  const assigned = new Set(), chosen = new Set();
  for (const [i, team] of draft.teams.entries()) {
    if (!team || team.id !== i || !Array.isArray(team.players) || team.players.length > draft.step + 1) return false;
    if (team.name !== null) {
      if (draft.step !== ROLES.length || !names.includes(team.name) || chosen.has(team.name)) return false;
      chosen.add(team.name);
    }
    const counts = {};
    for (const id of team.players) {
      const player = players.find(p => p.id === id);
      if (!player || assigned.has(id) || !ROLES.slice(0, draft.step).includes(player.role)) return false;
      assigned.add(id);
      counts[player.role] = (counts[player.role] || 0) + 1;
    }
    for (const role of ROLES.slice(0, draft.step)) {
      if (!counts[role] || counts[role] > 2) return false;
    }
  }
  return assigned.size === players.filter(p => ROLES.slice(0, draft.step).includes(p.role)).length;
}

export function chooseName(draft, teamId, name, names) {
  if (draft.step !== ROLES.length || !names.includes(name) || !draft.teams.some(t => t.id === teamId)) throw new Error('Selesaikan undian sebelum memilih nama team.');
  if (draft.locked && !ALLOW_FINAL_TEAM_CHANGES) throw new Error('Roster sudah terkunci.');
  if (draft.teams.some(t => t.id !== teamId && t.name === name)) throw new Error('Nama team sudah dipilih.');
  const next = structuredClone(draft);
  next.teams.find(t => t.id === teamId).name = name;
  return next;
}

export function lockDraft(draft, players, names) {
  if (!validateDraft(draft, players, names) || draft.step !== ROLES.length || draft.teams.some(team => !team.name)) throw new Error('Lengkapi semua role dan delapan nama team sebelum mengunci roster.');
  if (draft.locked && !ALLOW_FINAL_TEAM_CHANGES) return structuredClone(draft);
  return { ...structuredClone(draft), locked: true, lockedAt: new Date().toISOString() };
}

export async function loadAssets(fetcher = fetch) {
  const [source, files] = await Promise.all([
    loadDataJSON('players', fetcher),
    fetcher('/assets/logo-team.json', { cache: 'no-store' }).then(response => {
      if (!response.ok) throw new Error('Data logo gagal dimuat. Muat ulang halaman untuk mencoba lagi.');
      return response.json();
    })
  ]);
  return { players: preparePlayers(source), logos: files.map(file => ({ name: file.replace(/\.[^.]+$/, ''), src: `/assets/logo-team/${encodeURIComponent(file)}` })) };
}

export function readDraft(players, names, storage = localStorage) {
  const raw = storage.getItem(STORAGE_KEY);
  if (!raw) return null;
  const saved = JSON.parse(raw);
  const signature = playerSignature(players);
  if (saved.signature !== signature || !validateDraft(saved.draft, players, names)) throw new Error('Simpanan undian tidak cocok dengan data player saat ini.');
  return saved.draft;
}

export function saveDraft(draft, players, storage = localStorage) {
  storage.setItem(STORAGE_KEY, JSON.stringify({ signature: playerSignature(players), draft }));
}
