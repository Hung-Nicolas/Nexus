/**
 * Tipos de entidades principales de Nexus.
 * Refleja fielmente el esquema de la base de datos PostgreSQL y ConfigTablas.java.
 */

export interface Domicilio {
  id_domicilio: number;
  calle: string;
  numero: string;
  departamento?: string | null;
  localidad?: string | null;
}

export interface Curso {
  id_curso: number;
  anio: number;
  division: string;
  turno: 'Mañana' | 'Tarde' | 'Noche' | string;
  especialidad?: string | null;
}

export interface Alumno {
  id: string; // UUID
  dni: string;
  nombre: string;
  apellido: string;
  email?: string | null;
  email_padre?: string | null;
  telefono?: string | null;
  fecha_nacimiento?: string | null;
  genero?: string | null;
  nacionalidad?: string | null;
  id_domicilio?: number | null;
  id_curso?: number | null;
  
  // Relaciones proyectadas por el backend
  cursos?: Curso | Curso[] | null;
  domicilios?: Domicilio | Domicilio[] | null;
}

export interface Responsable {
  id: string; // UUID
  id_alumno?: string | null;
  nombre: string;
  apellido: string;
  telefono?: string | null;
  email?: string | null;
  fecha_nacimiento?: string | null;
  genero?: string | null;
  nacionalidad?: string | null;
  vinculo?: 'padre' | 'madre' | 'tutor' | 'otro' | string;
  id_domicilio?: number | null;

  // Relaciones proyectadas
  alumnos?: Alumno | Alumno[] | null;
  domicilios?: Domicilio | Domicilio[] | null;
}

export interface Personal {
  id: string; // UUID
  dni: string;
  nombre: string;
  apellido: string;
  email?: string | null;
  telefono?: string | null;
  fecha_nacimiento?: string | null;
  genero?: string | null;
  nacionalidad?: string | null;
  id_domicilio?: number | null;

  // Relaciones proyectadas
  domicilios?: Domicilio | Domicilio[] | null;
}

export interface Materia {
  id_materia: number;
  nombre: string;
  descripcion?: string | null;
}

export interface Rol {
  id_rol: number;
  nombre: string;
  descripcion?: string | null;
}

export type NombreTabla = 'alumnos' | 'responsables' | 'personal' | 'cursos' | 'materias' | 'roles' | 'domicilios';

export interface UsuarioPerfil {
  id: string;
  email: string;
  nombre: string;
  apellido: string;
  rol: 'regente' | 'subregente' | 'rector' | 'vicerector' | 'docente' | 'preceptor' | 'doe' | 'pat' | 'cooperadora' | 'jefe_de_taller' | string;
}

export interface StatsData {
  alumnos?: number;
  personal?: number;
  cursos?: number;
  materias?: number;
  responsables?: number;
  roles?: number;
  domicilios?: number;
  proyectos?: number;
}
