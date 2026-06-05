<?php
// 1. Iniciamos sesión y evitamos que el navegador guarde esta pantalla en cache
session_start();

header("Cache-Control: no-store, no-cache, must-revalidate, max-age=0");
header("Cache-Control: post-check=0, pre-check=0", false);
header("Pragma: no-cache");
header("Expires: Sat, 01 Jan 2000 00:00:00 GMT");

if (isset($_SESSION['usuario']) && $_SERVER["REQUEST_METHOD"] !== "POST") {
    header("Location: ./views/home.php", true, 303);
    exit();
}

// 2. Conectamos con la base de datos (están en la misma carpeta raíz)
include("conexion.php");

$mensajeError = "";

// 3. Detectamos si el usuario envió el formulario mediante método POST
if ($_SERVER["REQUEST_METHOD"] == "POST") {
    
    // Sanitizamos el input del usuario para prevenir inyección SQL
    $idUsuario = mysqli_real_escape_string($conexion, $_POST['username']);
    $passwordPlain = $_POST['password'];

    // 4. Buscamos al usuario en la tabla tUsuario
    $consulta = "SELECT idUsuario, contraseñaUs FROM tUsuario WHERE idUsuario = '$idUsuario'";
    $resultado = mysqli_query($conexion, $consulta);

    if (mysqli_num_rows($resultado) > 0) {
        // Si el usuario existe, extraemos sus valores
        $usuario = mysqli_fetch_assoc($resultado);
        
        // 5. Verificamos la contraseña ingresada contra el Hash de Bcrypt guardado
        if (password_verify($passwordPlain, $usuario['contraseñaUs'])) {
            
            // ¡Credenciales correctas! Regeneramos el ID y guardamos la sesión en el servidor
            session_regenerate_id(true);
            $_SESSION['usuario'] = $usuario['idUsuario'];
            
            // Redirigimos al Home dinámico que ya tienes dentro de views/
            header("Location: ./views/home.php", true, 303);
            exit();
            
        } else {
            $mensajeError = "La contraseña introducida es incorrecta.";
        }
    } else {
        $mensajeError = "El nombre de usuario no está registrado.";
    }
}
?>
<!doctype html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />

  <title>Micro-Connect | Iniciar sesión</title>

  <link rel="stylesheet" href="./assets/css/tailwind.css" />
  <link rel="stylesheet" href="./assets/css/styles.css" />

  <style>
    body.login-bg {
      position: relative;
      min-height: 100vh;
      overflow: hidden;
      isolation: isolate;
      background:
        radial-gradient(circle at 20% 20%, rgba(37, 99, 235, 0.28), transparent 34%),
        radial-gradient(circle at 80% 25%, rgba(124, 58, 237, 0.26), transparent 32%),
        radial-gradient(circle at 50% 85%, rgba(14, 165, 233, 0.24), transparent 38%),
        linear-gradient(135deg, #eef6ff 0%, #f5f3ff 42%, #ecfeff 100%) !important;
    }

    body.login-bg main {
      background: transparent !important;
    }

    .liquid-bg {
      position: fixed;
      inset: 0;
      pointer-events: none;
      overflow: hidden;
      z-index: 0;
    }

    .liquid-bg::before,
    .liquid-bg::after,
    .liquid-orb {
      content: "";
      position: absolute;
      display: block;
      border-radius: 9999px;
      filter: blur(28px);
      opacity: 0.9;
      animation: liquidFloat 14s ease-in-out infinite alternate;
    }

    .liquid-bg::before {
      width: 560px;
      height: 560px;
      left: 8%;
      top: 12%;
      background:
        radial-gradient(circle at 35% 35%, rgba(59, 130, 246, 0.75), transparent 58%),
        radial-gradient(circle at 70% 70%, rgba(14, 165, 233, 0.55), transparent 64%);
    }

    .liquid-bg::after {
      width: 520px;
      height: 520px;
      right: 10%;
      bottom: 8%;
      background:
        radial-gradient(circle at 40% 40%, rgba(168, 85, 247, 0.70), transparent 58%),
        radial-gradient(circle at 70% 65%, rgba(99, 102, 241, 0.50), transparent 64%);
      animation-duration: 18s;
    }

    .orb-one {
      width: 420px;
      height: 420px;
      left: 28%;
      bottom: 10%;
      background:
        radial-gradient(circle at 30% 30%, rgba(45, 212, 191, 0.55), transparent 60%),
        radial-gradient(circle at 70% 70%, rgba(59, 130, 246, 0.40), transparent 65%);
      animation-duration: 16s;
    }

    .orb-two {
      width: 360px;
      height: 360px;
      right: 30%;
      top: 16%;
      background:
        radial-gradient(circle at 35% 35%, rgba(96, 165, 250, 0.55), transparent 60%),
        radial-gradient(circle at 70% 70%, rgba(168, 85, 247, 0.38), transparent 65%);
      animation-duration: 20s;
    }

    .liquid-bg::before,
    .liquid-bg::after,
    .orb-one,
    .orb-two {
      mix-blend-mode: multiply;
    }

    .login-card {
      position: relative;
      overflow: hidden;
      background: #ffffff !important;
      border: 1px solid rgba(226, 232, 240, 0.95);
      box-shadow:
        0 28px 80px rgba(15, 23, 42, 0.24),
        inset 0 1px 0 rgba(255, 255, 255, 0.95);
    }

    .login-card::before,
    .login-card::after {
      display: none;
      content: none;
    }

    .password-field {
      position: relative;
    }

    .password-field input {
      padding-right: 160px;
    }

    .password-toggle-btn {
      position: absolute;
      right: 8px;
      top: 50%;
      transform: translateY(-50%);
      border-radius: 8px;
      padding: 5px 10px;
      font-size: 0.76rem;
      font-weight: 700;
      color: #2563eb;
      background: transparent;
      transition:
        background-color 0.2s ease,
        color 0.2s ease,
        transform 0.15s ease;
    }

    .password-toggle-btn:hover {
      background: #eff6ff;
      color: #1d4ed8;
    }

    .password-toggle-btn:focus-visible {
      outline: none;
      box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.25);
    }

    .login-register-action {
      display: flex;
      justify-content: center;
      width: 100%;
      margin-top: 14px;
    }

    .register-link-btn {
      display: inline-flex;
      justify-content: center;
      align-items: center;
      text-align: center;
      border-radius: 10px;
      padding: 8px 12px;
      color: #2563eb;
      font-size: 0.95rem;
      font-weight: 700;
      background: transparent;
      transition:
        background-color 0.2s ease,
        color 0.2s ease,
        transform 0.15s ease;
    }

    .register-link-btn:hover {
      color: #1d4ed8;
      background: #eff6ff;
      text-decoration: underline;
      transform: translateY(-1px);
    }

    .register-link-btn:focus-visible {
      outline: none;
      box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.25);
    }

    @keyframes liquidFloat {
      0% {
        transform: translate3d(0, 0, 0) scale(1);
      }

      50% {
        transform: translate3d(46px, -34px, 0) scale(1.08);
      }

      100% {
        transform: translate3d(-32px, 30px, 0) scale(0.96);
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .liquid-bg::before,
      .liquid-bg::after,
      .liquid-orb {
        animation: none;
      }
    }

    .input-invalid {
      border-color: #dc2626;
      box-shadow: 0 0 0 2px rgb(220 38 38 / 0.2);
    }

    .input-valid {
      border-color: #16a34a;
      box-shadow: 0 0 0 2px rgb(22 163 74 / 0.2);
    }

    @media (max-width: 420px) {
      .password-field input {
        padding-right: 128px;
      }

      .password-toggle-btn {
        font-size: 0.68rem;
        padding-inline: 7px;
      }
    }
  </style>
</head>

<body class="min-h-screen login-bg text-slate-900">
  <div class="liquid-bg" aria-hidden="true">
    <span class="liquid-orb orb-one"></span>
    <span class="liquid-orb orb-two"></span>
  </div>

  <main class="relative z-10 min-h-screen grid place-items-center p-4">
    <section class="login-card w-full max-w-md rounded-2xl p-6 sm:p-8">
      <h1 class="text-3xl font-bold mb-2">Micro-Connect</h1>
      <p class="text-slate-600 mb-6">Inicia sesión para continuar.</p>

      <?php if (!empty($mensajeError)): ?>
        <div class="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 mb-4">
            <?php echo $mensajeError; ?>
        </div>
      <?php endif; ?>

      <form id="loginForm" action="" method="POST" novalidate class="space-y-4">
        <div>
          <label for="username" class="block text-sm font-medium mb-1">Usuario</label>
          <input
            id="username"
            name="username"
            type="text"
            required
            minlength="3"
            maxlength="30"
            pattern="[a-zA-Z0-9_]{3,30}"
            class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
          <p id="usernameError" class="text-sm text-red-600 mt-1 hidden"></p>
        </div>

        <div>
          <label for="password" class="block text-sm font-medium mb-1">Contraseña</label>

          <div class="password-field">
            <input
              id="password"
              name="password"
              type="password"
              required
              minlength="6"
              maxlength="50"
              class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />

            <button
              id="togglePassword"
              type="button"
              class="password-toggle-btn"
              aria-label="Mostrar contraseña"
              aria-pressed="false"
            >
              Mostrar Contraseña
            </button>
          </div>

          <p id="passwordError" class="text-sm text-red-600 mt-1 hidden"></p>
        </div>

        <button
          type="submit"
          class="w-full bg-blue-600 text-white py-2.5 rounded-lg font-semibold hover:bg-blue-700 transition"
        >
          Iniciar Sesión
        </button>

        <div class="login-register-action">
          <button
            id="goToRegister"
            type="button"
            class="register-link-btn"
          >
            Crear cuenta nueva
          </button>
        </div>

        <p id="loginError" class="text-sm text-red-600 hidden"></p>
      </form>
    </section>
  </main>

  <script src="./assets/js/main.js"></script>
  <script src="./assets/js/login.js"></script>
</body>
</html>