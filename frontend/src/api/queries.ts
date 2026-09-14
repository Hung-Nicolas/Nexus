import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { apiBuscar, apiDetalle, apiOpcionesFiltros, apiStats } from './client';
import { NombreTabla, StatsData } from '../types/entidades';
import { BuscarParams, BuscarResponse } from '../types/api';
import { MOCK_STATS, filtrarMockData } from './mockData';
import { useAuthStore } from '../stores/useAuthStore';

/**
 * Hook para obtener las estadísticas del Dashboard.
 */
export function useStatsQuery() {
  const esModoDemo = useAuthStore((s) => s.esModoDemo);

  return useQuery<StatsData>({
    queryKey: ['stats', esModoDemo],
    queryFn: async () => {
      if (esModoDemo) {
        return MOCK_STATS;
      }
      try {
        const res = await apiStats();
        return res.stats;
      } catch (err) {
        // Fallback automático en caso de backend apagado
        return MOCK_STATS;
      }
    },
    staleTime: 1000 * 60 * 2,
  });
}

/**
 * Hook para buscar registros en una tabla con filtros, término y límite.
 */
export function useBuscarQuery<T = Record<string, unknown>>(
  tabla: NombreTabla,
  params: BuscarParams,
  enabled: boolean = true
) {
  const esModoDemo = useAuthStore((s) => s.esModoDemo);

  return useQuery<BuscarResponse<T>>({
    queryKey: ['buscar', tabla, params.termino || '', params.filtros || {}, params.limite || 50, esModoDemo],
    queryFn: async () => {
      if (esModoDemo) {
        const data = filtrarMockData(tabla, params.termino, params.filtros || {});
        return { data: data as T[], tabla, total: data.length };
      }
      try {
        const res = await apiBuscar<T>(tabla, params);
        return res;
      } catch (err) {
        // Fallback automático en caso de backend apagado
        const data = filtrarMockData(tabla, params.termino, params.filtros || {});
        return { data: data as T[], tabla, total: data.length };
      }
    },
    enabled,
    placeholderData: keepPreviousData,
    staleTime: 1000 * 30,
  });
}

/**
 * Hook para obtener el detalle de un registro por clave primaria.
 */
export function useRegistroDetalleQuery<T = Record<string, unknown>>(
  tabla: NombreTabla,
  campo: string,
  id: string | number | null | undefined
) {
  const esModoDemo = useAuthStore((s) => s.esModoDemo);

  return useQuery<{ data: T }>({
    queryKey: ['detalle', tabla, campo, id, esModoDemo],
    queryFn: async () => {
      if (esModoDemo) {
        const all = filtrarMockData(tabla);
        const item = all.find((r) => String(r[campo]) === String(id)) || all[0];
        return { data: item as T };
      }
      try {
        return await apiDetalle<T>(tabla, campo, id!);
      } catch (err) {
        const all = filtrarMockData(tabla);
        const item = all.find((r) => String(r[campo]) === String(id)) || all[0];
        return { data: item as T };
      }
    },
    enabled: Boolean(id),
    staleTime: 1000 * 60 * 5,
  });
}

/**
 * Hook para cargar opciones dinámicas de filtros para una tabla.
 */
export function useOpcionesFiltrosQuery(tabla: string) {
  const esModoDemo = useAuthStore((s) => s.esModoDemo);

  return useQuery({
    queryKey: ['filtros-opciones', tabla, esModoDemo],
    queryFn: async () => {
      if (esModoDemo) {
        return {
          tabla,
          opciones: {
            'cursos.turno': ['Mañana', 'Tarde', 'Noche'],
            'cursos.especialidad': ['Computación', 'Automotores'],
            'cursos.anio': ['1', '2', '3', '4', '5', '6'],
            'alumnos.turno': ['Mañana', 'Tarde', 'Noche'],
            'alumnos.especialidad': ['Computación', 'Automotores'],
            'alumnos.anio': ['1', '2', '3', '4', '5', '6'],
          },
        };
      }
      try {
        return await apiOpcionesFiltros(tabla);
      } catch {
        return {
          tabla,
          opciones: {
            'cursos.turno': ['Mañana', 'Tarde', 'Noche'],
            'cursos.especialidad': ['Computación', 'Automotores'],
            'cursos.anio': ['1', '2', '3', '4', '5', '6'],
            'alumnos.turno': ['Mañana', 'Tarde', 'Noche'],
            'alumnos.especialidad': ['Computación', 'Automotores'],
            'alumnos.anio': ['1', '2', '3', '4', '5', '6'],
          },
        };
      }
    },
    staleTime: 1000 * 60 * 10,
  });
}
