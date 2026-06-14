import { supabase } from './lib/supabase.js';
import { iniciarSesion, cerrarSesion, restaurarSesion, getPerfil, onAuthChange } from './auth.js';
import { NEXUS_INFO } from './info-nexus.js';
import './styles.css';

// Estado
let tablaActual = 'alumnos';
let seccionActual = 'buscador';
let timeoutBusqueda = null;
let filtrosActuales = {};
let opcionesFiltros = {};
let busquedaId = 0;
let abortControllerBusqueda = null;
const cacheResultados = new Map(); // clave: "tabla|termino|filtrosJSON" → { data, timestamp }
const CACHE_TTL_MS = 30000; // 30 segundos de cache

// Referencias DOM
const loginScreen = document.getElementById('loginScreen');
const appContainer = document.getElementById('appContainer');
const loginForm = document.getElementById('loginForm');
const loginError = document.getElementById('loginError');
const loginBtnText = document.getElementById('loginBtnText');
const btnLoginInfo = document.getElementById('btnLoginInfo');
const loginInfoPanel = document.getElementById('loginInfoPanel');
const loginInfoNovedades = document.getElementById('loginInfoNovedades');
const loginInfoAcerca = document.getElementById('loginInfoAcerca');
const sidebar = document.getElementById('sidebar');
const sidebarOverlay = document.getElementById('sidebarOverlay');
const openSidebarBtn = document.getElementById('openSidebar');
const closeSidebarBtn = document.getElementById('closeSidebar');
const sidebarFilters = document.getElementById('sidebarFilters');
const mainFilters = document.getElementById('mainFilters');
const sidebarUser = document.getElementById('sidebarUser');
const userAvatar = document.getElementById('userAvatar');
const userName = document.getElementById('userName');
const userRole = document.getElementById('userRole');
const logoutBtn = document.getElementById('logoutBtn');
const modalLogout = document.getElementById('modalLogout');
const modalLogoutBackdrop = document.getElementById('modalLogoutBackdrop');
const btnCancelarLogout = document.getElementById('btnCancelarLogout');
const btnConfirmarLogout = document.getElementById('btnConfirmarLogout');
const logoutCountdown = document.getElementById('logoutCountdown');
const searchInput = document.getElementById('searchInput');
const resultsGrid = document.getElementById('resultsGrid');
const resultsTitle = document.getElementById('resultsTitle');
const resultsCount = document.getElementById('resultsCount');
const resultsActions = document.getElementById('resultsActions');
const sidebarLinks = document.querySelectorAll('.nx-sidebar-link');
const sectionBuscador = document.getElementById('sectionBuscador');
const sectionDashboard = document.getElementById('sectionDashboard');
const sectionInfo = document.getElementById('sectionInfo');
const infoSubtitle = document.getElementById('infoSubtitle');
const infoVersionNovedades = document.getElementById('infoVersionNovedades');
const infoNovedades = document.getElementById('infoNovedades');
const infoAcerca = document.getElementById('infoAcerca');
const loginInfoVersionNovedades = document.getElementById('loginInfoVersionNovedades');
const dashboardStatsGrid = document.getElementById('dashboardStatsGrid');
const dashboardUltimosAlumnos = document.getElementById('dashboardUltimosAlumnos');

// Modal CRUD



