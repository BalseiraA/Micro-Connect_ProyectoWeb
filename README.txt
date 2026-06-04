App Micro-Connect (Versión Full-Stack con PHP y MySQL)
============================================================

IMPORTANTE:
El proyecto debe ejecutarse estrictamente desde un servidor local de PHP
(como XAMPP con Apache), no abriéndose directamente como archivo file:///
desde el explorador de Windows, ni levantándose únicamente con Live Server, 
ya que los archivos .php requieren un motor de servidor para procesarse.

PROGRAMAS NECESARIOS
------------------------------------------------------------
Para correr correctamente el proyecto en otra computadora se necesitan:

1. Visual Studio Code
   - Editor recomendado para abrir y modificar el código del proyecto.

2. XAMPP (Control Panel)
   - Servidor local que incluye el módulo de Apache (para procesar PHP)
     y el módulo de MySQL (para la base de datos).

3. MySQL Workbench
   - Herramienta para ejecutar el script DDL, administrar las tablas, 
     las llaves foráneas y revisar los registros en tiempo real.

4. Node.js
   - Instalar la versión LTS desde el sitio oficial.
   - npm se instala de forma conjunta con Node.js.
   - Asegurarse de elegir la opción "Add to PATH" durante la instalación.
   - Después de instalar Node.js, cerrar y volver a abrir VS Code.

5. Navegador web moderno
   - Recomendado: Opera, Google Chrome, Microsoft Edge o Firefox.


UBICACIÓN OBLIGATORIA DEL PROYECTO
------------------------------------------------------------
Para que Apache pueda leer tus archivos de PHP, la carpeta completa del 
proyecto DEBE estar guardada dentro del directorio raíz de XAMPP:

    Ruta esperada: C:\xampp\htdocs\Micro-Connect_ProyectoWeb\


CONFIGURACIÓN INICIAL DE LA BASE DE DATOS (MYSQL)
------------------------------------------------------------
Antes de abrir el sitio web, debes levantar la base de datos:

1. Abre el Panel de Control de XAMPP y dale clic al botón "Start" en el 
   módulo de MySQL.
2. Abre MySQL Workbench y conéctate a tu instancia local (`Local instance`).
3. Abre y ejecuta por completo el archivo `Microconnect DDLv2.sql`. Esto 
   creará el esquema fresco y las 7 tablas normalizadas (`tUsuario`, 
   `tPublicacion`, `tComentario`, `tLikePublicacion`, etc.).
4. Ajuste del tamaño de paquetes (Obligatorio para fotos de perfil):
   Para evitar errores por transferencia de imágenes Base64, ejecuta este 
   comando en una pestaña de consultas limpia en Workbench:
   
    SET GLOBAL max_allowed_packet = 134217728;
    
5. En el panel de XAMPP, dale "Stop" a MySQL y luego "Start" para aplicar.


ARCHIVOS IMPORTANTES Y ESTRUCTURA
------------------------------------------------------------
Estructura final del proyecto dentro de htdocs:

    Micro-Connect_ProyectoWeb/
    ├── index.php                 <-- Pantalla de Login inicial (sustituye a index.html)
    ├── conexion.php              <-- Puente de conexión con MySQL
    ├── package.json              <-- Configuración de dependencias de Tailwind
    ├── src/
    │   └── input.css             <-- Estilos base para el compilador
    ├── assets/
    │   ├── css/
    │   │   ├── tailwind.css      <-- CSS Autogenerado por Tailwind
    │   │   └── styles.css        <-- Estilos personalizados del Liquid Glass
    │   └── js/
    │       ├── main.js
    │       ├── login.js
    │       ├── home.js           <-- Controlador dinámico del Feed
    │       └── myProfile.js      <-- Controlador de la edición de perfil
    └── views/
        ├── home.php              <-- Feed sincronizado con consultas a MySQL
        ├── registroUsuario.php   <-- Formulario de Registro con soporte de imagen Base64
        ├── guardarPost.php       <-- Procesador asíncrono de publicaciones
        ├── guardarComentario.php <-- Procesador asíncrono de comentarios
        ├── guardarLike.php       <-- Procesador asíncrono de Likes (Toggle)
        └── editarUsuario.php     <-- Procesador asíncrono de edición de perfil


