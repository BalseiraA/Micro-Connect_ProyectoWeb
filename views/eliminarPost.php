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
$idPublicacion = isset($_POST['postId']) ? (int)$_POST['postId'] : 0;

if ($idPublicacion <= 0) {
    echo json_encode([
        "status" => "error",
        "message" => "ID de publicación no válido."
    ]);
    exit();
}

try {
    mysqli_begin_transaction($conexion);

    // 1. Verificar que la publicación exista y que pertenezca al usuario actual
    $queryPost = "SELECT idPublicacion, idUsuario, idMultimedia 
                  FROM tPublicacion 
                  WHERE idPublicacion = $idPublicacion 
                  LIMIT 1";

    $resultadoPost = mysqli_query($conexion, $queryPost);

    if (!$resultadoPost || mysqli_num_rows($resultadoPost) === 0) {
        throw new Exception("La publicación no existe o ya fue eliminada.");
    }

    $post = mysqli_fetch_assoc($resultadoPost);

    if ($post['idUsuario'] !== $idUsuario) {
        throw new Exception("No tienes permiso para eliminar esta publicación.");
    }

    $idMultimedia = !empty($post['idMultimedia']) ? (int)$post['idMultimedia'] : 0;

    // 2. Obtener comentarios de la publicación para limpiar notificaciones relacionadas
    $idsComentarios = [];

    $queryComentarios = "SELECT idComentario 
                         FROM tComentario 
                         WHERE idPublicacion = $idPublicacion";

    $resultadoComentarios = mysqli_query($conexion, $queryComentarios);

    if ($resultadoComentarios) {
        while ($comentario = mysqli_fetch_assoc($resultadoComentarios)) {
            $idsComentarios[] = (int)$comentario['idComentario'];
        }
    }

    // 3. Limpiar notificaciones relacionadas con la publicación
    mysqli_query(
        $conexion,
        "DELETE FROM tNotificacion
         WHERE idReferencia = $idPublicacion
         AND tipoNotificacion IN ('like_post', 'comentario', 'comment', 'publicacion', 'post')"
    );

    // 4. Limpiar notificaciones relacionadas con comentarios/respuestas de esa publicación
    if (count($idsComentarios) > 0) {
        $idsComentariosSql = implode(',', $idsComentarios);

        mysqli_query(
            $conexion,
            "DELETE FROM tNotificacion
             WHERE idReferencia IN ($idsComentariosSql)
             AND tipoNotificacion IN ('like_comment', 'comentario', 'comment', 'respuesta', 'reply')"
        );
    }

    // 5. Eliminar la publicación.
    // Tus llaves foráneas ya tienen ON DELETE CASCADE, por eso se eliminan:
    // - comentarios
    // - respuestas
    // - likes de publicación
    // - likes de comentarios
    $queryDeletePost = "DELETE FROM tPublicacion 
                        WHERE idPublicacion = $idPublicacion 
                        AND idUsuario = '$idUsuario'";

    if (!mysqli_query($conexion, $queryDeletePost)) {
        throw new Exception("Error al eliminar la publicación: " . mysqli_error($conexion));
    }

    if (mysqli_affected_rows($conexion) < 1) {
        throw new Exception("No se pudo eliminar la publicación.");
    }

    // 6. Eliminar multimedia huérfana, solo si ningún otro post la usa
    if ($idMultimedia > 0) {
        $queryUsoMultimedia = "SELECT COUNT(*) AS total 
                               FROM tPublicacion 
                               WHERE idMultimedia = $idMultimedia";

        $resultadoUso = mysqli_query($conexion, $queryUsoMultimedia);
        $uso = mysqli_fetch_assoc($resultadoUso);

        if ((int)$uso['total'] === 0) {
            mysqli_query(
                $conexion,
                "DELETE FROM tMultimedia 
                 WHERE idMultimedia = $idMultimedia"
            );
        }
    }

    mysqli_commit($conexion);

    echo json_encode([
        "status" => "success",
        "message" => "Publicación eliminada correctamente."
    ]);
} catch (Throwable $e) {
    mysqli_rollback($conexion);

    echo json_encode([
        "status" => "error",
        "message" => $e->getMessage()
    ]);
}
?>