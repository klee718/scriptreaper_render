import React, { useState, useRef, useEffect } from "react";
import { Upload, Code, AlertCircle, ArrowRight, FileCode } from "lucide-react";
import { DemoScript } from "../types";

interface ScriptInputProps {
  onConvert: (script: string, name?: string) => void;
  loading: boolean;
}

export default function ScriptInput({ onConvert, loading }: ScriptInputProps) {
  const [script, setScript] = useState("");
  const [preferredName, setPreferredName] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [demoScripts, setDemoScripts] = useState<DemoScript[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Fetch demo scripts from our Express API on mount
    fetch("/api/demo-scripts")
      .then((res) => res.json())
      .then((data) => setDemoScripts(data))
      .catch((err) => console.error("Error loading demo scripts:", err));
  }, []);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const processFile = (file: File) => {
    if (!file.name.endsWith(".sh") && !file.name.endsWith(".txt")) {
      setError("Please upload a valid bash script (.sh) or text file.");
      return;
    }
    setError(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      setScript(text);
      // Derive name from filename
      const baseName = file.name.replace(/\.[^/.]+$/, "");
      setPreferredName(baseName);
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!script.trim()) {
      setError("Please paste or upload a bash script to convert.");
      return;
    }
    if (script.length > 50000) {
      setError("Script is too long! Max characters: 50,000.");
      return;
    }
    setError(null);
    onConvert(script, preferredName);
  };

  const loadDemo = (demo: DemoScript) => {
    setScript(demo.script);
    setPreferredName(demo.id + "-workflow");
    setError(null);
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
            Workflow Name (Optional)
          </label>
          <input
            type="text"
            placeholder="e.g. production-deploy-alert"
            value={preferredName}
            onChange={(e) => setPreferredName(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-sans text-sm font-medium"
          />
        </div>

        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
              Bash Script Content
            </label>
            <span
              className={`text-xs font-mono font-medium ${
                script.length > 45000 ? "text-rose-500 font-bold" : "text-slate-400"
              }`}
            >
              {script.length.toLocaleString()} / 50,000 chars
            </span>
          </div>

          <div
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            className={`relative group border-2 border-dashed rounded-xl transition-all ${
              dragActive
                ? "border-blue-500 bg-blue-50/50"
                : "border-slate-200 bg-slate-50 hover:border-slate-300"
            }`}
          >
            <textarea
              value={script}
              onChange={(e) => setScript(e.target.value)}
              placeholder="#!/bin/bash&#10;# Paste your script or drag-and-drop here..."
              rows={12}
              className="w-full bg-transparent border-0 rounded-xl p-4 font-mono text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-0 resize-y"
            />

            {script.length === 0 && (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center p-6 group-hover:scale-[1.01] transition-transform"
              >
                <Upload className="w-10 h-10 text-slate-400 mb-2 group-hover:text-blue-500 transition-colors" />
                <p className="text-slate-600 text-sm font-semibold">
                  Drag and drop your <span className="text-blue-600">.sh script</span> here
                </p>
                <p className="text-slate-400 text-xs mt-1 font-medium">
                  or click anywhere to browse local files
                </p>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept=".sh,.txt"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>
        </div>

        {error && (
          <div className="flex items-start gap-2.5 bg-rose-50 border border-rose-200 rounded-xl p-3.5 text-rose-700 text-xs">
            <AlertCircle className="w-4.5 h-4.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !script.trim()}
          className={`w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl text-sm font-semibold transition-all shadow-md cursor-pointer ${
            loading || !script.trim()
              ? "bg-slate-200 text-slate-400 cursor-not-allowed shadow-none border border-slate-200"
              : "bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/10 active:scale-[0.99]"
          }`}
        >
          {loading ? (
            <>
              <svg className="animate-spin h-5 w-5 text-blue-200" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Reaping Script & Optimizing Workflow...</span>
            </>
          ) : (
            <>
              <Code className="w-4 h-4" />
              <span>Bury Bash & Create Canvas</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>

      {/* Demo scripts selector */}
      {demoScripts.length > 0 && (
        <div className="pt-4 border-t border-slate-100">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2.5 italic font-serif">
            Load Hackathon Demo script
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {demoScripts.map((demo) => (
              <button
                key={demo.id}
                onClick={() => loadDemo(demo)}
                type="button"
                className="flex items-center gap-2 justify-center py-2.5 px-3 rounded-xl border border-slate-200 hover:border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-800 text-xs font-semibold transition-all cursor-pointer"
              >
                <FileCode className="w-3.5 h-3.5 text-slate-400" />
                {demo.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
