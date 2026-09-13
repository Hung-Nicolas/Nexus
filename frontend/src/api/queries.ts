import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { apiBuscar, apiDetalle, apiOpcionesFiltros, apiStats } from './client';
import { NombreTabla, StatsData } from '../types/entidades';
import { BuscarParams, BuscarResponse } from '../types/api';

/**
 * Hook para obtener las estadísticas del Dashboard.
 */
export function useStatsQuery() {
  return useQuery<StatsData>({
    queryKey: ['stats'],
    queryFn: async () => {
      const res = await apiStats();
      return res.stats;
    },
    staleTime: 1000 * 60 * 2, // 2 minutos
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
  return useQuery<BuscarResponse<T>>({
    queryKey: ['buscar', tabla, params.termino || '', params.filtros || {}, params.limite || 50],
    queryFn: () => apiBuscar<T>(tabla, params),
    enabled,
    placeholderData: keepPreviousData,
    staleTime: 1000 * 30, // 30 segundos
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
  return useQuery<{ data: T }>({
    queryKey: ['detalle', tabla, campo, id],
    queryFn: () => apiDetalle<T>(tabla, campo, id!),
    enabled: Boolean(id),
    staleTime: 1000 * 60 * 5, // 5 minutos
  });
}

/**
 * Hook para cargar opciones dinámicas de filtros para una tabla.
 */
export function useOpcionesFiltrosQuery(tabla: string) {
  return useQuery({
    queryKey: ['filtros-opciones', tabla],
    queryFn: () => apiOpcionesFiltros(tabla),
    staleTime: 1000 * 60 * 10, // 10 minutos
  });
}
