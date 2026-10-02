import { ROLES, ROLE_LABELS, createDraft, chooseName, lockDraft, loadAssets, readDraft, saveDraft, STORAGE_KEY } from './draft.js';
import { canExportDraft, exportDraft, loadPublishedTeams, DOWNLOAD_FILENAME } from './published-teams.js';
import { verifyDownloadPassword } from './download-password.js';
import { draftPermissions, publishedToDraft } from './draft-policy.js';
import { initSectionNavigation } from './section-navigation.js';
import { DRAW_STORAGE_KEY, REVEAL_INTERVAL_MS, createDrawAnimation, drawAssignments, previewDraw, readDrawAnimation, playDrawAnimation } from './draw-animation.js';
const $ = selector => document.querySelector(selector);
const escape = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
let players = [], logos = [], draft = createDraft(), filter = 'all', search = '', namingTeam = null;
let published = null;
let activeDraw = null, activeAssignment = null, lastReveal = null, animationController = null, animationRunning = false, animationOwned = false;
let rouletteTimer, countdownTimer;
const permissions = () => draftPermissions(draft, published);
const teamLabel = team => team.name || `Team ${String(team.id + 1).padStart(2, '0')}`;
const isComplete = () => draft.step === ROLES.length;
const visibleDraft = () => activeDraw ? previewDraw(activeDraw) : draft;

function saveAnimation() {
  try { localStorage.setItem(DRAW_STORAGE_KEY, JSON.stringify(activeDraw)); }
  catch {
    $('#storage-status').hidden = false;
    $('#storage-status').textContent = 'Progress undian belum dapat disimpan di browser. Biarkan halaman terbuka sampai role selesai.';
  }
}

function clearRoulette() {
  clearInterval(rouletteTimer);
  clearInterval(countdownTimer);
}

function renderAnimation() {
  const stage = $('#draw-animation');
  stage.hidden = !activeDraw;
  if (!activeDraw) return;
  const assignments = drawAssignments(activeDraw);
  const target = activeAssignment || assignments[activeDraw.revealed];
  const role = ROLE_LABELS[ROLES[activeDraw.base.step]];
  $('#animation-role').textContent = role;
  $('#animation-team').textContent = target ? `${teamLabel(activeDraw.base.teams[target.teamId])}${target.extra ? ' · Player tambahan' : ''}` : 'Seluruh player sudah terbagi';
  $('#animation-progress').max = assignments.length;
  $('#animation-progress').value = activeDraw.revealed;
  $('#animation-count').textContent = `${activeDraw.revealed} / ${assignments.length} player diumumkan`;
  $('#animation-last').textContent = lastReveal ? `✓ ${players.find(p => p.id === lastReveal.playerId).username} → ${teamLabel(activeDraw.base.teams[lastReveal.teamId])}` : 'Nama pertama akan muncul setelah 3 detik.';
}

function startRoulette(assignment) {
  clearRoulette();
  const revealedIds = new Set(visibleDraft().teams.flatMap(team => team.players));
  const candidates = players.filter(p => p.role === ROLES[activeDraw.base.step] && !revealedIds.has(p.id));
  let frame = 0, seconds = REVEAL_INTERVAL_MS / 1000;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const showCandidate = () => {
    const label = reducedMotion ? 'Mengundi player…' : candidates[frame++ % candidates.length]?.username || 'Mengundi player…';
    $('#animation-name').textContent = label;
    const slot = $(`#draft-team-${assignment.teamId} .is-drawing .roulette-name`);
    if (slot) slot.textContent = label;
  };
  $('#animation-countdown').textContent = `${seconds}`;
  showCandidate();
  if (!reducedMotion) rouletteTimer = setInterval(showCandidate, 120);
  countdownTimer = setInterval(() => { seconds = Math.max(1, seconds - 1); $('#animation-countdown').textContent = `${seconds}`; }, 1000);
}

