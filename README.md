
# Parking compartido

Calendario web para compartir las reservas de una plaza
de parking entre dos usuarios.

## Archivos

- `index.html`: estructura de la página.
- `styles.css`: diseño visual y adaptación a móviles.
- `app.js`: calendario, reservas y conexión con Firebase.
- `README.md`: instrucciones de configuración.

## Publicar gratis con GitHub Pages

1. Crea un repositorio en GitHub.
2. Sube los cuatro archivos a la raíz del repositorio.
3. Entra en Settings → Pages.
4. En Build and deployment, selecciona Deploy from a branch.
5. Elige la rama main y la carpeta / (root).
6. Guarda y espera a que GitHub publique la página.

La dirección tendrá un formato similar a:

https://TU-USUARIO.github.io/TU-REPOSITORIO/

## Conectar Firebase

1. Entra en https://console.firebase.google.com/
2. Crea un proyecto.
3. Registra una aplicación web.
4. Copia la configuración de Firebase.
5. Abre app.js y sustituye los valores de ejemplo de firebaseConfig.
6. Activa Authentication → Anonymous.
7. Crea una base de datos Cloud Firestore.
8. Configura reglas de seguridad antes de utilizar la aplicación.

## Importante sobre la seguridad

El selector Usuario 1 / Usuario 2 es solo una etiqueta.
No verifica la identidad de quien utiliza la página.

Para un uso privado real, configura una cuenta individual
para cada usuario y reglas de Firestore que impidan
reservas o cancelaciones no autorizadas.

## Desarrollo

Los archivos deben estar en la misma carpeta.

No abras index.html directamente mediante file://,
porque app.js utiliza módulos JavaScript.

Puedes probarlo desde GitHub Pages o mediante un servidor
local, como Live Server en Visual Studio Code.

## Funciones incluidas

- Calendario mensual.
- Reservas de un día.
- Cancelación de reservas propias.
- Prevención de reservas duplicadas.
- Actualización automática desde Firestore.
- Diseño adaptable a móviles.
