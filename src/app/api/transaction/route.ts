import { NextRequest, NextResponse } from "next/server";

// Network configurations with fallback RPCs
const NETWORKS: Record<string, { primary: string; fallbacks: string[] }> = {
  mainnet: {
    primary: "https://mainnet.movementnetwork.xyz/v1",
    fallbacks: [
      "https://rpc.sentio.xyz/movement/v1",
      "https://movement.blockpi.network/rpc/v1/public/v1",
      "https://rpc.ankr.com/http/movement_mainnet/v1",
    ],
  },
  testnet: {
    primary: "https://testnet.movementnetwork.xyz/v1",
    fallbacks: [],
  },
  devnet: {
    primary: "https://devnet.movementnetwork.xyz/v1",
    fallbacks: [],
  },
};

type NetworkType = keyof typeof NETWORKS;

// Helper to fetch with fallback
async function fetchWithFallback(
  urls: string[],
  path: string,
  options?: RequestInit
): Promise<Response> {
  let lastError: Error | null = null;

  for (const url of urls) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(`${url}${path}`, {
        ...options,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok || (response.status >= 400 && response.status < 500)) {
        return response;
      }

      lastError = new Error(`RPC error: ${response.status}`);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      continue;
    }
  }

  throw lastError || new Error("All RPC endpoints failed");
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const hash = searchParams.get("hash");
    const network = (searchParams.get("network") || "mainnet") as NetworkType;

    if (!hash) {
      return NextResponse.json(
        { error: "Missing required parameter: hash" },
        { status: 400 }
      );
    }

    const networkConfig = NETWORKS[network];
    if (!networkConfig) {
      return NextResponse.json(
        { error: `Invalid network: ${network}` },
        { status: 400 }
      );
    }

    const urls = [networkConfig.primary, ...networkConfig.fallbacks];

    const response = await fetchWithFallback(urls, `/transactions/by_hash/${hash}`);

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: `Failed to fetch transaction: ${errorText}` },
        { status: response.status }
      );
    }

    const data = await response.json();

    return NextResponse.json({
      version: data.version,
      hash: data.hash,
      type: data.type,
      success: data.success,
      vm_status: data.vm_status,
      sender: data.sender,
      gas_used: data.gas_used,
      gas_unit_price: data.gas_unit_price,
      timestamp: data.timestamp,
      payload: data.payload,
      changes: data.changes || [],
      events: data.events || [],
    });
  } catch (error) {
    console.error("Transaction fetch error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
