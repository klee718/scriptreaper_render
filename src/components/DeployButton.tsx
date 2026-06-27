import React from "react";
import { ArrowUpRight } from "lucide-react";

export default function DeployButton() {
  const deployUrl = "https://render.com/deploy?repo=https://github.com/superplane/scriptreaper";

  return (
    <div className="bg-gradient-to-r from-slate-900 to-slate-800 border border-slate-700 rounded-2xl p-5 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
      <div className="flex items-center gap-3.5 text-center md:text-left">
        {/* Simple geometric render-style logo */}
        <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center font-bold text-lg text-white shadow-lg shadow-blue-600/30 shrink-0">
          R
        </div>
        <div>
          <h3 className="text-sm font-bold text-white">Deploy ScriptReaper to Cloud Production</h3>
          <p className="text-xs text-slate-300 mt-0.5 font-medium">
            Deploy the Express API + Static Dashboard automatically onto Render in one-click.
          </p>
        </div>
      </div>

      <div className="w-full md:w-auto text-center shrink-0">
        <a
          href={deployUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full md:w-auto inline-flex items-center justify-center gap-1.5 px-6 py-3.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 active:scale-[0.99] shadow-lg shadow-blue-600/10 transition-all border border-blue-500/20 cursor-pointer"
        >
          <span>Deploy to Render</span>
          <ArrowUpRight className="w-3.5 h-3.5" />
        </a>
      </div>
    </div>
  );
}
