/* main.js */
(() => {
  const USER_STORAGE_KEY = 'mc_users';

  const DEFAULT_USERS = [
    {
      id: 'seed_usuario',
      username: 'usuario',
      displayName: 'Usuario Demo',
      birthDate: '2000-01-01',
      email: 'usuario@microconnect.local',
      password: 'pass1234',
      bio: 'Perfil de prueba de Micro-Connect.',
      avatarDataUrl: '',
      createdAt: new Date().toISOString()
    },
    {
      id: 'seed_maria',
      username: 'maria',
      displayName: 'María',
      birthDate: '2000-01-01',
      email: 'maria@microconnect.local',
      password: 'react2026',
      bio: 'Perfil de prueba de Micro-Connect.',
      avatarDataUrl: '',
      createdAt: new Date().toISOString()
    }
  ];

  function createId() {
    if (window.crypto && typeof window.crypto.randomUUID === 'function') {
      return window.crypto.randomUUID();
    }

    return `user_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  }

  function normalizeUsername(username) {
    return String(username || '').trim().toLowerCase();
  }

  function normalizeUser(rawUser) {
    return {
      id: rawUser.id || createId(),
      username: String(rawUser.username || '').trim(),
      displayName: String(rawUser.displayName || rawUser.username || '').trim(),
      birthDate: rawUser.birthDate || '',
      email: String(rawUser.email || '').trim(),
      password: String(rawUser.password || ''),
      bio: String(rawUser.bio || '').trim(),
      avatarDataUrl: rawUser.avatarDataUrl || '',
      createdAt: rawUser.createdAt || new Date().toISOString()
    };
  }

  function saveUsers(users) {
    const cleanUsers = Array.isArray(users)
      ? users.map(normalizeUser).filter((user) => user.username && user.password)
      : [];

    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(cleanUsers));
    return cleanUsers;
  }

  function getUsers() {
    const raw = localStorage.getItem(USER_STORAGE_KEY);

    if (!raw) {
      return saveUsers(DEFAULT_USERS);
    }

    try {
      const parsed = JSON.parse(raw);

      if (!Array.isArray(parsed)) {
        return saveUsers(DEFAULT_USERS);
      }

      const users = parsed.map(normalizeUser).filter((user) => user.username && user.password);

      if (users.length === 0) {
        return saveUsers(DEFAULT_USERS);
      }

      return users;
    } catch (error) {
      return saveUsers(DEFAULT_USERS);
    }
  }

  function findUserByUsername(username) {
    const normalized = normalizeUsername(username);

    return getUsers().find(
      (user) => normalizeUsername(user.username) === normalized
    ) || null;
  }

  function isUsernameTaken(username) {
    return !!findUserByUsername(username);
  }

  function addUser(userData) {
    const users = getUsers();
    const username = String(userData.username || '').trim();

    if (!username) {
      throw new Error('El usuario es obligatorio.');
    }

    if (isUsernameTaken(username)) {
      throw new Error('Ese usuario ya está registrado. Elige otro.');
    }

    const newUser = normalizeUser({
      ...userData,
      id: userData.id || createId(),
      username
    });

    users.push(newUser);
    saveUsers(users);

    return newUser;
  }

  const App = {
    sanitizeText(value) {
      return String(value)
        .replace(/[&<>'"`]/g, (c) => ({
          '&': '&amp;',
          '<': '&lt;',
          '>': '&gt;',
          "'": '&#39;',
          '"': '&quot;',
          '`': '&#96;'
        }[c]))
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

    userStore: {
      getUsers,
      saveUsers,
      addUser,
      findUserByUsername,
      isUsernameTaken,
      normalizeUsername
    },

    bootstrap() {
      this.setTheme(localStorage.getItem('mc_theme') || 'light');
      this.setFontSize(localStorage.getItem('mc_font_size') || 16);
      this.userStore.getUsers();
    }
  };

  window.MicroConnectApp = App;

  document.addEventListener('DOMContentLoaded', () => App.bootstrap());
})();