import { supabase } from './lib/supabase.js';
import { iniciarSesion, cerrarSesion, restaurarSesion, getPerfil, onAuthChange, listarUsuarios, crearUsuario, eliminarUsuario, cambiarPasswordUsuario } from './auth.js';
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

// Configuración por tabla
const configTablas = {
  alumnos: {
    titulo: 'Alumnos',
    campos: 'dni, nombre, apellido, email, especialidad, division, turno, activo',
    orden: { column: 'apellido', ascending: true },
    buscarEn: ['nombre', 'apellido', 'email'],
    filtros: [
      { key: 'turno', label: 'Turno', tipo: 'select', opciones: ['Mañana', 'Tarde', 'Noche'] },
      { key: 'especialidad', label: 'Especialidad', tipo: 'select', opciones: [] },
      { key: 'division', label: 'División', tipo: 'select', opciones: [] },
      { key: 'activo', label: 'Estado', tipo: 'chips', opciones: [
        { value: 'true', label: 'Activo' },
        { value: 'false', label: 'Inactivo' }
      ]},
    ],
    render: (row) => ({
      avatar: `${row.nombre?.[0] || ''}${row.apellido?.[0] || ''}`,
      titulo: `${row.apellido}, ${row.nombre}`,
      meta: [
        row.dni ? `DNI ${row.dni}` : null,
        row.division || null,
        row.turno || null,
      ].filter(Boolean),
      tags: [
        row.especialidad ? { text: row.especialidad, style: 'default' } : null,
        row.activo === false ? { text: 'Inactivo', style: 'purple' } : null,
      ].filter(Boolean),
    }),
  },
  personal: {
    titulo: 'Personal',
    campos: 'dni, nombre, apellido, email, rol, activo',
    orden: { column: 'apellido', ascending: true },
    buscarEn: ['nombre', 'apellido', 'email', 'rol'],
    filtros: [
      { key: 'rol', label: 'Rol', tipo: 'select', opciones: ['directivo', 'docente', 'preceptor', 'administrativo', 'otro'] },
      { key: 'activo', label: 'Estado', tipo: 'chips', opciones: [
        { value: 'true', label: 'Activo' },
        { value: 'false', label: 'Inactivo' }
      ]},
    ],
    render: (row) => ({
      avatar: `${row.nombre?.[0] || ''}${row.apellido?.[0] || ''}`,
      titulo: `${row.apellido}, ${row.nombre}`,
      meta: [row.email, row.rol ? capitalizar(row.rol) : null].filter(Boolean),
      tags: [
        row.rol ? { text: capitalizar(row.rol), style: 'default' } : null,
        row.activo === false ? { text: 'Inactivo', style: 'purple' } : null,
      ].filter(Boolean),
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
    render: (row) => ({
      avatar: row.nombre?.[0] || 'M',
      titulo: row.nombre,
      meta: [row.descripcion].filter(Boolean),
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
  loginBtnText.textContent = 'Ingresando...';
  loginError.classList.remove('show');

  try {
    await iniciarSesion(email, password);
    loginBtnText.textContent = 'Ingresar';
  } catch (err) {
    loginBtnText.textContent = 'Ingresar';
    loginError.textContent = err.message || 'Credenciales inválidas';
    loginError.classList.add('show');
  }
});

// Logout
logoutBtn.addEventListener('click', async () => {
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
      supabase.from('alumnos').select('dni', { count: 'exact', head: true }).eq('activo', true),
      supabase.from('personal').select('dni', { count: 'exact', head: true }).eq('activo', true),
      supabase.from('cursos').select('id_curso', { count: 'exact', head: true }),
      supabase.from('materias').select('id_materia', { count: 'exact', head: true }),
    ]);

    statsGrid.innerHTML = [
      { label: 'Alumnos activos', value: alumnos.count || 0 },
      { label: 'Personal activo', value: personal.count || 0 },
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
      if (key === 'activo') supaQuery = supaQuery.eq(key, value === 'true');
      else supaQuery = supaQuery.eq(key, value);
    });

    if ((tablaActual === 'alumnos' || tablaActual === 'personal') && !filtrosActuales.activo) {
      supaQuery = supaQuery.eq('activo', true);
    }

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
      return `
        <div class="nx-card">
          <div class="nx-card-avatar">${escapeHtml(rendered.avatar)}</div>
          <div class="nx-card-body">
            <div class="nx-card-title">${escapeHtml(rendered.titulo)}</div>
            <div class="nx-card-meta">${meta}</div>
            ${tags ? `<div style="margin-top:8px;display:flex;gap:6px;flex-wrap:wrap;">${tags}</div>` : ''}
          </div>
        </div>`;
    }).join('');
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

// Cambio de tabla
function cambiarTabla(nuevaTabla) {
  tablaActual = nuevaTabla;
  filtrosActuales = {};
  const placeholders = {
    alumnos: 'Buscar por nombre, apellido, DNI, email...',
    personal: 'Buscar por nombre, apellido, rol, email...',
    cursos: 'Buscar por año, división, turno, especialidad...',
    materias: 'Buscar por nombre o descripción...',
  };
  searchInput.placeholder = placeholders[tablaActual];
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
                <td style="padding: 12px;">${u.activo !== false ? '<span style="color:#4ade80;font-size:12px;">● Activo</span>' : '<span style="color:#ef4444;font-size:12px;">● Inactivo</span>'}</td>
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