// Configuración por tabla
const configTablas = {
  alumnos: {
    titulo: 'Alumnos',
    campos: 'id, dni, nombre, apellido, email, especialidad, division, turno, email_padre, telefono, fecha_nacimiento, genero, nacionalidad, id_domicilio, id_curso',
    orden: { column: 'apellido', ascending: true },
    buscarEn: ['nombre', 'apellido', 'email'],
    filtros: [
      { key: 'turno', label: 'Turno', tipo: 'select', opciones: ['Mañana', 'Tarde', 'Noche'] },
      { key: 'especialidad', label: 'Especialidad', tipo: 'select', opciones: [] },
      { key: 'division', label: 'División', tipo: 'select', opciones: [] },
    ],
    pk: 'id',
    render: (row) => ({
      avatar: `${row.nombre?.[0] || ''}${row.apellido?.[0] || ''}`,
      titulo: `${row.apellido}, ${row.nombre}`,
      meta: [row.dni ? `DNI ${row.dni}` : null, row.division, row.turno].filter(Boolean),
      tags: [row.especialidad ? { text: row.especialidad, style: 'default' } : null].filter(Boolean),
    }),
  },
  responsables: {
    titulo: 'Responsables',
    campos: 'id, id_alumno, nombre, apellido, telefono, email, fecha_nacimiento, genero, nacionalidad, vinculo, id_domicilio',
    orden: { column: 'apellido', ascending: true },
    buscarEn: ['nombre', 'apellido', 'email', 'telefono'],
    filtros: [
      { key: 'vinculo', label: 'Vínculo', tipo: 'select', opciones: ['padre', 'madre', 'tutor', 'otro'] },
    ],
    pk: 'id',
    render: (row) => ({
      avatar: `${row.nombre?.[0] || ''}${row.apellido?.[0] || ''}`,
      titulo: `${row.apellido}, ${row.nombre}`,
      meta: [row.vinculo ? capitalizar(row.vinculo) : null, row.telefono].filter(Boolean),
      tags: [row.email ? { text: row.email, style: 'default' } : null].filter(Boolean),
    }),
  },
  personal: {
    titulo: 'Personal',
    campos: 'id, dni, nombre, apellido, email, telefono, fecha_nacimiento, genero, nacionalidad, id_domicilio',
    orden: { column: 'apellido', ascending: true },
    buscarEn: ['nombre', 'apellido', 'email'],
    filtros: [],
    pk: 'id',
    render: (row) => ({
      avatar: `${row.nombre?.[0] || ''}${row.apellido?.[0] || ''}`,
      titulo: `${row.apellido}, ${row.nombre}`,
      meta: [row.email].filter(Boolean),
      tags: [],
    }),
  },
  cursos: {
    titulo: 'Cursos',
    campos: 'id_curso, anio, division, turno, especialidad',
    orden: { column: 'anio', ascending: true },
    buscarEn: ['division', 'turno', 'especialidad'],
    filtros: [
      { key: 'turno', label: 'Turno', tipo: 'select', opciones: ['Mañana', 'Tarde', 'Noche'] },
      { key: 'especialidad', label: 'Especialidad', tipo: 'select', opciones: [] },
      { key: 'anio', label: 'Año', tipo: 'select', opciones: [] },
    ],
    pk: 'id_curso',
    render: (row) => ({
      avatar: `${row.anio || ''}°`,
      titulo: `${row.anio || ''}° ${row.division || ''} · ${row.turno || ''}`,
      meta: [row.especialidad].filter(Boolean),
      tags: row.especialidad ? [{ text: row.especialidad, style: 'default' }] : [],
    }),
  },
  materias: {
    titulo: 'Materias',
    campos: 'id_materia, nombre, descripcion',
    orden: { column: 'nombre', ascending: true },
    buscarEn: ['nombre', 'descripcion'],
    filtros: [],
    pk: 'id_materia',
    render: (row) => ({
      avatar: row.nombre?.[0] || 'M',
      titulo: row.nombre,
      meta: [row.descripcion].filter(Boolean),
      tags: [],
    }),
  },
  roles: {
    titulo: 'Roles',
    campos: 'id_rol, nombre, descripcion',
    orden: { column: 'nombre', ascending: true },
    buscarEn: ['nombre', 'descripcion'],
    filtros: [],
    pk: 'id_rol',
    render: (row) => ({
      avatar: row.nombre?.[0] || 'R',
      titulo: row.nombre,
      meta: [row.descripcion].filter(Boolean),
      tags: [],
    }),
  },
  domicilios: {
    titulo: 'Domicilios',
    campos: 'id_domicilio, calle, numero, departamento, localidad',
    orden: { column: 'calle', ascending: true },
    buscarEn: ['calle', 'localidad', 'departamento'],
    filtros: [
      { key: 'localidad', label: 'Localidad', tipo: 'select', opciones: [] },
    ],
    pk: 'id_domicilio',
    render: (row) => ({
      avatar: '📍',
      titulo: `${row.calle} ${row.numero}${row.departamento ? ' Dpto. ' + row.departamento : ''}`,
      meta: [row.localidad].filter(Boolean),
      tags: [],
    }),
  },
};

