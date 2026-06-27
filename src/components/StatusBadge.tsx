import React from "react";
import { Loader2, CheckCircle2, XCircle, PlayCircle, HelpCircle } from "lucide-react";

interface StatusBadgeProps {
  status: "pending" | "running" | "success" | "failure" | "error" | string;
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  switch (status) {
    case "success":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-sm">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          Success
        </span>
      );
    case "failure":
    case "error":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200 shadow-sm">
          <XCircle className="w-3.5 h-3.5 text-rose-600" />
          Error
        </span>
      );
    case "running":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 shadow-sm animate-pulse">
          <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
          Running
        </span>
      );
    case "pending":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200 shadow-sm">
          <PlayCircle className="w-3.5 h-3.5 text-slate-400" />
          Pending
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
          <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
          {status}
        </span>
      );
  }
}
