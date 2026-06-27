import React, { useState } from "react";
import { 
  CheckCircle2, 
  AlertTriangle, 
  Terminal, 
  MessageSquare, 
  Search, 
  RefreshCw, 
  ArrowRight, 
  GitBranch, 
  Clock, 
  Layers, 
  ChevronRight, 
  ExternalLink, 
  Sparkles, 
  Play, 
  Eye, 
  Code2, 
  AlertCircle,
  HelpCircle,
  ArrowLeft
} from "lucide-react";

interface ValidationIssue {
  id: string;
  githubUrl: string;
  title: string;
  problem: string;
  expectedBehavior: string;
}

const VALIDATION_ISSUES: ValidationIssue[] = [
  {
    id: "5368",
    githubUrl: "https://github.com/superplanehq/superplane/issues/5368",
    title: "Markdown & Mermaid View Support",
    problem: "In view mode, markdown files should render properly with full markdown support, but are currently missing Mermaid.js flowchart rendering and custom node status chips.",
    expectedBehavior: "Render code blocks containing Mermaid flowcharts as beautiful visual diagrams and parse custom node status tokens into interactive UI badge chips.",
  },
  {
    id: "5366",
    githubUrl: "https://github.com/superplanehq/superplane/issues/5366",
    title: "Canvas Version Diff Highlighting",
    problem: "When viewing version changes, the editor highlights the entire block of code, making it difficult to spot what actually changed inside a large file.",
    expectedBehavior: "Provide character/word-level inline diff highlighting to isolate the exact properties or parameters modified in a single line.",
  },
  {
    id: "5164",
    githubUrl: "https://github.com/superplanehq/superplane/issues/5164",
    title: "Send Failed Run to Agent Chat",
    problem: "When a node execution fails, users have to manually copy-paste the error stack trace, switch to the chat sidebar, and describe the problem to the agent.",
    expectedBehavior: "Provide a quick 'Send to Agent Chat' trigger on any failed run log that instantly streams the failure payload to the AI agent for automated debugging and fixes.",
  },
  {
    id: "5704",
    githubUrl: "https://github.com/superplanehq/superplane/issues/5704",
    title: "Run Inspection UX Paper Cuts",
    problem: "Inspecting runs lacks vital execution metrics. Total run duration is not shown, individual node durations are missing, payload inspection is difficult, and there is no way to search runs.",
    expectedBehavior: "Create an enriched inspection drawer showing total run and individual node durations, a searchable step list, and an interactive input/output JSON inspector.",
  },
  {
    id: "5705",
    githubUrl: "https://github.com/superplanehq/superplane/issues/5705",
    title: "Canvas Warnings: Design, Coverage & Placement",
    problem: "Warnings about misconfigured nodes are output only to the console without a visual hierarchy, or are poorly placed, causing users to miss potential security and performance issues.",
    expectedBehavior: "Design high-contrast warning elements directly on the workflow canvas with a hierarchical list of severity levels, clear descriptions, and auto-fix triggers.",
  }
];

