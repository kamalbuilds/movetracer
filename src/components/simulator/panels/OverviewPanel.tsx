"use client";

import { SimulationResult } from "@/types";
import { Badge } from "@/components/ui/badge";
import {
  extractBalanceChanges,
  formatMoveAmount,
  formatGas,
  parseFunctionId,
} from "@/lib/movement";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Wallet,
  Hash,
  Clock,
  User,
  FileCode,
  ArrowRight,
} from "lucide-react";
import { clsx } from "clsx";

interface OverviewPanelProps {
  result: SimulationResult;
}

export function OverviewPanel({ result }: OverviewPanelProps) {
  const balanceChanges = extractBalanceChanges(result.changes, result.sender);

  let functionInfo = { address: "", module: "", function: "" };
  try {
    if (result.payload?.function) {
      functionInfo = parseFunctionId(result.payload.function);
    }
  } catch {
    // Ignore parsing errors
  }

  return (
    <div className="p-6 space-y-6">
      {/* Function Call */}
      <Section title="Function Call">
        <div className="bg-black/40 rounded-lg p-4 border border-white/5">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <FileCode className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-mono text-sm break-all">
                <span className="text-muted-foreground">
                  {functionInfo.address}::
                </span>
                <span className="text-primary">{functionInfo.module}</span>
                <span className="text-muted-foreground">::</span>
                <span className="text-foreground font-semibold">
                  {functionInfo.function}
                </span>
              </div>

              {result.payload?.type_arguments && result.payload.type_arguments.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  <span className="text-xs text-muted-foreground">Types:</span>
                  {result.payload.type_arguments.map((type, i) => (
                    <Badge key={i} variant="outline" className="font-mono text-xs">
                      {type}
                    </Badge>
                  ))}
                </div>
              )}

              {result.payload?.arguments && result.payload.arguments.length > 0 && (
                <div className="mt-3 space-y-1">
                  <span className="text-xs text-muted-foreground">Arguments:</span>
                  <div className="flex flex-wrap gap-2">
                    {(result.payload.arguments as string[]).map((arg, i) => (
                      <code
                        key={i}
                        className="px-2 py-1 bg-white/5 rounded text-xs font-mono"
                      >
                        {typeof arg === "object" ? JSON.stringify(arg) : String(arg)}
                      </code>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </Section>

      {/* Transaction Details */}
      <Section title="Transaction Details">
        <div className="grid grid-cols-2 gap-4">
          <DetailItem
            icon={User}
            label="Sender"
            value={result.sender}
            mono
          />
          <DetailItem
            icon={Hash}
            label="Hash"
            value={result.hash}
            mono
          />
          <DetailItem
            icon={Clock}
            label="Gas Used"
            value={`${formatGas(result.gas_used)} units`}
          />
          <DetailItem
            icon={Wallet}
            label="Gas Price"
            value={`${result.gas_unit_price} octas`}
          />
        </div>
      </Section>

      {/* Balance Changes */}
      {balanceChanges.length > 0 && (
        <Section title="Balance Sheet">
          <div className="space-y-3">
            {balanceChanges.map((change, i) => (
              <div
                key={i}
                className={clsx(
                  "flex items-center justify-between p-4 rounded-lg border",
                  change.direction === "inflow"
                    ? "bg-green-500/5 border-green-500/20"
                    : change.direction === "outflow"
                    ? "bg-red-500/5 border-red-500/20"
                    : "bg-white/5 border-white/10"
                )}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={clsx(
                      "w-8 h-8 rounded-full flex items-center justify-center",
                      change.direction === "inflow"
                        ? "bg-green-500/20"
                        : change.direction === "outflow"
                        ? "bg-red-500/20"
                        : "bg-white/10"
                    )}
                  >
                    {change.direction === "inflow" ? (
                      <ArrowDownLeft className="w-4 h-4 text-green-500" />
                    ) : (
                      <ArrowUpRight className="w-4 h-4 text-red-500" />
                    )}
                  </div>
                  <div>
                    <p className="font-mono text-sm truncate max-w-[200px]">
                      {change.address}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {change.coin_symbol}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p
                    className={clsx(
                      "font-mono font-semibold",
                      change.direction === "inflow"
                        ? "text-green-500"
                        : change.direction === "outflow"
                        ? "text-red-500"
                        : "text-foreground"
                    )}
                  >
                    {change.direction === "inflow" ? "+" : "-"}
                    {formatMoveAmount(change.change)} {change.coin_symbol}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Quick Summary */}
      <Section title="Execution Summary">
        <div className="flex items-center gap-4 p-4 bg-black/40 rounded-lg border border-white/5">
          <div className="flex-1 flex items-center gap-2">
            <Badge variant={result.success ? "success" : "error"}>
              {result.success ? "Success" : "Failed"}
            </Badge>
            <ArrowRight className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm">
              {result.changes.length} state changes, {result.events.length} events emitted
            </span>
          </div>
        </div>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
        {title}
      </h4>
      {children}
    </div>
  );
}

function DetailItem({
  icon: Icon,
  label,
  value,
  mono = false,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-start gap-3 p-3 bg-black/40 rounded-lg border border-white/5">
      <Icon className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p
          className={clsx(
            "text-sm truncate",
            mono && "font-mono"
          )}
          title={value}
        >
          {value}
        </p>
      </div>
    </div>
  );
}
