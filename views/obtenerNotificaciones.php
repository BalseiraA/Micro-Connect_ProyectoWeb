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

// Validar que la variable de conexión exista
if (!isset($conexion) || !$conexion) {
    echo json_encode(["status" => "error", "message" => "La variable de conexión no está disponible."]);
    exit();
}

$idUsuarioLoggeado = $_SESSION['usuario'];

// 4. Consultamos las notificaciones uniendo (INNER JOIN) los datos del creador de la acción
$query = "SELECT n.idNotificacion, n.tipoNotificacion, n.idReferencia, n.leido, n.fechaHoraNotif, 
                 u.idUsuario AS idOrigen, u.nombreUs AS nombreOrigen, u.fotoPerfilUs AS fotoOrigen
          FROM tNotificacion n
          INNER JOIN tUsuario u ON n.idUsuarioOrigen = u.idUsuario
          WHERE n.idUsuarioDestino = '$idUsuarioLoggeado'
          ORDER BY n.fechaHoraNotif DESC 
          LIMIT 15";

$resultado = mysqli_query($conexion, $query);

if ($resultado) {
    $notificaciones = [];
    
    while ($fila = mysqli_fetch_assoc($resultado)) {
        // Usamos trim() para asegurar que no haya espacios escondidos que rompan los IFs de JavaScript
        $tipoLimpio = isset($fila['tipoNotificacion']) ? trim($fila['tipoNotificacion']) : '';

        $notificaciones[] = [
            "id" => $fila['idNotificacion'],
            "tipo" => $tipoLimpio, // Match limpio con notif.tipo en JS
            "idReferencia" => $fila['idReferencia'],
            "leido" => (int)$fila['leido'],
            "fecha" => $fila['fechaHoraNotif'],
            "usuario" => [
                "id" => $fila['idOrigen'],
                "nombre" => $fila['nombreOrigen'],
                "foto" => $fila['fotoOrigen']
            ]
        ];
    }
    
    // Devolvemos el arreglo estructurado en formato JSON limpio
    echo json_encode(["status" => "success", "data" => $notificaciones]);
} else {
    // Si la consulta falla, lo mandamos como un JSON válido
    echo json_encode([
        "status" => "error", 
        "message" => "Error en la consulta SQL. Verifica las columnas de tNotificacion.",
        "sql_error" => mysqli_error($conexion)
    ]);
}
?>
