import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { db } from '@/db';
import { users } from '@/db/schema';
import { and, eq } from 'drizzle-orm';
import { getTenantId } from '@/lib/tenant';

export const { handlers, signIn, signOut, auth } = NextAuth({
  // Multi-tenant: a autenticação precisa seguir o host da requisição
  // (cada tenant tem seu domínio), e não um NEXTAUTH_URL fixo.
  trustHost: true,
  session: { strategy: 'jwt' },
  pages: { signIn: '/login' },
  providers: [
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const tenantId = await getTenantId();
        const [user] = await db
          .select()
          .from(users)
          .where(
            and(
              eq(users.tenantId, tenantId),
              eq(users.email, credentials.email as string),
            ),
          )
          .limit(1);
        if (!user || !user.passwordHash) return null;
        const valid = await bcrypt.compare(credentials.password as string, user.passwordHash);
        if (!valid) return null;
        return { id: user.id, name: user.name, email: user.email, role: user.role, tenantId: user.tenantId };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: string }).role ?? 'student';
        token.tenantId = (user as { tenantId?: string }).tenantId ?? '';
      }
      return token;
    },
    async session({ session, token }) {
      session.user.id = token.id as string;
      session.user.role = token.role as string;
      session.user.tenantId = token.tenantId as string;
      return session;
    },
  },
});
