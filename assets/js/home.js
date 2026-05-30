/* home.js */
(() => {
  const SESSION_USER_KEY = 'mc_user';
  const POSTS_KEY = 'mc_posts';

  // ─── Utilidades ──────────────────────────────────────────────────────────────

  function getCurrentUser() {
    const username = sessionStorage.getItem(SESSION_USER_KEY);
    if (!username) return null;
    const store = window.MicroConnectApp?.userStore;
    return store ? store.findUserByUsername(username) : null;
  }

  function sanitize(value) {
    return String(value || '').replace(/[&<>'"`]/g, '').trim();
  }

  function formatDate(isoDate) {
    if (!isoDate) return 'No especificada';
    const [y, m, d] = isoDate.split('-');
    return `${d}/${m}/${y}`;
  }

  function timeAgo(isoDate) {
    const diff = Date.now() - new Date(isoDate).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'ahora mismo';
    if (mins < 60) return `hace ${mins} min`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `hace ${hrs} h`;
    const days = Math.floor(hrs / 24);
    return `hace ${days} d`;
  }

  function createId() {
    return window.crypto?.randomUUID?.() || `id_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  }

  // ─── Posts store ─────────────────────────────────────────────────────────────

  function getPosts() {
    try {
      const raw = localStorage.getItem(POSTS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  }

  function savePosts(posts) {
    localStorage.setItem(POSTS_KEY, JSON.stringify(posts));
  }

  function addPost(author, text, mediaDataUrl, mediaType) {
    const posts = getPosts();
    const post = {
      id: createId(),
      author,
      text: sanitize(text),
      mediaDataUrl: mediaDataUrl || '',
      mediaType: mediaType || '',   // 'image' | 'video' | ''
      likes: [],
      comments: [],
      createdAt: new Date().toISOString()
    };
    posts.unshift(post);
    savePosts(posts);
    return post;
  }

  function toggleLike(postId, username) {
    const posts = getPosts();
    const post = posts.find(p => p.id === postId);
    if (!post) return;
    const idx = post.likes.indexOf(username);
    if (idx === -1) post.likes.push(username);
    else post.likes.splice(idx, 1);
    savePosts(posts);
    return post;
  }

  function addComment(postId, author, text) {
    const posts = getPosts();
    const post = posts.find(p => p.id === postId);
    if (!post) return;
    post.comments.push({
      id: createId(),
      author,
      text: sanitize(text),
      createdAt: new Date().toISOString()
    });
    savePosts(posts);
    return post;
  }

  function deletePost(postId, username) {
    const posts = getPosts().filter(p => !(p.id === postId && p.author === username));
    savePosts(posts);
  }

  // ─── Avatar helper ───────────────────────────────────────────────────────────

  function avatarHTML(user, size = 'w-10 h-10 text-base') {
    if (user?.avatarDataUrl) {
      return `<img src="${user.avatarDataUrl}" class="${size} rounded-full object-cover shrink-0 border-2 border-slate-200 dark:border-slate-700" />`;
    }
    const letter = sanitize(user?.displayName || user?.username || '?').charAt(0).toUpperCase();
    return `<div class="${size} rounded-full bg-gradient-to-br from-blue-400 to-violet-500 flex items-center justify-center text-white font-bold shrink-0">${letter}</div>`;
  }

  // ─── Sidebar usuario ─────────────────────────────────────────────────────────

  function renderSidebarUser(user) {
    const tag = document.querySelector('aside .rounded-xl p');
    if (tag && user) tag.textContent = `@${user.username}`;
  }

  // ─── Feed de publicaciones ───────────────────────────────────────────────────

  function postCardHTML(post, currentUser) {
    const store = window.MicroConnectApp?.userStore;
    const author = store?.findUserByUsername(post.author) || { username: post.author };
    const liked = post.likes.includes(currentUser.username);
    const isOwner = post.author === currentUser.username;

    const mediaHTML = post.mediaDataUrl
      ? post.mediaType === 'video'
        ? `<video src="${post.mediaDataUrl}" controls class="w-full rounded-xl max-h-72 mt-3 object-cover bg-black"></video>`
        : `<img src="${post.mediaDataUrl}" class="w-full rounded-xl max-h-72 mt-3 object-cover" />`
      : '';

    const commentsHTML = post.comments.map(c => {
      const cUser = store?.findUserByUsername(c.author) || { username: c.author };
      return `
        <div class="flex gap-2 items-start py-2">
          ${avatarHTML(cUser, 'w-7 h-7 text-xs')}
          <div class="bg-slate-100 dark:bg-slate-800 rounded-xl px-3 py-2 flex-1">
            <span class="font-semibold text-xs">@${sanitize(c.author)}</span>
            <p class="text-sm mt-0.5">${sanitize(c.text)}</p>
          </div>
        </div>`;
    }).join('');

    return `
      <article class="post-card bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-3" data-post-id="${post.id}">
        <!-- Cabecera -->
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            ${avatarHTML(author)}
            <div>
              <p class="font-semibold leading-tight">${sanitize(author.displayName || author.username)}</p>
              <p class="text-xs text-slate-400">@${sanitize(post.author)} · ${timeAgo(post.createdAt)}</p>
            </div>
          </div>
          ${isOwner ? `<button class="delete-post-btn text-slate-300 hover:text-red-400 transition text-lg leading-none" title="Eliminar publicación">🗑</button>` : ''}
        </div>

        <!-- Texto -->
        ${post.text ? `<p class="text-slate-800 dark:text-slate-100 whitespace-pre-line">${sanitize(post.text)}</p>` : ''}

        <!-- Media -->
        ${mediaHTML}

        <!-- Acciones -->
        <div class="flex items-center gap-5 pt-1 border-t border-slate-100 dark:border-slate-800">
          <button class="like-btn flex items-center gap-1.5 text-sm transition ${liked ? 'text-red-500 font-semibold' : 'text-slate-400 hover:text-red-400'}">
            ${liked ? '❤️' : '🤍'} <span class="like-count">${post.likes.length}</span>
          </button>
          <button class="comment-toggle-btn flex items-center gap-1.5 text-sm text-slate-400 hover:text-blue-400 transition">
            💬 <span>${post.comments.length}</span>
          </button>
        </div>

        <!-- Comentarios -->
        <div class="comments-section hidden space-y-1">
          <div class="comments-list space-y-1">${commentsHTML}</div>
          <div class="flex gap-2 items-center mt-2">
            ${avatarHTML(currentUser, 'w-8 h-8 text-sm')}
            <input type="text" placeholder="Escribe un comentario…" maxlength="300"
              class="comment-input flex-1 bg-slate-100 dark:bg-slate-800 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
            <button class="send-comment-btn bg-blue-500 hover:bg-blue-600 text-white rounded-xl px-3 py-2 text-sm transition">↩</button>
          </div>
        </div>
      </article>`;
  }

  function bindPostCard(card, currentUser) {
    const postId = card.dataset.postId;

    // Like
    card.querySelector('.like-btn')?.addEventListener('click', () => {
      const post = toggleLike(postId, currentUser.username);
      if (!post) return;
      const liked = post.likes.includes(currentUser.username);
      const btn = card.querySelector('.like-btn');
      btn.innerHTML = `${liked ? '❤️' : '🤍'} <span class="like-count">${post.likes.length}</span>`;
      btn.className = `like-btn flex items-center gap-1.5 text-sm transition ${liked ? 'text-red-500 font-semibold' : 'text-slate-400 hover:text-red-400'}`;
    });

    // Toggle comentarios
    card.querySelector('.comment-toggle-btn')?.addEventListener('click', () => {
      card.querySelector('.comments-section')?.classList.toggle('hidden');
    });

    // Enviar comentario
    card.querySelector('.send-comment-btn')?.addEventListener('click', () => {
      const input = card.querySelector('.comment-input');
      const text = input?.value.trim();
      if (!text) return;
      addComment(postId, currentUser.username, text);
      const store = window.MicroConnectApp?.userStore;
      const cUser = store?.findUserByUsername(currentUser.username) || currentUser;
      const list = card.querySelector('.comments-list');
      const div = document.createElement('div');
      div.innerHTML = `
        <div class="flex gap-2 items-start py-2">
          ${avatarHTML(cUser, 'w-7 h-7 text-xs')}
          <div class="bg-slate-100 dark:bg-slate-800 rounded-xl px-3 py-2 flex-1">
            <span class="font-semibold text-xs">@${sanitize(currentUser.username)}</span>
            <p class="text-sm mt-0.5">${sanitize(text)}</p>
          </div>
        </div>`;
      list?.appendChild(div.firstElementChild);
      // Actualiza contador
      const countSpan = card.querySelector('.comment-toggle-btn span');
      if (countSpan) countSpan.textContent = parseInt(countSpan.textContent || '0') + 1;
      input.value = '';
    });

    // Enter para comentar
    card.querySelector('.comment-input')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') card.querySelector('.send-comment-btn')?.click();
    });

    // Eliminar
    card.querySelector('.delete-post-btn')?.addEventListener('click', () => {
      if (!confirm('¿Eliminar esta publicación?')) return;
      deletePost(postId, currentUser.username);
      card.remove();
    });
  }

  function renderFeed(container, currentUser) {
    const posts = getPosts();
    if (posts.length === 0) {
      container.innerHTML = `<p class="text-slate-400 text-center py-10">Aún no hay publicaciones. ¡Sé el primero!</p>`;
      return;
    }
    container.innerHTML = posts.map(p => postCardHTML(p, currentUser)).join('');
    container.querySelectorAll('.post-card').forEach(card => bindPostCard(card, currentUser));
  }

  // ─── Contenido: Inicio ───────────────────────────────────────────────────────

  function renderInicio(user) {
    return `
      <div class="max-w-xl mx-auto space-y-5">

        <!-- Crear publicación -->
        <div class="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-3">
          <div class="flex gap-3 items-start">
            ${avatarHTML(user)}
            <textarea id="postText" rows="3" maxlength="500" placeholder="¿Qué está pasando, @${sanitize(user.username)}?"
              class="flex-1 bg-slate-100 dark:bg-slate-800 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-400"></textarea>
          </div>

          <!-- Preview media -->
          <div id="mediaPreviewWrap" class="hidden">
            <div id="mediaPreview" class="relative"></div>
            <button id="removeMediaBtn" class="text-xs text-red-400 hover:underline mt-1">✕ Quitar archivo</button>
          </div>

          <div class="flex items-center justify-between flex-wrap gap-2">
            <div class="flex gap-2">
              <label class="cursor-pointer flex items-center gap-1 text-sm text-slate-400 hover:text-blue-400 transition">
                🖼 Imagen
                <input type="file" id="postImageInput" accept="image/png,image/jpeg,image/gif,image/webp" class="hidden" />
              </label>
              <label class="cursor-pointer flex items-center gap-1 text-sm text-slate-400 hover:text-blue-400 transition ml-4">
                🎬 Video
                <input type="file" id="postVideoInput" accept="video/mp4,video/webm,video/ogg" class="hidden" />
              </label>
            </div>
            <button id="publishBtn"
              class="bg-gradient-to-r from-blue-500 to-violet-500 hover:opacity-90 text-white font-semibold py-2 px-6 rounded-xl text-sm transition">
              Publicar
            </button>
          </div>
          <p id="postError" class="hidden text-red-500 text-xs"></p>
        </div>

        <!-- Feed -->
        <div id="feedContainer" class="space-y-4"></div>
      </div>`;
  }

  function bindInicio(user) {
    const feedContainer = document.getElementById('feedContainer');
    renderFeed(feedContainer, user);

    let pendingMedia = null;   // { dataUrl, type: 'image'|'video' }

    function showMediaPreview(dataUrl, type) {
      pendingMedia = { dataUrl, type };
      const wrap = document.getElementById('mediaPreviewWrap');
      const preview = document.getElementById('mediaPreview');
      wrap.classList.remove('hidden');
      preview.innerHTML = type === 'video'
        ? `<video src="${dataUrl}" controls class="w-full rounded-xl max-h-48 bg-black"></video>`
        : `<img src="${dataUrl}" class="w-full rounded-xl max-h-48 object-cover" />`;
    }

    function clearMedia() {
      pendingMedia = null;
      document.getElementById('mediaPreviewWrap')?.classList.add('hidden');
      document.getElementById('postImageInput').value = '';
      document.getElementById('postVideoInput').value = '';
    }

    document.getElementById('removeMediaBtn')?.addEventListener('click', clearMedia);

    function handleFileInput(input, type) {
      input?.addEventListener('change', () => {
        const file = input.files[0];
        if (!file) return;
        if (file.size > 20 * 1024 * 1024) {
          alert('El archivo supera los 20 MB.'); input.value = ''; return;
        }
        const reader = new FileReader();
        reader.onload = (e) => showMediaPreview(e.target.result, type);
        reader.readAsDataURL(file);
      });
    }

    handleFileInput(document.getElementById('postImageInput'), 'image');
    handleFileInput(document.getElementById('postVideoInput'), 'video');

    document.getElementById('publishBtn')?.addEventListener('click', () => {
      const text = document.getElementById('postText')?.value.trim();
      const errEl = document.getElementById('postError');

      if (!text && !pendingMedia) {
        errEl.textContent = 'Escribe algo o adjunta una imagen/video.';
        errEl.classList.remove('hidden');
        return;
      }
      errEl.classList.add('hidden');

      addPost(user.username, text, pendingMedia?.dataUrl || '', pendingMedia?.type || '');

      document.getElementById('postText').value = '';
      clearMedia();

      // Insertar nueva publicación al tope del feed
      const posts = getPosts();
      if (posts.length > 0) {
        const div = document.createElement('div');
        div.innerHTML = postCardHTML(posts[0], user);
        const card = div.firstElementChild;
        feedContainer.prepend(card);
        bindPostCard(card, user);
        // Quitar mensaje de vacío si existía
        feedContainer.querySelector('p.text-slate-400')?.remove();
      }
    });
  }

  // ─── Contenido: Notificaciones ───────────────────────────────────────────────

  function renderNotificaciones() {
    return `
      <div class="max-w-xl mx-auto">
        <p class="text-slate-400 text-center py-10">No tienes notificaciones nuevas.</p>
      </div>`;
  }

  // ─── Contenido: Mi Perfil ────────────────────────────────────────────────────

  function renderPerfil(user) {
    const myPosts = getPosts().filter(p => p.author === user.username);
    const avatar = user.avatarDataUrl
      ? `<img src="${user.avatarDataUrl}" class="w-20 h-20 rounded-full object-cover border-4 border-blue-400" />`
      : `<div class="w-20 h-20 rounded-full bg-gradient-to-br from-blue-400 to-violet-500 flex items-center justify-center text-white text-3xl font-bold border-4 border-blue-400">${sanitize(user.displayName || user.username).charAt(0).toUpperCase()}</div>`;

    const postsHTML = myPosts.length === 0
      ? `<p class="text-slate-400 text-center py-6">Aún no tienes publicaciones.</p>`
      : myPosts.map(p => postCardHTML(p, user)).join('');

    return `
      <div class="max-w-xl mx-auto space-y-6">
        <!-- Info -->
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
            ✏️ Editar perfil
          </button>
        </div>

        <!-- Mis publicaciones -->
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

  // ─── Contenido: Configuración ────────────────────────────────────────────────

  function renderConfiguracion() {
    const theme = localStorage.getItem('mc_theme') || 'light';
    const fontSize = localStorage.getItem('mc_font_size') || '16';
    return `
      <div class="max-w-md space-y-6">
        <div>
          <label class="block font-semibold mb-2">Tema</label>
          <select id="themeSelect" class="w-full border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-900">
            <option value="light" ${theme === 'light' ? 'selected' : ''}>Claro</option>
            <option value="dark" ${theme === 'dark' ? 'selected' : ''}>Oscuro</option>
          </select>
        </div>
        <div>
          <label class="block font-semibold mb-2">Tamaño de letra: <span id="fontSizeLabel">${fontSize}px</span></label>
          <input type="range" id="fontSizeRange" min="12" max="22" value="${fontSize}" class="w-full accent-blue-500" />
        </div>
        <div>
          <button id="logoutBtn" class="w-full bg-red-500 hover:bg-red-600 text-white font-semibold py-2 px-4 rounded-xl transition">
            Cerrar sesión
          </button>
        </div>
      </div>`;
  }

  function bindConfiguracion() {
    document.getElementById('themeSelect')?.addEventListener('change', (e) => {
      window.MicroConnectApp.setTheme(e.target.value);
    });
    const range = document.getElementById('fontSizeRange');
    const label = document.getElementById('fontSizeLabel');
    range?.addEventListener('input', () => {
      const size = window.MicroConnectApp.setFontSize(range.value);
      if (label) label.textContent = `${size}px`;
    });
    document.getElementById('logoutBtn')?.addEventListener('click', () => {
      window.MicroConnectAuth.clearSession();
      window.location.replace('../index.html');
    });
  }

  // ─── Modal: Editar Perfil ────────────────────────────────────────────────────

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
            ${editField('editCurrentPass', 'Contraseña actual', '', 'password')}
            ${editField('editNewPass', 'Nueva contraseña', '', 'password')}
            ${editField('editNewPassConfirm', 'Confirmar nueva contraseña', '', 'password')}
          </div>
        </details>

        <div class="flex gap-3 pt-2">
          <button id="saveProfileBtn" class="flex-1 bg-gradient-to-r from-blue-500 to-violet-500 hover:opacity-90 text-white font-semibold py-2 rounded-xl transition">Guardar cambios</button>
          <button id="cancelEditBtn" class="flex-1 border border-slate-300 dark:border-slate-700 py-2 rounded-xl font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition">Cancelar</button>
        </div>
      </div>`;

    document.body.appendChild(modal);

    const avatarInput = modal.querySelector('#avatarInput');
    const avatarPreview = modal.querySelector('#avatarPreview');

    avatarInput?.addEventListener('change', () => {
      const file = avatarInput.files[0];
      if (!file) return;
      if (!window.MicroConnectApp.isValidImage(file)) {
        showMsg('Solo PNG o JPG.', 'error'); avatarInput.value = ''; return;
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        avatarPreview.innerHTML = `<img src="${e.target.result}" class="w-full h-full object-cover" />`;
      };
      reader.readAsDataURL(file);
    });

    function showMsg(msg, type) {
      const e = modal.querySelector('#editError');
      const s = modal.querySelector('#editSuccess');
      if (type === 'error') { e.textContent = msg; e.classList.remove('hidden'); s.classList.add('hidden'); }
      else { s.textContent = msg; s.classList.remove('hidden'); e.classList.add('hidden'); }
    }

    function closeModal() { modal.remove(); }
    modal.querySelector('#closeEditModal')?.addEventListener('click', closeModal);
    modal.querySelector('#cancelEditBtn')?.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });

    modal.querySelector('#saveProfileBtn')?.addEventListener('click', () => {
      const store = window.MicroConnectApp.userStore;
      const users = store.getUsers();
      const idx = users.findIndex(u => u.username === user.username);
      if (idx === -1) { showMsg('No se encontró el usuario.', 'error'); return; }

      const updated = { ...users[idx] };
      const newName = sanitize(modal.querySelector('#displayName').value);
      if (!newName) { showMsg('El nombre no puede estar vacío.', 'error'); return; }
      updated.displayName = newName;
      updated.email = sanitize(modal.querySelector('#editEmail').value);
      updated.birthDate = modal.querySelector('#editBirthDate').value || '';
      updated.bio = sanitize(modal.querySelector('#editBio').value);

      const cp = modal.querySelector('#editCurrentPass').value;
      const np = modal.querySelector('#editNewPass').value;
      const nc = modal.querySelector('#editNewPassConfirm').value;
      if (cp || np || nc) {
        if (cp !== users[idx].password) { showMsg('La contraseña actual no es correcta.', 'error'); return; }
        if (np.length < 6) { showMsg('La nueva contraseña debe tener al menos 6 caracteres.', 'error'); return; }
        if (np !== nc) { showMsg('Las contraseñas nuevas no coinciden.', 'error'); return; }
        updated.password = np;
      }

      const avatarImg = avatarPreview.querySelector('img');
      if (avatarImg?.src?.startsWith('data:')) updated.avatarDataUrl = avatarImg.src;

      users[idx] = updated;
      store.saveUsers(users);
      showMsg('¡Perfil actualizado!', 'success');

      setTimeout(() => {
        closeModal();
        const fresh = store.findUserByUsername(updated.username);
        renderSidebarUser(fresh);
        renderTab('perfil');
      }, 900);
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

  // ─── Navegación tabs ─────────────────────────────────────────────────────────

  function renderTab(tabName) {
    const user = getCurrentUser();
    const content = document.getElementById('mainContent');
    const title = document.getElementById('screenTitle');
    if (!content || !title) return;

    const titles = { inicio: 'Inicio', notificaciones: 'Notificaciones', perfil: 'Mi Perfil', configuracion: 'Configuración' };
    title.textContent = titles[tabName] || tabName;

    switch (tabName) {
      case 'inicio':
        content.innerHTML = user ? renderInicio(user) : '';
        if (user) bindInicio(user);
        break;
      case 'notificaciones':
        content.innerHTML = renderNotificaciones();
        break;
      case 'perfil':
        content.innerHTML = user ? renderPerfil(user) : '<p>No se pudo cargar el perfil.</p>';
        if (user) {
          document.getElementById('editProfileBtn')?.addEventListener('click', () => openEditModal(user));
          document.querySelectorAll('#myPostsFeed .post-card').forEach(card => bindPostCard(card, user));
        }
        break;
      case 'configuracion':
        content.innerHTML = renderConfiguracion();
        bindConfiguracion();
        break;
    }
  }

  // ─── Init ────────────────────────────────────────────────────────────────────

  function init() {
    const user = getCurrentUser();
    if (!user) return;

    renderSidebarUser(user);

    const tabs = document.querySelectorAll('.tab-btn');
    tabs.forEach(btn => {
      btn.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active-tab'));
        btn.classList.add('active-tab');
        renderTab(btn.dataset.tab);
      });
    });

    renderTab('inicio');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();