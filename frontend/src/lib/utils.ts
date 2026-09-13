import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Combina clases condicionales de Tailwind resolviendo conflictos.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * Capitaliza palabras separadas por guiones bajos o espacios.
 */
export function capitalizar(str?: string | null): string {
  if (!str) return '';
  return str.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

/**
 * Formatea cadenas de fecha a formato estándar latinoamericano DD/MM/YYYY.
 */
export function formatearFecha(fechaStr?: string | null): string {
  if (!fechaStr) return '—';
  
  if (/^\d{4}-\d{2}-\d{2}$/.test(fechaStr)) {
    const [anio, mes, dia] = fechaStr.split('-');
    return `${dia}/${mes}/${anio}`;
  }
  
  if (/^\d{4}-\d{2}-\d{2}T/.test(fechaStr)) {
    const d = new Date(fechaStr);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    }
  }

  return fechaStr;
}

/**
 * Sanitiza números de teléfono para enlaces tel:
 */
export function limpiarTelefono(tel?: string | null): string {
  if (!tel) return '';
  return tel.replace(/[\s\-\(\)]/g, '');
}

/**
 * Obtiene iniciales de un nombre y apellido.
 */
export function obtenerIniciales(nombre?: string | null, apellido?: string | null): string {
  const n = (nombre?.trim()?.[0] || '').toUpperCase();
  const a = (apellido?.trim()?.[0] || '').toUpperCase();
  return `${n}${a}` || 'N';
}
