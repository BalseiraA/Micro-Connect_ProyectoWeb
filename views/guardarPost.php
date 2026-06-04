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

    // Ajustado a los nombres exactos de tu tPublicacion en el DDL
    $query = "INSERT INTO tPublicacion (contenidoTextoPub, fechaHoraPub, idUsuario, idMultimedia) 
              VALUES ('$texto', '$fechaHora', '$idUsuario', NULL)";

    if (mysqli_query($conexion, $query)) {
        // Obtenemos el INT AUTO_INCREMENT generado por MySQL
        $idRealGenerado = mysqli_insert_id($conexion);
        // Se lo respondemos al JS para que lo guarde
        echo $idRealGenerado;
    } else {
        echo "error";
    }
}
?>