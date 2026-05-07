/* login.js */
(() => {
  const fallbackUsers = [
    { username: 'usuario', password: 'pass1234' },
    { username: 'maria', password: 'react2026' }
  ];

  const SESSION_USER_KEY = 'mc_user';
  const SESSION_AUTH_KEY = 'mc_auth';
  const SESSION_LOGIN_TIME_KEY = 'mc_login_at';

  function onReady(callback) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', callback);
    } else {
      callback();
    }
  }

  function sanitize(value) {
    return String(value || '')
      .replace(/[&<>'"`]/g, '')
      .trim();
  }

  function normalizePath(path) {
    return String(path || '').replace(/\\/g, '/');
  }

  function isInsideViewsFolder() {
    return normalizePath(window.location.pathname).includes('/views/');
  }

  function getLoginPath() {
    return isInsideViewsFolder() ? '../index.html' : './index.html';
  }

  function getHomePath() {
    return isInsideViewsFolder() ? './home.html' : './views/home.html';
  }

  function isLoginPage() {
    return !!document.getElementById('loginForm');
  }

  function isAuthenticated() {
    return (
      sessionStorage.getItem(SESSION_AUTH_KEY) === 'true' &&
      !!sessionStorage.getItem(SESSION_USER_KEY)
    );
  }

  function startSession(username) {
    sessionStorage.setItem(SESSION_USER_KEY, username);
    sessionStorage.setItem(SESSION_AUTH_KEY, 'true');
    sessionStorage.setItem(SESSION_LOGIN_TIME_KEY, String(Date.now()));
  }

  function clearSession() {
    sessionStorage.removeItem(SESSION_USER_KEY);
    sessionStorage.removeItem(SESSION_AUTH_KEY);
    sessionStorage.removeItem(SESSION_LOGIN_TIME_KEY);
  }

  function protectNavigation() {
    const loginPage = isLoginPage();
    const authenticated = isAuthenticated();

    /*
      Caso 1:
      El usuario ya inició sesión y llegó al login usando Atrás.
      Lo regresamos a home.html sin dejar el login en el historial.
    */
    if (loginPage && authenticated) {
      window.location.replace(getHomePath());
      return false;
    }

    /*
      Caso 2:
      El usuario intenta abrir home.html sin iniciar sesión.
      Lo mandamos al login.
    */
    if (!loginPage && !authenticated) {
      clearSession();
      window.location.replace(getLoginPath());
      return false;
    }

    return true;
  }

  function showFieldError(input, errorEl, message = '') {
    if (!input || !errorEl) return false;

    errorEl.textContent = message;
    errorEl.classList.toggle('hidden', !message);

    input.classList.toggle('input-invalid', !!message);
    input.classList.toggle('input-valid', !message && input.value.trim().length > 0);

    return !message;
  }

  function initLoginForm() {
    document.body.classList.add('theme-light');

    const form = document.getElementById('loginForm');
    if (!form) return;

    if (form.dataset.enhanced === 'true') return;
    form.dataset.enhanced = 'true';

    const username = document.getElementById('username');
    const password = document.getElementById('password');
    const usernameError = document.getElementById('usernameError');
    const passwordError = document.getElementById('passwordError');
    const loginError = document.getElementById('loginError');

    if (!username || !password || !usernameError || !passwordError || !loginError) {
      console.warn('Login: faltan elementos necesarios en el formulario.');
      return;
    }

    function setLoginError(message = '') {
      loginError.textContent = message;
      loginError.classList.toggle('hidden', !message);
    }

    function validateUsername() {
      const value = sanitize(username.value);
      username.value = value;

      if (!value) {
        return showFieldError(username, usernameError, 'El usuario es obligatorio.');
      }

      if (!/^[a-zA-Z0-9_]{3,30}$/.test(value)) {
        return showFieldError(
          username,
          usernameError,
          'Usa 3-30 caracteres alfanuméricos o _.'
        );
      }

      return showFieldError(username, usernameError, '');
    }

    function validatePassword() {
      const value = String(password.value || '').trim();
      password.value = value;

      if (!value) {
        return showFieldError(password, passwordError, 'La contraseña es obligatoria.');
      }

      if (value.length < 6 || value.length > 50) {
        return showFieldError(password, passwordError, 'Debe tener entre 6 y 50 caracteres.');
      }

      return showFieldError(password, passwordError, '');
    }

    function validateForm() {
      const validUsername = validateUsername();
      const validPassword = validatePassword();

      return validUsername && validPassword;
    }

    username.addEventListener('blur', validateUsername);
    password.addEventListener('blur', validatePassword);

    username.addEventListener('input', () => {
      validateUsername();
      setLoginError('');
    });

    password.addEventListener('input', () => {
      validatePassword();
      setLoginError('');
    });

    form.addEventListener('submit', (e) => {
      e.preventDefault();

      const isValid = validateForm();
      if (!isValid) return;

      const typedUsername = sanitize(username.value);
      const typedPassword = String(password.value || '').trim();

      const exists = fallbackUsers.some(
        (user) =>
          user.username === typedUsername &&
          user.password === typedPassword
      );

      if (!exists) {
        setLoginError('Credenciales inválidas.');
        clearSession();
        return;
      }

      setLoginError('');
      startSession(typedUsername);

      const formAction = form.getAttribute('action') || getHomePath();
      const redirectTo = normalizePath(formAction);

      /*
        replace evita que index.html quede como página anterior
        después de iniciar sesión.
      */
      window.location.replace(redirectTo);
    });
  }

  onReady(() => {
    const canContinue = protectNavigation();
    if (!canContinue) return;

    if (isLoginPage()) {
      initLoginForm();
    }
  });

  /*
    Este evento se dispara cuando el navegador restaura una página
    desde caché usando Atrás o Adelante.
  */
  window.addEventListener('pageshow', () => {
    protectNavigation();
  });

  window.MicroConnectAuth = {
    isAuthenticated,
    startSession,
    clearSession
  };
})();