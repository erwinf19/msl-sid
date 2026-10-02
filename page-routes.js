// Shared by the local server and the primary navigation.
export const pageRoutes = [
  { path: '/', file: '/index.html', label: 'Beranda', aliases: ['/index'] },
  { path: '/full-schedule', file: '/schedule.html', label: 'Jadwal Lengkap', aliases: ['/schedule', '/jadwal-lengkap'] },
  { path: '/player-data', file: '/choose-team.html', label: 'Player Data', aliases: ['/choose-team'] },
  { path: '/event-guide', file: '/event-guide.html', label: 'Event Guide', aliases: [] }
];

export function getPageRoute(pathname) {
  const path = pathname.replace(/\/+$/, '') || '/';
  return pageRoutes.find(page => page.path === path || page.file === path || page.aliases.includes(path));
}
