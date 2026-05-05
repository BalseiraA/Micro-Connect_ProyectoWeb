(() => {
  const users = [
    { username: 'usuario', password: 'pass1234' },
    { username: 'maria', password: 'react2026' }
  ];

  const form = document.getElementById('loginForm');
  if (!form) return;
  if (form.dataset.enhanced === 'true') return;

  const fields = {
    username: document.getElementById('username'),
    password: document.getElementById('password')
  };

  function setError(id, msg = '') {
    const p = document.getElementById(id);
    if (!p) return;
    p.textContent = msg;
    p.classList.toggle('hidden', !msg);
  }

  function validate() {
    const username = MicroConnectApp.sanitizeText(fields.username.value);
    const password = String(fields.password.value).trim();

    let ok = true;
    if (!/^[a-zA-Z0-9_]{3,30}$/.test(username)) {
      setError('usernameError', 'Usuario inválido. Usa 3-30 caracteres alfanuméricos o guion bajo.');
      ok = false;
    } else setError('usernameError');

    if (password.length < 6 || password.length > 50) {
      setError('passwordError', 'Contraseña inválida. Debe tener entre 6 y 50 caracteres.');
      ok = false;
    } else setError('passwordError');

    return { ok, username, password };
  }

  form.addEventListener('input', validate);
  form.dataset.enhanced = 'true';

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const { ok, username, password } = validate();
    if (!ok) return;
    const exists = users.some(u => u.username === username && u.password === password);
    if (!exists) {
      setError('loginError', 'Credenciales inválidas.');
      return;
    }
    sessionStorage.setItem('mc_user', username);
    window.location.href = 'home.html';
  });
})();
