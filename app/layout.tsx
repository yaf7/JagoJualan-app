import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "JagoJualan — Asisten AI UMKM",
  description:
    "Stop banting harga, siap tembus ekspor! JagoJualan membantu UMKM menganalisis produk dengan AI untuk strategi bisnis yang lebih cerdas.",
  keywords: [
    "UMKM",
    "ekspor",
    "AI",
    "JagoJualan",
    "strategi bisnis",
    "analisis produk",
  ],
  authors: [{ name: "Deyafa Arsetya" }],
  openGraph: {
    title: "JagoJualan — Asisten AI UMKM",
    description:
      "Stop banting harga, siap tembus ekspor! Analisis produk cerdas dengan AI.",
    type: "website",
  },
  other: {
    "dicoding:email": "yafaarsetya@gmail.com",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="id"
      className={`${geistSans.variable} ${geistMono.variable} antialiased`}
    >
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
