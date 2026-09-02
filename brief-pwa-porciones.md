# Brief para Claude Code — PWA de seguimiento de porciones

## 0. Prompt de arranque

> Vas a construir una PWA personal para seguir mi plan de alimentación por porciones. El brief completo está abajo. Antes de escribir código, léelo entero, hazme las preguntas que te falten, y propón el plan de archivos y el modelo de datos. Después construye por fases y ve mostrándome cada una funcionando en el navegador antes de seguir.

---

## 1. Mi cartilla

> ⚠️ **Rellenar antes de empezar.** Esto es lo único que Claude Code no puede inventar.

Grupos y porciones diarias que me asignó mi nutricionista:

| Grupo | Porciones al día |
|---|---|
| Carnes | 3 |
| Harinas | 3 |
| Verduras | 2 |
| Frutas | 2 |
| Grasas y nueces | 3 |
| Leches | 1 |
| Quesos sustitutos| 3 |

Comidas en las que reparto el día:

| Comidas | Frutas | Carnes | Queso o sustitutos | Harinas | Verduras | Leches | 
|---|---|---|---|---|---|---|
| Desayuno | 0 | 0 | 3 | 1 | 0 | 0 |
| Media mañana | 1 | 0 | 0 | 0 | 0 | 0 |
| Almuerzo | 0 | 1 | 0 | 1 | 1 | 0 |
| Media tarde | 1 | 0 | 0 | 0 | 0 | 1 |
| Cena | 0 | 1 | 0 | 1 | 1 | 0 |

---

## 2. Qué es y qué no es

**Es** un contador de porciones por grupo, con vista por comida y total del día.

**No es** un contador de calorías ni de macros. No lleva base de datos de alimentos, no calcula nada nutricional, no da consejos. Los números vienen de mi cartilla y solo se cuentan. Nada de gramajes, calorías ni recomendaciones dietéticas en la interfaz.

---

## 3. Requisito central: la vista doble

Esto es lo más importante del proyecto y donde fallan las apps existentes. En **una sola pantalla**, sin navegar, debo poder ver:

1. **Lo que llevo y lo que falta en el día completo**, por grupo. Formato "2/4".
2. **Lo que registré en cada comida**, por grupo.

Registrar una porción debe ser **un solo toque**, sin diálogos ni confirmaciones.

---

## 4. Funcionalidad

### 4.1 Pantalla Hoy (principal)

- **Resumen del día, siempre visible** (fijo arriba o abajo, que no se pierda al hacer scroll): una fila por grupo con progreso `llevo/meta` y barra o indicador visual.
- **Secciones por comida**: cada comida es un bloque con los grupos disponibles y un botón `+1` por grupo.
- Al tocar `+1` en un grupo dentro de una comida: sube el conteo de esa comida **y** el total del día, al instante.
- **Corregir un error**: tocar el número de la comida abre `−1`, o mantener pulsado para restar. Debe ser fácil deshacer — es el reclamo más común contra las apps existentes.
- **Medias porciones**: si en la config está activado, permitir sumar ½ (por ejemplo, pulsación larga en `+1`, o un botón `+½` secundario).
- **Pasarse de la meta está permitido.** No bloquear. Mostrarlo distinto (5/4) sin lenguaje de culpa ni alertas.
- **Estado vacío**: al empezar el día, un mensaje corto que invite a registrar la primera comida.

### 4.2 Reinicio diario

- El conteo se reinicia solo cada día.
- **Hora de corte configurable** (por defecto 4:00 a.m.), para que un snack a la 1 a.m. cuente en el día anterior.
- Usar la fecha local del dispositivo, nunca UTC.

### 4.3 Historial

- Lista o calendario de días pasados con el % de cumplimiento por día.
- Al tocar un día, ver el detalle por comida y grupo, **y poder editarlo** (se me pudo olvidar registrar algo).
- Vista de racha o resumen semanal por grupo: útil para ver si sistemáticamente me quedo corto en algún grupo.

### 4.4 Configuración

- Crear, renombrar, reordenar y eliminar **grupos**, y editar la meta diaria de cada uno.
- Crear, renombrar, reordenar y eliminar **comidas**.
- Activar/desactivar medias porciones.
- Cambiar la hora de corte del día.
- Cambiar la configuración **no debe alterar el historial ya guardado**.

### 4.5 Respaldo (obligatorio)

- **Exportar** toda la información a un archivo JSON (compartir por iOS Share Sheet o descarga).
- **Importar** ese JSON para restaurar.
- Recordatorio suave de exportar cada cierto tiempo (por ejemplo, mensual).

Esto no es opcional: los datos viven solo en el teléfono y necesito una salida.

---

## 5. Requisitos técnicos

### Stack

- **HTML + CSS + JavaScript vanilla.** Sin frameworks, sin build step, sin dependencias npm.
- Objetivo: un proyecto de pocos archivos que se pueda alojar en GitHub Pages gratis y que yo pueda entender y modificar.
- Sin backend, sin cuentas, sin analítica, sin telemetría, sin red. La app debe funcionar completamente offline.

### Estructura sugerida

```
index.html
app.js
styles.css
manifest.json
sw.js
icons/icon-180.png, icon-192.png, icon-512.png
```

### PWA en iOS — no omitir nada de esto

