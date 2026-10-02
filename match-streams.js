export const MATCH_STREAMS_PATH = '/assets/match-streams.json';

export function getStreamUrl(value) {
  if (typeof value !== 'string' || !value.trim()) return null;
  try {
    const url = new URL(value.trim());
    if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) return null;
    return url.href;
  } catch {
    return null;
  }
}

export function applyMatchStreams(data, config) {
  if (!config || !Array.isArray(config.matches)) throw new Error('Format match-streams.json tidak valid.');
  const matches = new Map(data.matches.map(match => [match.id, match]));
  const streams = new Map();
  for (const entry of config.matches) {
    const match = matches.get(entry?.id);
    if (!match || streams.has(entry.id)) throw new Error('ID pertandingan streaming tidak dikenal atau duplikat.');
    if (typeof entry.streamUrl !== 'string' || (entry.streamUrl.trim() && !getStreamUrl(entry.streamUrl))) throw new Error(`Link streaming ${entry.id} harus berupa URL HTTP/HTTPS lengkap atau kosong.`);
    for (const [field, expected] of [['date',match.date],['week',match.week],['teamA',match.a],['teamB',match.b]]) {
      if (entry[field] !== undefined && entry[field] !== expected) throw new Error(`Identitas pertandingan ${entry.id} tidak sesuai pada ${field}.`);
    }
    streams.set(entry.id, getStreamUrl(entry.streamUrl) || '');
  }
  const next = structuredClone(data);
  next.matches.forEach(match => { match.streamUrl = streams.get(match.id) || ''; });
  return next;
}

export async function loadMatchStreams(data, fetcher = fetch) {
  try {
    const response = await fetcher(MATCH_STREAMS_PATH, {cache:'no-store'});
    if (!response.ok) throw new Error('Data link streaming belum dapat dimuat.');
    return applyMatchStreams(data, await response.json());
  } catch (error) {
    // A missing or malformed link file must not hide the match schedule.
    console.warn('Link streaming belum tersedia:', error);
    return data;
  }
}
