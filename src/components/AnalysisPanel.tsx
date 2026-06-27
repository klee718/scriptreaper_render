import React from "react";
import { Zap, AlertTriangle, ShieldCheck, RefreshCw, Layers } from "lucide-react";
import { AnalysisResult } from "../types";

interface AnalysisPanelProps {
  analysis: AnalysisResult;
}

export default function AnalysisPanel({ analysis }: AnalysisPanelProps) {
  const isHealthy = !analysis.riskFlags || analysis.riskFlags.length === 0;

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 border border-blue-100">
            <Zap className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800">Reaper AI Insights</h3>
            <p className="text-xs text-slate-400 font-medium">Deconstructive Script Analysis</p>
          </div>
        </div>
        <div>
          {isHealthy ? (
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
              <ShieldCheck className="w-3.5 h-3.5" />
              Optimal Architecture
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full">
              <AlertTriangle className="w-3.5 h-3.5" />
              {analysis.riskFlags.length} Risks Replaced
            </span>
          )}
        </div>
      </div>

      <div className="space-y-4">
        {/* Intent section */}
        <div>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1.5 italic font-serif">
            Reconstructed Intent
          </span>
          <p className="text-sm text-slate-700 font-semibold leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-200">
            {analysis.intent || "No intent description returned."}
          </p>
        </div>

        {/* Trigger type & Step counts */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1 italic font-serif">
              Trigger Type
            </span>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="text-xs font-bold font-mono px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 capitalize">
                {analysis.triggerType || "manual"}
              </span>
              {analysis.cronExpression && (
                <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                  {analysis.cronExpression}
                </span>
              )}
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1 italic font-serif">
              Pipeline Nodes
            </span>
            <div className="flex items-center gap-1.5 mt-1 text-slate-700">
              <Layers className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-xs font-bold font-mono">{analysis.stepCount} Steps Created</span>
            </div>
          </div>
        </div>

        {/* Risk Flags or Improvements */}
        {!isHealthy && (
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1.5 italic font-serif">
              Fatal Risks Eliminated via Canvas
            </span>
            <div className="flex flex-wrap gap-2">
              {analysis.riskFlags.map((flag, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-rose-700 bg-rose-50 border border-rose-200 px-2.5 py-1 rounded-lg"
                >
                  <AlertTriangle className="w-3 h-3 text-rose-500" />
                  {flag}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
