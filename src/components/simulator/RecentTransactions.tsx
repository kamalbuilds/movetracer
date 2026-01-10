"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useSimulatorStore } from "@/lib/store";
import {
  RefreshCw,
  ExternalLink,
  Clock,
  CheckCircle,
  XCircle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { clsx } from "clsx";

interface RecentTransaction {
  hash: string;
  sender: string;
  success: boolean;
  function: string;
  timestamp: string;
  gas_used: string;
}

export function RecentTransactions() {
  const { network, setTxHash, setInputMode } = useSimulatorStore();
  const [transactions, setTransactions] = useState<RecentTransaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  const fetchRecentTransactions = async () => {
    if (network !== "mainnet") {
      setTransactions([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        "https://mainnet.movementnetwork.xyz/v1/transactions?limit=50"
      );

      if (!response.ok) {
        throw new Error("Failed to fetch transactions");
      }

      const data = await response.json();

      // Filter for user transactions with payloads
      const userTxs: RecentTransaction[] = data
        .filter(
          (tx: any) =>
            tx.type === "user_transaction" &&
            tx.payload?.function
        )
        .slice(0, 10)
        .map((tx: any) => ({
          hash: tx.hash,
          sender: tx.sender,
          success: tx.success,
          function: tx.payload.function,
          timestamp: tx.timestamp,
          gas_used: tx.gas_used,
        }));

      setTransactions(userTxs);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (expanded && transactions.length === 0 && !loading) {
      fetchRecentTransactions();
    }
  }, [expanded, network]);

  const loadTransaction = (hash: string) => {
    setTxHash(hash);
    setInputMode("txhash");
  };

  const formatTimestamp = (ts: string) => {
    const date = new Date(parseInt(ts) / 1000);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    return `${Math.floor(mins / 60)}h ago`;
  };

  const getFunctionName = (func: string) => {
    const parts = func.split("::");
    return parts.length >= 3 ? `${parts[1]}::${parts[2]}` : func;
  };

  if (network !== "mainnet") {
    return null;
  }

  return (
    <div className="border-t border-white/5">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-2 text-sm">
          <Clock className="w-4 h-4 text-primary" />
          <span className="font-medium">Recent Mainnet Transactions</span>
          {transactions.length > 0 && (
            <Badge variant="outline" className="text-xs">
              {transactions.length}
            </Badge>
          )}
        </div>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        )}
      </button>

      {expanded && (
        <div className="border-t border-white/5">
          {loading ? (
            <div className="p-4 flex items-center justify-center">
              <RefreshCw className="w-4 h-4 animate-spin text-muted-foreground" />
              <span className="ml-2 text-sm text-muted-foreground">Loading...</span>
            </div>
          ) : error ? (
            <div className="p-4 text-center">
              <p className="text-sm text-muted-foreground mb-2">{error}</p>
              <Button size="sm" variant="outline" onClick={fetchRecentTransactions}>
                <RefreshCw className="w-3 h-3 mr-2" />
                Retry
              </Button>
            </div>
          ) : transactions.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              No recent user transactions found
            </div>
          ) : (
            <div className="max-h-[250px] overflow-auto">
              {transactions.map((tx) => (
                <button
                  key={tx.hash}
                  onClick={() => loadTransaction(tx.hash)}
                  className="w-full px-4 py-2 flex items-center gap-3 hover:bg-white/5 transition-colors text-left border-b border-white/5 last:border-b-0"
                >
                  <div
                    className={clsx(
                      "w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0",
                      tx.success ? "bg-green-500/20" : "bg-red-500/20"
                    )}
                  >
                    {tx.success ? (
                      <CheckCircle className="w-3 h-3 text-green-500" />
                    ) : (
                      <XCircle className="w-3 h-3 text-red-500" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-mono truncate">
                      {getFunctionName(tx.function)}
                    </p>
                    <p className="text-[10px] text-muted-foreground truncate">
                      {tx.sender}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-[10px] text-muted-foreground">
                      {formatTimestamp(tx.timestamp)}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      Gas: {tx.gas_used}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}

          <div className="p-2 border-t border-white/5">
            <Button
              size="sm"
              variant="ghost"
              className="w-full text-xs"
              onClick={fetchRecentTransactions}
              disabled={loading}
            >
              <RefreshCw className={clsx("w-3 h-3 mr-2", loading && "animate-spin")} />
              Refresh
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
