"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { CodeEditor } from "./CodeEditor";
import { useSimulatorStore, parsePayload } from "@/lib/store";
import { simulateTransaction, getTransactionByHash, getAccountSequenceNumber } from "@/lib/movement";
import { NetworkType, SimulationRequest } from "@/types";
import {
  Play,
  Code,
  Hash,
  Wallet,
  Settings,
  ChevronDown,
  ChevronUp,
  Zap,
  RotateCcw,
} from "lucide-react";
import { clsx } from "clsx";

const NETWORK_OPTIONS = [
  { value: "testnet", label: "Testnet" },
  { value: "mainnet", label: "Mainnet" },
  { value: "devnet", label: "Devnet" },
];

const EXAMPLE_PAYLOADS = [
  {
    name: "Transfer MOVE",
    payload: {
      function: "0x1::aptos_account::transfer",
      type_arguments: [],
      arguments: ["0x1", "100000000"],
    },
  },
  {
    name: "Transfer Coins",
    payload: {
      function: "0x1::coin::transfer",
      type_arguments: ["0x1::aptos_coin::AptosCoin"],
      arguments: ["0x1", "100000000"],
    },
  },
  {
    name: "Register Coin",
    payload: {
      function: "0x1::managed_coin::register",
      type_arguments: ["0x1::aptos_coin::AptosCoin"],
      arguments: [],
    },
  },
];

export function TransactionInput() {
  const {
    network,
    setNetwork,
    inputMode,
    setInputMode,
    jsonPayload,
    setJsonPayload,
    txHash,
    setTxHash,
    senderAddress,
    setSenderAddress,
    isSimulating,
    setIsSimulating,
    setSimulationResult,
    setSimulationError,
    addToHistory,
  } = useSimulatorStore();

  const [showAdvanced, setShowAdvanced] = useState(false);
  const [maxGas, setMaxGas] = useState("2000000");
  const [gasPrice, setGasPrice] = useState("100");

  const handleSimulate = async () => {
    setIsSimulating(true);
    setSimulationError(null);
    setSimulationResult(null);

    try {
      if (inputMode === "json") {
        const payload = parsePayload(jsonPayload);
        if (!payload) {
          throw new Error("Invalid JSON payload. Please check your input.");
        }

        // Get sequence number if sender is provided
        let sequenceNumber = "0";
        if (senderAddress) {
          try {
            sequenceNumber = await getAccountSequenceNumber(senderAddress, network);
          } catch {
            // Account might not exist, use 0
          }
        }

        const request: SimulationRequest = {
          sender: senderAddress || "0x1",
          payload,
          max_gas_amount: maxGas,
          gas_unit_price: gasPrice,
          sequence_number: sequenceNumber,
        };

        const result = await simulateTransaction(request, network);
        setSimulationResult(result);
        addToHistory(request, result);
      } else {
        // Transaction hash mode - fetch and display existing transaction
        if (!txHash) {
          throw new Error("Please enter a transaction hash");
        }

        const txInfo = await getTransactionByHash(txHash, network);

        // Convert to simulation result format
        setSimulationResult({
          success: txInfo.success,
          vm_status: txInfo.vm_status,
          gas_used: txInfo.gas_used,
          max_gas_amount: "0",
          gas_unit_price: txInfo.gas_unit_price,
          hash: txInfo.hash,
          version: txInfo.version,
          sender: txInfo.sender,
          sequence_number: "0",
          expiration_timestamp_secs: "0",
          payload: txInfo.payload,
          changes: txInfo.changes,
          events: txInfo.events,
          timestamp: txInfo.timestamp,
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Simulation failed";
      setSimulationError(message);
    } finally {
      setIsSimulating(false);
    }
  };

  const handleExampleSelect = (payload: object) => {
    setJsonPayload(JSON.stringify(payload, null, 2));
  };

  return (
    <Card className="flex flex-col h-full min-h-[500px]">
      <CardHeader className="flex-shrink-0">
        <div className="flex items-center gap-3 w-full">
          <CardTitle>
            <Code className="w-4 h-4 text-primary" />
            Transaction
          </CardTitle>
          <div className="flex-1" />
          <Select
            value={network}
            onChange={(e) => setNetwork(e.target.value as NetworkType)}
            options={NETWORK_OPTIONS}
            className="w-32"
          />
        </div>
      </CardHeader>

      <div className="flex-1 flex flex-col overflow-hidden">
        <Tabs value={inputMode} onValueChange={(v) => setInputMode(v as "json" | "txhash")} className="flex flex-col h-full">
          <div className="px-4 pb-3 border-b border-white/5">
            <TabsList className="w-full">
              <TabsTrigger value="json" className="flex-1 gap-2">
                <Code className="w-3.5 h-3.5" />
                JSON Payload
              </TabsTrigger>
              <TabsTrigger value="txhash" className="flex-1 gap-2">
                <Hash className="w-3.5 h-3.5" />
                Replay Tx
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="json" className="flex-1 flex flex-col overflow-hidden m-0">
            <div className="px-4 py-3 border-b border-white/5 flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Examples:</span>
              {EXAMPLE_PAYLOADS.map((example) => (
                <button
                  key={example.name}
                  onClick={() => handleExampleSelect(example.payload)}
                  className="text-xs px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {example.name}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-hidden">
              <CodeEditor
                value={jsonPayload}
                onChange={setJsonPayload}
                language="json"
              />
            </div>

            <div className="px-4 py-3 border-t border-white/5 space-y-3">
              <Input
                label="Sender Address"
                placeholder="0x..."
                value={senderAddress}
                onChange={(e) => setSenderAddress(e.target.value)}
              />

              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <Settings className="w-3.5 h-3.5" />
                Advanced Options
                {showAdvanced ? (
                  <ChevronUp className="w-3.5 h-3.5" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5" />
                )}
              </button>

              {showAdvanced && (
                <div className="grid grid-cols-2 gap-3 animate-in slide-in-from-top-2 duration-200">
                  <Input
                    label="Max Gas"
                    type="number"
                    value={maxGas}
                    onChange={(e) => setMaxGas(e.target.value)}
                  />
                  <Input
                    label="Gas Price"
                    type="number"
                    value={gasPrice}
                    onChange={(e) => setGasPrice(e.target.value)}
                  />
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="txhash" className="flex-1 flex flex-col m-0 p-4">
            <div className="space-y-4">
              <div className="text-center py-8">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <RotateCcw className="w-8 h-8 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">Replay Transaction</h3>
                <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                  Enter an existing transaction hash to analyze its execution, events, and state changes.
                </p>
              </div>

              <Input
                label="Transaction Hash"
                placeholder="0x..."
                value={txHash}
                onChange={(e) => setTxHash(e.target.value)}
              />

              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Badge variant="info">Tip</Badge>
                <span>Paste a transaction hash from Movement Explorer</span>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <CardFooter className="flex-shrink-0 justify-end">
        <Button
          onClick={handleSimulate}
          isLoading={isSimulating}
          disabled={isSimulating}
          className="gap-2"
        >
          {inputMode === "json" ? (
            <>
              <Zap className="w-4 h-4" />
              Simulate
            </>
          ) : (
            <>
              <Play className="w-4 h-4" />
              Analyze
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}
