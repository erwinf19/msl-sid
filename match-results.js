import { isValidMatchScore } from './league.js';
import { getDataSource, loadDataJSON } from './data-sources.js';

export const MATCH_RESULTS_PATH = getDataSource('matchResults');

export function applyMatchResults(data, config) {
  if (config?.version !== 1 || !Array.isArray(config.matches)) throw new Error('Format data hasil pertandingan tidak valid.');
  const matches = new Map(data.matches.map(match => [match.id, match]));
  const teams = new Map(data.teams.map(team => [team.id, team]));
  const results = new Map();
  for (const entry of config.matches) {
    const match = matches.get(entry?.id);
    if (!match || results.has(entry.id)) throw new Error('ID hasil pertandingan tidak dikenal atau duplikat.');
    if (!isValidMatchScore(entry.score)) throw new Error(`Skor ${entry.id} tidak valid. Gunakan null, [2,0], [2,1], [1,2], atau [0,2].`);
    for (const [field, expected] of [['date',match.date],['week',match.week],['teamA',teams.get(match.a).name],['teamB',teams.get(match.b).name]]) {
      if (entry[field] !== undefined && entry[field] !== expected) throw new Error(`Identitas ${entry.id} pada ${field} tidak sesuai jadwal atau team resmi.`);
    }
    results.set(entry.id, entry.score);
  }
  if (results.size !== matches.size) throw new Error('Data hasil pertandingan harus memuat seluruh 28 match.');
  const next = structuredClone(data);
  next.matches.forEach(match => {
    match.score = structuredClone(results.get(match.id));
    delete match.previewScore;
  });
  return next;
}

export async function loadMatchResults(data, fetcher = fetch) {
  // Reject incomplete/invalid results instead of displaying incorrect standings.
  return applyMatchResults(data, await loadDataJSON('matchResults', fetcher));
}
