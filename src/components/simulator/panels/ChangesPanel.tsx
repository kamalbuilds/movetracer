"use client";

import { useState, useMemo } from "react";
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
  ArrowRight,
  Search,
  Filter,
  Copy,
  Check,
} from "lucide-react";
import { clsx } from "clsx";

interface ChangesPanelProps {
  result: SimulationResult;
}

export function ChangesPanel({ result }: ChangesPanelProps) {
  const { changes } = result;
  const [searchQuery, setSearchQuery] = useState("");
  const [showRawData, setShowRawData] = useState(false);

  if (changes.length === 0) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        No state changes in this transaction
      </div>
    );
  }

  // Group changes by address (like Tenderly)
  const changesByAddress = useMemo(() => {
    return changes.reduce((acc, change) => {
      const address = change.address;
      if (!acc[address]) {
        acc[address] = [];
      }
      acc[address].push(change);
      return acc;
    }, {} as Record<string, StateChange[]>);
  }, [changes]);

  // Filter changes by search query
  const filteredAddresses = useMemo(() => {
    if (!searchQuery) return Object.keys(changesByAddress);
    return Object.keys(changesByAddress).filter(addr =>
      addr.toLowerCase().includes(searchQuery.toLowerCase()) ||
      changesByAddress[addr].some(c =>
        c.data?.type?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    );
  }, [changesByAddress, searchQuery]);

  // Count by type for summary
  const typeCounts = useMemo(() => {
    return changes.reduce((acc, change) => {
      acc[change.type] = (acc[change.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }, [changes]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-1">
            State Changes
          </h4>
          <p className="text-xs text-muted-foreground">
            {changes.length} change{changes.length !== 1 ? "s" : ""} across {Object.keys(changesByAddress).length} address{Object.keys(changesByAddress).length !== 1 ? "es" : ""}
          </p>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Filter by address or type..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-4 py-2 text-sm bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 w-64"
          />
        </div>
      </div>

      {/* Summary badges */}
      <div className="flex flex-wrap gap-2">
        {Object.entries(typeCounts).map(([type, count]) => (
          <Badge
            key={type}
            variant={type.includes("delete") ? "error" : "success"}
            className="gap-1"
          >
            {getChangeIcon(type)}
            {formatChangeType(type)}: {count}
          </Badge>
        ))}
      </div>

      {/* Changes grouped by address */}
      <div className="space-y-4">
        {filteredAddresses.map((address) => (
          <AddressChanges
            key={address}
            address={address}
            changes={changesByAddress[address]}
            showRawData={showRawData}
          />
        ))}
      </div>
    </div>
  );
}

function AddressChanges({
  address,
  changes,
  showRawData
}: {
  address: string;
  changes: StateChange[];
  showRawData: boolean;
}) {
  const [isExpanded, setIsExpanded] = useState(true);

  // Get a display name for the address
  const getAddressName = () => {
    // Try to get module name from first change
    const firstChange = changes[0];
    if (firstChange.data?.type) {
      const parts = firstChange.data.type.split("::");
      if (parts.length >= 2) {
        return parts[1]; // Return module name
      }
    }
    return null;
  };

  const moduleName = getAddressName();

  return (
    <div className="rounded-lg border border-white/10 bg-black/20 overflow-hidden">
      {/* Address Header */}
      <div
        className="flex items-center gap-3 px-4 py-3 bg-white/5 cursor-pointer hover:bg-white/10 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <button className="w-5 h-5 flex items-center justify-center text-muted-foreground">
          {isExpanded ? (
            <ChevronDown className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
        </button>

        <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
          <Database className="w-4 h-4 text-primary" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {moduleName && (
              <span className="font-semibold text-primary">{moduleName}</span>
            )}
            <Badge variant="outline" className="text-xs">
              {changes.length} change{changes.length !== 1 ? "s" : ""}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground font-mono truncate">
            {address}
          </p>
        </div>
      </div>

      {/* Changes List */}
      {isExpanded && (
        <div className="border-t border-white/10 divide-y divide-white/5">
          {changes.map((change, i) => (
            <ChangeItem key={i} change={change} index={i} showRawData={showRawData} />
          ))}
        </div>
      )}
    </div>
  );
}

function ChangeItem({ change, index, showRawData }: { change: StateChange; index: number; showRawData: boolean }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
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
  const [showRaw, setShowRaw] = useState(false);

  return (
    <div className="p-3 space-y-2 max-h-[300px] overflow-auto">
      <div className="flex justify-end mb-2">
        <button
          onClick={() => setShowRaw(!showRaw)}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          {showRaw ? "Show formatted" : "Show raw JSON"}
        </button>
      </div>

      {showRaw ? (
        <pre className="text-xs font-mono text-muted-foreground whitespace-pre-wrap break-all">
          {JSON.stringify(data, null, 2)}
        </pre>
      ) : (
        Object.entries(data).map(([key, value]) => (
          <FieldValue key={key} fieldName={key} value={value} />
        ))
      )}
    </div>
  );
}

// Component to display a field with before→after if available
function FieldValue({ fieldName, value }: { fieldName: string; value: unknown }) {
  // For nested objects, show expandable
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    const entries = Object.entries(value as Record<string, unknown>);
    return (
      <div className="text-xs font-mono">
        <span className="text-primary font-semibold">{fieldName}:</span>
        <div className="ml-4 mt-1 space-y-1">
          {entries.map(([k, v]) => (
            <FieldValue key={k} fieldName={k} value={v} />
          ))}
        </div>
      </div>
    );
  }

  // Format the value nicely
  const formatFieldValue = (val: unknown): string => {
    if (typeof val === "string") {
      // Check if it's a number string
      if (/^\d+$/.test(val) && val.length > 6) {
        // Format large numbers
        const num = BigInt(val);
        return num.toLocaleString();
      }
      // Truncate long addresses/hashes
      if (val.length > 42 && val.startsWith("0x")) {
        return `${val.slice(0, 10)}...${val.slice(-8)}`;
      }
      return val;
    }
    if (Array.isArray(val)) {
      return `[${val.length} items]`;
    }
    return String(val);
  };

  return (
    <div className="flex items-center gap-2 text-xs font-mono">
      <Plus className="w-3 h-3 text-green-500 flex-shrink-0" />
      <span className="text-primary font-semibold">{fieldName}:</span>
      <span className="text-foreground break-all">
        {formatFieldValue(value)}
      </span>
    </div>
  );
}

// Component to show value changes with arrow
function ValueChange({ before, after, label }: { before?: string; after?: string; label: string }) {
  if (!before && !after) return null;

  const formatValue = (val: string) => {
    if (/^\d+$/.test(val) && val.length > 6) {
      try {
        return BigInt(val).toLocaleString();
      } catch {
        return val;
      }
    }
    return val;
  };

  return (
    <div className="flex items-center gap-2 text-xs font-mono py-1">
      <span className="text-muted-foreground min-w-[80px]">{label}:</span>
      {before && (
        <span className="text-red-400 line-through">{formatValue(before)}</span>
      )}
      {before && after && (
        <ArrowRight className="w-3 h-3 text-muted-foreground" />
      )}
      {after && (
        <span className="text-green-400">{formatValue(after)}</span>
      )}
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
