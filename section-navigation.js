import { initSiteNavigation } from './site-navigation.js';

// One moving indicator per navigation bar; keep the clicked tab selected
// while smooth scrolling passes through other sections on the way there.
export function initSectionNavigation() {
  initSiteNavigation();
  document.querySelectorAll('nav').forEach(nav => {
    if (nav.classList.contains('nav-motion')) return;
    const links = [...nav.querySelectorAll('a')];
    if (!links.length) return;
    const sectionLinks = links.filter(link => link.pathname === location.pathname && link.hash && document.getElementById(link.hash.slice(1)));
    const sections = sectionLinks.map(link => document.getElementById(link.hash.slice(1)));
    const indicator = document.createElement('span');
    indicator.className = 'nav-indicator';
    indicator.setAttribute('aria-hidden', 'true');
    nav.classList.add('nav-motion');
    nav.append(indicator);
    const initialActive = links.find(link => link.classList.contains('active'));
    let active = initialActive;
    let pending = null, settleTimer, safetyTimer, scheduled = false;

    function positionIndicator() {
      if (!active) { indicator.style.opacity = '0'; return; }
      const bounds = nav.getBoundingClientRect(), tab = active.getBoundingClientRect();
      const sidebar = nav.closest('.week-index');
      const x = tab.left - bounds.left + nav.scrollLeft;
      const y = sidebar ? tab.top - bounds.top + nav.scrollTop : tab.bottom - bounds.top + parseFloat(getComputedStyle(nav).getPropertyValue('--nav-indicator-offset'));
      indicator.style.width = `${tab.width}px`;
      indicator.style.height = `${sidebar ? tab.height : 3}px`;
      indicator.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      indicator.style.opacity = '1';
    }
    function activate(link) {
      if (active === link && link?.hasAttribute('aria-current')) { positionIndicator(); return; }
      active = link;
      links.forEach(item => {
        const selected = item === link;
        item.classList.toggle('active', selected);
        if (selected) item.setAttribute('aria-current', sectionLinks.includes(item) ? 'location' : 'page');
        else item.removeAttribute('aria-current');
      });
      positionIndicator();
    }
    function update() {
      if (pending || !sections.length) { positionIndicator(); return; }
      const threshold = (document.querySelector('.site-header')?.getBoundingClientRect().height || 0) + 50;
      let current = sections[0];
      for (const section of sections) if (section.getBoundingClientRect().top <= threshold) current = section;
      if (window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2) current = sections.at(-1);
      activate(sectionLinks[sections.indexOf(current)]);
    }
    function finishScroll() {
      if (!pending) return;
      pending = null;
      clearTimeout(settleTimer);
      clearTimeout(safetyTimer);
      update();
    }
    function navigateTo(link) {
      if (sectionLinks.includes(link)) {
        pending = link;
        clearTimeout(settleTimer);
        clearTimeout(safetyTimer);
        settleTimer = setTimeout(finishScroll, 180);
        safetyTimer = setTimeout(finishScroll, 1800);
      }
      activate(link);
    }
    links.forEach(link => link.addEventListener('click', event => {
      if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      navigateTo(link);
    }));
    window.addEventListener('hashchange', () => {
      const target = sectionLinks.find(link => link.hash === location.hash);
      if (target) navigateTo(target);
    });
    window.addEventListener('scroll', () => {
      if (pending) {
        clearTimeout(settleTimer);
        settleTimer = setTimeout(finishScroll, 180);
      }
      if (scheduled) return;
      scheduled = true;
      requestAnimationFrame(() => { scheduled = false; update(); });
    }, { passive: true });
    // Manual scrolling takes control immediately, even during an anchor animation.
    window.addEventListener('wheel', finishScroll, { passive: true });
    window.addEventListener('touchstart', finishScroll, { passive: true });
    window.addEventListener('keydown', event => {
      if (['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '].includes(event.key) && !event.target.matches('input,textarea,select,[contenteditable="true"]')) finishScroll();
    });
    window.addEventListener('resize', update);
    window.addEventListener('pageshow', () => {
      if (!sections.length && initialActive) activate(initialActive);
      else update();
    });
    new ResizeObserver(positionIndicator).observe(nav);
    document.fonts.ready.then(positionIndicator);
    update();
    requestAnimationFrame(() => nav.classList.add('nav-ready'));
  });
}
