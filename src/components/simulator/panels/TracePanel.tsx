"use client";

import { useState, useMemo } from "react";
import { SimulationResult, ExecutionTrace } from "@/types";
import { Badge } from "@/components/ui/badge";
import { buildExecutionTrace, formatGas, parseFunctionId } from "@/lib/movement";
import {
  ChevronRight,
  ChevronDown,
  Box,
  Activity,
  Zap,
  Search,
  Eye,
  PenLine,
  ArrowRight,
  Copy,
  Check,
  Filter,
  Layers,
} from "lucide-react";
import { clsx } from "clsx";

// Operation types for Move execution trace (similar to Tenderly's EVM ops)
type OperationType = "CALL" | "EVENT" | "WRITE" | "READ" | "ENTRY";

const OPERATION_COLORS: Record<OperationType, { bg: string; text: string; border: string }> = {
  CALL: { bg: "bg-purple-500/20", text: "text-purple-400", border: "border-purple-500/30" },
  EVENT: { bg: "bg-blue-500/20", text: "text-blue-400", border: "border-blue-500/30" },
  WRITE: { bg: "bg-green-500/20", text: "text-green-400", border: "border-green-500/30" },
  READ: { bg: "bg-yellow-500/20", text: "text-yellow-400", border: "border-yellow-500/30" },
  ENTRY: { bg: "bg-primary/20", text: "text-primary", border: "border-primary/30" },
};

interface TracePanelProps {
  result: SimulationResult;
}

export function TracePanel({ result }: TracePanelProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [showEvents, setShowEvents] = useState(true);
  const [expandAll, setExpandAll] = useState(true);

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

  // Calculate statistics
  const stats = useMemo(() => {
    const countOps = (t: ExecutionTrace): { calls: number; events: number } => {
      let calls = 1;
      let events = t.events.length;
      t.children.forEach(child => {
        const childStats = countOps(child);
        calls += childStats.calls;
        events += childStats.events;
      });
      return { calls, events };
    };
    return countOps(trace);
  }, [trace]);

  return (
    <div className="p-6 space-y-4">
      {/* Header with stats */}
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-1">
            Execution Trace
          </h4>
          <p className="text-xs text-muted-foreground">
            Hierarchical view of function calls and events
          </p>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search trace..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-4 py-2 text-sm bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 w-48"
          />
        </div>
      </div>

      {/* Operation stats (like Tenderly's operation breakdown) */}
      <div className="flex flex-wrap gap-2">
        <OperationBadge type="ENTRY" count={1} />
        <OperationBadge type="CALL" count={stats.calls - 1} />
        <OperationBadge type="EVENT" count={stats.events} />
        <OperationBadge type="WRITE" count={result.changes.length} />

        <div className="flex-1" />

        {/* Toggle buttons */}
        <button
          onClick={() => setShowEvents(!showEvents)}
          className={clsx(
            "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5",
            showEvents
              ? "bg-blue-500/20 text-blue-400"
              : "bg-white/5 text-muted-foreground hover:bg-white/10"
          )}
        >
          <Activity className="w-3 h-3" />
          Events {showEvents ? "On" : "Off"}
        </button>

        <button
          onClick={() => setExpandAll(!expandAll)}
          className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white/5 text-muted-foreground hover:bg-white/10 transition-colors flex items-center gap-1.5"
        >
          <Layers className="w-3 h-3" />
          {expandAll ? "Collapse All" : "Expand All"}
        </button>
      </div>

      {/* Gas summary */}
      <div className="bg-black/40 rounded-lg border border-white/5 px-4 py-3 flex items-center gap-4">
        <Zap className="w-5 h-5 text-yellow-500" />
        <div>
          <p className="text-xs text-muted-foreground">Total Gas Used</p>
          <p className="font-mono font-semibold">{formatGas(result.gas_used)}</p>
        </div>
        <div className="flex-1" />
        <div className="text-right">
          <p className="text-xs text-muted-foreground">Gas Price</p>
          <p className="font-mono text-sm">{result.gas_unit_price} octas</p>
        </div>
      </div>

      {/* Trace tree */}
      <div className="bg-black/40 rounded-lg border border-white/5 overflow-hidden">
        <TraceNode
          trace={trace}
          depth={0}
          searchQuery={searchQuery}
          showEvents={showEvents}
          defaultExpanded={expandAll}
        />
      </div>
    </div>
  );
}

function OperationBadge({ type, count }: { type: OperationType; count: number }) {
  const colors = OPERATION_COLORS[type];
  if (count === 0) return null;

  return (
    <div className={clsx(
      "px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 border",
      colors.bg,
      colors.text,
      colors.border
    )}>
      {type === "CALL" && <Box className="w-3 h-3" />}
      {type === "EVENT" && <Activity className="w-3 h-3" />}
      {type === "WRITE" && <PenLine className="w-3 h-3" />}
      {type === "READ" && <Eye className="w-3 h-3" />}
      {type === "ENTRY" && <ArrowRight className="w-3 h-3" />}
      {type}
      <span className="font-mono">{count}</span>
    </div>
  );
}

