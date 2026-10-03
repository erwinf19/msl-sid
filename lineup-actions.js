import { escape, badge, dateLabel } from './schedule-view.js';
import { matchIcon } from './match-icons.js';
import { verifyDownloadPassword } from './download-password.js';
import { emptyLineups, getLoanTeams, validateLineupPlayers, loadMatchLineups, lockMatchLineup, mergeLineups, readPendingLineups, savePendingLineups, LINEUP_FILENAME } from './match-lineups.js';

export function initLineupActions(data, initialState) {
  let source = initialState, pending = emptyLineups(), merged, match, opener, attempt = 0, busy = false;
  try { pending = readPendingLineups(data); } catch { /* A changed roster invalidates old browser drafts. */ }
  const refresh = () => {
    pending.matches = pending.matches.filter(entry=>!source.config.matches.some(saved=>saved.id===entry.id));
    merged = mergeLineups(data,pending,source.config);
    data.lineupConfig = merged;
    document.querySelectorAll('[data-match-lineup]').forEach(button=>{
      const entry=merged.matches.find(lineup=>lineup.id===button.dataset.matchLineup);
      const published=source.config.matches.some(lineup=>lineup.id===button.dataset.matchLineup);
      button.innerHTML=`${matchIcon('lock')} ${entry ? published ? 'Lineup terkunci' : 'Siap diunggah' : 'Lock lineup'}`;
    });
  };
  refresh();
  const dialog = document.createElement('dialog');
  dialog.className='match-dialog lineup-dialog'; dialog.setAttribute('aria-labelledby','lineup-title');
  document.body.append(dialog);
  const entryForMatch=()=>merged.matches.find(entry=>entry.id===match.id);
  const selected=side=>[...dialog.querySelectorAll(`input[name="lineup-${side}"]:checked`)].map(input=>Number(input.value));
  const feedback=message=>{dialog.querySelector('[data-lineup-feedback]').textContent=message;};
  const playerOptions=(team,side,ids,entry,loan=false)=>team.playerIds.map((id,i)=>{
    if (loan && entry && !ids.includes(id)) return '';
    return `<label class="lineup-player ${loan?'loan-player':''}" ${loan?`data-loan-option="${side}" data-owner="${escape(team.id)}"`:''}><input type="checkbox" name="lineup-${side}" value="${id}" ${loan?'data-loan="true"':''} ${ids.includes(id)?'checked':''} ${entry?'disabled':''}><span class="lineup-player-name"><strong>${escape(team.players[i])}</strong><small>${escape(team.playerNames[i])}</small>${loan?`<span class="loan-origin">Pinjaman · ${escape(team.name)}</span>`:''}</span><span class="detail-role role-${data.roles.indexOf(team.playerRoles[i])}">${escape(team.playerRoles[i])}</span></label>`;
  }).join('');
  const filterLoans=side=>{
    const chooser=dialog.querySelector(`[data-loan-team="${side}"]`);
    if(!chooser)return;
    const query=dialog.querySelector(`[data-loan-search="${side}"]`).value.trim().toLocaleLowerCase('id');
    let visible=0;
    dialog.querySelectorAll(`[data-loan-option="${side}"]`).forEach(option=>{
      const teamMatches=chooser.value==='*'||chooser.value===option.dataset.owner||!chooser.value&&Boolean(query);
      option.hidden=!teamMatches||!option.textContent.toLocaleLowerCase('id').includes(query);
      if(!option.hidden)visible++;
    });
    const empty=dialog.querySelector(`[data-loan-empty="${side}"]`);
    empty.hidden=visible>0;
    empty.textContent=chooser.value||query ? 'Tidak ada pemain yang cocok.' : 'Pilih team asal atau cari pemain untuk mulai meminjam.';
  };
  const loanOptions=(side,ids,entry,loanTeams)=>{
    if(entry){
      const options=loanTeams.map(team=>playerOptions(team,side,ids,entry,true)).join('');
      return options?`<section class="lineup-loans loan-locked"><h4>Pemain pinjaman</h4>${options}</section>`:'';
    }
    return `<details class="lineup-loans"><summary>${matchIcon('players')}<span>Pinjam pemain</span><b data-loan-count="${side}">0 / 2</b></summary><p>Minimal 3 pemain asli, maksimal 2 pinjaman dari team yang tidak bermain pada jadwal ini. Peminjaman maksimal 2 game sesuai aturan event.</p><div class="loan-picked" data-loan-picked="${side}" aria-live="polite"></div><label class="loan-filter-label">Team asal<select data-loan-team="${side}"><option value="">Pilih team asal</option><option value="*">Semua team yang tersedia</option>${loanTeams.map(team=>`<option value="${escape(team.id)}">${escape(team.name)}</option>`).join('')}</select></label><label class="loan-filter-label">Cari pemain<input type="search" data-loan-search="${side}" placeholder="Nama atau username pemain"></label><div class="loan-player-list">${loanTeams.map(team=>playerOptions(team,side,ids,null,true)).join('')}<p class="loan-empty" data-loan-empty="${side}"></p></div></details>`;
  };
  const updateSelection=()=>{
    const entry=entryForMatch();
    for (const side of ['a','b']) {
      const count=selected(side).length,otherIds=new Set(selected(side==='a'?'b':'a'));
      const loans=[...dialog.querySelectorAll(`input[name="lineup-${side}"][data-loan]:checked`)];
      dialog.querySelector(`[data-lineup-count="${side}"]`).textContent=`${count} / 5 dipilih · ${count-loans.length} asli · ${loans.length} pinjaman`;
      dialog.querySelector(`[data-lineup-selection-note="${side}"]`).textContent=count<5?`Masih perlu ${5-count} pemain untuk melengkapi lineup.`:'Lineup lengkap. Reward mengikuti 5 pemain ini.';
      dialog.querySelectorAll(`input[name="lineup-${side}"]`).forEach(input=>{
        input.disabled=Boolean(entry)||busy||!input.checked&&(count===5||otherIds.has(Number(input.value))||input.hasAttribute('data-loan')&&loans.length===2);
      });
      const loanCount=dialog.querySelector(`[data-loan-count="${side}"]`);
      if(loanCount)loanCount.textContent=`${loans.length} / 2`;
      const picked=dialog.querySelector(`[data-loan-picked="${side}"]`);
      if(picked)picked.innerHTML=loans.map(input=>{
        const owner=data.teams.find(team=>team.playerIds.includes(Number(input.value))),i=owner.playerIds.indexOf(Number(input.value));
        return `<button type="button" data-remove-loan="${input.value}" data-side="${side}" ${busy?'disabled':''} aria-label="Hapus pinjaman ${escape(owner.players[i])}"><span>${escape(owner.players[i])}<small>${escape(owner.name)}</small></span>${matchIcon('close')}</button>`;
      }).join('');
      dialog.querySelectorAll(`[data-loan-team="${side}"],[data-loan-search="${side}"]`).forEach(input=>{input.disabled=busy;});
    }
    let ready=true;
    if(!entry)try{validateLineupPlayers(data,match,selected('a'),selected('b'));}catch{ready=false;}
    dialog.querySelector('[data-lineup-submit]').disabled=busy||!source.available||!ready;
  };
  const render=()=>{
    const entry=entryForMatch(),published=source.config.matches.some(record=>record.id===match.id);
    const teams=[match.a,match.b].map(id=>data.teams.find(t=>t.id===id)),loanTeams=getLoanTeams(data,match);
    dialog.innerHTML=`<form class="lineup-form"><div class="dialog-header"><div><span class="eyebrow">MATCH ${escape(match.id.toUpperCase())} · PEKAN ${match.week}</span><h2 id="lineup-title">${entry ? 'Lineup terkunci' : 'Siapa yang masuk arena?'}</h2></div><button class="dialog-close" type="button" data-lineup-close aria-label="Tutup lineup">${matchIcon('close')}</button></div><div class="lineup-intro"><strong>${escape(teams[0].name)} <span>VS</span> ${escape(teams[1].name)}</strong><p>${escape(dateLabel(match.date))} · ${escape(match.time)} WIB</p><p>${entry ? published ? 'Lineup sudah dipublikasikan. Pemain terpilih mendapat reward setelah skor match selesai.' : 'JSON sudah disiapkan. Unggah ke msl-data agar lineup dan reward tampil untuk semua pengunjung.' : 'Pilih tepat 5 pemain untuk setiap team: minimal 3 pemain asli dan maksimal 2 pinjaman. Reward mengikuti pemain yang dipilih.'}</p>${!source.available ? '<p class="lineup-warning">Sumber lineup belum dapat dimuat. Muat ulang halaman sebelum mengunci atau mengunduh data.</p>' : ''}</div><div class="lineup-team-grid">${teams.map((team,index)=>{
      const side=index?'b':'a',ids=entry?.[index?'playerIdsB':'playerIdsA'] || [];
      return `<fieldset class="lineup-team"><legend>${escape(team.name)}</legend><div class="lineup-team-head">${badge(team)}<div><h3>${escape(team.name)}</h3><span data-lineup-count="${side}" aria-live="polite">0 / 5 dipilih</span></div></div><p class="lineup-selection-note" data-lineup-selection-note="${side}"></p><div class="lineup-options">${playerOptions(team,side,ids,entry)}</div>${loanOptions(side,ids,entry,loanTeams)}${entry ? `<p class="lineup-bench">Tidak bermain: ${escape(team.players.filter((_,i)=>!ids.includes(team.playerIds[i])).join(', ') || '—')}</p>` : ''}</fieldset>`;
    }).join('')}</div><div class="lineup-export"><label for="lineup-password">Password ${entry?'download':'lock lineup'}</label><input id="lineup-password" type="password" required autocomplete="current-password" maxlength="256" placeholder="Password panitia" aria-describedby="lineup-feedback"><p id="lineup-feedback" data-lineup-feedback role="status" aria-live="polite"></p><div class="lineup-export-actions"><p>${entry ? 'File berisi seluruh lineup yang sudah dikunci.' : 'Setelah dikunci, pilihan tidak bisa diedit dari website. JSON langsung diunduh.'}</p><button class="action-button action-primary" type="submit" data-lineup-submit>${matchIcon('lock')} ${entry?'Download JSON':'Kunci lineup & download'}</button></div><small>Upload ${LINEUP_FILENAME} ke repository msl-data. Data publik mengikuti JSON yang kamu unggah.</small></div></form>`;
    updateSelection();
    for(const side of ['a','b'])filterLoans(side);
  };
  document.addEventListener('click',event=>{
    const button=event.target.closest('[data-match-lineup]');
    if (!button || button.disabled) return;
    const found=data.matches.find(m=>m.id===button.dataset.matchLineup);
    if (!found) return;
    match=found; opener=button; render(); document.body.classList.add('match-modal-open'); dialog.showModal();
  });
  dialog.addEventListener('change',event=>{
    if(event.target.hasAttribute('data-loan-team'))filterLoans(event.target.dataset.loanTeam);
    updateSelection();feedback('');
  });
  dialog.addEventListener('input',event=>{
    if(event.target.hasAttribute('data-loan-search'))filterLoans(event.target.dataset.loanSearch);
  });
  dialog.addEventListener('click',event=>{
    const remove=event.target.closest('[data-remove-loan]');
    if(remove&&!busy&&!entryForMatch()){
      dialog.querySelector(`input[name="lineup-${remove.dataset.side}"][value="${remove.dataset.removeLoan}"]`).checked=false;
      updateSelection();feedback('');
    }else if (event.target.closest('[data-lineup-close]')) dialog.close();
    else if (event.target===dialog) {const rect=dialog.getBoundingClientRect();if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)dialog.close();}
  });
  dialog.addEventListener('close',()=>{
    attempt++; busy=false; dialog.querySelector('form')?.reset();
    document.body.classList.remove('match-modal-open'); if(opener?.isConnected)opener.focus({preventScroll:true});
  });
  dialog.addEventListener('submit',async event=>{
    event.preventDefault(); if(busy||!source.available) return;
    const prior=entryForMatch(),idsA=selected('a'),idsB=selected('b');
    if(!prior)try{validateLineupPlayers(data,match,idsA,idsB);}catch(error){feedback(error.message);return;}
    const request=++attempt;
    let password=dialog.querySelector('#lineup-password').value;
    dialog.querySelector('#lineup-password').value=''; busy=true; updateSelection(); feedback('Memverifikasi password…');
    try {
      const valid=await verifyDownloadPassword(password); password='';
      if(request!==attempt||!dialog.open)return;
      if(!valid)throw new Error('Password salah. Lineup belum dikunci dan JSON belum diunduh.');
      const latest=await loadMatchLineups(data);
      if(request!==attempt||!dialog.open)return;
      if(!latest.available)throw new Error('Data terbaru belum dapat dimuat. Coba lagi agar lineup lain tidak tertimpa.');
      source=latest; refresh();
      if(!prior&&entryForMatch()) {busy=false;render();feedback('Lineup match ini sudah dikunci. Periksa data terbaru, lalu download ulang.');return;}
      if(!entryForMatch()) {
        merged=lockMatchLineup(data,merged,match.id,idsA,idsB);
        pending={version:1,matches:merged.matches.filter(entry=>!source.config.matches.some(saved=>saved.id===entry.id))};
      }
      let storageSaved=true;
      try{savePendingLineups(data,pending);}catch{storageSaved=false;}
      refresh();
      const url=URL.createObjectURL(new Blob([JSON.stringify(merged,null,2)+'\n'],{type:'application/json'}));
      const link=document.createElement('a');link.href=url;link.download=LINEUP_FILENAME;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
      busy=false;render();feedback(`JSON berhasil diunduh. Unggah file ke msl-data untuk mempublikasikan lineup.${storageSaved?'':' Draft tidak tersimpan di browser; simpan file unduhan sebelum menutup halaman.'}`);
    } catch(error) {
      if(request===attempt&&dialog.open){feedback(error.message);dialog.querySelector('#lineup-password').focus();}
    } finally {
      password='';if(request===attempt&&dialog.open){busy=false;updateSelection();}
    }
  });
  return {refresh};
}
