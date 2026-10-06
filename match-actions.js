import { getStandings } from './league.js';
import { escape, badge, dateLabel } from './schedule-view.js';
import { getStreamUrl } from './match-streams.js';
import { matchIcon } from './match-icons.js';
import { renderCalendarInvite } from './match-calendar.js';

const sortedWeek = (data, week) => data.matches.filter(m => m.week === week).sort((a,b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));
export const matchLink = (match, origin) => `${new URL('/full-schedule', origin).href}#match-${encodeURIComponent(match.id)}`;
export function matchBroadcast(data, match, origin) {
  const a = data.teams.find(t => t.id === match.a), b = data.teams.find(t => t.id === match.b);
  const done = match.score !== null;
  return [
    `🎮 MSL 2026 • ${done ? 'HASIL PERTANDINGAN' : 'MATCH DAY'}`,
    `🏆 Regular Season · Pekan ${String(match.week).padStart(2,'0')}`,
    '', `⚔️ ${a.name} vs ${b.name}`, '',
    `📅 ${dateLabel(match.date)}`, `⏰ ${match.time} WIB`, '🕹️ Best of 3 (BO3)',
    ...(done ? ['', `📊 Skor akhir: ${a.name} ${match.score[0]}–${match.score[1]} ${b.name}`] : []),
    '', getStreamUrl(match.streamUrl) ? `${done ? '📺 Tonton siaran' : '🔴 Live streaming'}:\n${getStreamUrl(match.streamUrl)}` : '📺 Link streaming menyusul di halaman pertandingan.',
    '', done ? '👏 Apresiasi untuk kedua team! Sampai jumpa di match berikutnya.' : '🙌 Muvers, dukung squad favoritmu! Sampai jumpa di arena.',
    '', '👥 Roster & statistik team:', matchLink(match, origin)
  ].join('\n');
}
export function weekBroadcast(data, week, origin) {
  const matches = sortedWeek(data, week);
  if (!matches.length) throw new Error('Pekan tidak ditemukan.');
  return [
    `🎮 MSL 2026 • JADWAL PEKAN ${String(week).padStart(2,'0')}`,
    `🏆 Regular Season · ${matches.length} pertandingan`,
    '🕹️ Best of 3 (BO3)', '',
    ...matches.flatMap((m, i) => {
      const a = data.teams.find(t => t.id === m.a), b = data.teams.find(t => t.id === m.b);
      return [`${i+1}. ⚔️ ${a.name} vs ${b.name}`, `📅 ${dateLabel(m.date)}`, `⏰ ${m.time} WIB`, ...(m.score !== null ? [`📊 Skor akhir: ${m.score.join('–')}`] : []), getStreamUrl(m.streamUrl) ? `📺 ${getStreamUrl(m.streamUrl)}` : '📺 Link streaming menyusul.', ''];
    }),
    '🙌 Catat jadwalnya, ajak sesama Muvers, dan dukung squad favoritmu!', '',
    '👥 Jadwal lengkap, roster & statistik:', `${new URL('/full-schedule', origin).href}#pekan-${week}`
  ].join('\n');
}
export function telegramShareUrl(text, url) {
  const share = new URL('https://t.me/share/url');
  share.searchParams.set('url', url);
  share.searchParams.set('text', text.endsWith(url) ? text.slice(0,-url.length).trimEnd() : text);
  return share.href;
}

export function renderTeamDetail(team, rank, roles) {
  const stats = [
    ['Match W–L', `${team.wins}–${team.losses}`, `${team.wins} menang, ${team.losses} kalah`],
    ['Game W–L', `${team.gameWins}–${team.gameLosses}`, `${team.gameWins} menang, ${team.gameLosses} kalah`],
    ['Net Game', `${team.net > 0 ? '+' : ''}${team.net}`, null]
  ];
  return `<section class="detail-team"><div class="detail-team-head">${badge(team)}<div><span class="eyebrow">${escape(team.tag)} · ${team.players.length} PEMAIN</span><h3>${escape(team.name)}</h3><div class="detail-team-meta"><span class="detail-rank">Peringkat <b>#${rank}</b></span><span>${team.points} poin</span></div></div></div><dl class="team-stat-grid">${stats.map(([label,value,description])=>`<div><dt>${label}</dt><dd${description ? ` aria-label="${description}"` : ''}>${value}</dd></div>`).join('')}</dl><h4>${matchIcon('players')} Roster team</h4>${team.players.length ? `<ul class="detail-roster">${team.players.map((username,i)=>`<li><span class="player-number">${String(i+1).padStart(2,'0')}</span><div><strong>${escape(username)}</strong><small>${escape(team.playerNames?.[i] || '')}</small></div><span class="detail-role role-${roles.indexOf(team.playerRoles?.[i] || roles[i])}">${escape(team.playerRoles?.[i] || roles[i] || 'Player')}</span></li>`).join('')}</ul>` : '<p class="detail-empty">Roster belum dipublikasikan. Pemain akan tampil setelah data team resmi tersedia.</p>'}</section>`;
}

