import React, { useState } from "react";
import { Terminal, FileCode2, Copy, Check, Download, Sparkles, RefreshCw, AlertCircle, HelpCircle, ShieldAlert, ArrowLeftRight, Play } from "lucide-react";

interface ReverseConverterProps {
  dryRun: boolean;
}

const PRESET_CANVASES = [
  {
    name: "Database Backup & Notify",
    yaml: `version: 1
name: db-backup-flow
trigger:
  type: schedule
  schedule:
    cron: "0 0 * * *"
steps:
  - id: check-db
    name: Verify Database Connection
    component: superplane/bash-executor
    inputs:
      command: "pg_isready -h localhost -p 5432"
  - id: pg-dump
    name: Execute PostgreSQL Dump
    component: superplane/bash-executor
    dependsOn: [check-db]
    inputs:
      command: "pg_dump -U postgres prod_db > backup.sql"
    retry:
      maxAttempts: 3
      backoffSeconds: 30
  - id: upload-s3
    name: Upload Backup to AWS S3
    component: superplane/s3-uploader
    dependsOn: [pg-dump]
    inputs:
      bucket: "company-backups"
      file: "backup.sql"
  - id: slack-alert
    name: Dispatch Alert Webhook
    component: superplane/slack-notifier
    dependsOn: [upload-s3]
    runWhen: always
    inputs:
      webhookUrl: "https://hooks.slack.com/services/abc/123"
      message: "Database nightly backup completed and uploaded successfully."`
  },
  {
    name: "GitHub Release Sync",
    yaml: `version: 1
name: release-sync
trigger:
  type: webhook
  webhook:
    source: github
    event: release
steps:
  - id: fetch-tags
    name: Retrieve Git Tags
    component: superplane/bash-executor
    inputs:
      command: "git fetch --tags"
  - id: generate-changelog
    name: Autogenerate Release Notes
    component: superplane/changelog-generator
    dependsOn: [fetch-tags]
  - id: deploy-production
    name: Deploy Container to Kubernetes
    component: superplane/bash-executor
    dependsOn: [generate-changelog]
    inputs:
      command: "kubectl apply -f k8s/production.yaml"`
  }
];

