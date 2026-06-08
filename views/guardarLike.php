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
    
    // Determinamos qué estamos "likeando". 
    // Por defecto lo dejamos en 'post' por si alguna petición antigua no manda el type.
    $tipo = isset($_POST['type']) ? $_POST['type'] : 'post'; 

    if ($tipo === 'post') {
        $idPublicacion = (int)$_POST['postId'];

        // Lógica original para Publicaciones
        $checkQuery = "SELECT * FROM tLikePublicacion WHERE idUsuario = '$idUsuario' AND idPublicacion = $idPublicacion";
        $checkResult = mysqli_query($conexion, $checkQuery);

        if (mysqli_num_rows($checkResult) > 0) {
            $query = "DELETE FROM tLikePublicacion WHERE idUsuario = '$idUsuario' AND idPublicacion = $idPublicacion";
            $action = "removed";
        } else {
            $query = "INSERT INTO tLikePublicacion (idUsuario, idPublicacion) VALUES ('$idUsuario', $idPublicacion)";
            $action = "added";
        }

    } elseif ($tipo === 'comment') {
        // Lógica para Comentarios y Respuestas
        $idComentario = (int)$_POST['commentId'];

        $checkQuery = "SELECT * FROM tLikeComentario WHERE idUsuario = '$idUsuario' AND idComentario = $idComentario";
        $checkResult = mysqli_query($conexion, $checkQuery);

        if (mysqli_num_rows($checkResult) > 0) {
            $query = "DELETE FROM tLikeComentario WHERE idUsuario = '$idUsuario' AND idComentario = $idComentario";
            $action = "removed";
        } else {
            $query = "INSERT INTO tLikeComentario (idUsuario, idComentario) VALUES ('$idUsuario', $idComentario)";
            $action = "added";
        }
        
    } else {
        // Si mandan un tipo que no existe, abortamos
        echo json_encode(["status" => "error", "message" => "Tipo de like no válido."]);
        exit();
    }

    // Ejecutamos la consulta correspondiente (ya sea de post o de comentario)
    if (mysqli_query($conexion, $query)) {
        echo json_encode(["status" => "success", "action" => $action]);
    } else {
        echo json_encode(["status" => "error", "message" => "Error en la base de datos: " . mysqli_error($conexion)]);
    }
}
?>