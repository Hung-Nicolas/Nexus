import { iniciarSesion, cerrarSesion, restaurarSesion, getPerfil, onAuthChange } from './auth.js';
import { apiStats, apiBuscar, apiDetalle, apiOpcionesFiltros } from './lib/api.js';
import { NEXUS_INFO } from './info-nexus.js';
import './styles.css';

console.log('%c Nexus conectado ', 'background: #0ea5e9; color: #fff; padding: 4px 8px; border-radius: 4px;');

// Estado
let tablaActual = 'alumnos';
let seccionActual = 'buscador';
let timeoutBusqueda = null;
let filtrosActuales = {};
let opcionesFiltros = {};
let busquedaId = 0;
const cacheResultados = new Map(); // clave: "tabla|termino|filtrosJSON" → { data, timestamp }
const CACHE_TTL_MS = 30000; // 30 segundos de cache

// Iconos MDI del dashboard (estilo GIE)
const iconoAlumnos = '<i class="mdi mdi-school-outline"></i>';
const iconoPersonal = '<i class="mdi mdi-account-tie-outline"></i>';
const iconoCursos = '<i class="mdi mdi-google-classroom"></i>';
const iconoMaterias = '<i class="mdi mdi-book-open-variant"></i>';
const iconoResponsables = '<i class="mdi mdi-account-supervisor-outline"></i>';
const iconoRoles = '<i class="mdi mdi-star-outline"></i>';
const iconoDomicilios = '<i class="mdi mdi-home-outline"></i>';
const iconoProyectos = '<i class="mdi mdi-open-in-new"></i>';

// Referencias DOM
const loginScreen = document.getElementById('loginScreen');
const appContainer = document.getElementById('appContainer');
const loginForm = document.getElementById('loginForm');
const loginError = document.getElementById('loginError');
const loginBtnText = document.getElementById('loginBtnText');
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
const buscadorTitle = document.getElementById('buscadorTitle');
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
const dashboardStatsGrid = document.getElementById('dashboardStatsGrid');

// Modal Detalle
const modalDetalle = document.getElementById('modalDetalle');
const modalDetalleBackdrop = document.getElementById('modalDetalleBackdrop');
const modalDetalleClose = document.getElementById('modalDetalleClose');
const modalDetalleCerrar = document.getElementById('modalDetalleCerrar');
const modalDetalleTitle = document.getElementById('modalDetalleTitle');
const modalDetalleBody = document.getElementById('modalDetalleBody');


// Modal CRUD



