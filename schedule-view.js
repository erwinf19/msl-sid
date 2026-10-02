import { getReward } from './league.js';

export const escape = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const badge = (team, small = false) => team.logo
  ? `<img class="team-logo ${small ? 'small' : ''}" src="${escape(team.logo)}" alt="" width="62" height="62">`
  : `<span class="team-badge ${escape(team.color)} ${small ? 'small' : ''}" aria-hidden="true">${escape(team.tag)}</span>`;
export const diamondIcon = '<img class="diamond-icon" src="assets/diamond-icon.png" alt="" width="48" height="48" loading="lazy">';
export const dateLabel = date => new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta' }).format(new Date(`${date}T12:00:00+07:00`));

// Both schedule pages show the same names, scores and player rewards.
export function renderMatchCard(data, match) {
  const a = data.teams.find(t => t.id === match.a), b = data.teams.find(t => t.id === match.b);
  const isPreview = data.demo && match.score === null && Array.isArray(match.previewScore);
  const score = isPreview ? match.previewScore : match.score, done = score !== null;
  const aWins = done && score[0] > score[1];
  return `<article class="match-card ${done ? 'match-completed' : ''}">
    <div class="match-top"><span>${escape(dateLabel(match.date))}</span><span class="match-status ${done ? 'finished' : ''}">${done ? 'Selesai' : 'Terjadwal'}</span></div>
    ${isPreview ? '<div class="match-preview-label">CONTOH HASIL · Tidak masuk klasemen</div>' : ''}
    <div class="match-body">
      <div class="match-team ${done && aWins ? 'match-winner' : ''}">${badge(a)}<h3>${escape(a.name)}</h3>${done ? `<span class="outcome ${aWins ? 'won' : ''}">${aWins ? 'UNGGUL' : 'BERPARTISIPASI'}</span>` : ''}</div>
      <div class="match-score">${done ? `<strong><b class="${aWins ? 'winning-score' : ''}">${score[0]}</b><span>:</span><b class="${!aWins ? 'winning-score' : ''}">${score[1]}</b></strong><span class="score-format">FINAL · BO3</span>` : '<strong class="versus">VS</strong>'}<span>${escape(match.time)} WIB</span></div>
      <div class="match-team ${done && !aWins ? 'match-winner' : ''}">${badge(b)}<h3>${escape(b.name)}</h3>${done ? `<span class="outcome ${!aWins ? 'won' : ''}">${!aWins ? 'UNGGUL' : 'BERPARTISIPASI'}</span>` : ''}</div>
    </div>
    ${done ? `<div class="match-rewards"><span class="reward-caption">DIAMONDS / PEMAIN</span><div><span>${escape(a.tag)}</span><strong>${diamondIcon}${getReward(data, ...score)}</strong></div><div><span>${escape(b.tag)}</span><strong>${diamondIcon}${getReward(data, ...[...score].reverse())}</strong></div></div>` : `<div class="match-bottom"><span>BEST OF 3</span><span class="upcoming-reward">${diamondIcon} Hingga 28 diamonds / pemain</span></div>`}
  </article>`;
}
