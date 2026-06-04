/* login.js */
(() => {
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
    return isInsideViewsFolder() ? '../index.php' : './index.php';
  }

  function getHomePath() {
    return isInsideViewsFolder() ? './home.php' : './views/home.php';
  }

  function getRegisterPath() {
    return isInsideViewsFolder() ? './registroUsuario.php' : './views/registroUsuario.php';
  }

  function isLoginPage() {
    return !!document.getElementById('loginForm');
  }

  function isRegisterPage() {
    return normalizePath(window.location.pathname).endsWith('/registroUsuario.php') ||
      !!document.getElementById('registerForm');
  }

  function getUserStore() {
    return window.MicroConnectApp && window.MicroConnectApp.userStore
      ? window.MicroConnectApp.userStore
      : null;
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
    // MODIFICADO: Delegamos la seguridad y las redirecciones de sesión seguras a PHP 
    // en el backend para evitar bucles infinitos con el almacenamiento local.
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

  function initPasswordToggle(passwordInput) {
    const togglePassword = document.getElementById('togglePassword');
    if (!passwordInput || !togglePassword) return;

    function updatePasswordVisibility(showPassword) {
      passwordInput.type = showPassword ? 'text' : 'password';

      togglePassword.textContent = showPassword ? 'Ocultar Contraseña' : 'Mostrar Contraseña';
      togglePassword.setAttribute('aria-pressed', String(showPassword));
      togglePassword.setAttribute(
        'aria-label',
        showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'
      );
    }

    togglePassword.addEventListener('mousedown', (e) => {
      e.preventDefault();
    });

    togglePassword.addEventListener('click', () => {
      const shouldShowPassword = passwordInput.type === 'password';

      updatePasswordVisibility(shouldShowPassword);

      passwordInput.focus();

      const cursorPosition = passwordInput.value.length;
      passwordInput.setSelectionRange(cursorPosition, cursorPosition);
    });
  }

  function initRegisterButton() {
    const goToRegister = document.getElementById('goToRegister');
    if (!goToRegister) return;

    goToRegister.addEventListener('click', () => {
      window.location.replace(getRegisterPath());
    });
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

    initPasswordToggle(password);
    initRegisterButton();

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

      if (value.length > 20) {
        return showFieldError(username, usernameError, 'El usuario no puede tener más de 20 caracteres.');
      }

      return showFieldError(username, usernameError, '');
    }

    function validatePassword() {
      const value = String(password.value || '').trim();
      password.value = value;

      if (!value) {
        return showFieldError(password, passwordError, 'La contraseña es obligatoria.');
      }

      if (value.length > 255) {
        return showFieldError(password, passwordError, 'La contraseña no puede tener más de 255 caracteres.');
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
      // 1. Detenemos el envío automático temporalmente para validar en el cliente con tu JS
      e.preventDefault();

      const isValid = validateForm();
      if (!isValid) return;

      // 2. Si las validaciones de formato pasan con éxito, limpiamos errores
      setLoginError('');

      // 3. MODIFICADO: Forzamos el envío real del formulario para que viaje al backend dinámico en index.php
      form.submit();
    });
  }

  onReady(() => {
    const canContinue = protectNavigation();
    if (!canContinue) return;

    if (isLoginPage()) {
      initLoginForm();
    }
  });

  window.addEventListener('pageshow', () => {
    protectNavigation();
  });

  window.MicroConnectAuth = {
    isAuthenticated,
    startSession,
    clearSession
  };
})();