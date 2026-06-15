<?php
// conexion.php

$host = "localhost";
$user = "root";
$password = "";
$database = "microconnect"; 

// Extensión
$conexion = mysqli_connect($host, $user, $password, $database);

// Validación
if (!$conexion) {
    die("Error crítico de conexión: " . mysqli_connect_error());
}

// Configuración para soporte de caracteres especiales con utf8mb4
mysqli_set_charset($conexion, "utf8mb4");
?>