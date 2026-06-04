<?php
session_start();
header('Content-Type: application/json');

// 1. Validamos sesión activa
if (!isset($_SESSION['usuario'])) {
    echo json_encode(["status" => "error", "message" => "Sesión no válida o expirada."]);
    exit();
}

include("../conexion.php");

if ($_SERVER["REQUEST_METHOD"] == "POST") {
    $idUsuario = $_SESSION['usuario'];
    $idPublicacion = (int)$_POST['postId'];

    // 2. Verificamos si este usuario ya le dio like a esta publicación
    $checkQuery = "SELECT * FROM tLikePublicacion WHERE idUsuario = '$idUsuario' AND idPublicacion = $idPublicacion";
    $checkResult = mysqli_query($conexion, $checkQuery);

    if (mysqli_num_rows($checkResult) > 0) {
        // Si ya existe, significa que el usuario quiere QUITAR el like (Dislike)
        $query = "DELETE FROM tLikePublicacion WHERE idUsuario = '$idUsuario' AND idPublicacion = $idPublicacion";
        $action = "removed";
    } else {
        // Si no existe, significa que el usuario quiere DAR like
        $query = "INSERT INTO tLikePublicacion (idUsuario, idPublicacion) VALUES ('$idUsuario', $idPublicacion)";
        $action = "added";
    }

    if (mysqli_query($conexion, $query)) {
        echo json_encode(["status" => "success", "action" => $action]);
    } else {
        echo json_encode(["status" => "error", "message" => "Error en la base de datos: " . mysqli_error($conexion)]);
    }
}
?>