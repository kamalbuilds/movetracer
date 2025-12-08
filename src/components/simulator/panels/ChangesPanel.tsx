"use client";

import { useState } from "react";
import { SimulationResult, StateChange } from "@/types";
import { Badge } from "@/components/ui/badge";
import {
  ChevronRight,
  ChevronDown,
  Plus,
  Minus,
  Edit3,
  Database,
  Layers,
  Table,
  Trash2,
} from "lucide-react";
import { clsx } from "clsx";

interface ChangesPanelProps {
  result: SimulationResult;
}

export function ChangesPanel({ result }: ChangesPanelProps) {
  const { changes } = result;

  if (changes.length === 0) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        No state changes in this transaction
      </div>
    );
  }

  // Group changes by type
  const groupedChanges = changes.reduce((acc, change) => {
    const type = change.type;
    if (!acc[type]) {
      acc[type] = [];
    }
    acc[type].push(change);
    return acc;
  }, {} as Record<string, StateChange[]>);

  return (
    <div className="p-6 space-y-6">
      <div className="mb-4">
        <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">
          State Changes
        </h4>
        <p className="text-xs text-muted-foreground">
          Resources and table items modified by this transaction
        </p>
      </div>

      {/* Summary */}
      <div className="flex flex-wrap gap-2">
        {Object.entries(groupedChanges).map(([type, items]) => (
          <Badge
            key={type}
            variant={type.includes("delete") ? "error" : "success"}
            className="gap-1"
          >
            {getChangeIcon(type)}
            {formatChangeType(type)}: {items.length}
          </Badge>
        ))}
      </div>

      {/* Change List */}
      <div className="space-y-3">
        {changes.map((change, i) => (
          <ChangeItem key={i} change={change} index={i} />
        ))}
      </div>
    </div>
  );
}

function ChangeItem({ change, index }: { change: StateChange; index: number }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const isDelete = change.type.includes("delete");
  const isTableItem = change.type.includes("table_item");

  const getResourceName = () => {
    if (change.data?.type) {
      const parts = change.data.type.split("::");
      return parts[parts.length - 1];
    }
    if (isTableItem) {
      return "TableItem";
    }
    return "Unknown";
  };

  const getModulePath = () => {
    if (change.data?.type) {
      const parts = change.data.type.split("::");
      if (parts.length >= 2) {
        return `${parts[0]}::${parts[1]}`;
      }
    }
    return change.address;
  };

  return (
    <div
      className={clsx(
        "rounded-lg border overflow-hidden",
        isDelete ? "border-red-500/30 bg-red-500/5" : "border-green-500/30 bg-green-500/5"
      )}
    >
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-white/5 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <button className="w-5 h-5 flex items-center justify-center text-muted-foreground">
          {isExpanded ? (
            <ChevronDown className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
        </button>

        <div
          className={clsx(
            "w-8 h-8 rounded-lg flex items-center justify-center",
            isDelete ? "bg-red-500/20" : "bg-green-500/20"
          )}
        >
          {isDelete ? (
            <Trash2 className="w-4 h-4 text-red-500" />
          ) : isTableItem ? (
            <Table className="w-4 h-4 text-green-500" />
          ) : (
            <Layers className="w-4 h-4 text-green-500" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Badge
              variant={isDelete ? "error" : "success"}
              className="text-xs uppercase"
            >
              {formatChangeType(change.type)}
            </Badge>
            <span className="font-mono text-sm font-semibold truncate">
              {getResourceName()}
            </span>
          </div>
          <p className="text-xs text-muted-foreground font-mono truncate">
            {getModulePath()}
          </p>
        </div>

        <div className="text-xs text-muted-foreground font-mono">
          #{index + 1}
        </div>
      </div>

      {isExpanded && (
        <div className="border-t border-white/10 bg-black/40">
          <div className="p-4 space-y-4">
            {/* Address */}
            <div>
              <p className="text-xs text-muted-foreground mb-1">Address</p>
              <code className="text-xs font-mono bg-white/5 px-2 py-1 rounded block truncate">
                {change.address}
              </code>
            </div>

            {/* Table Item specific fields */}
            {isTableItem && change.handle && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Table Handle</p>
                <code className="text-xs font-mono bg-white/5 px-2 py-1 rounded block truncate">
                  {change.handle}
                </code>
              </div>
            )}

            {isTableItem && change.key && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Key</p>
                <code className="text-xs font-mono bg-white/5 px-2 py-1 rounded block truncate">
                  {change.key}
                </code>
              </div>
            )}

            {/* Data */}
            {change.data && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">New State</p>
                <div className="bg-black/40 rounded border border-white/10 overflow-hidden">
                  <DataDiff data={change.data.data} />
                </div>
              </div>
            )}

            {isTableItem && change.value && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Value</p>
                <code className="text-xs font-mono bg-white/5 px-2 py-1 rounded block break-all">
                  {change.value}
                </code>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function DataDiff({ data }: { data: Record<string, unknown> }) {
  return (
    <div className="p-3 space-y-1 max-h-[300px] overflow-auto">
      {Object.entries(data).map(([key, value]) => (
        <div key={key} className="flex items-start gap-2 text-xs font-mono">
          <Plus className="w-3 h-3 text-green-500 flex-shrink-0 mt-0.5" />
          <span className="text-primary">{key}:</span>
          <span className="text-muted-foreground break-all">
            {typeof value === "object" ? JSON.stringify(value) : String(value)}
          </span>
        </div>
      ))}
    </div>
  );
}

function getChangeIcon(type: string) {
  if (type.includes("delete")) {
    return <Minus className="w-3 h-3" />;
  }
  if (type.includes("table")) {
    return <Table className="w-3 h-3" />;
  }
  return <Plus className="w-3 h-3" />;
}

function formatChangeType(type: string): string {
  const typeMap: Record<string, string> = {
    write_resource: "Write Resource",
    delete_resource: "Delete Resource",
    write_module: "Write Module",
    write_table_item: "Write Table",
    delete_table_item: "Delete Table",
  };
  return typeMap[type] || type;
}
