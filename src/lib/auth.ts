// src/lib/auth.ts
import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

declare module "next-auth" {
  interface Session {
    user: { 
      id: string; 
      name?: string | null; 
      rol?: number; 
      usuario?: string;
      rolName?: string; // <-- 1. Agregado para TypeScript
    };
  }
  interface User {
    id: string; 
    name?: string | null; 
    rol?: number; 
    usuario?: string;
    rolName?: string; // <-- 1. Agregado para TypeScript
  }
}
declare module "next-auth/jwt" {
  interface JWT { 
    rol?: number; 
    usuario?: string; 
    rolName?: string; // <-- 1. Agregado para TypeScript
  }
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
          include: { rol: true }, // Esto ya trae la tabla de roles conectada
        });
        
        if (!user || !user.activo) return null;
        
        const ok = await bcrypt.compare(credentials.password, user.passwordHash);
        if (!ok) return null;
        
        return { 
          id: user.id.toString(), 
          name: user.nombre, 
          usuario: user.usuario, 
          rol: user.rolId,
          rolName: user.rol?.nombreRol // <-- 2. Obtenemos el nombre exacto de la tabla de Postgres
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) { 
        token.rol = user.rol; 
        token.usuario = user.usuario; 
        token.rolName = user.rolName; // <-- 3. Lo guardamos en el token
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub ?? '';   // <-- id del usuario (viene en token.sub por defecto)
        session.user.rol = token.rol; 
        session.user.usuario = token.usuario; 
        session.user.rolName = token.rolName;
      }
      return session;
    },
  },
  pages: { signIn: "/" },
};