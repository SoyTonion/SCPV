import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credenciales',

      credentials: {
        usuario: {
          label: 'Usuario',
          type: 'text',
        },
        password: {
          label: 'Contraseña',
          type: 'password',
        },
      },

      async authorize(credentials) {
        if (!credentials?.usuario || !credentials?.password) {
          return null;
        }

        const usuario = await prisma.usuario.findUnique({
          where: {
            usuario: credentials.usuario,
          },
        });

        if (!usuario) {
          return null;
        }

        if (!usuario.activo) {
          return null;
        }

        const passwordValida = await bcrypt.compare(
          credentials.password,
          usuario.passwordHash
        );

        if (!passwordValida) {
          return null;
        }

        return {
          id: usuario.id.toString(),
          name: usuario.nombre,
          rol: usuario.rolId,
        };
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.rol = user.rol;
      }

      return token;
    },

    async session({ session, token }) {
      session.user.rol = token.rol as number;

      return session;
    },
  },

  pages: {
    signIn: '/login',
  },
};