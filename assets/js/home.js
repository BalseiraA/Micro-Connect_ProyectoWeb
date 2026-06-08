/* home.js */
(() => {
  const SESSION_USER_KEY = 'mc_user';
  const POSTS_KEY = 'mc_posts';

  // ─── Utilidades compartidas ────────────────────────────────────────────────

  function getCurrentUser() {
    const username = sessionStorage.getItem(SESSION_USER_KEY);
    if (!username) return null;
    const store = window.MicroConnectApp?.userStore;
    return store ? store.findUserByUsername(username) : null;
  }

  function sanitize(value) {
    return String(value || '').replace(/[&<>'"`]/g, '').trim();
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

  // ─── Posts store ───────────────────────────────────────────────────────────

  function getPosts() {
    try {
      const raw = localStorage.getItem(POSTS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  function savePosts(posts) {
    localStorage.setItem(POSTS_KEY, JSON.stringify(posts));
  }

  function addPost(author, text, mediaDataUrl, mediaType) {
    const posts = getPosts();
    const provisionalId = createId(); 

    const post = {
      id: provisionalId, 
      author,
      text: sanitize(text),
      mediaDataUrl: mediaDataUrl || '',
      mediaType: mediaType || '',
      likes: [],
      comments: [],
      createdAt: new Date().toISOString()
    };

    posts.unshift(post);
    savePosts(posts);

    const formData = new FormData();
    formData.append('text', text);

    const imageInput = document.getElementById('postImageInput');
    const videoInput = document.getElementById('postVideoInput');
    
    if (imageInput && imageInput.files.length > 0) {
        formData.append('postMedia', imageInput.files[0]);
    } else if (videoInput && videoInput.files.length > 0) {
        formData.append('postMedia', videoInput.files[0]);
    }

    fetch('guardarPost.php', {
      method: 'POST',
      body: formData
    })
    .then(res => res.text())
    .then(idReal => {
      if (idReal !== "error") {
        const idNumerico = parseInt(idReal, 10);
        post.id = idNumerico;
        
        const postsActualizados = getPosts();
        const postEncontrado = postsActualizados.find(p => p.createdAt === post.createdAt);
        if (postEncontrado) {
          postEncontrado.id = idNumerico;
          savePosts(postsActualizados);
        }
        
        const tarjetaPost = document.querySelector(`[data-post-id="${provisionalId}"]`);
        if (tarjetaPost) {
          tarjetaPost.dataset.postId = idNumerico;
        }
      }
    })
    .catch(err => console.error('Error al sincronizar publicación con PHP:', err));

    return post;
  }

  function toggleLike(postId, username) {
    const posts = getPosts();
    const post = posts.find(p => String(p.id) === String(postId));
    if (!post) return;

    const idx = post.likes.indexOf(username);
    if (idx === -1) post.likes.push(username);
    else post.likes.splice(idx, 1);

    savePosts(posts);

    const formData = new FormData();
    formData.append('type', 'post');
    formData.append('postId', postId);

    fetch('guardarLike.php', { method: 'POST', body: formData })
    .catch(err => console.error('Error de red al registrar Like:', err));

    return post;
  }

  function toggleCommentLike(postId, commentId, username) {
    const posts = getPosts();
    const post = posts.find(p => String(p.id) === String(postId));
    if (!post) return null;

    let targetComment = null;
    
    for (const c of post.comments) {
        if (String(c.id) === String(commentId)) {
            targetComment = c; break;
        }
        if (c.replies) {
            const r = c.replies.find(rep => String(rep.id) === String(commentId));
            if (r) { targetComment = r; break; }
        }
    }

    if (!targetComment) return null;

    targetComment.likes = targetComment.likes || [];
    const idx = targetComment.likes.indexOf(username);
    if (idx === -1) targetComment.likes.push(username);
    else targetComment.likes.splice(idx, 1);

    savePosts(posts);

    const formData = new FormData();
    formData.append('type', 'comment');
    formData.append('commentId', commentId);

    fetch('guardarLike.php', { method: 'POST', body: formData })
    .catch(err => console.error('Error al registrar Like en comentario:', err));

    return targetComment;
  }

  function addComment(postId, author, text) {
    const posts = getPosts();
    const post = posts.find(p => String(p.id) === String(postId));
    if (!post) return;

    if (!Array.isArray(post.comments)) post.comments = [];

    const provisionalId = createId();
    const nuevoComentario = {
      id: provisionalId,
      author,
      text: sanitize(text),
      replies: [],
      likes: [],
      createdAt: new Date().toISOString()
    };

    post.comments.push(nuevoComentario);
    savePosts(posts);

    const formData = new FormData();
    formData.append('postId', postId);
    formData.append('text', text);

    fetch('guardarComentario.php', { method: 'POST', body: formData })
    .then(res => res.json())
    .then(data => {
      if (data.status === 'success' && data.idComentario) {
        const idReal = parseInt(data.idComentario, 10);
        
        const postsAct = getPosts();
        const p = postsAct.find(p => String(p.id) === String(postId));
        if(p) {
           const c = p.comments.find(c => c.id === provisionalId);
           if(c) { c.id = idReal; savePosts(postsAct); }
        }

        const domComment = document.querySelector(`[data-comment-id="${provisionalId}"]`);
        if (domComment) {
            domComment.dataset.commentId = idReal;
            domComment.querySelectorAll(`[data-comment-id="${provisionalId}"]`).forEach(el => el.dataset.commentId = idReal);
        }
      }
    });

    return post;
  }

  function addReply(postId, commentId, author, text) {
    const posts = getPosts();
    const post = posts.find(p => String(p.id) === String(postId));
    if (!post || !Array.isArray(post.comments)) return;

    const comment = post.comments.find(c => String(c.id) === String(commentId));
    if (!comment) return;

    if (!Array.isArray(comment.replies)) comment.replies = [];

    const provisionalId = createId();
    const reply = {
      id: provisionalId,
      author,
      text: sanitize(text),
      likes: [],
      createdAt: new Date().toISOString()
    };

    comment.replies.push(reply);
    savePosts(posts);

    const formData = new FormData();
    formData.append('postId', postId);
    formData.append('text', text);
    formData.append('parentId', commentId);

    fetch('guardarComentario.php', { method: 'POST', body: formData })
    .then(res => res.json())
    .then(data => {
      if (data.status === 'success' && data.idComentario) {
        const idReal = parseInt(data.idComentario, 10);
        const postsAct = getPosts();
        const p = postsAct.find(p => String(p.id) === String(postId));
        if(p) {
           const c = p.comments.find(c => String(c.id) === String(commentId));
           if(c) {
               const r = c.replies.find(r => r.id === provisionalId);
               if(r) { r.id = idReal; savePosts(postsAct); }
           }
        }
        
        const domReply = document.querySelector(`[data-comment-id="${provisionalId}"]`);
        if(domReply) {
            domReply.dataset.commentId = idReal;
            domReply.querySelectorAll('.like-comment-btn').forEach(btn => btn.dataset.commentId = idReal);
        }
      }
    });

    return { post, comment, reply };
  }

  function countPostComments(post) {
    return (post.comments || []).reduce((total, comment) => {
      return total + 1 + (comment.replies || []).length;
    }, 0);
  }

  function deletePost(postId, username) {
    const posts = getPosts().filter(p => !(String(p.id) === String(postId) && p.author === username));
    savePosts(posts);
  }

  // ─── Avatar helper ─────────────────────────────────────────────────────────

  function avatarHTML(user, size = 'w-10 h-10 text-base') {
    if (user?.avatarDataUrl) {
      return `<img src="${user.avatarDataUrl}" class="${size} rounded-full object-cover shrink-0 border-2 border-slate-200 dark:border-slate-700" />`;
    }
    const letter = sanitize(user?.displayName || user?.username || '?').charAt(0).toUpperCase();
    return `<div class="${size} rounded-full bg-gradient-to-br from-blue-400 to-violet-500 flex items-center justify-center text-white font-bold shrink-0">${letter}</div>`;
  }

  function renderSidebarUser(user) {
    const tag = document.querySelector('aside .rounded-xl p');
    if (tag && user) tag.textContent = `@${user.username}`;
  }

  // ─── Feed de publicaciones ─────────────────────────────────────────────────

  function replyHTML(reply, store, currentUser, parentCommentId) {
    const rUser = store?.findUserByUsername(reply.author) || { username: reply.author };
    const liked = Array.isArray(reply.likes) ? reply.likes.includes(currentUser.username) : false;

    return `
      <div class="flex space-x-3 reply-item mb-2" data-comment-id="${reply.id}">
        ${avatarHTML(rUser, 'w-6 h-6 text-xs')}
        <div class="flex-1">
          <div class="bg-slate-50 dark:bg-slate-800/70 border border-slate-100 dark:border-slate-700 rounded-xl rounded-tl-none px-3 py-2">
            <span class="font-bold text-xs text-slate-900 dark:text-white">@${sanitize(reply.author)}</span>
            <p class="text-xs text-slate-800 dark:text-slate-200 mt-0.5">${sanitize(reply.text)}</p>
          </div>
          <div class="flex items-center space-x-4 mt-1 text-[11px] text-slate-500 font-medium">
            <button type="button" class="like-comment-btn hover:text-red-500 flex items-center gap-1 transition ${liked ? 'text-red-500 font-bold' : ''}" data-comment-id="${reply.id}">
              <span>${liked ? '❤️' : '🤍'}</span> <span class="like-count">${reply.likes ? reply.likes.length : 0}</span>
            </button>
            <button type="button" class="reply-comment-btn hover:text-blue-500" data-comment-id="${parentCommentId}">
              Responder
            </button>
          </div>
        </div>
      </div>`;
  }

  function commentHTML(comment, store, currentUser) {
    const cUser = store?.findUserByUsername(comment.author) || { username: comment.author };
    const liked = Array.isArray(comment.likes) ? comment.likes.includes(currentUser.username) : false;
    const repliesHTML = (comment.replies || []).map(reply => replyHTML(reply, store, currentUser, comment.id)).join('');

    return `
      <div class="comment-item flex space-x-3 mb-4" data-comment-id="${comment.id}">
        ${avatarHTML(cUser, 'w-8 h-8 text-sm')}
        <div class="flex-1">
          <div class="bg-slate-100 dark:bg-slate-800 rounded-xl rounded-tl-none px-3 py-2">
            <span class="font-bold text-sm text-slate-900 dark:text-white">@${sanitize(comment.author)}</span>
            <p class="text-sm text-slate-800 dark:text-slate-200 mt-0.5">${sanitize(comment.text)}</p>
          </div>
          
          <div class="flex items-center space-x-4 mt-1 text-xs text-slate-500 font-medium">
            <button type="button" class="like-comment-btn hover:text-red-500 flex items-center gap-1 transition ${liked ? 'text-red-500 font-bold' : ''}" data-comment-id="${comment.id}">
              <span>${liked ? '❤️' : '🤍'}</span> <span class="like-count">${comment.likes ? comment.likes.length : 0}</span>
            </button>
            <button type="button" class="reply-comment-btn hover:text-blue-500" data-comment-id="${comment.id}">
              Responder
            </button>
          </div>

          <div class="comment-replies mt-2 space-y-2 ${!repliesHTML ? 'hidden' : 'ml-8 pl-4 border-l-2 border-slate-300 dark:border-slate-700'}">
            ${repliesHTML}
          </div>

          <div class="reply-form hidden mt-2 flex gap-2 items-center">
            ${avatarHTML(currentUser, 'w-6 h-6 text-xs')}
            <input type="text" placeholder="Responder comentario…" maxlength="300"
              class="reply-input flex-1 bg-slate-100 dark:bg-slate-800 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-400" />
            <button type="button" class="send-reply-btn bg-blue-500 hover:bg-blue-600 text-white rounded-xl px-3 py-1.5 text-xs transition">↩</button>
          </div>
        </div>
      </div>`;
  }

  function postCardHTML(post, currentUser) {
    const store = window.MicroConnectApp?.userStore;
    const author = store?.findUserByUsername(post.author) || { username: post.author };
    const liked = Array.isArray(post.likes) ? post.likes.includes(currentUser.username) : false;
    const isOwner = post.author === currentUser.username;

    const mediaHTML = post.mediaDataUrl
      ? post.mediaType === 'video'
        ? `<video src="${post.mediaDataUrl}" controls class="w-full rounded-xl max-h-72 mt-3 object-cover bg-black"></video>`
        : `<img src="${post.mediaDataUrl}" class="w-full rounded-xl max-h-72 mt-3 object-cover" />`
      : '';

    const commentsHTML = (post.comments || []).map(c => commentHTML(c, store, currentUser)).join('');

    return `
      <article class="post-card bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-3" data-post-id="${post.id}">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            ${avatarHTML(author)}
            <div>
              <p class="font-semibold leading-tight">${sanitize(author.displayName || author.username)}</p>
              <p class="text-xs text-slate-400">@${sanitize(post.author)} · ${timeAgo(post.createdAt)}</p>
            </div>
          </div>
          ${isOwner ? `<button type="button" class="delete-post-btn text-slate-300 hover:text-red-400 transition text-lg leading-none" title="Eliminar publicación">🗑</button>` : ''}
        </div>

        ${post.text ? `<p class="text-slate-800 dark:text-slate-100 whitespace-pre-line">${sanitize(post.text)}</p>` : ''}

        ${mediaHTML}

        <div class="flex items-center gap-5 pt-1 border-t border-slate-100 dark:border-slate-800">
          <button type="button" class="like-btn flex items-center gap-1.5 text-sm transition ${liked ? 'text-red-500 font-semibold' : 'text-slate-400 hover:text-red-400'}">
            ${liked ? '❤️' : '🤍'} <span class="like-count">${Array.isArray(post.likes) ? post.likes.length : 0}</span>
          </button>

          <button type="button" class="comment-toggle-btn flex items-center gap-1.5 text-sm text-slate-400 hover:text-blue-400 transition">
            💬 <span>${countPostComments(post)}</span>
          </button>
        </div>

        <div class="comments-section hidden space-y-1 mt-4">
          <div class="comments-list space-y-1">${commentsHTML}</div>

          <div class="flex gap-2 items-center mt-4">
            ${avatarHTML(currentUser, 'w-8 h-8 text-sm')}
            <input type="text" placeholder="Escribe un comentario principal…" maxlength="300"
              class="comment-input flex-1 bg-slate-100 dark:bg-slate-800 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
            <button type="button" class="send-comment-btn bg-blue-500 hover:bg-blue-600 text-white rounded-xl px-3 py-2 text-sm transition">↩</button>
          </div>
        </div>
      </article>`;
  }

  function bindPostCard(card, currentUser) {
    function updateCommentCounter(post) {
      const countSpan = card.querySelector('.comment-toggle-btn span');
      if (countSpan && post) countSpan.textContent = countPostComments(post);
    }

    function bindCommentReplies(commentItem) {
      const replyForm = commentItem.querySelector('.reply-form');
      const replyInput = commentItem.querySelector('.reply-input');
      const sendReplyBtn = commentItem.querySelector('.send-reply-btn');
      const repliesList = commentItem.querySelector('.comment-replies');

      // DELEGACIÓN DE EVENTOS: Escuchamos TODOS los clics dentro del comentario entero.
      // Esto asegura que los botones nuevos que nazcan después también funcionen.
      commentItem.addEventListener('click', (e) => {
         
         // --- 1. Lógica si hicieron clic en el botón de ME GUSTA ---
         const likeBtn = e.target.closest('.like-comment-btn');
         if (likeBtn) {
             const hotPostId = card.dataset.postId;
             const targetCommentId = likeBtn.dataset.commentId;
             const updatedTarget = toggleCommentLike(hotPostId, targetCommentId, currentUser.username);
             
             if(updatedTarget) {
                 const liked = updatedTarget.likes.includes(currentUser.username);
                 likeBtn.innerHTML = `<span>${liked ? '❤️' : '🤍'}</span> <span class="like-count">${updatedTarget.likes.length}</span>`;
                 if (liked) {
                     likeBtn.classList.add('text-red-500', 'font-bold');
                 } else {
                     likeBtn.classList.remove('text-red-500', 'font-bold');
                 }
             }
             return; // Detenemos aquí para no procesar nada más
         }

         // --- 2. Lógica si hicieron clic en el botón de RESPONDER ---
         const replyBtn = e.target.closest('.reply-comment-btn');
         if (replyBtn) {
             replyForm?.classList.remove('hidden');
             replyInput?.focus();

             // MAGIA: Si el botón pertenece a una sub-respuesta, capturamos su @usuario
             const replyCard = replyBtn.closest('.reply-item');
             if (replyCard) {
                 // Buscamos la etiqueta que tiene el @usuario (usualmente la clase font-bold en tu HTML)
                 const authorName = replyCard.querySelector('.font-bold').textContent;
                 
                 // Inyectamos el @usuario en el input para dar la sensación de hilo infinito
                 if (!replyInput.value.includes(authorName)) {
                     replyInput.value = `${authorName} ` + replyInput.value;
                 }
             }
         }
      });

      // Función para enviar la respuesta (Lectura en caliente intacta)
      function sendReply() {
        const hotPostId = card.dataset.postId;
        const hotCommentId = commentItem.dataset.commentId; 
        
        const text = replyInput?.value.trim();
        if (!text) return;

        const result = addReply(hotPostId, hotCommentId, currentUser.username, text);
        if (!result) return;

        const store = window.MicroConnectApp?.userStore;
        const div = document.createElement('div');
        div.innerHTML = replyHTML(result.reply, store, currentUser, hotCommentId);

        repliesList.classList.remove('hidden');
        repliesList.classList.add('ml-8', 'pl-4', 'border-l-2', 'border-slate-300', 'dark:border-slate-700');
        repliesList.appendChild(div.firstElementChild);

        replyInput.value = '';
        replyForm?.classList.add('hidden');

        updateCommentCounter(result.post);
      }

      sendReplyBtn?.addEventListener('click', sendReply);

      replyInput?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            sendReply();
        }
      });
    }

    card.querySelectorAll('.comment-item').forEach(commentItem => {
      bindCommentReplies(commentItem);
    });

    card.querySelector('.like-btn')?.addEventListener('click', () => {
      const currentPostId = card.dataset.postId;
      const post = toggleLike(currentPostId, currentUser.username);
      if (!post) return;

      const liked = post.likes.includes(currentUser.username);
      const btn = card.querySelector('.like-btn');

      btn.innerHTML = `${liked ? '❤️' : '🤍'} <span class="like-count">${post.likes.length}</span>`;
      btn.className = `like-btn flex items-center gap-1.5 text-sm transition ${liked ? 'text-red-500 font-semibold' : 'text-slate-400 hover:text-red-400'}`;
    });

    card.querySelector('.comment-toggle-btn')?.addEventListener('click', () => {
      card.querySelector('.comments-section')?.classList.toggle('hidden');
    });

    card.querySelector('.send-comment-btn')?.addEventListener('click', () => {
      const input = card.querySelector('.comment-input');
      const text = input?.value.trim();
      if (!text) return;

      const currentPostId = card.dataset.postId; 
      const post = addComment(currentPostId, currentUser.username, text);
      if (!post) return;

      const store = window.MicroConnectApp?.userStore;
      const comment = post.comments[post.comments.length - 1];
      const list = card.querySelector('.comments-list');

      const div = document.createElement('div');
      div.innerHTML = commentHTML(comment, store, currentUser);

      const commentItem = div.firstElementChild;
      list?.appendChild(commentItem);
      
      bindCommentReplies(commentItem);
      updateCommentCounter(post);

      input.value = '';
    });

    card.querySelector('.comment-input')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
          e.preventDefault();
          card.querySelector('.send-comment-btn')?.click();
      }
    });

    card.querySelector('.delete-post-btn')?.addEventListener('click', () => {
      if (!confirm('¿Eliminar esta publicación?')) return;
      const currentPostId = card.dataset.postId;
      deletePost(currentPostId, currentUser.username);
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

  window.MicroConnectHomeShared = {
    getCurrentUser, sanitize, timeAgo, createId, getPosts, savePosts, addPost,
    toggleLike, toggleCommentLike, addComment, addReply, deletePost, countPostComments,
    avatarHTML, renderSidebarUser, postCardHTML, bindPostCard, renderFeed
  };

  // ─── Contenido: Inicio ─────────────────────────────────────────────────────

  function renderInicio(user) {
    return `
      <div class="max-w-xl mx-auto space-y-5">
        <div class="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-3">
          <div class="flex gap-3 items-start">
            ${avatarHTML(user)}
            <textarea id="postText" rows="3" maxlength="500" placeholder="¿Qué está pasando, @${sanitize(user.username)}?"
              class="flex-1 bg-slate-100 dark:bg-slate-800 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-400"></textarea>
          </div>
          <div id="mediaPreviewWrap" class="hidden">
            <div id="mediaPreview" class="relative"></div>
            <button id="removeMediaBtn" class="text-xs text-red-400 hover:underline mt-1">✕ Quitar archivo</button>
          </div>
          <div class="flex items-center justify-between flex-wrap gap-2">
            <div class="flex gap-2">
              <label class="cursor-pointer flex items-center gap-1 text-sm text-slate-400 hover:text-blue-400 transition">
                Imagen
                <input type="file" id="postImageInput" accept="image/png,image/jpeg,image/gif,image/webp" class="hidden" />
              </label>
              <label class="cursor-pointer flex items-center gap-1 text-sm text-slate-400 hover:text-blue-400 transition ml-4">
                Video
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
        <div id="feedContainer" class="space-y-4"></div>
      </div>`;
  }

  function bindInicio(user) {
    const feedContainer = document.getElementById('feedContainer');
    renderFeed(feedContainer, user);
    let pendingMedia = null;

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
          alert('El archivo supera los 20 MB.');
          input.value = '';
          return;
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

      const nuevoPostCreado = addPost(user.username, text, pendingMedia?.dataUrl || '', pendingMedia?.type || '');
      document.getElementById('postText').value = '';
      clearMedia();

      if (nuevoPostCreado) {
        const div = document.createElement('div');
        div.innerHTML = postCardHTML(nuevoPostCreado, user);
        const card = div.firstElementChild;
        feedContainer.prepend(card);
        bindPostCard(card, user);
        feedContainer.querySelector('p.text-slate-400')?.remove();
      }
    });
  }

  // ─── Contenido: Notificaciones ─────────────────────────────────────────────
  function renderNotificaciones() {
    return `<div class="max-w-xl mx-auto"><p class="text-slate-400 text-center py-10">No tienes notificaciones nuevas.</p></div>`;
  }

  // ─── Contenido: Configuración ──────────────────────────────────────────────
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
      window.location.replace('../index.php');
    });
  }

  // ─── Navegación tabs ───────────────────────────────────────────────────────
  function renderTab(tabName) {
    const user = getCurrentUser();
    const content = document.getElementById('mainContent');
    const title = document.getElementById('screenTitle');
    if (!content || !title) return;

    const titles = { inicio: 'Inicio', notificaciones: 'Notificaciones', perfil: 'Mi Perfil', configuracion: 'Configuración' };
    title.textContent = titles[tabName] || tabName;

    switch (tabName) {
      case 'inicio': content.innerHTML = user ? renderInicio(user) : ''; if (user) bindInicio(user); break;
      case 'notificaciones': content.innerHTML = renderNotificaciones(); break;
      case 'perfil':
        if (!user) { content.innerHTML = '<p>No se pudo cargar el perfil.</p>'; break; }
        if (window.MicroConnectProfile?.mount) { window.MicroConnectProfile.mount(content, user); } 
        else { content.innerHTML = '<p class="text-red-500">No se cargó MyProfile.js.</p>'; }
        break;
      case 'configuracion': content.innerHTML = renderConfiguracion(); bindConfiguracion(); break;
    }
  }

  window.MicroConnectHome = { renderTab };

  // ─── Sidebar móvil / menú hamburguesa ──────────────────────────────────────
  function initMobileSidebar() {
    const menuToggle = document.getElementById('menuToggle');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    const sidebarClose = document.getElementById('sidebarClose');
    const sidebarBack = document.getElementById('sidebarBack');
    const tabButtons = document.querySelectorAll('#menuTabs .tab-btn');

    if (!menuToggle || !sidebar || !overlay || !sidebarClose) return;

    function openSidebar() {
      sidebar.classList.add('is-open'); overlay.classList.add('is-open');
      menuToggle.style.display = 'none'; menuToggle.setAttribute('aria-expanded', 'true');
      document.body.style.overflow = 'hidden';
    }

    function closeSidebar() {
      sidebar.classList.remove('is-open'); overlay.classList.remove('is-open');
      menuToggle.style.display = ''; menuToggle.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
    }

    menuToggle.addEventListener('click', openSidebar);
    sidebarClose.addEventListener('click', closeSidebar);
    if (sidebarBack) sidebarBack.addEventListener('click', closeSidebar);
    overlay.addEventListener('click', closeSidebar);

    tabButtons.forEach(btn => btn.addEventListener('click', () => { if (window.innerWidth < 1024) closeSidebar(); }));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeSidebar(); });
    window.addEventListener('resize', () => { if (window.innerWidth >= 1024) closeSidebar(); });
  }
  
  // ─── Init ──────────────────────────────────────────────────────────────────
  function init() {
    const user = getCurrentUser();
    if (!user) return;
    renderSidebarUser(user);
    initMobileSidebar();
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

  if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', init); } 
  else { init(); }
})();