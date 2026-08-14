import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Control Vehicular | CFE",
  description: "Plataforma integral para el control de la flotilla operativa.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className="h-full antialiased">
      {/* El body engloba TODA la app. Aquí no ponemos la barra de navegación */}
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-800">
        {children}
      </body>
    </html>
  );
}