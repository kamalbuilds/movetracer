"use client";

import { SimulationResult, GasBreakdown } from "@/types";
import { Badge } from "@/components/ui/badge";
import {
  buildExecutionTrace,
  buildGasBreakdown,
  formatGas,
  formatMoveAmount,
  calculateGasCost,
} from "@/lib/movement";
import { Zap, TrendingUp, Gauge, DollarSign } from "lucide-react";
import { clsx } from "clsx";

interface GasPanelProps {
  result: SimulationResult;
}

export function GasPanel({ result }: GasPanelProps) {
  const gasUsed = parseInt(result.gas_used);
  const maxGas = parseInt(result.max_gas_amount);
  const gasPrice = result.gas_unit_price;
  const gasCost = calculateGasCost(result.gas_used, gasPrice);

  // Build gas breakdown
  let gasBreakdown: GasBreakdown | null = null;
  if (result.payload?.function) {
    const trace = buildExecutionTrace(
      {
        function: result.payload.function,
        type_arguments: result.payload.type_arguments || [],
        arguments: result.payload.arguments || [],
      },
      result.events,
      result.gas_used
    );
    gasBreakdown = buildGasBreakdown(trace, gasUsed);
  }

  const utilizationPercent = maxGas > 0 ? (gasUsed / maxGas) * 100 : 0;

  return (
    <div className="p-6 space-y-6">
      <div className="mb-4">
        <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">
          Gas Analysis
        </h4>
        <p className="text-xs text-muted-foreground">
          Breakdown of gas consumption and cost estimation
        </p>
      </div>

      {/* Gas Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <GasStat
          label="Gas Used"
          value={formatGas(gasUsed)}
          subtext="units"
          icon={Zap}
          color="primary"
        />
        <GasStat
          label="Max Gas"
          value={formatGas(maxGas)}
          subtext="limit"
          icon={Gauge}
          color="muted"
        />
        <GasStat
          label="Gas Price"
          value={gasPrice}
          subtext="octas/unit"
          icon={TrendingUp}
          color="blue"
        />
        <GasStat
          label="Total Cost"
          value={gasCost}
          subtext="MOVE"
          icon={DollarSign}
          color="green"
        />
      </div>

      {/* Utilization Bar */}
      <div className="bg-black/40 rounded-xl p-6 border border-white/5">
        <div className="flex items-center justify-between mb-4">
          <h5 className="font-semibold text-sm">Gas Utilization</h5>
          <Badge
            variant={
              utilizationPercent > 80
                ? "error"
                : utilizationPercent > 50
                ? "warning"
                : "success"
            }
          >
            {utilizationPercent.toFixed(1)}% used
          </Badge>
        </div>

        <div className="relative h-8 bg-white/5 rounded-full overflow-hidden">
          <div
            className={clsx(
              "absolute inset-y-0 left-0 rounded-full transition-all duration-500",
              utilizationPercent > 80
                ? "bg-gradient-to-r from-red-500 to-red-600"
                : utilizationPercent > 50
                ? "bg-gradient-to-r from-yellow-500 to-orange-500"
                : "bg-gradient-to-r from-green-500 to-emerald-500"
            )}
            style={{ width: `${Math.min(utilizationPercent, 100)}%` }}
          />
          <div className="absolute inset-0 flex items-center justify-center text-xs font-mono font-semibold">
            {formatGas(gasUsed)} / {formatGas(maxGas)}
          </div>
        </div>

        <p className="text-xs text-muted-foreground mt-3">
          {utilizationPercent > 80
            ? "High gas utilization. Consider optimizing your transaction."
            : utilizationPercent > 50
            ? "Moderate gas usage. Transaction executed efficiently."
            : "Low gas usage. Transaction is well optimized."}
        </p>
      </div>

      {/* Gas Flamegraph */}
      {gasBreakdown && (
        <div className="bg-black/40 rounded-xl border border-white/5 overflow-hidden">
          <div className="p-4 border-b border-white/5">
            <h5 className="font-semibold text-sm flex items-center gap-2">
              <Zap className="w-4 h-4 text-primary" />
              Gas Breakdown by Function
            </h5>
          </div>
          <div className="p-4">
            <FlameGraph breakdown={gasBreakdown} totalGas={gasUsed} depth={0} />
          </div>
        </div>
      )}

      {/* Gas Tips */}
      <div className="bg-primary/5 rounded-xl p-4 border border-primary/20">
        <h5 className="font-semibold text-sm text-primary mb-2 flex items-center gap-2">
          <TrendingUp className="w-4 h-4" />
          Gas Optimization Tips
        </h5>
        <ul className="text-xs text-muted-foreground space-y-1">
          <li>• Consider batching multiple operations into a single transaction</li>
          <li>• Use resource accounts to reduce storage costs</li>
          <li>• Minimize data stored on-chain when possible</li>
          <li>• Avoid unnecessary reads and writes to global storage</li>
        </ul>
      </div>
    </div>
  );
}

function GasStat({
  label,
  value,
  subtext,
  icon: Icon,
  color,
}: {
  label: string;
  value: string;
  subtext: string;
  icon: React.ElementType;
  color: "primary" | "muted" | "blue" | "green";
}) {
  const colors = {
    primary: "text-primary bg-primary/10",
    muted: "text-muted-foreground bg-white/5",
    blue: "text-blue-400 bg-blue-500/10",
    green: "text-green-400 bg-green-500/10",
  };

  return (
    <div className="bg-black/40 rounded-xl p-4 border border-white/5">
      <div className="flex items-center gap-3 mb-3">
        <div className={clsx("w-10 h-10 rounded-lg flex items-center justify-center", colors[color])}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <p className="text-xs text-muted-foreground uppercase tracking-wider">{label}</p>
      <p className="font-mono text-xl font-bold mt-1">{value}</p>
      <p className="text-xs text-muted-foreground">{subtext}</p>
    </div>
  );
}

function FlameGraph({
  breakdown,
  totalGas,
  depth,
}: {
  breakdown: GasBreakdown;
  totalGas: number;
  depth: number;
}) {
  const widthPercent = Math.max(breakdown.percentage, 5); // Minimum 5% width for visibility

  return (
    <div className="space-y-1">
      <div
        className="relative group"
        style={{ marginLeft: `${depth * 16}px` }}
      >
        <div
          className={clsx(
            "h-10 rounded flex items-center px-3 cursor-pointer transition-all",
            depth === 0
              ? "bg-primary/30 hover:bg-primary/40"
              : "bg-white/10 hover:bg-white/20"
          )}
          style={{ width: `${widthPercent}%`, minWidth: "100px" }}
        >
          <span className="text-xs font-mono truncate flex-1">
            {breakdown.function.split("::").pop()}
          </span>
          <span className="text-xs font-mono text-muted-foreground ml-2">
            {formatGas(breakdown.gas_used)} ({breakdown.percentage.toFixed(1)}%)
          </span>
        </div>

        {/* Tooltip */}
        <div className="absolute left-0 top-full mt-1 z-10 hidden group-hover:block">
          <div className="bg-popover border border-border rounded-lg p-3 shadow-xl text-xs">
            <p className="font-mono font-semibold mb-1">{breakdown.function}</p>
            <p className="text-muted-foreground">
              Gas: {formatGas(breakdown.gas_used)} ({breakdown.percentage.toFixed(2)}%)
            </p>
          </div>
        </div>
      </div>

      {breakdown.children.map((child, i) => (
        <FlameGraph key={i} breakdown={child} totalGas={totalGas} depth={depth + 1} />
      ))}
    </div>
  );
}
