// Información del proyecto Nexus para las pantallas "Acerca de" y "Novedades".
// Modificá este archivo para actualizar integrantes, versión, contacto y changelog.

export const NEXUS_INFO = {
  version: '1.1.0',
  fecha_release: '2026-06-26',
  contacto: 'nicohung0302@gmail.com',
  descripcion:
    'Nexus es la Base de Datos Escolar Maestra del proyecto integrador. Centraliza alumnos, personal, cursos, materias y expone los datos de forma segura a otros sistemas del ecosistema escolar.',
  integrantes: [
    { nombre: 'Hung Nicolas' },
    { nombre: 'Espinoza Tiziano' },
    { nombre: 'Marquez Cristhian' },
    { nombre: 'Enrique Santino' },
    // Agregar o quitar según corresponda
  ],
  novedades: [
    {
      version: 'v1.1.0',
      items: [
        'Nuevo backend Express con autenticación JWT y conexión directa a PostgreSQL.',
        'Supabase ahora se utiliza únicamente como base de datos.',
        'Nuevo diseño visual: paleta celeste + azul oscuro, sin gradientes en dashboard.',
        'Integración de Tailwind CSS con animaciones skeleton y scrollbars estilo GIE.',
        'Iconos Material Design Icons (MDI) como en GIE.',
        'Interfaz de login simplificada y centrada.',
        'Modal de logout mejorado.',
      ],
    },
    {
      version: 'v1.0.0',
      items: [
        'Integración con proyectos externos mediante API Gateway y API keys independientes.',
        'Tablas de proyectos y auditoría para controlar el acceso de sistemas externos.',
        'Seguridad RLS reforzada: acceso anónimo removido de las tablas escolares.',
        'Dashboard inicial con estadísticas en tiempo real.',
        'Gestión de usuarios para regentes.',
        'Sección de Acerca de y Novedades.',
      ],
    },
    // Agregar nuevas versiones arriba de esta línea
  ],
};
