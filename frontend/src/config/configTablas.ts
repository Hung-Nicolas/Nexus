import { ConfigTablaFrontend, NombreTabla } from '../types/api';
import { Alumno, Responsable, Personal, Curso, Materia, Rol, Domicilio } from '../types/entidades';
import { capitalizar, obtenerIniciales } from '../lib/utils';

const OPCIONES_GENERO = [
  { label: 'Masculino', value: 'Masculino' },
  { label: 'Femenino', value: 'Femenino' },
  { label: 'Otro', value: 'Otro' },
  { label: 'Prefiero no decir', value: 'Prefiero no decir' },
];

const OPCIONES_ANIO = [
  { label: '1°', value: '1' },
  { label: '2°', value: '2' },
  { label: '3°', value: '3' },
  { label: '4°', value: '4' },
  { label: '5°', value: '5' },
  { label: '6°', value: '6' },
];

const OPCIONES_TURNO = [
  { label: 'Mañana', value: 'Mañana' },
  { label: 'Tarde', value: 'Tarde' },
  { label: 'Noche', value: 'Noche' },
];

const OPCIONES_ESPECIALIDAD = [
  { label: 'Computación', value: 'Computación' },
  { label: 'Automotores', value: 'Automotores' },
];

const OPCIONES_VINCULO = [
  { label: 'Padre', value: 'padre' },
  { label: 'Madre', value: 'madre' },
  { label: 'Tutor', value: 'tutor' },
  { label: 'Otro', value: 'otro' },
];

