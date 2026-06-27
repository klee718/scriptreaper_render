export interface AnalysisResult {
  intent: string;
  triggerType: string;
  cronExpression?: string;
  stepCount: number;
  riskFlags: string[];
}

export interface CanvasDefinition {
  version: number;
  name: string;
  trigger: {
    type: "schedule" | "manual" | "webhook";
    schedule?: { cron: string };
    webhook?: { source?: string; event?: string };
  };
  steps: Array<{
    id: string;
    name: string;
    description?: string;
    component: string;
    dependsOn?: string[];
    runWhen?: "always" | "success" | "failure";
    inputs?: Record<string, any>;
    retry?: {
      maxAttempts: number;
      backoffSeconds: number;
    };
  }>;
}

export interface ConvertResult {
  id: string;
  name: string;
  script: string;
  canvasYaml: string;
  analysis: AnalysisResult;
  canvasJson?: CanvasDefinition;
  canvasId: string | null;
  createdAt: string;
  dryRun?: boolean;
}

export interface LogLine {
  timestamp: string;
  step: string;
  name: string;
  status: "pending" | "running" | "success" | "failure";
  message: string;
}

export interface DemoScript {
  id: string;
  label: string;
  title: string;
  script: string;
}

export interface BatchResult {
  file: string;
  status: "success" | "error";
  conversionId?: string;
  canvasId?: string;
  error?: string;
  canvasYaml?: string;
  canvasJson?: CanvasDefinition;
}

export interface BatchResponse {
  batchId: string;
  repoUrl: string;
  total: number;
  results: BatchResult[];
}
