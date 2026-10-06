import { validateLineups } from './match-lineups.js';
import { escape, dateLabel } from './schedule-view.js';
import { matchIcon } from './match-icons.js';

export const MATCH_MEET_URL = 'https://meet.google.com/nyt-mwco-dsc';
export const MATCH_SITE_URL = 'https://msl-sesi.netlify.app';
export const MATCH_INVITE_EMAIL = 'infomuvers@sekolahmu.co.id';
export const CALENDAR_DURATION_MINUTES = 45;
const emailPattern = /^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]+$/;

export function getCalendarInvite(data, match, players) {
  const config = data.lineupConfig;
  const teams = [match.a, match.b].map(id => data.teams.find(team => team.id === id));
  let entry = data.lineupAvailable === false ? undefined : config?.matches?.find(lineup => lineup.id === match.id);
  if (entry) {
    try { validateLineups(data, config); } catch { entry = undefined; }
  }
  // Before a lineup is available, include the full registered roster so that
  // organizers can send the match reminder without locking playing selections.
  const idsBySide = entry ? [entry.playerIdsA, entry.playerIdsB] : teams.map(team => team.playerIds || []);
  const sides = idsBySide.map(ids => ids.map(id => {
    const profile = players.find(player => player.id === id);
    if (profile) return profile;
    const owner = data.teams.find(team => team.playerIds?.includes(id));
    const index = owner?.playerIds.indexOf(id);
    return { id, username:owner?.players[index] || 'Player', playername:owner?.playerNames?.[index] || '' };
  }));
  const hasEmail = player => typeof player.email === 'string' && emailPattern.test(player.email);
  const missing = sides.flat().filter(player => !hasEmail(player));
  const guests = [...new Set([...sides.flat().filter(hasEmail).map(player => player.email.toLowerCase()), MATCH_INVITE_EMAIL])];
  const notice = [
    ...(!entry ? [data.lineupAvailable === false ? 'Lineup belum dapat dimuat. Undangan memakai seluruh roster kedua team; periksa tamu sebelum mengirim.' : 'Lineup belum dikunci. Seluruh roster kedua team ikut diundang, termasuk cadangan.'] : []),
    ...(missing.length ? [`Email belum lengkap: ${missing.map(player => player.username).join(', ')}. Tambahkan email pemain tersebut di Google Calendar sebelum mengirim.`] : []),
    ...(!sides.flat().length ? ['Roster belum tersedia. Tambahkan tamu langsung di Google Calendar.'] : [])
  ].join(' ');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(match.date) || !/^\d{2}:\d{2}$/.test(match.time)) throw new Error('Tanggal atau jam pertandingan tidak valid.');
  const start = new Date(`${match.date}T${match.time}:00+07:00`);
  if (!Number.isFinite(start.getTime())) throw new Error('Tanggal atau jam pertandingan tidak valid.');
  const end = new Date(start.getTime() + CALENDAR_DURATION_MINUTES * 60000);
  const title = `MLBB SESI LEAGUE · ${teams[0].name} vs ${teams[1].name} · Pekan ${match.week}`;
  const matchUrl = new URL('/full-schedule', MATCH_SITE_URL);
  matchUrl.hash = `match-${match.id}`;
  const description = [
    '🎮 MLBB SESI LEAGUE 2026',
    `⚔️ ${teams[0].name} vs ${teams[1].name} · Pekan ${match.week} · BO3`,
    `📅 ${dateLabel(match.date)} · ${match.time} WIB`,
    '', '📹 Google Meet (link tetap):', MATCH_MEET_URL,
    '', 'Bergabung ke Google Meet sebelum panitia membagi breakout room. Tidak wajib menyalakan kamera.',
    'Pastikan koneksi dan perangkat siap. Keterlambatan maksimal 15 menit; lewat batas tersebut team yang tidak hadir dinyatakan WO.',
    ...(notice ? ['', notice] : []),
    '', ...sides.flatMap((side, index) => [
      `👥 ${teams[index].name}`,
      ...side.map(player => {
        const owner = data.teams.find(team => team.playerIds.includes(player.id));
        const playingTeam = index ? match.b : match.a;
        return `• ${player.username} — ${player.playername}${owner.id !== playingTeam ? ` (pinjaman dari ${owner.name})` : ''}`;
      }), ''
    ]), '📋 Detail pertandingan:', matchUrl.href
  ].join('\n');
  const timestamp = date => date.toISOString().replace(/[-:]/g, '').replace('.000', '');
  const url = new URL('https://calendar.google.com/calendar/render');
  url.searchParams.set('action', 'TEMPLATE');
  url.searchParams.set('text', title);
  url.searchParams.set('dates', `${timestamp(start)}/${timestamp(end)}`);
  url.searchParams.set('ctz', 'Asia/Jakarta');
  url.searchParams.set('location', MATCH_MEET_URL);
  url.searchParams.set('details', description);
  url.searchParams.set('add', guests.join(','));
  return { url: url.href, guests, sides, start, end, mode:entry ? 'lineup' : 'roster', notice };
}

export function renderCalendarInvite(data, match, players) {
  let invite, error;
  try { invite = getCalendarInvite(data, match, players); } catch (failure) { error = failure.message; }
  const fallback = new URL('https://calendar.google.com/calendar/render');
  fallback.searchParams.set('action','TEMPLATE');
  fallback.searchParams.set('text','MLBB SESI LEAGUE · Pertandingan');
  fallback.searchParams.set('location',MATCH_MEET_URL);
  fallback.searchParams.set('add',MATCH_INVITE_EMAIL);
  const endTime = invite ? new Intl.DateTimeFormat('en-GB', { timeZone:'Asia/Jakarta', hour:'2-digit', minute:'2-digit', hourCycle:'h23' }).format(invite.end) : '';
  return `<section class="calendar-invite" aria-labelledby="calendar-invite-title"><div class="calendar-invite-copy"><span class="eyebrow">MATCH REMINDER</span><h3 id="calendar-invite-title">${matchIcon('calendar')} Ajak squad ke arena</h3><p>${invite ? `${invite.guests.length} penerima · ${invite.mode === 'lineup' ? 'lineup terkunci' : 'roster kedua team'} + Info Muvers · ${escape(match.time)}–${endTime} WIB · ${CALENDAR_DURATION_MINUTES} menit` : escape(error)}</p>${invite?.notice ? `<p class="calendar-invite-note">${escape(invite.notice)}</p>` : ''}<a class="calendar-meet-link" href="${MATCH_MEET_URL}" target="_blank" rel="noopener noreferrer">Google Meet tetap ↗</a>${invite ? `<details class="calendar-guests"><summary>Lihat ${invite.sides.flat().length} pemain yang diundang</summary><div>${invite.sides.map((side,index) => `<section><h4>${escape(data.teams.find(team => team.id === (index ? match.b : match.a)).name)}</h4><ul>${side.map(player => `<li>${escape(player.username)}</li>`).join('')}</ul></section>`).join('')}</div></details>` : ''}</div><div class="calendar-invite-action"><a class="action-button action-primary" href="${escape(invite?.url || fallback.href)}" target="_blank" rel="noopener noreferrer" data-invite-player>${matchIcon('calendar')} Invite Player ↗</a><p>Buka draft di Google Calendar, periksa tamu, lalu pilih <strong>Simpan</strong> dan <strong>Kirim</strong>. Link ini belum mengirim undangan.</p></div></section>`;
}
