import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";


declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      rol?: string;
      usuario?: string;
    }
  }
  interface User {
    id: string;
    name?: string | null;
    rol?: string;
    usuario?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    rol?: string;
    usuario?: string;
  }
}

const prisma = new PrismaClient();

const handler = NextAuth({
  providers: [
    CredentialsProvider({
      name: "Credenciales",
      credentials: {
        usuario: { label: "Usuario", type: "text", placeholder: "Ej. admin_cfe" },
        password: { label: "Contraseña", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.usuario || !credentials?.password) return null;

        // Buscamos al usuario en la base de datos e incluimos su Rol
        const user = await prisma.usuario.findUnique({
          where: { usuario: credentials.usuario },
          include: { rol: true } 
        });

        if (!user) return null;

        // Comparamos contraseñas
        const passwordsMatch = await bcrypt.compare(credentials.password, user.passwordHash);

        if (!passwordsMatch) return null;

        // Regresamos el objeto con los datos correctos
        return {
          id: user.id.toString(),
          name: user.nombre,
          usuario: user.usuario,
          rol: user.rol.nombreRol, 
        };
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.rol = user.rol;
        token.usuario = user.usuario;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        //  2. Como ya declaramos las interfaces arriba, TS ya no marca error aquí
        session.user.rol = token.rol;
        session.user.usuario = token.usuario;
      }
      return session;
    }
  },
  pages: {
    signIn: '/login', // Redirige a nuestra propia interfaz visual
  }
});

export { handler as GET, handler as POST };