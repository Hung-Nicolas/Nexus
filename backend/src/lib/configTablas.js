// Configuración de tablas accesibles desde el backend.
// Debe mantenerse sincronizada con src/app.js del frontend.

export const TABLAS_PERMITIDAS_BUSCADOR = new Set([
  'alumnos',
  'responsables',
  'personal',
  'cursos',
  'materias',
  'roles',
  'domicilios',
]);

export const TABLAS_PERMITIDAS_GATEWAY = new Set([
  'alumnos',
  'responsables',
  'personal',
  'cursos',
  'materias',
  'personal_materia',
  'personal_rol',
  'roles',
  'domicilios',
]);

export const configTablas = {
  alumnos: {
    titulo: 'Alumnos',
    campos: 'id, dni, nombre, apellido, email, email_padre, telefono, fecha_nacimiento, genero, nacionalidad, id_domicilio, id_curso',
    orden: { column: 'apellido', ascending: true },
    buscarEn: ['nombre', 'apellido', 'email'],
    filtros: [],
    pk: 'id',
    relaciones: {
      id_curso: {
        tabla: 'cursos',
        pk: 'id_curso',
        campos: 'anio, division, turno, especialidad',
      },
      id_domicilio: {
        tabla: 'domicilios',
        pk: 'id_domicilio',
        campos: 'calle, numero, departamento, localidad',
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
    relaciones: {
      id_alumno: {
        tabla: 'alumnos',
        pk: 'id',
        campos: 'nombre, apellido, dni',
      },
      id_domicilio: {
        tabla: 'domicilios',
        pk: 'id_domicilio',
        campos: 'calle, numero, departamento, localidad',
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
    relaciones: {
      id_domicilio: {
        tabla: 'domicilios',
        pk: 'id_domicilio',
        campos: 'calle, numero, departamento, localidad',
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
    relaciones: {},
  },
  materias: {
    titulo: 'Materias',
    campos: 'id_materia, nombre, descripcion',
    orden: { column: 'nombre', ascending: true },
    buscarEn: ['nombre', 'descripcion'],
    filtros: [],
    pk: 'id_materia',
    relaciones: {},
  },
  roles: {
    titulo: 'Roles',
    campos: 'id_rol, nombre, descripcion',
    orden: { column: 'nombre', ascending: true },
    buscarEn: ['nombre', 'descripcion'],
    filtros: [],
    pk: 'id_rol',
    relaciones: {},
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
    relaciones: {},
  },
};

export function construirSelectConRelaciones(tabla) {
  const config = configTablas[tabla];
  if (!config) return null;
  if (!config.relaciones || Object.keys(config.relaciones).length === 0) {
    return config.campos;
  }
  const joins = Object.values(config.relaciones).map(rel => `${rel.tabla}(${rel.campos})`);
  return `${config.campos}, ${joins.join(', ')}`;
}

export function esTablaPermitidaBuscar(tabla) {
  return TABLAS_PERMITIDAS_BUSCADOR.has(tabla);
}

export function esTablaPermitidaGateway(tabla) {
  return TABLAS_PERMITIDAS_GATEWAY.has(tabla);
}
