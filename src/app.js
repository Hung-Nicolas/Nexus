import { supabase } from './lib/supabase.js';
import { iniciarSesion, cerrarSesion, restaurarSesion, getPerfil, onAuthChange, listarUsuarios, crearUsuario, eliminarUsuario, cambiarPasswordUsuario } from './auth.js';
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
let usuariosLista = [];
let mostrarFormUsuario = false;

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
const sectionUsuarios = document.getElementById('sectionUsuarios');
const sectionDashboard = document.getElementById('sectionDashboard');
const sectionInfo = document.getElementById('sectionInfo');
const infoSubtitle = document.getElementById('infoSubtitle');
const infoVersionNovedades = document.getElementById('infoVersionNovedades');
const infoNovedades = document.getElementById('infoNovedades');
const infoAcerca = document.getElementById('infoAcerca');
const loginInfoVersionNovedades = document.getElementById('loginInfoVersionNovedades');
const dashboardStatsGrid = document.getElementById('dashboardStatsGrid');
const dashboardUltimosAlumnos = document.getElementById('dashboardUltimosAlumnos');
const btnNuevoUsuario = document.getElementById('btnNuevoUsuario');
const formUsuarioContainer = document.getElementById('formUsuarioContainer');
const btnGuardarUsuario = document.getElementById('btnGuardarUsuario');
const btnCancelarUsuario = document.getElementById('btnCancelarUsuario');
const usuarioError = document.getElementById('usuarioError');
const usuariosGrid = document.getElementById('usuariosGrid');

// Modal CRUD
const modalCRUD = document.getElementById('modalCRUD');
const modalTitulo = document.getElementById('modalTitulo');
const modalBody = document.getElementById('modalBody');
const modalCerrar = document.getElementById('modalCerrar');
const modalCancelar = document.getElementById('modalCancelar');
const modalGuardar = document.getElementById('modalGuardar');
const modalBackdrop = document.getElementById('modalBackdrop');
let modalOnGuardar = null;



