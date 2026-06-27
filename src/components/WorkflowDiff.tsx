import React, { useState } from "react";
import { Terminal, FileCode2, Copy, Check, Cloud, ArrowRight, ExternalLink, Workflow, Sparkles, Send, RefreshCw, AlertCircle } from "lucide-react";
import TopologyGraph from "./TopologyGraph";
import { CanvasDefinition, LogLine } from "../types";

interface WorkflowDiffProps {
  script: string;
  yaml: string;
  onPushToSuperPlane: () => void;
  pushing: boolean;
  canvasId: string | null;
  canvasJson?: CanvasDefinition;
  logs?: LogLine[];
  onRefineWorkflow?: (prompt: string) => void;
  refining?: boolean;
  refineError?: string | null;
}

export default function WorkflowDiff({
  script,
  yaml,
  onPushToSuperPlane,
  pushing,
  canvasId,
  canvasJson,
  logs = [],
  onRefineWorkflow,
  refining = false,
  refineError = null,
}: WorkflowDiffProps) {
  const [copied, setCopied] = useState(false);
  const [activeRightTab, setActiveRightTab] = useState<"visual" | "yaml">("visual");
  const [refinePrompt, setRefinePrompt] = useState("");

  const handleCopy = () => {
    navigator.clipboard.writeText(yaml);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRefineSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!refinePrompt.trim() || refining || !onRefineWorkflow) return;
    onRefineWorkflow(refinePrompt);
    setRefinePrompt("");
  };

  const handleQuickRefine = (prompt: string) => {
    if (refining || !onRefineWorkflow) return;
    onRefineWorkflow(prompt);
  };

  // Safe syntax highlight approximation for YAML
  const highlightYaml = (text: string) => {
    return text.split("\n").map((line, i) => {
      // Keys
      if (line.includes(":")) {
        const parts = line.split(":");
        const key = parts[0];
        const val = parts.slice(1).join(":");
        const indentCount = key.length - key.trimStart().length;
        const indent = " ".repeat(indentCount);

        return (
          <div key={i} className="leading-5 font-mono text-xs">
            <span className="text-slate-500 select-none mr-3 inline-block w-4 text-right">
              {i + 1}
            </span>
            <span>{indent}</span>
            <span className="text-blue-400 font-semibold">{key.trim()}</span>
            <span className="text-slate-500">:</span>
            <span className="text-slate-200">{val}</span>
          </div>
        );
      }
      return (
        <div key={i} className="leading-5 font-mono text-xs">
          <span className="text-slate-500 select-none mr-3 inline-block w-4 text-right">
            {i + 1}
          </span>
          <span className="text-slate-300">{line}</span>
        </div>
      );
    });
  };

  // Safe syntax highlight approximation for Bash
  const highlightBash = (text: string) => {
    return text.split("\n").map((line, i) => {
      let lineClass = "text-slate-200";
      if (line.trim().startsWith("#")) {
        lineClass = "text-slate-500 italic font-medium";
      } else if (line.includes("echo ") || line.includes("curl ")) {
        lineClass = "text-emerald-400";
      }

      return (
        <div key={i} className="leading-5 font-mono text-xs">
          <span className="text-slate-500 select-none mr-3 inline-block w-4 text-right">
            {i + 1}
          </span>
          <span className={lineClass}>{line}</span>
        </div>
      );
    });
  };

  return (
    <div className="space-y-6">
      {/* Visual DAG Stage (Full-width or responsive side-by-side) */}
      {activeRightTab === "visual" && canvasJson && (
        <div className="w-full animate-in fade-in slide-in-from-top-4 duration-300">
          <TopologyGraph canvasJson={canvasJson} logs={logs} />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Left column: Bash */}
        <div className="flex flex-col bg-[#0F172A] border border-slate-200 rounded-2xl overflow-hidden shadow-sm h-[480px]">
          <div className="flex items-center justify-between px-4 py-3 bg-[#090D1A] border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Terminal className="w-4.5 h-4.5 text-slate-400" />
              <span className="text-xs font-bold text-slate-200 font-sans">Legacy Bash Script</span>
            </div>
            <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
              SHELL
            </span>
          </div>
          <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-[#0F172A]/90">
            <pre className="whitespace-pre">{highlightBash(script)}</pre>
          </div>
        </div>

        {/* Right column: YAML/Visual Toggle container */}
        <div className="flex flex-col bg-[#0F172A] border border-slate-200 rounded-2xl overflow-hidden shadow-sm h-[480px]">
          {/* Header with layout tab toggles */}
          <div className="flex items-center justify-between px-4 py-3 bg-[#090D1A] border-b border-slate-800">
            <div className="flex bg-slate-800/80 p-0.5 rounded-lg border border-slate-700/50">
              <button
                onClick={() => setActiveRightTab("visual")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                  activeRightTab === "visual"
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <Workflow className="w-3.5 h-3.5" />
                <span>Topology DAG</span>
              </button>
              <button
                onClick={() => setActiveRightTab("yaml")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                  activeRightTab === "yaml"
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <FileCode2 className="w-3.5 h-3.5" />
                <span>canvas.yaml</span>
              </button>
            </div>

            {/* Actions for current tab */}
            {activeRightTab === "yaml" ? (
              <button
                onClick={handleCopy}
                className="flex items-center gap-1 text-[11px] font-semibold text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400 font-bold">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy YAML</span>
                  </>
                )}
              </button>
            ) : (
              <span className="text-[9px] font-bold font-mono px-2 py-0.5 rounded bg-blue-950 border border-blue-900 text-blue-400 uppercase tracking-wider">
                Interactive DAG View
              </span>
            )}
          </div>

          {/* Body Content */}
          <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-[#0F172A]/90">
            {activeRightTab === "yaml" ? (
              <pre className="whitespace-pre">{highlightYaml(yaml)}</pre>
            ) : (
              <div className="h-full flex flex-col justify-center items-center text-center p-6 text-slate-400">
                <Workflow className="w-12 h-12 text-blue-500 mb-3 stroke-[1.5] animate-pulse" />
                <h4 className="text-sm font-bold text-slate-200">Interactive DAG Active Above</h4>
                <p className="text-xs text-slate-400 max-w-xs mt-1.5 leading-relaxed">
                  We've promoted the Interactive Topology DAG Map to its own full-stage panel above so you can fully explore details, parameters, connections, and retry policies!
                </p>
                <button
                  onClick={() => setActiveRightTab("yaml")}
                  className="mt-4 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white text-[11px] font-bold rounded-lg transition-all cursor-pointer"
                >
                  View Raw canvas.yaml Code
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Option A - AI Iterative Refiner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
          <Sparkles className="w-4.5 h-4.5 text-blue-600 animate-pulse" />
          <div>
            <h4 className="text-sm font-bold text-slate-800">Option A • Interactive AI Canvas Refiner</h4>
            <p className="text-xs text-slate-400 font-medium">Type natural instructions to iteratively sculpt the generated YAML and Topology DAG.</p>
          </div>
        </div>

        <form onSubmit={handleRefineSubmit} className="flex gap-2.5">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="e.g., 'add a Slack alert for step backup-database on failure' or 'change trigger to daily at 3am'..."
              value={refinePrompt}
              onChange={(e) => setRefinePrompt(e.target.value)}
              disabled={refining}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-4 pr-10 py-3.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-sans font-medium"
            />
            <div className="absolute right-3 top-3.5 text-slate-400">
              <Sparkles className="w-4 h-4 text-slate-300" />
            </div>
          </div>
          <button
            type="submit"
            disabled={refining || !refinePrompt.trim()}
            className="px-5 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-200 text-white disabled:text-slate-400 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm shadow-slate-900/10 shrink-0"
          >
            {refining ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-slate-400" />
            ) : (
              <Send className="w-3.5 h-3.5" />
            )}
            <span>Refine</span>
          </button>
        </form>

        {refineError && (
          <div className="flex items-start gap-2 bg-rose-50 border border-rose-200 text-rose-700 p-3 rounded-xl text-[11px] font-medium font-sans">
            <AlertCircle className="w-4.5 h-4.5 shrink-0 text-rose-500" />
            <span>{refineError}</span>
          </div>
        )}

        {/* Quick action presets */}
        <div className="pt-1.5">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 italic font-serif">
            Refinement Presets
          </p>
          <div className="flex flex-wrap gap-2">
            {[
              "Add Slack webhook alert step on failures",
              "Set all execution retries to 5 attempts",
              "Schedule trigger to run hourly",
              "Add cleanup step to remove temporary files"
            ].map((preset, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleQuickRefine(preset)}
                disabled={refining}
                className="text-[11px] bg-slate-100 hover:bg-slate-200 active:scale-[0.99] disabled:opacity-50 text-slate-600 hover:text-slate-800 font-bold px-3 py-1.5 rounded-lg border border-slate-200/50 transition-all cursor-pointer"
              >
                + {preset}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Deploy / Action section */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="text-center sm:text-left">
          <p className="text-sm font-bold text-slate-800">Push Schema-Locked Workflow</p>
          <p className="text-xs text-slate-400 mt-0.5 font-medium">
            Register this canvas definition directly on SuperPlane Cloud via API
          </p>
        </div>

        {canvasId ? (
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="flex-1 sm:flex-initial bg-blue-50 border border-blue-100 rounded-xl px-4 py-2.5 text-center sm:text-left">
              <p className="text-[9px] text-slate-400 uppercase tracking-widest font-bold font-mono">Canvas ID</p>
              <code className="text-blue-600 font-mono text-xs font-bold">{canvasId}</code>
            </div>
            <a
              href={`https://app.superplane.com/canvases/${canvasId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 py-3 px-4 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-all cursor-pointer whitespace-nowrap shadow-sm"
            >
              <span>View Canvas</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        ) : (
          <button
            onClick={onPushToSuperPlane}
            disabled={pushing}
            className="w-full sm:w-auto flex items-center justify-center gap-2 py-3.5 px-5 bg-blue-600 hover:bg-blue-500 active:scale-[0.99] text-xs font-bold text-white rounded-xl shadow-md shadow-blue-500/10 transition-all cursor-pointer"
          >
            {pushing ? (
              <>
                <svg className="animate-spin h-4 w-4 text-blue-200" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Creating on SuperPlane Cloud...</span>
              </>
            ) : (
              <>
                <Cloud className="w-4 h-4 animate-bounce" />
                <span>Create on SuperPlane</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
