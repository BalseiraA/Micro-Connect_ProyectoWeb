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

// 4. 🔥 CORREGIDO: Traemos las publicaciones con LEFT JOIN para jalar el contenido de tMultimedia
$queryPosts = "SELECT p.idPublicacion as id, 
                      p.idUsuario as author, 
                      p.contenidoTextoPub as text, 
                      p.fechaHoraPub as createdAt,
                      m.urlMult as mediaDataUrl
               FROM tPublicacion p 
               LEFT JOIN tMultimedia m ON p.idMultimedia = m.idMultimedia
               ORDER BY p.fechaHoraPub DESC";
$resultadoPosts = mysqli_query($conexion, $queryPosts);

$postsArray = [];
while ($row = mysqli_fetch_assoc($resultadoPosts)) {
    // Forzamos que el ID sea tratado como un número entero real para que encaje con tu DDL
    $row['id'] = (int)$row['id'];
    
    $currentPostId = $row['id'];
    
    // 🔥 NUEVO: Identificamos dinámicamente si la cadena Base64 corresponde a una imagen o video
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
        $likesArray[] = $likeRow['idUsuario']; // Almacenamos solo los strings de los nombres de usuario
    }
    $row['likes'] = $likesArray;     
    
    // Extraemos los comentarios de esta publicación desde MySQL usando tu DDLv2
    $queryComentarios = "SELECT idUsuario as author, textoComent as text, fechaHoraComent as createdAt 
                         FROM tComentario 
                         WHERE idPublicacion = $currentPostId 
                         ORDER BY fechaHoraComent ASC";
    $resultadoComent = mysqli_query($conexion, $queryComentarios);
    
    $comentariosArray = [];
    while ($comentRow = mysqli_fetch_assoc($resultadoComent)) {
        // Asignamos un ID temporal al comentario para que el DOM de home.js lo maneje sin romperse
        $comentRow['id'] = "bd_" . rand(1000, 9999);
        $comentRow['replies'] = []; 
        $comentariosArray[] = $comentRow;
    }
    
    // Inyectamos los comentarios recuperados en vez de dejar el array vacío
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
      
      // Se inyecta el JSON directo sin envolverlo en otra codificación de texto
      const postsRaw = JSON.stringify(<?php echo $jsonPosts; ?>);
      localStorage.setItem('mc_posts', postsRaw);
      
      // Interceptamos de forma segura la función findUserByUsername de tu main.js
      if (window.MicroConnectApp && window.MicroConnectApp.userStore) {
        window.MicroConnectApp.userStore.findUserByUsername = function(username) {
          const userData = <?php echo $jsonUsuario; ?>;
          
          // Si tu home.js busca al usuario activo, le regresamos los datos reales de la BD
          if (userData && userData.idUsuario === username) {
            return {
              username: userData.idUsuario,
              displayName: userData.nombreUs,
              bio: userData.biografiaUs,
              avatarDataUrl: userData.fotoPerfilUs || ''
            };
          }
          
          // Si busca a otros usuarios del feed, devolvemos un cascarón base para que la SPA no falle
          return { 
            username: username, 
            displayName: username,
            avatarDataUrl: ''
          };
        };
      }
    })();
  </script>

  <script defer src="../assets/js/home.js"></script>
  <script defer src="../assets/js/myProfile.js"></script>
</body>
</html>