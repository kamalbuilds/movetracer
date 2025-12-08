import {
  SimulationResult,
  SimulationRequest,
  TransactionInfo,
  NetworkType,
  NetworkConfig,
  StateChange,
  TransactionEvent,
  BalanceChange,
  ExecutionTrace,
  GasBreakdown,
  ModuleABI,
  EntryFunctionPayload,
} from "@/types";

// Network configurations
export const NETWORKS: Record<NetworkType, NetworkConfig> = {
  mainnet: {
    name: "Movement Mainnet",
    fullnode: "https://mainnet.movementnetwork.xyz/v1",
    indexer: "https://indexer.mainnet.movementnetwork.xyz/v1",
  },
  testnet: {
    name: "Movement Testnet",
    fullnode: "https://testnet.movementnetwork.xyz/v1",
    indexer: "https://indexer.testnet.movementnetwork.xyz/v1",
    faucet: "https://faucet.testnet.movementnetwork.xyz",
  },
  devnet: {
    name: "Movement Devnet",
    fullnode: "https://devnet.movementnetwork.xyz/v1",
  },
};

// Get network config
export function getNetworkConfig(network: NetworkType): NetworkConfig {
  return NETWORKS[network];
}

// Helper to format address
function formatAddress(address: string): string {
  if (!address) return "";
  if (address.startsWith("0x")) return address;
  return `0x${address}`;
}

// Helper to generate a mock public key for simulation
function generateMockPublicKey(): string {
  // Ed25519 public key (32 bytes = 64 hex chars)
  return "0x" + "0".repeat(64);
}

// Helper to generate a mock signature for simulation
function generateMockSignature(): string {
  // Ed25519 signature (64 bytes = 128 hex chars)
  return "0x" + "0".repeat(128);
}

// Build the simulation request body
function buildSimulationBody(request: SimulationRequest): object {
  const now = Math.floor(Date.now() / 1000);

  return {
    sender: formatAddress(request.sender),
    sequence_number: request.sequence_number || "0",
    max_gas_amount: request.max_gas_amount || "2000000",
    gas_unit_price: request.gas_unit_price || "100",
    expiration_timestamp_secs: request.expiration_timestamp_secs || String(now + 600),
    payload: {
      type: "entry_function_payload",
      function: request.payload.function,
      type_arguments: request.payload.type_arguments || [],
      arguments: request.payload.arguments || [],
    },
    signature: {
      type: "ed25519_signature",
      public_key: generateMockPublicKey(),
      signature: generateMockSignature(),
    },
  };
}

// Simulate a transaction
export async function simulateTransaction(
  request: SimulationRequest,
  network: NetworkType = "testnet"
): Promise<SimulationResult> {
  const config = getNetworkConfig(network);
  const body = buildSimulationBody(request);

  try {
    const response = await fetch(
      `${config.fullnode}/transactions/simulate?estimate_gas_unit_price=true&estimate_max_gas_amount=true`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Simulation failed: ${errorText}`);
    }

    const data = await response.json();

    // The API returns an array, take the first result
    const result = Array.isArray(data) ? data[0] : data;

    return {
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
    };
  } catch (error) {
    console.error("Simulation error:", error);
    throw error;
  }
}

// Get transaction by hash
export async function getTransactionByHash(
  hash: string,
  network: NetworkType = "testnet"
): Promise<TransactionInfo> {
  const config = getNetworkConfig(network);

  const response = await fetch(`${config.fullnode}/transactions/by_hash/${hash}`);

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to fetch transaction: ${errorText}`);
  }

  const data = await response.json();

  return {
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
  };
}

// Get account resources
export async function getAccountResources(
  address: string,
  network: NetworkType = "testnet"
): Promise<Record<string, unknown>[]> {
  const config = getNetworkConfig(network);

  const response = await fetch(
    `${config.fullnode}/accounts/${formatAddress(address)}/resources`
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch resources: ${await response.text()}`);
  }

  return response.json();
}

// Get account module ABI
export async function getModuleABI(
  address: string,
  moduleName: string,
  network: NetworkType = "testnet"
): Promise<ModuleABI> {
  const config = getNetworkConfig(network);

  const response = await fetch(
    `${config.fullnode}/accounts/${formatAddress(address)}/module/${moduleName}`
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch module: ${await response.text()}`);
  }

  const data = await response.json();
  return data.abi;
}

// Get account sequence number
export async function getAccountSequenceNumber(
  address: string,
  network: NetworkType = "testnet"
): Promise<string> {
  const config = getNetworkConfig(network);

  const response = await fetch(
    `${config.fullnode}/accounts/${formatAddress(address)}`
  );

  if (!response.ok) {
    // Account might not exist, return 0
    return "0";
  }

  const data = await response.json();
  return data.sequence_number;
}

