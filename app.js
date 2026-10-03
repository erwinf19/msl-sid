import { tournament } from './tournament-data.js';
import { validateTournament, getStandings } from './league.js';
import { loadAssets } from './draft.js';
import { loadPublishedTeams, applyPublishedTeams } from './published-teams.js';
import { escape, badge, diamondIcon, renderMatchCard } from './schedule-view.js';
import { initSectionNavigation } from './section-navigation.js';
import { loadMatchStreams } from './match-streams.js';
import { initMatchActions } from './match-actions.js';
import { loadMatchResults } from './match-results.js';
import { loadMatchLineups } from './match-lineups.js';
import { initLineupActions } from './lineup-actions.js';
let data = structuredClone(tournament);
let lineupController;
// Five independent viewport windows into the original supplied role sheet.
// Keep the source bitmap intact; no redrawing or image regeneration.
const roleViews = ['317 50 172 160', '452 306 172 154', '181 306 172 154', '44 50 172 160', '583 50 172 160'];
const roleIcon = index => `<svg viewBox="${roleViews[index]}" aria-hidden="true" focusable="false"><image href="/assets/mlbb-role-sheet.webp" width="800" height="559"/></svg>`;
function renderSchedule(week) {
  document.querySelectorAll('[data-week]').forEach(button => {const active = Number(button.dataset.week) === week; button.classList.toggle('selected',active); button.setAttribute('aria-pressed',String(active));});
  const matches = data.matches.filter(m => m.week === week).sort((a,b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));
  document.querySelector('#matches').innerHTML = matches.length ? matches.map(m => renderMatchCard(data, m)).join('') : '<p class="empty">Jadwal minggu ini belum diumumkan.</p>';
  lineupController?.refresh();
}
try {
  const { players, logos } = await loadAssets();
  const published = await loadPublishedTeams(players, logos);
  data = await loadMatchStreams(await loadMatchResults(applyPublishedTeams(tournament, published)));
  validateTournament(data);
  const lineupState = await loadMatchLineups(data);
  data.lineupConfig = lineupState.config;
  document.querySelector('#demo-note').hidden = false;
  document.querySelector('#demo-note').textContent = published.finalized
    ? `TEAM RESMI · Nama dan roster berasal dari data yang dipublikasikan.${data.demo ? ' Jadwal masih contoh dan belum menjadi jadwal resmi.' : ''}`
    : 'MENUNGGU TEAM · Delapan slot team siap. Nama dan roster akan tampil setelah hasil undian dipublikasikan.';
  const rows=getStandings(data);
  document.querySelector('#standings').innerHTML=rows.map((t,i)=>`<tr><td class="rank">${String(i+1).padStart(2,'0')}</td><th scope="row"><a class="table-team" href="#team-${escape(t.id)}">${badge(t,true)}<span>${escape(t.name)}<small>${escape(t.tag)}</small></span></a></th><td class="match-points">${t.points}</td><td>${t.wins} <span class="dash">–</span> ${t.losses}</td><td class="${t.net>0?'positive':t.net<0?'negative':''}">${t.net>0?'+':''}${t.net}</td><td>${t.gameWins} <span class="dash">–</span> ${t.gameLosses}</td></tr>`).join('');
  document.querySelector('#scoring-note').textContent=`Unggul = ${data.pointsPerWin} poin · Berpartisipasi = 0 · Urutan: poin, net game, game win, nama tim`;
  const weeks=[...new Set(data.matches.map(m=>m.week))].sort((a,b)=>a-b);
  document.querySelector('#week-tabs').innerHTML=weeks.map(w=>`<button data-week="${w}" aria-pressed="false">PEKAN ${String(w).padStart(2,'0')}</button>`).join('');
  document.querySelector('#week-tabs').addEventListener('click',e=>{const button=e.target.closest('button[data-week]');if(button)renderSchedule(Number(button.dataset.week));});
  renderSchedule(weeks.includes(data.defaultWeek)?data.defaultWeek:weeks[0]);
  initMatchActions(data);
  lineupController = initLineupActions(data,lineupState);
  const linkedMatch = data.matches.find(m => location.hash === `#match-${m.id}`);
  if (linkedMatch) { renderSchedule(linkedMatch.week); document.getElementById(`match-${linkedMatch.id}`)?.scrollIntoView(); }
  document.querySelector('#team-count').textContent=`${data.teams.length} tim / ${data.teams.reduce((n,t)=>n+t.players.length,0)} pemain`;
  document.querySelector('#teams').innerHTML=data.teams.map(t=>`<article class="roster-card" id="team-${escape(t.id)}"><div class="roster-head">${badge(t)}<div><span>${escape(t.tag)} / TEAM ROSTER · ${t.players.length} PLAYER</span><h3>${escape(t.name)}</h3></div></div><ul>${t.players.map((p,i)=>{const role=t.playerRoles?.[i] || data.roles[i];return `<li><span class="role-icon">${roleIcon(data.roles.indexOf(role))}</span><span class="role-name">${escape(role)}</span><div class="roster-player"><strong>${escape(p)}</strong><span>${escape(t.playerNames?.[i] || '')}</span></div></li>`;}).join('')}</ul></article>`).join('');
  if (!published.finalized) document.querySelectorAll('#teams ul').forEach(list => { list.outerHTML = '<p class="pending-roster">Menunggu nama team dan roster resmi.</p>'; });
  document.querySelector('#prizes').innerHTML=data.rewards.map(r=>`<div class="prize-card ${r.win?'win':''}"><div class="prize-card-top"><span>${r.win?'UNGGUL':'BERPARTISIPASI'}</span><strong>${r.score}</strong></div><div class="diamond-value">${diamondIcon}<strong>${r.diamonds}</strong></div><p>diamonds / pemain</p><small>${r.diamonds*5} diamonds / tim</small></div>`).join('');
  // Async roster loading changes section positions; resolve incoming anchors afterward.
  if (['#klasemen', '#jadwal', '#tim', '#hadiah'].includes(location.hash)) document.querySelector(location.hash).scrollIntoView();
} catch(error) {
  document.querySelector('#demo-note').hidden=false;
  document.querySelector('#demo-note').textContent='Data turnamen belum dapat ditampilkan. Silakan hubungi panitia.';
  console.error(error);
}
initSectionNavigation();
