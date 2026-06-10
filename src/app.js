import { supabase } from './lib/supabase.js';
import './styles.css';

// Estado
let tablaActual = 'alumnos';
let timeoutBusqueda = null;
let filtrosActuales = {};
let opcionesFiltros = {};

// Referencias DOM
const sidebar = document.getElementById('sidebar');
const sidebarOverlay = document.getElementById('sidebarOverlay');
const openSidebarBtn = document.getElementById('openSidebar');
const closeSidebarBtn = document.getElementById('closeSidebar');
const sidebarFilters = document.getElementById('sidebarFilters');
const searchInput = document.getElementById('searchInput');
const resultsGrid = document.getElementById('resultsGrid');
const resultsTitle = document.getElementById('resultsTitle');
const resultsCount = document.getElementById('resultsCount');
const statsGrid = document.getElementById('statsGrid');
const sidebarLinks = document.querySelectorAll('.nx-sidebar-link');

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

// Sidebar mobile
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

// Stats
async function cargarStats() {
  try {
    const [alumnos, personal, cursos, materias] = await Promise.all([
      supabase.from('alumnos').select('dni', { count: 'exact', head: true }).eq('activo', true),
      supabase.from('personal').select('dni', { count: 'exact', head: true }).eq('activo', true),
      supabase.from('cursos').select('id_curso', { count: 'exact', head: true }),
      supabase.from('materias').select('id_materia', { count: 'exact', head: true }),
    ]);

    const data = [
      { label: 'Alumnos activos', value: alumnos.count || 0 },
      { label: 'Personal activo', value: personal.count || 0 },
      { label: 'Cursos', value: cursos.count || 0 },
      { label: 'Materias', value: materias.count || 0 },
    ];

    statsGrid.innerHTML = data.map(s => `
      <div class="nx-stat">
        <div class="nx-stat-value">${s.value}</div>
        <div class="nx-stat-label">${s.label}</div>
      </div>
    `).join('');
  } catch (err) {
    console.error('[Nexus] Error cargando stats:', err);
  }
}

// Cargar opciones de filtros dinámicas desde la BD
async function cargarOpcionesFiltros() {
  try {
    // Especialidades únicas de alumnos
    const { data: espAlumnos } = await supabase.from('alumnos').select('especialidad').not('especialidad', 'is', null);
    const especialidadesAlumnos = [...new Set((espAlumnos || []).map(a => a.especialidad).filter(Boolean))].sort();
    opcionesFiltros['alumnos.especialidad'] = especialidadesAlumnos;

    // Divisiones únicas de alumnos
    const { data: divAlumnos } = await supabase.from('alumnos').select('division').not('division', 'is', null);
    const divisionesAlumnos = [...new Set((divAlumnos || []).map(a => a.division).filter(Boolean))].sort();
    opcionesFiltros['alumnos.division'] = divisionesAlumnos;

    // Especialidades únicas de cursos
    const { data: espCursos } = await supabase.from('cursos').select('especialidad').not('especialidad', 'is', null);
    const especialidadesCursos = [...new Set((espCursos || []).map(c => c.especialidad).filter(Boolean))].sort();
    opcionesFiltros['cursos.especialidad'] = especialidadesCursos;

    // Años únicos de cursos
    const { data: aniosCursos } = await supabase.from('cursos').select('anio').order('anio');
    const anios = [...new Set((aniosCursos || []).map(c => c.anio).filter(Boolean))].sort((a, b) => a - b);
    opcionesFiltros['cursos.anio'] = anios.map(a => String(a));
  } catch (err) {
    console.error('[Nexus] Error cargando opciones de filtros:', err);
  }
}