// Configuración por tabla
const configTablas = {
  alumnos: {
    titulo: 'Alumnos',
    campos: 'dni, nombre, apellido, email, especialidad, division, turno, email_padre, telefono, fecha_nacimiento, genero, nacionalidad, id_domicilio, id_curso',
    orden: { column: 'apellido', ascending: true },
    buscarEn: ['nombre', 'apellido', 'email'],
    filtros: [
      { key: 'turno', label: 'Turno', tipo: 'select', opciones: ['Mañana', 'Tarde', 'Noche'] },
      { key: 'especialidad', label: 'Especialidad', tipo: 'select', opciones: [] },
      { key: 'division', label: 'División', tipo: 'select', opciones: [] },
    ],
    pk: 'dni',
    editable: true,
    camposFormulario: [
      { key: 'dni', label: 'DNI', tipo: 'number', required: true },
      { key: 'nombre', label: 'Nombre', tipo: 'text', required: true },
      { key: 'apellido', label: 'Apellido', tipo: 'text', required: true },
      { key: 'email', label: 'Email', tipo: 'email' },
      { key: 'especialidad', label: 'Especialidad', tipo: 'text' },
      { key: 'division', label: 'División', tipo: 'text', required: true },
      { key: 'turno', label: 'Turno', tipo: 'select', opciones: ['Mañana', 'Tarde', 'Noche'], required: true },
      { key: 'email_padre', label: 'Email del padre/tutor', tipo: 'email' },
      { key: 'telefono', label: 'Teléfono', tipo: 'text' },
      { key: 'fecha_nacimiento', label: 'Fecha de nacimiento', tipo: 'date' },
      { key: 'genero', label: 'Género', tipo: 'select', opciones: ['masculino', 'femenino', 'no_binario', 'otro', 'prefiero_no_decirlo'] },
      { key: 'nacionalidad', label: 'Nacionalidad', tipo: 'text' },
      { key: 'id_domicilio', label: 'Domicilio', tipo: 'select', tabla: 'domicilios', labelField: 'calle,numero,localidad', valueField: 'id_domicilio' },
      { key: 'id_curso', label: 'Curso', tipo: 'select', tabla: 'cursos', labelField: 'anio,division,turno' },
    ],
    render: (row) => ({
      avatar: `${row.nombre?.[0] || ''}${row.apellido?.[0] || ''}`,
      titulo: `${row.apellido}, ${row.nombre}`,
      meta: [row.dni ? `DNI ${row.dni}` : null, row.division, row.turno].filter(Boolean),
      tags: [row.especialidad ? { text: row.especialidad, style: 'default' } : null].filter(Boolean),
    }),
  },
  responsables: {
    titulo: 'Responsables',
    campos: 'id_responsable, dni_alumno, nombre, apellido, telefono, email, fecha_nacimiento, genero, nacionalidad, vinculo, id_domicilio',
    orden: { column: 'apellido', ascending: true },
    buscarEn: ['nombre', 'apellido', 'email', 'telefono'],
    filtros: [
      { key: 'vinculo', label: 'Vínculo', tipo: 'select', opciones: ['padre', 'madre', 'tutor', 'otro'] },
    ],
    pk: 'id_responsable',
    editable: true,
    camposFormulario: [
      { key: 'dni_alumno', label: 'Alumno (DNI)', tipo: 'select', tabla: 'alumnos', labelField: 'apellido,nombre', valueField: 'dni', required: true },
      { key: 'nombre', label: 'Nombre', tipo: 'text', required: true },
      { key: 'apellido', label: 'Apellido', tipo: 'text', required: true },
      { key: 'telefono', label: 'Teléfono', tipo: 'text' },
      { key: 'email', label: 'Email', tipo: 'email' },
      { key: 'fecha_nacimiento', label: 'Fecha de nacimiento', tipo: 'date' },
      { key: 'genero', label: 'Género', tipo: 'select', opciones: ['masculino', 'femenino', 'no_binario', 'otro', 'prefiero_no_decirlo'] },
      { key: 'nacionalidad', label: 'Nacionalidad', tipo: 'text' },
      { key: 'vinculo', label: 'Vínculo', tipo: 'select', opciones: ['padre', 'madre', 'tutor', 'otro'], required: true },
      { key: 'id_domicilio', label: 'Domicilio', tipo: 'select', tabla: 'domicilios', labelField: 'calle,numero,localidad', valueField: 'id_domicilio' },
    ],
    render: (row) => ({
      avatar: `${row.nombre?.[0] || ''}${row.apellido?.[0] || ''}`,
      titulo: `${row.apellido}, ${row.nombre}`,
      meta: [row.vinculo ? capitalizar(row.vinculo) : null, row.telefono].filter(Boolean),
      tags: [row.email ? { text: row.email, style: 'default' } : null].filter(Boolean),
    }),
  },
  personal: {
    titulo: 'Personal',
    campos: 'dni, nombre, apellido, email, telefono, fecha_nacimiento, genero, nacionalidad, id_domicilio',
    orden: { column: 'apellido', ascending: true },
    buscarEn: ['nombre', 'apellido', 'email'],
    filtros: [],
    pk: 'dni',
    editable: true,
    camposFormulario: [
      { key: 'dni', label: 'DNI', tipo: 'number', required: true },
      { key: 'nombre', label: 'Nombre', tipo: 'text', required: true },
      { key: 'apellido', label: 'Apellido', tipo: 'text', required: true },
      { key: 'email', label: 'Email', tipo: 'email', required: true },
      { key: 'telefono', label: 'Teléfono', tipo: 'text' },
      { key: 'fecha_nacimiento', label: 'Fecha de nacimiento', tipo: 'date' },
      { key: 'genero', label: 'Género', tipo: 'select', opciones: ['masculino', 'femenino', 'no_binario', 'otro', 'prefiero_no_decirlo'] },
      { key: 'nacionalidad', label: 'Nacionalidad', tipo: 'text' },
      { key: 'id_domicilio', label: 'Domicilio', tipo: 'select', tabla: 'domicilios', labelField: 'calle,numero,localidad', valueField: 'id_domicilio' },
    ],
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
    editable: true,
    camposFormulario: [
      { key: 'anio', label: 'Año', tipo: 'number', required: true },
      { key: 'division', label: 'División', tipo: 'text', required: true },
      { key: 'turno', label: 'Turno', tipo: 'select', opciones: ['Mañana', 'Tarde', 'Noche'], required: true },
      { key: 'especialidad', label: 'Especialidad', tipo: 'text' },
    ],
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
    editable: true,
    camposFormulario: [
      { key: 'nombre', label: 'Nombre', tipo: 'text', required: true },
      { key: 'descripcion', label: 'Descripción', tipo: 'textarea' },
    ],
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
    editable: true,
    camposFormulario: [
      { key: 'nombre', label: 'Nombre', tipo: 'text', required: true },
      { key: 'descripcion', label: 'Descripción', tipo: 'textarea' },
    ],
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
    editable: true,
    camposFormulario: [
      { key: 'calle', label: 'Calle', tipo: 'text', required: true },
      { key: 'numero', label: 'Número', tipo: 'number', required: true },
      { key: 'departamento', label: 'Departamento', tipo: 'text' },
      { key: 'localidad', label: 'Localidad', tipo: 'text', required: true },
    ],
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
  userRole.textContent = 'Regente';
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
    sectionUsuarios.classList.add('hidden');
    sectionInfo.classList.add('hidden');
    mainFilters.style.display = 'none';
    cargarDashboard();
  } else if (seccion === 'buscador') {
    sectionDashboard.classList.add('hidden');
    sectionBuscador.classList.remove('hidden');
    sectionUsuarios.classList.add('hidden');
    sectionInfo.classList.add('hidden');
    mainFilters.style.display = '';
  } else if (seccion === 'usuarios') {
    sectionDashboard.classList.add('hidden');
    sectionBuscador.classList.add('hidden');
    sectionUsuarios.classList.remove('hidden');
    sectionInfo.classList.add('hidden');
    mainFilters.style.display = 'none';
    cargarUsuarios();
  } else if (seccion === 'info') {
    sectionDashboard.classList.add('hidden');
    sectionBuscador.classList.add('hidden');
    sectionUsuarios.classList.add('hidden');
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
      supabase.from('responsables').select('id_responsable', { count: 'exact', head: true }),
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
    const pkValue = row[config.pk];
    const acciones = config.editable ? `
      <div class="nx-card-actions">
        <button class="nx-card-action-btn nx-card-action-edit" title="Editar" data-pk="${escapeHtml(String(pkValue))}">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        </button>
        <button class="nx-card-action-btn nx-card-action-delete" title="Eliminar" data-pk="${escapeHtml(String(pkValue))}">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
        </button>
      </div>` : '';

    const div = document.createElement('div');
    div.className = 'nx-card nx-card-crud nx-card-clickable';
    div.dataset.pk = String(pkValue);
    div.innerHTML = `
      <div class="nx-card-avatar">${escapeHtml(rendered.avatar)}</div>
      <div class="nx-card-body">
        <div class="nx-card-title">${escapeHtml(rendered.titulo)}</div>
        <div class="nx-card-meta">${meta}</div>
        ${tags ? `<div style="margin-top:8px;display:flex;gap:6px;flex-wrap:wrap;">${tags}</div>` : ''}
      </div>
      ${acciones}`;
    fragment.appendChild(div);
  });

  resultsGrid.innerHTML = '';
  resultsGrid.appendChild(fragment);

  // Bind click en cards → detalle
  resultsGrid.querySelectorAll('.nx-card-clickable').forEach(card => {
    card.addEventListener('click', () => abrirDetalleRegistro(tablaActual, card.dataset.pk));
  });

  // Bind editar/eliminar (stopPropagation para no abrir detalle)
  if (config.editable) {
    resultsGrid.querySelectorAll('.nx-card-action-edit').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        abrirFormularioEditar(tablaActual, btn.dataset.pk);
      });
    });
    resultsGrid.querySelectorAll('.nx-card-action-delete').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        abrirModalConfirmarEliminar(tablaActual, btn.dataset.pk);
      });
    });
  }
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

  // Botón "Nuevo" para tablas editables
  resultsActions.innerHTML = '';
  if (config?.editable) {
    const btn = document.createElement('button');
    btn.className = 'nx-login-btn';
    btn.style.cssText = 'padding: 8px 16px; font-size: 13px;';
    btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display:inline;vertical-align:middle;margin-right:4px;"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> Nuevo ${config.titulo.toLowerCase().slice(0, -1)}`;
    btn.addEventListener('click', () => abrirFormularioCrear(tablaActual));
    resultsActions.appendChild(btn);
  }

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

