import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  SimulationResult,
  SimulationRequest,
  NetworkType,
  SavedSimulation,
  EntryFunctionPayload,
} from "@/types";
import { nanoid } from "nanoid";

interface SimulatorState {
  // Network
  network: NetworkType;
  setNetwork: (network: NetworkType) => void;

  // Input state
  inputMode: "json" | "txhash";
  setInputMode: (mode: "json" | "txhash") => void;

  jsonPayload: string;
  setJsonPayload: (payload: string) => void;

  txHash: string;
  setTxHash: (hash: string) => void;

  senderAddress: string;
  setSenderAddress: (address: string) => void;

  // Simulation state
  isSimulating: boolean;
  setIsSimulating: (loading: boolean) => void;

  simulationResult: SimulationResult | null;
  setSimulationResult: (result: SimulationResult | null) => void;

  simulationError: string | null;
  setSimulationError: (error: string | null) => void;

  // View state
  activeTab: "overview" | "trace" | "changes" | "events" | "gas";
  setActiveTab: (tab: "overview" | "trace" | "changes" | "events" | "gas") => void;

  // History
  simulationHistory: SavedSimulation[];
  addToHistory: (request: SimulationRequest, result: SimulationResult) => string;
  clearHistory: () => void;

  // Get simulation by ID
  getSimulationById: (id: string) => SavedSimulation | undefined;
}

const DEFAULT_PAYLOAD = JSON.stringify(
  {
    function: "0x1::aptos_account::transfer",
    type_arguments: [],
    arguments: [
      "0x1",
      "100000000"
    ],
  },
  null,
  2
);

export const useSimulatorStore = create<SimulatorState>()(
  persist(
    (set, get) => ({
      // Network
      network: "testnet",
      setNetwork: (network) => set({ network }),

      // Input state
      inputMode: "json",
      setInputMode: (inputMode) => set({ inputMode }),

      jsonPayload: DEFAULT_PAYLOAD,
      setJsonPayload: (jsonPayload) => set({ jsonPayload }),

      txHash: "",
      setTxHash: (txHash) => set({ txHash }),

      senderAddress: "",
      setSenderAddress: (senderAddress) => set({ senderAddress }),

      // Simulation state
      isSimulating: false,
      setIsSimulating: (isSimulating) => set({ isSimulating }),

      simulationResult: null,
      setSimulationResult: (simulationResult) => set({ simulationResult }),

      simulationError: null,
      setSimulationError: (simulationError) => set({ simulationError }),

      // View state
      activeTab: "overview",
      setActiveTab: (activeTab) => set({ activeTab }),

      // History
      simulationHistory: [],
      addToHistory: (request, result) => {
        const id = nanoid(10);
        const simulation: SavedSimulation = {
          id,
          createdAt: new Date().toISOString(),
          request,
          result,
          network: get().network,
        };
        set((state) => ({
          simulationHistory: [simulation, ...state.simulationHistory].slice(0, 50),
        }));
        return id;
      },
      clearHistory: () => set({ simulationHistory: [] }),

      getSimulationById: (id) => {
        return get().simulationHistory.find((s) => s.id === id);
      },
    }),
    {
      name: "movesim-storage",
      partialize: (state) => ({
        network: state.network,
        jsonPayload: state.jsonPayload,
        senderAddress: state.senderAddress,
        simulationHistory: state.simulationHistory,
      }),
    }
  )
);

// Parse JSON payload safely
export function parsePayload(json: string): EntryFunctionPayload | null {
  try {
    const parsed = JSON.parse(json);
    if (!parsed.function) {
      return null;
    }
    return {
      function: parsed.function,
      type_arguments: parsed.type_arguments || [],
      arguments: parsed.arguments || [],
    };
  } catch {
    return null;
  }
}
