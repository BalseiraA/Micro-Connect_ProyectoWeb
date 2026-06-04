<?php
session_start();
header('Content-Type: application/json');

// 1. Validamos que el usuario tenga una sesión activa en el servidor
if (!isset($_SESSION['usuario'])) {
    echo json_encode(["status" => "error", "message" => "Sesión no válida o expirada."]);
    exit();
}

include("../conexion.php");

if ($_SERVER["REQUEST_METHOD"] == "POST") {
    $idUsuario = $_SESSION['usuario'];
    
    // Convertimos explícitamente a entero (int) para cumplir con tu tPublicacion INT
    $idPublicacion = (int)$_POST['postId'];
    $textoComent = mysqli_real_escape_string($conexion, $_POST['text']);
    $fechaHoraComent = date("Y-m-d H:i:s");

    // 2. Insertamos en tComentario usando las columnas exactas de tu DDLv2
    // idComentario se genera automáticamente por ser AUTO_INCREMENT
    $query = "INSERT INTO tComentario (idUsuario, idPublicacion, textoComent, fechaHoraComent) 
              VALUES ('$idUsuario', $idPublicacion, '$textoComent', '$fechaHoraComent')";

    if (mysqli_query($conexion, $query)) {
        echo json_encode(["status" => "success", "message" => "Comentario registrado con éxito en MySQL."]);
    } else {
        echo json_encode(["status" => "error", "message" => "Error al insertar en la base de datos: " . mysqli_error($conexion)]);
    }
}
?>