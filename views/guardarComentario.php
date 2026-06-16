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

        // 🔔 Inserción en el Grafo de Notificaciones (mismo patrón usado en guardarLike.php)
        $fechaHoraNotif = date("Y-m-d H:i:s");

        if ($idComentarioPadre === "NULL") {
            // Es un comentario principal -> notificamos al dueño de la publicación
            $queryDuenoPost = mysqli_query($conexion, "SELECT idUsuario FROM tPublicacion WHERE idPublicacion = $idPublicacion");

            if ($post = mysqli_fetch_assoc($queryDuenoPost)) {
                $idUsuarioDestino = $post['idUsuario'];

                // Evitamos que un usuario se auto-notifique al comentar su propio post
                if ($idUsuario !== $idUsuarioDestino) {
                    mysqli_query($conexion, "INSERT INTO tNotificacion (idUsuarioDestino, idUsuarioOrigen, tipoNotificacion, idReferencia, fechaHoraNotif) 
                                             VALUES ('$idUsuarioDestino', '$idUsuario', 'comentario_post', $nuevoIdComentario, '$fechaHoraNotif')");
                }
            }
        } else {
            // Es una respuesta (anidación de un nivel) -> notificamos al dueño del comentario padre
            $queryDuenoComent = mysqli_query($conexion, "SELECT idUsuario FROM tComentario WHERE idComentario = $idComentarioPadre");

            if ($comentarioPadre = mysqli_fetch_assoc($queryDuenoComent)) {
                $idUsuarioDestino = $comentarioPadre['idUsuario'];

                if ($idUsuario !== $idUsuarioDestino) {
                    mysqli_query($conexion, "INSERT INTO tNotificacion (idUsuarioDestino, idUsuarioOrigen, tipoNotificacion, idReferencia, fechaHoraNotif) 
                                             VALUES ('$idUsuarioDestino', '$idUsuario', 'respuesta_comentario', $nuevoIdComentario, '$fechaHoraNotif')");
                }
            }
        }

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