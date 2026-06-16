<?php
// 1. Iniciar el motor de sesiones de forma segura y evitar el caché del navegador
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

header("Cache-Control: no-store, no-cache, must-revalidate, max-age=0");
header("Cache-Control: post-check=0, pre-check=0", false);
header("Pragma: no-cache");
header("Expires: Sat, 01 Jan 2000 00:00:00 GMT");

// 2. Control de Cierre de Sesión (Logout)
if (isset($_GET['logout'])) {
    $_SESSION = [];

    if (ini_get("session.use_cookies")) {
        $params = session_get_cookie_params();
        setcookie(
            session_name(),
            '',
            time() - 42000,
            $params["path"],
            $params["domain"],
            $params["secure"],
            $params["httponly"]
        );
    }

    session_destroy();
    header("Location: ../index.php", true, 303);
    exit();
}

// 3. Control de Seguridad: Si no hay usuario activo, mandarlo de vuelta al login
if (!isset($_SESSION['usuario'])) {
    header("Location: ../index.php", true, 303);
    exit();
}

$usuarioLoggeado = $_SESSION['usuario'];
$idUsuarioLoggeado = $usuarioLoggeado; // Homologamos ambas variables para evitar conflictos en las consultas

// 4. Conectar a la base de datos 
include("../conexion.php");

// 3. Traer los datos del usuario loggeado
$queryUser = mysqli_query($conexion, "SELECT * FROM tUsuario WHERE idUsuario = '$usuarioLoggeado'");
$datosUsuario = mysqli_fetch_assoc($queryUser);

// 4. Traer publicaciones
$queryPosts = "SELECT p.idPublicacion as id, 
                      p.idUsuario as author, 
                      p.contenidoTextoPub as text, 
                      p.fechaHoraPub as createdAt,
                      m.urlMult as mediaDataUrl,
                      u.nombreUs as authorDisplayName,
                      u.fotoPerfilUs as authorAvatar
               FROM tPublicacion p 
               LEFT JOIN tMultimedia m ON p.idMultimedia = m.idMultimedia
               LEFT JOIN tUsuario u ON p.idUsuario = u.idUsuario
               ORDER BY p.fechaHoraPub DESC";
$resultadoPosts = mysqli_query($conexion, $queryPosts);

$postsArray = [];

while ($row = mysqli_fetch_assoc($resultadoPosts)) {
    $row['id'] = (int)$row['id'];
    $currentPostId = $row['id'];
    $row['mediaType'] = '';

    if (!empty($row['mediaDataUrl'])) {
        if (strpos($row['mediaDataUrl'], 'data:video/') !== false) {
            $row['mediaType'] = 'video';
        } else {
            $row['mediaType'] = 'image';
        }
    } else {
        $row['mediaDataUrl'] = '';
    }

    // Likes de la publicación
    $queryLikes = "SELECT idUsuario FROM tLikePublicacion WHERE idPublicacion = $currentPostId";
    $resultadoLikes = mysqli_query($conexion, $queryLikes);

    $likesArray = [];

    while ($likeRow = mysqli_fetch_assoc($resultadoLikes)) {
        $likesArray[] = $likeRow['idUsuario'];
    }

    $row['likes'] = $likesArray;

    // Comentarios y respuestas
    $queryComentarios = "SELECT c.idComentario as id, 
                            c.idComentarioPadre as parentId,
                            c.idUsuario as author, 
                            c.textoComent as text, 
                            c.fechaHoraComent as createdAt,
                            u.nombreUs as commentAuthorDisplayName,
                            u.fotoPerfilUs as commentAuthorAvatar
                      FROM tComentario c
                      LEFT JOIN tUsuario u ON c.idUsuario = u.idUsuario
                      WHERE c.idPublicacion = $currentPostId 
                      ORDER BY c.fechaHoraComent ASC";

    $resultadoComent = mysqli_query($conexion, $queryComentarios);

    $comentariosPrincipales = [];
    $respuestas = [];

    while ($comentRow = mysqli_fetch_assoc($resultadoComent)) {
        $comentRow['id'] = (int)$comentRow['id'];
        $commentId = $comentRow['id'];
        $queryLikesComent = "SELECT idUsuario FROM tLikeComentario WHERE idComentario = $commentId";
        $resultadoLikesComent = mysqli_query($conexion, $queryLikesComent);

        $likesComentArray = [];

        while ($likeRow = mysqli_fetch_assoc($resultadoLikesComent)) {
            $likesComentArray[] = $likeRow['idUsuario'];
        }

        $comentRow['likes'] = $likesComentArray;
        $comentRow['replies'] = [];

        if (is_null($comentRow['parentId'])) {
            $comentariosPrincipales[$commentId] = $comentRow;
        } else {
            $respuestas[] = $comentRow;
        }
    }
    foreach ($respuestas as $respuesta) {
        $idPadre = $respuesta['parentId'];

        if (isset($comentariosPrincipales[$idPadre])) {
            $comentariosPrincipales[$idPadre]['replies'][] = $respuesta;
        }
    }
    $row['comments'] = array_values($comentariosPrincipales);
    $postsArray[] = $row;
}