interface TraceNodeProps {
  trace: ExecutionTrace;
  depth: number;
  searchQuery: string;
  showEvents: boolean;
  defaultExpanded: boolean;
}

function TraceNode({ trace, depth, searchQuery, showEvents, defaultExpanded }: TraceNodeProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [copied, setCopied] = useState(false);
  const hasChildren = trace.children.length > 0 || (showEvents && trace.events.length > 0);

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

  // Check if this node matches search
  const fullFunctionName = `${trace.module}::${trace.function}`;
  const matchesSearch = !searchQuery ||
    fullFunctionName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    trace.events.some(e => e.type.toLowerCase().includes(searchQuery.toLowerCase()));

  // If search is active and this node doesn't match, hide it (unless a child matches)
  const childMatchesSearch = trace.children.some(child => {
    const childFullName = `${child.module}::${child.function}`;
    return childFullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      child.events.some(e => e.type.toLowerCase().includes(searchQuery.toLowerCase()));
  });

  if (searchQuery && !matchesSearch && !childMatchesSearch) {
    return null;
  }

  const copyFunctionId = () => {
    navigator.clipboard.writeText(fullFunctionName);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Determine operation type for badge
  const opType: OperationType = depth === 0 ? "ENTRY" : "CALL";
  const opColors = OPERATION_COLORS[opType];

  return (
    <div>
      <div
        className={clsx(
          "flex items-center gap-2 px-4 py-3 hover:bg-white/5 transition-colors cursor-pointer border-b border-white/5 group",
          depth > 0 && "border-l-2 border-l-primary/30",
          searchQuery && matchesSearch && "bg-yellow-500/5"
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

        {/* Operation type badge (like Tenderly) */}
        <div className={clsx(
          "px-2 py-0.5 rounded text-xs font-bold",
          opColors.bg,
          opColors.text
        )}>
          {opType}
        </div>

        <Box className="w-4 h-4 text-primary" />

        <div className="flex-1 font-mono text-sm min-w-0">
          <span className="text-muted-foreground">{functionInfo.address}::</span>
          <span className="text-primary">{functionInfo.module}</span>
          <span className="text-muted-foreground">::</span>
          <span className="text-foreground font-semibold">{trace.function}</span>
        </div>

        {/* Copy button (appears on hover) */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            copyFunctionId();
          }}
          className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
        </button>

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
            <TraceNode
              key={i}
              trace={child}
              depth={depth + 1}
              searchQuery={searchQuery}
              showEvents={showEvents}
              defaultExpanded={defaultExpanded}
            />
          ))}

          {/* Events emitted at this level */}
          {showEvents && trace.events.length > 0 && (
            <div className="border-t border-white/5">
              {trace.events.map((event, i) => (
                <EventItem
                  key={i}
                  event={event}
                  depth={depth + 1}
                  searchQuery={searchQuery}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface EventItemProps {
  event: { type: string; data: Record<string, unknown> };
  depth: number;
  searchQuery: string;
}

function EventItem({ event, depth, searchQuery }: EventItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  // Parse event type
  const eventParts = event.type.split("::");
  const eventName = eventParts[eventParts.length - 1];
  const moduleInfo = eventParts.slice(0, -1).join("::");

  // Check if this event matches search
  const matchesSearch = !searchQuery ||
    event.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
    JSON.stringify(event.data).toLowerCase().includes(searchQuery.toLowerCase());

  if (searchQuery && !matchesSearch) {
    return null;
  }

  const copyEventType = () => {
    navigator.clipboard.writeText(event.type);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const eventColors = OPERATION_COLORS.EVENT;

  return (
    <div>
      <div
        className={clsx(
          "flex items-center gap-2 px-4 py-2 hover:bg-white/5 transition-colors cursor-pointer group",
          searchQuery && matchesSearch && "bg-yellow-500/5"
        )}
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

        {/* Operation type badge (like Tenderly) */}
        <div className={clsx(
          "px-2 py-0.5 rounded text-xs font-bold",
          eventColors.bg,
          eventColors.text
        )}>
          EVENT
        </div>

        <Activity className="w-4 h-4 text-blue-400" />

        <div className="flex-1 font-mono text-sm min-w-0">
          <span className="text-muted-foreground">{moduleInfo}::</span>
          <span className="text-blue-400 font-semibold">{eventName}</span>
        </div>

        {/* Copy button (appears on hover) */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            copyEventType();
          }}
          className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
        </button>
      </div>

      {isExpanded && (
        <div
          className="px-4 py-3 bg-black/40 border-y border-white/5"
          style={{ paddingLeft: `${40 + depth * 24}px` }}
        >
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs text-muted-foreground">Event Data</span>
            <button
              onClick={() => {
                navigator.clipboard.writeText(JSON.stringify(event.data, null, 2));
              }}
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
            >
              <Copy className="w-3 h-3" />
              Copy
            </button>
          </div>
          <pre className="text-xs font-mono text-muted-foreground overflow-x-auto">
            {JSON.stringify(event.data, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
