import { tournament } from './tournament-data.js';
import { validateTournament } from './league.js';
import { loadAssets } from './draft.js';
import { loadPublishedTeams, applyPublishedTeams } from './published-teams.js';
import { escape, renderMatchCard } from './schedule-view.js';
import { initSectionNavigation } from './section-navigation.js';

try {
  const { players, logos } = await loadAssets();
  const published = await loadPublishedTeams(players, logos);
  const data = applyPublishedTeams(tournament, published);
  validateTournament(data);
  const weeks = [...new Set(data.matches.map(m => m.week))].sort((a, b) => a - b);
  document.querySelector('#week-index').innerHTML = weeks.map(week => `<a href="#pekan-${week}"><span>Pekan ${String(week).padStart(2, '0')}</span><small>${data.matches.filter(m => m.week === week).length} match</small></a>`).join('');
  const shortDate = date => new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', timeZone: 'Asia/Jakarta' }).format(new Date(`${date}T12:00:00+07:00`));
  document.querySelector('#full-schedule').innerHTML = weeks.map(week => {
    const matches = data.matches.filter(m => m.week === week).sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));
    return `<section class="schedule-week" id="pekan-${week}" aria-labelledby="pekan-title-${week}"><div class="week-heading"><div><span class="eyebrow">${matches.length} MATCH · REGULAR SEASON</span><h2 id="pekan-title-${week}">Pekan ${String(week).padStart(2, '0')}<span>.</span></h2></div><span>${escape(shortDate(matches[0].date))} – ${escape(shortDate(matches.at(-1).date))} 2026</span></div><div class="match-grid">${matches.map(m => renderMatchCard(data, m)).join('')}</div></section>`;
  }).join('');
  const status = document.querySelector('#schedule-status');
  status.textContent = published.finalized ? '' : 'Nama team mengikuti hasil roster resmi setelah dipublikasikan. Jadwal tiap slot sudah tersedia di bawah.';
  status.hidden = published.finalized;
  if (/^#pekan-\d+$/.test(location.hash)) document.querySelector(location.hash)?.scrollIntoView();
  initSectionNavigation();
} catch (error) {
  document.querySelector('#schedule-status').textContent = 'Jadwal belum dapat ditampilkan. Silakan hubungi panitia.';
  console.error(error);
}
