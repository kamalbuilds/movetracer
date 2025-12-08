import { NextRequest, NextResponse } from "next/server";

// Network configurations
const NETWORKS = {
  mainnet: "https://mainnet.movementnetwork.xyz/v1",
  testnet: "https://testnet.movementnetwork.xyz/v1",
  devnet: "https://devnet.movementnetwork.xyz/v1",
};

type NetworkType = keyof typeof NETWORKS;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const hash = searchParams.get("hash");
    const network = (searchParams.get("network") || "testnet") as NetworkType;

    if (!hash) {
      return NextResponse.json(
        { error: "Missing required parameter: hash" },
        { status: 400 }
      );
    }

    const networkUrl = NETWORKS[network];
    if (!networkUrl) {
      return NextResponse.json(
        { error: `Invalid network: ${network}` },
        { status: 400 }
      );
    }

    const response = await fetch(`${networkUrl}/transactions/by_hash/${hash}`);

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