// Renderizar filtros del sidebar
function renderizarFiltros() {
  const config = configTablas[tablaActual];
  sidebarFilters.innerHTML = '';

  if (!config.filtros || config.filtros.length === 0) {
    sidebarFilters.innerHTML = `
      <div style="padding: 20px; text-align: center; color: var(--nx-text-dim); font-size: 13px;">
        No hay filtros disponibles para esta tabla.
      </div>
    `;
    return;
  }

  // Título de sección
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
      // Combinar opciones estáticas con dinámicas
      let opciones = filtro.opciones;
      const keyDinamica = `${tablaActual}.${filtro.key}`;
      if (opcionesFiltros[keyDinamica] && opcionesFiltros[keyDinamica].length > 0) {
        opciones = opcionesFiltros[keyDinamica];
      }

      const select = document.createElement('select');
      select.className = 'nx-filter-select';
      select.dataset.filtro = filtro.key;
      select.innerHTML = `
        <option value="">Todos</option>
        ${opciones.map(op => {
          const val = typeof op === 'string' ? op : op.value;
          const lab = typeof op === 'string' ? capitalizar(op) : op.label;
          return `<option value="${escapeHtml(val)}" ${valorActual === val ? 'selected' : ''}>${escapeHtml(lab)}</option>`;
        }).join('')}
      `;
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
          // Desactivar todos los chips de este grupo
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

  // Botón limpiar filtros
  if (Object.keys(filtrosActuales).length > 0) {
    const resetBtn = document.createElement('button');
    resetBtn.className = 'nx-filter-reset';
    resetBtn.type = 'button';
    resetBtn.innerHTML = `
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 12"/><path d="M3 3v9h9"/></svg>
      Limpiar filtros
    `;
    resetBtn.addEventListener('click', () => {
      filtrosActuales = {};
      renderizarFiltros();
      buscar(searchInput.value);
    });
    sidebarFilters.appendChild(resetBtn);
  }
}

// Búsqueda
async function buscar(query) {
  const config = configTablas[tablaActual];
  resultsTitle.textContent = config.titulo;

  const tieneFiltrosActivos = Object.keys(filtrosActuales).some(k => filtrosActuales[k] !== undefined);

  if ((!query || query.trim().length < 1) && !tieneFiltrosActivos) {
    resultsGrid.innerHTML = `
      <div class="nx-empty">
        <div class="nx-empty-icon">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
        </div>
        <p class="nx-empty-text">Escribí en el buscador o seleccioná filtros para encontrar ${config.titulo.toLowerCase()}</p>
      </div>
    `;
    resultsCount.textContent = '';
    return;
  }

  resultsGrid.innerHTML = `
    <div class="nx-empty">
      <div class="nx-empty-icon" style="animation: nx-pulse 1.5s infinite;">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
      </div>
      <p class="nx-empty-text">Buscando...</p>
    </div>
  `;

  try {
    const termino = query?.trim();
    let supaQuery = supabase
      .from(tablaActual)
      .select(config.campos)
      .order(config.orden.column, { ascending: config.orden.ascending })
      .limit(100);

    // Filtro de búsqueda texto
    if (termino && termino.length >= 1) {
      const esNumero = /^\d+$/.test(termino);

      // Si es número, buscar por igualdad en campos numéricos
      if (esNumero) {
        const num = parseInt(termino, 10);
        if (tablaActual === 'alumnos' || tablaActual === 'personal') {
          supaQuery = supaQuery.or(`dni.eq.${num}`);
        } else if (tablaActual === 'cursos') {
          supaQuery = supaQuery.or(`anio.eq.${num}`);
        }
      }

      // Búsqueda textual (escapando wildcards de ILIKE)
      if (config.buscarEn.length > 0) {
        const terminoEscapado = termino
          .replace(/\\/g, '\\\\')
          .replace(/%/g, '\\%')
          .replace(/_/g, '\\_');
        const filtros = config.buscarEn
          .map(campo => `${campo}.ilike.%${terminoEscapado}%`)
          .join(',');
        supaQuery = supaQuery.or(filtros);
      }
    }

    // Aplicar filtros del sidebar
    Object.entries(filtrosActuales).forEach(([key, value]) => {
      if (value === undefined || value === '') return;
      if (key === 'activo') {
        supaQuery = supaQuery.eq(key, value === 'true');
      } else {
        supaQuery = supaQuery.eq(key, value);
      }
    });

    // Para alumnos y personal, por defecto solo activos (a menos que se filtre explícitamente)
    if ((tablaActual === 'alumnos' || tablaActual === 'personal') && !filtrosActuales.activo) {
      supaQuery = supaQuery.eq('activo', true);
    }

    const { data, error } = await supaQuery;

    if (error) throw error;

    resultsCount.textContent = `${data?.length || 0} resultado${data?.length !== 1 ? 's' : ''}`;

    if (!data || data.length === 0) {
      resultsGrid.innerHTML = `
        <div class="nx-empty">
          <div class="nx-empty-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          </div>
          <p class="nx-empty-text">No se encontraron resultados${termino ? ` para "${escapeHtml(termino)}"` : ''}</p>
        </div>
      `;
      return;
    }

    resultsGrid.innerHTML = data.map(row => {
      const rendered = config.render(row);
      const meta = rendered.meta.map(m => `<span>${escapeHtml(m)}</span>`).join(' · ');
      const tags = rendered.tags.map(t => {
        const styleClass = t.style === 'purple' ? 'nx-card-tag-purple' : t.style === 'amber' ? 'nx-card-tag-amber' : '';
        return `<span class="nx-card-tag ${styleClass}">${escapeHtml(t.text)}</span>`;
      }).join('');

      return `
        <div class="nx-card">
          <div class="nx-card-avatar">${escapeHtml(rendered.avatar)}</div>
          <div class="nx-card-body">
            <div class="nx-card-title">${escapeHtml(rendered.titulo)}</div>
            <div class="nx-card-meta">${meta}</div>
            ${tags ? `<div style="margin-top:8px;display:flex;gap:6px;flex-wrap:wrap;">${tags}</div>` : ''}
          </div>
        </div>
      `;
    }).join('');
  } catch (err) {
    console.error('[Nexus] Error en búsqueda:', err);
    mostrarToast('Error al buscar. Revisá la consola.', 'error');
    resultsGrid.innerHTML = `
      <div class="nx-empty">
        <div class="nx-empty-icon" style="color:#ef4444">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
        </div>
        <p class="nx-empty-text">Error de conexión con la base de datos</p>
      </div>
    `;
  }
}

