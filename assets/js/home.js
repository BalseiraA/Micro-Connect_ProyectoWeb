(() => {
  const user = sessionStorage.getItem('mc_user') || 'usuario';
  const main = document.getElementById('mainContent');
  const title = document.getElementById('screenTitle');

  let posts = [
    { id: 1, author: 'María García', handle: '@mariagarcia', text: '¡Acabo de terminar mi primer proyecto en React! 🎉', createdAt: new Date('2026-05-04T10:00:00Z').toISOString(), image: '' },
    { id: 2, author: 'Carlos Ruiz', handle: '@carlosruiz', text: 'Día productivo con Tailwind y JavaScript.', createdAt: new Date('2026-05-04T09:00:00Z').toISOString(), image: '' }
  ];

  function sortPosts() { posts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)); }

  function renderInicio() {
    sortPosts();
    main.innerHTML = `
      <section class="composer border rounded-xl p-4 bg-white panel dark:bg-slate-950">
        <form id="composerForm" class="space-y-3" novalidate>
          <textarea id="postText" maxlength="280" placeholder="¿Qué está pasando?" class="w-full min-h-24 rounded-lg border p-3 bg-transparent"></textarea>
          <div class="flex flex-wrap gap-3 items-center justify-between">
            <input id="postImage" type="file" accept="image/png,image/jpeg" class="text-sm" />
            <button class="bg-blue-600 text-white px-5 py-2 rounded-full" type="submit">Publicar</button>
          </div>
          <p id="composerError" class="text-sm text-red-600 hidden"></p>
        </form>
      </section>
      <section class="mt-4 space-y-4" id="postsList"></section>
    `;

    const list = document.getElementById('postsList');
    list.innerHTML = posts.map(p => `
      <article class="post-card border rounded-xl p-4 bg-white dark:bg-slate-950">
        <p class="font-semibold">${MicroConnectApp.sanitizeText(p.author)} <span class="font-normal text-slate-500">${p.handle} · ${new Date(p.createdAt).toLocaleString()}</span></p>
        <p class="mt-2 whitespace-pre-wrap">${MicroConnectApp.sanitizeText(p.text)}</p>
        ${p.image ? `<img src="${p.image}" alt="Imagen adjunta" class="mt-3 rounded-xl max-h-96 w-full object-cover" />` : ''}
      </article>`).join('');

    document.getElementById('composerForm').addEventListener('submit', (e) => {
      e.preventDefault();
      const text = MicroConnectApp.sanitizeText(document.getElementById('postText').value);
      const file = document.getElementById('postImage').files[0];
      const err = document.getElementById('composerError');
      if (!text || text.length > 280) {
        err.textContent = 'Escribe un texto válido (1-280 caracteres).'; err.classList.remove('hidden'); return;
      }
      if (file && !MicroConnectApp.isValidImage(file)) {
        err.textContent = 'Solo se permiten imágenes PNG o JPG.'; err.classList.remove('hidden'); return;
      }
      err.classList.add('hidden');

      const pushPost = (image = '') => {
        posts.push({ id: Date.now(), author: user, handle: `@${user}`, text, createdAt: new Date().toISOString(), image });
        renderInicio();
      };

      if (!file) return pushPost();
      const reader = new FileReader();
      reader.onload = () => pushPost(reader.result);
      reader.readAsDataURL(file);
    });
  }

  function renderConfig() {
    const current = localStorage.getItem('mc_theme') || 'light';
    const size = Number(localStorage.getItem('mc_font_size') || 16);
    main.innerHTML = `
      <section class="panel border rounded-xl p-6 bg-white dark:bg-slate-950 space-y-6">
        <h3 class="text-2xl font-bold">Tamaño de fuente</h3>
        <input id="fontRange" type="range" min="12" max="22" value="${size}" class="w-full" />
        <p id="fontLabel">Texto de ejemplo: ${size}px</p>
      </section>
      <section class="panel border rounded-xl p-6 bg-white dark:bg-slate-950 mt-4">
        <h3 class="text-2xl font-bold mb-4">Tema</h3>
        <div class="flex gap-3">
          <button data-theme="light" class="theme-btn border rounded-lg px-4 py-2 ${current === 'light' ? 'border-blue-600' : ''}">Claro</button>
          <button data-theme="dark" class="theme-btn border rounded-lg px-4 py-2 ${current === 'dark' ? 'border-blue-600' : ''}">Oscuro</button>
        </div>
      </section>
    `;

    document.getElementById('fontRange').addEventListener('input', (e) => {
      const val = MicroConnectApp.setFontSize(e.target.value);
      document.getElementById('fontLabel').textContent = `Texto de ejemplo: ${val}px`;
    });

    document.querySelectorAll('.theme-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        MicroConnectApp.setTheme(btn.dataset.theme);
        renderConfig();
      });
    });
  }

  function renderSimple(msg) { main.innerHTML = `<section class="panel border rounded-xl p-6 bg-white dark:bg-slate-950">${msg}</section>`; }

  function activate(tab) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active-tab', b.dataset.tab === tab));
    title.textContent = tab[0].toUpperCase() + tab.slice(1);
    if (tab === 'inicio') return renderInicio();
    if (tab === 'configuracion') return renderConfig();
    if (tab === 'perfil') return renderSimple('Sección de perfil en construcción.');
    renderSimple('No hay notificaciones nuevas.');
  }

  document.getElementById('menuTabs').addEventListener('click', (e) => {
    const btn = e.target.closest('.tab-btn');
    if (!btn) return;
    activate(btn.dataset.tab);
  });

  activate('inicio');
})();
