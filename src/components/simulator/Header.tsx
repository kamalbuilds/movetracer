"use client";

import { useState } from "react";
import { useSimulatorStore } from "@/lib/store";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip } from "@/components/ui/tooltip";
import { NETWORKS } from "@/lib/movement";
import { SavedSimulation } from "@/types";
import {
  Github,
  Book,
  History,
  ChevronDown,
  ExternalLink,
  X,
  Clock,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { clsx } from "clsx";

export function Header() {
  const { network, simulationHistory, clearHistory } = useSimulatorStore();
  const [showHistory, setShowHistory] = useState(false);

  const networkConfig = NETWORKS[network];

  return (
    <>
      <header className="border-b border-white/10 bg-black/40 backdrop-blur-xl sticky top-0 z-50">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-yellow-600 flex items-center justify-center text-black font-bold text-xl shadow-lg shadow-primary/20">
                M
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight">MoveSim</h1>
                <p className="text-[10px] text-muted-foreground -mt-0.5">
                  Transaction Simulator
                </p>
              </div>
            </div>
            <Badge
              variant="outline"
              className={clsx(
                "ml-2 uppercase text-[10px] tracking-wider",
                network === "mainnet"
                  ? "border-green-500/30 text-green-400"
                  : network === "testnet"
                  ? "border-primary/30 text-primary"
                  : "border-blue-500/30 text-blue-400"
              )}
            >
              {network}
            </Badge>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <Tooltip content="Simulation History">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowHistory(!showHistory)}
                className="relative"
              >
                <History className="w-4 h-4" />
                {simulationHistory.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-primary text-[10px] text-black font-bold flex items-center justify-center">
                    {simulationHistory.length}
                  </span>
                )}
              </Button>
            </Tooltip>

            <div className="w-px h-6 bg-white/10" />

            <Tooltip content="Documentation">
              <a
                href="https://docs.movementnetwork.xyz"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button variant="ghost" size="icon">
                  <Book className="w-4 h-4" />
                </Button>
              </a>
            </Tooltip>

            <Tooltip content="GitHub">
              <a
                href="https://github.com/movementlabsxyz"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button variant="ghost" size="icon">
                  <Github className="w-4 h-4" />
                </Button>
              </a>
            </Tooltip>
          </div>
        </div>
      </header>

      {/* History Panel */}
      {showHistory && (
        <HistoryPanel
          onClose={() => setShowHistory(false)}
          history={simulationHistory}
          onClear={clearHistory}
        />
      )}
    </>
  );
}

function HistoryPanel({
  onClose,
  history,
  onClear,
}: {
  onClose: () => void;
  history: SavedSimulation[];
  onClear: () => void;
}) {
  const { setJsonPayload, setSenderAddress, setSimulationResult, setInputMode } = useSimulatorStore();

  const loadSimulation = (item: SavedSimulation) => {
    setInputMode("json");
    setJsonPayload(JSON.stringify(item.request.payload, null, 2));
    setSenderAddress(item.request.sender);
    setSimulationResult(item.result);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        className="absolute top-16 right-6 w-96 max-h-[calc(100vh-6rem)] bg-popover border border-border rounded-xl shadow-2xl overflow-hidden animate-in slide-in-from-top-2 fade-in duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <h3 className="font-semibold">Simulation History</h3>
          <div className="flex items-center gap-2">
            {history.length > 0 && (
              <Button variant="ghost" size="sm" onClick={onClear} className="text-xs">
                Clear All
              </Button>
            )}
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="max-h-[400px] overflow-auto">
          {history.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <History className="w-10 h-10 mx-auto mb-3 opacity-50" />
              <p className="text-sm">No simulation history yet</p>
              <p className="text-xs mt-1">Your simulations will appear here</p>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {history.map((item) => (
                <button
                  key={item.id}
                  onClick={() => loadSimulation(item)}
                  className="w-full p-4 text-left hover:bg-white/5 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={clsx(
                        "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0",
                        item.result.success ? "bg-green-500/20" : "bg-red-500/20"
                      )}
                    >
                      {item.result.success ? (
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-500" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-mono text-xs truncate">
                        {item.request.payload.function}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-[10px]">
                          {item.network}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatRelativeTime(item.createdAt)}
                        </span>
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
}
