"use client";

import { useState } from "react";
import { useSimulatorStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SavedSimulation } from "@/types";
import {
  History,
  CheckCircle,
  XCircle,
  ChevronRight,
  Trash2,
  Clock,
  X,
} from "lucide-react";
import { clsx } from "clsx";

interface HistorySidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function HistorySidebar({ isOpen, onClose }: HistorySidebarProps) {
  const {
    simulationHistory,
    setSimulationResult,
    setJsonPayload,
    setSenderAddress,
    setNetwork,
    clearHistory,
  } = useSimulatorStore();

  const loadSimulation = (sim: SavedSimulation) => {
    setSimulationResult(sim.result);
    setJsonPayload(JSON.stringify(sim.request.payload, null, 2));
    setSenderAddress(sim.request.sender);
    setNetwork(sim.network);
    onClose();
  };

  const formatTimeAgo = (date: string) => {
    const now = new Date();
    const then = new Date(date);
    const diff = now.getTime() - then.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return "Just now";
  };

  const getFunctionName = (func: string) => {
    const parts = func.split("::");
    return parts.length > 0 ? parts[parts.length - 1] : func;
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40"
        onClick={onClose}
      />

      {/* Sidebar */}
      <div className="fixed right-0 top-0 h-full w-96 bg-background border-l border-white/10 shadow-xl z-50 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-primary" />
            <h2 className="font-semibold">Simulation History</h2>
            <Badge variant="outline" className="text-xs">
              {simulationHistory.length}
            </Badge>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto">
          {simulationHistory.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-6">
              <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
                <History className="w-8 h-8 text-muted-foreground opacity-50" />
              </div>
              <h3 className="font-semibold mb-2">No History Yet</h3>
              <p className="text-sm text-muted-foreground">
                Your simulation history will appear here after you run your first simulation.
              </p>
            </div>
          ) : (
            <div className="p-2 space-y-1">
              {simulationHistory.map((sim) => (
                <HistoryItem
                  key={sim.id}
                  simulation={sim}
                  onLoad={() => loadSimulation(sim)}
                  formatTimeAgo={formatTimeAgo}
                  getFunctionName={getFunctionName}
                />
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {simulationHistory.length > 0 && (
          <div className="p-4 border-t border-white/10">
            <Button
              variant="outline"
              size="sm"
              className="w-full text-red-500 hover:text-red-400 hover:border-red-500/50"
              onClick={() => {
                if (confirm("Are you sure you want to clear all history?")) {
                  clearHistory();
                }
              }}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Clear History
            </Button>
          </div>
        )}
      </div>
    </>
  );
}

function HistoryItem({
  simulation,
  onLoad,
  formatTimeAgo,
  getFunctionName,
}: {
  simulation: SavedSimulation;
  onLoad: () => void;
  formatTimeAgo: (date: string) => string;
  getFunctionName: (func: string) => string;
}) {
  return (
    <button
      onClick={onLoad}
      className={clsx(
        "w-full text-left p-3 rounded-lg border transition-all",
        "hover:bg-white/5 hover:border-white/20",
        simulation.result.success
          ? "border-green-500/20 bg-green-500/5"
          : "border-red-500/20 bg-red-500/5"
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={clsx(
            "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
            simulation.result.success ? "bg-green-500/20" : "bg-red-500/20"
          )}
        >
          {simulation.result.success ? (
            <CheckCircle className="w-4 h-4 text-green-500" />
          ) : (
            <XCircle className="w-4 h-4 text-red-500" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm font-semibold truncate">
              {getFunctionName(simulation.request.payload.function)}
            </span>
            <Badge variant="outline" className="text-xs flex-shrink-0">
              {simulation.network}
            </Badge>
          </div>

          <p className="text-xs text-muted-foreground truncate mt-1">
            {simulation.request.sender}
          </p>

          <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
            <Clock className="w-3 h-3" />
            <span>{formatTimeAgo(simulation.createdAt)}</span>
            <span className="text-white/20">•</span>
            <span>Gas: {simulation.result.gas_used}</span>
          </div>
        </div>

        <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
      </div>
    </button>
  );
}
