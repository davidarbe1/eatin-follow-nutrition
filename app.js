// ---------------------------------------------------------------------------
// EatIn — contador de porciones. Vanilla JS, sin dependencias.
// ---------------------------------------------------------------------------

const SCHEMA_VERSION = 1;
const STORAGE_KEY = 'eatin.data';

const DEFAULT_DATA = {
  version: SCHEMA_VERSION,
  config: {
    dayStartHour: 4,
    allowHalfPortions: false,
    lastExportAt: null,
    groups: [
      { id: 'carnes',   name: 'Carnes',            target: 3, color: '#E0645B' },
      { id: 'harinas',  name: 'Harinas',           target: 3, color: '#E0A458' },
      { id: 'verduras', name: 'Verduras',          target: 2, color: '#5FAE73' },
      { id: 'frutas',   name: 'Frutas',            target: 2, color: '#D683B7' },
      { id: 'grasas',   name: 'Grasas y nueces',   target: 3, color: '#9C8ED1' },
      { id: 'leches',   name: 'Leches',            target: 1, color: '#6FA8D6' },
      { id: 'quesos',   name: 'Quesos sustitutos', target: 3, color: '#C9A66B' },
    ],
    meals: [
      { id: 'desayuno',    name: 'Desayuno',      order: 1, groups: ['quesos', 'harinas', 'grasas'] },
      { id: 'media_manana',name: 'Media mañana',  order: 2, groups: ['frutas', 'grasas'] },
      { id: 'almuerzo',    name: 'Almuerzo',      order: 3, groups: ['carnes', 'harinas', 'verduras', 'grasas'] },
      { id: 'media_tarde', name: 'Media tarde',   order: 4, groups: ['frutas', 'leches', 'grasas'] },
      { id: 'cena',        name: 'Cena',          order: 5, groups: ['carnes', 'harinas', 'verduras', 'grasas'] },
    ],
  },
  log: {},
};

// ---------------------------------------------------------------------------
// Fecha / hora de corte
// ---------------------------------------------------------------------------

function pad2(n) { return String(n).padStart(2, '0'); }

function dateKey(d) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

// Aplica la hora de corte: si son antes de dayStartHour, cuenta como el día anterior.
function currentDayKey(dayStartHour) {
  const now = new Date();
  const shifted = new Date(now);
  shifted.setHours(now.getHours() - dayStartHour);
  return dateKey(shifted);
}

function formatDayLabel(key) {
  const [y, m, d] = key.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const weekday = date.toLocaleDateString('es', { weekday: 'long' });
  const day = date.getDate();
  const month = date.toLocaleDateString('es', { month: 'long' });
  return `${weekday} ${day} de ${month}`;
}

// ---------------------------------------------------------------------------
// Persistencia
// ---------------------------------------------------------------------------

function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return structuredClone(DEFAULT_DATA);
    const parsed = JSON.parse(raw);
    return migrate(parsed);
  } catch (err) {
    console.error('Error leyendo datos', err);
    showToast('No se pudo leer los datos guardados. Se usará configuración por defecto.', true);
    return structuredClone(DEFAULT_DATA);
  }
}

function migrate(data) {
  if (!data.version) data.version = SCHEMA_VERSION;
  // Punto de extensión para futuras migraciones de esquema.
  return data;
}

function saveData() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (err) {
    console.error('Error guardando datos', err);
    showToast('No se pudo guardar. Verifica el espacio de almacenamiento.', true);
  }
}

// ---------------------------------------------------------------------------
// Estado y lógica de conteo
// ---------------------------------------------------------------------------

let state = loadData();

function todayKey() {
  return currentDayKey(state.config.dayStartHour);
}

function ensureDay(dayKey) {
  if (!state.log[dayKey]) state.log[dayKey] = {};
  return state.log[dayKey];
}

function getMealCount(dayKey, mealId, groupId) {
  const day = state.log[dayKey];
  if (!day || !day[mealId]) return 0;
  return day[mealId][groupId] || 0;
}

