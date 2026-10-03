import { getDataSource } from './data-sources.js';
import { getReward, isValidMatchScore } from './league.js';

export const LINEUP_FILENAME = 'match-lineups.json';
export const LINEUP_STORAGE_KEY = 'msl-match-lineups-draft-v1';
export const emptyLineups = () => ({ version: 1, matches: [] });

export function getLoanTeams(data, match) {
  const unavailable = new Set([match.a, match.b]);
  data.matches.filter(other => other.id !== match.id && other.date === match.date && other.time === match.time)
    .forEach(other => { unavailable.add(other.a); unavailable.add(other.b); });
  return data.teams.filter(team => !unavailable.has(team.id) && team.playerIds?.length);
}

export function validateLineupPlayers(data, match, playerIdsA, playerIdsB) {
  const loanTeams = getLoanTeams(data, match), used = new Set(), borrowed = [];
  for (const [teamId, ids] of [[match.a, playerIdsA], [match.b, playerIdsB]]) {
    const team = data.teams.find(t => t.id === teamId);
    if (!Array.isArray(ids) || ids.length !== 5) throw new Error(`Pilih tepat 5 pemain untuk ${team.name}.`);
    const loans = [];
    for (const id of ids) {
      if (!Number.isInteger(id) || used.has(id)) throw new Error(`Pemain lineup ${match.id} tidak valid atau duplikat.`);
      used.add(id);
      if (!team.playerIds?.includes(id)) {
        if (!loanTeams.some(owner => owner.playerIds.includes(id))) throw new Error('Pemain pinjaman harus berasal dari team lain yang tidak bermain pada jadwal ini, selain lawan.');
        loans.push(id);
      }
    }
    if (loans.length > 2) throw new Error(`${team.name} wajib memilih minimal 3 pemain asli dan maksimal 2 pemain pinjaman.`);
    borrowed.push(loans);
  }
  return borrowed;
}

export function validateLineups(data, config) {
  if (config?.version !== 1 || !Array.isArray(config.matches)) throw new Error('Format match-lineups.json tidak valid.');
  const seen = new Set();
  for (const entry of config.matches) {
    const match = data.matches.find(m => m.id === entry?.id);
    if (!match || seen.has(entry.id)) throw new Error('ID match lineup tidak dikenal atau duplikat.');
    seen.add(entry.id);
    if (entry.locked !== true || typeof entry.lockedAt !== 'string' || !Number.isFinite(Date.parse(entry.lockedAt))) throw new Error(`Lineup ${entry.id} harus sudah dikunci.`);
    for (const [teamId, nameField] of [[match.a,'teamA'],[match.b,'teamB']]) {
      const team = data.teams.find(t => t.id === teamId);
      if (entry[nameField] !== team?.name) throw new Error(`Nama team lineup ${entry.id} tidak sesuai pertandingan.`);
    }
    const borrowed = validateLineupPlayers(data, match, entry.playerIdsA, entry.playerIdsB);
    ['borrowedPlayerIdsA', 'borrowedPlayerIdsB'].forEach((field, index) => {
      // Existing JSON without loan metadata remains valid.
      if (entry[field] === undefined) return;
      if (!Array.isArray(entry[field]) || entry[field].length !== borrowed[index].length || new Set(entry[field]).size !== entry[field].length || entry[field].some(id => !borrowed[index].includes(id))) {
        throw new Error(`Catatan pemain pinjaman ${entry.id} tidak sesuai lineup.`);
      }
    });
  }
  return config;
}

export function lockMatchLineup(data, config, id, playerIdsA, playerIdsB, lockedAt = new Date().toISOString()) {
  validateLineups(data, config);
  if (config.matches.some(entry => entry.id === id)) throw new Error('Lineup sudah terkunci. Koreksi hanya melalui JSON sumber.');
  const match = data.matches.find(m => m.id === id);
  if (!match) throw new Error('Pertandingan tidak ditemukan.');
  const [borrowedPlayerIdsA, borrowedPlayerIdsB] = validateLineupPlayers(data, match, playerIdsA, playerIdsB);
  const next = structuredClone(config);
  next.matches.push({ id, teamA: data.teams.find(t=>t.id===match.a).name, teamB: data.teams.find(t=>t.id===match.b).name, playerIdsA:[...playerIdsA], playerIdsB:[...playerIdsB], borrowedPlayerIdsA, borrowedPlayerIdsB, locked:true, lockedAt });
  next.matches.sort((a,b)=>Number(a.id.slice(1))-Number(b.id.slice(1)));
  return validateLineups(data,next);
}