// Helpers
function capitalizar(str) {
  if (!str) return '';
  return str.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

function escapeHtml(text) {
  if (text == null) return '';
  const div = document.createElement('div');
  div.textContent = String(text);
  return div.innerHTML;
}

function mostrarToast(mensaje, tipo = 'success') {
  const existing = document.querySelector('.nx-toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = `nx-toast ${tipo === 'error' ? 'nx-toast-error' : ''}`;
  toast.innerHTML = `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      ${tipo === 'error'
        ? '<circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>'
        : '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>'}
    </svg>
    ${mensaje}
  `;
  document.body.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('show'));
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// ========== AUTH UI ==========
function showLogin() {
  loginScreen.classList.remove('hidden');
  appContainer.classList.add('hidden');
}

function showApp() {
  loginScreen.classList.add('hidden');
  appContainer.classList.remove('hidden');
}

function updateUserUI(perfil) {
  if (!perfil) { sidebarUser.style.display = 'none'; return; }
  sidebarUser.style.display = 'flex';
  userAvatar.textContent = `${perfil.nombre?.[0] || ''}${perfil.apellido?.[0] || ''}`;
  userName.textContent = `${perfil.apellido}, ${perfil.nombre}`;
  userRole.textContent = capitalizar(perfil.rol || 'usuario');
}

// Login
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;
  console.log('[Nexus Debug] Form submit → email:', email);
  loginBtnText.textContent = 'Ingresando...';
  loginError.classList.remove('show');

  try {
    const perfil = await iniciarSesion(email, password);
    console.log('[Nexus Debug] iniciarSesion retornó perfil:', perfil);
  } catch (err) {
    console.error('[Nexus] Login error:', err);

    let mensaje = err.message || 'Error al ingresar';

    // Mensajes descriptivos según tipo de error
    if (mensaje.includes('timeout') || mensaje.includes('Servidor lento') || mensaje.includes('fetch') || mensaje.includes('network')) {
      mensaje = 'Servidor lento o sin conexión. Reintentá en unos segundos.';
    } else if (mensaje.includes('Invalid login credentials')) {
      mensaje = 'Email o contraseña incorrectos.';
    } else if (mensaje.includes('Email not confirmed')) {
      mensaje = 'Email no confirmado. Revisá tu bandeja de entrada.';
    } else if (mensaje.includes('404') || mensaje.includes('not found') || mensaje.includes('PGRST')) {
      mensaje = 'Error de configuración. Ejecutá migracion_auth.sql en Supabase.';
    } else if (mensaje.includes('rate limit')) {
      mensaje = 'Demasiados intentos. Esperá unos minutos.';
    }

    mostrarToast(mensaje, 'error');
  } finally {
    loginBtnText.textContent = 'Ingresar';
  }
});

// Logout con modal de confirmación
let _logoutCountdownInterval = null;

function mostrarModalLogout() {
  if (!modalLogout) return;
  modalLogout.classList.remove('hidden');
  document.body.style.overflow = 'hidden';

  // Resetear botón
  btnConfirmarLogout.disabled = true;
  btnConfirmarLogout.style.opacity = '0.5';
  btnConfirmarLogout.style.cursor = 'not-allowed';
  let segundos = 5;
  logoutCountdown.textContent = segundos;

  if (_logoutCountdownInterval) clearInterval(_logoutCountdownInterval);
  _logoutCountdownInterval = setInterval(() => {
    segundos--;
    logoutCountdown.textContent = segundos;
    if (segundos <= 0) {
      clearInterval(_logoutCountdownInterval);
      btnConfirmarLogout.disabled = false;
      btnConfirmarLogout.style.opacity = '1';
      btnConfirmarLogout.style.cursor = 'pointer';
    }
  }, 1000);
}