export function initMatchActions(data, players = []) {
  const standings = getStandings(data);
  const detail = document.createElement('dialog');
  detail.className = 'match-dialog detail-dialog';
  detail.setAttribute('aria-labelledby','match-detail-title');
  const share = document.createElement('dialog');
  share.className = 'match-dialog share-dialog';
  share.setAttribute('aria-labelledby','match-share-title');
  share.innerHTML = `<div class="dialog-header"><div><span class="eyebrow">SPREAD THE HYPE</span><h2 id="match-share-title">Bagikan pertandingan</h2></div><button class="dialog-close" type="button" data-dialog-close aria-label="Tutup popup">${matchIcon('close')}</button></div><div class="share-intro">Broadcast siap dibagikan. Salin teksnya atau pilih chat tujuan di Telegram.</div><label class="share-preview-label" for="broadcast-preview">Preview broadcast</label><textarea id="broadcast-preview" class="broadcast-preview" readonly spellcheck="false"></textarea><div class="share-buttons"><button class="action-button action-primary" type="button" data-copy-broadcast>${matchIcon('copy')} Salin broadcast</button><a class="action-button telegram-button" target="_blank" rel="noopener noreferrer" data-telegram-share>${matchIcon('telegram')} Bagikan ke Telegram ↗</a></div><p class="share-feedback" role="status" aria-live="polite"></p>`;
  document.body.append(detail, share);
  let opener;
  for (const dialog of [detail,share]) {
    dialog.addEventListener('click', event => {
      if (event.target.closest('[data-dialog-close]')) dialog.close();
      else if (event.target === dialog) {
        const rect = dialog.getBoundingClientRect();
        if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
      }
    });
    dialog.addEventListener('close', () => {
      if (!detail.open && !share.open) {
        document.body.classList.remove('match-modal-open');
        if (opener?.isConnected) opener.focus({preventScroll:true});
      }
    });
  }
  const openShare = (text, url, title, trigger) => {
    const returnTarget = detail.contains(trigger) ? opener : trigger;
    if (detail.open) detail.close();
    opener = returnTarget;
    share.querySelector('#match-share-title').textContent = title;
    share.querySelector('textarea').value = text;
    share.querySelector('[data-telegram-share]').href = telegramShareUrl(text,url);
    share.querySelector('.share-feedback').textContent = '';
    document.body.classList.add('match-modal-open');
    share.showModal();
  };
  share.querySelector('[data-copy-broadcast]').addEventListener('click', async () => {
    const feedback = share.querySelector('.share-feedback');
    try {
      await navigator.clipboard.writeText(share.querySelector('textarea').value);
      feedback.textContent = '✓ Broadcast tersalin! Tempel di grup atau channel Telegram kamu.';
    } catch {
      share.querySelector('textarea').focus();
      share.querySelector('textarea').select();
      feedback.textContent = 'Teks sudah dipilih. Tekan Ctrl+C atau pilih Salin pada ponsel.';
    }
  });
  document.addEventListener('click', event => {
    const button = event.target.closest('[data-match-detail], [data-match-share], [data-week-share]');
    if (!button) return;
    if (button.hasAttribute('data-week-share')) {
      const week = Number(button.dataset.weekShare);
      openShare(weekBroadcast(data,week,location.origin),`${new URL('/full-schedule',location.origin).href}#pekan-${week}`,`Bagikan jadwal pekan ${String(week).padStart(2,'0')}`,button);
      return;
    }
    const match = data.matches.find(m => m.id === (button.dataset.matchDetail || button.dataset.matchShare));
    if (!match) return;
    if (button.hasAttribute('data-match-share')) {
      openShare(matchBroadcast(data,match,location.origin),matchLink(match,location.origin),'Bagikan pertandingan',button);
      return;
    }
    const teams = [match.a,match.b].map(id => standings.find(t => t.id === id));
    detail.innerHTML = `<div class="dialog-header"><div><span class="eyebrow">PEKAN ${String(match.week).padStart(2,'0')} · ${match.score === null ? 'TERJADWAL' : 'SELESAI'}</span><h2 id="match-detail-title">Detail pertandingan</h2></div><button class="dialog-close" type="button" data-dialog-close aria-label="Tutup popup">${matchIcon('close')}</button></div><div class="detail-match-summary"><strong>${escape(teams[0].name)} <span>${match.score === null ? 'VS' : escape(match.score.join(' : '))}</span> ${escape(teams[1].name)}</strong><p>${escape(dateLabel(match.date))} · ${escape(match.time)} WIB · BO3</p></div><p class="detail-stat-note">${matchIcon('trophy')} Statistik regular season saat ini · mengikuti klasemen beranda</p><div class="detail-team-grid">${teams.map(t => renderTeamDetail(t,standings.indexOf(t)+1,data.roles)).join('')}</div><div class="detail-footer"><button class="action-button" type="button" data-match-share="${escape(match.id)}">${matchIcon('share')} Bagikan pertandingan</button></div>`;
    detail.querySelector('.detail-match-summary').insertAdjacentHTML('afterend', renderCalendarInvite(data,match,players));
    opener = button;
    document.body.classList.add('match-modal-open');
    detail.showModal();
  });
}