// Cambio de tabla
function cambiarTabla(nuevaTabla) {
  tablaActual = nuevaTabla;
  filtrosActuales = {};

  // Actualizar sidebar links
  sidebarLinks.forEach(link => {
    link.classList.toggle('active', link.dataset.table === nuevaTabla);
  });

  // Actualizar placeholder del buscador
  const config = configTablas[tablaActual];
  const placeholders = {
    alumnos: 'Buscar por nombre, apellido, DNI, email...',
    personal: 'Buscar por nombre, apellido, rol, email...',
    cursos: 'Buscar por año, división, turno, especialidad...',
    materias: 'Buscar por nombre o descripción...',
  };
  searchInput.placeholder = placeholders[tablaActual];

  // Renderizar filtros nuevos
  renderizarFiltros();

  // Limpiar resultados previos
  resultsTitle.textContent = config.titulo;
  resultsCount.textContent = '';
  resultsGrid.innerHTML = `
    <div class="nx-empty">
      <div class="nx-empty-icon">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
      </div>
      <p class="nx-empty-text">Escribí en el buscador o seleccioná filtros para encontrar ${config.titulo.toLowerCase()}</p>
    </div>
  `;

  // Cerrar sidebar en móvil al cambiar de tabla
  if (window.innerWidth <= 1024) {
    closeSidebar();
  }
}

// Event Listeners
sidebarLinks.forEach(link => {
  link.addEventListener('click', () => cambiarTabla(link.dataset.table));
});

searchInput.addEventListener('input', (e) => {
  clearTimeout(timeoutBusqueda);
  timeoutBusqueda = setTimeout(() => buscar(e.target.value), 250);
});

searchInput.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    searchInput.value = '';
    buscar('');
    searchInput.blur();
  }
});

// Inicializar
async function init() {
  await cargarOpcionesFiltros();
  renderizarFiltros();
  cargarStats();

  // Verificar conexión
  try {
    const { error } = await supabase.from('alumnos').select('dni', { head: true, count: 'exact' }).limit(1);
    if (error) {
      console.error('[Nexus] Error de conexión:', error);
      mostrarToast('No se pudo conectar a Supabase. Revisá las credenciales.', 'error');
    } else {
      console.log('[Nexus] Conexión exitosa');
    }
  } catch (err) {
    console.error('[Nexus] Error inicial:', err);
    mostrarToast('Error de conexión con Supabase', 'error');
  }
}

init();
