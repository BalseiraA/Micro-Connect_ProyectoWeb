<?php
// 1. Incluimos el archivo de conexión
include("../conexion.php");

$mensajeFeedback = ""; // Variable para mostrar errores o éxito en la interfaz

// 2. Detectamos si el usuario presionó el botón de enviar
if ($_SERVER["REQUEST_METHOD"] == "POST") {
    
    // 3. Sanitizamos los datos que vienen del formulario para evitar Inyección SQL
    $idUsuario = mysqli_real_escape_string($conexion, $_POST['username']);
    $nombreUs = mysqli_real_escape_string($conexion, $_POST['displayName']); 
    $correoElectronicoUs = mysqli_real_escape_string($conexion, $_POST['email']);
    $fechaNacimiento = mysqli_real_escape_string($conexion, $_POST['birthDate']);
    
    // Recibimos la biografía (si está vacía, la guardamos como NULL)
    $biografiaInput = trim($_POST['bio']);
    $biografiaUs = !empty($biografiaInput) ? "'" . mysqli_real_escape_string($conexion, $biografiaInput) . "'" : "NULL";

    // 🔥 4. NUEVO: Procesamos la foto de perfil en el registro (Conversión a Base64)
    $fotoPerfilUs = "NULL"; // Por defecto, si no sube nada, se queda en NULL
    if (isset($_FILES['profilePhoto']) && $_FILES['profilePhoto']['error'] == UPLOAD_ERR_OK) {
        $fileTmpPath = $_FILES['profilePhoto']['tmp_name'];
        $fileType = $_FILES['profilePhoto']['type'];
        
        // Convertimos el archivo binario a texto codificado Base64
        $data = file_get_contents($fileTmpPath);
        $base64 = 'data:' . $fileType . ';base64,' . base64_encode($data);
        $base64Escaped = mysqli_real_escape_string($conexion, $base64);
        
        $fotoPerfilUs = "'$base64Escaped'"; // Lo envolvemos en comillas para SQL
    }

    // 5. Encriptación segura de la contraseña con Bcrypt
    $passwordPlain = $_POST['password'];
    $contraseñaUs = password_hash($passwordPlain, PASSWORD_BCRYPT);
    
    // Generamos la fecha de creación con el formato de MySQL
    $fechaCreacion = date("Y-m-d");

    // 6. Validar primero si el nombre de usuario o el correo ya existen
    $verificarUsuario = mysqli_query($conexion, "SELECT idUsuario FROM tUsuario WHERE idUsuario = '$idUsuario' OR correoElectronicoUs = '$correoElectronicoUs'");
    
    if (mysqli_num_rows($verificarUsuario) > 0) {
        $mensajeFeedback = '<div class="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 mb-4">El nombre de usuario o el correo electrónico ya se encuentran registrados.</div>';
    } else {
        // 🔥 7. CORREGIDO: Cambiamos el NULL estático por nuestra variable $fotoPerfilUs
        $sql = "INSERT INTO tUsuario (idUsuario, nombreUs, biografiaUs, fotoPerfilUs, correoElectronicoUs, contraseñaUs, fechaCreacion, fechaNacimiento) 
                VALUES ('$idUsuario', '$nombreUs', $biografiaUs, $fotoPerfilUs, '$correoElectronicoUs', '$contraseñaUs', '$fechaCreacion', '$fechaNacimiento')";

        if (mysqli_query($conexion, $sql)) {
            $mensajeFeedback = '<div class="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700 mb-4">¡Cuenta creada con éxito! Ya puedes iniciar sesión.</div>';
        } else {
            $mensajeFeedback = '<div class="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 mb-4">Error en el sistema: ' . mysqli_error($conexion) . '</div>';
        }
    }
}
?>
<!doctype html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />

  <title>Micro-Connect | Registro de usuario</title>

  <link rel="stylesheet" href="../assets/css/tailwind.css" />
  <link rel="stylesheet" href="../assets/css/styles.css" />

  <style>
    body.register-bg {
      position: relative;
      min-height: 100vh;
      overflow-x: hidden;
      background:
        radial-gradient(circle at 18% 20%, rgba(37, 99, 235, 0.34), transparent 34%),
        radial-gradient(circle at 82% 25%, rgba(124, 58, 237, 0.30), transparent 32%),
        radial-gradient(circle at 52% 82%, rgba(14, 165, 233, 0.26), transparent 38%),
        linear-gradient(135deg, #eaf4ff 0%, #f4f0ff 45%, #ecfeff 100%) !important;
    }

    body.register-bg main {
      background: transparent !important;
    }

    .register-card {
      background: #ffffff !important;
      border: 1px solid rgba(226, 232, 240, 0.95);
      box-shadow:
        0 28px 80px rgba(15, 23, 42, 0.20),
        inset 0 1px 0 rgba(255, 255, 255, 0.95);
    }

    .input-invalid {
      border-color: #dc2626 !important;
      box-shadow: 0 0 0 2px rgb(220 38 38 / 0.18);
    }

    .input-valid {
      border-color: #16a34a !important;
      box-shadow: 0 0 0 2px rgb(22 163 74 / 0.15);
    }

    .register-password-field {
      position: relative;
    }

    .register-password-field input {
      padding-right: 160px;
    }

    .register-password-toggle {
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

    .register-password-toggle:hover {
      background: #eff6ff;
      color: #1d4ed8;
    }

    .register-password-toggle:focus-visible {
      outline: none;
      box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.25);
    }

    .password-meter {
      width: 100%;
      height: 12px;
      overflow: hidden;
      border-radius: 999px;
      background: #e2e8f0;
      box-shadow: inset 0 1px 2px rgba(15, 23, 42, 0.08);
    }

    .password-strength-bar {
      width: 0%;
      height: 100%;
      border-radius: 999px;
      background: #dc2626;
      transition:
        width 0.25s ease,
        background-color 0.25s ease;
    }

    .register-photo-area {
      display: grid;
      grid-template-columns: 128px 1fr;
      gap: 20px;
      align-items: center;
      padding: 18px;
      border: 1px solid #e2e8f0;
      border-radius: 18px;
      background: #ffffff;
    }

    .profile-photo-frame {
      width: 128px;
      height: 128px;
      overflow: hidden;
      border-radius: 22px;
      border: 1px solid #cbd5e1;
      background: #f1f5f9;
      padding: 4px;
    }

    .photo-preview {
      display: block;
      width: 100%;
      height: 100%;
      border-radius: 16px;
      aspect-ratio: 1 / 1;
      object-fit: cover;
      object-position: center;
    }

    @media (max-width: 640px) {
      .register-password-field input {
        padding-right: 128px;
      }

      .register-password-toggle {
        font-size: 0.68rem;
        padding-inline: 7px;
      }

      .register-photo-area {
        grid-template-columns: 1fr;
        justify-items: center;
        text-align: center;
      }

      .profile-photo-frame {
        width: 112px;
        height: 112px;
      }

      .register-photo-controls {
        width: 100%;
        text-align: left;
      }
    }
  </style>
</head>

<body class="register-bg text-slate-900">
  <main class="min-h-screen grid place-items-center p-4 sm:p-6">
    <section class="register-card w-full max-w-4xl rounded-2xl p-5 sm:p-8">
      <header class="mb-6">
        <button
          id="backToLogin"
          type="button"
          class="mb-5 inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label="Volver al inicio de sesión"
        >
          <span aria-hidden="true">←</span>
          Volver
        </button>

        <h1 class="text-3xl font-bold">Crear cuenta</h1>
        <p class="mt-2 text-slate-600">
          Completa tus datos para registrarte en Micro-Connect.
        </p>
      </header>

      <?php if (!empty($mensajeFeedback)) echo $mensajeFeedback; ?>

      <form id="registerForm" method="POST" action="" enctype="multipart/form-data" novalidate class="space-y-6">
        <div class="grid gap-5 md:grid-cols-2">
          <div>
            <label for="regUsername" class="block text-sm font-semibold mb-1">
              Usuario <span class="text-red-600">*</span>
            </label>
            <input
              id="regUsername"
              name="username"
              type="text"
              maxlength="20"
              required
              autocomplete="username"
              class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
            <p id="usernameError" class="hidden mt-1 text-sm text-red-600"></p>
            <p class="mt-1 text-xs text-slate-500">Máximo 20 caracteres. Debe ser único.</p>
          </div>

          <div>
            <label for="displayName" class="block text-sm font-semibold mb-1">
              Nombre o Apodo <span class="text-red-600">*</span>
            </label>
            <input
              id="displayName"
              name="displayName"
              type="text"
              maxlength="50"
              required
              autocomplete="nickname"
              class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
            <p id="displayNameError" class="hidden mt-1 text-sm text-red-600"></p>
          </div>

          <div>
            <label for="birthDate" class="block text-sm font-semibold mb-1">
              Fecha de Nacimiento <span class="text-red-600">*</span>
            </label>
            <input
              id="birthDate"
              name="birthDate"
              type="date"
              required
              class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
            <p id="birthDateError" class="hidden mt-1 text-sm text-red-600"></p>
          </div>

          <div>
            <label for="email" class="block text-sm font-semibold mb-1">
              Correo Electrónico <span class="text-red-600">*</span>
            </label>
            <input
              id="email"
              name="email"
              type="email"
              maxlength="100"
              required
              autocomplete="email"
              class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
            <p id="emailError" class="hidden mt-1 text-sm text-red-600"></p>
          </div>

          <div>
            <label for="regPassword" class="block text-sm font-semibold mb-1">
              Contraseña <span class="text-red-600">*</span>
            </label>

            <div class="register-password-field">
              <input
                id="regPassword"
                name="password"
                type="password"
                maxlength="255"
                required
                autocomplete="new-password"
                class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />

              <button
                id="toggleRegPassword"
                type="button"
                class="register-password-toggle"
                aria-label="Mostrar contraseña"
                aria-pressed="false"
              >
                Mostrar Contraseña
              </button>
            </div>

            <div
              class="password-meter mt-3"
              role="progressbar"
              aria-label="Fortaleza de la contraseña"
              aria-valuemin="0"
              aria-valuemax="100"
              aria-valuenow="0"
            >
              <div id="passwordStrength" class="password-strength-bar"></div>
            </div>

            <p id="textoPassword" class="mt-2 text-sm text-slate-600">
              Fortaleza: esperando contraseña...
            </p>

            <p id="passwordError" class="hidden mt-1 text-sm text-red-600"></p>
          </div>

          <div>
            <label for="confirmPassword" class="block text-sm font-semibold mb-1">
              Confirmación de Contraseña <span class="text-red-600">*</span>
            </label>

            <div class="register-password-field">
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                maxlength="255"
                required
                autocomplete="new-password"
                class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />

              <button
                id="toggleConfirmPassword"
                type="button"
                class="register-password-toggle"
                aria-label="Mostrar confirmación de contraseña"
                aria-pressed="false"
              >
                Mostrar Contraseña
              </button>
            </div>

            <p id="confirmPasswordError" class="hidden mt-1 text-sm text-red-600"></p>
          </div>
        </div>

        <div>
          <div class="mb-1 flex items-center justify-between gap-4">
            <label for="bio" class="block text-sm font-semibold">
              Biografía
            </label>
            <p id="bioCounter" class="text-xs text-slate-500">0 / 300</p>
          </div>

          <textarea
            id="bio"
            name="bio"
            maxlength="300"
            rows="4"
            placeholder="Cuéntanos algo sobre ti..."
            class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
          ></textarea>

          <p id="bioError" class="hidden mt-1 text-sm text-red-600"></p>
        </div>

        <div class="register-photo-area">
          <div class="profile-photo-frame">
            <img
              id="photoPreview"
              class="photo-preview"
              alt="Vista previa de la foto de perfil"
              src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300' viewBox='0 0 300 300'%3E%3Crect width='300' height='300' fill='%23e2e8f0'/%3E%3Ccircle cx='150' cy='118' r='48' fill='%2394a3b8'/%3E%3Cpath d='M70 252c16-54 54-82 80-82s64 28 80 82' fill='%2394a3b8'/%3E%3C/svg%3E"
            />
          </div>

          <div class="register-photo-controls">
            <label for="profilePhoto" class="block text-sm font-semibold mb-2">
              Foto de perfil
            </label>

            <input
              id="profilePhoto"
              name="profilePhoto"
              type="file"
              accept="image/png,image/jpeg"
            />

            <p class="mt-2 text-xs text-slate-500">
              Formatos permitidos: PNG o JPG. La vista previa se recorta en formato cuadrado.
            </p>

            <p id="photoError" class="hidden mt-1 text-sm text-red-600"></p>
          </div>
        </div>

        <p id="formError" class="hidden rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"></p>

        <button
          type="submit"
          class="w-full rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          Registrarme
        </button>
      </form>
    </section>
  </main>

  <script src="../assets/js/main.js"></script>
  <script src="../assets/js/registroUsuario.js"></script>
</body>
</html>