async function runAnimation() {
  if (!activeDraw || animationRunning) return;
  animationRunning = true;
  animationController = new AbortController();
  const signal = animationController.signal;
  const play = async () => {
    // A second tab waits for the current draw instead of running another timer.
    try {
      const saved = readDraft(players, logos.map(l => l.name));
      if (saved?.step > draft.step) { location.reload(); return; }
      activeDraw = readDrawAnimation(players, logos.map(l => l.name), draft) || activeDraw;
    } catch { /* Keep the in-memory draw when storage is unavailable. */ }
    animationOwned = true;
    let showStage = true;
    const completed = await playDrawAnimation(activeDraw, {
      signal,
      onPending(assignment, animation) {
        activeDraw = animation;
        activeAssignment = assignment;
        render();
        startRoulette(assignment);
        if (showStage) {
          $('#draw-animation').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'center' });
          showStage = false;
        }
      },
      onReveal(assignment, animation) {
        clearRoulette();
        activeDraw = animation;
        activeAssignment = null;
        lastReveal = assignment;
        saveAnimation();
        render();
      }
    });
    draft = completed;
    persist();
    try { localStorage.removeItem(DRAW_STORAGE_KEY); } catch { /* The completed draft is still usable. */ }
    activeDraw = null;
    activeAssignment = null;
    render();
    lastReveal = null;
    $('#draw-status').textContent += ' · Undian role selesai!';
  };
  try {
    if (navigator.locks) await navigator.locks.request('msl-role-draw', { signal }, play);
    else await play();
  } catch (error) {
    if (error.name !== 'AbortError') {
      $('#load-status').textContent = 'Undian terhenti. Muat ulang halaman untuk melanjutkan hasil yang sama.';
      console.error(error);
    }
  } finally {
    clearRoulette();
    animationRunning = false;
    animationOwned = false;
  }
}

function persist() {
  try {
    saveDraft(draft, players);
    $('#storage-status').hidden = true;
  } catch {
    $('#storage-status').hidden = false;
    $('#storage-status').textContent = 'Browser tidak dapat menyimpan hasil. Undian tetap berjalan; download hasil JSON sebelum menutup halaman.';
  }
}

function logoTile(logo, index, selectable = false) {
  const owner = draft.teams.find(t => t.name === logo.name);
  const unavailable = owner && owner.id !== namingTeam;
  const body = `<span class="logo-number">${String(index + 1).padStart(2, '0')}</span><img src="${escape(logo.src)}" alt="Logo ${escape(logo.name)}" width="95" height="95"><strong>${escape(logo.name)}</strong><small>${owner ? `Team ${String(owner.id + 1).padStart(2, '0')} · Dipilih` : 'Tersedia'}</small>`;
  return selectable ? `<button type="button" class="logo-tile ${owner ? 'is-chosen' : ''}" data-name="${escape(logo.name)}" ${unavailable ? 'disabled' : ''} aria-pressed="${owner?.id === namingTeam}">${body}</button>` : `<article class="logo-tile ${owner ? 'is-chosen' : ''}">${body}</article>`;
}

function fitPlayerTable() {
  const shell = $('.player-table'), table = shell.querySelector('table');
  const rows = [...$('#players').rows];
  if (rows.length <= 8) {
    shell.style.removeProperty('--player-table-height');
    return;
  }
  // Include the header, eight actual rows, borders and any horizontal scrollbar.
  const contentHeight = rows[7].getBoundingClientRect().bottom - table.getBoundingClientRect().top;
  const frameHeight = shell.offsetHeight - shell.clientHeight;
  shell.style.setProperty('--player-table-height', `${Math.ceil(contentHeight + frameHeight + 1)}px`);
}

