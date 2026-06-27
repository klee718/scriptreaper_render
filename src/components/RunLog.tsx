import React, { useEffect, useRef } from "react";
import { Play, Terminal, HelpCircle, Loader2, CheckCircle2, AlertOctagon } from "lucide-react";
import { LogLine } from "../types";

interface RunLogProps {
  canvasId: string;
  running: boolean;
  logs: LogLine[];
  runStatus: "idle" | "running" | "success" | "failure";
  startRun: () => void;
  error: string | null;
}

export default function RunLog({
  canvasId,
  running,
  logs,
  runStatus,
  startRun,
  error,
}: RunLogProps) {
  const terminalEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Auto-scroll logs to bottom
    terminalEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "success":
        return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />;
      case "failure":
      case "error":
        return <AlertOctagon className="w-3.5 h-3.5 text-rose-400 shrink-0" />;
      case "running":
        return <Loader2 className="w-3.5 h-3.5 text-blue-400 animate-spin shrink-0" />;
      case "pending":
      default:
        return <HelpCircle className="w-3.5 h-3.5 text-slate-600 shrink-0" />;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Terminal className="w-4.5 h-4.5 text-slate-500" />
          <h4 className="text-sm font-bold text-slate-800">Execution Stream Output</h4>
        </div>

        <button
          onClick={startRun}
          disabled={running}
          className={`flex items-center gap-2 py-2 px-4 rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer ${
            running
              ? "bg-slate-100 text-slate-400 cursor-not-allowed shadow-none border border-slate-200"
              : "bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/10"
          }`}
        >
          {running ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-400" />
              <span>Running Live...</span>
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Trigger Run</span>
            </>
          )}
        </button>
      </div>

      {/* SSE Terminal Output window */}
      <div className="bg-[#0F172A] border border-slate-200 rounded-2xl overflow-hidden shadow-inner flex flex-col h-[340px]">
        {/* Terminal Header */}
        <div className="flex items-center justify-between px-4 py-2 bg-[#090D1A] border-b border-slate-800">
          <div className="flex gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80"></span>
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80"></span>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80"></span>
          </div>
          <span className="text-[10px] font-bold font-mono text-slate-500">
            {canvasId || "pipeline-logs"}
          </span>
        </div>

        {/* Console Box */}
        <div className="flex-1 overflow-y-auto p-4 font-mono text-xs text-slate-300 space-y-3.5 custom-scrollbar">
          {logs.length === 0 && !running && (
            <div className="flex flex-col items-center justify-center h-full text-slate-400">
              <Terminal className="w-10 h-10 mb-2 stroke-[1.5]" />
              <p className="font-sans text-sm font-semibold">Console inactive.</p>
              <p className="font-sans text-xs mt-1 text-center max-w-xs text-slate-500">
                Click <span className="text-blue-400 font-semibold">Trigger Run</span> above to spin up the execution runtime and stream live logs.
              </p>
            </div>
          )}

          {logs.map((log, index) => {
            const timeStr = new Date(log.timestamp).toLocaleTimeString();
            return (
              <div key={index} className="flex items-start gap-3 border-l-2 border-slate-800 pl-3 py-0.5">
                <span className="text-slate-500 text-[10px] select-none shrink-0 font-sans font-medium mt-0.5">
                  {timeStr}
                </span>
                <div className="flex items-start gap-2">
                  <span className="mt-0.5">{getStatusIcon(log.status)}</span>
                  <div>
                    <span className="text-blue-300 font-semibold font-sans text-[11px] bg-blue-500/5 px-1.5 py-0.5 rounded border border-blue-500/10 mr-2">
                      {log.name || log.step}
                    </span>
                    <span className={log.status === "failure" ? "text-rose-400" : "text-slate-200"}>
                      {log.message}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}

          <div ref={terminalEndRef} />
        </div>
      </div>

      {/* Failures or Success Completion Alert boxes */}
      {runStatus === "success" && (
        <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-emerald-800 shadow-sm animate-in fade-in duration-200">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-6 h-6 stroke-[2] text-emerald-600" />
            <div>
              <p className="text-sm font-bold text-emerald-900">Run Complete</p>
              <p className="text-xs text-emerald-700/80 font-medium">
                All workflow nodes completed execution successfully.
              </p>
            </div>
          </div>
          <span className="text-xs font-mono font-bold bg-emerald-100 border border-emerald-200 px-2.5 py-1 rounded-lg text-emerald-800">
            EXIT CODE 0
          </span>
        </div>
      )}

      {runStatus === "failure" && (
        <div className="flex items-center justify-between bg-rose-50 border border-rose-200 rounded-2xl p-4 text-rose-800 shadow-sm animate-in fade-in duration-200">
          <div className="flex items-center gap-3">
            <AlertOctagon className="w-6 h-6 stroke-[2] text-rose-600" />
            <div>
              <p className="text-sm font-bold text-rose-900">Run Failed</p>
              <p className="text-xs text-rose-700/80 font-medium">
                Pipeline execution encountered a fatal trigger or node failure.
              </p>
            </div>
          </div>
          <span className="text-xs font-mono font-bold bg-rose-100 border border-rose-200 px-2.5 py-1 rounded-lg text-rose-800">
            EXIT CODE 1
          </span>
        </div>
      )}

      {error && (
        <div className="bg-rose-50 border border-rose-100 rounded-2xl p-3 text-rose-700 text-xs shadow-sm font-medium">
          {error}
        </div>
      )}
    </div>
  );
}