function getDayTotal(dayKey, groupId) {
  const day = state.log[dayKey];
  if (!day) return 0;
  let total = 0;
  for (const mealId in day) {
    total += day[mealId][groupId] || 0;
  }
  return total;
}

function addPortion(dayKey, mealId, groupId, amount) {
  const day = ensureDay(dayKey);
  if (!day[mealId]) day[mealId] = {};
  const next = (day[mealId][groupId] || 0) + amount;
  day[mealId][groupId] = Math.max(0, roundToHalf(next));
  if (day[mealId][groupId] === 0) delete day[mealId][groupId];
  saveData();
}

function roundToHalf(n) {
  return Math.round(n * 2) / 2;
}

function formatAmount(n) {
  return Number.isInteger(n) ? String(n) : n.toFixed(1).replace(/\.0$/, '');
}

// ---------------------------------------------------------------------------
// Render: Pantalla Hoy
// ---------------------------------------------------------------------------

let longPressTimer = null;
let longPressFired = false;

function renderToday() {
  const dayKey = todayKey();
  const root = document.getElementById('view-today');
  const cfg = state.config;
  const hasAnyLog = !!state.log[dayKey] && Object.keys(state.log[dayKey]).length > 0;

  const mealsHtml = cfg.meals
    .slice()
    .sort((a, b) => a.order - b.order)
    .map(meal => renderMealBlock(dayKey, meal))
    .join('');

  root.innerHTML = `
    <header class="topbar">
      <h1>${formatDayLabel(dayKey)}</h1>
      <div class="topbar-actions">
        <button class="icon-btn" data-nav="history" aria-label="Historial">📅</button>
        <button class="icon-btn" data-nav="settings" aria-label="Configuración">⚙</button>
      </div>
    </header>
    <div class="meals-scroll">
      ${hasAnyLog ? mealsHtml : `<p class="empty-state">Todavía no registras nada hoy. Toca +1 en la primera comida que hagas.</p>${mealsHtml}`}
    </div>
    <footer class="day-summary" id="day-summary">
      ${cfg.groups.map(g => renderSummaryRow(dayKey, g)).join('')}
    </footer>
  `;

  root.querySelectorAll('[data-nav]').forEach(btn => {
    btn.addEventListener('click', () => navigate(btn.dataset.nav));
  });

  attachPortionHandlers(root, dayKey);
}

function renderMealBlock(dayKey, meal) {
  const groups = meal.groups
    .map(gid => state.config.groups.find(g => g.id === gid))
    .filter(Boolean);

  return `
    <section class="meal-block">
      <h2 class="meal-title">${meal.name}</h2>
      <div class="meal-groups">
        ${groups.map(g => renderGroupControl(dayKey, meal.id, g)).join('')}
      </div>
    </section>
  `;
}

function renderGroupControl(dayKey, mealId, group) {
  const count = getMealCount(dayKey, mealId, group.id);
  return `
    <div class="group-control" style="--group-color:${group.color}">
      <button class="count-display" data-action="minus" data-meal="${mealId}" data-group="${group.id}" aria-label="Restar ${group.name}">
        <span class="group-dot"></span>
        <span class="group-name">${group.name}</span>
        <span class="count-value">${formatAmount(count)}</span>
      </button>
      <div class="control-buttons">
        ${state.config.allowHalfPortions ? `<button class="btn-half" data-action="plus-half" data-meal="${mealId}" data-group="${group.id}">+½</button>` : ''}
        <button class="btn-plus" data-action="plus" data-meal="${mealId}" data-group="${group.id}">+1</button>
      </div>
    </div>
  `;
}

function renderSummaryRow(dayKey, group) {
  const total = getDayTotal(dayKey, group.id);
  const pct = Math.min(100, (total / group.target) * 100);
  const over = total > group.target;
  return `
    <div class="summary-row" style="--group-color:${group.color}">
      <span class="summary-name">${group.name}</span>
      <div class="summary-bar-track">
        <div class="summary-bar-fill ${over ? 'over' : ''}" style="width:${pct}%"></div>
      </div>
      <span class="summary-fraction ${over ? 'over' : ''}">${formatAmount(total)}/${formatAmount(group.target)}</span>
    </div>
  `;
}