// Parse function identifier
export function parseFunctionId(functionId: string): {
  address: string;
  module: string;
  function: string;
} {
  const parts = functionId.split("::");
  if (parts.length !== 3) {
    throw new Error(`Invalid function ID: ${functionId}`);
  }
  return {
    address: parts[0],
    module: parts[1],
    function: parts[2],
  };
}

// Extract balance changes from state changes
export function extractBalanceChanges(
  changes: StateChange[],
  sender: string
): BalanceChange[] {
  const balanceChanges: BalanceChange[] = [];
  const coinStorePattern = /0x1::coin::CoinStore<(.+)>/;

  for (const change of changes) {
    if (change.type === "write_resource" && change.data) {
      const match = change.data.type.match(coinStorePattern);
      if (match) {
        const coinType = match[1];
        const coinSymbol = extractCoinSymbol(coinType);
        const coinData = change.data.data as { coin?: { value?: string } };

        if (coinData.coin?.value) {
          const newValue = coinData.coin.value;
          // We don't have the "before" value in simulation, so we show the new state
          balanceChanges.push({
            address: change.address,
            coin_type: coinType,
            coin_symbol: coinSymbol,
            before: "0", // Would need state diff for actual before value
            after: newValue,
            change: newValue,
            direction: change.address === sender ? "outflow" : "inflow",
          });
        }
      }
    }
  }

  return balanceChanges;
}

// Extract coin symbol from type
function extractCoinSymbol(coinType: string): string {
  const parts = coinType.split("::");
  if (parts.length >= 3) {
    return parts[parts.length - 1];
  }
  return coinType;
}

// Build execution trace from events and changes
export function buildExecutionTrace(
  payload: EntryFunctionPayload,
  events: TransactionEvent[],
  gasUsed: string
): ExecutionTrace {
  const { address, module, function: funcName } = parseFunctionId(payload.function);

  const trace: ExecutionTrace = {
    function: funcName,
    module: `${address}::${module}`,
    type_arguments: payload.type_arguments,
    arguments: payload.arguments,
    gas_used: parseInt(gasUsed),
    depth: 0,
    children: [],
    events: events,
  };

  // In a real implementation, we'd parse the execution trace from the VM
  // For now, we infer child calls from events
  const eventsByType = groupEventsByModule(events);

  for (const [moduleAddr, moduleEvents] of Object.entries(eventsByType)) {
    if (moduleAddr !== `${address}::${module}` && moduleEvents.length > 0) {
      trace.children.push({
        function: "called_function",
        module: moduleAddr,
        type_arguments: [],
        arguments: [],
        gas_used: Math.floor(parseInt(gasUsed) / (Object.keys(eventsByType).length + 1)),
        depth: 1,
        children: [],
        events: moduleEvents,
      });
    }
  }

  return trace;
}

// Group events by module
function groupEventsByModule(
  events: TransactionEvent[]
): Record<string, TransactionEvent[]> {
  const grouped: Record<string, TransactionEvent[]> = {};

  for (const event of events) {
    const typeParts = event.type.split("::");
    if (typeParts.length >= 2) {
      const moduleAddr = `${typeParts[0]}::${typeParts[1]}`;
      if (!grouped[moduleAddr]) {
        grouped[moduleAddr] = [];
      }
      grouped[moduleAddr].push(event);
    }
  }

  return grouped;
}

// Build gas breakdown for flamegraph
export function buildGasBreakdown(
  trace: ExecutionTrace,
  totalGas: number
): GasBreakdown {
  const percentage = totalGas > 0 ? (trace.gas_used / totalGas) * 100 : 0;

  return {
    function: `${trace.module}::${trace.function}`,
    gas_used: trace.gas_used,
    percentage,
    children: trace.children.map((child) =>
      buildGasBreakdown(child, totalGas)
    ),
  };
}

// Format gas to human readable
export function formatGas(gas: string | number): string {
  const gasNum = typeof gas === "string" ? parseInt(gas) : gas;
  if (gasNum >= 1000000) {
    return `${(gasNum / 1000000).toFixed(2)}M`;
  }
  if (gasNum >= 1000) {
    return `${(gasNum / 1000).toFixed(2)}K`;
  }
  return gasNum.toString();
}

// Format MOVE amount (8 decimals)
export function formatMoveAmount(amount: string | number): string {
  const amountNum = typeof amount === "string" ? parseFloat(amount) : amount;
  const moveAmount = amountNum / 100000000; // 8 decimals
  return moveAmount.toFixed(4);
}

// Calculate gas cost in MOVE
export function calculateGasCost(gasUsed: string, gasPrice: string): string {
  const used = BigInt(gasUsed);
  const price = BigInt(gasPrice);
  const cost = used * price;
  return formatMoveAmount(cost.toString());
}