function renderPlayers() {
  const shown = visibleDraft();
  const visible = players.filter(p => (filter === 'all' || p.role === filter) && [p.playername, p.username, p.businessUnit, p.telegram].filter(Boolean).join(' ').toLocaleLowerCase('id').includes(search));
  $('#player-count').textContent = `${visible.length} / ${players.length} player`;
  $('#players').innerHTML = visible.length ? visible.map(p => {
    const team = shown.teams.find(t => t.players.includes(p.id));
    const telegram = p.telegram ? `<a class="telegram-link" href="https://t.me/${encodeURIComponent(p.telegram.slice(1))}" target="_blank" rel="noopener noreferrer" aria-label="Buka Telegram ${escape(p.playername)}">${escape(p.telegram)} <span aria-hidden="true">↗</span></a>` : '<span class="player-pending">—</span>';
    return `<tr><td>${String(p.id + 1).padStart(2, '0')}</td><th scope="row"><strong>${escape(p.playername)}</strong><small>${escape(p.username)}</small></th><td><span class="role-pill" data-role="${p.role}">${ROLE_LABELS[p.role]}</span></td><td><span class="player-unit">${escape(p.businessUnit || '—')}</span></td><td>${telegram}</td><td>${team ? escape(teamLabel(team)) : '<span class="player-pending">Menunggu undian</span>'}</td></tr>`;
  }).join('') : '<tr><td colspan="6">Tidak ada player yang cocok dengan pencarian.</td></tr>';
  fitPlayerTable();
}