export default function ReverseConverter({ dryRun }: ReverseConverterProps) {
  const [yamlInput, setYamlInput] = useState(PRESET_CANVASES[0].yaml);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Results
  const [generatedScript, setGeneratedScript] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<{
    name: string;
    description: string;
    complexity: string;
    reaperRating: string;
  } | null>(null);

  const [copied, setCopied] = useState(false);

  const handleReverseConvert = async () => {
    if (!yamlInput.trim()) return;
    setLoading(true);
    setError(null);
    setGeneratedScript(null);
    setAnalysis(null);

    try {
      const res = await fetch("/api/reverse-convert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          canvasYaml: yamlInput,
          dryRun,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error?.message || "Failed to reverse engineer workflow.");
      }

      const data = await res.json();
      setGeneratedScript(data.script);
      setAnalysis(data.analysis);
    } catch (err: any) {
      console.error("[ReverseConverter] Error:", err);
      setError(err?.message || "Reverse-engineering failed. Please verify your YAML structure.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!generatedScript) return;
    navigator.clipboard.writeText(generatedScript);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!generatedScript) return;
    const blob = new Blob([generatedScript], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${analysis?.name || "reverse-workflow"}.sh`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div id="reverse-converter" className="space-y-8 animate-in fade-in duration-300">
      {/* Visual Header / Banner */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-4 text-center md:text-left">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0">
            <ArrowLeftRight className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-800 font-sans">
              Superplane ⇄ Bash Reverse Translation Engine
            </h3>
            <p className="text-xs text-slate-500 font-medium leading-relaxed mt-0.5">
              Bidirectional agility. Feed a Superplane YAML configuration canvas to reverse-engineer an annotated, ultra-safe, portable offline shell script.
            </p>
          </div>
        </div>
        <div className="flex gap-2.5">
          {PRESET_CANVASES.map((preset, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => {
                setYamlInput(preset.yaml);
                setGeneratedScript(null);
                setAnalysis(null);
              }}
              className="px-3.5 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100/80 hover:border-slate-300 text-slate-600 text-xs font-bold transition-all cursor-pointer"
            >
              Preset: {preset.name}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Input YAML */}
        <div className="lg:col-span-6 space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm flex flex-col h-[520px]">
            <div className="bg-[#0F172A] px-5 py-3.5 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileCode2 className="w-4 h-4 text-slate-400" />
                <span className="text-xs font-bold text-white font-mono">canvas.yaml</span>
              </div>
              <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                Source Workflow Spec
              </span>
            </div>

            <div className="flex-1 relative">
              <textarea
                value={yamlInput}
                onChange={(e) => setYamlInput(e.target.value)}
                placeholder="Paste your Superplane Canvas YAML definition here..."
                className="w-full h-full bg-[#1E293B] text-slate-100 p-5 font-mono text-[11px] leading-relaxed resize-none focus:outline-none custom-scrollbar"
              />
            </div>

            <div className="bg-slate-50 px-5 py-4 border-t border-slate-100 flex items-center justify-between">
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                Schema validated automatically
              </p>
              <button
                onClick={handleReverseConvert}
                disabled={loading || !yamlInput.trim()}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 text-white disabled:text-slate-400 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5 cursor-pointer shadow-md shadow-blue-500/10 hover:shadow-blue-500/20"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-slate-400" />
                    <span>Decompiling Spec...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 text-white/90 fill-white/10" />
                    <span>Generate Safe Bash Script</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Reverse Results */}
        <div className="lg:col-span-6 space-y-4">
          {generatedScript ? (
            <div className="space-y-4 animate-in fade-in duration-300">
              {/* Insight Dashboard Panel */}
              {analysis && (
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm grid grid-cols-3 gap-4">
                  <div>
                    <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider">
                      Workflow Name
                    </span>
                    <p className="text-xs font-extrabold text-slate-800 font-mono truncate mt-0.5">
                      {analysis.name}
                    </p>
                  </div>
                  <div>
                    <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider">
                      Shell Complexity
                    </span>
                    <p className="text-xs font-extrabold text-blue-600 mt-0.5">
                      ✦ {analysis.complexity}
                    </p>
                  </div>
                  <div>
                    <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider">
                      Reaper Rating
                    </span>
                    <p className="text-xs font-extrabold text-emerald-600 mt-0.5">
                      ✓ {analysis.reaperRating}
                    </p>
                  </div>
                </div>
              )}

              {/* Terminal code view */}
              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm flex flex-col h-[400px]">
                <div className="bg-[#0F172A] px-5 py-3 border-b border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-bold text-white font-mono">run.sh</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={handleCopy}
                      className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                      title="Copy Code"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      onClick={handleDownload}
                      className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                      title="Download Script"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="flex-1 bg-[#090D16] p-5 font-mono text-[11px] leading-relaxed text-slate-200 overflow-auto custom-scrollbar whitespace-pre">
                  {generatedScript}
                </div>
              </div>

              {/* Portable Execution command guide block */}
              <div className="bg-slate-900 text-slate-400 rounded-2xl p-4 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 font-mono text-[11px]">
                <span>$ chmod +x {analysis?.name || "run"}.sh && ./{analysis?.name || "run"}.sh</span>
                <span className="text-[9px] bg-slate-800 text-emerald-400 border border-slate-700 px-2 py-0.5 rounded font-bold font-sans">
                  Offline Execution Mode Ready
                </span>
              </div>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm h-[520px] flex flex-col justify-center items-center text-center py-12">
              <Sparkles className="w-10 h-10 text-slate-300 mb-3 animate-pulse" />
              <h3 className="text-sm font-bold text-slate-400">Reverse-Engineering Workspace</h3>
              <p className="text-xs text-slate-500 max-w-xs mt-1.5 leading-relaxed font-medium">
                Pasted a Superplane Canvas YAML on the left? Click the trigger action to decompile the cloud workflow into a fully verified, safe, local execution script.
              </p>
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl p-4 text-xs font-mono flex items-start gap-2 shadow-sm">
          <AlertCircle className="w-4.5 h-4.5 shrink-0 text-rose-500" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
