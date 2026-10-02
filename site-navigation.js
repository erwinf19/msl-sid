import { pageRoutes, getPageRoute } from './page-routes.js';

export function initSiteNavigation() {
  const nav = document.querySelector('.site-header nav[aria-label="Navigasi utama"]');
  if (!nav || nav.dataset.siteNavigation === 'ready') return;
  const current = getPageRoute(location.pathname)?.path;
  nav.innerHTML = pageRoutes.map(page => `<a href="${page.path}"${page.path === current ? ' class="active" aria-current="page"' : ''}>${page.label}</a>`).join('');
  nav.dataset.siteNavigation = 'ready';
}
