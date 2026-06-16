<?php
session_start();
header('Content-Type: application/json');

// 1. Validamos que el usuario tenga una sesión activa
if (!isset($_SESSION['usuario'])) {
    echo json_encode(["status" => "error", "message" => "No autorizado o sesión expirada."]);
    exit();
}

include("../conexion.php");

$idUsuarioLoggeado = $_SESSION['usuario'];

// 2. Consultamos las notificaciones uniendo (INNER JOIN) los datos del creador de la acción
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
        $notificaciones[] = [
            "id" => $fila['idNotificacion'],
            "tipo" => $fila['tipoNotificacion'],
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
    
    // Devolvemos el arreglo estructurado en formato JSON
    echo json_encode(["status" => "success", "data" => $notificaciones]);
} else {
    echo json_encode(["status" => "error", "message" => "Error al consultar notificaciones: " . mysqli_error($conexion)]);
}
?>