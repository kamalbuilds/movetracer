// Transaction payload types
export interface EntryFunctionPayload {
  function: string;
  type_arguments: string[];
  arguments: (string | number | boolean | object)[];
}

export interface TransactionPayload {
  type: "entry_function_payload" | "script_payload";
  function?: string;
  type_arguments?: string[];
  arguments?: (string | number | boolean | object)[];
  code?: {
    bytecode: string;
    abi?: ModuleABI;
  };
}

// Simulation result types
export interface SimulationResult {
  success: boolean;
  vm_status: string;
  gas_used: string;
  max_gas_amount: string;
  gas_unit_price: string;
  hash: string;
  version: string;
  sender: string;
  sequence_number: string;
  expiration_timestamp_secs: string;
  payload: TransactionPayload;
  changes: StateChange[];
  events: TransactionEvent[];
  timestamp?: string;
}

// State change types
export interface StateChange {
  type: "write_resource" | "delete_resource" | "write_module" | "write_table_item" | "delete_table_item";
  address: string;
  state_key_hash: string;
  data: ResourceData | null;
  handle?: string;
  key?: string;
  value?: string;
}

export interface ResourceData {
  type: string;
  data: Record<string, unknown>;
}

// Resource diff for before/after comparison
export interface ResourceDiff {
  address: string;
  resourceType: string;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  changes: FieldChange[];
}

export interface FieldChange {
  path: string;
  before: unknown;
  after: unknown;
  type: "added" | "removed" | "modified";
}

// Event types
export interface TransactionEvent {
  guid: {
    creation_number: string;
    account_address: string;
  };
  sequence_number: string;
  type: string;
  data: Record<string, unknown>;
}

// Execution trace types
export interface ExecutionTrace {
  function: string;
  module: string;
  type_arguments: string[];
  arguments: unknown[];
  gas_used: number;
  depth: number;
  children: ExecutionTrace[];
  events: TransactionEvent[];
}

// Gas breakdown types
export interface GasBreakdown {
  function: string;
  gas_used: number;
  percentage: number;
  children: GasBreakdown[];
}

// Balance change types
export interface BalanceChange {
  address: string;
  coin_type: string;
  coin_symbol: string;
  before: string;
  after: string;
  change: string;
  direction: "inflow" | "outflow" | "neutral";
}

// ABI types for decoding
export interface ModuleABI {
  address: string;
  name: string;
  friends: string[];
  exposed_functions: FunctionABI[];
  structs: StructABI[];
}

export interface FunctionABI {
  name: string;
  visibility: "public" | "friend" | "private";
  is_entry: boolean;
  is_view: boolean;
  generic_type_params: GenericTypeParam[];
  params: string[];
  return: string[];
}

export interface StructABI {
  name: string;
  is_native: boolean;
  abilities: string[];
  generic_type_params: GenericTypeParam[];
  fields: FieldABI[];
}

export interface FieldABI {
  name: string;
  type: string;
}

export interface GenericTypeParam {
  constraints: string[];
}

// Simulation request types
export interface SimulationRequest {
  sender: string;
  payload: EntryFunctionPayload;
  max_gas_amount?: string;
  gas_unit_price?: string;
  expiration_timestamp_secs?: string;
  sequence_number?: string;
}

// Network configuration
export type NetworkType = "mainnet" | "testnet" | "devnet";

export interface NetworkConfig {
  name: string;
  fullnode: string;
  indexer?: string;
  faucet?: string;
}

// Shareable simulation
export interface SavedSimulation {
  id: string;
  createdAt: string;
  request: SimulationRequest;
  result: SimulationResult;
  network: NetworkType;
  annotations?: SimulationAnnotation[];
}

export interface SimulationAnnotation {
  id: string;
  author?: string;
  step: number;
  content: string;
  createdAt: string;
}

// Transaction lookup types
export interface TransactionInfo {
  version: string;
  hash: string;
  success: boolean;
  vm_status: string;
  sender: string;
  gas_used: string;
  gas_unit_price: string;
  timestamp: string;
  payload: TransactionPayload;
  changes: StateChange[];
  events: TransactionEvent[];
}
