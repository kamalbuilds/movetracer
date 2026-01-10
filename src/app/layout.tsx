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
  title: "MoveTracer - Movement Network Transaction Simulator",
  description: "Simulate, debug, and trace Movement Network transactions before executing them on-chain. The Tenderly for Movement.",
  keywords: ["Movement", "Blockchain", "Transaction Simulator", "Move", "Web3", "DeFi"],
  authors: [{ name: "Movement Labs" }],
  openGraph: {
    title: "MoveTracer - Movement Network Transaction Simulator",
    description: "Simulate, debug, and trace Movement Network transactions before executing them on-chain.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased font-sans`}
      >
        {children}
      </body>
    </html>
  );
}