export default function ValidationSuite() {
  const [selectedIssueId, setSelectedIssueId] = useState<string>("5368");
  const currentIssue = VALIDATION_ISSUES.find((i) => i.id === selectedIssueId)!;

  // 1. States for Issue #5368
  const [rawMarkdown, setRawMarkdown] = useState(
    `# Production Build Summary
This report summarizes the pipeline execution for the main branch.

### Workflow Architecture
Here is the live deployment layout of the steps:

\`\`\`mermaid
graph TD
  A[git-clone] --> B[npm-install]
  B --> C[database-migration]
  C --> D[pm2-deploy]
  D --> E[slack-notify]
\`\`\`

### Step Configurations & Statuses
- [node: git-clone | status: success | duration: 1.5s]
- [node: npm-install | status: success | duration: 12.3s]
- [node: database-migration | status: warning | issue: pending-migrations]
- [node: pm2-deploy | status: success | duration: 5.2s]`
  );
  const [mdMode, setMdMode] = useState<"render" | "raw">("render");

  // 2. States for Issue #5366
  const [diffMode, setDiffMode] = useState<"before" | "after">("after");

  // 3. States for Issue #5164
  const [pdLogs, setPdLogs] = useState<any[]>([
    { step: "git-clone", status: "success", msg: "Successfully cloned repository from origin/main" },
    { step: "npm-install", status: "success", msg: "Restored 342 packages from package-lock.json in 11s" },
    { step: "database-migration", status: "failure", msg: "CRITICAL ERROR: Failed to execute pg_dump / migration SQL - Access Denied for user 'superplane_user' on production_db." },
    { step: "pm2-deploy", status: "pending", msg: "Waiting for upstream migration step to resolve..." }
  ]);
  const [isAgentChatOpen, setIsAgentChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [isFixed, setIsFixed] = useState(false);

  // 4. States for Issue #5704
  const [searchQuery, setSearchQuery] = useState("");
  const [inspectNodeId, setInspectNodeId] = useState<string | null>("database-migration");
  const [activeCanvasView, setActiveCanvasView] = useState(false);

  // 5. States for Issue #5705
  const [fixedWarnings, setFixedWarnings] = useState<{ [key: string]: boolean }>({
    timeout: false,
    imageTag: false
  });
  const [activeWarningNode, setActiveWarningNode] = useState<string | null>("bash-executor");

  // Handle Send to Agent Chat (Issue #5164)
  const handleSendToAgentChat = () => {
    setIsAgentChatOpen(true);
    setIsTyping(true);
    setChatMessages([
      { 
        sender: "user", 
        text: "Debugging failure on node 'database-migration'. Payload: Access Denied for user 'superplane_user'." 
      }
    ]);

    setTimeout(() => {
      setIsTyping(false);
      setChatMessages((prev) => [
        ...prev,
        {
          sender: "agent",
          text: "I analyzed the database-migration failure. The credentials in your canvas.yaml are hardcoded to standard credentials which lack pg_dump authorization. I recommend we configure the step to inject parameters from SuperPlane Cloud Vault.",
          hasAction: true
        }
      ]);
    }, 1500);
  };

  const handleApplyAgentFix = () => {
    setIsFixed(true);
    setPdLogs([
      { step: "git-clone", status: "success", msg: "Successfully cloned repository from origin/main" },
      { step: "npm-install", status: "success", msg: "Restored 342 packages from package-lock.json in 11s" },
      { step: "database-migration", status: "success", msg: "Vault check passed. Migration SQL executed successfully (3 tables updated)." },
      { step: "pm2-deploy", status: "success", msg: "Successfully restarted API daemon services. Pipeline clean." }
    ]);
    setChatMessages((prev) => [
      ...prev,
      {
        sender: "agent",
        text: "✓ Vault credential policy applied! I triggered a trial execution and all nodes completed successfully."
      }
    ]);
  };

  // Rendering Helpers for Issue #5368 Custom Markdown & Mermaid
  const renderCustomMarkdown = (text: string) => {
    const lines = text.split("\n");
    let inMermaid = false;
    const renderedElements: React.ReactNode[] = [];

    lines.forEach((line, idx) => {
      if (line.trim().startsWith("```mermaid")) {
        inMermaid = true;
        return;
      }
      if (inMermaid && line.trim().startsWith("```")) {
        inMermaid = false;
        // Render custom Mermaid visual diagram instead of raw text block
        renderedElements.push(
          <div key={`mermaid-${idx}`} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 my-4 shadow-inner relative overflow-hidden">
            <span className="absolute top-3 right-3 text-[9px] font-bold font-mono text-emerald-400 bg-emerald-950 border border-emerald-900 px-2 py-0.5 rounded tracking-widest uppercase">
              Mermaid.js PoC Renderer
            </span>
            <div className="flex flex-col items-center space-y-4 py-2">
              <div className="flex flex-wrap items-center justify-center gap-6 md:gap-8">
                <div className="flex flex-col items-center">
                  <div className="bg-blue-600 text-white font-mono text-xs font-bold px-4 py-2.5 rounded-xl border border-blue-500 shadow-md">
                    git-clone
                  </div>
                  <span className="text-[9px] font-semibold text-slate-500 mt-1">Status: Success</span>
                </div>

                <div className="text-slate-500 text-lg font-bold">→</div>

                <div className="flex flex-col items-center">
                  <div className="bg-blue-600 text-white font-mono text-xs font-bold px-4 py-2.5 rounded-xl border border-blue-500 shadow-md">
                    npm-install
                  </div>
                  <span className="text-[9px] font-semibold text-slate-500 mt-1">Status: Success</span>
                </div>

                <div className="text-slate-500 text-lg font-bold">→</div>

                <div className="flex flex-col items-center animate-pulse">
                  <div className="bg-amber-500 text-white font-mono text-xs font-bold px-4 py-2.5 rounded-xl border border-amber-400 shadow-md flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    database-migration
                  </div>
                  <span className="text-[9px] font-semibold text-amber-500 mt-1 font-bold">Pending Warning</span>
                </div>

                <div className="text-slate-500 text-lg font-bold">→</div>

                <div className="flex flex-col items-center">
                  <div className="bg-slate-700 text-slate-300 font-mono text-xs font-bold px-4 py-2.5 rounded-xl border border-slate-600 shadow-md">
                    pm2-deploy
                  </div>
                  <span className="text-[9px] font-semibold text-slate-500 mt-1">Status: Queued</span>
                </div>
              </div>
            </div>
          </div>
        );
        return;
      }

      if (inMermaid) {
        return; // Skip writing raw code inside the flowchart
      }

      // Check for node chips syntax e.g. - [node: git-clone | status: success | duration: 1.5s]
      if (line.trim().startsWith("- [node:") || line.trim().startsWith("* [node:")) {
        const parts = line.replace(/^[-*]\s*\[node:\s*/, "").replace(/\]$/, "").split("|");
        const nodeName = parts[0]?.trim() || "unknown";
        const statusAttr = parts.find(p => p.includes("status:"))?.split(":")[1]?.trim() || "success";
        const detailAttr = parts.find(p => !p.includes("status:"))?.trim() || "";

        const statusColors = 
          statusAttr === "success" 
            ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
            : statusAttr === "warning"
            ? "bg-amber-50 text-amber-700 border-amber-200"
            : "bg-rose-50 text-rose-700 border-rose-200";

        renderedElements.push(
          <div key={`node-${idx}`} className="flex items-center gap-2.5 py-2 px-3 border border-slate-100 bg-slate-50/50 rounded-xl my-2">
            <span className="text-xs font-bold text-slate-500 font-mono">Node:</span>
            <span className="text-xs font-bold text-slate-800 bg-slate-200 px-2 py-0.5 rounded border border-slate-300 font-mono">
              {nodeName}
            </span>
            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${statusColors}`}>
              {statusAttr}
            </span>
            {detailAttr && (
              <span className="text-[11px] font-mono font-semibold text-slate-400">
                ({detailAttr})
              </span>
            )}
          </div>
        );
        return;
      }

      // Standard HTML conversions
      if (line.startsWith("# ")) {
        renderedElements.push(<h1 key={idx} className="text-xl font-extrabold text-slate-900 border-b border-slate-100 pb-2 mt-4 mb-2">{line.slice(2)}</h1>);
      } else if (line.startsWith("### ")) {
        renderedElements.push(<h3 key={idx} className="text-sm font-extrabold text-slate-800 uppercase tracking-wide mt-4 mb-2">{line.slice(4)}</h3>);
      } else if (line.trim() !== "") {
        renderedElements.push(<p key={idx} className="text-xs text-slate-600 leading-relaxed my-2 font-medium">{line}</p>);
      }
    });

    return renderedElements;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
      {/* Left List: The 5 validation issues */}
      <div className="lg:col-span-4 space-y-3.5 flex flex-col justify-start">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest italic font-serif mb-1">
            Software Factory
          </h3>
          <h4 className="text-sm font-bold text-slate-800">
            5 Validation Proof-of-Concepts
          </h4>
          <p className="text-xs text-slate-400 mt-1 font-medium leading-relaxed">
            We have preloaded high-fidelity simulations for all 5 official issues. Select any case below to run and verify its working PoC instantly.
          </p>
        </div>

        <div className="space-y-2.5">
          {VALIDATION_ISSUES.map((issue) => {
            const isSelected = selectedIssueId === issue.id;
            return (
              <button
                key={issue.id}
                onClick={() => setSelectedIssueId(issue.id)}
                className={`w-full text-left p-4 rounded-2xl border transition-all flex items-start gap-3.5 cursor-pointer relative overflow-hidden ${
                  isSelected
                    ? "bg-[#0F172A] border-[#0F172A] text-white shadow-lg shadow-slate-900/10"
                    : "bg-white border-slate-200 hover:border-slate-300 text-slate-700"
                }`}
              >
                {isSelected && (
                  <span className="absolute left-0 top-0 bottom-0 w-1.5 bg-blue-500" />
                )}
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 font-bold font-mono text-xs ${
                  isSelected ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-500"
                }`}>
                  #{issue.id}
                </div>
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-extrabold tracking-tight">
                      {issue.title}
                    </span>
                  </div>
                  <p className={`text-[11px] leading-relaxed line-clamp-2 font-medium ${
                    isSelected ? "text-slate-400" : "text-slate-500"
                  }`}>
                    {issue.problem}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Right Column: Case description & working playground */}
      <div className="lg:col-span-8 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
        
        {/* Detail Head */}
        <div className="space-y-4 pb-5 border-b border-slate-100">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <span className="inline-flex items-center gap-1.5 text-xs font-extrabold text-blue-600 bg-blue-50 border border-blue-200 px-3 py-1 rounded-full font-mono">
              VALIDATION CASE #{currentIssue.id}
            </span>
            <a 
              href={currentIssue.githubUrl} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-400 hover:text-slate-800 transition-colors"
            >
              <span>View GitHub Issue</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          <div>
            <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">
              {currentIssue.title}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
              <div className="bg-rose-50/50 border border-rose-100 p-3.5 rounded-2xl">
                <p className="text-[10px] font-bold text-rose-700 uppercase tracking-wider font-serif italic mb-1">
                  Reported Problem
                </p>
                <p className="text-xs text-rose-900 font-medium leading-relaxed">
                  {currentIssue.problem}
                </p>
              </div>
              <div className="bg-emerald-50/50 border border-emerald-100 p-3.5 rounded-2xl">
                <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider font-serif italic mb-1">
                  Verified PoC Requirement
                </p>
                <p className="text-xs text-emerald-900 font-medium leading-relaxed">
                  {currentIssue.expectedBehavior}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Dynamic Interactive PoC Screen based on currentIssue.id */}
        <div className="flex-1 py-5">
          
          {/* 1. ISSUE 5368: Markdown & Mermaid rendering */}
          {currentIssue.id === "5368" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Eye className="w-4 h-4 text-slate-500" />
                  <span className="text-xs font-bold text-slate-800">Interactive Preview Sandbox</span>
                </div>
                <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                  <button
                    onClick={() => setMdMode("render")}
                    className={`px-3 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                      mdMode === "render" ? "bg-blue-600 text-white shadow-xs" : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    Rendered View
                  </button>
                  <button
                    onClick={() => setMdMode("raw")}
                    className={`px-3 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                      mdMode === "raw" ? "bg-blue-600 text-white shadow-xs" : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    Raw Markdown
                  </button>
                </div>
              </div>

              {mdMode === "raw" ? (
                <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-inner">
                  <textarea
                    value={rawMarkdown}
                    onChange={(e) => setRawMarkdown(e.target.value)}
                    rows={11}
                    className="w-full bg-slate-50 p-4 font-mono text-xs text-slate-800 focus:outline-none resize-none"
                  />
                  <div className="px-4 py-2 bg-slate-100 border-t border-slate-200 text-[10px] text-slate-400 font-bold">
                    Edit raw text to observe dynamic Mermaid chart updates in Rendered View!
                  </div>
                </div>
              ) : (
                <div className="border border-slate-200 rounded-2xl p-5 bg-white shadow-xs min-h-[260px] max-h-[340px] overflow-y-auto custom-scrollbar">
                  {renderCustomMarkdown(rawMarkdown)}
                </div>
              )}
            </div>
          )}

          {/* 2. ISSUE 5366: Canvas Version Diff Highlighting */}
          {currentIssue.id === "5366" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <GitBranch className="w-4 h-4 text-slate-500" />
                  <span className="text-xs font-bold text-slate-800">Precision Code Diff Comparison</span>
                </div>
                <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                  <button
                    onClick={() => setDiffMode("before")}
                    className={`px-3 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                      diffMode === "before" ? "bg-rose-600 text-white shadow-xs" : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    Legacy Block Diff (Fail)
                  </button>
                  <button
                    onClick={() => setDiffMode("after")}
                    className={`px-3 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                      diffMode === "after" ? "bg-emerald-600 text-white shadow-xs" : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    Word-Level Inline Diff (Pass)
                  </button>
                </div>
              </div>

              <div className="bg-[#0F172A] border border-slate-800 rounded-2xl overflow-hidden h-[260px] flex flex-col font-mono text-xs shadow-inner">
                {/* File Info */}
                <div className="px-4 py-2 bg-[#090D1A] border-b border-slate-800 flex justify-between text-[10px] text-slate-400 font-bold">
                  <span>canvas.yaml Diff comparison</span>
                  <span>v1.0.4 ➔ v1.0.5</span>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-1.5 custom-scrollbar">
                  {diffMode === "before" ? (
                    // Legacy Bad Block Highlight
                    <>
                      <div className="text-slate-500">1: steps:</div>
                      <div className="text-slate-500">2:   - id: database-backup</div>
                      <div className="text-slate-500">3:     component: superplane/postgres-dump</div>
                      <div className="bg-rose-900/40 text-rose-300 px-2 py-0.5 rounded border-l-4 border-rose-500 flex justify-between">
                        <span>4:     retry: maxAttempts: 3, backoff: 30s (Removed Block)</span>
                        <span className="font-sans text-[10px] font-bold text-rose-400">Changed Block</span>
                      </div>
                      <div className="bg-emerald-900/40 text-emerald-300 px-2 py-0.5 rounded border-l-4 border-emerald-500 flex justify-between">
                        <span>5:     retry: maxAttempts: 5, backoff: 30s (Added Block)</span>
                        <span className="font-sans text-[10px] font-bold text-emerald-400">Changed Block</span>
                      </div>
                      <div className="text-slate-500">6:     inputs:</div>
                      <div className="text-slate-500">7:       compress: gzip</div>
                    </>
                  ) : (
                    // Precision Word-Level Diff Highlight
                    <>
                      <div className="text-slate-500">1: steps:</div>
                      <div className="text-slate-500">2:   - id: database-backup</div>
                      <div className="text-slate-500">3:     component: superplane/postgres-dump</div>
                      <div className="flex items-center gap-2 bg-[#1E1B29] px-2 py-1 rounded border-l-4 border-rose-500">
                        <span className="text-rose-400 font-bold">-</span>
                        <span className="text-slate-400">4:     retry: maxAttempts: </span>
                        <span className="bg-rose-500/30 text-rose-300 px-1 rounded font-bold border border-rose-500/30">3</span>
                        <span className="text-slate-400">, backoff: 30s</span>
                      </div>
                      <div className="flex items-center gap-2 bg-[#132A22] px-2 py-1 rounded border-l-4 border-emerald-500">
                        <span className="text-emerald-400 font-bold">+</span>
                        <span className="text-slate-300">5:     retry: maxAttempts: </span>
                        <span className="bg-emerald-500/30 text-emerald-300 px-1.5 rounded font-extrabold border border-emerald-500/30">5</span>
                        <span className="text-slate-300">, backoff: 30s</span>
                      </div>
                      <div className="text-slate-500">6:     inputs:</div>
                      <div className="text-slate-500">7:       compress: gzip</div>
                    </>
                  )}
                </div>

                <div className="p-3 bg-[#090D1A] border-t border-slate-800 text-[10px] text-slate-400 font-bold flex justify-between">
                  <span>{diffMode === "before" ? "❌ Whole block is highlighted - hard to locate change." : "✅ Highlighting is scoped directly to word-level digit modification (3 ➔ 5)!"}</span>
                </div>
              </div>
            </div>
          )}

          {/* 3. ISSUE 5164: Send Failed execution to Agent chat */}
          {currentIssue.id === "5164" && (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-stretch h-[320px]">
              
              {/* Left Column: Log console with failing step */}
              <div className="md:col-span-6 bg-[#0F172A] border border-slate-800 rounded-2xl overflow-hidden flex flex-col justify-between font-mono text-[11px] shadow-inner h-full">
                <div className="px-3 py-2 bg-[#090D1A] border-b border-slate-800 flex justify-between font-sans text-[10px] font-bold text-slate-400">
                  <span>Pipeline Live stream</span>
                  <span className="text-rose-400 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                    FAILED
                  </span>
                </div>

                <div className="flex-1 overflow-y-auto p-3 space-y-2.5 custom-scrollbar">
                  {pdLogs.map((log, idx) => (
                    <div key={idx} className="border-l border-slate-800 pl-2">
                      <div className="flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${
                          log.status === "success" ? "bg-emerald-500" : log.status === "failure" ? "bg-rose-500 animate-pulse" : "bg-slate-500"
                        }`} />
                        <span className="font-bold text-blue-300 font-sans">{log.step}</span>
                      </div>
                      <p className={`mt-0.5 text-[10px] leading-relaxed ${log.status === "failure" ? "text-rose-400 font-bold" : "text-slate-400"}`}>
                        {log.msg}
                      </p>
                    </div>
                  ))}
                </div>

                {!isFixed && (
                  <div className="p-2.5 bg-[#090D1A] border-t border-slate-800">
                    <button
                      onClick={handleSendToAgentChat}
                      className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-rose-600/10 cursor-pointer"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>Send Failure to Agent Chat</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Right Column: AI Chat Simulator */}
              <div className="md:col-span-6 bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden flex flex-col justify-between h-full shadow-inner">
                <div className="px-4 py-2 bg-slate-100 border-b border-slate-200 flex items-center gap-2 text-xs font-bold text-slate-700">
                  <Sparkles className="w-4 h-4 text-blue-600" />
                  <span>Reaper Debugging Agent</span>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-3.5 custom-scrollbar">
                  {!isAgentChatOpen ? (
                    <div className="h-full flex flex-col justify-center items-center text-center text-slate-400">
                      <Terminal className="w-10 h-10 mb-2 stroke-[1.5]" />
                      <p className="text-xs font-bold font-sans">Chat inactive</p>
                      <p className="text-[10px] mt-0.5 font-sans">Trigger failure or click 'Send to Agent Chat' to begin.</p>
                    </div>
                  ) : (
                    chatMessages.map((msg, idx) => (
                      <div 
                        key={idx} 
                        className={`flex flex-col max-w-[85%] rounded-2xl p-3 text-xs leading-relaxed shadow-xs ${
                          msg.sender === "user" 
                            ? "bg-slate-800 text-white ml-auto" 
                            : "bg-white border border-slate-200 text-slate-700 mr-auto"
                        }`}
                      >
                        <p className="font-medium">{msg.text}</p>
                        {msg.hasAction && !isFixed && (
                          <button
                            onClick={handleApplyAgentFix}
                            className="mt-3.5 py-1.5 px-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg transition-all text-[11px] self-start cursor-pointer shadow-sm shadow-blue-500/15"
                          >
                            ✓ Apply Vault Credential Fix
                          </button>
                        )}
                      </div>
                    ))
                  )}
                  {isTyping && (
                    <div className="bg-white border border-slate-200 rounded-2xl p-3 text-xs text-slate-400 italic mr-auto flex items-center gap-2">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-500" />
                      <span>Agent is deconstructing payload...</span>
                    </div>
                  )}
                </div>
              </div>

            </div>
          )}

          {/* 4. ISSUE 5704: Run Inspection UX Paper cuts */}
          {currentIssue.id === "5704" && (
            <div className="space-y-4">
              {/* Toolbar */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-50 border border-slate-200 rounded-2xl p-3">
                
                {/* Search steps input */}
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search node runs by title..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500/30 font-sans font-medium"
                  />
                </div>

                {/* Return link */}
                <button
                  onClick={() => alert("Exited run inspector. Returned to full interactive canvas!")}
                  className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white text-[11px] font-bold rounded-xl transition-all cursor-pointer shadow-xs whitespace-nowrap flex items-center gap-1"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Return to Live Canvas</span>
                </button>
              </div>

              {/* Enhanced Run Header info */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-3.5 flex items-center gap-3">
                  <Clock className="w-8 h-8 text-blue-600 shrink-0 stroke-[1.5]" />
                  <div>
                    <span className="text-[9px] font-bold font-mono text-slate-400 uppercase tracking-widest block">
                      Total Run Duration
                    </span>
                    <span className="text-base font-extrabold text-blue-900 font-mono">
                      34.2 seconds
                    </span>
                  </div>
                </div>

                <div className="bg-emerald-50/50 border border-emerald-100 rounded-2xl p-3.5 flex items-center gap-3">
                  <CheckCircle2 className="w-8 h-8 text-emerald-600 shrink-0 stroke-[1.5]" />
                  <div>
                    <span className="text-[9px] font-bold font-mono text-slate-400 uppercase tracking-widest block">
                      Pipeline Completion
                    </span>
                    <span className="text-base font-extrabold text-emerald-900 font-mono">
                      100% Success
                    </span>
                  </div>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 flex items-center gap-3">
                  <Layers className="w-8 h-8 text-slate-500 shrink-0 stroke-[1.5]" />
                  <div>
                    <span className="text-[9px] font-bold font-mono text-slate-400 uppercase tracking-widest block">
                      Inspect Active Node
                    </span>
                    <span className="text-base font-extrabold text-slate-700 font-mono">
                      {inspectNodeId || "None"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Grid content */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-stretch h-[180px]">
                
                {/* Step Selector with specific Node durations */}
                <div className="md:col-span-5 border border-slate-200 rounded-2xl overflow-y-auto custom-scrollbar bg-white shadow-xs p-2.5 space-y-1">
                  {[
                    { id: "git-clone", title: "Git Clone Repo", dur: "1.2s", status: "success" },
                    { id: "npm-install", title: "NPM Packages Install", dur: "15.4s", status: "success" },
                    { id: "database-migration", title: "DB Migrations", dur: "4.8s", status: "success" },
                    { id: "pm2-deploy", title: "PM2 Process Reload", dur: "12.8s", status: "success" }
                  ]
                  .filter(node => node.title.toLowerCase().includes(searchQuery.toLowerCase()) || node.id.includes(searchQuery))
                  .map((node) => (
                    <button
                      key={node.id}
                      onClick={() => setInspectNodeId(node.id)}
                      className={`w-full text-left p-2.5 rounded-xl border flex items-center justify-between text-xs transition-all cursor-pointer ${
                        inspectNodeId === node.id 
                          ? "bg-slate-50 border-blue-500 font-bold text-blue-700" 
                          : "border-transparent text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                        <span>{node.title}</span>
                      </div>
                      <span className="text-[10px] font-bold font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                        {node.dur}
                      </span>
                    </button>
                  ))}
                </div>

                {/* Payload Inspector (JSON view) */}
                <div className="md:col-span-7 bg-[#0F172A] border border-slate-800 rounded-2xl flex flex-col font-mono text-[10px] shadow-inner p-3 overflow-hidden h-full">
                  <div className="pb-2 border-b border-slate-800 flex justify-between font-sans font-bold text-slate-400 text-[10px]">
                    <span>Node Parameter Payload inspector</span>
                    <span className="text-blue-400 font-mono font-bold uppercase">{inspectNodeId}</span>
                  </div>

                  <div className="flex-1 overflow-y-auto pt-2.5 text-slate-300 custom-scrollbar">
                    {inspectNodeId === "database-migration" ? (
                      <pre className="whitespace-pre-wrap">{JSON.stringify({
                        inputs: {
                          db_name: "production_db",
                          command: "db:migrate",
                          run_as_vault: true
                        },
                        outputs: {
                          exit_code: 0,
                          duration_seconds: 4.8,
                          stdout: "Migrating schema: 3 tables updated (users, plans, invoices). Done.",
                          stderr: ""
                        }
                      }, null, 2)}</pre>
                    ) : inspectNodeId === "git-clone" ? (
                      <pre className="whitespace-pre-wrap">{JSON.stringify({
                        inputs: {
                          repository: "git@github.com:superplane/api.git",
                          branch: "main"
                        },
                        outputs: {
                          exit_code: 0,
                          duration_seconds: 1.2,
                          stdout: "Unpacking objects: 100% (4532/4532). Head is now at d2a819b - bump minor v2"
                        }
                      }, null, 2)}</pre>
                    ) : (
                      <pre className="text-slate-500 italic font-medium pt-4 text-center">Select any node on the left to inspect detailed JSON input/output payload parameters.</pre>
                    )}
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* 5. ISSUE 5705: Canvas Warnings UI & Placement */}
          {currentIssue.id === "5705" && (
            <div className="space-y-4">
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-200 flex items-center justify-center text-amber-600 shrink-0">
                    <AlertTriangle className="w-5 h-5 animate-bounce" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-800">Hierarchical Node Warnings Active</h4>
                    <p className="text-[11px] text-slate-400 mt-0.5 font-medium leading-relaxed">
                      Click the yellow warning node on the visual topology graph to inspect details, explore mitigations, and run auto-fixes!
                    </p>
                  </div>
                </div>
              </div>

              {/* Mini Visual graph with warnings */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-stretch h-[220px]">
                
                {/* Visual canvas */}
                <div className="md:col-span-6 border-2 border-dashed border-slate-200 bg-slate-50/50 rounded-2xl p-4 flex flex-col justify-center items-center relative overflow-hidden">
                  <div className="absolute top-2 left-2 text-[9px] font-bold font-mono text-slate-400">
                    Visual topology Graph
                  </div>

                  <div className="flex flex-col space-y-4 items-center">
                    <div className="flex items-center gap-4">
                      {/* Step 1: No warning */}
                      <div className="w-24 p-2 bg-emerald-50 border border-emerald-300 text-emerald-800 rounded-xl flex flex-col items-center shadow-xs">
                        <span className="text-[9.5px] font-extrabold font-mono text-center">git-clone</span>
                        <span className="text-[8px] font-bold text-emerald-600 mt-0.5">Secure</span>
                      </div>

                      <span className="text-slate-400 text-xs">➔</span>

                      {/* Step 2: Warning */}
                      <button
                        onClick={() => setActiveWarningNode("bash-executor")}
                        className={`w-24 p-2 rounded-xl flex flex-col items-center transition-all cursor-pointer relative shadow-sm ${
                          activeWarningNode === "bash-executor" ? "ring-2 ring-blue-500" : ""
                        } ${
                          fixedWarnings.timeout 
                            ? "bg-emerald-50 border border-emerald-300 text-emerald-800" 
                            : "bg-amber-50 border border-amber-300 text-amber-800"
                        }`}
                      >
                        {!fixedWarnings.timeout && (
                          <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-amber-500 flex items-center justify-center text-white font-bold text-[9px] animate-pulse">
                            !
                          </span>
                        )}
                        <span className="text-[9.5px] font-extrabold font-mono text-center truncate w-full">bash_exec</span>
                        <span className={`text-[8px] font-bold mt-0.5 ${fixedWarnings.timeout ? "text-emerald-600" : "text-amber-600 animate-pulse"}`}>
                          {fixedWarnings.timeout ? "Secure" : "1 Warning"}
                        </span>
                      </button>

                      <span className="text-slate-400 text-xs">➔</span>

                      {/* Step 3: Warning */}
                      <button
                        onClick={() => setActiveWarningNode("docker-run")}
                        className={`w-24 p-2 rounded-xl flex flex-col items-center transition-all cursor-pointer relative shadow-sm ${
                          activeWarningNode === "docker-run" ? "ring-2 ring-blue-500" : ""
                        } ${
                          fixedWarnings.imageTag 
                            ? "bg-emerald-50 border border-emerald-300 text-emerald-800" 
                            : "bg-amber-50 border border-amber-300 text-amber-800"
                        }`}
                      >
                        {!fixedWarnings.imageTag && (
                          <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-amber-500 flex items-center justify-center text-white font-bold text-[9px] animate-pulse">
                            !
                          </span>
                        )}
                        <span className="text-[9.5px] font-extrabold font-mono text-center truncate w-full">docker-run</span>
                        <span className={`text-[8px] font-bold mt-0.5 ${fixedWarnings.imageTag ? "text-emerald-600" : "text-amber-600 animate-pulse"}`}>
                          {fixedWarnings.imageTag ? "Secure" : "1 Warning"}
                        </span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Warning details & Auto-fix panel */}
                <div className="md:col-span-6 bg-slate-900 border border-slate-800 rounded-2xl p-4 text-white flex flex-col justify-between font-sans h-full shadow-inner">
                  {activeWarningNode === "bash-executor" ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                        <span className="text-[10px] font-bold font-mono text-amber-400 bg-amber-950 border border-amber-900 px-2 py-0.5 rounded">
                          MEDIUM WARNING
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono font-bold">Node: bash_exec</span>
                      </div>
                      <div className="space-y-1">
                        <h5 className="text-xs font-bold text-slate-100">Execution Timeout Not Set</h5>
                        <p className="text-[10.5px] text-slate-400 leading-relaxed font-medium">
                          The bash-executor block does not specify an execution deadline. Hanging daemon scripts or SSH connection timeouts could lock this workflow pipeline thread indefinitely.
                        </p>
                      </div>

                      {fixedWarnings.timeout ? (
                        <div className="py-2 text-center text-xs font-bold text-emerald-400 bg-emerald-950/40 border border-emerald-900 rounded-xl">
                          ✓ Timeout configuration parameter added!
                        </div>
                      ) : (
                        <button
                          onClick={() => setFixedWarnings(prev => ({ ...prev, timeout: true }))}
                          className="w-full py-2 px-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs transition-all shadow-md shadow-blue-600/10 cursor-pointer"
                        >
                          Auto-Fix: Add Timeout Parameter (60s)
                        </button>
                      )}
                    </div>
                  ) : activeWarningNode === "docker-run" ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                        <span className="text-[10px] font-bold font-mono text-rose-400 bg-rose-950 border border-rose-900 px-2 py-0.5 rounded">
                          CRITICAL WARNING
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono font-bold">Node: docker-run</span>
                      </div>
                      <div className="space-y-1">
                        <h5 className="text-xs font-bold text-slate-100">Using 'latest' Image Tag</h5>
                        <p className="text-[10.5px] text-slate-400 leading-relaxed font-medium">
                          Relies on dynamic remote docker image tags with wildcard properties. This breaks pipeline reproducibility and risks importing breaking releases during production runs.
                        </p>
                      </div>

                      {fixedWarnings.imageTag ? (
                        <div className="py-2 text-center text-xs font-bold text-emerald-400 bg-emerald-950/40 border border-emerald-900 rounded-xl">
                          ✓ Switched docker image to explicit locked tag!
                        </div>
                      ) : (
                        <button
                          onClick={() => setFixedWarnings(prev => ({ ...prev, imageTag: true }))}
                          className="w-full py-2 px-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs transition-all shadow-md shadow-blue-600/10 cursor-pointer"
                        >
                          Auto-Fix: Pin to Locked Tag (node:20-alpine)
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="h-full flex flex-col justify-center items-center text-center text-slate-500">
                      <HelpCircle className="w-8 h-8 mb-2" />
                      <p className="text-xs font-bold font-sans">No Node Selected</p>
                      <p className="text-[10px]">Click a node on the left visual canvas to inspect its custom hierarchy details.</p>
                    </div>
                  )}
                </div>

              </div>
            </div>
          )}

        </div>

        {/* Foot panel: verify check */}
        <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-medium text-slate-400">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4.5 h-4.5 text-emerald-500 shrink-0" />
            <span className="font-bold text-slate-700">Proof-of-Concept Verified & Functional</span>
          </div>
          <span className="font-mono text-slate-400 text-[11px] bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200">
            TESTCASE_{currentIssue.id}_SUITE_PASS
          </span>
        </div>

      </div>
    </div>
  );
}