function cerrarModalLogout() {
  if (!modalLogout) return;
  modalLogout.classList.add('hidden');
  document.body.style.overflow = '';
  if (_logoutCountdownInterval) {
    clearInterval(_logoutCountdownInterval);
    _logoutCountdownInterval = null;
  }
}

logoutBtn.addEventListener('click', () => {
  mostrarModalLogout();
});

btnCancelarLogout?.addEventListener('click', cerrarModalLogout);
modalLogoutBackdrop?.addEventListener('click', cerrarModalLogout);

btnConfirmarLogout?.addEventListener('click', async () => {
  cerrarModalLogout();
  await cerrarSesion();
});

// Auth state
onAuthChange((estado, perfil) => {
  console.log('[Nexus Debug] onAuthChange callback → estado:', estado, '| perfil:', perfil ? (perfil.email || 'sin email') : null);
  if (estado === 'signed_in' && perfil) {
    showApp();
    updateUserUI(perfil);
    iniciarApp();
  } else {
    showLogin();
    updateUserUI(null);
  }
});

// ========== NAVIGACION SECCIONES ==========
function mostrarSeccion(seccion) {
  seccionActual = seccion;
  if (seccion === 'dashboard') {
    sectionDashboard.classList.remove('hidden');
    sectionBuscador.classList.add('hidden');
    sectionInfo.classList.add('hidden');
    mainFilters.style.display = 'none';
    cargarDashboard();
  } else if (seccion === 'buscador') {
    sectionDashboard.classList.add('hidden');
    sectionBuscador.classList.remove('hidden');
    sectionInfo.classList.add('hidden');
    mainFilters.style.display = '';
  } else if (seccion === 'info') {
    sectionDashboard.classList.add('hidden');
    sectionBuscador.classList.add('hidden');
    sectionInfo.classList.remove('hidden');
    mainFilters.style.display = 'none';
    renderizarInfoNexus();
  }
  sidebarLinks.forEach(link => {
    const esActivo = link.dataset.table === seccion || link.dataset.section === seccion;
    link.classList.toggle('active', esActivo);
  });
  if (window.innerWidth <= 1024) closeSidebar();
}

// ========== SIDEBAR MOBILE ==========
function openSidebar() {
  sidebar.classList.add('open');
  sidebarOverlay.classList.add('show');
  document.body.style.overflow = 'hidden';
}
function closeSidebar() {
  sidebar.classList.remove('open');
  sidebarOverlay.classList.remove('show');
  document.body.style.overflow = '';
}
openSidebarBtn?.addEventListener('click', openSidebar);
closeSidebarBtn?.addEventListener('click', closeSidebar);
sidebarOverlay?.addEventListener('click', closeSidebar);

