import bcrypt from 'bcrypt';
import { query } from '../src/db.js';
import { config } from '../src/config.js';

const ROLES_PERMITIDOS = new Set([
  'regente', 'subregente', 'rector', 'vicerector',
  'docente', 'preceptor', 'doe', 'pat', 'cooperadora', 'jefe_de_taller'
]);

async function crearUsuario() {
  const [email, password, nombre, apellido, rol = 'docente'] = process.argv.slice(2);

  if (!email || !password || !nombre || !apellido) {
    console.error('[Nexus] Uso: node backend/scripts/crear-usuario.js <email> <password> <nombre> <apellido> [rol]');
    process.exit(1);
  }

  if (!email.includes('@')) {
    console.error('[Nexus] Error: email inválido');
    process.exit(1);
  }

  if (password.length < 6) {
    console.error('[Nexus] Error: la contraseña debe tener al menos 6 caracteres');
    process.exit(1);
  }

  if (!ROLES_PERMITIDOS.has(rol)) {
    console.error(`[Nexus] Error: rol no permitido. Roles válidos: ${[...ROLES_PERMITIDOS].join(', ')}`);
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, config.bcryptRounds);

  await query(
    `INSERT INTO public.usuarios (email, password_hash, nombre, apellido, rol, activo)
     VALUES ($1, $2, $3, $4, $5, true)
     ON CONFLICT (email) DO UPDATE SET
       password_hash = EXCLUDED.password_hash,
       nombre = EXCLUDED.nombre,
       apellido = EXCLUDED.apellido,
       rol = EXCLUDED.rol,
       activo = true,
       updated_at = NOW()`,
    [email.toLowerCase().trim(), passwordHash, nombre, apellido, rol]
  );

  console.log(`[Nexus] Usuario creado/actualizado: ${email.toLowerCase().trim()}`);
}

crearUsuario()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('[Nexus] Error:', err);
    process.exit(1);
  });
