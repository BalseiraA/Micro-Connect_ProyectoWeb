/* registroUsuario.js */
(() => {
  const SESSION_AUTH_KEY = 'mc_auth';
  const SESSION_USER_KEY = 'mc_user';
  const REGISTER_DRAFT_KEY = 'mc_register_draft';

  const LOGIN_PAGE = '../index.html';
  const HOME_PAGE = './home.html';

  const MAX_AVATAR_SIZE_BYTES = 2 * 1024 * 1024;

  let avatarDataUrl = '';

  function onReady(callback) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', callback);
    } else {
      callback();
    }
  }

  function sanitizePlain(value) {
    return String(value || '')
      .replace(/[&<>'"`]/g, '')
      .trim();
  }

  function isAuthenticated() {
    return (
      sessionStorage.getItem(SESSION_AUTH_KEY) === 'true' &&
      !!sessionStorage.getItem(SESSION_USER_KEY)
    );
  }

  function setError(input, errorEl, message = '') {
    if (!errorEl) return false;

    errorEl.textContent = message;
    errorEl.classList.toggle('hidden', !message);

    if (input) {
      input.classList.toggle('input-invalid', !!message);
      input.classList.toggle('input-valid', !message && String(input.value || '').trim().length > 0);
    }

    return !message;
  }

  function setFormError(message = '') {
    const formError = document.getElementById('formError');
    if (!formError) return;

    formError.textContent = message;
    formError.classList.toggle('hidden', !message);
  }

  function getUserStore() {
    return window.MicroConnectApp && window.MicroConnectApp.userStore
      ? window.MicroConnectApp.userStore
      : null;
  }

  function measurePasswordStrength(value) {
    let points = 0;

    if (value.length >= 8) points++;
    if (/[A-Z]/.test(value)) points++;
    if (/[0-9]/.test(value)) points++;
    if (/[^A-Za-z0-9]/.test(value)) points++;

    if (value.length === 0) {
      return {
        points: 0,
        level: 'empty',
        width: '0%',
        color: '#dc2626',
        text: 'Fortaleza: esperando contraseña...'
      };
    }

    if (points <= 1) {
      return {
        points,
        level: 'weak',
        width: '25%',
        color: '#dc2626',
        text: 'Fortaleza: Débil'
      };
    }

    if (points === 2 || points === 3) {
      return {
        points,
        level: 'medium',
        width: '60%',
        color: '#f59e0b',
        text: 'Fortaleza: Media'
      };
    }

    return {
      points,
      level: 'strong',
      width: '100%',
      color: '#22c55e',
      text: 'Fortaleza: Fuerte'
    };
  }

  function updatePasswordMeter(passwordInput) {
    const passwordStrength = document.getElementById('passwordStrength');
    const textoPassword = document.getElementById('textoPassword');
    const passwordMeter = passwordStrength ? passwordStrength.parentElement : null;

    if (!passwordStrength || !textoPassword) return measurePasswordStrength('');

    const result = measurePasswordStrength(String(passwordInput.value || '').trim());

    passwordStrength.style.width = result.width;
    passwordStrength.style.backgroundColor = result.color;
    textoPassword.textContent = result.text;

    if (passwordMeter) {
      const numericValue = Number(result.width.replace('%', '')) || 0;
      passwordMeter.setAttribute('aria-valuenow', String(numericValue));
    }

    return result;
  }

  function initPasswordToggle(inputId, buttonId, labelBase = 'contraseña') {
    const input = document.getElementById(inputId);
    const button = document.getElementById(buttonId);

    if (!input || !button) return;

    function updateVisibility(show) {
      input.type = show ? 'text' : 'password';

      button.textContent = show ? 'Ocultar Contraseña' : 'Mostrar Contraseña';
      button.setAttribute('aria-pressed', String(show));
      button.setAttribute('aria-label', show ? `Ocultar ${labelBase}` : `Mostrar ${labelBase}`);
    }

    button.addEventListener('mousedown', (e) => {
      e.preventDefault();
    });

    button.addEventListener('click', () => {
      const shouldShow = input.type === 'password';

      updateVisibility(shouldShow);

      input.focus();

      const cursorPosition = input.value.length;
      input.setSelectionRange(cursorPosition, cursorPosition);
    });
  }

  function setPreview(src) {
    const preview = document.getElementById('photoPreview');
    if (!preview) return;

    if (src) {
      preview.src = src;
    }
  }

  function saveDraft() {
    const draft = {
      username: document.getElementById('regUsername')?.value || '',
      displayName: document.getElementById('displayName')?.value || '',
      birthDate: document.getElementById('birthDate')?.value || '',
      email: document.getElementById('email')?.value || '',
      bio: document.getElementById('bio')?.value || '',
      avatarDataUrl
    };

    sessionStorage.setItem(REGISTER_DRAFT_KEY, JSON.stringify(draft));
  }

  function loadDraft() {
    const raw = sessionStorage.getItem(REGISTER_DRAFT_KEY);
    if (!raw) return;

    try {
      const draft = JSON.parse(raw);

      document.getElementById('regUsername').value = draft.username || '';
      document.getElementById('displayName').value = draft.displayName || '';
      document.getElementById('birthDate').value = draft.birthDate || '';
      document.getElementById('email').value = draft.email || '';
      document.getElementById('bio').value = draft.bio || '';

      avatarDataUrl = draft.avatarDataUrl || '';
      if (avatarDataUrl) setPreview(avatarDataUrl);
    } catch (error) {
      sessionStorage.removeItem(REGISTER_DRAFT_KEY);
    }
  }

  function initRegisterForm() {
    const form = document.getElementById('registerForm');
    if (!form) return;

    const fields = {
      username: document.getElementById('regUsername'),
      displayName: document.getElementById('displayName'),
      birthDate: document.getElementById('birthDate'),
      email: document.getElementById('email'),
      password: document.getElementById('regPassword'),
      confirmPassword: document.getElementById('confirmPassword'),
      bio: document.getElementById('bio'),
      profilePhoto: document.getElementById('profilePhoto')
    };

    const errors = {
      username: document.getElementById('usernameError'),
      displayName: document.getElementById('displayNameError'),
      birthDate: document.getElementById('birthDateError'),
      email: document.getElementById('emailError'),
      password: document.getElementById('passwordError'),
      confirmPassword: document.getElementById('confirmPasswordError'),
      bio: document.getElementById('bioError'),
      photo: document.getElementById('photoError')
    };

    const bioCounter = document.getElementById('bioCounter');

    loadDraft();
    updatePasswordMeter(fields.password);
    updateBioCounter();

    initPasswordToggle('regPassword', 'toggleRegPassword', 'contraseña');
    initPasswordToggle('confirmPassword', 'toggleConfirmPassword', 'confirmación de contraseña');

    function updateBioCounter() {
      if (!bioCounter || !fields.bio) return;
      bioCounter.textContent = `${fields.bio.value.length} / 300`;
    }

    function validateUsername() {
      const value = sanitizePlain(fields.username.value);
      fields.username.value = value;

      const store = getUserStore();

      if (!value) {
        return setError(fields.username, errors.username, 'El usuario es obligatorio.');
      }

      if (value.length > 20) {
        return setError(fields.username, errors.username, 'El usuario no puede tener más de 20 caracteres.');
      }

      if (store && store.isUsernameTaken(value)) {
        return setError(fields.username, errors.username, 'Ese usuario ya está registrado. Elige otro.');
      }

      return setError(fields.username, errors.username, '');
    }

    function validateDisplayName() {
      const value = sanitizePlain(fields.displayName.value);
      fields.displayName.value = value;

      if (!value) {
        return setError(fields.displayName, errors.displayName, 'El nombre o apodo es obligatorio.');
      }

      if (value.length > 50) {
        return setError(fields.displayName, errors.displayName, 'El nombre o apodo no puede tener más de 50 caracteres.');
      }

      return setError(fields.displayName, errors.displayName, '');
    }

    function validateBirthDate() {
      const value = fields.birthDate.value;

      if (!value) {
        return setError(fields.birthDate, errors.birthDate, 'La fecha de nacimiento es obligatoria.');
      }

      const selectedDate = new Date(`${value}T00:00:00`);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (Number.isNaN(selectedDate.getTime())) {
        return setError(fields.birthDate, errors.birthDate, 'La fecha de nacimiento no es válida.');
      }

      if (selectedDate > today) {
        return setError(fields.birthDate, errors.birthDate, 'La fecha de nacimiento no puede ser futura.');
      }

      return setError(fields.birthDate, errors.birthDate, '');
    }

    function validateEmail() {
      const value = sanitizePlain(fields.email.value);
      fields.email.value = value;

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      if (!value) {
        return setError(fields.email, errors.email, 'El correo electrónico es obligatorio.');
      }

      if (value.length > 100) {
        return setError(fields.email, errors.email, 'El correo no puede tener más de 100 caracteres.');
      }

      if (!emailRegex.test(value)) {
        return setError(fields.email, errors.email, 'Escribe un correo electrónico válido.');
      }

      return setError(fields.email, errors.email, '');
    }

    function validatePassword() {
      const value = String(fields.password.value || '').trim();
      fields.password.value = value;

      const strength = updatePasswordMeter(fields.password);

      if (!value) {
        return setError(fields.password, errors.password, 'La contraseña es obligatoria.');
      }

      if (value.length > 255) {
        return setError(fields.password, errors.password, 'La contraseña no puede tener más de 255 caracteres.');
      }

      if (strength.level !== 'medium' && strength.level !== 'strong') {
        return setError(
          fields.password,
          errors.password,
          'La contraseña debe tener fuerza media o fuerte para poder registrarte.'
        );
      }

      return setError(fields.password, errors.password, '');
    }

    function validateConfirmPassword() {
      const passwordValue = String(fields.password.value || '').trim();
      const confirmValue = String(fields.confirmPassword.value || '').trim();

      fields.confirmPassword.value = confirmValue;

      if (!confirmValue) {
        return setError(fields.confirmPassword, errors.confirmPassword, 'Confirma tu contraseña.');
      }

      if (passwordValue !== confirmValue) {
        return setError(fields.confirmPassword, errors.confirmPassword, 'Las contraseñas no coinciden.');
      }

      return setError(fields.confirmPassword, errors.confirmPassword, '');
    }

    function validateBio() {
      const value = String(fields.bio.value || '').trim();

      if (value.length > 300) {
        return setError(fields.bio, errors.bio, 'La biografía no puede tener más de 300 caracteres.');
      }

      return setError(fields.bio, errors.bio, '');
    }

    function validatePhotoFile(file) {
      if (!file) {
        return setError(fields.profilePhoto, errors.photo, '');
      }

      const validTypes = ['image/png', 'image/jpeg'];

      if (!validTypes.includes(file.type)) {
        avatarDataUrl = '';
        setPreview('');
        return setError(fields.profilePhoto, errors.photo, 'La foto debe ser PNG o JPG.');
      }

      if (file.size > MAX_AVATAR_SIZE_BYTES) {
        avatarDataUrl = '';
        setPreview('');
        return setError(fields.profilePhoto, errors.photo, 'La foto no puede pesar más de 2 MB.');
      }

      return setError(fields.profilePhoto, errors.photo, '');
    }

    function validateAll() {
      const validations = [
        validateUsername(),
        validateDisplayName(),
        validateBirthDate(),
        validateEmail(),
        validatePassword(),
        validateConfirmPassword(),
        validateBio(),
        validatePhotoFile(fields.profilePhoto.files[0])
      ];

      return validations.every(Boolean);
    }

    fields.username.addEventListener('input', () => {
      validateUsername();
      saveDraft();
      setFormError('');
    });

    fields.displayName.addEventListener('input', () => {
      validateDisplayName();
      saveDraft();
      setFormError('');
    });

    fields.birthDate.addEventListener('input', () => {
      validateBirthDate();
      saveDraft();
      setFormError('');
    });

    fields.email.addEventListener('input', () => {
      validateEmail();
      saveDraft();
      setFormError('');
    });

    fields.password.addEventListener('input', () => {
      validatePassword();
      validateConfirmPassword();
      setFormError('');
    });

    fields.confirmPassword.addEventListener('input', () => {
      validateConfirmPassword();
      setFormError('');
    });

    fields.bio.addEventListener('input', () => {
      updateBioCounter();
      validateBio();
      saveDraft();
      setFormError('');
    });

    fields.profilePhoto.addEventListener('change', () => {
      const file = fields.profilePhoto.files[0];

      if (!validatePhotoFile(file)) return;

      if (!file) {
        avatarDataUrl = '';
        saveDraft();
        return;
      }

      const reader = new FileReader();

      reader.onload = () => {
        avatarDataUrl = String(reader.result || '');
        setPreview(avatarDataUrl);
        saveDraft();
      };

      reader.readAsDataURL(file);
    });

    form.addEventListener('submit', (e) => {
      e.preventDefault();

      const isValid = validateAll();

      if (!isValid) {
        saveDraft();
        setFormError('Hay datos inválidos. Revisa los campos marcados antes de continuar.');

        const firstInvalid = form.querySelector('.input-invalid');
        if (firstInvalid) firstInvalid.focus();

        return;
      }

      const store = getUserStore();

      if (!store) {
        setFormError('No se pudo acceder al almacenamiento temporal de usuarios.');
        return;
      }

      const newUser = {
        username: sanitizePlain(fields.username.value),
        displayName: sanitizePlain(fields.displayName.value),
        birthDate: fields.birthDate.value,
        email: sanitizePlain(fields.email.value),
        password: String(fields.password.value || '').trim(),
        bio: sanitizePlain(fields.bio.value),
        avatarDataUrl,
        createdAt: new Date().toISOString()
      };

      try {
        store.addUser(newUser);
        sessionStorage.removeItem(REGISTER_DRAFT_KEY);
        window.location.replace(LOGIN_PAGE);
      } catch (error) {
        setFormError(error.message || 'No se pudo registrar el usuario.');
      }
    });

    const backToLogin = document.getElementById('backToLogin');
    if (backToLogin) {
      backToLogin.addEventListener('click', () => {
        window.location.replace(LOGIN_PAGE);
      });
    }
  }

  onReady(() => {
    if (isAuthenticated()) {
      window.location.replace(HOME_PAGE);
      return;
    }

    initRegisterForm();
  });

  window.addEventListener('pageshow', () => {
    if (isAuthenticated()) {
      window.location.replace(HOME_PAGE);
    }
  });
})();