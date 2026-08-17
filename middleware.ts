import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

// Definimos qué roles tienen acceso a qué rutas principales
const RUTAS_POR_ROL: Record<string, number[]> = {
  '/dashboard': [1],
  '/operacion': [2, 3]
};

export default withAuth(
  function middleware(req) {
    const rol = Number(req.nextauth.token?.rol);
    const path = req.nextUrl.pathname;

    // Buscamos a qué sección pertenece la ruta actual
    const match = Object.keys(RUTAS_POR_ROL).find((prefix) => path.startsWith(prefix));

    // Si la ruta está protegida y el rol del usuario no está en el arreglo de permitidos
    if (match && !RUTAS_POR_ROL[match].includes(rol)) {
      
      // Redirigimos al usuario a su área correspondiente según su rol
      if (rol === 1) {
        return NextResponse.redirect(new URL('/dashboard', req.url));
      } 
      else if (rol === 2) {
        return NextResponse.redirect(new URL('/operacion/pernocta', req.url));
      } 
      else if (rol === 3) {
        return NextResponse.redirect(new URL('/operacion/combustible', req.url));
      } 
      else {
        // Fallback de seguridad si el rol no coincide con ninguno
        return NextResponse.redirect(new URL('/', req.url));
      }
    }
    
    // Si tiene permiso, permite que la petición continúe normalmente
    return NextResponse.next();
  },
  { 
    pages: { signIn: '/' } 
  }
);

// IMPORTANTE: Agregamos /operacion al matcher para que el middleware lo intercepte
export const config = { 
  matcher: [
    '/dashboard/:path*', 
    '/operacion/:path*'
  ] 
};