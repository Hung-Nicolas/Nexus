export interface NexusInfo {
  version: string;
  fecha_release: string;
  contacto: string;
  descripcion: string;
  integrantes: { nombre: string }[];
  novedades: {
    version: string;
    items: string[];
  }[];
}

export const NEXUS_INFO: NexusInfo = {
  version: '2.0.0',
  fecha_release: '2026-09-12',
  contacto: 'nicohung0302@gmail.com',
  descripcion:
    'Nexus es la Base de Datos Escolar Maestra del proyecto integrador. Centraliza alumnos, personal, cursos, materias y expone los datos de forma segura a otros sistemas del ecosistema escolar.',
  integrantes: [
    { nombre: 'Hung Nicolas' },
    { nombre: 'Espinoza Tiziano' },
    { nombre: 'Marquez Cristhian' },
    { nombre: 'Enrique Santino' },
  ],
  novedades: [
    {
      version: 'v2.0.0 (Enterprise Redesign)',
      items: [
        'Reescritura completa del frontend en React 18 + TypeScript + Vite.',
        'Soporte para visualización de miles de registros con @tanstack/react-virtual y @tanstack/react-table.',
        'Nueva identidad visual institucional Slate & Navy (accesibilidad WCAG AAA, modo claro/oscuro refinado).',
        'Selector de Vista Híbrida: alternancia fluida entre Data Table densa y Grid de Tarjetas.',
        'Data fetching reactivo con TanStack Query y gestión de estado con Zustand.',
        'Guía y arquitectura Clean Code documentada para desarrolladores trainees.',
      ],
    },
    {
      version: 'v1.1.0',
      items: [
        'Backend Spring Boot (Java 17 + Gradle) con autenticación JWT y API Gateway propios.',
        'Base de datos 100% local: PostgreSQL en Docker, sin dependencias externas.',
        'Buscador optimizado con filtros dinámicos por tabla.',
      ],
    },
  ],
};
