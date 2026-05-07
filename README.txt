README.txt
App Micro-Connect
============================================================

IMPORTANTE:
El proyecto debe ejecutarse desde un servidor local, no abriéndose
directamente como archivo file:/// desde el explorador de Windows.


PROGRAMAS NECESARIOS
------------------------------------------------------------
Para correr correctamente el proyecto en otra computadora se necesitan:

1. Visual Studio Code
   - Editor recomendado para abrir y modificar el proyecto.

2. Extensión Live Server para Visual Studio Code
   - Sirve para levantar el proyecto como servidor local.
   - La página debe abrirse con una ruta parecida a:
     http://127.0.0.1:5500/index.html

3. Node.js
   - Instalar preferentemente la versión LTS desde el sitio oficial.
   - npm se instala junto con Node.js.
   - Asegurarse de elegir la opción Add to PATH durante la instalación.
   - Después de instalar Node.js, cerrar y volver a abrir VS Code.

4. npm
   - Se usa para instalar las dependencias del proyecto y ejecutar Tailwind.

5. Navegador web moderno
   - Recomendado: Google Chrome, Microsoft Edge, Brave o Firefox.


VERIFICAR INSTALACIÓN DE NODE Y NPM
------------------------------------------------------------
Abrir una terminal en VS Code y ejecutar:

    node -v

Después:

    npm -v

Si PowerShell bloquea npm con un error relacionado con npm.ps1 o
ExecutionPolicy, usar una de estas dos opciones:

Opción rápida:

    npm.cmd -v

Y para los comandos del proyecto usar npm.cmd en lugar de npm.

Después cerrar la terminal, abrir una nueva y probar de nuevo:

    npm -v


DEPENDENCIAS DEL PROYECTO
------------------------------------------------------------
El proyecto necesita estas dependencias de desarrollo:

    tailwindcss
    @tailwindcss/cli

Si el proyecto se descarga en otra computadora y no trae la carpeta
node_modules, se deben instalar las dependencias ejecutando:

    npm install

Si se está configurando desde cero, se pueden instalar con:

    npm install -D tailwindcss @tailwindcss/cli


ARCHIVOS IMPORTANTES
------------------------------------------------------------
Estructura esperada del proyecto:

    proyecto/
    ├── index.html
    ├── package.json
    ├── src/
    │   └── input.css
    ├── assets/
    │   ├── css/
    │   │   ├── tailwind.css
    │   │   └── styles.css
    │   └── js/
    │       ├── main.js
    │       └── login.js
    └── views/
        └── home.html


CONFIGURACIÓN DE PACKAGE.JSON
------------------------------------------------------------
El archivo package.json debe incluir scripts similares a estos:

    "scripts": {
      "dev:css": "tailwindcss -i ./src/input.css -o ./assets/css/tailwind.css --watch",
      "build:css": "tailwindcss -i ./src/input.css -o ./assets/css/tailwind.css --minify"
    }

El script dev:css genera el CSS de Tailwind y observa cambios.
El script build:css genera una versión minificada para entrega final.


CÓMO CORRER EL PROYECTO
------------------------------------------------------------
1. Abrir la carpeta del proyecto en Visual Studio Code.

2. Abrir una terminal en la raíz del proyecto.

3. Instalar dependencias si es necesario:

    npm install

   Si PowerShell bloquea npm, usar:

    npm.cmd install

4. Ejecutar Tailwind en modo desarrollo:

    npm run dev:css

   Si PowerShell bloquea npm, usar:

    npm.cmd run dev:css

5. Dejar esa terminal abierta.
   Tailwind estará generando y actualizando:

    assets/css/tailwind.css

6. Abrir index.html con Live Server:
   - Clic derecho sobre index.html.
   - Seleccionar "Open with Live Server".

7. Verificar que la URL se vea parecida a:

    http://127.0.0.1:5500/index.html

   NO debe abrirse como:

    file:///C:/Users/...


USUARIOS DE PRUEBA
------------------------------------------------------------
El login actual usa usuarios definidos localmente en login.js.
Ejemplos de usuarios de prueba:

    Usuario: usuario
    Contraseña: pass1234

    Usuario: maria
    Contraseña: react2026

NOTA DE SEGURIDAD:
Estos usuarios están escritos directamente en el frontend temporalmente. En la versión final del programa, la autenticación debe
hacerse desde un backend seguro y nunca se han exponer contraseñas en archivos JavaScript del cliente.


PROBLEMAS COMUNES Y SOLUCIONES
------------------------------------------------------------

1. Error: "npm no se reconoce como nombre de un cmdlet"
   Causa:
   - Node.js no está instalado o no está agregado al PATH.

   Solución:
   - Instalar Node.js.
   - Cerrar y abrir VS Code.
   - Probar node -v y npm -v.

2. Error: "No se puede cargar npm.ps1 porque la ejecución de scripts está
   deshabilitada"
   Causa:
   - PowerShell bloquea scripts por política de seguridad.

   Soluciones:
   - Usar npm.cmd en lugar de npm.
   - O ejecutar:
     Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned

3. Error: "Missing script: dev:css"
   Causa:
   - El package.json no tiene definido el script dev:css.

   Solución:
   - Agregar en package.json:

     "scripts": {
       "dev:css": "tailwindcss -i ./src/input.css -o ./assets/css/tailwind.css --watch",
       "build:css": "tailwindcss -i ./src/input.css -o ./assets/css/tailwind.css --minify"
     }

4. La página se ve sin estilos o muy básica
   Causa:
   - Tailwind no generó assets/css/tailwind.css.
   - El archivo tailwind.css no está bien enlazado.
   - No se está ejecutando npm run dev:css.

   Solución:
   - Ejecutar:
     npm run dev:css
   - Revisar que index.html tenga:
     <link rel="stylesheet" href="./assets/css/tailwind.css" />

5. El navegador muestra errores por file:///
   Causa:
   - El proyecto se abrió directamente desde el explorador de archivos.

   Solución:
   - Abrir index.html con Live Server.
   - Usar una URL http://127.0.0.1:5500/

6. El fondo en el Inicio de Sesión no se ve
   Causas posibles:
   - styles.css está sobreescribiendo el fondo del body o del main.
   - El bloque CSS del Liquid Glass está antes de styles.css.
   - El main tiene fondo blanco y tapa la animación.
   - Falta la estructura .liquid-bg en index.html.

   Solución:
   - Colocar las reglas del Liquid Glass después de styles.css.
   - Asegurar que el main del login tenga fondo transparente:
     body.login-bg main {
       background: transparent !important;
     }

7. Cambios CSS no aparecen
   Causa:
   - Caché del navegador o Tailwind no está observando los cambios.

   Solución:
   - Verificar que npm run dev:css siga corriendo.
   - Recargar con Ctrl + F5.


NOTAS DE DESARROLLO
------------------------------------------------------------
- No editar manualmente assets/css/tailwind.css, porque se regenera
  automáticamente.
- Los estilos personalizados deben colocarse en un bloque
  style dentro del html si solo aplican a esa página.


COMANDOS PRINCIPALES
------------------------------------------------------------
Instalar dependencias:

    npm install

Ejecutar Tailwind en desarrollo:

    npm run dev:css

Generar CSS minificado para entrega:

    npm run build:css

Alternativa si PowerShell bloquea npm:

    npm.cmd install
    npm.cmd run dev:css
    npm.cmd run build:css