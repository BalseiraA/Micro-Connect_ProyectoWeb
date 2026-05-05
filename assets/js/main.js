(() => {
  const App = {
    sanitizeText(value) {
      return String(value)
        .replace(/[&<>'"`]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;', '`': '&#96;' }[c]))
        .trim();
    },
    isValidImage(file) {
      return !!file && ['image/png', 'image/jpeg'].includes(file.type);
    },
    setTheme(theme) {
      const root = document.documentElement;
      const body = document.body;
      const isDark = theme === 'dark';
      root.classList.toggle('dark', isDark);
      body.classList.toggle('dark', isDark);
      root.setAttribute('data-theme', isDark ? 'dark' : 'light');
      body.setAttribute('data-theme', isDark ? 'dark' : 'light');
      localStorage.setItem('mc_theme', isDark ? 'dark' : 'light');
    },
    setFontSize(px) {
      const safe = Math.max(12, Math.min(22, Number(px) || 16));
      document.documentElement.style.setProperty('--app-font-size', `${safe}px`);
      localStorage.setItem('mc_font_size', String(safe));
      return safe;
    },
    bootstrap() {
      this.setTheme(localStorage.getItem('mc_theme') || 'light');
      this.setFontSize(localStorage.getItem('mc_font_size') || 16);
    }
  };

  window.MicroConnectApp = App;
  document.addEventListener('DOMContentLoaded', () => App.bootstrap());
})();
