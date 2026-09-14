import { Alumno, Responsable, Personal, Curso, Materia, Rol, Domicilio, StatsData, NombreTabla } from '../types/entidades';

export const MOCK_CURSOS: Curso[] = [
  { id_curso: 1, anio: 5, division: '1ra', turno: 'Mañana', especialidad: 'Computación' },
  { id_curso: 2, anio: 4, division: '2da', turno: 'Tarde', especialidad: 'Automotores' },
  { id_curso: 3, anio: 6, division: '1ra', turno: 'Mañana', especialidad: 'Computación' },
  { id_curso: 4, anio: 3, division: '3ra', turno: 'Tarde', especialidad: 'Ciclo Básico' },
  { id_curso: 5, anio: 6, division: '1ra', turno: 'Mañana', especialidad: 'Automotores' },
  { id_curso: 6, anio: 1, division: '1ra', turno: 'Mañana', especialidad: 'Ciclo Básico' },
  { id_curso: 7, anio: 2, division: '2da', turno: 'Tarde', especialidad: 'Ciclo Básico' },
  { id_curso: 8, anio: 5, division: '2da', turno: 'Noche', especialidad: 'Computación' },
];

export const MOCK_DOMICILIOS: Domicilio[] = [
  { id_domicilio: 1, calle: 'Av. San Martín', numero: '1250', departamento: '4B', localidad: 'CABA' },
  { id_domicilio: 2, calle: 'Belgrano', numero: '820', departamento: null, localidad: 'CABA' },
  { id_domicilio: 3, calle: 'Rivadavia', numero: '4530', departamento: '2A', localidad: 'CABA' },
  { id_domicilio: 4, calle: 'Corrientes', numero: '3200', departamento: '12', localidad: 'CABA' },
  { id_domicilio: 5, calle: 'Mitre', numero: '1540', departamento: null, localidad: 'Avellaneda' },
  { id_domicilio: 6, calle: 'Santa Fe', numero: '2890', departamento: '6C', localidad: 'CABA' },
];

export const MOCK_ALUMNOS: Alumno[] = [
  {
    id: '1',
    dni: '45123987',
    nombre: 'Lucas',
    apellido: 'Gómez',
    email: 'lucas.gomez@alumno.nexus.local',
    email_padre: 'padre.gomez@gmail.com',
    telefono: '11 4567-8901',
    fecha_nacimiento: '2007-04-15',
    genero: 'Masculino',
    nacionalidad: 'Argentina',
    id_curso: 1,
    id_domicilio: 1,
    cursos: MOCK_CURSOS[0],
    domicilios: MOCK_DOMICILIOS[0],
  },
  {
    id: '2',
    dni: '46234876',
    nombre: 'Valentina',
    apellido: 'Martínez',
    email: 'valen.martinez@alumno.nexus.local',
    email_padre: 'tutor.martinez@hotmail.com',
    telefono: '11 5678-9012',
    fecha_nacimiento: '2008-08-22',
    genero: 'Femenino',
    nacionalidad: 'Argentina',
    id_curso: 2,
    id_domicilio: 2,
    cursos: MOCK_CURSOS[1],
    domicilios: MOCK_DOMICILIOS[1],
  },
  {
    id: '3',
    dni: '44876123',
    nombre: 'Joaquín',
    apellido: 'Fernández',
    email: 'joaco.f@alumno.nexus.local',
    email_padre: 'madre.fernandez@yahoo.com',
    telefono: '11 6789-0123',
    fecha_nacimiento: '2006-11-10',
    genero: 'Masculino',
    nacionalidad: 'Argentina',
    id_curso: 3,
    id_domicilio: 3,
    cursos: MOCK_CURSOS[2],
    domicilios: MOCK_DOMICILIOS[2],
  },
  {
    id: '4',
    dni: '45987654',
    nombre: 'Sofía',
    apellido: 'Rodríguez',
    email: 'sofia.r@alumno.nexus.local',
    email_padre: 'rodriguez.familia@gmail.com',
    telefono: '11 7890-1234',
    fecha_nacimiento: '2007-01-30',
    genero: 'Femenino',
    nacionalidad: 'Argentina',
    id_curso: 4,
    id_domicilio: 4,
    cursos: MOCK_CURSOS[3],
    domicilios: MOCK_DOMICILIOS[3],
  },
  {
    id: '5',
    dni: '46345678',
    nombre: 'Mateo',
    apellido: 'López',
    email: 'mateo.lopez@alumno.nexus.local',
    email_padre: 'lopez.tutor@gmail.com',
    telefono: '11 8901-2345',
    fecha_nacimiento: '2008-05-19',
    genero: 'Masculino',
    nacionalidad: 'Argentina',
    id_curso: 1,
    id_domicilio: 5,
    cursos: MOCK_CURSOS[0],
    domicilios: MOCK_DOMICILIOS[4],
  },
  {
    id: '6',
    dni: '44567890',
    nombre: 'Camila',
    apellido: 'Álvarez',
    email: 'camila.alvarez@alumno.nexus.local',
    email_padre: 'alvarez.padres@gmail.com',
    telefono: '11 9012-3456',
    fecha_nacimiento: '2006-09-03',
    genero: 'Femenino',
    nacionalidad: 'Argentina',
    id_curso: 5,
    id_domicilio: 6,
    cursos: MOCK_CURSOS[4],
    domicilios: MOCK_DOMICILIOS[5],
  },
];

