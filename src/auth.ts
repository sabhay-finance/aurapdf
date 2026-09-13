import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import Credentials from 'next-auth/providers/credentials';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { db } from '@/lib/db';
import { authConfig } from '@/auth.config';

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(db),
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID || process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.AUTH_GOOGLE_SECRET || process.env.GOOGLE_CLIENT_SECRET || '',
    }),
    // Isolated development-only authentication mechanism for testing when Google credentials are not yet entered.
    // Strictly prohibited in production.
    ...(process.env.NODE_ENV === 'development' && process.env.ENABLE_DEV_AUTH === 'true'
      ? [
          Credentials({
            id: 'dev-login',
            name: 'Development Test Login',
            credentials: {
              email: { label: 'Email', type: 'email' },
              name: { label: 'Name', type: 'text' },
            },
            async authorize(credentials) {
              if (process.env.NODE_ENV !== 'development' || process.env.ENABLE_DEV_AUTH !== 'true') {
                return null;
              }
              if (!credentials?.email) return null;
              const email = String(credentials.email).toLowerCase().trim();
              const name = credentials.name ? String(credentials.name) : 'Student User';

              // Find or create user in SQLite database
              let user = await db.user.findUnique({ where: { email } });
              if (!user) {
                user = await db.user.create({
                  data: {
                    email,
                    name,
                  },
                });
              }
              return {
                id: user.id,
                email: user.email,
                name: user.name,
                image: user.image,
              };
            },
          }),
        ]
      : []),
  ],
});