// Configuración por tabla
const configTablas = {
  alumnos: {
    titulo: 'Alumnos',
    campos: 'id, dni, nombre, apellido, email, email_padre, telefono, fecha_nacimiento, genero, nacionalidad, id_domicilio, id_curso',
    orden: { column: 'apellido', ascending: true },
    buscarEn: ['nombre', 'apellido', 'email'],
    filtros: [],
    pk: 'id',
    render: (row) => ({
      avatar: `${row.nombre?.[0] || ''}${row.apellido?.[0] || ''}`,
      titulo: `${row.apellido}, ${row.nombre}`,
      meta: [row.dni ? `DNI ${row.dni}` : null].filter(Boolean),
      tags: [],
    }),
    relaciones: {
      id_curso: {
        tabla: 'cursos',
        pk: 'id_curso',
        campos: 'anio, division, turno, especialidad',
        render: (r) => r ? `${r.anio || ''}° ${r.division || ''} · ${r.turno || ''}` : null,
      },
      id_domicilio: {
        tabla: 'domicilios',
        pk: 'id_domicilio',
        campos: 'calle, numero, departamento, localidad',
        render: (r) => r ? `${r.calle || ''} ${r.numero || ''}${r.departamento ? ' Dpto. ' + r.departamento : ''}` : null,
      },
    },
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
    relaciones: {
      id_alumno: {
        tabla: 'alumnos',
        pk: 'id',
        campos: 'nombre, apellido, dni',
        render: (r) => r ? `${r.apellido || ''}, ${r.nombre || ''}` : null,
      },
      id_domicilio: {
        tabla: 'domicilios',
        pk: 'id_domicilio',
        campos: 'calle, numero, departamento, localidad',
        render: (r) => r ? `${r.calle || ''} ${r.numero || ''}${r.departamento ? ' Dpto. ' + r.departamento : ''}` : null,
      },
    },
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
    relaciones: {
      id_domicilio: {
        tabla: 'domicilios',
        pk: 'id_domicilio',
        campos: 'calle, numero, departamento, localidad',
        render: (r) => r ? `${r.calle || ''} ${r.numero || ''}${r.departamento ? ' Dpto. ' + r.departamento : ''}` : null,
      },
    },
  },
  cursos: {
    titulo: 'Cursos',
    campos: 'id_curso, anio, division, turno, especialidad',
    orden: { column: 'anio', ascending: true },
    buscarEn: ['division', 'turno', 'especialidad'],
    filtros: [
      { key: 'turno', label: 'Turno', tipo: 'select', opciones: ['Mañana', 'Tarde', 'Noche'] },
      { key: 'especialidad', label: 'Especialidad', tipo: 'select', opciones: ['Computación', 'Automotores'] },
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

function formatearCampoDetalle(key, value) {
  if (value === null || value === undefined || value === '') return `<span class="nx-detalle-vacio">—</span>`;

  // Fechas
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [anio, mes, dia] = value.split('-');
    return `${dia}/${mes}/${anio}`;
  }
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
    const fecha = new Date(value);
    if (!isNaN(fecha.getTime())) {
      return fecha.toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' });
    }
  }

  // Emails
  if (typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
    return `<a href="mailto:${escapeHtml(value)}" class="nx-detalle-link">${escapeHtml(value)}</a>`;
  }

  // Teléfonos
  if (typeof value === 'string' && /^[\d\s\+\-\(\)]{6,}$/.test(value)) {
    return `<a href="tel:${escapeHtml(value.replace(/\s/g, ''))}" class="nx-detalle-link">${escapeHtml(value)}</a>`;
  }

  return escapeHtml(value);
}

function mostrarToast(mensaje, tipo = 'success') {
  const existing = document.querySelector('.nx-toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = `nx-toast ${tipo === 'error' ? 'nx-toast-error' : ''}`;
  toast.innerHTML = `
    <i class="mdi ${tipo === 'error' ? 'mdi-alert-circle-outline' : 'mdi-check-circle-outline'}"></i>
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
  loginBtnText.textContent = 'Ingresando...';
  loginError.classList.remove('show');

  try {
    const perfil = await iniciarSesion(email, password);
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
    } else if (mensaje.includes('404') || mensaje.includes('not found')) {
      mensaje = 'Error de configuración. Verificá que el backend esté corriendo.';
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
    const { stats: s } = await apiStats();

    // Stats
    const stats = [
      { label: 'Alumnos', value: s.alumnos || 0, icon: iconoAlumnos },
      { label: 'Personal', value: s.personal || 0, icon: iconoPersonal },
      { label: 'Cursos', value: s.cursos || 0, icon: iconoCursos },
      { label: 'Materias', value: s.materias || 0, icon: iconoMaterias },
      { label: 'Responsables', value: s.responsables || 0, icon: iconoResponsables },
      { label: 'Roles', value: s.roles || 0, icon: iconoRoles },
      { label: 'Domicilios', value: s.domicilios || 0, icon: iconoDomicilios },
      { label: 'Proyectos', value: s.proyectos || 1, icon: iconoProyectos },
    ];

    dashboardStatsGrid.innerHTML = stats.map(s => `
      <div class="nx-stat">
        <div class="nx-stat-icon">${s.icon}</div>
        <div class="nx-stat-value">${s.value}</div>
        <div class="nx-stat-label">${s.label}</div>
      </div>
    `).join('');


  } catch (err) {
    console.error('[Nexus] Error dashboard:', err);
  }
}

// ========== FILTROS ==========
async function cargarOpcionesFiltros() {
  try {
    const { opciones } = await apiOpcionesFiltros('cursos');
    opcionesFiltros['cursos.especialidad'] = opciones['cursos.especialidad'] || [];
    opcionesFiltros['cursos.anio'] = opciones['cursos.anio'] || [];
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
    resetBtn.innerHTML = `<i class="mdi mdi-refresh"></i> Limpiar filtros`;
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

// ========== MODAL DETALLE ==========
function abrirModalDetalle(row, tablaForzada = null) {
  const config = configTablas[tablaForzada || tablaActual];
  const rendered = config.render(row);

  modalDetalleTitle.textContent = rendered.titulo || 'Detalle';

  const tablasRelacionadas = new Set(
    Object.values(config.relaciones || {}).map(rel => rel.tabla)
  );

  const camposOrdenados = Object.entries(row)
    .filter(([key]) => key !== 'id' && !key.startsWith('id_') && !tablasRelacionadas.has(key));

  // Campos de FK al final, para no mezclar
  const camposFk = Object.entries(row)
    .filter(([key]) => key.startsWith('id_') && key !== 'id');

  const renderCampo = ([key, value]) => {
    const label = capitalizar(key.replace(/_/g, ' '));
    const relacion = config.relaciones?.[key];

    if (relacion && value != null && value !== '') {
      // El backend devuelve el objeto relacionado bajo el nombre de la tabla
      const relacionado = row[relacion.tabla];
      const relacionadoObj = Array.isArray(relacionado) ? relacionado[0] : relacionado;
      const textoRelacion = relacionadoObj ? relacion.render(relacionadoObj) : `ID: ${value}`;

      return `
        <div class="nx-detalle-field">
          <span class="nx-detalle-label">${escapeHtml(label)}</span>
          <span class="nx-detalle-value">
            ${escapeHtml(textoRelacion || `ID: ${value}`)}
            ${relacionadoObj ? `<button type="button" class="nx-detalle-fk-link" data-fk-tabla="${relacion.tabla}" data-fk-pk="${relacion.pk}" data-fk-id="${escapeHtml(value)}">Ver</button>` : ''}
          </span>
        </div>
      `;
    }

    return `
      <div class="nx-detalle-field">
        <span class="nx-detalle-label">${escapeHtml(label)}</span>
        <span class="nx-detalle-value">${formatearCampoDetalle(key, value)}</span>
      </div>
    `;
  };

  const camposHtml = [...camposOrdenados, ...camposFk].map(renderCampo).join('');

  modalDetalleBody.innerHTML = `
    <div class="nx-detalle-header">
      <div class="nx-detalle-avatar">${escapeHtml(rendered.avatar)}</div>
      <div class="nx-detalle-meta">
        <div class="nx-detalle-titulo">${escapeHtml(rendered.titulo)}</div>
        ${rendered.meta.length ? `<div class="nx-detalle-subtitulo">${rendered.meta.map(escapeHtml).join(' · ')}</div>` : ''}
      </div>
    </div>
    <div class="nx-detalle-grid">
      ${camposHtml}
    </div>
  `;

  // Delegar clicks en los links de FK
  modalDetalleBody.querySelectorAll('.nx-detalle-fk-link').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const fkTabla = btn.dataset.fkTabla;
      const fkPk = btn.dataset.fkPk;
      const fkId = btn.dataset.fkId;
      await abrirDetalleDesdeFK(fkTabla, fkPk, fkId);
    });
  });

  modalDetalle.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

async function abrirDetalleDesdeFK(fkTabla, fkPk, fkId) {
  const config = configTablas[fkTabla];
  if (!config) return;

  try {
    const { data } = await apiDetalle(fkTabla, fkPk, fkId);
    if (data) abrirModalDetalle(data, fkTabla);
  } catch (err) {
    console.error('[Nexus] Error al cargar FK:', err);
    mostrarToast('No se pudo cargar el registro relacionado.', 'error');
  }
}

function cerrarModalDetalle() {
  modalDetalle.classList.add('hidden');
  document.body.style.overflow = '';
}

modalDetalleClose?.addEventListener('click', cerrarModalDetalle);
modalDetalleCerrar?.addEventListener('click', cerrarModalDetalle);
modalDetalleBackdrop?.addEventListener('click', cerrarModalDetalle);

window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !modalDetalle.classList.contains('hidden')) {
    cerrarModalDetalle();
  }
});

function renderizarGrid(data, config) {
  resultsCount.textContent = `${data?.length || 0} resultado${data?.length !== 1 ? 's' : ''}`;

  if (!data || data.length === 0) {
    resultsGrid.innerHTML = `
      <div class="nx-empty">
        <div class="nx-empty-icon"><i class="mdi mdi-magnify"></i></div>
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
    div.className = 'nx-card nx-card-clickable';
    div.setAttribute('role', 'button');
    div.setAttribute('tabindex', '0');
    div.setAttribute('aria-label', `Ver detalle de ${rendered.titulo}`);
    div.innerHTML = `
      <div class="nx-card-avatar">${escapeHtml(rendered.avatar)}</div>
      <div class="nx-card-body">
        <div class="nx-card-title">${escapeHtml(rendered.titulo)}</div>
        <div class="nx-card-meta">${meta}</div>
        ${tags ? `<div style="margin-top:8px;display:flex;gap:6px;flex-wrap:wrap;">${tags}</div>` : ''}
      </div>`;
    div.addEventListener('click', () => abrirModalDetalle(row));
    div.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        abrirModalDetalle(row);
      }
    });
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

  // 2. Mostrar skeleton solo si no hay datos visibles
  if (!resultsGrid.querySelector('.nx-card')) {
    resultsGrid.innerHTML = `
      <div class="nx-empty">
        <div class="nx-empty-icon" style="animation: nx-pulse 1.5s infinite;">
          <i class="mdi mdi-magnify"></i>
        </div>
        <p class="nx-empty-text">Cargando...</p>
      </div>`;
  }

  try {
    const { data } = await apiBuscar(tablaActual, {
      termino,
      filtros: filtrosActuales,
      limite: 50,
    });

    // Ignorar resultados de queries viejas
    if (estaBusqueda !== busquedaId) return;

    // Guardar en cache
    setCache(tablaActual, termino, filtrosKey, data);

    renderizarGrid(data, config);
  } catch (err) {
    console.error('[Nexus] Error:', err);
    mostrarToast('Error al cargar datos.', 'error');
    resultsGrid.innerHTML = `
      <div class="nx-empty">
        <div class="nx-empty-icon" style="color:#ef4444"><i class="mdi mdi-alert-circle-outline"></i></div>
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
  if (buscadorTitle) buscadorTitle.textContent = config.titulo;

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
      <i class="mdi mdi-check-circle-outline nx-info-check"></i>
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
