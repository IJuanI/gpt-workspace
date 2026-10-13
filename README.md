# La Patota

Juego web 2D para celular, tablet y computadora. Está hecho con Canvas, JavaScript y CSS, sin dependencias externas ni servidor de juego. Las partidas y sus puntajes viven solo en memoria y se descartan al volver al menú o cerrar la página.

## Cómo jugar

Sirve los archivos con un servidor local o estático HTTPS (por ejemplo, `python3 -m http.server 8000`) y abre su dirección local. En un celular o tablet, gira el dispositivo a horizontal. En escritorio puedes usar el mouse.

- **Saltos por los techos:** toca para saltar; vuelve a tocar en el aire para el doble salto. Recoge estrellas. Un choque resta una estrella y reduce brevemente la velocidad.
- **Camión espacial:** toca una de las tres franjas horizontales para cambiar de carril. Recoge estrellas y esquiva meteoritos.
- **Cada cosa en su caja:** arrastra los objetos a la caja de su color. Un acierto suma un punto y un error resta uno. El puntaje puede quedar debajo de cero.

Cada runner permite partidas de 60, 90 o 120 segundos y tres niveles de obstáculos. Clasificación permite rondas de 10, 15, 20 o 30 objetos; comienza con 15. Los ajustes se eligen antes de cada partida y no se guardan.

La música y los efectos tienen interruptores independientes. El juego no necesita conexión para jugar después de que se haya cargado una vez y su service worker haya guardado los archivos.

## Publicación

El workflow de GitHub Pages publica el sitio cuando se actualiza la rama `work` o se ejecuta manualmente. En la configuración del repositorio, selecciona **Settings → Pages → Build and deployment → GitHub Actions**. Una vez publicado, el enlace del sitio aparece en esa sección.

## Estructura

- `app.js`: menú, ajustes, HUD y navegación entre pantallas.
- `game.js`: ciclo de animación, reloj y entrada táctil/mouse.
- `modes.js`: implementación independiente de las tres mecánicas.
- `sound.js`: música y efectos generados localmente con Web Audio.
- `sw.js`: caché offline de los archivos estáticos.
- `extras/pausa/`: sitio Pausa conservado del prototipo anterior.