- `manifest.json` con `display: "standalone"`, `name`, `short_name`, `theme_color`, `background_color` e iconos 192 y 512.
- `<link rel="apple-touch-icon" href="icons/icon-180.png">` — **iOS ignora los iconos del manifest**, usa este.
- `<meta name="apple-mobile-web-app-capable" content="yes">` y `apple-mobile-web-app-status-bar-style`.
- `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">` y usar `env(safe-area-inset-top/bottom)` en el CSS. **Es un iPhone 17 Pro**: hay Dynamic Island arriba y barra de gestos abajo. Nada interactivo debe quedar debajo de ellas.
- Service worker que cachee todo para uso offline, con estrategia cache-first y un mecanismo simple de versión para actualizar.
- Requiere HTTPS. GitHub Pages ya lo da.

### Persistencia

- `localStorage` (los datos son pequeños; IndexedDB es innecesario aquí).
- Escribir en cada cambio, no solo al cerrar.
- Envolver toda lectura/escritura en `try/catch`; si falla, avisar en pantalla en vez de perder datos en silencio.
- Guardar un número de versión del esquema para poder migrar más adelante.

**Nota importante sobre iOS:** Safari borra el almacenamiento de sitios web tras 7 días sin interacción, pero las apps añadidas a la pantalla de inicio están exentas de esa regla porque llevan su propio contador de uso. Como voy a abrirla a diario, los datos están seguros. Aun así, la función de exportar es la red de seguridad.

### Modelo de datos propuesto

```js
{
  version: 1,
  config: {
    dayStartHour: 4,
    allowHalfPortions: false,
    groups: [
      { id: "prot", name: "Proteínas", target: 4, color: "#..." }
    ],
    meals: [
      { id: "desayuno", name: "Desayuno", order: 1 }
    ]
  },
  log: {
    "2026-09-01": {
      "desayuno": { "prot": 2, "harinas": 1 },
      "almuerzo": { "prot": 1 }
    }
  }
}
```

El total del día por grupo se **calcula** sumando las comidas, no se guarda duplicado. Así nunca se desincroniza.

---

## 6. Diseño e interacción

- **Área táctil mínima de 44×44 pt** en todo control (guía de Apple), con 8–12 pt de separación entre botones. Los `+1` se tocan con el pulgar, a veces con una mano ocupada.
- Controles principales en la **mitad inferior** de la pantalla, al alcance del pulgar.
- **Feedback inmediato**: cambio de color y vibración (`navigator.vibrate` donde exista) al registrar.
- **Modo oscuro** vía `prefers-color-scheme`, y respetar `prefers-reduced-motion`.
- Un color por grupo, consistente entre la vista de comida y el resumen del día, para reconocerlos de un vistazo.
- Cero animaciones decorativas. Solo movimiento que muestre lo que cambió al tocar.
- **Tono de la copy**: neutro y factual. Nada de motivación, ni emojis de celebración, ni juicios sobre lo que comí. La app cuenta, no opina.
- Español.
- Antes de codificar la interfaz, propónme una dirección visual concreta (paleta de 4–6 colores con hex, tipografía, y un wireframe en ASCII de la pantalla Hoy). No uses la estética por defecto de fondo crema con serif y acento terracota.

---

## 7. Plan por fases

Construir en este orden y validar cada fase en el navegador antes de continuar.

1. **Datos y lógica.** Modelo de datos, config quemada con mi cartilla, funciones de sumar/restar, cálculo de totales, lógica de reinicio con hora de corte. Sin interfaz bonita.
2. **Pantalla Hoy.** La vista doble funcionando: comidas + resumen del día persistente. Sumar y restar con un toque.
3. **Persistencia.** `localStorage`, recuperación al recargar, manejo de errores.
4. **PWA.** Manifest, service worker, iconos, metas de iOS, safe areas. **Probar instalada en el iPhone en este punto**, no al final.
5. **Historial.** Lista de días, detalle, edición de días pasados.
6. **Configuración.** Editor de grupos y comidas, hora de corte, medias porciones.
7. **Exportar/importar.**
8. **Pulido.** Modo oscuro, hápticos, estados vacíos, accesibilidad, repaso visual.

---

## 8. Criterios de aceptación

- [ ] Registro una porción en una comida y el total del día cambia en el mismo instante, sin navegar.
- [ ] Veo en una sola pantalla lo que llevo por comida y lo que falta del día.
- [ ] Puedo corregir un registro erróneo en menos de dos toques.
- [ ] Cierro la app, la reabro al día siguiente: el día está en cero y el anterior quedó en el historial.
- [ ] Un snack a la 1:00 a.m. se cuenta en el día anterior.
- [ ] Instalada desde la pantalla de inicio, abre a pantalla completa, sin barra de Safari.
- [ ] Funciona en modo avión.
- [ ] Nada queda tapado por la Dynamic Island ni por la barra de gestos.
- [ ] Puedo exportar un JSON, borrar los datos, importarlo y recuperar todo.
- [ ] Puedo añadir un grupo nuevo sin que se rompa el historial anterior.

---

## 9. Despliegue e instalación

Pedirle a Claude Code que deje instrucciones para:

1. Crear un repositorio en GitHub y activar **GitHub Pages** (gratis, con HTTPS, requisito para PWA).
2. Alternativa igual de válida: Netlify o Cloudflare Pages, ambos con plan gratuito.
3. En el iPhone: abrir la URL en **Safari** (no Chrome — solo Safari puede instalar en la pantalla de inicio), tocar **Compartir → Añadir a pantalla de inicio**.
4. Verificar que el ícono se ve bien y que abre sin barra de direcciones.

---

## 10. Mejoras para después (no construir ahora)

- Widget de pantalla de inicio → requiere app nativa; se puede aproximar con un Atajo de Apple.
- Sincronización entre dispositivos → necesitaría backend.
- Plantillas de comidas frecuentes ("mi desayuno de siempre" = 2 proteínas + 1 harina, con un toque).
- Notas por día para comentarle algo a mi nutricionista en la consulta.
