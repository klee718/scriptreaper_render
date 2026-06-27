import React, { useState } from "react";
import { Skull, HelpCircle, Terminal, Zap, BookOpen, Layers, CheckCircle2, AlertOctagon } from "lucide-react";
import ScriptInput from "./components/ScriptInput";
import AnalysisPanel from "./components/AnalysisPanel";
import WorkflowDiff from "./components/WorkflowDiff";
import RunLog from "./components/RunLog";
import BatchInput from "./components/BatchInput";
import DeployButton from "./components/DeployButton";
import SecurityAuditor from "./components/SecurityAuditor";
import ReverseConverter from "./components/ReverseConverter";
import ValidationSuite from "./components/ValidationSuite";
import DeploymentDashboard from "./components/DeploymentDashboard";
import MonitoringDashboard from "./components/MonitoringDashboard";
import AnalyticsDashboard from "./components/AnalyticsDashboard";
import { ConvertResult, LogLine } from "./types";

export default function App() {
  const [activeTab, setActiveTab] = useState<"single" | "batch" | "reverse" | "validation" | "management">("validation");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conversion, setConversion] = useState<ConvertResult | null>(null);
  const [pushing, setPushing] = useState(false);
  const [dryRun, setDryRun] = useState(false);
  const [envStatus, setEnvStatus] = useState<{
    geminiConfigured: boolean;
    superplaneConfigured: boolean;
    githubConfigured: boolean;
  } | null>(null);

  // States for shared live log and topology graph reactive execution
  const [runLogs, setRunLogs] = useState<LogLine[]>([]);
  const [runStatus, setRunStatus] = useState<"idle" | "running" | "success" | "failure">("idle");
  const [runningRun, setRunningRun] = useState(false);
  const [runError, setRunError] = useState<string | null>(null);
  const eventSourceRef = React.useRef<EventSource | null>(null);

  // Option A - State variables for Iterative AI refinement
  const [refining, setRefining] = useState(false);
  const [refineError, setRefineError] = useState<string | null>(null);

  const handleRefineWorkflow = async (prompt: string) => {
    if (!conversion) return;
    setRefining(true);
    setRefineError(null);

    try {
      const res = await fetch("/api/refine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          script: conversion.script,
          canvasJson: conversion.canvasJson,
          prompt,
          dryRun,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error?.message || "Failed to refine canvas configuration.");
      }

      const data = await res.json();
      setConversion(data);
    } catch (err: any) {
      console.error("[App] Refinement error:", err);
      setRefineError(err?.message || "Refinement failed. Please try again.");
    } finally {
      setRefining(false);
    }
  };

  // Fetch credential/environment status on app load
  React.useEffect(() => {
    fetch("/api/env-status")
      .then((res) => res.json())
      .then((data) => {
        setEnvStatus(data);
        // Automatically default dry-run simulation mode to true if GEMINI_API_KEY is missing
        if (!data.geminiConfigured) {
          setDryRun(true);
        }
      })
      .catch((err) => console.error("Error retrieving environment status:", err));
  }, []);

  // Cleanup EventSource on unmount
  React.useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  // Handle script conversion via POST /api/convert
  const handleConvert = async (script: string, name?: string) => {
    setLoading(true);
    setError(null);
    setConversion(null);
    
    // Reset previous run statuses
    setRunLogs([]);
    setRunStatus("idle");
    setRunningRun(false);
    setRunError(null);

    try {
      const res = await fetch("/api/convert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ script, name, dryRun }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error?.message || "Failed to convert script.");
      }

      const data = await res.json();
      setConversion(data);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "An error occurred during compilation.");
    } finally {
      setLoading(false);
    }
  };

  // Push the generated YAML configuration to SuperPlane Cloud
  const handlePushToSuperPlane = async () => {
    if (!conversion) return;
    setPushing(true);
    setError(null);

    try {
      // Simulate registering canvas definition on SuperPlane (or real integration if credentials configured)
      const res = await fetch("/api/canvas/trigger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ canvasId: conversion.canvasId || "sp-mock-canvas" }),
      });

      if (!res.ok) {
        throw new Error("Failed to register workflow configuration on SuperPlane.");
      }

      // We successfully registered or validated!
      // Update our local conversion state with the canvas ID
      const canvasId = conversion.canvasId || `sp-canvas-mock-${Math.random().toString(36).substring(2, 9)}`;
      setConversion({
        ...conversion,
        canvasId,
      });
    } catch (err: any) {
      setError(err?.message || "SuperPlane Cloud registration failed.");
    } finally {
      setPushing(false);
    }
  };

  // Trigger continuous run execution and listen to SSE updates
  const startRun = async (canvasId: string) => {
    setRunningRun(true);
    setRunLogs([]);
    setRunError(null);
    setRunStatus("running");

    try {
      // 1. Trigger the run via our backend API
      const res = await fetch("/api/canvas/trigger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ canvasId }),
      });

      if (!res.ok) {
        throw new Error("Failed to trigger run on SuperPlane Cloud.");
      }

      const { runId } = await res.json();
      console.log(`[App] Successfully triggered run stream: ${runId}`);

      // 2. Open Server-Sent Events (SSE) stream for live logs
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }

      const sse = new EventSource(`/api/run-log/${canvasId}`);
      eventSourceRef.current = sse;

      sse.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.type === "done") {
            setRunStatus(data.status);
            setRunningRun(false);
            sse.close();
            eventSourceRef.current = null;
            return;
          }

          // Append log line to share state reactively with TopologyGraph
          setRunLogs((prev) => [...prev, data]);
        } catch (parseErr) {
          console.error("Error parsing log payload:", parseErr);
        }
      };

      sse.onerror = (err) => {
        console.error("SSE stream error:", err);
        setRunError("Execution log stream interrupted. Polling completed.");
        setRunningRun(false);
        sse.close();
        eventSourceRef.current = null;
      };

    } catch (err: any) {
      setRunError(err?.message || "Failed to launch pipeline trigger.");
      setRunningRun(false);
      setRunStatus("failure");
    }
  };

  return (
    <div className="min-h-screen bg-[#F1F5F9] text-slate-900 flex flex-col font-sans selection:bg-blue-500/20 antialiased selection:text-blue-900">
      {/* Header section */}
      <header className="border-b border-slate-200 bg-[#0F172A] text-slate-400 sticky top-0 z-50 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
              <Skull className="w-5.5 h-5.5 text-white animate-pulse" />
            </div>
            <div className="text-center sm:text-left">
              <h1 className="text-xl font-bold tracking-tight text-white">
                ScriptReaper
              </h1>
              <p className="text-[10px] text-slate-400 font-semibold tracking-wide uppercase mt-0.5">
                Your Bash Scripts Deserve Better. 🪦
              </p>
            </div>
          </div>

          {/* Core Navigation tabs */}
          <div className="flex flex-wrap bg-slate-800/80 p-1 rounded-xl border border-slate-700/50 gap-1 sm:gap-0">
            <button
              onClick={() => setActiveTab("validation")}
              className={`px-4 py-2 rounded-lg text-xs font-bold tracking-wide transition-all cursor-pointer ${
                activeTab === "validation"
                  ? "bg-blue-600 text-white shadow-sm font-extrabold"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              🎯 YC Validation Suite
            </button>
            <button
              onClick={() => setActiveTab("single")}
              className={`px-4 py-2 rounded-lg text-xs font-bold tracking-wide transition-all cursor-pointer ${
                activeTab === "single"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Single Script
            </button>
            <button
              onClick={() => setActiveTab("batch")}
              className={`px-4 py-2 rounded-lg text-xs font-bold tracking-wide transition-all cursor-pointer ${
                activeTab === "batch"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Batch Mode (GitHub)
            </button>
            <button
              onClick={() => setActiveTab("reverse")}
              className={`px-4 py-2 rounded-lg text-xs font-bold tracking-wide transition-all cursor-pointer ${
                activeTab === "reverse"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Canvas to Bash
            </button>
            <button
              onClick={() => setActiveTab("management")}
              className={`px-4 py-2 rounded-lg text-xs font-bold tracking-wide transition-all cursor-pointer ${
                activeTab === "management"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Management
            </button>
          </div>
        </div>
      </header>

      {/* Main stage section */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-8 space-y-8">
        {/* Pitch banner */}
        <section className="text-center max-w-xl mx-auto space-y-2">
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Bury legacy Bash scripts.
          </h2>
          <p className="text-sm text-slate-500 leading-relaxed font-medium">
            Instantly translate custom Bash files into highly observable, schema-locked SuperPlane
            workflow canvas definitions, complete with retries, alerts, and metrics.
          </p>
        </section>

        {/* Dry-Run simulation status or toggle banner */}
        <div className="max-w-4xl mx-auto">
          {dryRun ? (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm animate-in fade-in duration-200">
              <div className="flex items-center gap-3.5 text-center sm:text-left">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center border border-amber-200 text-amber-600 shrink-0">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
                  </span>
                </div>
                <div>
                  <h4 className="text-sm font-bold text-amber-800">Dry-Run Simulation Active</h4>
                  <p className="text-xs text-amber-600/90 mt-0.5 font-medium">
                    The app is running offline in dry-run/simulation mode. No API credentials or billing setup is required.
                  </p>
                </div>
              </div>
              {envStatus?.geminiConfigured && (
                <button
                  onClick={() => setDryRun(false)}
                  className="w-full sm:w-auto bg-amber-600 hover:bg-amber-700 active:scale-[0.98] text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-sm transition-all cursor-pointer whitespace-nowrap"
                >
                  Switch to Live API
                </button>
              )}
            </div>
          ) : (
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm animate-in fade-in duration-200">
              <div className="flex items-center gap-3.5 text-center sm:text-left">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-200 text-emerald-600 shrink-0">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-emerald-800">Live API Connection Active</h4>
                  <p className="text-xs text-emerald-600/90 mt-0.5 font-medium">
                    Google Gemini 3.5-Flash and SuperPlane Cloud connections are configured and ready.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setDryRun(true)}
                className="w-full sm:w-auto bg-slate-800 hover:bg-slate-700 active:scale-[0.98] text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-sm transition-all cursor-pointer whitespace-nowrap"
              >
                Switch to Dry-Run
              </button>
            </div>
          )}
        </div>

        {activeTab === "single" ? (
          <div className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Left Column: Script Input */}
              <div className="lg:col-span-7 space-y-6">
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                  <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100">
                    <Terminal className="w-4.5 h-4.5 text-slate-500" />
                    <h3 className="text-sm font-bold text-slate-800">Bury a Bash Script</h3>
                  </div>
                  <ScriptInput onConvert={handleConvert} loading={loading} />
                </div>
              </div>

              {/* Right Column: AI Analysis insights */}
              <div className="lg:col-span-5 space-y-6">
                {conversion ? (
                  <AnalysisPanel analysis={conversion.analysis} />
                ) : (
                  <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm h-full flex flex-col justify-center items-center text-center py-12">
                    <Zap className="w-10 h-10 text-slate-300 mb-3 stroke-[1.5]" />
                    <h3 className="text-sm font-bold text-slate-400">Analysis Pending</h3>
                    <p className="text-xs text-slate-500 max-w-xs mt-1 leading-relaxed">
                      Upload or paste a bash script on the left, then click Convert to view structured intent
                      extractions and safety analyses.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Error notifications */}
            {error && (
              <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl p-4 text-xs font-mono shadow-sm">
                {error}
              </div>
            )}

            {/* Workflow diff section */}
            {conversion && (
              <section className="space-y-8 animate-in fade-in slide-in-from-bottom-3 duration-300">
                {/* Option C: Visual Threat / Vulnerability Auditer */}
                <SecurityAuditor
                  script={conversion.script}
                  canvasJson={conversion.canvasJson}
                  onPolicyChange={handleRefineWorkflow}
                  loading={refining}
                />

                <WorkflowDiff
                  script={conversion.script}
                  yaml={conversion.canvasYaml}
                  onPushToSuperPlane={handlePushToSuperPlane}
                  pushing={pushing}
                  canvasId={conversion.canvasId}
                  canvasJson={conversion.canvasJson}
                  logs={runLogs}
                  onRefineWorkflow={handleRefineWorkflow}
                  refining={refining}
                  refineError={refineError}
                />

                {/* SSE Run Log Terminal console section */}
                {conversion.canvasId && (
                  <section className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm animate-in fade-in duration-300">
                    <RunLog
                      canvasId={conversion.canvasId}
                      running={runningRun}
                      logs={runLogs}
                      runStatus={runStatus}
                      startRun={() => startRun(conversion.canvasId!)}
                      error={runError}
                    />
                  </section>
                )}
              </section>
            )}
          </div>
        ) : activeTab === "validation" ? (
          <section className="animate-in fade-in duration-300">
            <ValidationSuite />
          </section>
        ) : activeTab === "batch" ? (
          <section className="animate-in fade-in duration-300">
            <BatchInput dryRun={dryRun} />
          </section>
        ) : activeTab === "management" ? (
          <section className="animate-in fade-in duration-300 space-y-6">
            <DeploymentDashboard />
            <MonitoringDashboard />
            <AnalyticsDashboard />
          </section>
        ) : (
          <section className="animate-in fade-in duration-300">
            <ReverseConverter dryRun={dryRun} />
          </section>
        )}

        {/* Deploy to Render section */}
        <section className="pt-6 border-t border-slate-200">
          <DeployButton />
        </section>
      </main>

      {/* Footer section */}
      <footer className="border-t border-slate-200 bg-white py-6">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left text-xs text-slate-500 font-medium">
          <p>© 2026 ScriptReaper. Built with passion for YC SuperPlane Funeral Hackathon NYC.</p>
          <p className="font-mono text-slate-400">"Your bash script is dead. Long live ScriptReaper." 🪦</p>
        </div>
      </footer>
    </div>
  );
}
