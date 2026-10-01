import { ROLES, ROLE_LABELS, createDraft, generateRole, chooseName, lockDraft, loadAssets, readDraft, saveDraft, STORAGE_KEY } from './draft.js';
import { canExportDraft, exportDraft, loadPublishedTeams, DOWNLOAD_FILENAME } from './published-teams.js';
import { verifyDownloadPassword } from './download-password.js';
import { draftPermissions, publishedToDraft } from './draft-policy.js';
const $ = selector => document.querySelector(selector);
const escape = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
let players = [], logos = [], draft = createDraft(), filter = 'all', search = '', namingTeam = null;
let published = null;
const permissions = () => draftPermissions(draft, published);
const teamLabel = team => team.name || `Team ${String(team.id + 1).padStart(2, '0')}`;
const isComplete = () => draft.step === ROLES.length;

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

function renderPlayers() {
  const visible = players.filter(p => (filter === 'all' || p.role === filter) && `${p.playername} ${p.username}`.toLocaleLowerCase('id').includes(search));
  $('#player-count').textContent = `${visible.length} / ${players.length} player`;
  $('#players').innerHTML = visible.length ? visible.map(p => {
    const team = draft.teams.find(t => t.players.includes(p.id));
    return `<tr><td>${String(p.id + 1).padStart(2, '0')}</td><th scope="row"><strong>${escape(p.playername)}</strong><small>${escape(p.username)}</small></th><td><span class="role-pill">${ROLE_LABELS[p.role]}</span></td><td>${team ? escape(teamLabel(team)) : '<span class="player-pending">Menunggu undian</span>'}</td></tr>`;
  }).join('') : '<tr><td colspan="4">Tidak ada player yang cocok dengan pencarian.</td></tr>';
}

function render(reveal = false) {
  $('#logo-grid').innerHTML = logos.map((logo, i) => logoTile(logo, i)).join('');
  $('#draw-steps').innerHTML = ROLES.map((role, i) => `<li class="${i < draft.step ? 'done' : i === draft.step ? 'current' : ''}" ${i === draft.step ? 'aria-current="step"' : ''}>${i < draft.step ? '✓' : String(i + 1).padStart(2, '0')} ${ROLE_LABELS[role]}<small>${players.filter(p => p.role === role).length} player · ${i < draft.step ? 'Selesai' : 'Menunggu'}</small></li>`).join('');
  const policy = permissions();
  $('#generate').disabled = !policy.canGenerate;
  $('#generate').textContent = policy.locked ? '✓ Team final terkunci' : isComplete() ? '✓ Semua role selesai' : `Generate ${ROLES[draft.step]}`;
  const count = draft.teams.reduce((sum, t) => sum + t.players.length, 0);
  $('#draw-status').textContent = `${draft.step} / 5 role selesai · ${count} / ${players.length} player terbagi${isComplete() ? ` · ${draft.teams.filter(t => t.name).length} / 8 nama dipilih` : ''}`;
  $('#reset').disabled = !policy.canReset;
  $('#final-banner').hidden = !isComplete();
  $('#final-banner').classList.toggle('is-final', policy.locked);
  $('#final-title').textContent = policy.locked ? 'THE TEAMS ARE READY.' : 'YOUR SQUAD IS HERE.';
  $('#final-copy').textContent = policy.locked ? 'Delapan team. Satu arena. Roster dan identitas team sudah final — saatnya bersiap untuk match pertama.' : 'Periksa lineup dan pilih nama squad kamu. Undian bisa diulang dan nama bisa diganti sampai kamu menekan Kunci Roster.';
  $('#final-badge').textContent = policy.locked ? 'FINAL · TERKUNCI' : 'DRAFT · MASIH BISA DIUBAH';
  $('#draw-title').textContent = policy.locked ? 'Lineup final. Let the games begin.' : isComplete() ? 'Roster selesai. Pilih identitas team.' : 'Satu klik. Satu role. Delapan team.';
  $('#draw-description').textContent = policy.locked ? 'Hasil ini terkunci. Tidak ada perubahan roster maupun nama team melalui halaman ini.' : isComplete() ? 'Periksa hasilnya, pilih 8 nama team, lalu Kunci Roster. Kamu masih bisa mengulang undian.' : 'Jungler → Gold Lane → EXP Lane → Mid Lane → Roamer.';
  $('#download').disabled = !canExportDraft(draft, players, logos);
  $('#download').textContent = policy.locked ? 'Download JSON ↓' : 'Kunci Roster 🔒';
  $('#download-help').textContent = policy.locked ? 'Roster final terkunci. JSON dapat diunduh ulang dengan password.' : canExportDraft(draft, players, logos) ? '8 team lengkap. Kunci Roster dengan password untuk memfinalisasi dan langsung mengunduh JSON.' : 'Kunci Roster aktif setelah 5 role selesai dan seluruh 8 nama team dipilih.';
  $('#choose-hint').textContent = isComplete() ? 'Klik Choose Team Name pada masing-masing kartu hasil undian untuk memilih identitas dari logo di bawah.' : 'Pilihan identitas untuk team kamu. Selesaikan undian, lalu klik Choose Team Name pada kartu team.';
  if (policy.locked) $('#choose-hint').textContent = 'Identitas team sudah ditentukan. Temukan logo team kamu dan kenali rekan satu squad.';
  $('#draft-teams').innerHTML = draft.teams.map(team => {
    const logo = logos.find(l => l.name === team.name);
    const roster = team.players.map(id => players.find(p => p.id === id));
    const rows = ROLES.map(role => {
      const player = roster.find(p => p.role === role);
      return `<li><small>${ROLE_LABELS[role]}</small>${player ? `<strong>${escape(player.username)}</strong><span class="player-real-name">${escape(player.playername)}</span>` : '<em>Menunggu undian</em>'}</li>`;
    });
    const extra = roster.filter((p, i) => roster.findIndex(other => other.role === p.role) !== i);
    rows.push(...extra.map(p => `<li class="extra-player"><small>${ROLE_LABELS[p.role]} <span>PLAYER KE-6</span></small><strong>${escape(p.username)}</strong><span class="player-real-name">${escape(p.playername)}</span></li>`));
    return `<article class="draft-card ${reveal ? 'revealed' : ''} ${policy.locked ? 'final-card' : ''}" id="draft-team-${team.id}"><div class="draft-card-head">${logo ? `<img src="${escape(logo.src)}" alt="Logo ${escape(team.name)}">` : `<span class="draft-placeholder">${String(team.id + 1).padStart(2, '0')}</span>`}<div><h3>${escape(teamLabel(team))}</h3><small>${roster.length} PLAYER${extra.length ? ' · DOUBLE ' + ROLE_LABELS[extra[0].role].toUpperCase() : ''}</small></div></div><ul class="draft-roster">${rows.join('')}</ul><button class="secondary-button" data-team="${team.id}" ${policy.canChooseName(team) ? '' : 'disabled'}>${team.name ? policy.canChooseName(team) ? 'Ganti Team Name' : '✓ Identitas terkunci' : 'Choose Team Name'}</button></article>`;
  }).join('');
  renderPlayers();
}

