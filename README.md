# EatIn — contador de porciones

PWA personal para seguir el plan de alimentación por porciones. Sin build step, sin dependencias: solo `index.html`, `app.js`, `styles.css`, `manifest.json`, `sw.js` e íconos.

## Probar en local

```
python -m http.server 8000
```

Abrir `http://localhost:8000` en el navegador. El service worker requiere `localhost` o HTTPS para registrarse.

## Publicar (GitHub Pages)

1. Crear un repositorio en GitHub y subir estos archivos (`git init`, `git add`, `git commit`, `git remote add origin ...`, `git push`).
2. En el repositorio: **Settings → Pages → Deploy from a branch**, elegir `main` y carpeta `/ (root)`.
3. Esperar unos minutos; GitHub Pages publica en `https://<usuario>.github.io/<repo>/` con HTTPS ya incluido.

Alternativa igual de válida: arrastrar la carpeta a **Netlify Drop** (app.netlify.com/drop) o conectar el repo en **Cloudflare Pages** — ambos gratis y con HTTPS automático.

## Instalar en el iPhone

1. Abrir la URL publicada en **Safari** (no funciona desde Chrome/otros en iOS — solo Safari puede instalar en la pantalla de inicio).
2. Tocar **Compartir** (el ícono del cuadrado con flecha) → **Añadir a pantalla de inicio**.
3. Confirmar el nombre y tocar **Añadir**.
4. Abrir la app desde el ícono en la pantalla de inicio: debe abrir a pantalla completa, sin la barra de direcciones de Safari.
5. Probar en modo avión para confirmar que funciona offline.

## Respaldo de datos

Los datos viven solo en este dispositivo (`localStorage`). Desde **Configuración → Exportar JSON** se genera un respaldo (por Share Sheet o descarga). Guárdalo en un lugar seguro (Files, iCloud, correo) — es la única forma de recuperar los datos si se reinstala la app o se cambia de teléfono. Para restaurar, usar **Configuración → Importar JSON**.

## Notas de configuración inicial

- La cartilla de grupos y metas viene precargada desde el brief.
- El grupo **Grasas y nueces** no tenía una comida asignada en la tabla original del brief, así que quedó disponible en todas las comidas por defecto. Se puede ajustar en **Configuración → Comidas**, marcando o desmarcando en qué comidas aparece cada grupo.