// ========== DASHBOARD ==========
async function cargarDashboard() {
  try {
    const [
      alumnos,
      personal,
      cursos,
      materias,
      responsables,
    ] = await Promise.all([
      supabase.from('alumnos').select('dni', { count: 'exact', head: true }),
      supabase.from('personal').select('dni', { count: 'exact', head: true }),
      supabase.from('cursos').select('id_curso', { count: 'exact', head: true }),
      supabase.from('materias').select('id_materia', { count: 'exact', head: true }),
      supabase.from('responsables').select('id', { count: 'exact', head: true }),
    ]);

    const { data: ultimosAlumnos } = await supabase
      .from('alumnos')
      .select('dni, nombre, apellido, division, turno')
      .order('created_at', { ascending: false })
      .limit(5);

    // Stats
    const stats = [
      { label: 'Alumnos', value: alumnos.count || 0, icon: '👨‍🎓' },
      { label: 'Personal', value: personal.count || 0, icon: '👩‍🏫' },
      { label: 'Cursos', value: cursos.count || 0, icon: '📚' },
      { label: 'Materias', value: materias.count || 0, icon: '📖' },
      { label: 'Responsables', value: responsables.count || 0, icon: '👨‍👩‍👧' },
    ];

    dashboardStatsGrid.innerHTML = stats.map(s => `
      <div class="nx-stat">
        <div class="nx-stat-icon">${s.icon}</div>
        <div class="nx-stat-value">${s.value}</div>
        <div class="nx-stat-label">${s.label}</div>
      </div>
    `).join('');

    // Últimos alumnos
    const alumnosRows = (ultimosAlumnos || []).map(a => `
      <div class="nx-dashboard-item">
        <div class="nx-dashboard-item-main">
          <span class="nx-dashboard-item-title">${escapeHtml(a.apellido)}, ${escapeHtml(a.nombre)}</span>
          <span class="nx-dashboard-item-meta">DNI ${a.dni} · ${a.division || ''} · ${a.turno || ''}</span>
        </div>
      </div>
    `).join('');
    dashboardUltimosAlumnos.innerHTML = alumnosRows || '<div class="nx-dashboard-empty">No hay alumnos</div>';
  } catch (err) {
    console.error('[Nexus] Error dashboard:', err);
  }
}

// ========== FILTROS ==========
async function cargarOpcionesFiltros() {
  try {
    const { data: espAlumnos } = await supabase.from('alumnos').select('especialidad').not('especialidad', 'is', null);
    opcionesFiltros['alumnos.especialidad'] = [...new Set((espAlumnos || []).map(a => a.especialidad).filter(Boolean))].sort();

    const { data: divAlumnos } = await supabase.from('alumnos').select('division').not('division', 'is', null);
    opcionesFiltros['alumnos.division'] = [...new Set((divAlumnos || []).map(a => a.division).filter(Boolean))].sort();

    const { data: espCursos } = await supabase.from('cursos').select('especialidad').not('especialidad', 'is', null);
    opcionesFiltros['cursos.especialidad'] = [...new Set((espCursos || []).map(c => c.especialidad).filter(Boolean))].sort();

    const { data: aniosCursos } = await supabase.from('cursos').select('anio').order('anio');
    opcionesFiltros['cursos.anio'] = [...new Set((aniosCursos || []).map(c => c.anio).filter(Boolean))].sort((a, b) => a - b).map(String);
  } catch (err) {
    console.error('[Nexus] Error filtros:', err);
  }
}

function renderizarFiltros() {
  const config = configTablas[tablaActual];
  mainFilters.innerHTML = '';

  if (!config.filtros || config.filtros.length === 0) {
    return;
  }

  const wrapper = document.createElement('div');
  wrapper.className = 'nx-filters-row';

  config.filtros.forEach(filtro => {
    const group = document.createElement('div');
    group.className = 'nx-filter-group';

    const label = document.createElement('label');
    label.className = 'nx-filter-label';
    label.textContent = filtro.label;
    group.appendChild(label);

    const valorActual = filtrosActuales[filtro.key];

    if (filtro.tipo === 'select') {
      let opciones = filtro.opciones;
      const keyDinamica = `${tablaActual}.${filtro.key}`;
      if (opcionesFiltros[keyDinamica] && opcionesFiltros[keyDinamica].length > 0) {
        opciones = opcionesFiltros[keyDinamica];
      }

      const select = document.createElement('select');
      select.className = 'nx-filter-select';
      select.dataset.filtro = filtro.key;
      select.innerHTML = `<option value="">Todos</option>` +
        opciones.map(op => {
          const val = typeof op === 'string' ? op : op.value;
          const lab = typeof op === 'string' ? capitalizar(op) : op.label;
          return `<option value="${escapeHtml(val)}" ${valorActual === val ? 'selected' : ''}>${escapeHtml(lab)}</option>`;
        }).join('');
      select.addEventListener('change', (e) => {
        filtrosActuales[filtro.key] = e.target.value || undefined;
        buscar(searchInput.value);
      });
      group.appendChild(select);
    } else if (filtro.tipo === 'chips') {
      const chipsContainer = document.createElement('div');
      chipsContainer.className = 'nx-filter-chips';
      filtro.opciones.forEach(op => {
        const chip = document.createElement('button');
        chip.className = 'nx-filter-chip';
        chip.type = 'button';
        chip.textContent = op.label;
        if (valorActual === op.value) chip.classList.add('active');
        chip.addEventListener('click', () => {
          const yaActivo = chip.classList.contains('active');
          chipsContainer.querySelectorAll('.nx-filter-chip').forEach(c => c.classList.remove('active'));
          if (!yaActivo) {
            chip.classList.add('active');
            filtrosActuales[filtro.key] = op.value;
          } else {
            delete filtrosActuales[filtro.key];
          }
          buscar(searchInput.value);
        });
        chipsContainer.appendChild(chip);
      });
      group.appendChild(chipsContainer);
    }

    wrapper.appendChild(group);
  });

  if (Object.keys(filtrosActuales).length > 0) {
    const resetBtn = document.createElement('button');
    resetBtn.className = 'nx-filter-reset';
    resetBtn.type = 'button';
    resetBtn.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 12"/><path d="M3 3v9h9"/></svg> Limpiar filtros`;
    resetBtn.addEventListener('click', () => {
      filtrosActuales = {};
      renderizarFiltros();
      buscar(searchInput.value);
    });
    wrapper.appendChild(resetBtn);
  }

  mainFilters.appendChild(wrapper);
}

