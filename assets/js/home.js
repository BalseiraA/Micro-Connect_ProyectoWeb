/* home.js */
(() => {
  const SESSION_USER_KEY = 'mc_user';
  const POSTS_KEY = 'mc_posts';

  let hydratedFromServer = false;

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

  function timeAgo(dateString) {
    if (!dateString) return 'ahora mismo';

    const value = String(dateString).trim();
    const normalizedValue = value.includes('T') ? value : value.replace(' ', 'T');
    const date = new Date(normalizedValue);

    if (Number.isNaN(date.getTime())) return 'ahora mismo';

    const diff = Date.now() - date.getTime();

    if (diff < 0) return 'ahora mismo';

    const seconds = Math.floor(diff / 1000);
    const mins = Math.floor(seconds / 60);

    if (seconds < 60) return 'ahora mismo';
    if (mins < 60) return `hace ${mins} min`;

    const hrs = Math.floor(mins / 60);

    if (hrs < 24) return `hace ${hrs} h`;

    const days = Math.floor(hrs / 24);

    if (days < 7) return `hace ${days} d`;

    return date.toLocaleDateString('es-MX');
  }

  function createId() {
    return window.crypto?.randomUUID?.() || `id_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  }

  function getServerPosts() {
    return Array.isArray(window.__MICROCONNECT_POSTS_BASE__)
      ? window.__MICROCONNECT_POSTS_BASE__
      : [];
  }

  function getServerPostById(postId) {
    return getServerPosts().find(post => String(post.id) === String(postId));
  }

  function getPostMediaData(post) {
    if (post?.mediaDataUrl) return post.mediaDataUrl;

    const serverPost = getServerPostById(post?.id);
    return serverPost?.mediaDataUrl || '';
  }

  function makeLightComment(comment) {
    return {
      id: comment.id,
      parentId: comment.parentId ?? null,
      author: comment.author,
      text: comment.text || '',
      createdAt: comment.createdAt || new Date().toISOString(),
      likes: Array.isArray(comment.likes) ? comment.likes : [],
      replies: Array.isArray(comment.replies) ? comment.replies.map(makeLightComment) : [],
      commentAuthorDisplayName: comment.commentAuthorDisplayName || comment.author,
      commentAuthorAvatar: ''
    };
  }

  function makeLightPost(post) {
    return {
      id: post.id,
      author: post.author,
      authorDisplayName: post.authorDisplayName || post.author,
      authorAvatar: '',
      text: post.text || '',
      createdAt: post.createdAt || new Date().toISOString(),
      mediaType: post.mediaType || '',
      mediaDataUrl: '',
      likes: Array.isArray(post.likes) ? post.likes : [],
      comments: Array.isArray(post.comments) ? post.comments.map(makeLightComment) : []
    };
  }

  function hydratePostsFromServer() {
    if (hydratedFromServer) return;

    hydratedFromServer = true;

    const serverPosts = getServerPosts();

    if (!serverPosts.length) return;

    const lightPosts = serverPosts.map(makeLightPost);

    try {
      localStorage.setItem(POSTS_KEY, JSON.stringify(lightPosts));
    } catch (error) {
      console.warn('No se pudo sincronizar mc_posts en localStorage:', error);
      localStorage.removeItem(POSTS_KEY);
    }
  }

  // ─── Posts store ───────────────────────────────────────────────────────────

  function getPosts() {
    hydratePostsFromServer();

    try {
      const raw = localStorage.getItem(POSTS_KEY);
      const parsed = raw ? JSON.parse(raw) : [];

      if (!Array.isArray(parsed)) return [];

      return parsed;
    } catch {
      return [];
    }
  }

  function savePosts(posts) {
    const lightPosts = Array.isArray(posts) ? posts.map(makeLightPost) : [];

    try {
      localStorage.setItem(POSTS_KEY, JSON.stringify(lightPosts));
    } catch (error) {
      console.warn('LocalStorage lleno. Se guardará una versión ligera de las publicaciones.', error);

      try {
        const ultraLightPosts = lightPosts.map(post => ({
          ...post,
          mediaDataUrl: '',
          authorAvatar: '',
          comments: (post.comments || []).map(comment => ({
            ...comment,
            commentAuthorAvatar: '',
            replies: (comment.replies || []).map(reply => ({
              ...reply,
              commentAuthorAvatar: ''
            }))
          }))
        }));

        localStorage.setItem(POSTS_KEY, JSON.stringify(ultraLightPosts));
      } catch (secondError) {
        console.error('No se pudo guardar mc_posts en localStorage.', secondError);
        localStorage.removeItem(POSTS_KEY);
      }
    }
  }

  function addPost(author, text, mediaDataUrl, mediaType) {
    const posts = getPosts();
    const provisionalId = createId();

    const currentUserData = window.MicroConnectApp?.userStore?.findUserByUsername(author);

    const post = {
      id: provisionalId,
      author,
      authorDisplayName: currentUserData?.displayName || author,
      authorAvatar: currentUserData?.avatarDataUrl || '',
      text: sanitize(text),
      mediaDataUrl: mediaDataUrl || '',
      mediaType: mediaType || '',
      likes: [],
      comments: [],
      createdAt: new Date().toISOString()
    };

    posts.unshift(post);

    // Esta función ya guarda versión ligera, sin Base64.
    savePosts(posts);

    const formData = new FormData();
    formData.append('text', text || '');

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
      .then(respuesta => {
        const idNumerico = parseInt(respuesta, 10);

        if (!Number.isNaN(idNumerico) && idNumerico > 0) {
          const postsActualizados = getPosts();
          const postEncontrado = postsActualizados.find(p => p.id === provisionalId || p.createdAt === post.createdAt);

          if (postEncontrado) {
            postEncontrado.id = idNumerico;
            savePosts(postsActualizados);
          }

          const tarjetaPost = document.querySelector(`[data-post-id="${provisionalId}"]`);

          if (tarjetaPost) {
            tarjetaPost.dataset.postId = idNumerico;
          }
        } else {
          console.error('❌ Error de MySQL/PHP al intentar guardar:', respuesta);
          alert('La publicación se mostró en pantalla, pero no se guardó correctamente en la base de datos.');
        }
      })
      .catch(err => {
        console.error('❌ Error de red al comunicar con PHP:', err);
        alert('La publicación se mostró en pantalla, pero ocurrió un error de red al guardarla.');
      });

    return post;
  }

  function toggleLike(postId, username) {
    const posts = getPosts();
    const post = posts.find(p => String(p.id) === String(postId));

    if (!post) return null;

    post.likes = Array.isArray(post.likes) ? post.likes : [];

    const idx = post.likes.indexOf(username);

    if (idx === -1) post.likes.push(username);
    else post.likes.splice(idx, 1);

    savePosts(posts);

    const formData = new FormData();
    formData.append('type', 'post');
    formData.append('postId', postId);

    fetch('guardarLike.php', {
      method: 'POST',
      body: formData
    }).catch(err => console.error('Error de red al registrar Like:', err));

    return post;
  }

  function toggleCommentLike(postId, commentId, username) {
    const posts = getPosts();
    const post = posts.find(p => String(p.id) === String(postId));

    if (!post) return null;

    let targetComment = null;

    for (const comment of post.comments || []) {
      if (String(comment.id) === String(commentId)) {
        targetComment = comment;
        break;
      }

      if (Array.isArray(comment.replies)) {
        const reply = comment.replies.find(rep => String(rep.id) === String(commentId));

        if (reply) {
          targetComment = reply;
          break;
        }
      }
    }

    if (!targetComment) return null;

    targetComment.likes = Array.isArray(targetComment.likes) ? targetComment.likes : [];

    const idx = targetComment.likes.indexOf(username);

    if (idx === -1) targetComment.likes.push(username);
    else targetComment.likes.splice(idx, 1);

    savePosts(posts);

    const formData = new FormData();
    formData.append('type', 'comment');
    formData.append('commentId', commentId);

    fetch('guardarLike.php', {
      method: 'POST',
      body: formData
    }).catch(err => console.error('Error al registrar Like en comentario:', err));

    return targetComment;
  }

  function addComment(postId, author, text) {
    const posts = getPosts();
    const post = posts.find(p => String(p.id) === String(postId));

    if (!post) return null;

    if (!Array.isArray(post.comments)) post.comments = [];

    const currentUserData = window.MicroConnectApp?.userStore?.findUserByUsername(author);
    const provisionalId = createId();

    const nuevoComentario = {
      id: provisionalId,
      author,
      text: sanitize(text),
      replies: [],
      likes: [],
      createdAt: new Date().toISOString(),
      commentAuthorDisplayName: currentUserData?.displayName || author,
      commentAuthorAvatar: currentUserData?.avatarDataUrl || ''
    };

    post.comments.push(nuevoComentario);
    savePosts(posts);

    const formData = new FormData();
    formData.append('postId', postId);
    formData.append('text', text);

    fetch('guardarComentario.php', {
      method: 'POST',
      body: formData
    })
      .then(res => res.json())
      .then(data => {
        if (data.status === 'success' && data.idComentario) {
          const idReal = parseInt(data.idComentario, 10);
          const postsAct = getPosts();
          const p = postsAct.find(p => String(p.id) === String(postId));

          if (p) {
            const c = p.comments.find(c => c.id === provisionalId);

            if (c) {
              c.id = idReal;
              savePosts(postsAct);
            }
          }

          const domComment = document.querySelector(`[data-comment-id="${provisionalId}"]`);

          if (domComment) {
            domComment.dataset.commentId = idReal;
            domComment.querySelectorAll(`[data-comment-id="${provisionalId}"]`).forEach(el => {
              el.dataset.commentId = idReal;
            });

            domComment.querySelectorAll('.like-comment-btn').forEach(btn => {
              btn.dataset.commentId = idReal;
            });
          }
        }
      })
      .catch(err => console.error('Error al guardar comentario:', err));

    return post;
  }

  function addReply(postId, commentId, author, text) {
    const posts = getPosts();
    const post = posts.find(p => String(p.id) === String(postId));

    if (!post || !Array.isArray(post.comments)) return null;

    const comment = post.comments.find(c => String(c.id) === String(commentId));

    if (!comment) return null;

    if (!Array.isArray(comment.replies)) comment.replies = [];

    const currentUserData = window.MicroConnectApp?.userStore?.findUserByUsername(author);
    const provisionalId = createId();

    const reply = {
      id: provisionalId,
      parentId: commentId,
      author,
      text: sanitize(text),
      likes: [],
      createdAt: new Date().toISOString(),
      commentAuthorDisplayName: currentUserData?.displayName || author,
      commentAuthorAvatar: currentUserData?.avatarDataUrl || ''
    };

    comment.replies.push(reply);
    savePosts(posts);

    const formData = new FormData();
    formData.append('postId', postId);
    formData.append('text', text);
    formData.append('parentId', commentId);

    fetch('guardarComentario.php', {
      method: 'POST',
      body: formData
    })
      .then(res => res.json())
      .then(data => {
        if (data.status === 'success' && data.idComentario) {
          const idReal = parseInt(data.idComentario, 10);
          const postsAct = getPosts();
          const p = postsAct.find(p => String(p.id) === String(postId));

          if (p) {
            const c = p.comments.find(c => String(c.id) === String(commentId));

            if (c) {
              const r = c.replies.find(r => r.id === provisionalId);

              if (r) {
                r.id = idReal;
                savePosts(postsAct);
              }
            }
          }

          const domReply = document.querySelector(`[data-comment-id="${provisionalId}"]`);

          if (domReply) {
            domReply.dataset.commentId = idReal;
            domReply.querySelectorAll('.like-comment-btn').forEach(btn => {
              btn.dataset.commentId = idReal;
            });
          }
        }
      })
      .catch(err => console.error('Error al guardar respuesta:', err));

    return { post, comment, reply };
  }

  function countPostComments(post) {
    return (post.comments || []).reduce((total, comment) => {
      return total + 1 + (comment.replies || []).length;
    }, 0);
  }

  function removePostFromLocal(postId, username) {
    const posts = getPosts().filter(post => {
      return !(String(post.id) === String(postId) && post.author === username);
    });

    savePosts(posts);
  }

  async function deletePost(postId, username) {
    const posts = getPosts();
    const post = posts.find(p => String(p.id) === String(postId));

    if (!post) {
      return {
        success: false,
        message: 'No se encontró la publicación en la vista actual.'
      };
    }

    if (post.author !== username) {
      return {
        success: false,
        message: 'No puedes eliminar una publicación que no es tuya.'
      };
    }

    if (!/^\d+$/.test(String(postId))) {
      removePostFromLocal(postId, username);

      return {
        success: true,
        message: 'Publicación eliminada localmente.'
      };
    }

    const formData = new FormData();
    formData.append('postId', postId);

    try {
      const response = await fetch('eliminarPost.php', {
        method: 'POST',
        body: formData
      });

      const data = await response.json();

      if (data.status === 'success') {
        removePostFromLocal(postId, username);

        return {
          success: true,
          message: data.message || 'Publicación eliminada correctamente.'
        };
      }

      return {
        success: false,
        message: data.message || 'No se pudo eliminar la publicación.'
      };
    } catch (error) {
      console.error('Error al eliminar publicación:', error);

      return {
        success: false,
        message: 'Error de red al intentar eliminar la publicación.'
      };
    }
  }

  // ─── Avatar helper ─────────────────────────────────────────────────────────

  function avatarHTML(user, size = 'w-10 h-10 text-base') {
    function getAvatarStyle(sizeClass) {
      const value = String(sizeClass || '');
      let dimensions = 'width:2.5rem;height:2.5rem;min-width:2.5rem;font-size:1rem;';

      if (value.includes('w-6') || value.includes('h-6')) {
        dimensions = 'width:1.5rem;height:1.5rem;min-width:1.5rem;font-size:0.75rem;';
      } else if (value.includes('w-8') || value.includes('h-8')) {
        dimensions = 'width:2rem;height:2rem;min-width:2rem;font-size:0.875rem;';
      } else if (value.includes('w-20') || value.includes('h-20')) {
        dimensions = 'width:5rem;height:5rem;min-width:5rem;font-size:1.875rem;';
      }

      return `
        ${dimensions}
        display:flex;
        align-items:center;
        justify-content:center;
        text-align:center;
        line-height:1;
        padding:0;
        margin:0;
        aspect-ratio:1 / 1;
        overflow:hidden;
      `;
    }

    const style = getAvatarStyle(size);

    if (user?.avatarDataUrl) {
      return `<img src="${user.avatarDataUrl}" 
        class="rounded-full object-cover shrink-0 border-2 border-slate-200 dark:border-slate-700" 
        style="${style};display:block;" />`;
    }

    const letter = sanitize(user?.displayName || user?.username || '?').charAt(0).toUpperCase();

    return `<div 
      class="rounded-full bg-gradient-to-br from-blue-400 to-violet-500 text-white font-bold shrink-0" 
      style="${style}">
      <span style="display:block;line-height:1;margin:0;padding:0;transform:translateY(-0.5px);">
        ${letter}
      </span>
    </div>`;
  }

  function renderSidebarUser(user) {
    const tag = document.querySelector('aside .rounded-xl p');

    if (tag && user) tag.textContent = `@${user.username}`;
  }

  // ─── Visor de multimedia ───────────────────────────────────────────────────

  function openMediaViewer(mediaSrc, mediaType = 'image') {
    if (!mediaSrc) return;

    document.getElementById('mediaViewerModal')?.remove();

    const modal = document.createElement('div');
    modal.id = 'mediaViewerModal';
    modal.style.position = 'fixed';
    modal.style.inset = '0';
    modal.style.zIndex = '9999';
    modal.style.backgroundColor = 'rgba(0, 0, 0, 0.96)';
    modal.style.display = 'flex';
    modal.style.alignItems = 'center';
    modal.style.justifyContent = 'center';
    modal.style.padding = '1rem';

    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.innerHTML = '<span style="display:block;line-height:1;transform:translateY(-3px);">×</span>';
    closeBtn.setAttribute('aria-label', 'Cerrar vista de multimedia');
    closeBtn.style.position = 'fixed';
    closeBtn.style.top = '1rem';
    closeBtn.style.left = '1rem';
    closeBtn.style.width = '3rem';
    closeBtn.style.height = '3rem';
    closeBtn.style.borderRadius = '9999px';
    closeBtn.style.border = 'none';
    closeBtn.style.background = 'rgba(255, 255, 255, 0.12)';
    closeBtn.style.color = '#ffffff';
    closeBtn.style.fontSize = '2rem';
    closeBtn.style.lineHeight = '1';
    closeBtn.style.cursor = 'pointer';
    closeBtn.style.zIndex = '10000';
    closeBtn.style.display = 'flex';
    closeBtn.style.alignItems = 'center';
    closeBtn.style.justifyContent = 'center';
    closeBtn.style.padding = '0';
    closeBtn.style.margin = '0';

    const contentWrapper = document.createElement('div');
    contentWrapper.style.width = '100%';
    contentWrapper.style.height = '100%';
    contentWrapper.style.display = 'flex';
    contentWrapper.style.alignItems = 'center';
    contentWrapper.style.justifyContent = 'center';

    if (mediaType === 'video') {
      const video = document.createElement('video');
      video.src = mediaSrc;
      video.controls = true;
      video.autoplay = true;
      video.style.maxWidth = '100%';
      video.style.maxHeight = '95vh';
      video.style.objectFit = 'contain';
      video.style.borderRadius = '0.5rem';
      video.style.backgroundColor = '#000000';

      contentWrapper.appendChild(video);
    } else {
      const img = document.createElement('img');
      img.src = mediaSrc;
      img.alt = 'Imagen de publicación';
      img.style.maxWidth = '100%';
      img.style.maxHeight = '95vh';
      img.style.objectFit = 'contain';
      img.style.borderRadius = '0.5rem';

      contentWrapper.appendChild(img);
    }

    function closeModal() {
      modal.remove();
      document.body.style.overflow = '';
      document.removeEventListener('keydown', handleEscape);
    }

    function handleEscape(event) {
      if (event.key === 'Escape') closeModal();
    }

    closeBtn.addEventListener('click', closeModal);

    modal.addEventListener('click', event => {
      if (event.target === modal || event.target === contentWrapper) {
        closeModal();
      }
    });

    contentWrapper.addEventListener('click', event => {
      event.stopPropagation();
    });

    modal.appendChild(closeBtn);
    modal.appendChild(contentWrapper);
    document.body.appendChild(modal);

    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', handleEscape);
  }

  // ─── Feed de publicaciones ─────────────────────────────────────────────────

  function replyHTML(reply, store, currentUser, parentCommentId) {
    const foundUser = store?.findUserByUsername(reply.author);

    const rUser = {
      username: reply.author,
      displayName: reply.commentAuthorDisplayName || foundUser?.displayName || reply.author,
      avatarDataUrl: reply.commentAuthorAvatar || foundUser?.avatarDataUrl || ''
    };

    const liked = Array.isArray(reply.likes) ? reply.likes.includes(currentUser.username) : false;

    return `
      <div class="flex space-x-3 reply-item mb-2" data-comment-id="${reply.id}">
        ${avatarHTML(rUser, 'w-6 h-6 text-xs')}

        <div class="flex-1 min-w-0">
          <div class="bg-slate-50 dark:bg-slate-800/70 border border-slate-100 dark:border-slate-700 rounded-xl rounded-tl-none px-3 py-2">
            <div class="leading-tight mb-1">
              <p class="comment-display-name font-bold text-xs text-slate-900 dark:text-white">
                ${sanitize(rUser.displayName)}
              </p>
              <p class="comment-username text-[11px] text-slate-500 dark:text-slate-400">
                @${sanitize(rUser.username)}
              </p>
            </div>

            <p class="text-xs text-slate-800 dark:text-slate-200 mt-0.5 break-words">
              ${sanitize(reply.text)}
            </p>
          </div>

          <div class="flex items-center space-x-4 mt-1 text-[11px] text-slate-500 dark:text-slate-400 font-medium">
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
    const foundUser = store?.findUserByUsername(comment.author);

    const cUser = {
      username: comment.author,
      displayName: comment.commentAuthorDisplayName || foundUser?.displayName || comment.author,
      avatarDataUrl: comment.commentAuthorAvatar || foundUser?.avatarDataUrl || ''
    };

    const liked = Array.isArray(comment.likes) ? comment.likes.includes(currentUser.username) : false;
    const repliesHTML = (comment.replies || []).map(reply => replyHTML(reply, store, currentUser, comment.id)).join('');

    return `
      <div class="comment-item flex space-x-3 mb-4" data-comment-id="${comment.id}">
        ${avatarHTML(cUser, 'w-8 h-8 text-sm')}

        <div class="flex-1 min-w-0">
          <div class="bg-slate-100 dark:bg-slate-800 rounded-xl rounded-tl-none px-3 py-2">
            <div class="leading-tight mb-1">
              <p class="comment-display-name font-bold text-sm text-slate-900 dark:text-white">
                ${sanitize(cUser.displayName)}
              </p>
              <p class="comment-username text-xs text-slate-500 dark:text-slate-400">
                @${sanitize(cUser.username)}
              </p>
            </div>

            <p class="text-sm text-slate-800 dark:text-slate-200 mt-0.5 break-words">
              ${sanitize(comment.text)}
            </p>
          </div>
          
          <div class="flex items-center space-x-4 mt-1 text-xs text-slate-500 dark:text-slate-400 font-medium">
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

            <button type="button" class="send-reply-btn bg-blue-500 hover:bg-blue-600 text-white rounded-xl px-3 py-1.5 text-xs transition">
              ↩
            </button>
          </div>
        </div>
      </div>`;
  }

  function postCardHTML(post, currentUser) {
    const store = window.MicroConnectApp?.userStore;
    const authorFromStore = store?.findUserByUsername(post.author);

    const author = {
      username: post.author,
      displayName: post.authorDisplayName || authorFromStore?.displayName || post.author,
      avatarDataUrl: post.authorAvatar || authorFromStore?.avatarDataUrl || ''
    };

    const createdAt = post.createdAt || new Date().toISOString();
    const postTimeText = timeAgo(createdAt);
    const liked = Array.isArray(post.likes) ? post.likes.includes(currentUser.username) : false;
    const isOwner = post.author === currentUser.username;

    const mediaDataUrl = getPostMediaData(post);

    const mediaHTML = mediaDataUrl
      ? post.mediaType === 'video'
        ? `<video 
            src="${mediaDataUrl}" 
            controls
            class="post-media-preview w-full rounded-xl max-h-72 mt-3 object-cover bg-black cursor-pointer"
            title="Click para ver video completo">
          </video>`
        : `<img 
            src="${mediaDataUrl}" 
            class="post-media-preview w-full rounded-xl max-h-72 mt-3 object-cover cursor-pointer"
            alt="Imagen de publicación"
            title="Click para ver imagen completa" />`
      : '';

    const commentsHTML = (post.comments || []).map(c => commentHTML(c, store, currentUser)).join('');

    return `
      <article class="post-card bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-3" data-post-id="${post.id}">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            ${avatarHTML(author)}
            <div>
              <p class="font-semibold leading-tight text-slate-900 dark:text-slate-100">
                ${sanitize(author.displayName || author.username)}
              </p>
              <p class="text-xs text-slate-500 dark:text-slate-400">
                @${sanitize(author.username)} · ${postTimeText}
              </p>
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

            <button type="button" class="send-comment-btn bg-blue-500 hover:bg-blue-600 text-white rounded-xl px-3 py-2 text-sm transition">
              ↩
            </button>
          </div>
        </div>
      </article>`;
  }

  function bindPostCard(card, currentUser) {
    function updateCommentCounter(post) {
      const countSpan = card.querySelector('.comment-toggle-btn span');

      if (countSpan && post) {
        countSpan.textContent = countPostComments(post);
      }
    }

    card.querySelectorAll('.post-media-preview').forEach(mediaElement => {
      mediaElement.addEventListener('click', event => {
        event.preventDefault();
        event.stopPropagation();

        const mediaSrc = mediaElement.currentSrc || mediaElement.src;
        const mediaType = mediaElement.tagName.toLowerCase() === 'video' ? 'video' : 'image';

        openMediaViewer(mediaSrc, mediaType);
      });
    });

    function bindCommentReplies(commentItem) {
      const replyForm = commentItem.querySelector('.reply-form');
      const replyInput = commentItem.querySelector('.reply-input');
      const sendReplyBtn = commentItem.querySelector('.send-reply-btn');
      const repliesList = commentItem.querySelector('.comment-replies');

      commentItem.addEventListener('click', event => {
        const likeBtn = event.target.closest('.like-comment-btn');

        if (likeBtn) {
          const hotPostId = card.dataset.postId;
          const targetCommentId = likeBtn.dataset.commentId;
          const updatedTarget = toggleCommentLike(hotPostId, targetCommentId, currentUser.username);

          if (updatedTarget) {
            const liked = updatedTarget.likes.includes(currentUser.username);

            likeBtn.innerHTML = `<span>${liked ? '❤️' : '🤍'}</span> <span class="like-count">${updatedTarget.likes.length}</span>`;

            if (liked) {
              likeBtn.classList.add('text-red-500', 'font-bold');
            } else {
              likeBtn.classList.remove('text-red-500', 'font-bold');
            }
          }

          return;
        }

        const replyBtn = event.target.closest('.reply-comment-btn');

        if (replyBtn) {
          replyForm?.classList.remove('hidden');
          replyInput?.focus();

          const replyCard = replyBtn.closest('.reply-item');

          if (replyCard) {
            const usernameElement = replyCard.querySelector('.comment-username');
            const authorName = usernameElement ? usernameElement.textContent.trim() : '';

            if (authorName && !replyInput.value.includes(authorName)) {
              replyInput.value = `${authorName} ` + replyInput.value;
            }
          }
        }
      });

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

      replyInput?.addEventListener('keydown', event => {
        if (event.key === 'Enter') {
          event.preventDefault();
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

    card.querySelector('.comment-input')?.addEventListener('keydown', event => {
      if (event.key === 'Enter') {
        event.preventDefault();
        card.querySelector('.send-comment-btn')?.click();
      }
    });

    card.querySelector('.delete-post-btn')?.addEventListener('click', async () => {
      if (!confirm('¿Eliminar esta publicación?')) return;

      const deleteBtn = card.querySelector('.delete-post-btn');
      const currentPostId = card.dataset.postId;

      if (deleteBtn) {
        deleteBtn.disabled = true;
        deleteBtn.textContent = '⌛';
        deleteBtn.classList.add('opacity-50', 'cursor-not-allowed');
      }

      const result = await deletePost(currentPostId, currentUser.username);

      if (result.success) {
        card.remove();
      } else {
        alert(result.message || 'No se pudo eliminar la publicación.');

        if (deleteBtn) {
          deleteBtn.disabled = false;
          deleteBtn.textContent = '🗑';
          deleteBtn.classList.remove('opacity-50', 'cursor-not-allowed');
        }
      }
    });
  }

  function renderFeed(container, currentUser) {
    const posts = getPosts();

    if (posts.length === 0) {
      container.innerHTML = `<p class="text-slate-400 text-center py-10">Aún no hay publicaciones. ¡Sé el primero!</p>`;
      return;
    }

    container.innerHTML = posts.map(post => postCardHTML(post, currentUser)).join('');

    container.querySelectorAll('.post-card').forEach(card => {
      bindPostCard(card, currentUser);
    });
  }

  window.MicroConnectHomeShared = {
    getCurrentUser,
    sanitize,
    timeAgo,
    createId,
    getPosts,
    savePosts,
    addPost,
    toggleLike,
    toggleCommentLike,
    addComment,
    addReply,
    deletePost,
    countPostComments,
    avatarHTML,
    renderSidebarUser,
    postCardHTML,
    bindPostCard,
    renderFeed,
    openMediaViewer
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
            <button id="removeMediaBtn" type="button" class="text-xs text-red-400 hover:underline mt-1">✕ Quitar archivo</button>
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
      pendingMedia = {
        dataUrl,
        type
      };

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

      const imageInput = document.getElementById('postImageInput');
      const videoInput = document.getElementById('postVideoInput');

      if (imageInput) imageInput.value = '';
      if (videoInput) videoInput.value = '';

      const preview = document.getElementById('mediaPreview');

      if (preview) preview.innerHTML = '';
    }

    document.getElementById('removeMediaBtn')?.addEventListener('click', clearMedia);

    function handleFileInput(input, type) {
      input?.addEventListener('change', () => {
        const file = input.files[0];

        if (!file) return;

        const isImage = type === 'image';
        const isVideo = type === 'video';

        if (isImage && !['image/png', 'image/jpeg', 'image/gif', 'image/webp'].includes(file.type)) {
          alert('Solo se permiten imágenes PNG, JPG, GIF o WEBP.');
          input.value = '';
          return;
        }

        if (isVideo && !['video/mp4', 'video/webm', 'video/ogg'].includes(file.type)) {
          alert('Solo se permiten videos MP4, WEBM u OGG.');
          input.value = '';
          return;
        }

        if (file.size > 20 * 1024 * 1024) {
          alert('El archivo supera los 20 MB.');
          input.value = '';
          return;
        }

        const otherInput = type === 'image'
          ? document.getElementById('postVideoInput')
          : document.getElementById('postImageInput');

        if (otherInput) otherInput.value = '';

        const reader = new FileReader();

        reader.onload = event => {
          showMediaPreview(event.target.result, type);
        };

        reader.readAsDataURL(file);
      });
    }

    handleFileInput(document.getElementById('postImageInput'), 'image');
    handleFileInput(document.getElementById('postVideoInput'), 'video');

    document.getElementById('publishBtn')?.addEventListener('click', () => {
      const textInput = document.getElementById('postText');
      const text = textInput?.value.trim();
      const errEl = document.getElementById('postError');

      if (!text && !pendingMedia) {
        errEl.textContent = 'Escribe algo o adjunta una imagen/video.';
        errEl.classList.remove('hidden');
        return;
      }

      errEl.classList.add('hidden');

      const nuevoPostCreado = addPost(
        user.username,
        text,
        pendingMedia?.dataUrl || '',
        pendingMedia?.type || ''
      );

      if (textInput) textInput.value = '';

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

  function renderNotificacionesLoading() {
    return `<div class="max-w-xl mx-auto"><p class="text-slate-400 text-center py-10">Cargando notificaciones...</p></div>`;
  }

  function notificationMeta(tipo) {
    if (tipo === 'like_post') return { texto: 'le dio like a tu publicación', icono: '❤️' };
    if (tipo === 'like_comment') return { texto: 'le dio like a tu comentario', icono: '❤️' };
    if (tipo === 'comentario_post') return { texto: 'comentó tu publicación', icono: '💬' };
    if (tipo === 'respuesta_comentario') return { texto: 'respondió tu comentario', icono: '💬' };

    return { texto: 'interactuó contigo', icono: '🔔' };
  }

  function notificationCardHTML(notif) {
    const usuario = notif.usuario || {};
    const nombre = sanitize(usuario.nombre || 'alguien');
    const userParaAvatar = {
      username: usuario.nombre,
      displayName: usuario.nombre,
      avatarDataUrl: usuario.foto || ''
    };

    const { texto, icono } = notificationMeta(notif.tipo);
    const contenido = sanitize(notif.contenido || '');

    return `
      <div class="flex items-start gap-3 p-4 rounded-2xl bg-blue-50 dark:bg-slate-900 border border-blue-100 dark:border-slate-800">
        ${avatarHTML(userParaAvatar, 'w-10 h-10 text-base')}
        <div class="min-w-0 flex-1">
          <p class="text-sm text-slate-700 dark:text-slate-200 leading-snug">
            <span class="mr-1">${icono}</span><strong>@${nombre}</strong> ${texto}
          </p>
          ${contenido ? `<p class="text-sm text-slate-400 dark:text-slate-500 mt-1 truncate">"${contenido}"</p>` : ''}
          <p class="text-xs text-slate-400 dark:text-slate-500 mt-1">${timeAgo(notif.fecha)}</p>
        </div>
      </div>`;
  }

  function renderNotificacionesHeader(total) {
    const etiqueta = total === 1 ? '1 notificación' : `${total} notificaciones`;

    return `
      <div class="flex items-center justify-between mb-4">
        <p class="text-slate-500 dark:text-slate-400 text-sm">${etiqueta}</p>
        ${total > 0 ? `<button id="btnLimpiarNotificaciones" class="text-red-500 hover:text-red-600 text-sm font-semibold transition">Limpiar todo</button>` : ''}
      </div>`;
  }

  async function fetchNotificaciones() {
    try {
      const respuesta = await fetch('obtenerNotificaciones.php');
      const resultado = await respuesta.json();

      if (resultado.status === 'success') return resultado.data;

      console.warn('No se pudieron obtener notificaciones:', resultado.message);
      return [];
    } catch (error) {
      console.error('Error de red al consultar notificaciones:', error);
      return null;
    }
  }

  function updateNotificationsBadge(notificaciones) {
    const badge = document.getElementById('badgeNotificaciones');

    if (!badge) return;

    const noLeidas = Array.isArray(notificaciones)
      ? notificaciones.filter(notif => notif.leido === 0).length
      : 0;

    if (noLeidas > 0) {
      badge.textContent = noLeidas;
      badge.classList.remove('hidden');
    } else {
      badge.classList.add('hidden');
    }
  }

  async function mountNotificaciones(container) {
    container.innerHTML = renderNotificacionesLoading();

    const notificaciones = await fetchNotificaciones();

    updateNotificationsBadge(notificaciones);

    if (notificaciones === null) {
      container.innerHTML = `<div class="max-w-xl mx-auto"><p class="text-red-400 text-center py-10">No se pudieron cargar las notificaciones.</p></div>`;
      return;
    }

    if (notificaciones.length === 0) {
      container.innerHTML = `
        <div class="max-w-xl mx-auto">
          ${renderNotificacionesHeader(0)}
          <p class="text-slate-400 text-center py-10">No tienes notificaciones nuevas.</p>
        </div>`;
      return;
    }

    const tarjetas = notificaciones.map(notificationCardHTML).join('');

    container.innerHTML = `
      <div class="max-w-xl mx-auto">
        ${renderNotificacionesHeader(notificaciones.length)}
        <div class="space-y-3">${tarjetas}</div>
      </div>`;

    document.getElementById('btnLimpiarNotificaciones')?.addEventListener('click', async event => {
      const boton = event.currentTarget;

      boton.disabled = true;
      boton.textContent = 'Limpiando...';

      try {
        await fetch('limpiarNotificaciones.php', { method: 'POST' });
      } catch (error) {
        console.error('Error al limpiar notificaciones:', error);
      }

      mountNotificaciones(container);
    });
  }

  async function refreshNotificationsBadge() {
    const notificaciones = await fetchNotificaciones();

    if (notificaciones !== null) updateNotificationsBadge(notificaciones);
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
    document.getElementById('themeSelect')?.addEventListener('change', event => {
      window.MicroConnectApp.setTheme(event.target.value);
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

    const titles = {
      inicio: 'Inicio',
      notificaciones: 'Notificaciones',
      perfil: 'Mi Perfil',
      configuracion: 'Configuración'
    };

    title.textContent = titles[tabName] || tabName;

    switch (tabName) {
      case 'inicio':
        content.innerHTML = user ? renderInicio(user) : '';
        if (user) bindInicio(user);
        break;

      case 'notificaciones':
        mountNotificaciones(content);
        break;

      case 'perfil':
        if (!user) {
          content.innerHTML = '<p>No se pudo cargar el perfil.</p>';
          break;
        }

        if (window.MicroConnectProfile?.mount) {
          window.MicroConnectProfile.mount(content, user);
        } else {
          content.innerHTML = '<p class="text-red-500">No se cargó MyProfile.js.</p>';
        }

        break;

      case 'configuracion':
        content.innerHTML = renderConfiguracion();
        bindConfiguracion();
        break;
    }
  }

  window.MicroConnectHome = {
    renderTab
  };

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
      sidebar.classList.add('is-open');
      overlay.classList.add('is-open');
      menuToggle.style.display = 'none';
      menuToggle.setAttribute('aria-expanded', 'true');
      document.body.style.overflow = 'hidden';
    }

    function closeSidebar() {
      sidebar.classList.remove('is-open');
      overlay.classList.remove('is-open');
      menuToggle.style.display = '';
      menuToggle.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
    }

    menuToggle.addEventListener('click', openSidebar);
    sidebarClose.addEventListener('click', closeSidebar);

    if (sidebarBack) {
      sidebarBack.addEventListener('click', closeSidebar);
    }

    overlay.addEventListener('click', closeSidebar);

    tabButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        if (window.innerWidth < 1024) closeSidebar();
      });
    });

    document.addEventListener('keydown', event => {
      if (event.key === 'Escape') closeSidebar();
    });

    window.addEventListener('resize', () => {
      if (window.innerWidth >= 1024) closeSidebar();
    });
  }

  // ─── Init ──────────────────────────────────────────────────────────────────

  function init() {
    const user = getCurrentUser();

    if (!user) return;

    renderSidebarUser(user);
    initMobileSidebar();

    refreshNotificationsBadge();
    setInterval(refreshNotificationsBadge, 15000);

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