import { NextRequest, NextResponse } from "next/server";

// Network configurations
const NETWORKS: Record<string, string> = {
  mainnet: "https://mainnet.movementnetwork.xyz/v1",
  testnet: "https://testnet.movementnetwork.xyz/v1",
  devnet: "https://devnet.movementnetwork.xyz/v1",
};

type NetworkType = keyof typeof NETWORKS;

function formatAddress(address: string): string {
  if (!address) return "";
  if (address.startsWith("0x")) return address;
  return `0x${address}`;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sender, payload, network = "mainnet" } = body;

    if (!sender || !payload?.function) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const baseUrl = NETWORKS[network as NetworkType];
    if (!baseUrl) {
      return NextResponse.json(
        { error: `Invalid network: ${network}` },
        { status: 400 }
      );
    }

    const formattedSender = formatAddress(sender);
    const validation: Record<string, unknown> = {
      valid: true,
      checks: {},
      warnings: [],
      info: {},
    };

    // Check 1: Account exists
    try {
      const accountRes = await fetch(`${baseUrl}/accounts/${formattedSender}`);
      if (accountRes.ok) {
        const accountData = await accountRes.json();
        validation.checks = {
          ...validation.checks as object,
          account_exists: true,
        };
        validation.info = {
          ...validation.info as object,
          sequence_number: accountData.sequence_number,
        };
      } else {
        validation.checks = { ...validation.checks as object, account_exists: false };
        (validation.warnings as string[]).push("Sender account does not exist on-chain");
        validation.valid = false;
      }
    } catch {
      validation.checks = { ...validation.checks as object, account_exists: "unknown" };
    }

    // Check 2: Account balance (for AptosCoin)
    try {
      const balanceRes = await fetch(`${baseUrl}/view`, {
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
        validation.info = {
          ...validation.info as object,
          balance_octas: balance,
          balance_move: (parseInt(balance) / 100000000).toFixed(8),
        };
        validation.checks = { ...validation.checks as object, has_balance: parseInt(balance) > 0 };
      }
    } catch {
      // Balance check failed
    }

    // Check 3: Function exists (try to get module ABI)
    try {
      const funcParts = payload.function.split("::");
      if (funcParts.length === 3) {
        const [moduleAddr, moduleName] = funcParts;
        const moduleRes = await fetch(
          `${baseUrl}/accounts/${formatAddress(moduleAddr)}/module/${moduleName}`
        );
        if (moduleRes.ok) {
          validation.checks = { ...validation.checks as object, module_exists: true };
          const moduleData = await moduleRes.json();
          const funcExists = moduleData.abi?.exposed_functions?.some(
            (f: { name: string }) => f.name === funcParts[2]
          );
          validation.checks = { ...validation.checks as object, function_exists: funcExists };
          if (!funcExists) {
            (validation.warnings as string[]).push(`Function '${funcParts[2]}' not found in module`);
            validation.valid = false;
          }
        } else {
          validation.checks = { ...validation.checks as object, module_exists: false };
          (validation.warnings as string[]).push("Module does not exist");
          validation.valid = false;
        }
      }
    } catch {
      validation.checks = { ...validation.checks as object, module_exists: "unknown" };
    }

    // Check 4: Gas price estimate
    try {
      const gasPriceRes = await fetch(`${baseUrl}/estimate_gas_price`);
      if (gasPriceRes.ok) {
        const gasPriceData = await gasPriceRes.json();
        validation.info = {
          ...validation.info as object,
          estimated_gas_price: gasPriceData.gas_estimate,
          prioritized_gas_price: gasPriceData.prioritized_gas_estimate,
        };
      }
    } catch {
      // Gas price fetch failed
    }

    // Check 5: Ledger info
    try {
      const ledgerRes = await fetch(baseUrl);
      if (ledgerRes.ok) {
        const ledgerData = await ledgerRes.json();
        validation.info = {
          ...validation.info as object,
          chain_id: ledgerData.chain_id,
          block_height: ledgerData.block_height,
        };
      }
    } catch {
      // Ledger info fetch failed
    }

    return NextResponse.json(validation);
  } catch (error) {
    console.error("Validation error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Validation failed" },
      { status: 500 }
    );
  }
}