// ========== CACHE & HELPERS ==========
function cacheKey(tabla, termino, filtros) {
  return `${tabla}|${termino || ''}|${JSON.stringify(filtros || {})}`;
}

function getCache(tabla, termino, filtros) {
  const key = cacheKey(tabla, termino, filtros);
  const entry = cacheResultados.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    cacheResultados.delete(key);
    return null;
  }
  return entry.data;
}

function setCache(tabla, termino, filtros, data) {
  const key = cacheKey(tabla, termino, filtros);
  cacheResultados.set(key, { data, timestamp: Date.now() });
}

function limpiarCacheTabla(tabla) {
  for (const key of cacheResultados.keys()) {
    if (key.startsWith(`${tabla}|`)) cacheResultados.delete(key);
  }
}

function renderizarGrid(data, config) {
  resultsCount.textContent = `${data?.length || 0} resultado${data?.length !== 1 ? 's' : ''}`;

  if (!data || data.length === 0) {
    resultsGrid.innerHTML = `
      <div class="nx-empty">
        <div class="nx-empty-icon"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg></div>
        <p class="nx-empty-text">${searchInput.value ? `No se encontraron resultados para "${escapeHtml(searchInput.value)}"` : 'No hay registros para mostrar'}</p>
      </div>`;
    return;
  }

  const fragment = document.createDocumentFragment();

  data.forEach(row => {
    const rendered = config.render(row);
    const meta = rendered.meta.map(m => `<span>${escapeHtml(m)}</span>`).join(' · ');
    const tags = rendered.tags.map(t => {
      const sc = t.style === 'purple' ? 'nx-card-tag-purple' : t.style === 'amber' ? 'nx-card-tag-amber' : '';
      return `<span class="nx-card-tag ${sc}">${escapeHtml(t.text)}</span>`;
    }).join('');

    const div = document.createElement('div');
    div.className = 'nx-card';
    div.innerHTML = `
      <div class="nx-card-avatar">${escapeHtml(rendered.avatar)}</div>
      <div class="nx-card-body">
        <div class="nx-card-title">${escapeHtml(rendered.titulo)}</div>
        <div class="nx-card-meta">${meta}</div>
        ${tags ? `<div style="margin-top:8px;display:flex;gap:6px;flex-wrap:wrap;">${tags}</div>` : ''}
      </div>`;
    fragment.appendChild(div);
  });

  resultsGrid.innerHTML = '';
  resultsGrid.appendChild(fragment);
}

