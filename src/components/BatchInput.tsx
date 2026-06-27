import React, { useState } from "react";
import { Github, FolderGit, Play, ExternalLink, Loader2, AlertCircle, Download } from "lucide-react";
import JSZip from "jszip";
import { BatchResult } from "../types";
import StatusBadge from "./StatusBadge";

export default function BatchInput({ dryRun }: { dryRun: boolean }) {
  const [repoUrl, setRepoUrl] = useState("");
  const [branch, setBranch] = useState("main");
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressText, setProgressText] = useState("");
  const [results, setResults] = useState<BatchResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleDownloadZip = async () => {
    const successfulResults = results.filter((item) => item.status === "success" && item.canvasYaml);
    if (successfulResults.length === 0) return;

    const zip = new JSZip();

    // Create a README file to document the export
    let readmeContent = `# Consolidated SuperPlane Configurations\n\n`;
    readmeContent += `Exported from Batch Mode of Script Reaper.\n`;
    readmeContent += `Source Repository: ${repoUrl}\n`;
    if (branch) readmeContent += `Branch: ${branch}\n`;
    readmeContent += `Export Time: ${new Date().toLocaleString()}\n\n`;
    readmeContent += `## Converted Configurations\n\n`;

    successfulResults.forEach((item) => {
      const originalPath = item.file;
      const basePath = originalPath.replace(/\.[^/.]+$/, ""); // strip .sh
      const yamlPath = `${basePath}.yaml`;
      const jsonPath = `${basePath}.json`;

      if (item.canvasYaml) {
        zip.file(yamlPath, item.canvasYaml);
      }
      if (item.canvasJson) {
        zip.file(jsonPath, JSON.stringify(item.canvasJson, null, 2));
      }

      readmeContent += `- **${originalPath}** -> Converted to \`${yamlPath}\` & \`${jsonPath}\` (Canvas ID: ${item.canvasId || "N/A"})\n`;
    });

    zip.file("README.md", readmeContent);

    try {
      const content = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(content);
      const link = document.createElement("a");
      link.href = url;
      
      let repoName = "repo";
      try {
        const parts = repoUrl.split("/");
        repoName = parts[parts.length - 1] || parts[parts.length - 2] || "repo";
        repoName = repoName.replace(/\.git$/, "");
      } catch (e) {}
      
      link.download = `superplane-configs-${repoName}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to generate ZIP archive:", err);
    }
  };

  const handleScan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!repoUrl.trim()) {
      setError("Please specify a public GitHub repository URL.");
      return;
    }

    setLoading(true);
    setError(null);
    setResults([]);
    setProgress(5);
    setProgressText("Initializing connection to GitHub API...");

    // Simulate progress updates for a premium feel
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) return prev;
        const inc = Math.floor(Math.random() * 8) + 3;
        const current = prev + inc;

        if (current > 80) {
          setProgressText("Resolving schema-locked AST configurations...");
        } else if (current > 60) {
          setProgressText("Applying Google Gemini 3.5-Flash workflow translation...");
        } else if (current > 40) {
          setProgressText("Extracting timing metrics and cron annotations...");
        } else if (current > 20) {
          setProgressText("Discovered .sh scripts. Scanning contents...");
        }
        return current;
      });
    }, 600);

    try {
      const res = await fetch("/api/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repoUrl, branch, dryRun }),
      });

      clearInterval(progressInterval);

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error?.message || "Failed to parse repository content.");
      }

      const data = await res.json();
      setProgress(100);
      setProgressText("All scripts compiled!");
      setResults(data.results || []);
    } catch (err: any) {
      clearInterval(progressInterval);
      setError(err?.message || "Connection timed out. Please verify GitHub URL.");
      setProgress(0);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleScan} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
              GitHub Public Repository URL
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Github className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
                placeholder="e.g. https://github.com/superplanehq/superplane"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-sans font-medium"
              />
            </div>
          </div>

          <div className="w-full md:w-32">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
              Branch Name
            </label>
            <input
              type="text"
              value={branch}
              onChange={(e) => setBranch(e.target.value)}
              placeholder="main"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-sans text-center font-mono font-medium"
            />
          </div>
        </div>

        {error && (
          <div className="flex items-start gap-2.5 bg-rose-50 border border-rose-200 rounded-xl p-3.5 text-rose-700 text-xs font-sans font-medium">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !repoUrl.trim()}
          className={`w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl text-sm font-semibold transition-all shadow-md cursor-pointer ${
            loading || !repoUrl.trim()
              ? "bg-slate-200 text-slate-400 cursor-not-allowed shadow-none border border-slate-200"
              : "bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/10 active:scale-[0.99]"
          }`}
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Scanning Repository Structure...</span>
            </>
          ) : (
            <>
              <FolderGit className="w-4 h-4" />
              <span>Scan Repository & Convert Scripts</span>
            </>
          )}
        </button>
      </form>

      {/* Progress display */}
      {loading && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3 shadow-sm border-l-4 border-l-blue-600">
          <div className="flex justify-between items-center text-xs">
            <span className="font-bold text-slate-800 uppercase tracking-wide">{progressText}</span>
            <span className="font-bold text-blue-600 font-mono">{progress}%</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <p className="text-[10px] text-slate-400 font-medium italic">
            Scanning and converting batch configurations...
          </p>
        </div>
      )}

      {/* Results table */}
      {results.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex justify-between items-center gap-4">
            <span className="text-xs font-bold text-slate-800">Repository Execution Matrix</span>
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded bg-blue-50 text-blue-600 border border-blue-100 shrink-0">
                {results.length} SCRIPTS DETECTED
              </span>
              {results.some((item) => item.status === "success" && item.canvasYaml) && (
                <button
                  type="button"
                  onClick={handleDownloadZip}
                  className="inline-flex items-center gap-1.5 py-1 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold transition-all border border-emerald-700 shadow-sm cursor-pointer active:scale-95 shrink-0"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export Consolidated ZIP</span>
                </button>
              )}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-sans">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">File Location</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Canvas ID</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 font-semibold">
                {results.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-3.5 font-mono text-slate-500 max-w-[200px] truncate">
                      {item.file}
                    </td>
                    <td className="px-4 py-3.5">
                      <StatusBadge status={item.status} />
                    </td>
                    <td className="px-4 py-3.5 font-mono text-blue-600">
                      {item.canvasId || "—"}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      {item.status === "success" && item.canvasId ? (
                        <a
                          href={`https://app.superplane.com/canvases/${item.canvasId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 py-1 px-2.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 text-[11px] font-bold transition-all border border-blue-100 cursor-pointer"
                        >
                          <span>Review</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      ) : (
                        <span className="text-slate-400 text-[10px] italic font-medium">
                          {item.error || "Execution failed."}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