CONFIGURACIÓN DE PACKAGE.JSON (TAILWIND)
------------------------------------------------------------
El archivo package.json incluye los scripts automatizados de compilación:

    "scripts": {
      "dev:css": "tailwindcss -i ./src/input.css -o ./assets/css/tailwind.css --watch",
      "build:css": "tailwindcss -i ./src/input.css -o ./assets/css/tailwind.css --minify"
    }

- El script dev:css genera el CSS de Tailwind y observa cambios en vivo.
- El script build:css genera la versión minificada para la entrega final.


CÓMO CORRER EL PROYECTO PASO A PASO
------------------------------------------------------------
1. Abre el Panel de Control de XAMPP y presiona "Start" en **Apache** y **MySQL**.
2. Abre la carpeta del proyecto desde Visual Studio Code.
3. Abre una terminal en la raíz del proyecto e instala dependencias de Tailwind:

    npm install
    (Si PowerShell lo bloquea, usar: npm.cmd install)

4. Ejecuta el compilador de Tailwind en modo desarrollo:

    npm run dev:css
    (Si PowerShell lo bloquea, usar: npm.cmd run dev:css)

5. Deja esa terminal abierta para que Tailwind siga escuchando tus cambios en el CSS.
6. **ABRIR EL SITIO WEB:** Abre tu navegador y escribe la siguiente URL en la barra de direcciones:

    http://localhost/Micro-Connect_ProyectoWeb/index.php

   NO debe abrirse mediante Live Server (puerto 5500) ni arrastrando el 
   archivo como file:/// desde el explorador.


AUTENTICACIÓN Y SEGURIDAD REAL
------------------------------------------------------------
A diferencia de las versiones de prueba donde los usuarios estaban estáticos 
en el frontend, esta versión final cuenta con seguridad real:
- Las contraseñas se encriptan de forma segura en el servidor mediante Bcrypt 
  (`password_hash`).
- Las sesiones se validan del lado del servidor usando `session_start()`.
- Para ingresar, primero ve a la pantalla de "Crear cuenta", completa tus datos, 
  sube una foto de perfil y el sistema te dará de alta de forma real en MySQL.


PROBLEMAS COMUNES Y SOLUCIONES
------------------------------------------------------------
1. Error: "Got a packet bigger than 'max_allowed_packet' bytes"
   Causa: La imagen de perfil en Base64 es muy grande para la compuerta por defecto.
   Solución: Ejecuta `SET GLOBAL max_allowed_packet = 134217728;` en MySQL Workbench
   y reinicia el servicio de MySQL desde el panel de XAMPP.

2. Al registrar un usuario, la página muestra un error fatal de SQL
   Causa: No se ha alterado la columna de la foto de perfil en Workbench y se quedó 
   con la longitud corta de VARCHAR(500).
   Solución: Ejecuta `ALTER TABLE tUsuario MODIFY COLUMN fotoPerfilUs MEDIUMTEXT NULL;` 
   en Workbench para que acepte textos de gran longitud.

3. La página se ve en blanco o sin estilos al cargar desde localhost
   Causa: El comando de Tailwind no está corriendo o el archivo index.php no está 
   bien enlazado.
   Solución: Asegúrate de mantener la terminal ejecutando `npm run dev:css` en segundo plano.

4. Los cambios de perfil o comentarios no aparecen en caliente
   Causa: El navegador Opera o Chrome retienen una caché muy agresiva.
   Solución: Presiona F12, haz clic derecho sobre el botón de recargar del 
   navegador y selecciona "Vaciar la caché y volver a cargar de manera forzada".

============================================================