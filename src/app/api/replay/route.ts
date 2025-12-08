import { NextRequest, NextResponse } from "next/server";

// Network configurations
const NETWORKS = {
  mainnet: "https://mainnet.movementnetwork.xyz/v1",
  testnet: "https://testnet.movementnetwork.xyz/v1",
  devnet: "https://devnet.movementnetwork.xyz/v1",
};

type NetworkType = keyof typeof NETWORKS;

// Helper to generate mock keys for simulation
function generateMockPublicKey(): string {
  return "0x" + "0".repeat(64);
}

function generateMockSignature(): string {
  return "0x" + "0".repeat(128);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { hash, network = "testnet" } = body;

    if (!hash) {
      return NextResponse.json(
        { error: "Missing required field: hash" },
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

    // First, fetch the original transaction
    const txResponse = await fetch(`${networkUrl}/transactions/by_hash/${hash}`);

    if (!txResponse.ok) {
      const errorText = await txResponse.text();
      return NextResponse.json(
        { error: `Failed to fetch transaction: ${errorText}` },
        { status: txResponse.status }
      );
    }

    const txData = await txResponse.json();

    // Check if this is a user transaction with a payload we can replay
    if (txData.type !== "user_transaction" || !txData.payload) {
      return NextResponse.json(
        { error: "Transaction cannot be replayed. Only user transactions with payloads can be replayed." },
        { status: 400 }
      );
    }

    // Now simulate the transaction with the same payload
    const now = Math.floor(Date.now() / 1000);

    const simulationBody = {
      sender: txData.sender,
      sequence_number: "0", // Use 0 for simulation
      max_gas_amount: "2000000",
      gas_unit_price: txData.gas_unit_price || "100",
      expiration_timestamp_secs: String(now + 600),
      payload: txData.payload,
      signature: {
        type: "ed25519_signature",
        public_key: generateMockPublicKey(),
        signature: generateMockSignature(),
      },
    };

    const simResponse = await fetch(
      `${networkUrl}/transactions/simulate?estimate_gas_unit_price=true&estimate_max_gas_amount=true`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(simulationBody),
      }
    );

    if (!simResponse.ok) {
      const errorText = await simResponse.text();
      return NextResponse.json(
        { error: `Replay simulation failed: ${errorText}` },
        { status: simResponse.status }
      );
    }

    const simData = await simResponse.json();
    const result = Array.isArray(simData) ? simData[0] : simData;

    return NextResponse.json({
      // Original transaction info
      original: {
        version: txData.version,
        hash: txData.hash,
        success: txData.success,
        vm_status: txData.vm_status,
        gas_used: txData.gas_used,
        timestamp: txData.timestamp,
      },
      // Simulation result
      simulation: {
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
      },
    });
  } catch (error) {
    console.error("Replay error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