// ========== BUSQUEDA ==========
async function buscar(query) {
  busquedaId++;
  const estaBusqueda = busquedaId;
  const config = configTablas[tablaActual];
  resultsTitle.textContent = config.titulo;

  const termino = query?.trim();
  const filtrosKey = { ...filtrosActuales };

  // 1. Revisar cache
  const cacheado = getCache(tablaActual, termino, filtrosKey);
  if (cacheado) {
    renderizarGrid(cacheado, config);
    return;
  }

  // 2. Cancelar request anterior realmente (abort HTTP)
  if (abortControllerBusqueda) {
    abortControllerBusqueda.abort();
  }
  abortControllerBusqueda = new AbortController();

  // 3. Mostrar skeleton solo si no hay datos visibles
  if (!resultsGrid.querySelector('.nx-card')) {
    resultsGrid.innerHTML = `
      <div class="nx-empty">
        <div class="nx-empty-icon" style="animation: nx-pulse 1.5s infinite;">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
        </div>
        <p class="nx-empty-text">Cargando...</p>
      </div>`;
  }

  try {
    let supaQuery = supabase
      .from(tablaActual)
      .select(config.campos)
      .order(config.orden.column, { ascending: config.orden.ascending })
      .limit(50);

    if (termino && termino.length >= 1) {
      const esNumero = /^\d+$/.test(termino);
      if (esNumero) {
        const num = parseInt(termino, 10);
        if (tablaActual === 'alumnos' || tablaActual === 'personal') {
          supaQuery = supaQuery.or(`dni.eq.${num}`);
        } else if (tablaActual === 'cursos') {
          supaQuery = supaQuery.or(`anio.eq.${num}`);
        } else if (tablaActual === 'domicilios') {
          supaQuery = supaQuery.or(`numero.eq.${num}`);
        }
      }
      if (config.buscarEn.length > 0) {
        const terminoEscapado = termino.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');
        const filtros = config.buscarEn.map(campo => `${campo}.ilike.%${terminoEscapado}%`).join(',');
        supaQuery = supaQuery.or(filtros);
      }
    }

    Object.entries(filtrosActuales).forEach(([key, value]) => {
      if (value === undefined || value === '') return;
      supaQuery = supaQuery.eq(key, value);
    });

    const { data, error } = await supaQuery.abortSignal(abortControllerBusqueda.signal);

    // Ignorar resultados de queries viejas o canceladas
    if (estaBusqueda !== busquedaId) return;
    if (error) throw error;

    // Guardar en cache
    setCache(tablaActual, termino, filtrosKey, data);

    renderizarGrid(data, config);
  } catch (err) {
    if (err.name === 'AbortError') return; // Query cancelada intencionalmente
    console.error('[Nexus] Error:', err);
    mostrarToast('Error al cargar datos.', 'error');
    resultsGrid.innerHTML = `
      <div class="nx-empty">
        <div class="nx-empty-icon" style="color:#ef4444"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg></div>
        <p class="nx-empty-text">Error de conexión</p>
      </div>`;
  }
}

// Cambio de tabla
function cambiarTabla(nuevaTabla) {
  tablaActual = nuevaTabla;
  filtrosActuales = {};
  const config = configTablas[tablaActual];
  const placeholders = {
    alumnos: 'Buscar por nombre, apellido, DNI, email...',
    responsables: 'Buscar por nombre, apellido, teléfono...',
    personal: 'Buscar por nombre, apellido, email...',
    cursos: 'Buscar por año, división, turno, especialidad...',
    materias: 'Buscar por nombre o descripción...',
    roles: 'Buscar por nombre o descripción...',
    domicilios: 'Buscar por calle, localidad, departamento...',

  };
  searchInput.placeholder = placeholders[tablaActual] || 'Buscar...';

  resultsActions.innerHTML = '';
  renderizarFiltros();
  buscar('');
}

