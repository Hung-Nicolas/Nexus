import bcrypt from 'bcrypt';
import { query } from '../src/db.js';
import { config } from '../src/config.js';

async function seedRegente() {
  const email = 'regente@nexus.local';
  const password = 'Regente123!';
  const passwordHash = await bcrypt.hash(password, config.bcryptRounds);

  await query(
    `INSERT INTO public.usuarios (id, email, password_hash, nombre, apellido, rol, activo)
     VALUES (
       'd29ca848-a134-44d8-8144-0a5178c13df1',
       $1, $2, 'Regente', 'Nexus', 'regente', true
     )
     ON CONFLICT (email) DO UPDATE SET
       password_hash = EXCLUDED.password_hash,
       activo = true,
       updated_at = NOW()`,
    [email, passwordHash]
  );

  console.log(`[Nexus] Usuario regente creado/actualizado: ${email}`);
}

seedRegente()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('[Nexus] Error:', err);
    process.exit(1);
  });
