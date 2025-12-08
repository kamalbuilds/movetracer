import { NextRequest, NextResponse } from "next/server";

// Network configurations
const NETWORKS = {
  mainnet: "https://mainnet.movementnetwork.xyz/v1",
  testnet: "https://testnet.movementnetwork.xyz/v1",
  devnet: "https://devnet.movementnetwork.xyz/v1",
};

type NetworkType = keyof typeof NETWORKS;

// Helper to format address
function formatAddress(address: string): string {
  if (!address) return "";
  if (address.startsWith("0x")) return address;
  return `0x${address}`;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get("address");
    const network = (searchParams.get("network") || "testnet") as NetworkType;

    if (!address) {
      return NextResponse.json(
        { error: "Missing required parameter: address" },
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

    const formattedAddress = formatAddress(address);

    // Fetch account info
    const accountResponse = await fetch(
      `${networkUrl}/accounts/${formattedAddress}`
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
      const resourcesResponse = await fetch(
        `${networkUrl}/accounts/${formattedAddress}/resources`
      );

      if (resourcesResponse.ok) {
        resources = await resourcesResponse.json();
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
