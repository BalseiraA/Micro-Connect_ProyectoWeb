<?php

date_default_timezone_set('America/Mexico_City');
// conexion.php

$host = "127.0.0.1:3306"; // Asegúrate de usar el puerto correcto si es necesario
$user = "root";
$password = "";
$database = "microconnect"; // El nombre que tiene en tu script SQL

// Creamos la conexión usando la extensión mysqli
$conexion = mysqli_connect($host, $user, $password, $database);

// Validamos si la conexión fue exitosa
if (!$conexion) {
    die("Error crítico de conexión: " . mysqli_connect_error());
}

// Configuración para soportar eñes, acentos y emojis (gracias a tu COLLATE utf8mb4)
mysqli_set_charset($conexion, "utf8mb4");
?>