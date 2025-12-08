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

// Helper to generate a mock public key for simulation
function generateMockPublicKey(): string {
  return "0x" + "0".repeat(64);
}

// Helper to generate a mock signature for simulation
function generateMockSignature(): string {
  return "0x" + "0".repeat(128);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      sender,
      payload,
      network = "testnet",
      max_gas_amount = "2000000",
      gas_unit_price = "100",
      sequence_number = "0",
    } = body;

    if (!sender || !payload || !payload.function) {
      return NextResponse.json(
        { error: "Missing required fields: sender and payload.function" },
        { status: 400 }
      );
    }

    const networkUrl = NETWORKS[network as NetworkType];
    if (!networkUrl) {
      return NextResponse.json(
        { error: `Invalid network: ${network}` },
        { status: 400 }
      );
    }

    const now = Math.floor(Date.now() / 1000);

    const simulationBody = {
      sender: formatAddress(sender),
      sequence_number: sequence_number,
      max_gas_amount: max_gas_amount,
      gas_unit_price: gas_unit_price,
      expiration_timestamp_secs: String(now + 600),
      payload: {
        type: "entry_function_payload",
        function: payload.function,
        type_arguments: payload.type_arguments || [],
        arguments: payload.arguments || [],
      },
      signature: {
        type: "ed25519_signature",
        public_key: generateMockPublicKey(),
        signature: generateMockSignature(),
      },
    };

    const response = await fetch(
      `${networkUrl}/transactions/simulate?estimate_gas_unit_price=true&estimate_max_gas_amount=true`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(simulationBody),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: `Simulation failed: ${errorText}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    const result = Array.isArray(data) ? data[0] : data;

    return NextResponse.json({
      success: result.success,
      vm_status: result.vm_status,
      gas_used: result.gas_used,
      max_gas_amount: result.max_gas_amount,
      gas_unit_price: result.gas_unit_price,
      hash: result.hash,
      version: result.version || "0",
      sender: result.sender,
      sequence_number: result.sequence_number,
      expiration_timestamp_secs: result.expiration_timestamp_secs,
      payload: result.payload,
      changes: result.changes || [],
      events: result.events || [],
    });
  } catch (error) {
    console.error("Simulation error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
