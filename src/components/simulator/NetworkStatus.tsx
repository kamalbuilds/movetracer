"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Tooltip } from "@/components/ui/tooltip";
import { Wifi, WifiOff, Activity, RefreshCw } from "lucide-react";
import { clsx } from "clsx";

interface NetworkHealth {
  status: "online" | "offline" | "degraded" | "checking";
  latency: number | null;
  blockHeight: string | null;
  lastChecked: Date | null;
}

interface NetworkStatusProps {
  network: string;
}

const NETWORK_URLS: Record<string, string> = {
  mainnet: "https://mainnet.movementnetwork.xyz/v1",
  testnet: "https://testnet.movementnetwork.xyz/v1",
  devnet: "https://devnet.movementnetwork.xyz/v1",
};

export function NetworkStatus({ network }: NetworkStatusProps) {
  const [health, setHealth] = useState<NetworkHealth>({
    status: "checking",
    latency: null,
    blockHeight: null,
    lastChecked: null,
  });

  const checkHealth = async () => {
    setHealth((prev) => ({ ...prev, status: "checking" }));

    const url = NETWORK_URLS[network];
    if (!url) {
      setHealth({
        status: "offline",
        latency: null,
        blockHeight: null,
        lastChecked: new Date(),
      });
      return;
    }

    const start = Date.now();

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(url, {
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const latency = Date.now() - start;

      if (!response.ok) {
        setHealth({
          status: "degraded",
          latency,
          blockHeight: null,
          lastChecked: new Date(),
        });
        return;
      }

      const data = await response.json();

      setHealth({
        status: "online",
        latency,
        blockHeight: data.block_height || null,
        lastChecked: new Date(),
      });
    } catch {
      setHealth({
        status: "offline",
        latency: null,
        blockHeight: null,
        lastChecked: new Date(),
      });
    }
  };

  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, [network]);

  const statusConfig = {
    online: {
      color: "text-green-500",
      bgColor: "bg-green-500",
      icon: Wifi,
      label: "Online",
    },
    offline: {
      color: "text-red-500",
      bgColor: "bg-red-500",
      icon: WifiOff,
      label: "Offline",
    },
    degraded: {
      color: "text-yellow-500",
      bgColor: "bg-yellow-500",
      icon: Activity,
      label: "Degraded",
    },
    checking: {
      color: "text-muted-foreground",
      bgColor: "bg-muted-foreground",
      icon: RefreshCw,
      label: "Checking",
    },
  };

  const config = statusConfig[health.status];
  const Icon = config.icon;

  return (
    <Tooltip
      content={
        <div className="text-xs space-y-1">
          <div className="font-semibold">{network.charAt(0).toUpperCase() + network.slice(1)} Network</div>
          <div>Status: {config.label}</div>
          {health.latency !== null && <div>Latency: {health.latency}ms</div>}
          {health.blockHeight && <div>Block: #{health.blockHeight}</div>}
          {health.lastChecked && (
            <div>Checked: {health.lastChecked.toLocaleTimeString()}</div>
          )}
        </div>
      }
    >
      <div
        className={clsx(
          "flex items-center gap-2 px-2 py-1 rounded-full cursor-pointer hover:bg-white/5 transition-colors",
          health.status === "checking" && "animate-pulse"
        )}
        onClick={checkHealth}
      >
        <div className={clsx("w-2 h-2 rounded-full", config.bgColor)} />
        <Icon className={clsx("w-3.5 h-3.5", config.color, health.status === "checking" && "animate-spin")} />
        {health.latency !== null && (
          <span className="text-xs text-muted-foreground">{health.latency}ms</span>
        )}
      </div>
    </Tooltip>
  );
}
