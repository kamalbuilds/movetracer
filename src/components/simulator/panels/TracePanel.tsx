"use client";

import { useState } from "react";
import { SimulationResult, ExecutionTrace } from "@/types";
import { Badge } from "@/components/ui/badge";
import { buildExecutionTrace, formatGas, parseFunctionId } from "@/lib/movement";
import {
  ChevronRight,
  ChevronDown,
  Box,
  Activity,
  Zap,
} from "lucide-react";
import { clsx } from "clsx";

interface TracePanelProps {
  result: SimulationResult;
}

export function TracePanel({ result }: TracePanelProps) {
  // Build execution trace from the result
  const payload = result.payload;
  if (!payload?.function) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        No execution trace available
      </div>
    );
  }

  const trace = buildExecutionTrace(
    {
      function: payload.function,
      type_arguments: payload.type_arguments || [],
      arguments: payload.arguments || [],
    },
    result.events,
    result.gas_used
  );

  return (
    <div className="p-6">
      <div className="mb-4">
        <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">
          Execution Stack
        </h4>
        <p className="text-xs text-muted-foreground">
          Hierarchical view of function calls during execution
        </p>
      </div>

      <div className="bg-black/40 rounded-lg border border-white/5 overflow-hidden">
        <TraceNode trace={trace} depth={0} />
      </div>
    </div>
  );
}

function TraceNode({ trace, depth }: { trace: ExecutionTrace; depth: number }) {
  const [isExpanded, setIsExpanded] = useState(true);
  const hasChildren = trace.children.length > 0 || trace.events.length > 0;

  let functionInfo = { address: "", module: "", function: trace.function };
  try {
    const parts = trace.module.split("::");
    if (parts.length >= 2) {
      functionInfo.address = parts[0];
      functionInfo.module = parts[1];
    }
  } catch {
    // Ignore errors
  }

  return (
    <div>
      <div
        className={clsx(
          "flex items-center gap-2 px-4 py-3 hover:bg-white/5 transition-colors cursor-pointer border-b border-white/5",
          depth > 0 && "border-l-2 border-l-primary/30"
        )}
        style={{ paddingLeft: `${16 + depth * 24}px` }}
        onClick={() => hasChildren && setIsExpanded(!isExpanded)}
      >
        {hasChildren ? (
          <button className="w-5 h-5 flex items-center justify-center text-muted-foreground">
            {isExpanded ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </button>
        ) : (
          <div className="w-5 h-5 flex items-center justify-center">
            <div className="w-1.5 h-1.5 rounded-full bg-primary/50" />
          </div>
        )}

        <Box className="w-4 h-4 text-primary" />

        <div className="flex-1 font-mono text-sm">
          <span className="text-muted-foreground">{functionInfo.address}::</span>
          <span className="text-primary">{functionInfo.module}</span>
          <span className="text-muted-foreground">::</span>
          <span className="text-foreground font-semibold">{trace.function}</span>
        </div>

        <div className="flex items-center gap-2">
          {trace.events.length > 0 && (
            <Badge variant="info" className="text-xs">
              <Activity className="w-3 h-3 mr-1" />
              {trace.events.length}
            </Badge>
          )}
          <Badge variant="outline" className="text-xs font-mono">
            <Zap className="w-3 h-3 mr-1" />
            {formatGas(trace.gas_used)}
          </Badge>
        </div>
      </div>

      {isExpanded && hasChildren && (
        <div className="bg-black/20">
          {/* Child function calls */}
          {trace.children.map((child, i) => (
            <TraceNode key={i} trace={child} depth={depth + 1} />
          ))}

          {/* Events emitted at this level */}
          {trace.events.length > 0 && depth === 0 && (
            <div className="border-t border-white/5">
              {trace.events.map((event, i) => (
                <EventItem key={i} event={event} depth={depth + 1} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function EventItem({
  event,
  depth,
}: {
  event: { type: string; data: Record<string, unknown> };
  depth: number;
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Parse event type
  const eventParts = event.type.split("::");
  const eventName = eventParts[eventParts.length - 1];
  const moduleInfo = eventParts.slice(0, -1).join("::");

  return (
    <div>
      <div
        className="flex items-center gap-2 px-4 py-2 hover:bg-white/5 transition-colors cursor-pointer"
        style={{ paddingLeft: `${16 + depth * 24}px` }}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <button className="w-5 h-5 flex items-center justify-center text-muted-foreground">
          {isExpanded ? (
            <ChevronDown className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
        </button>

        <Activity className="w-4 h-4 text-blue-400" />

        <div className="flex-1 font-mono text-sm">
          <span className="text-muted-foreground">{moduleInfo}::</span>
          <span className="text-blue-400 font-semibold">{eventName}</span>
        </div>

        <Badge variant="info" className="text-xs">Event</Badge>
      </div>

      {isExpanded && (
        <div
          className="px-4 py-3 bg-black/40 border-y border-white/5"
          style={{ paddingLeft: `${40 + depth * 24}px` }}
        >
          <pre className="text-xs font-mono text-muted-foreground overflow-x-auto">
            {JSON.stringify(event.data, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
