"use client";

import { Toaster } from "react-hot-toast";
import { Header, TransactionInput, SimulationResults } from "@/components/simulator";

export default function Home() {
  return (
    <main className="min-h-screen bg-background text-foreground flex flex-col">
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: "hsl(var(--popover))",
            color: "hsl(var(--popover-foreground))",
            border: "1px solid hsl(var(--border))",
          },
        }}
      />

      <Header />

      {/* Hero Section */}
      <div className="border-b border-white/5 bg-gradient-to-b from-primary/5 to-transparent">
        <div className="container mx-auto px-6 py-8">
          <div className="max-w-2xl">
            <h2 className="text-3xl font-bold mb-2">
              Simulate Before You Sign
            </h2>
            <p className="text-muted-foreground">
              Know exactly what your transaction will do before executing it on-chain.
              Debug, trace, and optimize your Movement transactions with full visibility.
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 container mx-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
          <TransactionInput />
          <SimulationResults />
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-white/5 py-6">
        <div className="container mx-auto px-6">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-4">
              <span>Built for Movement Network</span>
              <span className="text-white/20">•</span>
              <a
                href="https://movementnetwork.xyz"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-primary transition-colors"
              >
                movementnetwork.xyz
              </a>
            </div>
            <div className="flex items-center gap-4">
              <a
                href="https://docs.movementnetwork.xyz"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-primary transition-colors"
              >
                Docs
              </a>
              <a
                href="https://github.com/movementlabsxyz"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-primary transition-colors"
              >
                GitHub
              </a>
              <a
                href="https://discord.gg/movementlabsxyz"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-primary transition-colors"
              >
                Discord
              </a>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}
