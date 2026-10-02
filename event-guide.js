import { initSectionNavigation } from './section-navigation.js';

const chapters = [...document.querySelectorAll('.guide-chapter')];
const links = [...document.querySelectorAll('.guide-topic-links a')];
const toggle = document.querySelector('#present-toggle');
const previous = document.querySelector('#present-prev');
const next = document.querySelector('#present-next');
const status = document.querySelector('#present-status');
let presenting = false;
let selected = Math.max(0, chapters.findIndex(chapter => `#${chapter.id}` === location.hash));
let frame;
let pending = location.hash ? selected : null;
let settleTimer = setTimeout(() => { pending = null; }, 1600);

function holdSelection(index) {
  selected = index;
  pending = index;
  clearTimeout(settleTimer);
  settleTimer = setTimeout(() => { pending = null; }, 1600);
  render();
}

// Anchor offsets follow the actual header and toolbar sizes at every breakpoint.
const header = document.querySelector('.site-header');
const toolbar = document.querySelector('#guide-toolbar');
function measureNavigation() {
  document.documentElement.style.setProperty('--guide-header-height', `${header.getBoundingClientRect().height}px`);
  document.documentElement.style.setProperty('--guide-toolbar-height', `${toolbar.getBoundingClientRect().height}px`);
}
const navigationSize = new ResizeObserver(measureNavigation);
navigationSize.observe(header);
navigationSize.observe(toolbar);
measureNavigation();

function render() {
  document.body.classList.toggle('is-presenting', presenting);
  toggle.setAttribute('aria-pressed', String(presenting));
  toggle.textContent = presenting ? 'Keluar Presentasi' : 'Mode Presentasi ↗';
  previous.hidden = next.hidden = !presenting;
  previous.disabled = selected === 0;
  next.disabled = selected === chapters.length - 1;
  chapters.forEach((chapter, index) => { chapter.hidden = presenting && index !== selected; });
  links.forEach((link, index) => {
    link.classList.toggle('active', index === selected);
    if (index === selected) link.setAttribute('aria-current', 'location');
    else link.removeAttribute('aria-current');
  });
  status.textContent = presenting ? `Topik ${selected + 1} / ${chapters.length} · ${links[selected].textContent.slice(2).trim()} · Gunakan ← →` : '8 topik · Panduan technical meeting';
}

function select(index, replaceHash = true) {
  selected = Math.max(0, Math.min(chapters.length - 1, index));
  render();
  measureNavigation();
  if (replaceHash) history.replaceState(null, '', `#${chapters[selected].id}`);
  if (presenting) window.scrollTo({top:0, behavior:'instant'});
}

toggle.addEventListener('click', () => {
  presenting = !presenting;
  render();
  measureNavigation();
  if (presenting) select(selected);
  else chapters[selected].scrollIntoView({behavior:'instant', block:'start'});
});
links.forEach((link, index) => link.addEventListener('click', event => {
  if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
  if (presenting) { event.preventDefault(); select(index); }
  else holdSelection(index);
}));
previous.addEventListener('click', () => select(selected - 1));
next.addEventListener('click', () => select(selected + 1));
document.addEventListener('keydown', event => {
  if (!presenting || event.ctrlKey || event.metaKey || event.altKey || event.target.closest('input,textarea,select,[contenteditable="true"]')) return;
  if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
    event.preventDefault(); select(selected + (event.key === 'ArrowRight' ? 1 : -1));
  } else if (event.key === 'Escape') toggle.click();
});
window.addEventListener('hashchange', () => {
  const index = chapters.findIndex(chapter => `#${chapter.id}` === location.hash);
  if (index !== -1) {
    if (presenting) select(index, false);
    else holdSelection(index);
  }
});
window.addEventListener('scroll', () => {
  if (presenting || frame) return;
  if (pending !== null) {
    clearTimeout(settleTimer);
    settleTimer = setTimeout(() => { pending = null; }, 180);
    return;
  }
  frame = requestAnimationFrame(() => {
    frame = null;
    const threshold = header.getBoundingClientRect().height + toolbar.getBoundingClientRect().height + 30;
    let index = 0;
    chapters.forEach((chapter, i) => { if (chapter.getBoundingClientRect().top <= threshold) index = i; });
    if (selected !== index) { selected = index; render(); }
  });
}, {passive:true});
window.addEventListener('wheel', () => { pending = null; }, {passive:true});
window.addEventListener('touchstart', () => { pending = null; }, {passive:true});
render();
initSectionNavigation();
