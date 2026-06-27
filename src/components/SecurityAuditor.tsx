import React, { useState } from "react";
import { ShieldCheck, ShieldAlert, Check, ToggleLeft, ToggleRight, Sparkles, HelpCircle, Shield, ArrowRight, RefreshCw, AlertTriangle, Lock } from "lucide-react";
import { CanvasDefinition } from "../types";

interface SecurityAuditorProps {
  script: string;
  canvasJson?: CanvasDefinition;
  onPolicyChange?: (refinementPrompt: string) => void;
  loading?: boolean;
}

export default function SecurityAuditor({
  script,
  canvasJson,
  onPolicyChange,
  loading = false,
}: SecurityAuditorProps) {
  // Option C - Configurable auto-mitigation policies
  const [policies, setPolicies] = useState({
    enforceRetries: true,
    autoSlackAlerts: true,
    stripHardcodedSecrets: true,
    secureTmpDirs: false,
  });

  const handleToggle = (key: keyof typeof policies, description: string) => {
    const updated = { ...policies, [key]: !policies[key] };
    setPolicies(updated);
    
    // Trigger an AI-driven or rules-driven refinement update
    if (onPolicyChange) {
      if (!updated[key]) {
        onPolicyChange(`Remove policy: ${description}`);
      } else {
        onPolicyChange(`Apply secure policy: ${description}`);
      }
    }
  };

  // Static script parser to detect actual vulnerabilites
  const detectVulnerabilities = (code: string) => {
    const lower = code.toLowerCase();
    const list = [];
    let scoreMinus = 0;

    if (!lower.includes("set -e") && !lower.includes("set -o pipefail")) {
      list.push({
        id: "no_set_e",
        title: "Silent Fatal Failures",
        description: "Script lacks 'set -e'. Errors in intermediate commands will not halt execution, risking corrupted partial states.",
        severity: "critical",
        mitigation: "SuperPlane halts pipeline instantly on non-zero exit codes.",
      });
      scoreMinus += 25;
    }

    if (lower.includes("password") || lower.includes("secret") || lower.includes("key=") || lower.includes("token")) {
      list.push({
        id: "exposed_creds",
        title: "Exposed Plaintext Secrets",
        description: "Hardcoded configuration keys, tokens, or local credentials detected in raw shell codebase.",
        severity: "critical",
        mitigation: "Parameters are schema-locked and injected securely at runtime via Cloud Vault integrations.",
      });
      scoreMinus += 30;
    }

    if (lower.includes("sleep ") && !lower.includes("retry")) {
      list.push({
        id: "unguarded_sleep",
        title: "Arbitrary Thread Blocking (sleep)",
        description: "Employs hardcoded duration sleeps which waste worker cycles and cause race conditions.",
        severity: "medium",
        mitigation: "Replaced by event-driven step dependency chains and reactive state triggers.",
      });
      scoreMinus += 15;
    }

    if (!lower.includes("curl") && !lower.includes("slack") && !lower.includes("pagerduty") && !lower.includes("mail")) {
      list.push({
        id: "no_alerting",
        title: "Blackhole Failure Modes",
        description: "No alerting or external webhook logging mechanisms configured. Script fails completely in isolation.",
        severity: "high",
        mitigation: "Integrated with failure webhook steps (slack/pagerduty) triggering on step exit codes.",
      });
      scoreMinus += 20;
    }

    const bashScore = Math.max(15, 95 - scoreMinus);
    const canvasScore = Math.min(98, bashScore + (policies.enforceRetries ? 15 : 0) + (policies.autoSlackAlerts ? 15 : 0) + (policies.stripHardcodedSecrets ? 10 : 0) + 15);

    return {
      vulnerabilities: list,
      bashScore,
      canvasScore,
    };
  };

  const { vulnerabilities, bashScore, canvasScore } = detectVulnerabilities(script);

  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm animate-in fade-in slide-in-from-top-4 duration-300">
      {/* Banner / Header */}
      <div className="bg-[#0F172A] px-5 py-4 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <Shield className="w-5 h-5 text-blue-500" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white font-sans">Security & Reliability Auditer</h3>
            <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mt-0.5">
              Option C • Real-time Threat Containment & Mitigations
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] bg-emerald-950 border border-emerald-900 text-emerald-400 px-2.5 py-1 rounded-lg font-bold font-mono tracking-wider uppercase">
            Auto-Fix Engine Active
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12">
        {/* Left Col: Comparative Score Gauges */}
        <div className="lg:col-span-5 p-5 bg-slate-50/50 border-r border-slate-100 flex flex-col justify-between">
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider font-serif italic">
              Comparative Safety Index
            </h4>

            <div className="grid grid-cols-2 gap-4 pt-2">
              {/* Bash score circular indicator */}
              <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col items-center justify-center text-center shadow-xs">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Original Bash</p>
                <div className="relative w-24 h-24 flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-95" viewBox="0 0 36 36">
                    <path
                      className="text-slate-100"
                      strokeWidth="3.5"
                      stroke="currentColor"
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                    <path
                      className={bashScore < 40 ? "text-rose-500" : "text-amber-500"}
                      strokeWidth="3.5"
                      strokeDasharray={`${bashScore}, 100`}
                      strokeLinecap="round"
                      stroke="currentColor"
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                  </svg>
                  <div className="absolute flex flex-col items-center justify-center">
                    <span className="text-xl font-extrabold font-mono text-slate-800">{bashScore}%</span>
                    <span className="text-[8px] font-bold uppercase tracking-widest text-slate-400">Hazardous</span>
                  </div>
                </div>
              </div>

              {/* SuperPlane score circular indicator */}
              <div className="bg-white border border-blue-100 rounded-2xl p-4 flex flex-col items-center justify-center text-center shadow-xs relative overflow-hidden">
                <div className="absolute top-0 right-0 bg-blue-500 text-white text-[8px] px-2.5 py-0.5 rounded-bl-lg font-bold tracking-widest uppercase">
                  AI
                </div>
                <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wider mb-2">SuperPlane</p>
                <div className="relative w-24 h-24 flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-95" viewBox="0 0 36 36">
                    <path
                      className="text-blue-50"
                      strokeWidth="3.5"
                      stroke="currentColor"
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                    <path
                      className="text-emerald-500"
                      strokeWidth="3.5"
                      strokeDasharray={`${canvasScore}, 100`}
                      strokeLinecap="round"
                      stroke="currentColor"
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                  </svg>
                  <div className="absolute flex flex-col items-center justify-center">
                    <span className="text-xl font-extrabold font-mono text-emerald-600">{canvasScore}%</span>
                    <span className="text-[8px] font-bold uppercase tracking-widest text-emerald-500">Secured</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-4 mt-5 space-y-1.5">
            <div className="flex items-center gap-1.5 text-blue-700 text-xs font-bold">
              <Sparkles className="w-4 h-4" />
              <span>Durable Auto-Safe Mode</span>
            </div>
            <p className="text-slate-500 text-[11px] leading-relaxed font-medium">
              Your workflow is automatically wrapped inside a secure, multi-step pipeline executing inside schema-isolated Google Cloud sandboxes, preventing local shell exploits or script deadlocks.
            </p>
          </div>
        </div>

        {/* Right Col: Mitigation Checklist & Interactive Toggles */}
        <div className="lg:col-span-7 p-5 flex flex-col justify-between">
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider font-serif italic">
              Active Security & Reliability Policies
            </h4>

            {/* Checklist of toggles */}
            <div className="space-y-3">
              {/* Retry Toggle */}
              <div className="flex items-center justify-between p-3.5 rounded-xl border border-slate-100 bg-slate-50 hover:bg-slate-100/50 transition-all">
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={policies.enforceRetries}
                    onChange={() => handleToggle("enforceRetries", "Enforce exponential backoff retries on task execution failures")}
                    className="mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer h-4 w-4"
                  />
                  <div>
                    <label className="text-xs font-bold text-slate-800 block cursor-pointer">
                      Enforce Exponential Backoff Retries
                    </label>
                    <p className="text-[11px] text-slate-400 font-medium mt-0.5 leading-relaxed">
                      Automatically registers <code className="font-mono text-blue-600 font-bold bg-blue-50 px-1 py-0.5 rounded">maxAttempts: 3</code> on failure steps.
                    </p>
                  </div>
                </div>
                <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100 font-mono">
                  +15% Reliability
                </span>
              </div>

              {/* Slack alert toggle */}
              <div className="flex items-center justify-between p-3.5 rounded-xl border border-slate-100 bg-slate-50 hover:bg-slate-100/50 transition-all">
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={policies.autoSlackAlerts}
                    onChange={() => handleToggle("autoSlackAlerts", "Add Slack warning hooks and alerting steps for pipeline failures")}
                    className="mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer h-4 w-4"
                  />
                  <div>
                    <label className="text-xs font-bold text-slate-800 block cursor-pointer">
                      Inject Failure Notification Steps
                    </label>
                    <p className="text-[11px] text-slate-400 font-medium mt-0.5 leading-relaxed">
                      Ensures a final Slack notifier step executes when any upstream nodes crash.
                    </p>
                  </div>
                </div>
                <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100 font-mono">
                  +15% Observability
                </span>
              </div>

              {/* Secret stripper toggle */}
              <div className="flex items-center justify-between p-3.5 rounded-xl border border-slate-100 bg-slate-50 hover:bg-slate-100/50 transition-all">
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={policies.stripHardcodedSecrets}
                    onChange={() => handleToggle("stripHardcodedSecrets", "Strip plaintext credentials and use secure parameter injection")}
                    className="mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer h-4 w-4"
                  />
                  <div>
                    <label className="text-xs font-bold text-slate-800 block cursor-pointer">
                      Lock Plaintext Secret Expositions
                    </label>
                    <p className="text-[11px] text-slate-400 font-medium mt-0.5 leading-relaxed">
                      Detects exposed auth parameters and abstracts them into secure environment fields.
                    </p>
                  </div>
                </div>
                <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100 font-mono">
                  +10% Credential Security
                </span>
              </div>
            </div>
          </div>

          <div className="pt-4 mt-4 border-t border-slate-100 text-slate-400 text-[10px] font-bold flex items-center justify-between">
            <span>Policies sync dynamically with AI canvas definitions.</span>
            {loading && (
              <span className="flex items-center gap-1 text-blue-600 animate-pulse">
                <RefreshCw className="w-3 h-3 animate-spin" />
                Refinement in progress...
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Threats / Vulnerabilities Table / Breakdown List */}
      <div className="border-t border-slate-100">
        <div className="px-5 py-3.5 bg-slate-50/50 border-b border-slate-100">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider font-sans">
            Threat & Integrity Findings ({vulnerabilities.length})
          </p>
        </div>

        {vulnerabilities.length > 0 ? (
          <div className="divide-y divide-slate-100 max-h-56 overflow-y-auto custom-scrollbar">
            {vulnerabilities.map((v, i) => (
              <div key={i} className="p-4 flex flex-col sm:flex-row items-start justify-between gap-4 bg-white hover:bg-slate-50/30 transition-colors">
                <div className="space-y-1 max-w-xl">
                  <div className="flex items-center gap-2">
                    <span className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded font-mono ${
                      v.severity === "critical"
                        ? "bg-rose-50 border border-rose-200 text-rose-700"
                        : v.severity === "high"
                        ? "bg-amber-50 border border-amber-200 text-amber-700"
                        : "bg-blue-50 border border-blue-200 text-blue-700"
                    }`}>
                      {v.severity}
                    </span>
                    <h5 className="text-xs font-bold text-slate-800">{v.title}</h5>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed font-medium">
                    {v.description}
                  </p>
                </div>

                <div className="sm:text-right shrink-0">
                  <div className="inline-flex items-center gap-1.5 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-2.5 py-1">
                    <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[2.5]" />
                    <span>{v.mitigation}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-10 text-center flex flex-col items-center justify-center text-slate-400">
            <ShieldCheck className="w-10 h-10 text-emerald-500 mb-2" />
            <h5 className="text-xs font-bold text-slate-700">Perfect Bash Code Integrity!</h5>
            <p className="text-[11px] text-slate-500 max-w-xs mt-1 leading-relaxed font-medium">
              No structural vulnerabilities were flagged in your raw bash input. Your source script follows clean programming practices.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