export const CONFIG_TABLAS: Record<NombreTabla, ConfigTablaFrontend<any>> = {
  alumnos: {
    titulo: 'Alumnos',
    campos: 'id, dni, nombre, apellido, email, email_padre, telefono, fecha_nacimiento, genero, nacionalidad, id_domicilio, id_curso',
    pk: 'id',
    buscarEn: ['nombre', 'apellido', 'email', 'dni'],
    placeholder: 'Buscar por apellido, nombre, DNI o email...',
    filtros: [
      { key: 'turno', label: 'Turno', tipo: 'select', opciones: ['Mañana', 'Tarde', 'Noche'] },
      { key: 'especialidad', label: 'Especialidad', tipo: 'select', opciones: ['Computación', 'Automotores'] },
      { key: 'anio', label: 'Año', tipo: 'select', opciones: ['1', '2', '3', '4', '5', '6'] },
    ],
    renderCard: (row: Alumno) => {
      const curso = Array.isArray(row.cursos) ? row.cursos[0] : row.cursos;
      const cursoStr = curso ? `${curso.anio}° ${curso.division} · ${curso.turno}` : null;
      const tags: { text: string; variant?: 'default' | 'primary' | 'success' | 'warning' | 'purple' }[] = [];
      
      if (curso?.especialidad) {
        tags.push({ text: curso.especialidad, variant: 'purple' });
      }
      if (row.email) {
        tags.push({ text: row.email, variant: 'default' });
      }

      return {
        avatar: obtenerIniciales(row.nombre, row.apellido),
        titulo: `${row.apellido}, ${row.nombre}`,
        meta: [row.dni ? `DNI ${row.dni}` : null, cursoStr].filter(Boolean) as string[],
        tags,
      };
    },
    relaciones: {
      id_curso: {
        tabla: 'cursos',
        pk: 'id_curso',
        campos: 'anio, division, turno, especialidad',
        render: (r: any) => (r ? `${r.anio || ''}° ${r.division || ''} · ${r.turno || ''}` : null),
      },
      id_domicilio: {
        tabla: 'domicilios',
        pk: 'id_domicilio',
        campos: 'calle, numero, departamento, localidad',
        render: (r: any) =>
          r ? `${r.calle || ''} ${r.numero || ''}${r.departamento ? ' Dpto. ' + r.departamento : ''}` : null,
      },
    },
    formulario: {
      campos: [
        { key: 'dni', label: 'DNI', tipo: 'number', requerido: true, placeholder: '12345678' },
        { key: 'nombre', label: 'Nombre', tipo: 'text', requerido: true, placeholder: 'Juan' },
        { key: 'apellido', label: 'Apellido', tipo: 'text', requerido: true, placeholder: 'Pérez' },
        { key: 'email', label: 'Email', tipo: 'email', requerido: false, placeholder: 'juan.perez@ejemplo.com' },
        { key: 'email_padre', label: 'Email del padre/tutor', tipo: 'email', requerido: false },
        { key: 'telefono', label: 'Teléfono', tipo: 'text', requerido: false, placeholder: '11 1234-5678' },
        { key: 'fecha_nacimiento', label: 'Fecha de nacimiento', tipo: 'date', requerido: false },
        { key: 'genero', label: 'Género', tipo: 'select', requerido: false, opciones: OPCIONES_GENERO },
        { key: 'nacionalidad', label: 'Nacionalidad', tipo: 'text', requerido: false, placeholder: 'Argentina' },
        {
          key: 'id_curso',
          label: 'Curso',
          tipo: 'select',
          requerido: true,
          fk: { tabla: 'cursos', pk: 'id_curso', camposLabel: ['anio', 'division', 'turno'] },
        },
        {
          key: 'id_domicilio',
          label: 'Domicilio',
          tipo: 'select',
          requerido: false,
          fk: { tabla: 'domicilios', pk: 'id_domicilio', camposLabel: ['calle', 'numero', 'localidad'] },
        },
      ],
    },
  },

  responsables: {
    titulo: 'Responsables',
    campos: 'id, id_alumno, nombre, apellido, telefono, email, fecha_nacimiento, genero, nacionalidad, vinculo, id_domicilio',
    pk: 'id',
    buscarEn: ['nombre', 'apellido', 'email', 'telefono'],
    placeholder: 'Buscar por apellido, nombre, teléfono o email...',
    filtros: [
      { key: 'vinculo', label: 'Vínculo', tipo: 'select', opciones: ['padre', 'madre', 'tutor', 'otro'] },
    ],
    renderCard: (row: Responsable) => {
      const tags: { text: string; variant?: 'default' | 'primary' | 'success' | 'warning' | 'purple' }[] = [];
      if (row.email) tags.push({ text: row.email, variant: 'default' });

      return {
        avatar: obtenerIniciales(row.nombre, row.apellido),
        titulo: `${row.apellido}, ${row.nombre}`,
        meta: [row.vinculo ? capitalizar(row.vinculo) : null, row.telefono].filter(Boolean) as string[],
        tags,
      };
    },
    relaciones: {
      id_alumno: {
        tabla: 'alumnos',
        pk: 'id',
        campos: 'nombre, apellido, dni',
        render: (r: any) => (r ? `${r.apellido || ''}, ${r.nombre || ''}` : null),
      },
      id_domicilio: {
        tabla: 'domicilios',
        pk: 'id_domicilio',
        campos: 'calle, numero, departamento, localidad',
        render: (r: any) =>
          r ? `${r.calle || ''} ${r.numero || ''}${r.departamento ? ' Dpto. ' + r.departamento : ''}` : null,
      },
    },
    formulario: {
      campos: [
        {
          key: 'id_alumno',
          label: 'Alumno a cargo',
          tipo: 'select',
          requerido: true,
          fk: { tabla: 'alumnos', pk: 'id', camposLabel: ['apellido', 'nombre', 'dni'] },
        },
        { key: 'nombre', label: 'Nombre', tipo: 'text', requerido: true },
        { key: 'apellido', label: 'Apellido', tipo: 'text', requerido: true },
        { key: 'telefono', label: 'Teléfono', tipo: 'text', requerido: false },
        { key: 'email', label: 'Email', tipo: 'email', requerido: false },
        { key: 'fecha_nacimiento', label: 'Fecha de nacimiento', tipo: 'date', requerido: false },
        { key: 'genero', label: 'Género', tipo: 'select', requerido: false, opciones: OPCIONES_GENERO },
        { key: 'nacionalidad', label: 'Nacionalidad', tipo: 'text', requerido: false },
        { key: 'vinculo', label: 'Vínculo', tipo: 'select', requerido: true, opciones: OPCIONES_VINCULO },
        {
          key: 'id_domicilio',
          label: 'Domicilio',
          tipo: 'select',
          requerido: false,
          fk: { tabla: 'domicilios', pk: 'id_domicilio', camposLabel: ['calle', 'numero', 'localidad'] },
        },
      ],
    },
  },

  personal: {
    titulo: 'Personal',
    campos: 'id, dni, nombre, apellido, email, telefono, fecha_nacimiento, genero, nacionalidad, id_domicilio',
    pk: 'id',
    buscarEn: ['nombre', 'apellido', 'email'],
    placeholder: 'Buscar por nombre, apellido, DNI o email...',
    filtros: [],
    renderCard: (row: Personal) => ({
      avatar: obtenerIniciales(row.nombre, row.apellido),
      titulo: `${row.apellido}, ${row.nombre}`,
      meta: [row.dni ? `DNI ${row.dni}` : null, row.email, row.telefono].filter(Boolean) as string[],
      tags: [],
    }),
    relaciones: {
      id_domicilio: {
        tabla: 'domicilios',
        pk: 'id_domicilio',
        campos: 'calle, numero, departamento, localidad',
        render: (r: any) =>
          r ? `${r.calle || ''} ${r.numero || ''}${r.departamento ? ' Dpto. ' + r.departamento : ''}` : null,
      },
    },
    formulario: {
      campos: [
        { key: 'dni', label: 'DNI', tipo: 'number', requerido: true },
        { key: 'nombre', label: 'Nombre', tipo: 'text', requerido: true },
        { key: 'apellido', label: 'Apellido', tipo: 'text', requerido: true },
        { key: 'email', label: 'Email', tipo: 'email', requerido: true },
        { key: 'telefono', label: 'Teléfono', tipo: 'text', requerido: false },
        { key: 'fecha_nacimiento', label: 'Fecha de nacimiento', tipo: 'date', requerido: false },
        { key: 'genero', label: 'Género', tipo: 'select', requerido: false, opciones: OPCIONES_GENERO },
        { key: 'nacionalidad', label: 'Nacionalidad', tipo: 'text', requerido: false },
        {
          key: 'id_domicilio',
          label: 'Domicilio',
          tipo: 'select',
          requerido: false,
          fk: { tabla: 'domicilios', pk: 'id_domicilio', camposLabel: ['calle', 'numero', 'localidad'] },
        },
      ],
    },
  },

  cursos: {
    titulo: 'Cursos',
    campos: 'id_curso, anio, division, turno, especialidad',
    pk: 'id_curso',
    buscarEn: ['division', 'turno', 'especialidad'],
    placeholder: 'Buscar por año, división, turno o especialidad...',
    filtros: [
      { key: 'turno', label: 'Turno', tipo: 'select', opciones: ['Mañana', 'Tarde', 'Noche'] },
      { key: 'especialidad', label: 'Especialidad', tipo: 'select', opciones: ['Computación', 'Automotores'] },
    ],
    renderCard: (row: Curso) => ({
      avatar: `${row.anio || ''}°`,
      titulo: `${row.anio || ''}° ${row.division || ''} · ${row.turno || ''}`,
      meta: [row.especialidad].filter(Boolean) as string[],
      tags: row.especialidad ? [{ text: row.especialidad, variant: 'purple' }] : [],
    }),
    formulario: {
      campos: [
        { key: 'anio', label: 'Año', tipo: 'select', requerido: true, opciones: OPCIONES_ANIO },
        { key: 'division', label: 'División', tipo: 'text', requerido: true, placeholder: 'A' },
        { key: 'turno', label: 'Turno', tipo: 'select', requerido: true, opciones: OPCIONES_TURNO },
        { key: 'especialidad', label: 'Especialidad', tipo: 'select', requerido: false, opciones: OPCIONES_ESPECIALIDAD },
      ],
    },
  },

  materias: {
    titulo: 'Materias',
    campos: 'id_materia, nombre, descripcion',
    pk: 'id_materia',
    buscarEn: ['nombre', 'descripcion'],
    placeholder: 'Buscar por nombre de materia...',
    filtros: [],
    renderCard: (row: Materia) => ({
      avatar: row.nombre?.[0] || 'M',
      titulo: row.nombre,
      meta: [row.descripcion].filter(Boolean) as string[],
      tags: [],
    }),
    formulario: {
      campos: [
        { key: 'nombre', label: 'Nombre de la materia', tipo: 'text', requerido: true },
        { key: 'descripcion', label: 'Descripción', tipo: 'textarea', requerido: false },
      ],
    },
  },

  roles: {
    titulo: 'Roles',
    campos: 'id_rol, nombre, descripcion',
    pk: 'id_rol',
    buscarEn: ['nombre', 'descripcion'],
    placeholder: 'Buscar por nombre o descripción de rol...',
    filtros: [],
    renderCard: (row: Rol) => ({
      avatar: row.nombre?.[0] || 'R',
      titulo: capitalizar(row.nombre),
      meta: [row.descripcion].filter(Boolean) as string[],
      tags: [],
    }),
    formulario: {
      campos: [
        { key: 'nombre', label: 'Nombre del rol', tipo: 'text', requerido: true },
        { key: 'descripcion', label: 'Descripción', tipo: 'textarea', requerido: false },
      ],
    },
  },

  domicilios: {
    titulo: 'Domicilios',
    campos: 'id_domicilio, calle, numero, departamento, localidad',
    pk: 'id_domicilio',
    buscarEn: ['calle', 'localidad', 'departamento'],
    placeholder: 'Buscar por calle, localidad o departamento...',
    filtros: [],
    renderCard: (row: Domicilio) => ({
      avatar: '📍',
      titulo: `${row.calle} ${row.numero}${row.departamento ? ' Dpto. ' + row.departamento : ''}`,
      meta: [row.localidad].filter(Boolean) as string[],
      tags: [],
    }),
    formulario: {
      campos: [
        { key: 'calle', label: 'Calle', tipo: 'text', requerido: true },
        { key: 'numero', label: 'Número', tipo: 'number', requerido: true },
        { key: 'departamento', label: 'Departamento', tipo: 'text', requerido: false },
        { key: 'localidad', label: 'Localidad', tipo: 'text', requerido: true },
      ],
    },
  },
};
