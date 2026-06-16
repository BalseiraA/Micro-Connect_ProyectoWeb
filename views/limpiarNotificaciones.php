<?php
// 1. Desactivar la visualización de errores HTML para que NO rompan el JSON de JavaScript
error_reporting(0);
ini_set('display_errors', 0);

session_start();
header('Content-Type: application/json');

// 2. Validamos que el usuario tenga una sesión activa
if (!isset($_SESSION['usuario'])) {
    echo json_encode(["status" => "error", "message" => "No autorizado o sesión expirada."]);
    exit();
}

// 3. Inclusión segura del archivo de conexión usando rutas absolutas del servidor
$rutaConexion = dirname(__DIR__) . '/conexion.php';
if (file_exists($rutaConexion)) {
    include($rutaConexion);
} else {
    echo json_encode(["status" => "error", "message" => "No se encontró el archivo conexion.php en: " . $rutaConexion]);
    exit();
}

if (!isset($conexion) || !$conexion) {
    echo json_encode(["status" => "error", "message" => "La variable de conexión no está disponible."]);
    exit();
}

$idUsuarioLoggeado = mysqli_real_escape_string($conexion, $_SESSION['usuario']);

// 4. Eliminamos todas las notificaciones recibidas por el usuario logueado.
//    (Equivalente a "vaciar la bandeja"; el botón "Limpiar todo" del front-end.)
$query = "DELETE FROM tNotificacion WHERE idUsuarioDestino = '$idUsuarioLoggeado'";

if (mysqli_query($conexion, $query)) {
    echo json_encode(["status" => "success", "message" => "Notificaciones eliminadas."]);
} else {
    echo json_encode([
        "status" => "error",
        "message" => "Error en la consulta SQL.",
        "sql_error" => mysqli_error($conexion)
    ]);
}
?>
