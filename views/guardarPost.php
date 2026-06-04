<?php
session_start();
if (!isset($_SESSION['usuario'])) {
    exit("No autorizado");
}
include("../conexion.php");

if ($_SERVER["REQUEST_METHOD"] == "POST") {
    $idUsuario = $_SESSION['usuario'];
    $texto = mysqli_real_escape_string($conexion, $_POST['text']);
    $fechaHora = date("Y-m-d H:i:s");
    
    $idMultimediaSinc = "NULL"; // Por defecto, si no hay archivo, se guarda como NULL

    // 🔥 NUEVO: Procesamos el archivo multimedia si viene en la petición
    if (isset($_FILES['postMedia']) && $_FILES['postMedia']['error'] == UPLOAD_ERR_OK) {
        $fileTmpPath = $_FILES['postMedia']['tmp_name'];
        $fileType = $_FILES['postMedia']['type'];
        
        // Convertimos el archivo temporal a una cadena Base64 pura
        $data = file_get_contents($fileTmpPath);
        $base64 = 'data:' . $fileType . ';base64,' . base64_encode($data);
        $base64Escaped = mysqli_real_escape_string($conexion, $base64);
        
        // 1. Insertamos primero en la tabla tMultimedia
        $queryMedia = "INSERT INTO tMultimedia (urlMult) VALUES ('$base64Escaped')";
        
        if (mysqli_query($conexion, $queryMedia)) {
            // Capturamos el ID incremental que generó la tabla multimedia
            $idMultimediaSinc = mysqli_insert_id($conexion);
        }
    }

    // 2. Insertamos en tPublicacion amarrando el idMultimedia que acabamos de generar
    $query = "INSERT INTO tPublicacion (contenidoTextoPub, fechaHoraPub, idUsuario, idMultimedia) 
              VALUES ('$texto', '$fechaHora', '$idUsuario', $idMultimediaSinc)";

    if (mysqli_query($conexion, $query)) {
        // Obtenemos el INT AUTO_INCREMENT generado para la publicación
        $idRealGenerado = mysqli_insert_id($conexion);
        // Se lo respondemos al JavaScript
        echo $idRealGenerado;
    } else {
        echo "error";
    }
}
?>