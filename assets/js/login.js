/* login.js */
(() => {
  const fallbackUsers = [
    { username: 'usuario', password: 'pass1234' },
    { username: 'maria', password: 'react2026' }
  ];

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

  function showFieldError(input, errorEl, message = '') {
    if (!input || !errorEl) return false;

    errorEl.textContent = message;
    errorEl.classList.toggle('hidden', !message);

    input.classList.toggle('input-invalid', !!message);
    input.classList.toggle('input-valid', !message && input.value.trim().length > 0);

    return !message;
  }

  onReady(() => {
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
        return;
      }

      setLoginError('');
      sessionStorage.setItem('mc_user', typedUsername);

      const formAction = form.getAttribute('action') || './views/home.html';
      const redirectTo = formAction.replace(/\\/g, '/');

      window.location.href = redirectTo;
    });
  });
})();