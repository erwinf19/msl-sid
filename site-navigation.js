import { pageRoutes, getPageRoute } from './page-routes.js';

export function initSiteNavigation() {
  const nav = document.querySelector('.site-header nav[aria-label="Navigasi utama"]');
  if (!nav || nav.dataset.siteNavigation === 'ready') return;
  const current = getPageRoute(location.pathname)?.path;
  nav.innerHTML = pageRoutes.map(page => `<a href="${page.path}"${page.path === current ? ' class="active" aria-current="page"' : ''}>${page.label}</a>`).join('');
  nav.dataset.siteNavigation = 'ready';
  const revealActive = () => {
    const active = nav.querySelector('[aria-current="page"]');
    if (!active || nav.scrollWidth <= nav.clientWidth) return;
    const bounds = nav.getBoundingClientRect(), tab = active.getBoundingClientRect();
    if (tab.left < bounds.left || tab.right > bounds.right) {
      nav.scrollLeft += tab.left - bounds.left - (bounds.width - tab.width) / 2;
    }
  };
  requestAnimationFrame(revealActive);
  document.fonts.ready.then(revealActive);
  window.addEventListener('resize', revealActive);
}
