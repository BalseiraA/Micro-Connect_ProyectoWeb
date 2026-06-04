<?php
session_start();
header('Content-Type: application/json');

if (!isset($_SESSION['usuario'])) {
    echo json_encode(["status" => "error", "message" => "Sesión no válida o expirada."]);
    exit();
}

include("../conexion.php");

if ($_SERVER["REQUEST_METHOD"] == "POST") {
    $idUsuario = $_SESSION['usuario'];
    
    // Captura y sanitización básica
    $displayName = mysqli_real_escape_string($conexion, $_POST['displayName']);
    $email = mysqli_real_escape_string($conexion, $_POST['email']);
    $birthDate = mysqli_real_escape_string($conexion, $_POST['birthDate']);
    $bio = mysqli_real_escape_string($conexion, $_POST['bio']);

    // Primero extraemos los datos vigentes del usuario en la Base de Datos para validar contraseñas
    $querySelect = mysqli_query($conexion, "SELECT contraseñaUs FROM tUsuario WHERE idUsuario = '$idUsuario'");
    $usuarioActual = mysqli_fetch_assoc($querySelect);

    $sqlAppend = ""; // Almacenará la consulta extra si se modifica la contraseña o la foto

    // 🔥 1. NUEVO: Procesamos la foto de perfil si se subió un archivo nuevo
    if (isset($_FILES['profilePhoto']) && $_FILES['profilePhoto']['error'] == UPLOAD_ERR_OK) {
        $fileTmpPath = $_FILES['profilePhoto']['tmp_name'];
        $fileType = $_FILES['profilePhoto']['type'];
        
        // Convertimos el archivo temporal de imagen a una cadena Base64
        $data = file_get_contents($fileTmpPath);
        $base64 = 'data:' . $fileType . ';base64,' . base64_encode($data);
        $base64Escaped = mysqli_real_escape_string($conexion, $base64);
        
        // Lo añadimos a las columnas que se van a actualizar
        $sqlAppend .= ", fotoPerfilUs = '$base64Escaped'";
    }

    // Si el usuario intentó actualizar su contraseña
    if (!empty($_POST['currentPassword']) && !empty($_POST['newPassword'])) {
        $currentPass = $_POST['currentPassword'];
        $newPass = $_POST['newPassword'];

        // Verificamos si la contraseña que escribió coincide con el hash Bcrypt de la base de datos
        if (password_verify($currentPass, $usuarioActual['contraseñaUs'])) {
            // Encriptamos la nueva contraseña antes de que toque MySQL
            $newPasswordHash = password_hash($newPass, PASSWORD_BCRYPT);
            $sqlAppend .= ", contraseñaUs = '$newPasswordHash'";
        } else {
            echo json_encode(["status" => "error", "message" => "La contraseña actual introducida es incorrecta."]);
            exit();
        }
    }

    // CORREGIDO: Se cambió 'fechaNacimienti' por 'fechaNacimiento' para coincidir con tu DDL
    $queryUpdate = "UPDATE tUsuario 
                    SET nombreUs = '$displayName', 
                        correoElectronicoUs = '$email', 
                        fechaNacimiento = '$birthDate', 
                        biografiaUs = '$bio' 
                        $sqlAppend 
                    WHERE idUsuario = '$idUsuario'";

    if (mysqli_query($conexion, $queryUpdate)) {
        echo json_encode(["status" => "success", "message" => "¡Cambios guardados correctamente!"]);
    } else {
        echo json_encode(["status" => "error", "message" => "Error al actualizar la base de datos: " . mysqli_error($conexion)]);
    }
}
?>