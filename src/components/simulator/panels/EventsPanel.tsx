"use client";

import { useState } from "react";
import { SimulationResult, TransactionEvent } from "@/types";
import { Badge } from "@/components/ui/badge";
import {
  ChevronRight,
  ChevronDown,
  Activity,
  Copy,
  Check,
} from "lucide-react";
import { clsx } from "clsx";

interface EventsPanelProps {
  result: SimulationResult;
}

export function EventsPanel({ result }: EventsPanelProps) {
  const { events } = result;

  if (events.length === 0) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        No events emitted in this transaction
      </div>
    );
  }

  // Group events by type
  const eventsByType = events.reduce((acc, event) => {
    const type = event.type;
    if (!acc[type]) {
      acc[type] = [];
    }
    acc[type].push(event);
    return acc;
  }, {} as Record<string, TransactionEvent[]>);

  return (
    <div className="p-6 space-y-6">
      <div className="mb-4">
        <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">
          Events Emitted
        </h4>
        <p className="text-xs text-muted-foreground">
          {events.length} event{events.length !== 1 ? "s" : ""} emitted during execution
        </p>
      </div>

      {/* Event type summary */}
      <div className="flex flex-wrap gap-2">
        {Object.entries(eventsByType).map(([type, items]) => {
          const eventName = type.split("::").pop() || type;
          return (
            <Badge key={type} variant="info" className="gap-1">
              <Activity className="w-3 h-3" />
              {eventName}: {items.length}
            </Badge>
          );
        })}
      </div>

      {/* Event list */}
      <div className="space-y-3">
        {events.map((event, i) => (
          <EventItem key={i} event={event} index={i} />
        ))}
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