sidebarLinks.forEach(link => {
  link.addEventListener('click', () => {
    if (link.dataset.table) {
      mostrarSeccion('buscador');
      cambiarTabla(link.dataset.table);
    } else if (link.dataset.section) {
      mostrarSeccion(link.dataset.section);
    }
  });
});

searchInput.addEventListener('input', (e) => {
  clearTimeout(timeoutBusqueda);
  timeoutBusqueda = setTimeout(() => buscar(e.target.value), 250);
});

searchInput.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') { searchInput.value = ''; buscar(''); searchInput.blur(); }
});

// ========== INFO NEXUS ==========
function htmlNovedades() {
  if (!NEXUS_INFO.novedades?.length) {
    return '<p class="nx-info-empty">No hay novedades registradas.</p>';
  }

  const ultima = NEXUS_INFO.novedades[0];
  const items = ultima.items.map(item => `
    <li class="nx-info-list-item">
      <svg class="nx-info-check" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
      <span>${escapeHtml(item)}</span>
    </li>
  `).join('');

  return `
    <ul class="nx-info-list">
      ${items}
    </ul>
  `;
}

function htmlAcercaDe() {
  const integrantes = NEXUS_INFO.integrantes.map(i => `
    <li>${escapeHtml(i.nombre)}</li>
  `).join('');

  return `
    <div class="nx-info-about-block">
      <p class="nx-info-project-name"><strong>Nexus — Base de Datos Escolar Maestra</strong></p>
      <p class="nx-info-label">Creada por:</p>
      <ul class="nx-info-names-list">
        ${integrantes || '<li class="nx-info-empty">Sin integrantes registrados.</li>'}
      </ul>
      <p class="nx-info-version-line">Versión <span class="nx-info-version-code">${escapeHtml(NEXUS_INFO.version)}</span></p>
      <div class="nx-info-contact-box">
        <p class="nx-info-contact-title">¿Encontraste un error?</p>
        <p class="nx-info-contact-text">En caso de errores o fallas, notificar a <a href="mailto:${escapeHtml(NEXUS_INFO.contacto)}" class="nx-info-contact-link">${escapeHtml(NEXUS_INFO.contacto)}</a></p>
      </div>
    </div>
  `;
}

function renderizarInfoNexus() {
  if (!infoNovedades || !infoAcerca || !infoSubtitle) return;

  infoSubtitle.textContent = `Versión ${NEXUS_INFO.version} · ${NEXUS_INFO.fecha_release}`;
  if (infoVersionNovedades) infoVersionNovedades.textContent = NEXUS_INFO.novedades?.[0]?.version || NEXUS_INFO.version;

  infoNovedades.innerHTML = htmlNovedades();
  infoAcerca.innerHTML = htmlAcercaDe();
}

function renderizarLoginInfo() {
  if (!loginInfoNovedades || !loginInfoAcerca) return;

  if (loginInfoVersionNovedades) loginInfoVersionNovedades.textContent = NEXUS_INFO.novedades?.[0]?.version || NEXUS_INFO.version;

  loginInfoNovedades.innerHTML = htmlNovedades();
  loginInfoAcerca.innerHTML = htmlAcercaDe();
}

btnLoginInfo?.addEventListener('click', () => {
  const visible = !loginInfoPanel.classList.contains('hidden');
  if (visible) {
    loginInfoPanel.classList.add('hidden');
    btnLoginInfo.classList.remove('active');
    btnLoginInfo.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
      Acerca de Nexus
    `;
  } else {
    renderizarLoginInfo();
    loginInfoPanel.classList.remove('hidden');
    btnLoginInfo.classList.add('active');
    btnLoginInfo.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 15l-6-6-6 6"/></svg>
      Ocultar información
    `;
    loginInfoPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
});

// ========== INICIALIZAR ==========
async function iniciarApp() {
  await cargarOpcionesFiltros();
  mostrarSeccion('dashboard');
  renderizarFiltros();
}

(async () => {
  const perfil = await restaurarSesion();
  if (perfil) {
    showApp();
    updateUserUI(perfil);
    iniciarApp();
  } else {
    showLogin();
  }
})();