function attachPortionHandlers(root, dayKey, onChange) {
  const rerender = onChange || renderToday;

  root.querySelectorAll('[data-action="plus"]').forEach(btn => {
    let firedLong = false;
    let timer = null;

    const start = () => {
      firedLong = false;
      timer = setTimeout(() => {
        firedLong = true;
        if (state.config.allowHalfPortions) {
          applyPortion(dayKey, btn.dataset.meal, btn.dataset.group, 0.5, rerender);
        }
      }, 500);
    };
    const end = () => {
      clearTimeout(timer);
      if (!firedLong) applyPortion(dayKey, btn.dataset.meal, btn.dataset.group, 1, rerender);
    };
    const cancel = () => clearTimeout(timer);

    btn.addEventListener('pointerdown', start);
    btn.addEventListener('pointerup', end);
    btn.addEventListener('pointerleave', cancel);
    btn.addEventListener('pointercancel', cancel);
  });

  root.querySelectorAll('[data-action="plus-half"]').forEach(btn => {
    btn.addEventListener('click', () => applyPortion(dayKey, btn.dataset.meal, btn.dataset.group, 0.5, rerender));
  });

  root.querySelectorAll('[data-action="minus"]').forEach(btn => {
    let timer = null;
    let firedLong = false;

    const start = () => {
      firedLong = false;
      timer = setTimeout(() => {
        firedLong = true;
        applyPortion(dayKey, btn.dataset.meal, btn.dataset.group, -1, rerender);
      }, 450);
    };
    const end = () => {
      clearTimeout(timer);
      if (!firedLong) applyPortion(dayKey, btn.dataset.meal, btn.dataset.group, -1, rerender);
    };
    const cancel = () => clearTimeout(timer);

    btn.addEventListener('pointerdown', start);
    btn.addEventListener('pointerup', end);
    btn.addEventListener('pointerleave', cancel);
    btn.addEventListener('pointercancel', cancel);
  });
}

function applyPortion(dayKey, mealId, groupId, amount, rerender) {
  addPortion(dayKey, mealId, groupId, amount);
  if (navigator.vibrate) navigator.vibrate(amount > 0 ? 15 : 10);
  (rerender || renderToday)();
}

// ---------------------------------------------------------------------------
// Historial
// ---------------------------------------------------------------------------

let historyEditingDay = null;

function renderHistory() {
  const root = document.getElementById('view-history');
  const days = Object.keys(state.log).sort().reverse();
  const today = todayKey();
  const pastDays = days.filter(d => d !== today);

  root.innerHTML = `
    <header class="topbar">
      <button class="icon-btn" data-nav="today" aria-label="Volver">←</button>
      <h1>Historial</h1>
      <div></div>
    </header>
    <div class="content-scroll">
      ${pastDays.length === 0 ? '<p class="empty-state">Todavía no hay días registrados en el historial.</p>' : ''}
      ${pastDays.map(d => renderHistoryRow(d)).join('')}
    </div>
  `;

  root.querySelector('[data-nav="today"]').addEventListener('click', () => navigate('today'));
  root.querySelectorAll('[data-day]').forEach(el => {
    el.addEventListener('click', () => openHistoryDetail(el.dataset.day));
  });
}

function dayCompliance(dayKey) {
  const groups = state.config.groups;
  let sum = 0;
  groups.forEach(g => {
    const total = getDayTotal(dayKey, g.id);
    sum += Math.min(1, total / g.target);
  });
  return Math.round((sum / groups.length) * 100);
}

function renderHistoryRow(dayKey) {
  const pct = dayCompliance(dayKey);
  return `
    <button class="history-row" data-day="${dayKey}">
      <span>${formatDayLabel(dayKey)}</span>
      <span class="history-pct">${pct}%</span>
    </button>
  `;
}

