"use client";

import { useState } from "react";
import { useSimulatorStore } from "@/lib/store";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip } from "@/components/ui/tooltip";
import { OverviewPanel } from "./panels/OverviewPanel";
import { TracePanel } from "./panels/TracePanel";
import { ChangesPanel } from "./panels/ChangesPanel";
import { EventsPanel } from "./panels/EventsPanel";
import { GasPanel } from "./panels/GasPanel";
import {
  Activity,
  CheckCircle,
  XCircle,
  GitBranch,
  Layers,
  Zap,
  Calendar,
  Share2,
  Copy,
  ExternalLink,
  Check,
} from "lucide-react";
import { clsx } from "clsx";
import { formatGas, calculateGasCost } from "@/lib/movement";
import toast from "react-hot-toast";

export function SimulationResults() {
  const { simulationResult, simulationError, activeTab, setActiveTab, network, simulationHistory } = useSimulatorStore();
  const [copiedHash, setCopiedHash] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  if (simulationError) {
    return (
      <Card className="h-full min-h-[500px] flex flex-col items-center justify-center">
        <div className="text-center p-8">
          <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
            <XCircle className="w-8 h-8 text-red-500" />
          </div>
          <h3 className="font-semibold text-lg mb-2">Simulation Failed</h3>
          <p className="text-sm text-muted-foreground max-w-md break-all">
            {simulationError}
          </p>
        </div>
      </Card>
    );
  }

  if (!simulationResult) {
    return (
      <Card className="h-full min-h-[500px] flex flex-col items-center justify-center">
        <div className="text-center p-8">
          <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
            <Activity className="w-10 h-10 text-muted-foreground opacity-50" />
          </div>
          <h3 className="font-semibold text-lg mb-2">Ready to Simulate</h3>
          <p className="text-sm text-muted-foreground max-w-sm">
            Enter a transaction payload and click Simulate to see detailed execution traces, gas usage, and state changes.
          </p>
        </div>
      </Card>
    );
  }

  const gasCost = calculateGasCost(
    simulationResult.gas_used,
    simulationResult.gas_unit_price
  );

  const copyHash = () => {
    navigator.clipboard.writeText(simulationResult.hash);
    setCopiedHash(true);
    toast.success("Hash copied to clipboard");
    setTimeout(() => setCopiedHash(false), 2000);
  };

  const shareSimulation = () => {
    // Find the simulation in history
    const latestSim = simulationHistory.find(
      (s) => s.result.hash === simulationResult.hash
    );

    if (latestSim) {
      const url = `${window.location.origin}/sim/${latestSim.id}`;
      navigator.clipboard.writeText(url);
      setCopiedLink(true);
      toast.success("Share link copied to clipboard");
      setTimeout(() => setCopiedLink(false), 2000);
    } else {
      toast.error("Save the simulation first to get a shareable link");
    }
  };

  return (
    <Card className="h-full min-h-[500px] flex flex-col">
      {/* Status Header */}
      <div
        className={clsx(
          "px-6 py-4 border-b flex items-center justify-between",
          simulationResult.success
            ? "border-l-4 border-l-green-500 bg-green-500/5"
            : "border-l-4 border-l-red-500 bg-red-500/5"
        )}
      >
        <div className="flex items-center gap-4">
          {simulationResult.success ? (
            <CheckCircle className="w-6 h-6 text-green-500" />
          ) : (
            <XCircle className="w-6 h-6 text-red-500" />
          )}
          <div>
            <h3 className="font-semibold text-lg">
              {simulationResult.success ? "Simulation Successful" : "Simulation Failed"}
            </h3>
            <p className="text-sm text-muted-foreground font-mono">
              {simulationResult.vm_status}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">
              Gas Cost
            </p>
            <p className="font-mono text-xl font-bold text-primary">
              {gasCost} MOVE
            </p>
          </div>
          <div className="flex gap-2">
            <Tooltip content={copiedHash ? "Copied!" : "Copy Hash"}>
              <Button variant="ghost" size="icon" onClick={copyHash}>
                {copiedHash ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
              </Button>
            </Tooltip>
            <Tooltip content={copiedLink ? "Copied!" : "Share Simulation"}>
              <Button variant="ghost" size="icon" onClick={shareSimulation}>
                {copiedLink ? <Check className="w-4 h-4 text-green-500" /> : <Share2 className="w-4 h-4" />}
              </Button>
            </Tooltip>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-4 gap-4 px-6 py-4 bg-black/20 border-b border-white/5">
        <Stat
          label="Gas Used"
          value={formatGas(simulationResult.gas_used)}
          icon={Zap}
        />
        <Stat
          label="State Changes"
          value={String(simulationResult.changes.length)}
          icon={Layers}
        />
        <Stat
          label="Events"
          value={String(simulationResult.events.length)}
          icon={Activity}
        />
        <Stat
          label="Version"
          value={simulationResult.version || "Simulated"}
          icon={GitBranch}
        />
      </div>

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as typeof activeTab)}
        className="flex-1 flex flex-col overflow-hidden"
      >
        <div className="px-4 py-3 border-b border-white/5">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="trace">Trace</TabsTrigger>
            <TabsTrigger value="changes">State Changes</TabsTrigger>
            <TabsTrigger value="events">Events</TabsTrigger>
            <TabsTrigger value="gas">Gas</TabsTrigger>
          </TabsList>
        </div>

        <div className="flex-1 overflow-auto">
          <TabsContent value="overview" className="h-full">
            <OverviewPanel result={simulationResult} />
          </TabsContent>
          <TabsContent value="trace" className="h-full">
            <TracePanel result={simulationResult} />
          </TabsContent>
          <TabsContent value="changes" className="h-full">
            <ChangesPanel result={simulationResult} />
          </TabsContent>
          <TabsContent value="events" className="h-full">
            <EventsPanel result={simulationResult} />
          </TabsContent>
          <TabsContent value="gas" className="h-full">
            <GasPanel result={simulationResult} />
          </TabsContent>
        </div>
      </Tabs>
    </Card>
  );
}

function Stat({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: React.ElementType;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center">
        <Icon className="w-5 h-5 text-primary" />
      </div>
      <div>
        <p className="text-xs text-muted-foreground uppercase tracking-wider">
          {label}
        </p>
        <p className="font-mono font-semibold">{value}</p>
      </div>
    </div>
  );
}
