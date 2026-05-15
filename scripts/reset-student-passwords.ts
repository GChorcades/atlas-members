import { config } from 'dotenv';
config({ path: '.env.local' });
config(); // also load .env if present
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import bcrypt from 'bcryptjs';
import * as schema from '../db/schema';
import { eq } from 'drizzle-orm';

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql, { schema });

async function main() {
  const hash = await bcrypt.hash('123321', 12);
  const rows = await db
    .update(schema.users)
    .set({ passwordHash: hash, updatedAt: new Date() })
    .where(eq(schema.users.role, 'student'))
    .returning({ id: schema.users.id, email: schema.users.email });

  console.log(`Reset password for ${rows.length} student(s).`);
  for (const r of rows) console.log(`  - ${r.email}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
