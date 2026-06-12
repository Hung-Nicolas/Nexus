<div align="center">
  <img src="src/assets/Nexus_wordmark.png" width="120" alt="Nexus Logo">
  <br><br>
  
  <p><strong>Base de Datos Escolar Maestra</strong></p>
  <p>Backend centralizado en Supabase con buscador web integrado.<br>
  Conecta alumnos, personal, cursos, materias, evaluaciones y asistencias en un solo lugar.</p>
</div>

---

## Qué es Nexus

Nexus es la capa de datos escolar central del ecosistema. Otros proyectos —como <strong>GIE</strong> (Gestor de Informes Escolares) y desarrollos de equipos externos— se conectan a través del <strong>API Gateway</strong> de Nexus, un sistema de API keys con permisos granulares que garantiza acceso controlado sin exponer credenciales de Supabase.

El proyecto incluye tanto el <strong>schema PostgreSQL</strong> (tablas, relaciones, RLS e índices) como un <strong>frontend de búsqueda</strong> con diseño propio, filtros por tabla y estadísticas en tiempo real.

---

## Tablas principales

| Entidad | Descripción |
|---------|-------------|
| <strong>Cursos</strong> | Año, división, turno y especialidad |
| <strong>Alumnos</strong> | Datos personales, contacto y vinculación al curso |
| <strong>Personal</strong> | Docentes, preceptores, directivos y administrativos |
| <strong>Materias</strong> | Asignaturas del plan de estudios |
| <strong>Evaluaciones</strong> | Notas por alumno y materia (parciales, finales, TPs, etc.) |
| <strong>Asistencias</strong> | Registro diario de presente, ausente, tarde, justificado |

Las tablas están relacionadas mediante claves foráneas y cuentan con <strong>Row Level Security</strong> para controlar el acceso por rol.

---

## Buscador web

Una interfaz dark-mode inspirada en la identidad visual de Nexus permite explorar los datos sin escribir SQL:

- <strong>Sidebar</strong> con navegación entre tablas y filtros contextuales
- <strong>Búsqueda</strong> por nombre, apellido, DNI, email, rol, especialidad
- <strong>Filtros dinámicos</strong> cargados desde la base de datos (especialidades, divisiones, años, roles, estados)
- <strong>Stats</strong> automáticas al cargar la página
- <strong>Responsive</strong>: sidebar fijo en desktop, drawer en móvil

---

## Conexión con otros proyectos

Nexus no trabaja solo. Proyectos como <strong>GIE</strong> (Gestor de Informes Escolares) consumen datos maestros a través de la Edge Function <code>api-nexus</code> usando una API key propia, sin acceder directamente a la base de datos.

Cada proyecto externo recibe una <strong>API key independiente</strong> con permisos declarativos por tabla y operación. Esto permite que cada equipo evolucione su aplicación sin depender del schema de los demás, siempre alineados en los datos base, y sin compartir credenciales de Supabase.

📖 Ver <a href="docs/api-externos.md">docs/api-externos.md</a> para integrar tu proyecto.  
🎓 Ver <a href="docs/faq-para-companeros.md">docs/faq-para-companeros.md</a> si es la primera vez que conectás un proyecto a una API.

---

## Stack

Supabase · PostgreSQL · Edge Functions · Vite · JavaScript vanilla · CSS3

---

<div align="center">
  <sub>Proyecto interno educativo · Hecho con mucho café</sub>
</div>
