import { NombreTabla } from './entidades';

export type { NombreTabla };

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface TokenResponse {
  accessToken: string;
  refreshToken?: string;
  usuario?: {
    id: string;
    email: string;
    nombre: string;
    apellido: string;
    rol: string;
  };
}

export interface BuscarParams {
  termino?: string;
  filtros?: Record<string, string | number>;
  limite?: number;
}

export interface BuscarResponse<T = Record<string, unknown>> {
  data: T[];
  tabla: string;
  total?: number;
}

export interface OpcionesFiltrosResponse {
  tabla: string;
  opciones: Record<string, string[]>;
}

export interface FiltroConfig {
  key: string;
  label: string;
  tipo: 'select';
  opciones: string[];
}

export interface RelacionConfig {
  tabla: NombreTabla;
  pk: string;
  campos: string;
  render: (record: Record<string, unknown> | null | undefined) => string | null;
}

export interface RenderCardResult {
  avatar: string;
  titulo: string;
  meta: string[];
  tags: { text: string; variant?: 'default' | 'primary' | 'success' | 'warning' | 'purple' }[];
}

export interface ConfigTablaFrontend<T = Record<string, unknown>> {
  titulo: string;
  campos: string;
  pk: string;
  buscarEn: string[];
  filtros: FiltroConfig[];
  placeholder: string;
  renderCard: (row: T) => RenderCardResult;
  relaciones?: Record<string, RelacionConfig>;
}

export interface CargarCsvResponse {
  tabla: string;
  filasProcesadas: number;
  mensaje: string;
}
