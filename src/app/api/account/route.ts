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

// Helper to format address
function formatAddress(address: string): string {
  if (!address) return "";
  if (address.startsWith("0x")) return address;
  return `0x${address}`;
}

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
    const address = searchParams.get("address");
    const network = (searchParams.get("network") || "mainnet") as NetworkType;

    if (!address) {
      return NextResponse.json(
        { error: "Missing required parameter: address" },
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
    const formattedAddress = formatAddress(address);

    // Fetch account info
    const accountResponse = await fetchWithFallback(
      urls,
      `/accounts/${formattedAddress}`
    );

    if (!accountResponse.ok) {
      // Account might not exist
      if (accountResponse.status === 404) {
        return NextResponse.json({
          exists: false,
          sequence_number: "0",
          authentication_key: null,
        });
      }
      const errorText = await accountResponse.text();
      return NextResponse.json(
        { error: `Failed to fetch account: ${errorText}` },
        { status: accountResponse.status }
      );
    }

    const accountData = await accountResponse.json();

    // Optionally fetch resources
    let resources = [];
    const includeResources = searchParams.get("resources") === "true";

    if (includeResources) {
      try {
        const resourcesResponse = await fetchWithFallback(
          urls,
          `/accounts/${formattedAddress}/resources`
        );

        if (resourcesResponse.ok) {
          resources = await resourcesResponse.json();
        }
      } catch {
        // Ignore resource fetch errors
      }
    }

    return NextResponse.json({
      exists: true,
      sequence_number: accountData.sequence_number,
      authentication_key: accountData.authentication_key,
      resources: includeResources ? resources : undefined,
    });
  } catch (error) {
    console.error("Account fetch error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