export const MOCK_RESPONSABLES: Responsable[] = [
  {
    id: '101',
    id_alumno: '1',
    nombre: 'Carlos',
    apellido: 'Gómez',
    telefono: '11 4433-2211',
    email: 'padre.gomez@gmail.com',
    fecha_nacimiento: '1978-03-12',
    genero: 'Masculino',
    nacionalidad: 'Argentina',
    vinculo: 'padre',
    id_domicilio: 1,
    alumnos: MOCK_ALUMNOS[0],
    domicilios: MOCK_DOMICILIOS[0],
  },
  {
    id: '102',
    id_alumno: '2',
    nombre: 'Mariana',
    apellido: 'Martínez',
    telefono: '11 5544-3322',
    email: 'tutor.martinez@hotmail.com',
    fecha_nacimiento: '1981-07-24',
    genero: 'Femenino',
    nacionalidad: 'Argentina',
    vinculo: 'madre',
    id_domicilio: 2,
    alumnos: MOCK_ALUMNOS[1],
    domicilios: MOCK_DOMICILIOS[1],
  },
  {
    id: '103',
    id_alumno: '3',
    nombre: 'Roberto',
    apellido: 'Fernández',
    telefono: '11 6655-4433',
    email: 'madre.fernandez@yahoo.com',
    fecha_nacimiento: '1975-12-05',
    genero: 'Masculino',
    nacionalidad: 'Argentina',
    vinculo: 'tutor',
    id_domicilio: 3,
    alumnos: MOCK_ALUMNOS[2],
    domicilios: MOCK_DOMICILIOS[2],
  },
];

export const MOCK_PERSONAL: Personal[] = [
  {
    id: '201',
    dni: '32111222',
    nombre: 'Martín',
    apellido: 'Sánchez',
    email: 'martin.sanchez@nexus.local',
    telefono: '11 2233-4455',
    fecha_nacimiento: '1985-06-18',
    genero: 'Masculino',
    nacionalidad: 'Argentina',
    id_domicilio: 1,
    domicilios: MOCK_DOMICILIOS[0],
  },
  {
    id: '202',
    dni: '30444555',
    nombre: 'Laura',
    apellido: 'Benítez',
    email: 'laura.benitez@nexus.local',
    telefono: '11 3344-5566',
    fecha_nacimiento: '1983-10-09',
    genero: 'Femenino',
    nacionalidad: 'Argentina',
    id_domicilio: 2,
    domicilios: MOCK_DOMICILIOS[1],
  },
];

export const MOCK_MATERIAS: Materia[] = [
  { id_materia: 1, nombre: 'Programación Web', descripcion: 'Desarrollo frontend y backend en arquitecturas cliente-servidor' },
  { id_materia: 2, nombre: 'Bases de Datos', descripcion: 'Modelado relacional, SQL, normalización y optimización' },
  { id_materia: 3, nombre: 'Sistemas Operativos', descripcion: 'Procesos, memoria, concurrencia y administración de Linux' },
  { id_materia: 4, nombre: 'Matemática Técnica', descripcion: 'Álgebra lineal, cálculo diferencial y estadística aplicada' },
  { id_materia: 5, nombre: 'Taller de Automotores', descripcion: 'Sistemas de inyección electrónica y motores de combustión' },
];

export const MOCK_ROLES: Rol[] = [
  { id_rol: 1, nombre: 'regente', descripcion: 'Máxima autoridad de regencia y gestión del sistema maestro' },
  { id_rol: 2, nombre: 'subregente', descripcion: 'Asistente de regencia institucional' },
  { id_rol: 3, nombre: 'docente', descripcion: 'Profesor a cargo de asignaturas curriculares' },
  { id_rol: 4, nombre: 'preceptor', descripcion: 'Seguimiento y control de asistencia y cursos' },
];

export const MOCK_STATS: StatsData = {
  alumnos: 542,
  personal: 84,
  cursos: 24,
  materias: 58,
  responsables: 890,
  roles: 12,
  domicilios: 610,
  proyectos: 3,
};

export function filtrarMockData(
  tabla: NombreTabla,
  termino?: string,
  filtros: Record<string, string | number> = {}
): any[] {
  let dataset: any[] = [];
  switch (tabla) {
    case 'alumnos':
      dataset = [...MOCK_ALUMNOS];
      break;
    case 'responsables':
      dataset = [...MOCK_RESPONSABLES];
      break;
    case 'personal':
      dataset = [...MOCK_PERSONAL];
      break;
    case 'cursos':
      dataset = [...MOCK_CURSOS];
      break;
    case 'materias':
      dataset = [...MOCK_MATERIAS];
      break;
    case 'roles':
      dataset = [...MOCK_ROLES];
      break;
    case 'domicilios':
      dataset = [...MOCK_DOMICILIOS];
      break;
  }

  // Filtrado por término
  if (termino && termino.trim()) {
    const term = termino.toLowerCase().trim();
    dataset = dataset.filter((item) => {
      return Object.values(item).some((val) => {
        if (typeof val === 'string') return val.toLowerCase().includes(term);
        if (typeof val === 'number') return String(val).includes(term);
        return false;
      });
    });
  }

  // Filtrado por selectores
  Object.entries(filtros).forEach(([key, val]) => {
    if (val !== undefined && val !== '') {
      dataset = dataset.filter((item) => {
        if (key === 'turno' || key === 'especialidad' || key === 'anio') {
          const curso = Array.isArray(item.cursos) ? item.cursos[0] : item.cursos || item;
          if (!curso) return false;
          return String(curso[key]) === String(val);
        }
        return String(item[key]) === String(val);
      });
    }
  });

  return dataset;
}
