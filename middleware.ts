// middleware.ts (protege también a nivel de ruta, antes de renderizar)
import { withAuth } from 'next-auth/middleware';

export default withAuth({
  callbacks: {
    authorized: ({ token, req }) => {
      if (req.nextUrl.pathname.startsWith('/dashboard/estado')) {
        return token?.rol === 1 || token?.rol === 2;
      }
      return !!token;
    },
  },
});

export const config = { matcher: ['/dashboard/:path*'] };