function render() {
  const shown = visibleDraft();
  $('#logo-grid').innerHTML = logos.map((logo, i) => logoTile(logo, i)).join('');
  $('#draw-steps').innerHTML = ROLES.map((role, i) => `<li class="${i < draft.step ? 'done' : i === draft.step ? 'current' : ''}" ${i === draft.step ? 'aria-current="step"' : ''}>${i < draft.step ? '✓' : String(i + 1).padStart(2, '0')} ${ROLE_LABELS[role]}<small>${players.filter(p => p.role === role).length} player · ${i < draft.step ? 'Selesai' : activeDraw && i === draft.step ? 'Sedang diundi' : 'Menunggu'}</small></li>`).join('');
  const policy = permissions();
  $('#generate').disabled = Boolean(activeDraw) || !policy.canGenerate;
  $('#generate').setAttribute('aria-busy', String(Boolean(activeDraw)));
  $('#generate').textContent = activeDraw ? `Mengundi ${ROLE_LABELS[ROLES[draft.step]]}…` : policy.locked ? '✓ Team final terkunci' : isComplete() ? '✓ Semua role selesai' : `Generate ${ROLES[draft.step]}`;
  const count = shown.teams.reduce((sum, t) => sum + t.players.length, 0);
  $('#draw-status').textContent = `${draft.step} / 5 role selesai · ${count} / ${players.length} player terbagi${isComplete() ? ` · ${draft.teams.filter(t => t.name).length} / 8 nama dipilih` : ''}`;
  if (activeDraw && lastReveal) $('#draw-status').textContent += ` · ${players.find(p => p.id === lastReveal.playerId).username} masuk ${teamLabel(shown.teams[lastReveal.teamId])}`;
  $('#reset').disabled = Boolean(activeDraw) || !policy.canReset;
  $('#final-banner').hidden = !isComplete();
  $('#final-banner').classList.toggle('is-final', policy.locked);
  $('#final-title').textContent = policy.locked ? 'THE TEAMS ARE READY.' : 'YOUR SQUAD IS HERE.';
  $('#final-copy').textContent = policy.locked ? 'Delapan team. Satu arena. Roster dan identitas team sudah final — saatnya bersiap untuk match pertama.' : 'Periksa lineup dan pilih nama squad kamu. Undian bisa diulang dan nama bisa diganti sampai kamu menekan Kunci Roster.';
  $('#final-badge').textContent = policy.locked ? 'FINAL · TERKUNCI' : 'DRAFT · MASIH BISA DIUBAH';
  $('#draw-title').textContent = activeDraw ? `Siapa ${ROLE_LABELS[ROLES[draft.step]]} squad kamu?` : policy.locked ? 'Lineup final. Let the games begin.' : isComplete() ? 'Roster selesai. Pilih identitas team.' : 'Satu klik. Satu role. Delapan team.';
  $('#draw-description').textContent = activeDraw ? 'Player diumumkan satu per satu setiap 3 detik. Tunggu sampai undian role ini selesai.' : policy.locked ? 'Hasil ini terkunci. Tidak ada perubahan roster maupun nama team melalui halaman ini.' : isComplete() ? 'Periksa hasilnya, pilih 8 nama team, lalu Kunci Roster. Kamu masih bisa mengulang undian.' : 'Jungler → Gold Lane → EXP Lane → Mid Lane → Roamer. Satu player diumumkan setiap 3 detik.';
  $('#download').disabled = Boolean(activeDraw) || !canExportDraft(draft, players, logos);
  $('#download').textContent = policy.locked ? 'Download JSON ↓' : 'Kunci Roster 🔒';
  $('#download-help').textContent = policy.locked ? 'Roster final terkunci. JSON dapat diunduh ulang dengan password.' : canExportDraft(draft, players, logos) ? '8 team lengkap. Kunci Roster dengan password untuk memfinalisasi dan langsung mengunduh JSON.' : 'Kunci Roster aktif setelah 5 role selesai dan seluruh 8 nama team dipilih.';
  $('#choose-hint').textContent = isComplete() ? 'Klik Choose Team Name pada masing-masing kartu hasil undian untuk memilih identitas dari logo di bawah.' : 'Pilihan identitas untuk team kamu. Selesaikan undian, lalu klik Choose Team Name pada kartu team.';
  if (policy.locked) $('#choose-hint').textContent = 'Identitas team sudah ditentukan. Temukan logo team kamu dan kenali rekan satu squad.';
  $('#draft-teams').innerHTML = shown.teams.map(team => {
    const logo = logos.find(l => l.name === team.name);
    const roster = team.players.map(id => players.find(p => p.id === id));
    const row = (role, player, extra = false) => {
      const pending = activeDraw && activeAssignment?.teamId === team.id && activeAssignment.extra === extra && ROLES[activeDraw.base.step] === role;
      const arriving = player && lastReveal?.playerId === player.id;
      return `<li class="${extra ? 'extra-player' : ''} ${pending ? 'is-drawing' : ''} ${arriving ? 'player-arriving' : ''}" data-role="${role}" ${player ? `data-player="${player.id}"` : ''}><small>${ROLE_LABELS[role]}${extra ? '<span>PLAYER KE-6</span>' : ''}</small>${player ? `<strong>${escape(player.username)}</strong><span class="player-real-name">${escape(player.playername)}</span>` : pending ? '<span class="roulette-name" aria-hidden="true">Mengundi…</span><em class="roulette-hint">Player akan diumumkan…</em>' : '<em>Menunggu undian</em>'}</li>`;
    };
    const rows = ROLES.map(role => {
      const player = roster.find(p => p.role === role);
      return row(role, player);
    });
    const extra = roster.filter((p, i) => roster.findIndex(other => other.role === p.role) !== i);
    rows.push(...extra.map(p => row(p.role, p, true)));
    if (activeAssignment?.extra && activeAssignment.teamId === team.id) rows.push(row(ROLES[activeDraw.base.step], null, true));
    return `<article class="draft-card ${activeAssignment?.teamId === team.id ? 'drawing-card' : ''} ${lastReveal?.teamId === team.id ? 'received-player' : ''} ${policy.locked ? 'final-card' : ''}" id="draft-team-${team.id}"><div class="draft-card-head">${logo ? `<img src="${escape(logo.src)}" alt="Logo ${escape(team.name)}">` : `<span class="draft-placeholder">${String(team.id + 1).padStart(2, '0')}</span>`}<div><h3>${escape(teamLabel(team))}</h3><small>${roster.length} PLAYER${extra.length ? ' · DOUBLE ' + ROLE_LABELS[extra[0].role].toUpperCase() : ''}</small></div></div><ul class="draft-roster">${rows.join('')}</ul><button class="secondary-button" data-team="${team.id}" ${!activeDraw && policy.canChooseName(team) ? '' : 'disabled'}>${team.name ? policy.canChooseName(team) ? 'Ganti Team Name' : '✓ Identitas terkunci' : 'Choose Team Name'}</button></article>`;
  }).join('');
  renderPlayers();
  renderAnimation();
}

