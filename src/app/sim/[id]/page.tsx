"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSimulatorStore } from "@/lib/store";
import { Header } from "@/components/simulator/Header";
import { SimulationResults } from "@/components/simulator/SimulationResults";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SavedSimulation } from "@/types";
import {
  ArrowLeft,
  Share2,
  Copy,
  Check,
  Calendar,
  ExternalLink,
} from "lucide-react";

export default function SimulationPage() {
  const params = useParams();
  const router = useRouter();
  const { getSimulationById, setSimulationResult, setJsonPayload, setSenderAddress } = useSimulatorStore();

  const [simulation, setSimulation] = useState<SavedSimulation | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const id = params.id as string;
    if (id) {
      const found = getSimulationById(id);
      if (found) {
        setSimulation(found);
        setSimulationResult(found.result);
        setJsonPayload(JSON.stringify(found.request.payload, null, 2));
        setSenderAddress(found.request.sender);
      }
      setLoading(false);
    }
  }, [params.id, getSimulationById, setSimulationResult, setJsonPayload, setSenderAddress]);

  const copyLink = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-background text-foreground flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </main>
    );
  }

  if (!simulation) {
    return (
      <main className="min-h-screen bg-background text-foreground flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <Card className="max-w-md p-8 text-center">
            <h2 className="text-xl font-bold mb-2">Simulation Not Found</h2>
            <p className="text-muted-foreground mb-6">
              This simulation may have expired or doesn't exist in your local history.
            </p>
            <Button onClick={() => router.push("/")}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Go to Simulator
            </Button>
          </Card>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background text-foreground flex flex-col">
      <Header />

      {/* Simulation Info Bar */}
      <div className="border-b border-white/5 bg-black/20">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push("/")}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <div className="w-px h-6 bg-white/10" />
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-semibold">Shared Simulation</h2>
                  <Badge variant="outline" className="text-xs">
                    {simulation.network}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                  <Calendar className="w-3 h-3" />
                  {new Date(simulation.createdAt).toLocaleString()}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={copyLink}
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 mr-2 text-green-500" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 mr-2" />
                    Copy Link
                  </>
                )}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  router.push("/");
                }}
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Open in Simulator
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Simulation Details */}
      <div className="flex-1 container mx-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Request Summary */}
          <Card className="lg:col-span-1">
            <div className="p-4 border-b border-white/5">
              <h3 className="font-semibold text-sm">Request Details</h3>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Function</p>
                <code className="text-xs font-mono bg-white/5 px-2 py-1 rounded block break-all">
                  {simulation.request.payload.function}
                </code>
              </div>

              <div>
                <p className="text-xs text-muted-foreground mb-1">Sender</p>
                <code className="text-xs font-mono bg-white/5 px-2 py-1 rounded block truncate">
                  {simulation.request.sender}
                </code>
              </div>

              {simulation.request.payload.type_arguments.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Type Arguments</p>
                  <div className="space-y-1">
                    {simulation.request.payload.type_arguments.map((arg, i) => (
                      <code
                        key={i}
                        className="text-xs font-mono bg-white/5 px-2 py-1 rounded block break-all"
                      >
                        {arg}
                      </code>
                    ))}
                  </div>
                </div>
              )}

              {simulation.request.payload.arguments.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Arguments</p>
                  <div className="space-y-1">
                    {simulation.request.payload.arguments.map((arg, i) => (
                      <code
                        key={i}
                        className="text-xs font-mono bg-white/5 px-2 py-1 rounded block break-all"
                      >
                        {typeof arg === "object" ? JSON.stringify(arg) : String(arg)}
                      </code>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* Simulation Results */}
          <div className="lg:col-span-2">
            <SimulationResults />
          </div>
        </div>
      </div>
    </main>
  );
}
