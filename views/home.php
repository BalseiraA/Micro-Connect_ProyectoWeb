<?php
// 1. Validar sesión en el servidor local 
session_start();
if (!isset($_SESSION['usuario'])) {
    header("Location: ../index.php");
    exit();
}

$usuarioLoggeado = $_SESSION['usuario'];

// 2. Conectar a la base de datos 
include("../conexion.php");

// 3. Traer los datos del usuario loggeado (Nombre, Biografía, etc.) 
$queryUser = mysqli_query($conexion, "SELECT * FROM tUsuario WHERE idUsuario = '$usuarioLoggeado'");
$datosUsuario = mysqli_fetch_assoc($queryUser);

// 4. 🔥 CORREGIDO: Traemos las publicaciones haciendo un LEFT JOIN con tMultimedia y tUsuario
// para obtener la multimedia del post y la foto de perfil + apodo real del autor de la publicación
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
    // Forzamos que el ID sea tratado como un número entero real para que encaje con tu DDL
    $row['id'] = (int)$row['id'];
    
    $currentPostId = $row['id'];
    
    // Identificamos dinámicamente si la cadena Base64 corresponde a una imagen o video
    $row['mediaType'] = '';
    if (!empty($row['mediaDataUrl'])) {
        if (strpos($row['mediaDataUrl'], 'data:video/') !== false) {
            $row['mediaType'] = 'video';
        } else {
            $row['mediaType'] = 'image';
        }
    } else {
        $row['mediaDataUrl'] = ''; // Aseguramos un string vacío para el LocalStorage si no hay contenido
    }
    
    // Traer los usuarios que le dieron like a esta publicación desde MySQL
    $queryLikes = "SELECT idUsuario FROM tLikePublicacion WHERE idPublicacion = $currentPostId";
    $resultadoLikes = mysqli_query($conexion, $queryLikes);
    
    $likesArray = [];
    while ($likeRow = mysqli_fetch_assoc($resultadoLikes)) {
        $likesArray[] = $likeRow['idUsuario']; 
    }
    $row['likes'] = $likesArray;     
    
    // 🔥 CORREGIDO: Extraemos los comentarios haciendo un LEFT JOIN con tUsuario 
    // para recuperar la foto de perfil real de cada persona que comentó en este post
    $queryComentarios = "SELECT c.idUsuario as author, 
                                 c.textoComent as text, 
                                 c.fechaHoraComent as createdAt,
                                 u.fotoPerfilUs as commentAuthorAvatar
                          FROM tComentario c
                          LEFT JOIN tUsuario u ON c.idUsuario = u.idUsuario
                          WHERE c.idPublicacion = $currentPostId 
                          ORDER BY c.fechaHoraComent ASC";
    $resultadoComent = mysqli_query($conexion, $queryComentarios);
    
    $comentariosArray = [];
    while ($comentRow = mysqli_fetch_assoc($resultadoComent)) {
        // Asignamos un ID temporal al comentario para que el DOM de home.js lo maneje sin romperse
        $comentRow['id'] = "bd_" . rand(1000, 9999);
        $comentRow['replies'] = []; 
        $comentariosArray[] = $comentRow;
    }
    
    $row['comments'] = $comentariosArray;  
    $postsArray[] = $row;
}