$('#generate').addEventListener('click', () => {
  if (activeDraw || !permissions().canGenerate) return;
  try { activeDraw = readDrawAnimation(players, logos.map(l => l.name), draft); } catch { /* An invalid checkpoint is replaced by a new valid draw. */ }
  activeDraw ||= createDrawAnimation(draft, players);
  lastReveal = null;
  saveAnimation();
  render();
  runAnimation();
});
$('#role-filters').addEventListener('click', event => {
  const button = event.target.closest('[data-role]');
  if (!button) return;
  filter = button.dataset.role;
  $('#role-filters').querySelectorAll('[data-role]').forEach(b => b.setAttribute('aria-pressed', String(b === button)));
  renderPlayers();
});
$('#player-search').addEventListener('input', event => { search = event.target.value.trim().toLocaleLowerCase('id'); renderPlayers(); });
$('#draft-teams').addEventListener('click', event => {
  const button = event.target.closest('[data-team]');
  if (activeDraw || !button || !permissions().canChooseName(draft.teams[Number(button.dataset.team)])) return;
  namingTeam = Number(button.dataset.team);
  $('#name-title').textContent = `Choose Team Name · ${String(namingTeam + 1).padStart(2, '0')}`;
  $('#name-options').innerHTML = logos.map((logo, i) => logoTile(logo, i, true)).join('');
  $('#name-dialog').showModal();
});
$('#close-name').addEventListener('click', () => $('#name-dialog').close());
$('#name-options').addEventListener('click', event => {
  const button = event.target.closest('[data-name]');
  if (activeDraw || !button || button.disabled || !permissions().canChooseName(draft.teams[namingTeam])) return;
  draft = chooseName(draft, namingTeam, button.dataset.name, logos.map(l => l.name));
  $('#name-dialog').close();
  persist();
  render();
  if (permissions().locked) $('#final-banner').focus();
  else document.querySelector('[data-team]:not(:disabled)')?.focus();
});
$('#reset').addEventListener('click', () => { if (!activeDraw && permissions().canReset) $('#reset-dialog').showModal(); });
$('#cancel-reset').addEventListener('click', () => $('#reset-dialog').close());
$('#confirm-reset').addEventListener('click', () => {
  if (activeDraw || !permissions().canReset) return;
  draft = createDraft();
  lastReveal = null;
  try { localStorage.removeItem(DRAW_STORAGE_KEY); } catch { /* Reset still works without storage. */ }
  persist();
  $('#reset-dialog').close();
  render();
  $('#generate').focus();
});
$('#download').addEventListener('click', () => {
  if (activeDraw || !canExportDraft(draft, players, logos)) return;
  $('#download-form').reset();
  $('#download-error').textContent = '';
  $('#download-title').textContent = permissions().locked ? 'Download roster final.' : 'Kunci roster & download.';
  $('#download-description').textContent = permissions().locked ? 'Masukkan password untuk mengunduh ulang roster final.' : 'Setelah password benar, roster dan nama team tidak bisa diubah lagi. JSON langsung diunduh untuk kamu commit dan deploy.';
  $('#download-dialog').showModal();
  $('#download-password').focus();
});
let passwordAttempt = 0;
$('#cancel-download').addEventListener('click', () => $('#download-dialog').close());
$('#download-dialog').addEventListener('close', () => {
  passwordAttempt++;
  $('#download-form').reset();
  $('#confirm-download').disabled = false;
  $('#confirm-download').textContent = 'Konfirmasi & Download';
});
$('#download-form').addEventListener('submit', async event => {
  event.preventDefault();
  if (activeDraw || $('#confirm-download').disabled || !canExportDraft(draft, players, logos)) return;
  const attempt = ++passwordAttempt;
  $('#confirm-download').disabled = true;
  $('#confirm-download').textContent = 'Memverifikasi…';
  $('#download-error').textContent = '';
  let password = $('#download-password').value;
  $('#download-password').value = '';
  try {
    const valid = await verifyDownloadPassword(password);
    password = '';
    if (attempt !== passwordAttempt || !$('#download-dialog').open) return;
    if (!valid) {
      $('#download-error').textContent = 'Password salah. File belum diunduh.';
      $('#download-password').focus();
      return;
    }
    const wasPublished = permissions().locked && published?.finalized;
    if (!wasPublished) draft = lockDraft(draft, players, logos.map(l => l.name));
    const output = wasPublished ? { ...published, locked: true } : exportDraft(draft, players, logos);
    const url = URL.createObjectURL(new Blob([JSON.stringify(output, null, 2) + '\n'], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url; link.download = DOWNLOAD_FILENAME;
    document.body.append(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    if (!wasPublished) persist();
    $('#download-dialog').close();
    render();
    $('#download-help').textContent = 'File draft-team-msl.json siap diunduh. Ganti file di assets/, commit, lalu deploy ulang untuk memperbarui beranda.';
  } catch (error) {
    if (attempt === passwordAttempt) $('#download-error').textContent = error.message;
  } finally {
    password = '';
    if (attempt === passwordAttempt) {
      $('#confirm-download').disabled = false;
      $('#confirm-download').textContent = 'Konfirmasi & Download';
    }
  }
});
// Keep two tabs on the same origin from silently using different drafts.
window.addEventListener('storage', event => {
  if (event.key === STORAGE_KEY && players.length) location.reload();
  if (event.key === DRAW_STORAGE_KEY && players.length && !permissions().locked) {
    if (animationOwned) return;
    if (!event.newValue) { location.reload(); return; }
    try {
      const saved = readDrawAnimation(players, logos.map(l => l.name), draft);
      if (!saved) return;
      activeDraw = saved;
      const assignments = drawAssignments(saved);
      activeAssignment = assignments[saved.revealed] || null;
      lastReveal = assignments[saved.revealed - 1] || null;
      render();
      $('#animation-name').textContent = 'Undian berjalan di tab lain…';
      $('#animation-countdown').textContent = '…';
      runAnimation();
    } catch { /* Ignore a checkpoint that does not match this draft. */ }
  }
});
window.addEventListener('pagehide', () => { animationController?.abort(); clearRoulette(); });
window.addEventListener('pageshow', () => { if (activeDraw) setTimeout(runAnimation, 0); });

try {
  ({ players, logos } = await loadAssets());
  published = await loadPublishedTeams(players, logos);
  try { draft = published.finalized ? publishedToDraft(published) : readDraft(players, logos.map(l => l.name)) || createDraft(); }
  catch (error) { $('#storage-status').hidden = false; $('#storage-status').textContent = `${error.message} Undian baru siap dimulai.`; }
  if (!permissions().locked && !isComplete()) {
    try { activeDraw = readDrawAnimation(players, logos.map(l => l.name), draft); }
    catch {
      try { localStorage.removeItem(DRAW_STORAGE_KEY); } catch { /* Ignore unavailable storage. */ }
    }
    if (activeDraw) lastReveal = drawAssignments(activeDraw)[activeDraw.revealed - 1] || null;
  }
  $('#total-players').textContent = players.length;
  $('#logo-count').textContent = `${logos.length} identitas team`;
  $('#role-filters').innerHTML = ['all', ...ROLES].map(role => `<button type="button" data-role="${role}" aria-pressed="${role === 'all'}">${role === 'all' ? 'Semua' : ROLE_LABELS[role]} <span>${role === 'all' ? players.length : players.filter(p => p.role === role).length}</span></button>`).join('');
  $('#load-status').textContent = '';
  render();
  if (['#choose-team', '#player-list', '#random-team'].includes(location.hash)) document.querySelector(location.hash).scrollIntoView();
  if (activeDraw) runAnimation();
} catch (error) {
  $('#load-status').textContent = error.message;
  $('#generate').textContent = 'Data belum tersedia';
}

initSectionNavigation();
// Recalculate when responsive widths or loaded fonts change the row heights.
new ResizeObserver(fitPlayerTable).observe($('.player-table table'));