function openHistoryDetail(dayKey) {
  historyEditingDay = dayKey;
  const root = document.getElementById('view-history');
  const cfg = state.config;

  root.innerHTML = `
    <header class="topbar">
      <button class="icon-btn" data-nav="history-back" aria-label="Volver">←</button>
      <h1>${formatDayLabel(dayKey)}</h1>
      <div></div>
    </header>
    <div class="content-scroll">
      ${cfg.meals.slice().sort((a, b) => a.order - b.order).map(meal => renderMealBlock(dayKey, meal)).join('')}
    </div>
    <footer class="day-summary">
      ${cfg.groups.map(g => renderSummaryRow(dayKey, g)).join('')}
    </footer>
  `;

  root.querySelector('[data-nav="history-back"]').addEventListener('click', renderHistory);
  attachPortionHandlers(root, dayKey, () => openHistoryDetail(dayKey));
}

// ---------------------------------------------------------------------------
// Configuración
// ---------------------------------------------------------------------------

function renderSettings() {
  const root = document.getElementById('view-settings');
  const cfg = state.config;

  root.innerHTML = `
    <header class="topbar">
      <button class="icon-btn" data-nav="today" aria-label="Volver">←</button>
      <h1>Configuración</h1>
      <div></div>
    </header>
    <div class="content-scroll settings-scroll">

      <section class="settings-section">
        <h2>Grupos</h2>
        <div id="groups-list">
          ${cfg.groups.map(g => renderGroupSettingRow(g)).join('')}
        </div>
        <button class="btn-secondary" id="add-group">+ Agregar grupo</button>
      </section>

      <section class="settings-section">
        <h2>Comidas</h2>
        <div id="meals-list">
          ${cfg.meals.slice().sort((a, b) => a.order - b.order).map(m => renderMealSettingRow(m)).join('')}
        </div>
        <button class="btn-secondary" id="add-meal">+ Agregar comida</button>
      </section>

      <section class="settings-section">
        <h2>General</h2>
        <label class="settings-field">
          <span>Hora de corte del día</span>
          <input type="number" min="0" max="12" id="day-start-hour" value="${cfg.dayStartHour}">
        </label>
        <label class="settings-field settings-checkbox">
          <span>Permitir medias porciones</span>
          <input type="checkbox" id="allow-half" ${cfg.allowHalfPortions ? 'checked' : ''}>
        </label>
      </section>

      <section class="settings-section">
        <h2>Respaldo</h2>
        <button class="btn-secondary" id="export-json">Exportar JSON</button>
        <button class="btn-secondary" id="import-json">Importar JSON</button>
        <input type="file" id="import-file-input" accept="application/json" hidden>
      </section>

    </div>
  `;

  root.querySelector('[data-nav="today"]').addEventListener('click', () => navigate('today'));

  root.querySelector('#day-start-hour').addEventListener('change', e => {
    const v = parseInt(e.target.value, 10);
    cfg.dayStartHour = Number.isFinite(v) ? Math.min(23, Math.max(0, v)) : 4;
    saveData();
  });

  root.querySelector('#allow-half').addEventListener('change', e => {
    cfg.allowHalfPortions = e.target.checked;
    saveData();
  });

  root.querySelectorAll('.group-target-input').forEach(input => {
    input.addEventListener('change', e => {
      const g = cfg.groups.find(g => g.id === e.target.dataset.id);
      const v = parseFloat(e.target.value);
      if (g && Number.isFinite(v) && v >= 0) { g.target = v; saveData(); }
    });
  });
  root.querySelectorAll('.group-name-input').forEach(input => {
    input.addEventListener('change', e => {
      const g = cfg.groups.find(g => g.id === e.target.dataset.id);
      if (g && e.target.value.trim()) { g.name = e.target.value.trim(); saveData(); renderSettings(); }
    });
  });
  root.querySelectorAll('.group-color-input').forEach(input => {
    input.addEventListener('change', e => {
      const g = cfg.groups.find(g => g.id === e.target.dataset.id);
      if (g) { g.color = e.target.value; saveData(); }
    });
  });
  root.querySelectorAll('.group-delete').forEach(btn => {
    btn.addEventListener('click', () => {
      if (!confirm('¿Eliminar este grupo? El historial que ya registró este grupo se conserva pero dejará de mostrarse en pantalla.')) return;
      cfg.groups = cfg.groups.filter(g => g.id !== btn.dataset.id);
      cfg.meals.forEach(m => { m.groups = m.groups.filter(gid => gid !== btn.dataset.id); });
      saveData();
      renderSettings();
    });
  });
  root.querySelectorAll('.group-move').forEach(btn => {
    btn.addEventListener('click', () => {
      moveInArray(cfg.groups, g => g.id === btn.dataset.id, btn.dataset.dir === 'up' ? -1 : 1);
      saveData();
      renderSettings();
    });
  });

  root.querySelector('#add-group').addEventListener('click', () => {
    const id = 'g_' + Date.now();
    cfg.groups.push({ id, name: 'Nuevo grupo', target: 1, color: '#8B9198' });
    saveData();
    renderSettings();
  });

  root.querySelectorAll('.meal-name-input').forEach(input => {
    input.addEventListener('change', e => {
      const m = cfg.meals.find(m => m.id === e.target.dataset.id);
      if (m && e.target.value.trim()) { m.name = e.target.value.trim(); saveData(); }
    });
  });
  root.querySelectorAll('.meal-delete').forEach(btn => {
    btn.addEventListener('click', () => {
      if (!confirm('¿Eliminar esta comida? El historial ya registrado se conserva.')) return;
      cfg.meals = cfg.meals.filter(m => m.id !== btn.dataset.id);
      saveData();
      renderSettings();
    });
  });
  root.querySelectorAll('.meal-move').forEach(btn => {
    btn.addEventListener('click', () => {
      const sorted = cfg.meals.slice().sort((a, b) => a.order - b.order);
      const idx = sorted.findIndex(m => m.id === btn.dataset.id);
      const dir = btn.dataset.dir === 'up' ? -1 : 1;
      const swapIdx = idx + dir;
      if (swapIdx < 0 || swapIdx >= sorted.length) return;
      const tmp = sorted[idx].order;
      sorted[idx].order = sorted[swapIdx].order;
      sorted[swapIdx].order = tmp;
      saveData();
      renderSettings();
    });
  });
  root.querySelectorAll('.meal-group-toggle').forEach(chk => {
    chk.addEventListener('change', e => {
      const m = cfg.meals.find(m => m.id === e.target.dataset.meal);
      const gid = e.target.dataset.group;
      if (!m) return;
      if (e.target.checked) {
        if (!m.groups.includes(gid)) m.groups.push(gid);
      } else {
        m.groups = m.groups.filter(g => g !== gid);
      }
      saveData();
    });
  });

  root.querySelector('#add-meal').addEventListener('click', () => {
    const id = 'm_' + Date.now();
    const maxOrder = Math.max(0, ...cfg.meals.map(m => m.order));
    cfg.meals.push({ id, name: 'Nueva comida', order: maxOrder + 1, groups: [] });
    saveData();
    renderSettings();
  });

  root.querySelector('#export-json').addEventListener('click', exportData);
  root.querySelector('#import-json').addEventListener('click', () => root.querySelector('#import-file-input').click());
  root.querySelector('#import-file-input').addEventListener('change', importData);
}

