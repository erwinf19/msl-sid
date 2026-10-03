// Isi dengan URL Raw HTTPS JSON. Kosong = file assets lokal.
// Gunakan URL branch (misalnya main), bukan URL commit tertentu.
export const DATA_SOURCES = {
  players: '',
  teamRoster: '',
  matchResults: 'https://raw.githubusercontent.com/erwinf19/msl-data/refs/heads/main/match-results.json',
  matchStreams: 'https://raw.githubusercontent.com/erwinf19/msl-data/refs/heads/main/match-streams.json'
};

const LOCAL_SOURCES = {
  players: '/assets/player-msl.json',
  teamRoster: '/assets/draft-team-msl.json',
  matchResults: '/assets/match-results.json',
  matchStreams: '/assets/match-streams.json'
};

export function getDataSource(key, sources = DATA_SOURCES) {
  if (!Object.hasOwn(LOCAL_SOURCES, key)) throw new Error('Sumber data tidak dikenal.');
  const value = sources[key];
  if (value === undefined || value === '') return LOCAL_SOURCES[key];
  if (typeof value !== 'string') throw new Error(`URL ${key} tidak valid.`);
  const url = new URL(value.trim());
  if (url.protocol !== 'https:' || url.username || url.password) throw new Error(`URL ${key} harus HTTPS tanpa kredensial.`);
  return url.href;
}

export async function loadDataJSON(key, fetcher = fetch, sources = DATA_SOURCES) {
  const response = await fetcher(getDataSource(key, sources), { cache: 'no-store' });
  if (!response.ok) throw new Error(`Data ${key} belum dapat dimuat.`);
  // An external source that fails must not silently display stale local data.
  return response.json();
}
