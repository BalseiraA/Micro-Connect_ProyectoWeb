<?php
session_start();
header('Content-Type: application/json');

if (!isset($_SESSION['usuario'])) {
    echo json_encode([
        "status" => "error",
        "message" => "Sesión no válida o expirada."
    ]);
    exit();
}

include("../conexion.php");

if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    echo json_encode([
        "status" => "error",
        "message" => "Método no permitido."
    ]);
    exit();
}

$idUsuario = mysqli_real_escape_string($conexion, $_SESSION['usuario']);

// Captura y sanitización básica
$displayName = mysqli_real_escape_string($conexion, $_POST['displayName'] ?? '');
$email = mysqli_real_escape_string($conexion, $_POST['email'] ?? '');
$birthDate = mysqli_real_escape_string($conexion, $_POST['birthDate'] ?? '');
$bio = mysqli_real_escape_string($conexion, $_POST['bio'] ?? '');

// Nuevo: bandera para eliminar foto de perfil
$removeProfilePhoto = isset($_POST['removeProfilePhoto']) && $_POST['removeProfilePhoto'] === '1';

if ($displayName === '') {
    echo json_encode([
        "status" => "error",
        "message" => "El nombre no puede estar vacío."
    ]);
    exit();
}

// Primero extraemos los datos vigentes del usuario en la Base de Datos para validar contraseñas
$querySelect = mysqli_query($conexion, "SELECT contraseñaUs FROM tUsuario WHERE idUsuario = '$idUsuario'");

if (!$querySelect || mysqli_num_rows($querySelect) === 0) {
    echo json_encode([
        "status" => "error",
        "message" => "No se encontró el usuario en la base de datos."
    ]);
    exit();
}

$usuarioActual = mysqli_fetch_assoc($querySelect);

$sqlAppend = "";

// 1. Foto de perfil:
// Si el usuario pidió eliminar la foto, tiene prioridad sobre cualquier archivo nuevo.
if ($removeProfilePhoto) {
    $sqlAppend .= ", fotoPerfilUs = ''";
} else if (isset($_FILES['profilePhoto']) && $_FILES['profilePhoto']['error'] === UPLOAD_ERR_OK) {
    $fileTmpPath = $_FILES['profilePhoto']['tmp_name'];
    $fileType = $_FILES['profilePhoto']['type'];

    $allowedTypes = ['image/png', 'image/jpeg'];

    if (!in_array($fileType, $allowedTypes)) {
        echo json_encode([
            "status" => "error",
            "message" => "Solo se permiten imágenes PNG o JPG."
        ]);
        exit();
    }

    // Convertimos el archivo temporal de imagen a una cadena Base64
    $data = file_get_contents($fileTmpPath);

    if ($data === false) {
        echo json_encode([
            "status" => "error",
            "message" => "No se pudo leer la imagen seleccionada."
        ]);
        exit();
    }

    $base64 = 'data:' . $fileType . ';base64,' . base64_encode($data);
    $base64Escaped = mysqli_real_escape_string($conexion, $base64);

    // Lo añadimos a las columnas que se van a actualizar
    $sqlAppend .= ", fotoPerfilUs = '$base64Escaped'";
}

// 2. Cambio de contraseña
if (!empty($_POST['currentPassword']) && !empty($_POST['newPassword'])) {
    $currentPass = $_POST['currentPassword'];
    $newPass = $_POST['newPassword'];

    if (password_verify($currentPass, $usuarioActual['contraseñaUs'])) {
        $newPasswordHash = password_hash($newPass, PASSWORD_BCRYPT);
        $newPasswordHash = mysqli_real_escape_string($conexion, $newPasswordHash);

        $sqlAppend .= ", contraseñaUs = '$newPasswordHash'";
    } else {
        echo json_encode([
            "status" => "error",
            "message" => "La contraseña actual introducida es incorrecta."
        ]);
        exit();
    }
}

// 3. Actualización general del perfil
$queryUpdate = "UPDATE tUsuario 
                SET nombreUs = '$displayName', 
                    correoElectronicoUs = '$email', 
                    fechaNacimiento = '$birthDate', 
                    biografiaUs = '$bio'
                    $sqlAppend
                WHERE idUsuario = '$idUsuario'";

if (mysqli_query($conexion, $queryUpdate)) {
    echo json_encode([
        "status" => "success",
        "message" => "¡Cambios guardados correctamente!"
    ]);
} else {
    echo json_encode([
        "status" => "error",
        "message" => "Error al actualizar la base de datos: " . mysqli_error($conexion)
    ]);
}
?>