// Published entries win conflicts; pending browser exports never affect rewards.
export function mergeLineups(data, pending, published) {
  validateLineups(data,pending); validateLineups(data,published);
  const entries = new Map(pending.matches.map(entry=>[entry.id,entry]));
  published.matches.forEach(entry=>entries.set(entry.id,entry));
  return {version:1,matches:structuredClone([...entries.values()].sort((a,b)=>Number(a.id.slice(1))-Number(b.id.slice(1))))};
}

export async function loadMatchLineups(data, fetcher = fetch) {
  try {
    const response = await fetcher(getDataSource('matchLineups'), {cache:'no-store'});
    // A public file not created yet can be bootstrapped by the first export.
    if (response.status === 404) return {config:emptyLineups(),available:true,initial:true};
    if (!response.ok) throw new Error('Sumber lineup belum dapat diakses.');
    const config = validateLineups(data,await response.json());
    return {config,available:true,initial:false};
  } catch (error) {
    return {config:emptyLineups(),available:false,initial:false,error:error.message};
  }
}

export function lineupRosterSignature(data) {
  return JSON.stringify(data.teams.map(t=>[t.id,t.name,t.playerIds]));
}

export function readPendingLineups(data, storage = localStorage) {
  const raw = storage.getItem(LINEUP_STORAGE_KEY);
  if (!raw) return emptyLineups();
  const saved = JSON.parse(raw);
  if (saved.signature !== lineupRosterSignature(data)) throw new Error('Draft lineup tidak sesuai roster terbaru.');
  return validateLineups(data,saved.config);
}

export function savePendingLineups(data, config, storage = localStorage) {
  validateLineups(data,config);
  storage.setItem(LINEUP_STORAGE_KEY,JSON.stringify({signature:lineupRosterSignature(data),config}));
}

export function getPlayerRewards(data, players, config) {
  validateLineups(data,config);
  const rows = players.map(player=>({...player,diamonds:0,played:0,history:[],team:data.teams.find(t=>t.playerIds?.includes(player.id))?.name || 'Belum ada team'}));
  const byId = new Map(rows.map(row=>[row.id,row]));
  let countedMatches = 0, awaitingLineups = 0;
  for (const match of data.matches) {
    if (!isValidMatchScore(match.score)) throw new Error(`Skor ${match.id} tidak valid untuk menghitung reward.`);
    if (match.score === null) continue;
    const entry = config.matches.find(lineup=>lineup.id===match.id);
    if (!entry) { awaitingLineups++; continue; }
    countedMatches++;
    for (const [ids,index,team,opponent] of [[entry.playerIdsA,0,entry.teamA,entry.teamB],[entry.playerIdsB,1,entry.teamB,entry.teamA]]) {
      const own=match.score[index],other=match.score[1-index],diamonds=getReward(data,own,other);
      for (const id of ids) {
        const row=byId.get(id);
        if (!row) throw new Error('Pemain pada lineup tidak ditemukan di daftar player.');
        row.diamonds+=diamonds; row.played++;
        const playingTeam = data.teams.find(t => t.id === (index ? match.b : match.a));
        row.history.push({matchId:match.id,week:match.week,date:match.date,time:match.time,team,opponent,score:`${own}–${other}`,diamonds,borrowed:!playingTeam.playerIds.includes(id)});
      }
    }
  }
  rows.sort((a,b)=>b.diamonds-a.diamonds || b.played-a.played || a.playername.localeCompare(b.playername));
  return {rows,countedMatches,awaitingLineups,totalDiamonds:rows.reduce((sum,row)=>sum+row.diamonds,0)};
}