$jsonUsuario = json_encode($datosUsuario, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
$jsonPosts = json_encode($postsArray, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
$jsonUsuarioLoggeado = json_encode($usuarioLoggeado, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
?>
<!doctype html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Micro-Connect | Inicio</title>
  <link class="styles" rel="stylesheet" href="../assets/css/tailwind.css" />
  <link class="styles" rel="stylesheet" href="../assets/css/styles.css" />
  <style>
    .active-tab { background-color: rgb(226 232 240); color: rgb(15 23 42); font-weight: 600; }
    .dark .active-tab { background-color: rgb(39 39 42); color: rgb(248 250 252); }
  </style>
</head>

<body class="bg-slate-100 text-slate-900" data-font-size="16">
  <div class="min-h-screen lg:grid lg:grid-cols-[300px_1fr]">
    <button id="menuToggle" aria-label="Abrir menú" class="hamburger-btn">☰</button>
    <div id="sidebarOverlay" class="sidebar-overlay"></div>

    <aside id="sidebar" class="border-r border-slate-300 p-4 bg-slate-50 dark:bg-slate-950 dark:border-slate-800">
      <div class="sidebar-close-bar">
        <button id="sidebarClose" aria-label="Cerrar menú">✕</button>
      </div>

      <h1 class="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-violet-500 mb-8">
        Micro-Connect
      </h1>

      <div class="rounded-xl bg-slate-200 dark:bg-slate-900 p-4 mb-6">
        <p class="font-semibold">@<?php echo htmlspecialchars($usuarioLoggeado, ENT_QUOTES, 'UTF-8'); ?></p>
      </div>

      <nav class="space-y-2" id="menuTabs" role="navigation" aria-label="Menú principal">
        <button data-tab="inicio" class="tab-btn w-full text-left px-4 py-3 rounded-xl active-tab">Inicio</button>

        <button data-tab="notificaciones" class="tab-btn w-full flex items-center justify-between px-4 py-3 rounded-xl">
          <span>Notificaciones</span>
          <span id="badgeNotificaciones" class="hidden bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full animate-pulse">0</span>
        </button>

        <button data-tab="perfil" class="tab-btn w-full text-left px-4 py-3 rounded-xl">Mi Perfil</button>
        <button data-tab="configuracion" class="tab-btn w-full text-left px-4 py-3 rounded-xl">Configuración</button>
      </nav>
    </aside>

    <main class="p-4 sm:p-6 lg:p-8">
      <h2 id="screenTitle" class="text-3xl font-bold mb-6">Inicio</h2>
      <section id="mainContent"></section>
    </main>
  </div>

  <script src="../assets/js/main.js"></script>
  <script src="../assets/js/login.js"></script>

  <script>
    (function() {
      sessionStorage.setItem('mc_auth', 'true');
      sessionStorage.setItem('mc_user', <?php echo $jsonUsuarioLoggeado; ?>);

      const postsBase = <?php echo $jsonPosts; ?>;
      window.__MICROCONNECT_POSTS_BASE__ = postsBase;

      const postsLigeros = postsBase.map(post => {
        const comentariosLimpios = (post.comments || []).map(c => {
          const respuestasLimpias = (c.replies || []).map(r => ({
            ...r,
            commentAuthorAvatar: ''
          }));

          return {
            ...c,
            commentAuthorAvatar: '',
            replies: respuestasLimpias
          };
        });

        return {
          id: post.id,
          author: post.author,
          text: post.text,
          createdAt: post.createdAt,
          mediaType: post.mediaType,
          likes: post.likes || [],
          comments: comentariosLimpios,
          authorDisplayName: post.authorDisplayName || post.author,

          // IMPORTANTE:
          // Se conserva la imagen/video Base64 para que home.js pueda crear el <img> o <video>.
          mediaDataUrl: post.mediaDataUrl || '',

          // Evitamos cargar avatares pesados en localStorage.
          authorAvatar: ''
        };
      });

      try {
        localStorage.setItem('mc_posts', JSON.stringify(postsLigeros));
      } catch (error) {
        console.warn('⚠️ LocalStorage lleno. Algunas publicaciones con multimedia podrían no persistir localmente.', error);
      }

      if (window.MicroConnectApp && window.MicroConnectApp.userStore) {
        window.MicroConnectApp.userStore.findUserByUsername = function(username) {
          const userData = <?php echo $jsonUsuario; ?>;

          if (userData && userData.idUsuario === username) {
            return {
              username: userData.idUsuario,
              displayName: userData.nombreUs || userData.idUsuario,
              email: userData.correoElectronicoUs || '',
              birthDate: userData.fechaNacimiento || '',
              bio: userData.biografiaUs || '',
              avatarDataUrl: userData.fotoPerfilUs || ''
            };
          }

          const postDelAutor = postsBase.find(p => p.author === username);

          if (postDelAutor) {
            return {
              username: username,
              displayName: postDelAutor.authorDisplayName || username,
              email: '',
              birthDate: '',
              bio: '',
              avatarDataUrl: postDelAutor.authorAvatar || ''
            };
          }

          for (const post of postsBase) {
            if (Array.isArray(post.comments)) {
              const comentariosYRespuestas = [];

              post.comments.forEach(c => {
                comentariosYRespuestas.push(c);

                if (Array.isArray(c.replies)) {
                  c.replies.forEach(r => comentariosYRespuestas.push(r));
                }
              });

              const comentarioDelAutor = comentariosYRespuestas.find(c => c.author === username);

              if (comentarioDelAutor) {
                return {
                  username: username,
                  displayName: comentarioDelAutor.commentAuthorDisplayName || username,
                  email: '',
                  birthDate: '',
                  bio: '',
                  avatarDataUrl: comentarioDelAutor.commentAuthorAvatar || ''
                };
              }
            }
          }

          return {
            username,
            displayName: username,
            email: '',
            birthDate: '',
            bio: '',
            avatarDataUrl: ''
          };
        };
      }

      const acoplarInterceptores = () => {
        if (window.MicroConnectHomeShared && window.MicroConnectHomeShared.renderFeed) {
          const originalRenderFeed = window.MicroConnectHomeShared.renderFeed;

          window.MicroConnectHomeShared.renderFeed = function(container, currentUser) {
            originalRenderFeed(container, currentUser);

            postsBase.forEach(post => {
              const tarjeta = container.querySelector(`[data-post-id="${post.id}"]`);

              if (!tarjeta) return;

              if (post.mediaDataUrl) {
                const imgElement = tarjeta.querySelector('img.w-full');
                const videoElement = tarjeta.querySelector('video.w-full');

                if (imgElement) imgElement.src = post.mediaDataUrl;
                if (videoElement) videoElement.src = post.mediaDataUrl;
              }

              if (post.authorAvatar) {
                const avatarContenedor = container.querySelector(`[data-post-id="${post.id}"] .flex.items-center.gap-3`);

                if (avatarContenedor) {
                  const imgAvatar = avatarContenedor.querySelector('img');

                  if (imgAvatar) {
                    imgAvatar.src = post.authorAvatar;
                  } else {
                    const circuloInicial = avatarContenedor.querySelector('div.rounded-full');

                    if (circuloInicial) {
                      circuloInicial.outerHTML = `<img src="${post.authorAvatar}" class="w-10 h-10 rounded-full object-cover border border-slate-200 dark:border-slate-700" />`;
                    }
                  }
                }
              }
            });
          };
        }
      };

      acoplarInterceptores();
      document.addEventListener('DOMContentLoaded', acoplarInterceptores);
    })();
  </script>

  <script>
    (function() {
      const SESSION_USER_KEY = 'mc_user';
      const SESSION_AUTH_KEY = 'mc_auth';
      const SESSION_LOGIN_TIME_KEY = 'mc_login_at';

      function hasClientSession() {
        return sessionStorage.getItem(SESSION_AUTH_KEY) === 'true' &&
          !!sessionStorage.getItem(SESSION_USER_KEY);
      }

      function clearClientSession() {
        sessionStorage.removeItem(SESSION_USER_KEY);
        sessionStorage.removeItem(SESSION_AUTH_KEY);
        sessionStorage.removeItem(SESSION_LOGIN_TIME_KEY);
      }

      window.addEventListener('pageshow', function() {
        if (!hasClientSession()) {
          window.location.replace('../index.php');
        }
      });

      document.addEventListener('click', function(event) {
        const logoutBtn = event.target.closest('#logoutBtn');

        if (!logoutBtn) return;

        event.preventDefault();
        event.stopImmediatePropagation();

        clearClientSession();
        window.location.replace('home.php?logout=1');
      }, true);
    })();
  </script>

  <script defer src="../assets/js/home.js"></script>
  <script defer src="../assets/js/myProfile.js"></script>
</body>
</html>