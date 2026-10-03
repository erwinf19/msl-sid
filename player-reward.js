import { tournament } from './tournament-data.js';
import { validateTournament } from './league.js';
import { loadAssets, ROLE_LABELS } from './draft.js';
import { loadPublishedTeams, applyPublishedTeams } from './published-teams.js';
import { loadMatchResults } from './match-results.js';
import { loadMatchLineups, getPlayerRewards } from './match-lineups.js';
import { escape, dateLabel, diamondIcon } from './schedule-view.js';
import { matchIcon } from './match-icons.js';
import { initSectionNavigation } from './section-navigation.js';

const $=selector=>document.querySelector(selector);
initSectionNavigation();
try {
  const {players,logos}=await loadAssets();
  const published=await loadPublishedTeams(players,logos);
  const data=await loadMatchResults(applyPublishedTeams(tournament,published));
  validateTournament(data);
  const source=await loadMatchLineups(data);
  const rewards=getPlayerRewards(data,players,source.config);
  $('#reward-total').textContent=source.available ? String(rewards.totalDiamonds) : '—';
  $('#reward-match-count').textContent=source.available ? String(rewards.countedMatches) : '—';
  $('#reward-earned-count').textContent=source.available ? String(rewards.rows.filter(row=>row.diamonds>0).length) : '—';
  $('#reward-player-count').textContent=String(players.length);
  $('#reward-status').textContent=!source.available ? 'Data lineup belum dapat dimuat. Total reward belum dapat dipastikan; muat ulang halaman untuk mencoba lagi.' : rewards.awaitingLineups ? `${rewards.awaitingLineups} match sudah selesai dan menunggu lineup resmi. Reward match tersebut belum masuk total.` : !rewards.countedMatches ? 'Belum ada reward yang dihitung. Total akan bertambah setelah skor selesai dan lineup dipublikasikan.' : 'Total mengikuti skor dan lineup resmi terbaru. Hanya pemain yang tercatat bermain mendapat reward.';
  $('#reward-team').innerHTML='<option value="">Semua team</option>'+data.teams.map(team=>`<option value="${escape(team.name)}">${escape(team.name)}</option>`).join('');
  const render=()=>{
    const search=$('#reward-search').value.trim().toLocaleLowerCase('id'),team=$('#reward-team').value;
    const rows=rewards.rows.filter(row=>(!team||row.team===team)&&`${row.playername} ${row.username}`.toLocaleLowerCase('id').includes(search));
    $('#reward-visible-count').textContent=`${rows.length} / ${players.length} player`;
    $('#reward-rows').innerHTML=rows.length ? rows.map(row=>`<tr><th scope="row"><strong>${escape(row.playername)}</strong><small>${escape(row.username)}</small></th><td><span class="detail-role role-${data.roles.indexOf(ROLE_LABELS[row.role])}">${escape(ROLE_LABELS[row.role])}</span></td><td>${escape(row.team)}</td><td class="reward-played">${source.available?row.played:'—'}</td><td><span class="reward-diamonds">${diamondIcon}<strong>${source.available?row.diamonds:'—'}</strong></span></td><td><button class="action-button" type="button" data-reward-history="${row.id}" ${!row.played||!source.available?'disabled':''}>${matchIcon('trophy')} Riwayat</button></td></tr>`).join('') : '<tr><td colspan="6" class="reward-empty">Tidak ada pemain yang cocok dengan pencarian.</td></tr>';
  };
  $('#reward-search').addEventListener('input',render);$('#reward-team').addEventListener('change',render);render();
  const dialog=document.createElement('dialog');dialog.className='match-dialog reward-history-dialog';dialog.setAttribute('aria-labelledby','reward-history-title');document.body.append(dialog);let opener;
  document.addEventListener('click',event=>{
    const button=event.target.closest('[data-reward-history]');if(!button||button.disabled)return;
    const row=rewards.rows.find(player=>player.id===Number(button.dataset.rewardHistory));if(!row)return;
    const history=[...row.history].sort((a,b)=>`${b.date} ${b.time}`.localeCompare(`${a.date} ${a.time}`));
    dialog.innerHTML=`<div class="dialog-header"><div><span class="eyebrow">${escape(row.team)} · ${row.played} MATCH</span><h2 id="reward-history-title">${escape(row.username)}</h2></div><button class="dialog-close" type="button" data-history-close aria-label="Tutup riwayat">${matchIcon('close')}</button></div><div class="reward-history-summary"><span>${escape(row.playername)}</span><strong>${diamondIcon} ${row.diamonds} <small>diamonds</small></strong></div><ol class="reward-history">${history.map(record=>`<li><div><span>Pekan ${record.week} · ${escape(dateLabel(record.date))}</span><h3>${escape(record.team)} <small>vs</small> ${escape(record.opponent)}${record.borrowed?'<span class="reward-loan-badge">Pinjaman</span>':''}</h3><p>Skor ${record.score} · ${record.borrowed?`Pinjaman dari ${escape(row.team)}`:'Anggota roster asli'}</p><a href="/full-schedule#match-${escape(record.matchId)}">Lihat pertandingan ↗</a></div><strong>${diamondIcon} +${record.diamonds}</strong></li>`).join('')}</ol>`;
    opener=button;document.body.classList.add('match-modal-open');dialog.showModal();
  });
  dialog.addEventListener('click',event=>{
    if(event.target.closest('[data-history-close]'))dialog.close();
    else if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();}
  });
  dialog.addEventListener('close',()=>{document.body.classList.remove('match-modal-open');if(opener?.isConnected)opener.focus({preventScroll:true});});
} catch(error) {
  $('#reward-status').textContent='Reward belum dapat ditampilkan. Periksa sumber skor dan roster, lalu muat ulang halaman.';
  console.error(error);
}
