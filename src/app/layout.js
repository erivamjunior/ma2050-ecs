import { Suspense } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import AppShell from "@/components/app-shell";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "MA 2050 - Sistema de Gestao de Projetos",
  description: "MVP fullstack para gestao de projetos",
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <div className="brandBackdrop" aria-hidden="true">
          <div className="brandBackdropGraphic" />
        </div>

        <Suspense fallback={children}>
          <AppShell>{children}</AppShell>
        </Suspense>
      </body>
    </html>
  );
}