function moveInArray(arr, predicate, dir) {
  const idx = arr.findIndex(predicate);
  const swapIdx = idx + dir;
  if (idx < 0 || swapIdx < 0 || swapIdx >= arr.length) return;
  [arr[idx], arr[swapIdx]] = [arr[swapIdx], arr[idx]];
}

function renderGroupSettingRow(g) {
  return `
    <div class="settings-row">
      <span class="group-dot" style="--group-color:${g.color}"></span>
      <input class="group-name-input" data-id="${g.id}" value="${g.name}">
      <input class="group-target-input" data-id="${g.id}" type="number" min="0" step="0.5" value="${g.target}">
      <input class="group-color-input" data-id="${g.id}" type="color" value="${g.color}">
      <button class="btn-icon-small group-move" data-id="${g.id}" data-dir="up">↑</button>
      <button class="btn-icon-small group-move" data-id="${g.id}" data-dir="down">↓</button>
      <button class="btn-icon-small group-delete" data-id="${g.id}">✕</button>
    </div>
  `;
}

function renderMealSettingRow(m) {
  const cfg = state.config;
  return `
    <div class="settings-row settings-row-meal">
      <input class="meal-name-input" data-id="${m.id}" value="${m.name}">
      <button class="btn-icon-small meal-move" data-id="${m.id}" data-dir="up">↑</button>
      <button class="btn-icon-small meal-move" data-id="${m.id}" data-dir="down">↓</button>
      <button class="btn-icon-small meal-delete" data-id="${m.id}">✕</button>
      <div class="meal-group-toggles">
        ${cfg.groups.map(g => `
          <label class="meal-group-toggle-label">
            <input type="checkbox" class="meal-group-toggle" data-meal="${m.id}" data-group="${g.id}" ${m.groups.includes(g.id) ? 'checked' : ''}>
            ${g.name}
          </label>
        `).join('')}
      </div>
    </div>
  `;
}

