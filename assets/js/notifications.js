/* notifications.js */
(() => {
  const NOTIF_KEY = 'mc_notifications';

  function getNotifications() {
    try {
      const raw = localStorage.getItem(NOTIF_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  function saveNotifications(notifs) {
    localStorage.setItem(NOTIF_KEY, JSON.stringify(notifs));
  }

  function addNotification({ toUser, fromUser, type, postId, text }) {
    // No notificar acciones propias
    if (toUser === fromUser) return;

    const notifs = getNotifications();

    // Evitar duplicado de like en el mismo post
    if (type === 'like') {
      const already = notifs.find(
        n => n.type === 'like' && n.postId === postId && n.fromUser === fromUser && !n.read
      );
      if (already) return;
    }

    const notif = {
      id: window.crypto?.randomUUID?.() || `notif_${Date.now()}`,
      toUser,
      fromUser,
      type,
      postId: postId || '',
      text: text || '',
      read: false,
      createdAt: new Date().toISOString()
    };

    notifs.unshift(notif);
    saveNotifications(notifs);
    updateBadge();
  }

  function markAllRead(username) {
    const notifs = getNotifications().map(n =>
      n.toUser === username ? { ...n, read: true } : n
    );
    saveNotifications(notifs);
    updateBadge();
  }

  function getUnreadCount(username) {
    return getNotifications().filter(n => n.toUser === username && !n.read).length;
  }

  function updateBadge() {
    const session = sessionStorage.getItem('mc_user');
    if (!session) return;

    const count = getUnreadCount(session);
    const badge = document.getElementById('notifBadge');
    if (!badge) return;

    if (count > 0) {
      badge.textContent = count > 99 ? '99+' : String(count);
      badge.classList.remove('hidden');
    } else {
      badge.classList.add('hidden');
    }
  }

  function timeAgo(isoDate) {
    const diff = Date.now() - new Date(isoDate).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'ahora mismo';
    if (mins < 60) return `hace ${mins} min`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `hace ${hrs} h`;
    return `hace ${Math.floor(hrs / 24)} d`;
  }

  function notifIcon(type) {
    if (type === 'like') return '❤️';
    if (type === 'comment') return '💬';
    if (type === 'reply') return '↩️';
    return '🔔';
  }

  function notifMessage(type, fromUser) {
    const u = `<span class="font-semibold">@${fromUser}</span>`;
    if (type === 'like') return `${u} le dio like a tu publicación`;
    if (type === 'comment') return `${u} comentó en tu publicación`;
    if (type === 'reply') return `${u} respondió a tu comentario`;
    return `${u} interactuó contigo`;
  }

  function avatarHTML(username) {
    const store = window.MicroConnectApp?.userStore;
    const user = store?.findUserByUsername(username);
    const letter = (user?.displayName || username || '?').charAt(0).toUpperCase();

    if (user?.avatarDataUrl) {
      return `<img src="${user.avatarDataUrl}" class="w-10 h-10 rounded-full object-cover shrink-0 border-2 border-slate-200 dark:border-slate-700" />`;
    }

    return `<div class="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-violet-500 flex items-center justify-center text-white font-bold shrink-0">${letter}</div>`;
  }

  function renderNotificaciones(username) {
    const all = getNotifications().filter(n => n.toUser === username);

    markAllRead(username);

    if (all.length === 0) {
      return `
        <div class="max-w-xl mx-auto">
          <p class="text-slate-400 text-center py-10">No tienes notificaciones nuevas.</p>
        </div>`;
    }

    const items = all.map(n => `
      <div class="notif-item flex items-start gap-3 p-4 rounded-2xl border transition
        ${n.read
          ? 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
          : 'bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800'}">
        ${avatarHTML(n.fromUser)}
        <div class="flex-1 min-w-0">
          <p class="text-sm leading-snug">
            ${notifIcon(n.type)} ${notifMessage(n.type, n.fromUser)}
          </p>
          ${n.text ? `<p class="text-xs text-slate-400 mt-1 truncate">"${n.text}"</p>` : ''}
          <p class="text-xs text-slate-400 mt-1">${timeAgo(n.createdAt)}</p>
        </div>
      </div>`).join('');

    return `
      <div class="max-w-xl mx-auto space-y-3">
        <div class="flex items-center justify-between mb-2">
          <p class="text-sm text-slate-400">${all.length} notificación${all.length !== 1 ? 'es' : ''}</p>
          <button id="clearNotifsBtn"
            class="text-xs text-red-400 hover:text-red-600 hover:underline transition">
            Limpiar todo
          </button>
        </div>
        <div class="space-y-2">${items}</div>
      </div>`;
  }

  function bindNotificaciones(username) {
    document.getElementById('clearNotifsBtn')?.addEventListener('click', () => {
      const notifs = getNotifications().filter(n => n.toUser !== username);
      saveNotifications(notifs);
      updateBadge();

      const content = document.getElementById('mainContent');
      if (content) {
        content.innerHTML = renderNotificaciones(username);
        bindNotificaciones(username);
      }
    });
  }

  window.MicroConnectNotifications = {
    addNotification,
    updateBadge,
    renderNotificaciones,
    bindNotificaciones
  };

  document.addEventListener('DOMContentLoaded', () => {
    updateBadge();
  });
})();