// ========== USUARIOS ==========
async function cargarUsuarios() {
  usuariosGrid.innerHTML = `
    <div class="nx-empty">
      <div class="nx-empty-icon" style="animation: nx-pulse 1.5s infinite;"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg></div>
      <p class="nx-empty-text">Cargando usuarios...</p>
    </div>`;

  try {
    const { data, error } = await listarUsuarios();
    if (error) throw error;
    usuariosLista = data || [];

    if (usuariosLista.length === 0) {
      usuariosGrid.innerHTML = `<div class="nx-empty"><div class="nx-empty-icon"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg></div><p class="nx-empty-text">No hay usuarios registrados</p></div>`;
      return;
    }

    usuariosGrid.innerHTML = `
      <div style="overflow-x: auto;">
        <table style="width:100%;border-collapse:collapse;font-size:13px;">
          <thead>
            <tr style="border-bottom: 1px solid var(--nx-border); color: var(--nx-text-dim); text-align: left;">
              <th style="padding: 10px 12px;">Usuario</th>
              <th style="padding: 10px 12px;">Email</th>
              <th style="padding: 10px 12px;">Rol</th>
              <th style="padding: 10px 12px;">Estado</th>
              <th style="padding: 10px 12px; text-align: right;">Acciones</th>
            </tr>
          </thead>
          <tbody>
            ${usuariosLista.map(u => `
              <tr style="border-bottom: 1px solid var(--nx-border); transition: background 0.15s;" onmouseover="this.style.background='rgba(148,163,184,0.04)'" onmouseout="this.style.background=''">
                <td style="padding: 12px;">
                  <div style="display:flex;align-items:center;gap:10px;">
                    <div class="nx-card-avatar" style="width:32px;height:32px;font-size:12px;">${u.nombre?.[0] || ''}${u.apellido?.[0] || ''}</div>
                    <span style="color:var(--nx-text);font-weight:500;">${escapeHtml(u.apellido)}, ${escapeHtml(u.nombre)}</span>
                  </div>
                </td>
                <td style="padding: 12px; color: var(--nx-text-muted);">${escapeHtml(u.email)}</td>
                <td style="padding: 12px;"><span class="nx-card-tag">${escapeHtml(capitalizar(u.rol))}</span></td>
                <td style="padding: 12px;"><span style="color:#4ade80;font-size:12px;">●</span></td>
                <td style="padding: 12px; text-align: right;">
                  ${u.id !== getPerfil()?.id ? `
                    <button class="nx-filter-reset" style="color:#f87171;" onclick="eliminarUsuarioHandler('${u.id}')">Eliminar</button>
                  ` : '<span style="color:var(--nx-text-dim);font-size:12px;">Vos</span>'}
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>`;
  } catch (err) {
    console.error('[Nexus] Error usuarios:', err);
    usuariosGrid.innerHTML = `<div class="nx-empty"><div class="nx-empty-icon" style="color:#ef4444"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg></div><p class="nx-empty-text">Error al cargar usuarios</p></div>`;
  }
}

// Crear usuario
btnNuevoUsuario.addEventListener('click', () => {
  mostrarFormUsuario = !mostrarFormUsuario;
  formUsuarioContainer.classList.toggle('hidden', !mostrarFormUsuario);
  usuarioError.classList.remove('show');
});

btnCancelarUsuario.addEventListener('click', () => {
  mostrarFormUsuario = false;
  formUsuarioContainer.classList.add('hidden');
  usuarioError.classList.remove('show');
});

btnGuardarUsuario.addEventListener('click', async () => {
  const nombre = document.getElementById('newNombre').value.trim();
  const apellido = document.getElementById('newApellido').value.trim();
  const email = document.getElementById('newEmail').value.trim();
  const password = document.getElementById('newPassword').value;

  if (!nombre || !apellido || !email || !password) {
    usuarioError.textContent = 'Completá todos los campos';
    usuarioError.classList.add('show');
    return;
  }
  if (password.length < 6) {
    usuarioError.textContent = 'La contraseña debe tener al menos 6 caracteres';
    usuarioError.classList.add('show');
    return;
  }

  btnGuardarUsuario.textContent = 'Creando...';
  try {
    await crearUsuario(email, password, nombre, apellido);
    mostrarToast('Usuario creado correctamente');
    document.getElementById('newNombre').value = '';
    document.getElementById('newApellido').value = '';
    document.getElementById('newEmail').value = '';
    document.getElementById('newPassword').value = '';
    mostrarFormUsuario = false;
    formUsuarioContainer.classList.add('hidden');
    usuarioError.classList.remove('show');
    cargarUsuarios();
  } catch (err) {
    usuarioError.textContent = err.message || 'Error al crear usuario';
    usuarioError.classList.add('show');
  } finally {
    btnGuardarUsuario.textContent = 'Crear usuario';
  }
});

// Handler global para eliminar usuario (desde HTML inline)
window.eliminarUsuarioHandler = async (userId) => {
  if (!confirm('¿Eliminar este usuario permanentemente?')) return;
  try {
    await eliminarUsuario(userId);
    mostrarToast('Usuario eliminado');
    cargarUsuarios();
  } catch (err) {
    mostrarToast(err.message || 'Error al eliminar', 'error');
  }
};

// ========== CRUD GENÉRICO CON MODAL ==========

function abrirModal(titulo, bodyHTML, onGuardar) {
  modalTitulo.textContent = titulo;
  modalBody.innerHTML = bodyHTML;
  modalOnGuardar = onGuardar;
  modalCRUD.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
  // Focus en primer input
  setTimeout(() => {
    const firstInput = modalBody.querySelector('input, select, textarea');
    firstInput?.focus();
  }, 100);
}

function cerrarModal() {
  modalCRUD.classList.add('hidden');
  document.body.style.overflow = '';
  modalOnGuardar = null;

  // Restaurar botón Guardar
  modalGuardar.classList.remove('hidden');

  // Limpiar botones dinámicos de detalle
  const footer = modalGuardar.parentElement;
  footer.querySelector('.nx-modal-btn-editar')?.remove();
  footer.querySelector('.nx-modal-btn-eliminar')?.remove();
}

modalCerrar.addEventListener('click', cerrarModal);
modalCancelar.addEventListener('click', cerrarModal);
modalBackdrop.addEventListener('click', cerrarModal);
modalGuardar.addEventListener('click', () => {
  if (modalOnGuardar) modalOnGuardar();
});

// Cerrar modal con Escape
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !modalCRUD.classList.contains('hidden')) {
    cerrarModal();
  }
});

async function cargarOpcionesSelect(tabla, labelField, valueField = null) {
  try {
    const { data, error } = await supabase.from(tabla).select('*').order(labelField.split(',')[0]);
    if (error) throw error;
    return (data || []).map(row => {
      const label = labelField.split(',').map(f => row[f.trim()]).filter(Boolean).join(' · ');
      const value = valueField ? row[valueField] : row[labelField.split(',')[0].trim()];
      return { value, label };
    });
  } catch (err) {
    console.error('[Nexus] Error cargando opciones:', err);
    return [];
  }
}

function renderizarCampoFormulario(campo, valor = '') {
  const valorEscapado = escapeHtml(valor);
  const required = campo.required ? 'required' : '';

  if (campo.tipo === 'textarea') {
    return `
      <div class="nx-login-field nx-form-field-full">
        <label class="nx-login-label">${campo.label}${campo.required ? ' *' : ''}</label>
        <textarea class="nx-login-input" data-campo="${campo.key}" rows="3" ${required}>${valorEscapado}</textarea>
      </div>`;
  }
  if (campo.tipo === 'select') {
    return `
      <div class="nx-login-field">
        <label class="nx-login-label">${campo.label}${campo.required ? ' *' : ''}</label>
        <select class="nx-login-input" data-campo="${campo.key}" ${required}>
          <option value="">Seleccionar...</option>
          ${(campo.opciones || []).map(op => `<option value="${escapeHtml(op)}" ${valorEscapado === op ? 'selected' : ''}>${escapeHtml(capitalizar(op))}</option>`).join('')}
        </select>
      </div>`;
  }
  return `
    <div class="nx-login-field">
      <label class="nx-login-label">${campo.label}${campo.required ? ' *' : ''}</label>
      <input type="${campo.tipo}" class="nx-login-input" data-campo="${campo.key}" value="${valorEscapado}" placeholder="${campo.label}" ${required}>
    </div>`;
}

async function construirFormularioHTML(entidad, datos = null) {
  const config = configTablas[entidad];
  if (!config?.camposFormulario) return '';

  const camposHTML = [];
  for (const campo of config.camposFormulario) {
    let valor = datos?.[campo.key] ?? '';

    // Si es select con tabla, cargar opciones dinámicamente
    if (campo.tipo === 'select' && campo.tabla) {
      const opciones = await cargarOpcionesSelect(campo.tabla, campo.labelField, campo.valueField);
      const optionsHTML = opciones.map(op =>
        `<option value="${escapeHtml(String(op.value))}" ${String(valor) === String(op.value) ? 'selected' : ''}>${escapeHtml(op.label)}</option>`
      ).join('');
      camposHTML.push(`
        <div class="nx-login-field">
          <label class="nx-login-label">${campo.label}${campo.required ? ' *' : ''}</label>
          <select class="nx-login-input" data-campo="${campo.key}" ${campo.required ? 'required' : ''}>
            <option value="">Seleccionar...</option>
            ${optionsHTML}
          </select>
        </div>`);
    } else {
      camposHTML.push(renderizarCampoFormulario(campo, valor));
    }
  }
  return camposHTML.join('');
}

async function abrirFormularioCrear(entidad) {
  const config = configTablas[entidad];
  const html = await construirFormularioHTML(entidad);
  abrirModal(`Nuevo ${config.titulo.toLowerCase().slice(0, -1)}`, html, () => guardarRegistro(entidad, true));
}

async function abrirFormularioEditar(entidad, pkValue) {
  const config = configTablas[entidad];
  try {
    const { data, error } = await supabase.from(entidad).select('*').eq(config.pk, pkValue).single();
    if (error) throw error;
    const html = await construirFormularioHTML(entidad, data);
    abrirModal(`Editar ${config.titulo.toLowerCase().slice(0, -1)}`, html, () => guardarRegistro(entidad, false, pkValue));
  } catch (err) {
    mostrarToast('Error al cargar datos', 'error');
    console.error(err);
  }
}

async function guardarRegistro(entidad, esNuevo, pkValue = null) {
  const config = configTablas[entidad];
  const datos = {};

  // Leer valores del formulario
  for (const campo of config.camposFormulario) {
    const el = modalBody.querySelector(`[data-campo="${campo.key}"]`);
    if (!el) continue;
    let valor = el.value.trim();
    if (campo.tipo === 'number') valor = valor ? parseInt(valor, 10) : null;
    if (valor === '') valor = null;
    datos[campo.key] = valor;
  }

  // Validar campos requeridos
  for (const campo of config.camposFormulario) {
    if (campo.required && !datos[campo.key]) {
      mostrarToast(`El campo "${campo.label}" es obligatorio`, 'error');
      const elF = modalBody.querySelector(`[data-campo="${campo.key}"]`);
      elF?.focus();
      return;
    }
  }

  modalGuardar.textContent = 'Guardando...';
  try {
    let idLocal = pkValue;
    if (esNuevo) {
      const { data: nuevo, error } = await supabase.from(entidad).insert(datos).select(config.pk).single();
      if (error) throw error;
      idLocal = nuevo[config.pk];
      mostrarToast(`${config.titulo} creado correctamente`);
    } else {
      const { error } = await supabase.from(entidad).update(datos).eq(config.pk, pkValue);
      if (error) throw error;
      mostrarToast(`${config.titulo} actualizado correctamente`);
    }

    limpiarCacheTabla(entidad);
    cerrarModal();
    buscar(searchInput.value);
  } catch (err) {
    console.error('[Nexus] Error guardando:', err);
    mostrarToast(err.message || 'Error al guardar', 'error');
  } finally {
    modalGuardar.textContent = 'Guardar';
  }
}

async function eliminarRegistro(entidad, pkValue) {
  const config = configTablas[entidad];
  if (!confirm(`¿Eliminar ${config.titulo.toLowerCase().slice(0, -1)} permanentemente?`)) return;
  try {
    const { error } = await supabase.from(entidad).delete().eq(config.pk, pkValue);
    if (error) throw error;
    mostrarToast(`${config.titulo} eliminado`);
    limpiarCacheTabla(entidad);
    buscar(searchInput.value);
  } catch (err) {
    console.error('[Nexus] Error eliminando:', err);
    mostrarToast(err.message || 'Error al eliminar', 'error');
  }
}

async function abrirDetalleRegistro(entidad, pkValue) {
  const config = configTablas[entidad];
  try {
    const { data, error } = await supabase.from(entidad).select('*').eq(config.pk, pkValue).single();
    if (error) throw error;

    // Mapeo de campos a etiquetas legibles
    const labels = {};
    if (config.camposFormulario) {
      config.camposFormulario.forEach(c => labels[c.key] = c.label);
    }

    // Renderizar cada campo
    const camposHTML = Object.entries(data)
      .filter(([key]) => !['created_at'].includes(key))
      .map(([key, valor]) => {
        const label = labels[key] || capitalizar(key.replace(/_/g, ' '));
        let display = valor;
        if (valor === null || valor === undefined || valor === '') display = '<span style="color:var(--nx-text-dim);font-style:italic;">—</span>';
        else if (key.includes('fecha') || key.includes('date')) {
          try { display = new Date(valor).toLocaleString('es-AR'); } catch (e) { display = valor; }
        }
        else display = escapeHtml(String(valor));
        return `
          <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;padding:8px 0;border-bottom:1px solid var(--nx-border);">
            <span style="color:var(--nx-text-dim);font-size:13px;flex-shrink:0;">${escapeHtml(label)}</span>
            <span style="color:var(--nx-text);font-size:13px;font-weight:500;text-align:right;word-break:break-word;">${display}</span>
          </div>`;
      }).join('');

    const html = `
      <div style="display:flex;flex-direction:column;gap:4px;">
        ${camposHTML}
      </div>
    `;

    abrirModal(config.titulo, html, null);

    // Ocultar botón Guardar del modal de detalle
    modalGuardar.classList.add('hidden');

    // Agregar botones de acción en el footer
    const footer = modalGuardar.parentElement;
    let btnEditar = footer.querySelector('.nx-modal-btn-editar');
    let btnEliminar = footer.querySelector('.nx-modal-btn-eliminar');

    if (!btnEditar && config.editable) {
      btnEditar = document.createElement('button');
      btnEditar.className = 'nx-login-btn nx-modal-btn-editar';
      btnEditar.style.cssText = 'padding:8px 16px;font-size:13px;margin-right:auto;';
      btnEditar.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display:inline;vertical-align:middle;margin-right:4px;"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg> Editar`;
      btnEditar.addEventListener('click', () => {
        cerrarModal();
        setTimeout(() => abrirFormularioEditar(entidad, pkValue), 150);
      });
      footer.insertBefore(btnEditar, modalCancelar);
    }

    if (!btnEliminar && config.editable) {
      btnEliminar = document.createElement('button');
      btnEliminar.className = 'nx-login-btn nx-modal-btn-eliminar';
      btnEliminar.style.cssText = 'padding:8px 16px;font-size:13px;background:transparent;color:#ef4444;border:1px solid rgba(239,68,68,0.3);';
      btnEliminar.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display:inline;vertical-align:middle;margin-right:4px;"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg> Eliminar`;
      btnEliminar.addEventListener('click', () => {
        cerrarModal();
        setTimeout(() => abrirModalConfirmarEliminar(entidad, pkValue), 150);
      });
      footer.insertBefore(btnEliminar, modalGuardar);
    }
  } catch (err) {
    mostrarToast('Error al cargar detalle', 'error');
    console.error(err);
  }
}

function abrirModalConfirmarEliminar(entidad, pkValue) {
  const config = configTablas[entidad];
  abrirModal('Confirmar eliminación', `
    <div style="text-align:center;padding:16px 0;">
      <div style="width:56px;height:56px;border-radius:50%;background:rgba(239,68,68,0.1);color:#ef4444;display:flex;align-items:center;justify-content:center;margin:0 auto 16px;">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
      </div>
      <p style="color:var(--nx-text);font-size:16px;font-weight:600;margin-bottom:4px;">¿Eliminar ${config.titulo.toLowerCase().slice(0, -1)}?</p>
      <p style="color:var(--nx-text-dim);font-size:13px;">Esta acción no se puede deshacer.</p>
    </div>
  `, () => {
    eliminarRegistro(entidad, pkValue);
    cerrarModal();
  });
}

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
