# EatIn

Contador de porciones diarias por grupo de alimentos. PWA personal, sin backend, sin cuentas, sin analítica — pensada para seguir un plan de nutrición basado en porciones (no calorías ni macros).

**App publicada:** https://davidarbe1.github.io/eatin-follow-nutrition/

## Qué es

En una sola pantalla, sin navegar, muestra:

1. Lo que llevas y lo que falta en el día completo, por grupo de alimentos.
2. Lo que registraste en cada comida.

Registrar una porción es un solo toque (`+1`), sin diálogos ni confirmaciones. Pasarse de la meta está permitido y no se penaliza visualmente.

**No es** un contador de calorías ni de macros. No tiene base de datos de alimentos ni da recomendaciones nutricionales — los números vienen de la cartilla que cada quien configura.

## Funcionalidad

- **Hoy**: resumen del día fijo (siempre visible) + bloques por comida con botones `+1` / `−1` por grupo. Soporte opcional para medias porciones.
- **Historial**: días pasados con % de cumplimiento, detalle editable por comida y grupo.
- **Configuración**: grupos y comidas editables (crear, renombrar, reordenar, eliminar, asignar a qué comidas pertenece cada grupo), hora de corte del día, medias porciones on/off.
- **Respaldo**: exportar/importar todos los datos como JSON.
- **PWA completa**: instalable en iOS desde Safari, funciona 100% offline, con safe areas para Dynamic Island y barra de gestos.

## Stack

HTML + CSS + JavaScript vanilla. Sin frameworks, sin build step, sin dependencias de npm. Persistencia en `localStorage`. Service worker con estrategia cache-first para uso offline.

```
index.html      estructura de las 3 vistas (Hoy / Historial / Configuración)
app.js          estado, lógica de conteo, render y persistencia
styles.css      tema oscuro/claro, layout, safe areas
manifest.json   metadata de instalación PWA
sw.js           service worker (cache-first, versionado)
icons/          íconos 180/192/512 para manifest y apple-touch-icon
```

## Correr en local

Se necesita cualquier servidor estático (el service worker no registra sobre `file://`, requiere `http://localhost` o HTTPS).

Con Python:

```bash
python -m http.server 8000
```

> Si usas Anaconda y `python`/`python3` no se reconoce en PowerShell (resuelve al stub de Microsoft Store), usa `conda activate base` antes, o llama a la ruta completa: `C:\Users\<usuario>\anaconda3\python.exe -m http.server 8000`.

O con Node, si lo tienes instalado:

```bash
npx serve .
```

Abrir `http://localhost:8000` en el navegador.

## Publicar

Ya está desplegado con **GitHub Pages** (rama `main`, carpeta raíz). Para volver a publicar tras un cambio, basta con hacer push a `main`; Pages se actualiza solo en 1-2 minutos.

Alternativas igual de válidas si se prefiere no tener el repo público: **Netlify** o **Cloudflare Pages**, ambos con plan gratuito y capaces de desplegar desde un repo privado.

## Instalar en el iPhone

1. Abrir la URL publicada en **Safari** (no funciona desde Chrome ni otros navegadores en iOS — solo Safari puede instalar en la pantalla de inicio).
2. Tocar **Compartir** → **Añadir a pantalla de inicio**.
3. Confirmar el nombre y tocar **Añadir**.
4. Abrir desde el ícono nuevo: debe abrir a pantalla completa, sin la barra de direcciones de Safari.
5. Probar en modo avión para confirmar que funciona offline.

## Datos y respaldo

Todos los datos viven solo en el dispositivo (`localStorage`), no se envían a ningún servidor. Desde **Configuración → Exportar JSON** se genera un respaldo (por Share Sheet o descarga); guárdalo en Files, iCloud o correo. Es la única forma de recuperar los datos si se reinstala la app o se cambia de teléfono. Para restaurar, usar **Configuración → Importar JSON**.

## Notas de configuración inicial

- La cartilla de grupos y metas diarias viene precargada según el plan de nutrición original.
- El grupo **Grasas y nueces** no tenía una comida asignada en la cartilla original, así que quedó disponible en las 5 comidas por defecto. Ajustable en **Configuración → Comidas**.

## Seguridad del repositorio

El repo es público (requisito del plan gratuito de GitHub Pages), pero eso solo permite que otros lo *vean y clonen* — nadie puede modificarlo sin ser colaborador explícito. Solo el dueño de la cuenta tiene permiso de escritura por defecto.
