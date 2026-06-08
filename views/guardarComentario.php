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

    // Capturamos el ID del comentario padre si existe. 
    // Si no viene en el POST o está vacío, lo definimos como la cadena "NULL" para la consulta SQL.
    $idComentarioPadre = (isset($_POST['parentId']) && !empty($_POST['parentId'])) ? (int)$_POST['parentId'] : "NULL";

    // 2. Insertamos en tComentario usando las columnas exactas de DDLv2, incluyendo el padre
    $query = "INSERT INTO tComentario (idUsuario, idPublicacion, textoComent, fechaHoraComent, idComentarioPadre) 
              VALUES ('$idUsuario', $idPublicacion, '$textoComent', '$fechaHoraComent', $idComentarioPadre)";

    if (mysqli_query($conexion, $query)) {
        // Recuperamos el ID que MySQL acaba de generar
        $nuevoIdComentario = mysqli_insert_id($conexion);
        
        echo json_encode([
            "status" => "success", 
            "message" => "Comentario registrado con éxito en MySQL.",
            "idComentario" => $nuevoIdComentario // Lo enviamos al frontend para que pueda usarlo (ej. para dar like inmediatamente)
        ]);
    } else {
        echo json_encode(["status" => "error", "message" => "Error al insertar en la base de datos: " . mysqli_error($conexion)]);
    }
}
?>