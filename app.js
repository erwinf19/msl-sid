import { tournament as data } from './tournament-data.js';
import { validateTournament, getStandings, getReward } from './league.js';
const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const badge = (team, small = false) => `<span class="team-badge ${escape(team.color)} ${small ? 'small' : ''}" aria-hidden="true">${escape(team.tag)}</span>`;
const diamondIcon = '<img class="diamond-icon" src="assets/diamond-icon.png" alt="" width="48" height="48" loading="lazy">';
// Five independent viewport windows into the original supplied role sheet.
// Keep the source bitmap intact; no redrawing or image regeneration.
const roleViews = ['317 50 172 160', '452 306 172 154', '181 306 172 154', '44 50 172 160', '583 50 172 160'];
const roleIcon = index => `<svg viewBox="${roleViews[index]}" aria-hidden="true" focusable="false"><image href="assets/mlbb-role-sheet.webp" width="800" height="559"/></svg>`;
const dateLabel = date => new Intl.DateTimeFormat('id-ID', { weekday:'long', day:'numeric', month:'long', year:'numeric', timeZone:'Asia/Jakarta' }).format(new Date(`${date}T12:00:00+07:00`));
function renderSchedule(week) {
  document.querySelectorAll('[data-week]').forEach(button => {const active = Number(button.dataset.week) === week; button.classList.toggle('selected',active); button.setAttribute('aria-pressed',String(active));});
  const matches = data.matches.filter(m => m.week === week).sort((a,b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));
  document.querySelector('#matches').innerHTML = matches.length ? matches.map(m => {
    const a = data.teams.find(t=>t.id===m.a), b = data.teams.find(t=>t.id===m.b);
    const isPreview = data.demo && m.score === null && Array.isArray(m.previewScore);
    const score = isPreview ? m.previewScore : m.score, done = score !== null;
    const aWins = done && score[0] > score[1];
    return `<article class="match-card ${done?'match-completed':''}">
      <div class="match-top"><span>${escape(dateLabel(m.date))}</span><span class="match-status ${done?'finished':''}">${done?'Selesai':'Terjadwal'}</span></div>
      ${isPreview?'<div class="match-preview-label">CONTOH HASIL · Tidak masuk klasemen</div>':''}
      <div class="match-body">
        <div class="match-team ${done&&aWins?'match-winner':''}">${badge(a)}<h3>${escape(a.name)}</h3>${done?`<span class="outcome ${aWins?'won':''}">${aWins?'UNGGUL':'BERPARTISIPASI'}</span>`:''}</div>
        <div class="match-score">${done?`<strong><b class="${aWins?'winning-score':''}">${score[0]}</b><span>:</span><b class="${!aWins?'winning-score':''}">${score[1]}</b></strong><span class="score-format">FINAL · BO3</span>`:'<strong class="versus">VS</strong>'}<span>${escape(m.time)} WIB</span></div>
        <div class="match-team ${done&&!aWins?'match-winner':''}">${badge(b)}<h3>${escape(b.name)}</h3>${done?`<span class="outcome ${!aWins?'won':''}">${!aWins?'UNGGUL':'BERPARTISIPASI'}</span>`:''}</div>
      </div>
      ${done?`<div class="match-rewards"><span class="reward-caption">DIAMONDS / PEMAIN</span><div><span>${escape(a.tag)}</span><strong>${diamondIcon}${getReward(data,...score)}</strong></div><div><span>${escape(b.tag)}</span><strong>${diamondIcon}${getReward(data,...[...score].reverse())}</strong></div></div>`:`<div class="match-bottom"><span>BEST OF 3</span><span class="upcoming-reward">${diamondIcon} Hingga 28 diamonds / pemain</span></div>`}
    </article>`;
  }).join('') : '<p class="empty">Jadwal minggu ini belum diumumkan.</p>';
}
try {
  validateTournament(data);
  document.querySelector('#demo-note').hidden = !data.demo;
  const rows=getStandings(data);
  document.querySelector('#standings').innerHTML=rows.map((t,i)=>`<tr><td class="rank">${String(i+1).padStart(2,'0')}</td><th scope="row"><a class="table-team" href="#team-${escape(t.id)}">${badge(t,true)}<span>${escape(t.name)}<small>${escape(t.tag)}</small></span></a></th><td class="match-points">${t.points}</td><td>${t.wins} <span class="dash">–</span> ${t.losses}</td><td class="${t.net>0?'positive':t.net<0?'negative':''}">${t.net>0?'+':''}${t.net}</td><td>${t.gameWins} <span class="dash">–</span> ${t.gameLosses}</td></tr>`).join('');
  document.querySelector('#scoring-note').textContent=`Unggul = ${data.pointsPerWin} poin · Berpartisipasi = 0 · Urutan: poin, net game, game win, nama tim`;
  const weeks=[...new Set(data.matches.map(m=>m.week))].sort((a,b)=>a-b);
  document.querySelector('#week-tabs').innerHTML=weeks.map(w=>`<button data-week="${w}" aria-pressed="false">WEEK ${String(w).padStart(2,'0')}</button>`).join('');
  document.querySelector('#week-tabs').addEventListener('click',e=>{const button=e.target.closest('button[data-week]');if(button)renderSchedule(Number(button.dataset.week));});
  renderSchedule(weeks.includes(data.defaultWeek)?data.defaultWeek:weeks[0]);
  document.querySelector('#team-count').textContent=`${data.teams.length} tim / ${data.teams.reduce((n,t)=>n+t.players.length,0)} pemain`;
  document.querySelector('#teams').innerHTML=data.teams.map(t=>`<article class="roster-card" id="team-${escape(t.id)}"><div class="roster-head">${badge(t)}<div><span>${escape(t.tag)} / TEAM ROSTER</span><h3>${escape(t.name)}</h3></div></div><ul>${t.players.map((p,i)=>`<li><span class="role-icon">${roleIcon(i)}</span><span class="role-name">${escape(data.roles[i])}</span><strong>${escape(p)}</strong></li>`).join('')}</ul></article>`).join('');
  document.querySelector('#prizes').innerHTML=data.rewards.map(r=>`<div class="prize-card ${r.win?'win':''}"><div class="prize-card-top"><span>${r.win?'UNGGUL':'BERPARTISIPASI'}</span><strong>${r.score}</strong></div><div class="diamond-value">${diamondIcon}<strong>${r.diamonds}</strong></div><p>diamonds / pemain</p><small>${r.diamonds*5} diamonds / tim</small></div>`).join('');
} catch(error) {
  document.querySelector('#demo-note').hidden=false;
  document.querySelector('#demo-note').textContent='Data turnamen belum dapat ditampilkan. Silakan hubungi panitia.';
  console.error(error);
}
const navigation = [...document.querySelectorAll('nav a')];
const observer = new IntersectionObserver(entries=>{for(const entry of entries)if(entry.isIntersecting){navigation.forEach(a=>a.classList.toggle('active',a.hash===`#${entry.target.id}`));}},{rootMargin:'-15% 0px -65% 0px'});
['beranda','klasemen','jadwal','tim','hadiah'].forEach(id=>observer.observe(document.getElementById(id)));
