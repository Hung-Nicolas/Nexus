import { ConfigTablaFrontend, NombreTabla } from '../types/api';
import { Alumno, Responsable, Personal, Curso, Materia, Rol, Domicilio } from '../types/entidades';
import { capitalizar, obtenerIniciales } from '../lib/utils';

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
  },
};
