/* MyProfile.js */
(() => {
  function shared() {
    return window.MicroConnectHomeShared;
  }

  function sanitize(value) {
    return shared()?.sanitize
      ? shared().sanitize(value)
      : String(value || '').replace(/[&<>'"`]/g, '').trim();
  }

  function formatDate(isoDate) {
    return shared()?.formatDate
      ? shared().formatDate(isoDate)
      : (isoDate || 'No especificada');
  }

  function getPosts() {
    return shared()?.getPosts ? shared().getPosts() : [];
  }

  function renderPerfil(user) {
    const myPosts = getPosts().filter(p => p.author === user.username);
    const postCardHTML = shared()?.postCardHTML;

    const avatar = user.avatarDataUrl
      ? `<img src="${user.avatarDataUrl}" class="w-20 h-20 rounded-full object-cover border-4 border-blue-400" />`
      : `<div class="w-20 h-20 rounded-full bg-gradient-to-br from-blue-400 to-violet-500 flex items-center justify-center text-white text-3xl font-bold border-4 border-blue-400">${sanitize(user.displayName || user.username).charAt(0).toUpperCase()}</div>`;

    const postsHTML = myPosts.length === 0
      ? `<p class="text-slate-400 text-center py-6">Aún no tienes publicaciones.</p>`
      : myPosts.map(p => postCardHTML ? postCardHTML(p, user) : '').join('');

    return `
      <div class="max-w-xl mx-auto space-y-6">
        <div class="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
          <div class="flex items-center gap-5">
            ${avatar}

            <div>
              <p class="text-2xl font-bold">${sanitize(user.displayName || user.username)}</p>
              <p class="text-slate-500 dark:text-slate-400">@${sanitize(user.username)}</p>
              <p class="text-sm text-slate-400 mt-1">${myPosts.length} publicación${myPosts.length !== 1 ? 'es' : ''}</p>
            </div>
          </div>

          <div class="divide-y divide-slate-100 dark:divide-slate-800">
            ${profileRow('Nombre', user.displayName || user.username)}
            ${profileRow('Correo', user.email || 'No especificado')}
            ${profileRow('Nacimiento', formatDate(user.birthDate))}
            ${profileRow('Biografía', user.bio || 'Sin biografía')}
          </div>

          <button id="editProfileBtn"
            class="w-full bg-gradient-to-r from-blue-500 to-violet-500 hover:opacity-90 text-white font-semibold py-2 px-6 rounded-xl transition">
                Editar perfil
          </button>
        </div>

        <h3 class="font-bold text-lg">Mis publicaciones</h3>

        <div id="myPostsFeed" class="space-y-4">${postsHTML}</div>
      </div>`;
  }

  function profileRow(label, value) {
    return `
      <div class="px-1 py-3 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4">
        <span class="text-sm font-semibold text-slate-500 dark:text-slate-400 w-36 shrink-0">${label}</span>
        <span class="text-slate-800 dark:text-slate-100 break-all">${sanitize(String(value))}</span>
      </div>`;
  }

  function openEditModal(user) {
    document.getElementById('editProfileModal')?.remove();

    const modal = document.createElement('div');
    modal.id = 'editProfileModal';
    modal.className = 'fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto';

    modal.innerHTML = `
      <div class="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4 relative my-auto">
        <button id="closeEditModal" class="absolute top-4 right-4 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 text-xl">✕</button>

        <h3 class="text-xl font-bold">Editar perfil</h3>

        <div id="editError" class="hidden text-red-500 text-sm bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2"></div>
        <div id="editSuccess" class="hidden text-green-600 text-sm bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg px-3 py-2"></div>

        <div class="flex items-center gap-4">
          <div id="avatarPreview" class="w-16 h-16 rounded-full overflow-hidden bg-gradient-to-br from-blue-400 to-violet-500 flex items-center justify-center text-white text-2xl font-bold shrink-0">
            ${user.avatarDataUrl ? `<img src="${user.avatarDataUrl}" class="w-full h-full object-cover" />` : sanitize(user.displayName || user.username).charAt(0).toUpperCase()}
          </div>

          <div>
            <label class="block text-sm font-semibold mb-1">Foto de perfil</label>
            <input type="file" id="avatarInput" accept="image/png,image/jpeg" class="text-sm text-slate-500 file:mr-2 file:py-1 file:px-3 file:rounded-lg file:border-0 file:bg-blue-50 file:text-blue-600 hover:file:bg-blue-100 cursor-pointer" />
            <p class="text-xs text-slate-400 mt-1">PNG o JPG</p>
          </div>
        </div>

        ${editField('displayName', 'Nombre completo', user.displayName || '', 'text')}
        ${editField('editEmail', 'Correo electrónico', user.email || '', 'email')}
        ${editField('editBirthDate', 'Fecha de nacimiento', user.birthDate || '', 'date')}
        ${editTextarea('editBio', 'Biografía', user.bio || '')}

        <details class="group">
          <summary class="cursor-pointer text-sm font-semibold text-blue-500 hover:underline list-none">🔒 Cambiar contraseña</summary>

          <div class="mt-3 space-y-3">
            <div>
              <label for="editCurrentPass" class="block text-sm font-semibold mb-1">Contraseña actual</label>

              <input id="editCurrentPass" type="password"
                class="w-full border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm" />

              <p id="currentPassFeedback" class="hidden text-xs mt-1"></p>
            </div>

            <div>
              <label for="editNewPass" class="block text-sm font-semibold mb-1">Nueva contraseña</label>

              <input id="editNewPass" type="password"
                class="w-full border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm" />

              <div class="mt-2 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                <div id="newPassStrengthBar" class="h-full w-0 rounded-full transition-all duration-300"></div>
              </div>

              <p id="newPassFeedback" class="hidden text-xs mt-1"></p>
            </div>

            <div>
              <label for="editNewPassConfirm" class="block text-sm font-semibold mb-1">Confirmar nueva contraseña</label>

              <input id="editNewPassConfirm" type="password"
                class="w-full border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm" />

              <p id="confirmPassFeedback" class="hidden text-xs mt-1"></p>
            </div>
          </div>
        </details>

        <div class="flex gap-3 pt-2">
          <button id="saveProfileBtn" class="flex-1 bg-gradient-to-r from-blue-500 to-violet-500 hover:opacity-90 text-white font-semibold py-2 rounded-xl transition">
            Guardar cambios
          </button>

          <button id="cancelEditBtn" class="flex-1 border border-slate-300 dark:border-slate-700 py-2 rounded-xl font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition">
            Cancelar
          </button>
        </div>
      </div>`;

    document.body.appendChild(modal);

    const avatarInput = modal.querySelector('#avatarInput');
    const avatarPreview = modal.querySelector('#avatarPreview');

    avatarInput?.addEventListener('change', () => {
      const file = avatarInput.files[0];
      if (!file) return;

      if (!window.MicroConnectApp.isValidImage(file)) {
        showMsg('Solo PNG o JPG.', 'error');
        avatarInput.value = '';
        return;
      }

      const reader = new FileReader();

      reader.onload = (e) => {
        avatarPreview.innerHTML = `<img src="${e.target.result}" class="w-full h-full object-cover" />`;
      };

      reader.readAsDataURL(file);
    });

    modal.querySelector('#editCurrentPass')?.addEventListener('input', () => {
      validateCurrentPassword();
    });

    modal.querySelector('#editNewPass')?.addEventListener('input', () => {
      validateNewPassword();
      validateConfirmPassword();
    });

    modal.querySelector('#editNewPassConfirm')?.addEventListener('input', () => {
      validateConfirmPassword();
    });

    function showMsg(msg, type) {
      const e = modal.querySelector('#editError');
      const s = modal.querySelector('#editSuccess');

      if (type === 'error') {
        e.textContent = msg;
        e.classList.remove('hidden');
        s.classList.add('hidden');
      } else {
        s.textContent = msg;
        s.classList.remove('hidden');
        e.classList.add('hidden');
      }
    }

    function setInputState(input, feedback, isValid, message) {
      if (!input || !feedback) return;

      input.classList.remove(
        'border-red-400',
        'focus:ring-red-400',
        'border-green-400',
        'focus:ring-green-400'
      );

      feedback.classList.remove(
        'hidden',
        'text-red-500',
        'text-green-600',
        'text-slate-400'
      );

      if (!message) {
        feedback.textContent = '';
        feedback.classList.add('hidden');
        return;
      }

      feedback.textContent = message;

      if (isValid) {
        input.classList.add('border-green-400', 'focus:ring-green-400');
        feedback.classList.add('text-green-600');
      } else {
        input.classList.add('border-red-400', 'focus:ring-red-400');
        feedback.classList.add('text-red-500');
      }
    }

    function validateCurrentPassword() {
      const input = modal.querySelector('#editCurrentPass');
      const feedback = modal.querySelector('#currentPassFeedback');

      if (!input || !feedback) return false;
      const value = input.value;

      if (!value) {
        setInputState(input, feedback, false, '');
        return false;
      }

      setInputState(input, feedback, true, 'Listo para validar en servidor.');
      return true;
    }

    function getPasswordStrength(password) {
      let score = 0;

      if (password.length >= 6) score++;
      if (password.length >= 8) score++;
      if (/[a-z]/.test(password)) score++;
      if (/[A-Z]/.test(password)) score++;
      if (/[0-9]/.test(password)) score++;
      if (/[^A-Za-z0-9]/.test(password)) score++;

      if (!password) {
        return {
          level: 'empty',
          label: '',
          percent: '0%',
          color: 'transparent',
          isValid: false
        };
      }

      if (score <= 2) {
        return {
          level: 'weak',
          label: 'Contraseña débil. Usa mínimo 6 caracteres, mayúsculas, números o símbolos.',
          percent: '33%',
          color: '#ef4444',
          isValid: false
        };
      }

      if (score <= 4) {
        return {
          level: 'medium',
          label: 'Contraseña media.',
          percent: '66%',
          color: '#f59e0b',
          isValid: true
        };
      }

      return {
        level: 'strong',
        label: 'Contraseña fuerte.',
        percent: '100%',
        color: '#22c55e',
        isValid: true
      };
    }

    function validateNewPassword() {
      const input = modal.querySelector('#editNewPass');
      const feedback = modal.querySelector('#newPassFeedback');
      const bar = modal.querySelector('#newPassStrengthBar');

      if (!input || !feedback || !bar) return false;

      const value = input.value;
      const strength = getPasswordStrength(value);

      bar.style.width = strength.percent;
      bar.style.backgroundColor = strength.color;

      if (!value) {
        setInputState(input, feedback, false, '');
        return false;
      }

      setInputState(input, feedback, strength.isValid, strength.label);

      return strength.isValid;
    }

    function validateConfirmPassword() {
      const newPassInput = modal.querySelector('#editNewPass');
      const confirmInput = modal.querySelector('#editNewPassConfirm');
      const feedback = modal.querySelector('#confirmPassFeedback');

      if (!newPassInput || !confirmInput || !feedback) return false;

      const newPass = newPassInput.value;
      const confirmPass = confirmInput.value;

      if (!confirmPass) {
        setInputState(confirmInput, feedback, false, '');
        return false;
      }

      if (!newPass) {
        setInputState(confirmInput, feedback, false, 'Primero escribe una nueva contraseña.');
        return false;
      }

      if (newPass === confirmPass) {
        setInputState(confirmInput, feedback, true, 'Las contraseñas coinciden.');
        return true;
      }

      setInputState(confirmInput, feedback, false, 'Las contraseñas no coinciden.');
      return false;
    }

    function closeModal() {
      modal.remove();
    }

    modal.querySelector('#closeEditModal')?.addEventListener('click', closeModal);
    modal.querySelector('#cancelEditBtn')?.addEventListener('click', closeModal);

    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });

    modal.querySelector('#saveProfileBtn')?.addEventListener('click', () => {
      const newName = sanitize(modal.querySelector('#displayName').value);

      if (!newName) {
        showMsg('El nombre no puede estar vacío.', 'error');
        return;
      }

      // ─── CONEXIÓN BACKEND: Enviamos datos reales a MySQL mediante FormData ───
      const formData = new FormData();
      formData.append('displayName', newName);
      formData.append('email', sanitize(modal.querySelector('#editEmail').value));
      formData.append('birthDate', modal.querySelector('#editBirthDate').value || '');
      formData.append('bio', sanitize(modal.querySelector('#editBio').value));

      // 🔥 CORREGIDO: Extraemos el archivo real de la foto de perfil y lo inyectamos al FormData
      const fileInput = modal.querySelector('#avatarInput');
      if (fileInput && fileInput.files.length > 0) {
        formData.append('profilePhoto', fileInput.files[0]);
      }

      // Leemos directamente el input sin pasarlo por el sanitize() global
      const cp = String(modal.querySelector('#editCurrentPass')?.value || '').trim();
      const np = String(modal.querySelector('#editNewPass')?.value || '').trim();
      const nc = String(modal.querySelector('#editNewPassConfirm')?.value || '').trim();

      // EVALUACIÓN ESTRICTA: Solo entramos a validar si verdaderamente escribiste algo
      if (cp !== "") {
        const isNewPasswordValid = validateNewPassword();
        const isConfirmPasswordValid = validateConfirmPassword();

        if (!isNewPasswordValid) {
          showMsg('La nueva contraseña debe tener fortaleza media o fuerte.', 'error');
          return;
        }
        if (!isConfirmPasswordValid) {
          showMsg('Las contraseñas nuevas no coinciden.', 'error');
          return;
        }

        formData.append('currentPassword', cp);
        formData.append('newPassword', np);
      } else if (np !== "" || nc !== "") {
        showMsg('Escribe tu contraseña actual para autorizar los cambios.', 'error');
        return;
      }

      // Hacemos la llamada asíncrona fetch hacia el archivo procesador editarUsuario.php
      fetch('editarUsuario.php', {
        method: 'POST',
        body: formData
      })
      .then(res => res.json())
      .then(data => {
        if (data.status === 'success') {
          showMsg('¡Perfil actualizado con éxito!', 'success');
          
          setTimeout(() => {
            closeModal();
            // Recargamos la pestaña para que home.php re-consulte a MySQL en vivo
            window.location.reload();
          }, 900);
        } else {
          showMsg(data.message, 'error');
        }
      })
      .catch(err => {
        console.error('Error al sincronizar edición:', err);
        showMsg('Error de red al intentar actualizar el perfil.', 'error');
      });
    });
  }

  function editField(id, label, value, type) {
    return `
      <div>
        <label for="${id}" class="block text-sm font-semibold mb-1">${label}</label>

        <input id="${id}" type="${type}" value="${sanitize(String(value))}"
          class="w-full border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm" />
      </div>`;
  }

  function editTextarea(id, label, value) {
    return `
      <div>
        <label for="${id}" class="block text-sm font-semibold mb-1">${label}</label>

        <textarea id="${id}" rows="3" maxlength="200"
          class="w-full border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm resize-none">${sanitize(String(value))}</textarea>
      </div>`;
  }

  function mount(container, user) {
    if (!container || !user) return;

    container.innerHTML = renderPerfil(user);

    document.getElementById('editProfileBtn')?.addEventListener('click', () => openEditModal(user));

    const bindPostCard = shared()?.bindPostCard;

    if (bindPostCard) {
      document.querySelectorAll('#myPostsFeed .post-card').forEach(card => bindPostCard(card, user));
    }
  }

  window.MicroConnectProfile = {
    mount,
    renderPerfil,
    openEditModal
  };
})();