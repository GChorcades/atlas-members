import 'dotenv/config';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import bcrypt from 'bcryptjs';
import * as schema from './schema';

/**
 * Cria (ou atualiza a senha de) um administrador da plataforma.
 *
 * Uso:
 *   npx tsx db/seed-super-admin.ts <email> <senha> ["Nome"]
 */
async function main() {
  const [email, password, name] = process.argv.slice(2);
  if (!email || !password) {
    console.error('Uso: npx tsx db/seed-super-admin.ts <email> <senha> ["Nome"]');
    process.exit(1);
  }
  if (password.length < 8) {
    console.error('A senha deve ter ao menos 8 caracteres.');
    process.exit(1);
  }

  const sql = neon(process.env.DATABASE_URL!);
  const db = drizzle(sql, { schema });

  const normalizedEmail = email.trim().toLowerCase();
  const passwordHash = await bcrypt.hash(password, 12);

  const [existing] = await db
    .select()
    .from(schema.platformAdmins)
    .where(eq(schema.platformAdmins.email, normalizedEmail))
    .limit(1);

  if (existing) {
    await db
      .update(schema.platformAdmins)
      .set({ passwordHash, name: name?.trim() || existing.name })
      .where(eq(schema.platformAdmins.id, existing.id));
    console.log(`✓ Super admin atualizado: ${normalizedEmail}`);
  } else {
    await db.insert(schema.platformAdmins).values({
      id: nanoid(),
      name: name?.trim() || 'Super Admin',
      email: normalizedEmail,
      passwordHash,
    });
    console.log(`✓ Super admin criado: ${normalizedEmail}`);
  }
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
