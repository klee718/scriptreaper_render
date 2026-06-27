import React, { useState, useMemo } from "react";
import { 
  Play, 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  HelpCircle, 
  Workflow, 
  Layers, 
  Settings, 
  Clock, 
  ShieldAlert, 
  FileText, 
  Terminal, 
  ExternalLink,
  ChevronRight,
  Database,
  Cpu,
  RefreshCw,
  Bell
} from "lucide-react";
import { CanvasDefinition, LogLine } from "../types";

interface TopologyGraphProps {
  canvasJson?: CanvasDefinition;
  logs?: LogLine[];
}

export default function TopologyGraph({ canvasJson, logs = [] }: TopologyGraphProps) {
  const [selectedStepId, setSelectedStepId] = useState<string | null>(null);

  // Default fallback if canvasJson is missing
  const activeCanvas = useMemo(() => {
    if (canvasJson) return canvasJson;
    return {
      version: 1,
      name: "legacy-workflow",
      trigger: { type: "manual" },
      steps: [
        {
          id: "step-1",
          name: "Initialize Workspace",
          component: "superplane/bash-executor",
          description: "Initialize target sandbox workspace directory structure."
        }
      ]
    } as CanvasDefinition;
  }, [canvasJson]);

  // Compute live step status based on current streaming log lines
  const stepStatuses = useMemo(() => {
    const statuses: Record<string, "pending" | "running" | "success" | "failure"> = {};
    
    // Initialize all to pending
    activeCanvas.steps.forEach(step => {
      statuses[step.id] = "pending";
    });

    // Update with real log lines in order
    logs.forEach(log => {
      const stepId = log.step || "";
      if (stepId && statuses[stepId] !== undefined) {
        statuses[stepId] = log.status;
      }
    });

    return statuses;
  }, [activeCanvas, logs]);

  // Compute dependency depth to perform simple column-based DAG layout
  const stepLayout = useMemo(() => {
    const depths: Record<string, number> = {};
    const steps = activeCanvas.steps;

    // Helper to calculate depth recursively
    const getDepth = (id: string, visited: Set<string> = new Set()): number => {
      if (depths[id] !== undefined) return depths[id];
      if (visited.has(id)) return 0; // Prevent infinite cycle crashes
      
      visited.add(id);
      const step = steps.find(s => s.id === id);
      if (!step || !step.dependsOn || step.dependsOn.length === 0) {
        depths[id] = 0;
        return 0;
      }

      let maxDepDepth = -1;
      step.dependsOn.forEach(depId => {
        maxDepDepth = Math.max(maxDepDepth, getDepth(depId, visited));
      });

      depths[id] = maxDepDepth + 1;
      return depths[id];
    };

    steps.forEach(step => {
      getDepth(step.id);
    });

    // Group steps by their computed depth column
    const columns: Record<number, string[]> = {};
    steps.forEach(step => {
      const depth = depths[step.id] || 0;
      if (!columns[depth]) columns[depth] = [];
      columns[depth].push(step.id);
    });

    // Determine grid coordinates for each step
    const coords: Record<string, { x: number; y: number; column: number; index: number }> = {};
    const columnKeys = Object.keys(columns).map(Number).sort((a, b) => a - b);
    
    const colWidth = 260; // horizontal spacing
    const rowHeight = 110; // vertical spacing
    const startX = 60;
    const startY = 50;

    columnKeys.forEach((col, colIdx) => {
      const stepIdsInCol = columns[col];
      const colX = startX + colIdx * colWidth;
      
      stepIdsInCol.forEach((stepId, index) => {
        // Center the rows vertically depending on how many nodes are in this column
        const offsetMultiplier = (index - (stepIdsInCol.length - 1) / 2);
        const colY = startY + 120 + offsetMultiplier * rowHeight;
        coords[stepId] = {
          x: colX,
          y: colY,
          column: colIdx,
          index
        };
      });
    });

    return { coords, depths, maxColumn: columnKeys.length };
  }, [activeCanvas]);

  const selectedStep = useMemo(() => {
    if (!selectedStepId) return null;
    return activeCanvas.steps.find(s => s.id === selectedStepId) || null;
  }, [activeCanvas, selectedStepId]);

  // Set default selection to the first step if nothing is selected
  React.useEffect(() => {
    if (activeCanvas.steps.length > 0 && !selectedStepId) {
      setSelectedStepId(activeCanvas.steps[0].id);
    }
  }, [activeCanvas, selectedStepId]);

  // Helper to get component icon
  const getComponentIcon = (component: string) => {
    const compLower = component.toLowerCase();
    if (compLower.includes("bash") || compLower.includes("command") || compLower.includes("script")) {
      return <Terminal className="w-4 h-4 text-blue-500" />;
    }
    if (compLower.includes("postgres") || compLower.includes("dump") || compLower.includes("sql") || compLower.includes("db") || compLower.includes("s3") || compLower.includes("bucket")) {
      return <Database className="w-4 h-4 text-violet-500" />;
    }
    if (compLower.includes("slack") || compLower.includes("notify") || compLower.includes("alert") || compLower.includes("email") || compLower.includes("notifier")) {
      return <Bell className="w-4 h-4 text-amber-500" />;
    }
    if (compLower.includes("npm") || compLower.includes("build") || compLower.includes("compile") || compLower.includes("git")) {
      return <Cpu className="w-4 h-4 text-emerald-500" />;
    }
    return <Settings className="w-4 h-4 text-slate-500" />;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "success":
        return {
          bg: "bg-emerald-50 border-emerald-300 shadow-emerald-100",
          text: "text-emerald-800",
          indicator: "bg-emerald-500",
          icon: <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
        };
      case "running":
        return {
          bg: "bg-blue-50 border-blue-400 shadow-blue-100 animate-pulse",
          text: "text-blue-800",
          indicator: "bg-blue-500 animate-ping",
          icon: <Loader2 className="w-4 h-4 text-blue-600 animate-spin shrink-0" />
        };
      case "failure":
        return {
          bg: "bg-rose-50 border-rose-300 shadow-rose-100",
          text: "text-rose-800",
          indicator: "bg-rose-500",
          icon: <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
        };
      case "pending":
      default:
        return {
          bg: "bg-slate-50 border-slate-200 shadow-slate-50",
          text: "text-slate-600",
          indicator: "bg-slate-300",
          icon: <Clock className="w-4 h-4 text-slate-400 shrink-0" />
        };
    }
  };

  // Generate SVG paths for dependency connections
  const dependencyConnections = useMemo(() => {
    const lines: Array<{
      key: string;
      d: string;
      isActive: boolean;
      status: string;
    }> = [];

    activeCanvas.steps.forEach(step => {
      const targetCoords = stepLayout.coords[step.id];
      if (!targetCoords) return;

      if (step.dependsOn && step.dependsOn.length > 0) {
        step.dependsOn.forEach(depId => {
          const sourceCoords = stepLayout.coords[depId];
          if (!sourceCoords) return;

          // Compute horizontal starting/ending points for clean bezier routing
          const x1 = sourceCoords.x + 200; // width of node is 200px
          const y1 = sourceCoords.y + 35;  // vertical center of node (height ~70px)
          const x2 = targetCoords.x;
          const y2 = targetCoords.y + 35;

          // Bezier control points for smooth left-to-right curve
          const ctrlX1 = x1 + 50;
          const ctrlY1 = y1;
          const ctrlX2 = x2 - 50;
          const ctrlY2 = y2;

          const pathD = `M ${x1} ${y1} C ${ctrlX1} ${ctrlY1}, ${ctrlX2} ${ctrlY2}, ${x2} ${y2}`;
          const sourceStatus = stepStatuses[depId] || "pending";
          const targetStatus = stepStatuses[step.id] || "pending";

          lines.push({
            key: `${depId}->${step.id}`,
            d: pathD,
            isActive: sourceStatus === "running" || targetStatus === "running",
            status: targetStatus === "pending" && sourceStatus !== "success" ? "pending" : sourceStatus
          });
        });
      }
    });

    return lines;
  }, [activeCanvas, stepLayout, stepStatuses]);

  // Determine width of the SVG viewport based on step column layout
  const svgWidth = Math.max(760, (stepLayout.maxColumn * 260) + 100);

  return (
    <div className="flex flex-col bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm h-full">
      {/* Topology Header */}
      <div className="flex items-center justify-between px-5 py-3.5 bg-slate-50 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <Workflow className="w-4.5 h-4.5 text-blue-600" />
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider font-mono">
            Interactive Topology DAG Map
          </h3>
        </div>
        <div className="flex items-center gap-4 text-[10px] font-semibold text-slate-400">
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-slate-300"></span>
            <span>Pending</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping"></span>
            <span className="text-blue-600">Running</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span className="text-emerald-600">Success</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-rose-500"></span>
            <span className="text-rose-600">Failed</span>
          </div>
        </div>
      </div>

      {/* Main Canvas Scroll Area */}
      <div className="flex-1 overflow-auto bg-slate-900 relative min-h-[300px] h-[350px] custom-scrollbar selection:bg-transparent">
        {/* Dotted Grid Overlay Background */}
        <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px] opacity-60"></div>
        
        {/* SVG Bezier Arrow Connections */}
        <svg 
          className="absolute inset-0 pointer-events-none" 
          style={{ width: svgWidth, height: "100%" }}
        >
          {/* Marker definition for directional arrows */}
          <defs>
            <marker
              id="arrow"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 1 L 10 5 L 0 9 z" fill="#475569" />
            </marker>
            <marker
              id="arrow-active"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 1 L 10 5 L 0 9 z" fill="#3b82f6" />
            </marker>
            <marker
              id="arrow-success"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 1 L 10 5 L 0 9 z" fill="#10b981" />
            </marker>
          </defs>

          {/* Draw connecting lines */}
          {dependencyConnections.map((line) => {
            let strokeColor = "#334155"; // Dark default line
            let strokeWidth = "2";
            let markerId = "arrow";
            let isAnimated = false;

            if (line.status === "success") {
              strokeColor = "#059669"; // Green line for completed deps
              strokeWidth = "2.5";
              markerId = "arrow-success";
            } else if (line.status === "running") {
              strokeColor = "#2563eb"; // Pulsing active blue line
              strokeWidth = "2.5";
              markerId = "arrow-active";
              isAnimated = true;
            } else if (line.isActive) {
              strokeColor = "#3b82f6";
              strokeWidth = "2.5";
              isAnimated = true;
            }

            return (
              <path
                key={line.key}
                d={line.d}
                fill="none"
                stroke={strokeColor}
                strokeWidth={strokeWidth}
                strokeDasharray={isAnimated ? "6,4" : undefined}
                className={isAnimated ? "animate-dash" : undefined}
                style={{
                  strokeDashoffset: isAnimated ? 0 : undefined,
                  animation: isAnimated ? "dash 1s linear infinite" : undefined,
                }}
                markerEnd={`url(#${markerId})`}
              />
            );
          })}
        </svg>

        {/* CSS keyframe inject for connection dash line animations */}
        <style dangerouslySetInnerHTML={{__html: `
          @keyframes dash {
            to {
              stroke-dashoffset: -20;
            }
          }
        `}} />

        {/* Node container wrapper */}
        <div className="absolute top-0 left-0 p-4" style={{ width: svgWidth, height: "100%" }}>
          {activeCanvas.steps.map((step) => {
            const coord = stepLayout.coords[step.id];
            if (!coord) return null;

            const status = stepStatuses[step.id] || "pending";
            const colors = getStatusColor(status);
            const isSelected = selectedStepId === step.id;

            return (
              <button
                key={step.id}
                onClick={() => setSelectedStepId(step.id)}
                className={`absolute w-[210px] h-[72px] rounded-xl border p-3 flex flex-col justify-between text-left transition-all duration-200 cursor-pointer shadow-sm group select-none ${colors.bg} ${
                  isSelected 
                    ? "ring-2 ring-offset-2 ring-offset-slate-900 ring-blue-500 scale-[1.03] z-10" 
                    : "hover:scale-[1.01] hover:border-slate-400 hover:shadow"
                }`}
                style={{
                  left: coord.x,
                  top: coord.y,
                }}
              >
                {/* Node Top Row: Component Icon & Node Status Dot */}
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <div className="bg-white p-1 rounded-md border border-slate-200 shrink-0">
                      {getComponentIcon(step.component)}
                    </div>
                    <span className="text-[10px] font-bold font-mono text-slate-400 uppercase truncate">
                      {step.component.split("/")[1] || step.component}
                    </span>
                  </div>
                  
                  {/* Status indicator pill */}
                  <span className={`w-2 h-2 rounded-full ${colors.indicator}`} />
                </div>

                {/* Node Bottom Row: Title / Name */}
                <div className="flex items-center justify-between mt-1 min-w-0">
                  <h4 className={`text-xs font-bold truncate pr-2 ${status === 'pending' ? 'text-slate-700' : 'text-slate-900'}`}>
                    {step.name}
                  </h4>
                  <ChevronRight className={`w-3.5 h-3.5 text-slate-400 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity`} />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Node Inspector Details Drawer panel */}
      {selectedStep && (
        <div className="bg-slate-50 border-t border-slate-100 p-5 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
            
            {/* Inspector Left: Step Information */}
            <div className="md:col-span-7 space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded bg-blue-100 text-blue-800 border border-blue-200 uppercase">
                  {selectedStep.id}
                </span>
                <span className="text-xs font-semibold text-slate-400">|</span>
                <p className="text-xs font-bold text-slate-500 font-mono flex items-center gap-1">
                  Component: <span className="text-slate-800 font-bold">{selectedStep.component}</span>
                </p>
              </div>

              <div>
                <h4 className="text-sm font-bold text-slate-900">{selectedStep.name}</h4>
                <p className="text-xs text-slate-500 mt-1 font-medium leading-relaxed">
                  {selectedStep.description || "No customized detailed description was generated for this workflow step."}
                </p>
              </div>

              {/* Dynamic Inputs Parameter Badges */}
              {selectedStep.inputs && Object.keys(selectedStep.inputs).length > 0 && (
                <div className="space-y-1.5 pt-1.5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">Parameters & Inputs</p>
                  <div className="flex flex-wrap gap-1.5">
                    {Object.entries(selectedStep.inputs).map(([key, value]) => (
                      <div key={key} className="inline-flex items-center rounded-lg bg-slate-200/60 border border-slate-300/40 px-2.5 py-1 text-[11px] font-semibold text-slate-700">
                        <span className="font-mono text-slate-500 mr-1.5">{key}:</span>
                        <code className="font-mono text-slate-800 text-xs font-bold max-w-[240px] truncate">
                          {typeof value === "object" ? JSON.stringify(value) : String(value)}
                        </code>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Inspector Right: Safety Policies (Retries, runWhen) */}
            <div className="md:col-span-5 bg-white border border-slate-200 rounded-xl p-4 space-y-3 shadow-inner">
              <h5 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono pb-2 border-b border-slate-100 flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5 text-slate-400" />
                Error & Execution Policies
              </h5>

              <div className="grid grid-cols-2 gap-4">
                {/* Policy: Retries */}
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-slate-400 font-sans">Retry Strategy</p>
                  <div className="flex items-center gap-1.5">
                    <RefreshCw className="w-4 h-4 text-slate-500" />
                    <span className="text-xs font-bold text-slate-800">
                      {selectedStep.retry ? (
                        `${selectedStep.retry.maxAttempts} attempts (${selectedStep.retry.backoffSeconds}s delay)`
                      ) : (
                        "No automatic retry"
                      )}
                    </span>
                  </div>
                </div>

                {/* Policy: runWhen condition */}
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-slate-400 font-sans">Execution Rule</p>
                  <div className="flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-slate-500" />
                    <span className="text-xs font-bold text-slate-800">
                      {selectedStep.runWhen ? (
                        `runWhen: ${selectedStep.runWhen}`
                      ) : (
                        "runWhen: success"
                      )}
                    </span>
                  </div>
                </div>
              </div>

              {/* Dependencies info */}
              {selectedStep.dependsOn && selectedStep.dependsOn.length > 0 && (
                <div className="pt-2 border-t border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 font-sans mb-1.5">Awaits Upstream Steps</p>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedStep.dependsOn.map(depId => (
                      <span key={depId} className="inline-flex items-center rounded-md bg-blue-50 text-blue-700 border border-blue-100 px-2 py-0.5 text-[10px] font-bold font-mono">
                        {depId}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
