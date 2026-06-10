import { supabase } from './lib/supabase.js';
import { iniciarSesion, cerrarSesion, restaurarSesion, getPerfil, onAuthChange, listarUsuarios, crearUsuario, eliminarUsuario, cambiarPasswordUsuario } from './auth.js';
import { GIE_ENABLED, enviarInformeAGIE } from './gie-client.js';
import './styles.css';

// Estado
let tablaActual = 'alumnos';
let seccionActual = 'buscador';
let timeoutBusqueda = null;
let filtrosActuales = {};
let opcionesFiltros = {};
let usuariosLista = [];
let mostrarFormUsuario = false;

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
const sidebarUser = document.getElementById('sidebarUser');
const userAvatar = document.getElementById('userAvatar');
const userName = document.getElementById('userName');
const userRole = document.getElementById('userRole');
const logoutBtn = document.getElementById('logoutBtn');
const searchInput = document.getElementById('searchInput');
const resultsGrid = document.getElementById('resultsGrid');
const resultsTitle = document.getElementById('resultsTitle');
const resultsCount = document.getElementById('resultsCount');
const resultsActions = document.getElementById('resultsActions');
const statsGrid = document.getElementById('statsGrid');
const sidebarLinks = document.querySelectorAll('.nx-sidebar-link');
const sectionBuscador = document.getElementById('sectionBuscador');
const sectionUsuarios = document.getElementById('sectionUsuarios');
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
    campos: 'dni, nombre, apellido, email, especialidad, division, turno, email_padre, telefono, id_curso',
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
    campos: 'id_responsable, dni_alumno, nombre, apellido, telefono, email, vinculo',
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
      { key: 'vinculo', label: 'Vínculo', tipo: 'select', opciones: ['padre', 'madre', 'tutor', 'otro'], required: true },
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
    campos: 'dni, nombre, apellido, email, rol',
    orden: { column: 'apellido', ascending: true },
    buscarEn: ['nombre', 'apellido', 'email', 'rol'],
    filtros: [
      { key: 'rol', label: 'Rol', tipo: 'select', opciones: ['rector', 'vicerector', 'docente', 'preceptor', 'administrativo', 'jefe_de_taller', 'cooperadora', 'otro'] },
    ],
    pk: 'dni',
    editable: true,
    camposFormulario: [
      { key: 'dni', label: 'DNI', tipo: 'number', required: true },
      { key: 'nombre', label: 'Nombre', tipo: 'text', required: true },
      { key: 'apellido', label: 'Apellido', tipo: 'text', required: true },
      { key: 'email', label: 'Email', tipo: 'email', required: true },
      { key: 'rol', label: 'Rol', tipo: 'select', opciones: ['rector', 'vicerector', 'docente', 'preceptor', 'administrativo', 'jefe_de_taller', 'cooperadora', 'otro'], required: true },
    ],
    render: (row) => ({
      avatar: `${row.nombre?.[0] || ''}${row.apellido?.[0] || ''}`,
      titulo: `${row.apellido}, ${row.nombre}`,
      meta: [row.email, row.rol ? capitalizar(row.rol) : null].filter(Boolean),
      tags: [row.rol ? { text: capitalizar(row.rol), style: 'default' } : null].filter(Boolean),
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
  informes: {
    titulo: 'Informes',
    campos: 'id_informe, dni_alumno, id_categoria, tipo_falta, titulo, instancia, resumen, descargo, estado, numero, fecha_creacion',
    orden: { column: 'fecha_creacion', ascending: false },
    buscarEn: ['titulo', 'resumen', 'tipo_falta'],
    filtros: [
      { key: 'instancia', label: 'Instancia', tipo: 'select', opciones: ['leve', 'grave', 'muy_grave', 'consejo_aula', 'consejo', 'otro'] },
      { key: 'estado', label: 'Estado', tipo: 'select', opciones: ['pendiente', 'revisado', 'anulado', 'archivado', 'derivado'] },
    ],
    pk: 'id_informe',
    editable: true,
    camposFormulario: [
      { key: 'dni_alumno', label: 'Alumno (DNI)', tipo: 'select', tabla: 'alumnos', labelField: 'apellido,nombre', valueField: 'dni', required: true },
      { key: 'id_categoria', label: 'Categoría', tipo: 'select', tabla: 'categorias', labelField: 'nombre', valueField: 'id_categoria', required: true },
      { key: 'tipo_falta', label: 'Tipo de falta', tipo: 'text', required: true },
      { key: 'titulo', label: 'Título', tipo: 'text', required: true },
      { key: 'instancia', label: 'Instancia', tipo: 'select', opciones: ['leve', 'grave', 'muy_grave', 'consejo_aula', 'consejo', 'otro'], required: true },
      { key: 'resumen', label: 'Resumen', tipo: 'textarea', required: true },
      { key: 'descargo', label: 'Descargo', tipo: 'textarea' },
      { key: 'estado', label: 'Estado', tipo: 'select', opciones: ['pendiente', 'revisado', 'anulado', 'archivado', 'derivado'], required: true },
      { key: 'numero', label: 'Número de informe', tipo: 'number' },
    ],
    render: (row) => ({
      avatar: row.numero ? String(row.numero).slice(-3) : 'INF',
      titulo: row.titulo || 'Sin título',
      meta: [
        row.instancia ? capitalizar(row.instancia) : null,
        row.estado ? capitalizar(row.estado) : null,
        row.fecha_creacion ? new Date(row.fecha_creacion).toLocaleDateString('es-AR') : null,
      ].filter(Boolean),
      tags: [
        row.estado === 'pendiente' ? { text: 'Pendiente', style: 'amber' } : null,
        row.estado === 'revisado' ? { text: 'Revisado', style: 'default' } : null,
        row.estado === 'archivado' ? { text: 'Archivado', style: 'purple' } : null,
        row.instancia === 'muy_grave' ? { text: 'Muy Grave', style: 'purple' } : null,
      ].filter(Boolean),
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

// Logout
logoutBtn.addEventListener('click', async () => {
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
  if (seccion === 'buscador') {
    sectionBuscador.classList.remove('hidden');
    sectionUsuarios.classList.add('hidden');
    sidebarFilters.style.display = '';
  } else if (seccion === 'usuarios') {
    sectionBuscador.classList.add('hidden');
    sectionUsuarios.classList.remove('hidden');
    sidebarFilters.style.display = 'none';
    cargarUsuarios();
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

// ========== STATS ==========
async function cargarStats() {
  try {
    const [alumnos, personal, cursos, materias] = await Promise.all([
      supabase.from('alumnos').select('dni', { count: 'exact', head: true }),
      supabase.from('personal').select('dni', { count: 'exact', head: true }),
      supabase.from('cursos').select('id_curso', { count: 'exact', head: true }),
      supabase.from('materias').select('id_materia', { count: 'exact', head: true }),
    ]);

    statsGrid.innerHTML = [
      { label: 'Alumnos', value: alumnos.count || 0 },
      { label: 'Personal', value: personal.count || 0 },
      { label: 'Cursos', value: cursos.count || 0 },
      { label: 'Materias', value: materias.count || 0 },
    ].map(s => `
      <div class="nx-stat">
        <div class="nx-stat-value">${s.value}</div>
        <div class="nx-stat-label">${s.label}</div>
      </div>
    `).join('');
  } catch (err) {
    console.error('[Nexus] Error stats:', err);
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
  sidebarFilters.innerHTML = '';

  if (!config.filtros || config.filtros.length === 0) {
    sidebarFilters.innerHTML = `<div style="padding:20px;text-align:center;color:var(--nx-text-dim);font-size:13px;">No hay filtros disponibles.</div>`;
    return;
  }

  const header = document.createElement('div');
  header.className = 'nx-sidebar-label';
  header.style.marginTop = '8px';
  header.textContent = `Filtros · ${config.titulo}`;
  sidebarFilters.appendChild(header);

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

    sidebarFilters.appendChild(group);
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
    sidebarFilters.appendChild(resetBtn);
  }
}

// ========== BUSQUEDA ==========
async function buscar(query) {
  const config = configTablas[tablaActual];
  resultsTitle.textContent = config.titulo;

  resultsGrid.innerHTML = `
    <div class="nx-empty">
      <div class="nx-empty-icon" style="animation: nx-pulse 1.5s infinite;">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
      </div>
      <p class="nx-empty-text">Cargando...</p>
    </div>
  `;

  try {
    const termino = query?.trim();
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


    const { data, error } = await supaQuery;
    if (error) throw error;

    resultsCount.textContent = `${data?.length || 0} resultado${data?.length !== 1 ? 's' : ''}`;

    if (!data || data.length === 0) {
      resultsGrid.innerHTML = `
        <div class="nx-empty">
          <div class="nx-empty-icon"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg></div>
          <p class="nx-empty-text">${termino ? `No se encontraron resultados para "${escapeHtml(termino)}"` : 'No hay registros para mostrar'}</p>
        </div>`;
      return;
    }

    resultsGrid.innerHTML = data.map(row => {
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
      return `
        <div class="nx-card nx-card-crud">
          <div class="nx-card-avatar">${escapeHtml(rendered.avatar)}</div>
          <div class="nx-card-body">
            <div class="nx-card-title">${escapeHtml(rendered.titulo)}</div>
            <div class="nx-card-meta">${meta}</div>
            ${tags ? `<div style="margin-top:8px;display:flex;gap:6px;flex-wrap:wrap;">${tags}</div>` : ''}
          </div>
          ${acciones}
        </div>`;
    }).join('');

    // Bind editar/eliminar
    if (config.editable) {
      resultsGrid.querySelectorAll('.nx-card-action-edit').forEach(btn => {
        btn.addEventListener('click', () => abrirFormularioEditar(tablaActual, btn.dataset.pk));
      });
      resultsGrid.querySelectorAll('.nx-card-action-delete').forEach(btn => {
        btn.addEventListener('click', () => eliminarRegistro(tablaActual, btn.dataset.pk));
      });
    }
  } catch (err) {
    console.error('[Nexus] Error:', err);
    mostrarToast('Error al cargar datos.', 'error');
    resultsGrid.innerHTML = `
      <div class="nx-empty">
        <div class="nx-empty-icon" style="color:#ef4444"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg></div>
        <p class="nx-empty-text">Error de conexión</p>
      </div>`;
  }
}

// Crear informe de prueba y sincronizar con GIE
async function crearInformePrueba() {
  const btn = resultsActions.querySelector('button');
  if (btn) btn.textContent = 'Creando...';

  try {
    // 1. Insertar en Nexus
    const informe = {
      dni_alumno: 40000014, // Bruno Ortiz
      id_categoria: 1, // Conducta
      tipo_falta: 'Conducta',
      titulo: 'Test sincronización Nexus → GIE',
      instancia: 'leve',
      resumen: 'Informe de prueba creado desde Nexus para verificar que aparece en GIE.',
      estado: 'pendiente',
      dni_creador: 20111001,
      numero: 202600999,
      observaciones: 'Creado automáticamente desde Nexus.',
    };

    const { data: nuevoInforme, error: errNexus } = await supabase
      .from('informes')
      .insert(informe)
      .select()
      .single();

    if (errNexus) throw errNexus;

    console.log('[Nexus] Informe creado:', nuevoInforme);
    mostrarToast('Informe creado en Nexus', 'success');

    // 2. Enviar a GIE
    if (GIE_ENABLED) {
      const gieResult = await enviarInformeAGIE(
        informe.dni_alumno,
        'Conducta',
        informe.tipo_falta,
        informe.titulo,
        informe.instancia,
        informe.resumen,
        informe.estado
      );

      if (gieResult.ok) {
        mostrarToast('Informe sincronizado con GIE ✅', 'success');
      } else {
        mostrarToast('GIE: ' + gieResult.error, 'error');
      }
    } else {
      mostrarToast('GIE no configurado (faltan VITE_GIE_URL y VITE_GIE_ANON_KEY)', 'error');
    }

    buscar('');
  } catch (err) {
    console.error('[Nexus] Error creando informe:', err);
    mostrarToast(err.message || 'Error al crear informe', 'error');
  } finally {
    if (btn) btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display:inline;vertical-align:middle;margin-right:4px;"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> Nuevo informe de prueba';
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
    personal: 'Buscar por nombre, apellido, rol, email...',
    cursos: 'Buscar por año, división, turno, especialidad...',
    materias: 'Buscar por nombre o descripción...',
    informes: 'Buscar por título, resumen, tipo de falta...',
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

  // Botón "Sync con GIE" solo para informes
  if (tablaActual === 'informes' && GIE_ENABLED) {
    const btnSync = document.createElement('button');
    btnSync.className = 'nx-login-btn';
    btnSync.style.cssText = 'padding: 8px 16px; font-size: 13px; margin-left: 8px; background: var(--nx-bg-card); color: var(--nx-text); border: 1px solid var(--nx-border);';
    btnSync.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display:inline;vertical-align:middle;margin-right:4px;"><path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/></svg> Sincronizar con GIE`;
    btnSync.addEventListener('click', sincronizarInformesDesdeGIE);
    resultsActions.appendChild(btnSync);
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
    if (esNuevo) {
      const { error } = await supabase.from(entidad).insert(datos);
      if (error) throw error;
      mostrarToast(`${config.titulo} creado correctamente`);
    } else {
      const { error } = await supabase.from(entidad).update(datos).eq(config.pk, pkValue);
      if (error) throw error;
      mostrarToast(`${config.titulo} actualizado correctamente`);
    }

    // Sync con GIE para informes
    if (entidad === 'informes') {
      let categoriaNombre = 'Otros';
      if (datos.id_categoria) {
        try {
          const { data: cat } = await supabase.from('categorias').select('nombre').eq('id_categoria', datos.id_categoria).single();
          if (cat?.nombre) categoriaNombre = cat.nombre;
        } catch (e) { /* noop */ }
      }
      const syncResult = await enviarInformeAGIE({ ...datos, categoria_nombre: categoriaNombre });
      if (syncResult.ok) {
        mostrarToast('Informe sincronizado con GIE');
      } else {
        console.warn('[Nexus] Sync GIE falló:', syncResult.error);
        mostrarToast('Guardado localmente, pero falló sync con GIE', 'error');
      }
    }

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
    buscar(searchInput.value);
  } catch (err) {
    console.error('[Nexus] Error eliminando:', err);
    mostrarToast(err.message || 'Error al eliminar', 'error');
  }
}

async function sincronizarInformesDesdeGIE() {
  if (!GIE_ENABLED) {
    mostrarToast('GIE no está configurado', 'error');
    return;
  }

  const btn = resultsActions.querySelector('button:last-child');
  const originalText = btn?.innerHTML;
  if (btn) btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display:inline;vertical-align:middle;margin-right:4px;animation:spin 1s linear infinite;"><path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/></svg> Sincronizando...`;

  try {
    const { data: gieInformes, error } = await obtenerInformesDesdeGIE(100);
    if (error) throw new Error(error);
    if (!gieInformes || gieInformes.length === 0) {
      mostrarToast('No hay informes nuevos en GIE');
      if (btn && originalText) btn.innerHTML = originalText;
      return;
    }

    // Cargar categorías de Nexus para mapeo
    const { data: nexusCats } = await supabase.from('categorias').select('id_categoria, nombre');
    const catPorNombre = new Map((nexusCats || []).map(c => [c.nombre, c.id_categoria]));

    let insertados = 0;
    let actualizados = 0;

    for (const gi of gieInformes) {
      if (!gi.alumnos?.dni) continue;

      const catNombre = gi.categorias?.nombre || 'Otros';
      const catId = catPorNombre.get(catNombre) || null;

      const datos = {
        dni_alumno: gi.alumnos.dni,
        id_categoria: catId,
        tipo_falta: gi.tipo_falta || 'Otra',
        titulo: gi.titulo,
        instancia: gi.instancia,
        resumen: gi.resumen,
        descargo: gi.descargo || null,
        estado: gi.estado || 'pendiente',
        fecha_creacion: gi.fecha_creacion,
        fecha_revision: gi.fecha_revision || null,
        motivo_rechazo: gi.motivo_rechazo || null,
        fecha_reunion: gi.fecha_reunion || null,
        observaciones: gi.observaciones || null,
        numero: gi.numero || null,
        gie_id: gi.id || null,
        gie_synced_at: new Date().toISOString()
      };

      const { error: upsertError } = await supabase
        .from('informes')
        .upsert(datos, { onConflict: 'numero' });

      if (upsertError) {
        console.warn('[Nexus] Error upsertando informe', gi.numero, upsertError);
      } else {
        if (gi.nexus_synced_at) actualizados++;
        else insertados++;
      }
    }

    mostrarToast(`${insertados} informes nuevos, ${actualizados} actualizados desde GIE`);
    buscar(searchInput.value);
  } catch (err) {
    console.error('[Nexus] Error sincronizando desde GIE:', err);
    mostrarToast(err.message || 'Error al sincronizar con GIE', 'error');
  } finally {
    if (btn && originalText) btn.innerHTML = originalText;
  }
}

// ========== INICIALIZAR ==========
async function iniciarApp() {
  await cargarOpcionesFiltros();
  renderizarFiltros();
  cargarStats();
  buscar('');
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
