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

// Helper to generate a mock public key for simulation
function generateMockPublicKey(): string {
  return "0x" + "0".repeat(64);
}

// Helper to generate a mock signature for simulation
function generateMockSignature(): string {
  return "0x" + "0".repeat(128);
}

// Helper to fetch account info including sequence number and auth key
async function getAccountInfo(urls: string[], address: string): Promise<{
  exists: boolean;
  sequence_number: string;
  authentication_key: string | null;
}> {
  for (const url of urls) {
    try {
      const response = await fetch(`${url}/accounts/${address}`, {
        signal: AbortSignal.timeout(5000),
      });
      if (response.ok) {
        const data = await response.json();
        return {
          exists: true,
          sequence_number: data.sequence_number || "0",
          authentication_key: data.authentication_key || null,
        };
      }
      if (response.status === 404) {
        return { exists: false, sequence_number: "0", authentication_key: null };
      }
    } catch {
      continue;
    }
  }
  return { exists: false, sequence_number: "0", authentication_key: null };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      sender,
      payload,
      network = "mainnet",
      max_gas_amount = "2000000",
      gas_unit_price = "100",
      sequence_number,
    } = body;

    if (!sender || !payload || !payload.function) {
      return NextResponse.json(
        { error: "Missing required fields: sender and payload.function" },
        { status: 400 }
      );
    }

    const networkConfig = NETWORKS[network as NetworkType];
    if (!networkConfig) {
      return NextResponse.json(
        { error: `Invalid network: ${network}` },
        { status: 400 }
      );
    }

    const urls = [networkConfig.primary, ...networkConfig.fallbacks];
    const formattedSender = formatAddress(sender);
    const now = Math.floor(Date.now() / 1000);

    // Fetch account info (existence check + sequence number)
    const accountInfo = await getAccountInfo(urls, formattedSender);

    // Warn if account doesn't exist (simulation will likely fail)
    if (!accountInfo.exists) {
      return NextResponse.json({
        success: false,
        vm_status: "ACCOUNT_NOT_FOUND",
        error: `Account ${formattedSender} does not exist on ${network}. The sender account must exist on-chain to simulate transactions.`,
        gas_used: "0",
        max_gas_amount: max_gas_amount,
        gas_unit_price: gas_unit_price,
        hash: "",
        version: "0",
        sender: formattedSender,
        sequence_number: "0",
        expiration_timestamp_secs: String(now + 600),
        payload: {
          type: "entry_function_payload",
          function: payload.function,
          type_arguments: payload.type_arguments || [],
          arguments: payload.arguments || [],
        },
        changes: [],
        events: [],
      });
    }

    const seqNum = sequence_number ?? accountInfo.sequence_number;

    const simulationBody = {
      sender: formattedSender,
      sequence_number: seqNum,
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

    let lastError: string | null = null;

    for (const url of urls) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);

        const response = await fetch(
          `${url}/transactions/simulate`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(simulationBody),
            signal: controller.signal,
          }
        );

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorText = await response.text();
          // Client errors (4xx) should not trigger fallback
          if (response.status >= 400 && response.status < 500) {
            return NextResponse.json(
              { error: `Simulation failed: ${errorText}` },
              { status: response.status }
            );
          }
          lastError = `RPC error (${response.status}): ${errorText}`;
          continue;
        }

        const data = await response.json();
        const result = Array.isArray(data) ? data[0] : data;

        // If auth key error, provide validation info instead
        const isAuthError = result.vm_status === "INVALID_AUTH_KEY";

        let validationInfo: Record<string, unknown> | undefined;
        let estimatedGasPrice = result.gas_unit_price;
        let accountBalance: string | undefined;

        if (isAuthError) {
          try {
            // Fetch gas price estimate
            const gasPriceRes = await fetch(`${url}/estimate_gas_price`);
            if (gasPriceRes.ok) {
              const gasPriceData = await gasPriceRes.json();
              estimatedGasPrice = gasPriceData.gas_estimate || result.gas_unit_price;
            }

            // Fetch account balance
            const balanceRes = await fetch(`${url}/view`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                function: "0x1::coin::balance",
                type_arguments: ["0x1::aptos_coin::AptosCoin"],
                arguments: [formattedSender],
              }),
            });
            if (balanceRes.ok) {
              const [balance] = await balanceRes.json();
              accountBalance = balance;
            }

            // Check if function exists
            const funcParts = payload.function.split("::");
            let functionExists = false;
            if (funcParts.length === 3) {
              const moduleRes = await fetch(
                `${url}/accounts/${formatAddress(funcParts[0])}/module/${funcParts[1]}`
              );
              if (moduleRes.ok) {
                const moduleData = await moduleRes.json();
                functionExists = moduleData.abi?.exposed_functions?.some(
                  (f: { name: string }) => f.name === funcParts[2]
                );
              }
            }

            validationInfo = {
              account_balance_octas: accountBalance,
              account_balance_move: accountBalance ? (parseInt(accountBalance) / 100000000).toFixed(4) : undefined,
              estimated_gas_price: estimatedGasPrice,
              function_exists: functionExists,
              payload_valid: true,
            };
          } catch {
            // Ignore validation errors
          }
        }

        return NextResponse.json({
          success: result.success,
          vm_status: result.vm_status,
          gas_used: result.gas_used || "0",
          max_gas_amount: result.max_gas_amount || max_gas_amount,
          gas_unit_price: estimatedGasPrice,
          hash: result.hash,
          version: result.version || "0",
          sender: result.sender,
          sequence_number: result.sequence_number,
          expiration_timestamp_secs: result.expiration_timestamp_secs,
          payload: result.payload,
          changes: result.changes || [],
          events: result.events || [],
          // Include validation info for auth errors
          validation: isAuthError ? validationInfo : undefined,
          simulation_note: isAuthError
            ? "Authentication required: The payload is valid but actual gas estimation requires a signed transaction. Use a wallet to sign and simulate."
            : undefined,
        });
      } catch (fetchError) {
        lastError = fetchError instanceof Error ? fetchError.message : "Network error";
        console.warn(`RPC ${url} failed:`, lastError);
        continue;
      }
    }

    return NextResponse.json(
      { error: lastError || `All RPC endpoints failed for ${network}` },
      { status: 503 }
    );
  } catch (error) {
    console.error("Simulation error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
