(() => {
  const storageKey = 'msl-theme';
  const systemTheme = window.matchMedia('(prefers-color-scheme: dark)');
  let preference = null;

  try {
    const saved = localStorage.getItem(storageKey);
    if (saved === 'light' || saved === 'dark') preference = saved;
  } catch {
    // The switch still works when browser storage is unavailable.
  }

  function applyTheme() {
    const dark = preference ? preference === 'dark' : systemTheme.matches;
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
    document.querySelector('meta[name="theme-color"]').content = dark ? '#0d182b' : '#10254c';
    const toggle = document.querySelector('.theme-toggle');
    if (toggle) {
      toggle.setAttribute('aria-checked', String(dark));
      toggle.title = dark ? 'Aktifkan mode terang' : 'Aktifkan mode gelap';
    }
  }

  // Apply before the stylesheet loads to avoid flashing the wrong theme.
  applyTheme();
  systemTheme.addEventListener('change', applyTheme);
  document.addEventListener('DOMContentLoaded', () => {
    applyTheme();
    document.querySelector('.theme-toggle').addEventListener('click', () => {
      preference = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
      try {
        localStorage.setItem(storageKey, preference);
      } catch {
        // Keep the selected theme for this page even without persistence.
      }
      applyTheme();
    });
  });
})();
