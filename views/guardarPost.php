<?php
session_start();
date_default_timezone_set('America/Mexico_City');
if (!isset($_SESSION['usuario'])) {
    exit("error_sesion: No autorizado");
}
include("../conexion.php");

if ($_SERVER["REQUEST_METHOD"] == "POST") {
    $idUsuario = $_SESSION['usuario'];
    $texto = isset($_POST['text']) ? mysqli_real_escape_string($conexion, $_POST['text']) : '';
    $fechaHora = date("Y-m-d H:i:s");
    
    $idMultimediaSinc = "NULL"; 

    // Procesamos el archivo multimedia
    if (isset($_FILES['postMedia']) && $_FILES['postMedia']['error'] == UPLOAD_ERR_OK) {
        $fileTmpPath = $_FILES['postMedia']['tmp_name'];
        $fileType = $_FILES['postMedia']['type'];
        
        $data = file_get_contents($fileTmpPath);
        $base64 = 'data:' . $fileType . ';base64,' . base64_encode($data);
        $base64Escaped = mysqli_real_escape_string($conexion, $base64);
        
        // Usamos INSERT IGNORE para evitar errores si la imagen es duplicada (por el UNIQUE)
        $queryMedia = "INSERT IGNORE INTO tMultimedia (urlMult) VALUES ('$base64Escaped')";
        
        if (mysqli_query($conexion, $queryMedia)) {
            if (mysqli_affected_rows($conexion) > 0) {
                $idMultimediaSinc = mysqli_insert_id($conexion);
            } else {
                // Si la imagen ya existía, la buscamos y reciclamos su ID
                $queryBusqueda = "SELECT idMultimedia FROM tMultimedia WHERE urlMult = '$base64Escaped'";
                $resultadoBusqueda = mysqli_query($conexion, $queryBusqueda);
                if ($fila = mysqli_fetch_assoc($resultadoBusqueda)) {
                    $idMultimediaSinc = $fila['idMultimedia'];
                }
            }
        } else {
            exit("error_media: " . mysqli_error($conexion));
        }
    }

    // Insertamos la publicación
    $query = "INSERT INTO tPublicacion (contenidoTextoPub, fechaHoraPub, idUsuario, idMultimedia) 
              VALUES ('$texto', '$fechaHora', '$idUsuario', $idMultimediaSinc)";

    if (mysqli_query($conexion, $query)) {
        echo mysqli_insert_id($conexion);
    } else {
        // En lugar de decir solo "error", devolveremos el mensaje exacto de la base de datos
        echo "error_bd: " . mysqli_error($conexion);
    }
}
?>