// ---------------------------------------------------------------------------
// Exportar / importar
// ---------------------------------------------------------------------------

function exportData() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const filename = `eatin-respaldo-${todayKey()}.json`;
  state.config.lastExportAt = new Date().toISOString();
  saveData();

  if (navigator.share && navigator.canShare) {
    const file = new File([blob], filename, { type: 'application/json' });
    if (navigator.canShare({ files: [file] })) {
      navigator.share({ files: [file], title: 'Respaldo EatIn' }).catch(() => downloadBlob(blob, filename));
      return;
    }
  }
  downloadBlob(blob, filename);
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function importData(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(reader.result);
      if (!parsed.config || !parsed.log) throw new Error('Formato inválido');
      state = migrate(parsed);
      saveData();
      showToast('Datos importados correctamente.');
      renderSettings();
    } catch (err) {
      console.error(err);
      showToast('El archivo no tiene un formato válido.', true);
    }
  };
  reader.onerror = () => showToast('No se pudo leer el archivo.', true);
  reader.readAsText(file);
  e.target.value = '';
}

// ---------------------------------------------------------------------------
// Recordatorio de exportación
// ---------------------------------------------------------------------------

function checkExportReminder() {
  const last = state.config.lastExportAt;
  const days = last ? (Date.now() - new Date(last).getTime()) / 86400000 : Infinity;
  if (days >= 30) {
    showToast('Hace más de un mes que no exportas un respaldo. Ve a Configuración → Exportar.');
  }
}

// ---------------------------------------------------------------------------
// Navegación
// ---------------------------------------------------------------------------

function navigate(view) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.getElementById(`view-${view}`).classList.add('active');
  if (view === 'today') renderToday();
  if (view === 'history') renderHistory();
  if (view === 'settings') renderSettings();
}

// ---------------------------------------------------------------------------
// Toast
// ---------------------------------------------------------------------------

let toastTimer = null;
function showToast(msg, isError = false) {
  let el = document.getElementById('toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'toast';
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.className = isError ? 'toast toast-error show' : 'toast show';
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 4000);
}

// ---------------------------------------------------------------------------
// Reinicio diario: re-renderiza si cambia el día mientras la app está abierta
// ---------------------------------------------------------------------------

let lastKnownDay = null;
function watchDayChange() {
  const key = todayKey();
  if (lastKnownDay && lastKnownDay !== key) {
    renderToday();
  }
  lastKnownDay = key;
}

// ---------------------------------------------------------------------------
// Arranque
// ---------------------------------------------------------------------------

function init() {
  navigate('today');
  checkExportReminder();
  lastKnownDay = todayKey();
  setInterval(watchDayChange, 60 * 1000);

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').catch(err => console.error('SW registration failed', err));
    });
  }
}

document.addEventListener('DOMContentLoaded', init);