// Convertimos los arrays de PHP a formato JSON crudo
$jsonUsuario = json_encode($datosUsuario);
$jsonPosts = json_encode($postsArray);
?>
<!doctype html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Micro-Connect | Inicio</title>
  <link rel="stylesheet" href="../assets/css/tailwind.css" />
  <link rel="stylesheet" href="../assets/css/styles.css" />
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
      <h1 class="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-violet-500 mb-8">Micro-Connect</h1>
      <div class="rounded-xl bg-slate-200 dark:bg-slate-900 p-4 mb-6">
        <p class="font-semibold">@<?php echo htmlspecialchars($usuarioLoggeado); ?></p>
      </div>
      <nav class="space-y-2" id="menuTabs" role="navigation" aria-label="Menú principal">
        <button data-tab="inicio" class="tab-btn w-full text-left px-4 py-3 rounded-xl active-tab">Inicio</button>
        <button data-tab="notificaciones" class="tab-btn w-full text-left px-4 py-3 rounded-xl">Notificaciones</button>
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
      // Sincronizamos las llaves de sesión locales que tus JS van a validar
      sessionStorage.setItem('mc_auth', 'true');
      sessionStorage.setItem('mc_user', '<?php echo $usuarioLoggeado; ?>');
      
      // Traemos la información estructurada de PHP
      const postsBase = <?php echo $jsonPosts; ?>;
      
      // 🔥 RECORTE DE CADENAS BINARIAS: Limpiamos los avatares y multimedia pesados 
      // para asegurar que el string JSON final mida apenas unos cuantos KB en el almacenamiento
      const postsLigeros = postsBase.map(post => {
          return {
              ...post,
              mediaDataUrl: '',
              authorAvatar: '',
              comments: Array.isArray(post.comments) ? post.comments.map(c => ({ ...c, commentAuthorAvatar: '' })) : []
          };
      });
      
      // 🔥 BLINDAJE ANTIBLOQUEO: Envolvemos en try/catch para que Opera jamás vuelva a colgar el renderizado
      try {
          localStorage.setItem('mc_posts', JSON.stringify(postsLigeros));
      } catch (error) {
          console.warn("⚠️ Nota: El LocalStorage está lleno, operando directamente desde la memoria de MySQL/PHP.");
      }
      
      // Interceptamos de forma segura la función findUserByUsername de tu main.js
      if (window.MicroConnectApp && window.MicroConnectApp.userStore) {
        window.MicroConnectApp.userStore.findUserByUsername = function(username) {
          const userData = <?php echo $jsonUsuario; ?>;
          
          // Caso 1: Si se están consultando los datos del usuario actualmente loggeado
          if (userData && userData.idUsuario === username) {
            return {
              username: userData.idUsuario,
              displayName: userData.nombreUs,
              bio: userData.biografiaUs,
              avatarDataUrl: userData.fotoPerfilUs || ''
            };
          }
          
          // Caso 2: Buscamos si el usuario es autor de algún post usando el array en memoria de PHP
          const postDelAutor = postsBase.find(p => p.author === username);
          if (postDelAutor) {
            return {
              username: username,
              displayName: postDelAutor.authorDisplayName || username,
              bio: '',
              avatarDataUrl: postDelAutor.authorAvatar || '' // Inyectamos su foto real de MySQL
            };
          }
          
          // Caso 3: Buscamos si el usuario es autor de algún comentario dentro de los posts
          for (const post of postsBase) {
            if (Array.isArray(post.comments)) {
              const comentarioDelAutor = post.comments.find(c => c.author === username);
              if (comentarioDelAutor) {
                return {
                  username: username,
                  displayName: username,
                  bio: '',
                  avatarDataUrl: comentarioDelAutor.commentAuthorAvatar || '' // Inyectamos su foto real de los comentarios
                };
              }
            }
          }
          
          // Caso 4: Cascarón base de respaldo
          return { 
            username: username, 
            displayName: username,
            avatarDataUrl: ''
          };
        };
      }

      // 🔥 RE-INYECCIÓN DIRECTA: Acoplamos el Base64 original de la multimedia directo al DOM
      const originalRenderFeed = window.MicroConnectHomeShared.renderFeed;
      window.MicroConnectHomeShared.renderFeed = function(container, currentUser) {
          // Ejecutamos el flujo de dibujado de tarjetas normal de la SPA
          originalRenderFeed(container, currentUser);
          
          // Recorremos las tarjetas inyectadas en el HTML y les devolvemos la imagen o video real
          postsBase.forEach(post => {
              if (post.mediaDataUrl) {
                  const tarjeta = container.querySelector(`[data-post-id="${post.id}"]`);
                  if (tarjeta) {
                      const imgElement = tarjeta.querySelector('img.w-full');
                      const videoElement = tarjeta.querySelector('video.w-full');
                      
                      if (imgElement) imgElement.src = post.mediaDataUrl;
                      if (videoElement) videoElement.src = post.mediaDataUrl;
                  }
              }
          });
      };
    })();
  </script>

  <script defer src="../assets/js/home.js"></script>
  <script defer src="../assets/js/myProfile.js"></script>
</body>
</html>