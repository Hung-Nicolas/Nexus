import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import {
  apiBuscar,
  apiDetalle,
  apiInsertar,
  apiOpcionesFk,
  apiOpcionesFiltros,
  apiStats,
} from './client';
import { NombreTabla, StatsData } from '../types/entidades';
import { BuscarParams, BuscarResponse, InsertarResponse, OpcionesFkResponse } from '../types/api';

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
  return useQuery<BuscarResponse<T>>({
    queryKey: ['buscar', tabla, params.termino || '', params.filtros || {}, params.limite || 50],
    queryFn: async () => {
      return await apiBuscar<T>(tabla, params);
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
  return useQuery<{ data: T }>({
    queryKey: ['detalle', tabla, campo, id],
    queryFn: async () => {
      return await apiDetalle<T>(tabla, campo, id!);
    },
    enabled: Boolean(id),
    staleTime: 1000 * 60 * 5,
  });
}

/**
 * Hook para cargar opciones dinámicas de filtros para una tabla.
 */
export function useOpcionesFiltrosQuery(tabla: string) {
  return useQuery({
    queryKey: ['filtros-opciones', tabla],
    queryFn: async () => {
      return await apiOpcionesFiltros(tabla);
    },
    staleTime: 1000 * 60 * 10,
  });
}

/**
 * Hook para insertar un registro en una tabla de negocio.
 */
export function useInsertarMutation<T = Record<string, unknown>>(tabla: NombreTabla) {
  const queryClient = useQueryClient();

  return useMutation<InsertarResponse<T>, Error, Record<string, unknown>>({
    mutationFn: async (datos) => {
      return apiInsertar<T>(tabla, datos);
    },
    onSuccess: () => {
      // Invalidar búsqueda de la tabla y estadísticas para reflejar el nuevo registro
      queryClient.invalidateQueries({ queryKey: ['buscar', tabla] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
    },
  });
}

/**
 * Hook para cargar opciones de selects de FK para una tabla.
 */
export function useOpcionesFkQuery(tabla: NombreTabla, enabled: boolean = true) {
  return useQuery<OpcionesFkResponse>({
    queryKey: ['fk-opciones', tabla],
    queryFn: async () => {
      return apiOpcionesFk(tabla);
    },
    enabled,
    staleTime: 1000 * 60 * 5,
  });
}