$('#generate').addEventListener('click', () => {
  if (!permissions().canGenerate) return;
  draft = generateRole(draft, players);
  persist();
  render(true);
});
$('#role-filters').addEventListener('click', event => {
  const button = event.target.closest('[data-role]');
  if (!button) return;
  filter = button.dataset.role;
  document.querySelectorAll('[data-role]').forEach(b => b.setAttribute('aria-pressed', String(b === button)));
  renderPlayers();
});
$('#player-search').addEventListener('input', event => { search = event.target.value.trim().toLocaleLowerCase('id'); renderPlayers(); });
$('#draft-teams').addEventListener('click', event => {
  const button = event.target.closest('[data-team]');
  if (!button || !permissions().canChooseName(draft.teams[Number(button.dataset.team)])) return;
  namingTeam = Number(button.dataset.team);
  $('#name-title').textContent = `Choose Team Name · ${String(namingTeam + 1).padStart(2, '0')}`;
  $('#name-options').innerHTML = logos.map((logo, i) => logoTile(logo, i, true)).join('');
  $('#name-dialog').showModal();
});
$('#close-name').addEventListener('click', () => $('#name-dialog').close());
$('#name-options').addEventListener('click', event => {
  const button = event.target.closest('[data-name]');
  if (!button || button.disabled || !permissions().canChooseName(draft.teams[namingTeam])) return;
  draft = chooseName(draft, namingTeam, button.dataset.name, logos.map(l => l.name));
  $('#name-dialog').close();
  persist();
  render();
  if (permissions().locked) $('#final-banner').focus();
  else document.querySelector('[data-team]:not(:disabled)')?.focus();
});
$('#reset').addEventListener('click', () => { if (permissions().canReset) $('#reset-dialog').showModal(); });
$('#cancel-reset').addEventListener('click', () => $('#reset-dialog').close());
$('#confirm-reset').addEventListener('click', () => {
  if (!permissions().canReset) return;
  draft = createDraft();
  persist();
  $('#reset-dialog').close();
  render();
  $('#generate').focus();
});
$('#download').addEventListener('click', () => {
  if (!canExportDraft(draft, players, logos)) return;
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
  if ($('#confirm-download').disabled || !canExportDraft(draft, players, logos)) return;
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
});

try {
  ({ players, logos } = await loadAssets());
  published = await loadPublishedTeams(players, logos);
  try { draft = published.finalized ? publishedToDraft(published) : readDraft(players, logos.map(l => l.name)) || createDraft(); }
  catch (error) { $('#storage-status').hidden = false; $('#storage-status').textContent = `${error.message} Undian baru siap dimulai.`; }
  $('#total-players').textContent = players.length;
  $('#logo-count').textContent = `${logos.length} identitas team`;
  $('#role-filters').innerHTML = ['all', ...ROLES].map(role => `<button type="button" data-role="${role}" aria-pressed="${role === 'all'}">${role === 'all' ? 'Semua' : ROLE_LABELS[role]} <span>${role === 'all' ? players.length : players.filter(p => p.role === role).length}</span></button>`).join('');
  $('#load-status').textContent = '';
  render();
} catch (error) {
  $('#load-status').textContent = error.message;
  $('#generate').textContent = 'Data belum tersedia';
}
