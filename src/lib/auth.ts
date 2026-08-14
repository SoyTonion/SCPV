// src/lib/auth.ts
import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

declare module "next-auth" {
  interface Session {
    user: { id: string; name?: string | null; rol?: number; usuario?: string };
  }
  interface User {
    id: string; name?: string | null; rol?: number; usuario?: string;
  }
}
declare module "next-auth/jwt" {
  interface JWT { rol?: number; usuario?: string }
}

const prisma = new PrismaClient();

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credenciales",
      credentials: {
        usuario: { label: "Usuario", type: "text" },
        password: { label: "Contraseña", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.usuario || !credentials?.password) return null;
        const user = await prisma.usuario.findUnique({
          where: { usuario: credentials.usuario },
          include: { rol: true },
        });
        if (!user || !user.activo) return null;
        const ok = await bcrypt.compare(credentials.password, user.passwordHash);
        if (!ok) return null;
        return { id: user.id.toString(), name: user.nombre, usuario: user.usuario, rol: user.rolId };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) { token.rol = user.rol; token.usuario = user.usuario; }
      return token;
    },
    async session({ session, token }) {
      if (session.user) { session.user.rol = token.rol; session.user.usuario = token.usuario; }
      return session;
    },
  },
  pages: { signIn: "/" },
};