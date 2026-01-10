"use client";

import { useState, useMemo } from "react";
import { SimulationResult, TransactionEvent } from "@/types";
import { Badge } from "@/components/ui/badge";
import {
  ChevronRight,
  ChevronDown,
  Activity,
  Copy,
  Check,
  Search,
  Filter,
} from "lucide-react";
import { clsx } from "clsx";

interface EventsPanelProps {
  result: SimulationResult;
}

export function EventsPanel({ result }: EventsPanelProps) {
  const { events } = result;
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<string>("all");

  if (events.length === 0) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        No events emitted in this transaction
      </div>
    );
  }

  // Group events by type
  const eventsByType = useMemo(() => {
    return events.reduce((acc, event) => {
      const type = event.type;
      if (!acc[type]) {
        acc[type] = [];
      }
      acc[type].push(event);
      return acc;
    }, {} as Record<string, TransactionEvent[]>);
  }, [events]);

  // Get unique event types for filter dropdown
  const eventTypes = useMemo(() => {
    return Object.keys(eventsByType).map(type => ({
      value: type,
      label: type.split("::").pop() || type,
      count: eventsByType[type].length
    }));
  }, [eventsByType]);

  // Filter events based on search and type
  const filteredEvents = useMemo(() => {
    return events.filter(event => {
      // Type filter
      if (selectedType !== "all" && event.type !== selectedType) {
        return false;
      }
      // Search filter
      if (searchQuery) {
        const searchLower = searchQuery.toLowerCase();
        const eventName = event.type.toLowerCase();
        const dataStr = JSON.stringify(event.data).toLowerCase();
        return eventName.includes(searchLower) || dataStr.includes(searchLower);
      }
      return true;
    });
  }, [events, selectedType, searchQuery]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-1">
            Events Emitted
          </h4>
          <p className="text-xs text-muted-foreground">
            {filteredEvents.length} of {events.length} event{events.length !== 1 ? "s" : ""}
          </p>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3">
          {/* Type filter dropdown */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="pl-9 pr-8 py-2 text-sm bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 appearance-none cursor-pointer"
            >
              <option value="all">All Events ({events.length})</option>
              {eventTypes.map(({ value, label, count }) => (
                <option key={value} value={value}>
                  {label} ({count})
                </option>
              ))}
            </select>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search events..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 text-sm bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 w-48"
            />
          </div>
        </div>
      </div>

      {/* Event type summary - clickable badges */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setSelectedType("all")}
          className={clsx(
            "px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
            selectedType === "all"
              ? "bg-primary text-primary-foreground"
              : "bg-white/5 text-muted-foreground hover:bg-white/10"
          )}
        >
          All ({events.length})
        </button>
        {eventTypes.map(({ value, label, count }) => (
          <button
            key={value}
            onClick={() => setSelectedType(value)}
            className={clsx(
              "px-3 py-1.5 rounded-full text-xs font-medium transition-colors flex items-center gap-1",
              selectedType === value
                ? "bg-blue-500 text-white"
                : "bg-blue-500/10 text-blue-400 hover:bg-blue-500/20"
            )}
          >
            <Activity className="w-3 h-3" />
            {label} ({count})
          </button>
        ))}
      </div>

      {/* Event list */}
      <div className="space-y-3">
        {filteredEvents.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No events match your filter
          </div>
        ) : (
          filteredEvents.map((event, i) => (
            <EventItem key={`${event.type}-${i}`} event={event} index={i} />
          ))
        )}
      </div>
    </div>
  );
}

function EventItem({ event, index }: { event: TransactionEvent; index: number }) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [copied, setCopied] = useState(false);

  const eventParts = event.type.split("::");
  const eventName = eventParts[eventParts.length - 1];
  const modulePath = eventParts.slice(0, -1).join("::");

  const copyEventData = () => {
    navigator.clipboard.writeText(JSON.stringify(event.data, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-lg border border-blue-500/30 bg-blue-500/5 overflow-hidden">
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

        <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
          <Activity className="w-4 h-4 text-blue-400" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm font-semibold text-blue-400">
              {eventName}
            </span>
            <Badge variant="outline" className="text-xs">
              #{event.sequence_number}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground font-mono truncate">
            {modulePath}
          </p>
        </div>

        <div className="text-xs text-muted-foreground">
          Event #{index + 1}
        </div>
      </div>

      {isExpanded && (
        <div className="border-t border-white/10 bg-black/40">
          <div className="p-4 space-y-4">
            {/* Event metadata */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Account</p>
                <code className="text-xs font-mono bg-white/5 px-2 py-1 rounded block truncate">
                  {event.guid.account_address}
                </code>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Creation Number</p>
                <code className="text-xs font-mono bg-white/5 px-2 py-1 rounded block">
                  {event.guid.creation_number}
                </code>
              </div>
            </div>

            {/* Event data */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-muted-foreground">Event Data</p>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    copyEventData();
                  }}
                  className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
                >
                  {copied ? (
                    <>
                      <Check className="w-3 h-3 text-green-500" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      Copy
                    </>
                  )}
                </button>
              </div>
              <div className="bg-black/40 rounded border border-white/10 overflow-hidden">
                <EventDataDisplay data={event.data} />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function EventDataDisplay({ data }: { data: Record<string, unknown> }) {
  const entries = Object.entries(data);

  if (entries.length === 0) {
    return (
      <div className="p-3 text-xs text-muted-foreground italic">
        No data
      </div>
    );
  }

  return (
    <div className="p-3 space-y-2 max-h-[200px] overflow-auto">
      {entries.map(([key, value]) => (
        <div key={key} className="flex items-start gap-2 text-xs font-mono">
          <span className="text-primary font-semibold">{key}:</span>
          <span className="text-foreground break-all">
            {formatValue(value)}
          </span>
        </div>
      ))}
    </div>
  );
}

function formatValue(value: unknown): string {
  if (typeof value === "object" && value !== null) {
    return JSON.stringify(value, null, 2);
  }
  return String(value);
}
