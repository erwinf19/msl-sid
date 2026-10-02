import { getReward } from './league.js';
import { getStreamUrl } from './match-streams.js';
import { matchIcon } from './match-icons.js';

export const escape = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const badge = (team, small = false) => team.logo
  ? `<img class="team-logo ${small ? 'small' : ''}" src="${escape(team.logo)}" alt="" width="62" height="62">`
  : `<span class="team-badge ${escape(team.color)} ${small ? 'small' : ''}" aria-hidden="true">${escape(team.tag)}</span>`;
export const diamondIcon = '<img class="diamond-icon" src="/assets/diamond-icon.png" alt="" width="48" height="48" loading="lazy">';
export const dateLabel = date => new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta' }).format(new Date(`${date}T12:00:00+07:00`));

const streamIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><rect x="3" y="4" width="18" height="13" rx="3"/><path d="m10 8 5 3-5 3V8Z" fill="currentColor" stroke="none"/><path d="M8 21h8m-4-4v4"/></svg>';
function renderStream(match, a, b, done) {
  const url = getStreamUrl(match.streamUrl);
  return `<div class="match-stream ${url ? 'stream-ready' : 'stream-pending'}" data-stream-state="${url ? 'available' : 'pending'}"><div class="stream-copy"><span class="stream-icon">${streamIcon}</span><div><strong>${done ? 'Siaran pertandingan' : 'Live streaming'}</strong><small>${url ? 'Link siaran tersedia' : 'Link streaming belum diumumkan'}</small></div></div>${url ? `<a class="stream-button" href="${escape(url)}" target="_blank" rel="noopener noreferrer" aria-label="${done ? 'Tonton siaran' : 'Tonton live'} ${escape(a.name)} vs ${escape(b.name)}"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="m5 3 8 5-8 5V3Z" fill="currentColor"/></svg>${done ? 'Tonton Siaran' : 'Tonton Live'}<span aria-hidden="true">↗</span></a>` : '<span class="stream-unavailable">Belum tersedia</span>'}</div>`;
}

// Both schedule pages show the same names, scores and player rewards.
export function renderMatchCard(data, match) {
  const a = data.teams.find(t => t.id === match.a), b = data.teams.find(t => t.id === match.b);
  const isPreview = data.demo && match.score === null && Array.isArray(match.previewScore);
  const score = isPreview ? match.previewScore : match.score, done = score !== null;
  const aWins = done && score[0] > score[1];
  return `<article class="match-card ${done ? 'match-completed' : ''}" id="match-${escape(match.id)}" data-match-id="${escape(match.id)}">
    <div class="match-top"><span>${escape(dateLabel(match.date))}</span><span class="match-status ${done ? 'finished' : ''}">${done ? 'Selesai' : 'Terjadwal'}</span></div>
    ${isPreview ? '<div class="match-preview-label">CONTOH HASIL · Tidak masuk klasemen</div>' : ''}
    <div class="match-body">
      <div class="match-team ${done && aWins ? 'match-winner' : ''}">${badge(a)}<h3>${escape(a.name)}</h3>${done ? `<span class="outcome ${aWins ? 'won' : ''}">${aWins ? 'UNGGUL' : 'BERPARTISIPASI'}</span>` : ''}</div>
      <div class="match-score">${done ? `<strong><b class="${aWins ? 'winning-score' : ''}">${score[0]}</b><span>:</span><b class="${!aWins ? 'winning-score' : ''}">${score[1]}</b></strong><span class="score-format">FINAL · BO3</span>` : '<strong class="versus">VS</strong>'}<span>${escape(match.time)} WIB</span></div>
      <div class="match-team ${done && !aWins ? 'match-winner' : ''}">${badge(b)}<h3>${escape(b.name)}</h3>${done ? `<span class="outcome ${!aWins ? 'won' : ''}">${!aWins ? 'UNGGUL' : 'BERPARTISIPASI'}</span>` : ''}</div>
    </div>
    ${done ? `<div class="match-rewards"><span class="reward-caption">DIAMONDS / PEMAIN</span><div><span>${escape(a.tag)}</span><strong>${diamondIcon}${getReward(data, ...score)}</strong></div><div><span>${escape(b.tag)}</span><strong>${diamondIcon}${getReward(data, ...[...score].reverse())}</strong></div></div>` : `<div class="match-bottom"><span>BEST OF 3</span><span class="upcoming-reward">${diamondIcon} Hingga 28 diamonds / pemain</span></div>`}
    ${renderStream(match, a, b, done)}
    <div class="match-actions"><button class="action-button" type="button" data-match-detail="${escape(match.id)}" aria-label="Detail pertandingan ${escape(a.name)} vs ${escape(b.name)}">${matchIcon('players')} Detail & pemain</button><button class="action-button" type="button" data-match-share="${escape(match.id)}" aria-label="Bagikan pertandingan ${escape(a.name)} vs ${escape(b.name)}">${matchIcon('share')} Bagikan match</button></div>
  </article>`;
}
