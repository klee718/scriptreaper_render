import { GoogleGenAI } from "@google/genai";
import { buildSystemPrompt } from "../prompts/bash-to-canvas";
import { validateCanvas } from "./validator";

export class GeminiValidationError extends Error {
  constructor(public rawResponse: string, public errors: string[]) {
    super(`Gemini validation failed: ${errors.join(", ")}`);
    this.name = "GeminiValidationError";
  }
}

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
  canvasId: string | null;
  createdAt: string;
}

// Convert a JSON object representing the SuperPlane canvas to a clean YAML string
export function jsonToYaml(obj: any, indent = 0): string {
  const spaces = " ".repeat(indent);
  if (obj === null) return "null\n";
  if (typeof obj !== "object") {
    if (typeof obj === "string") {
      // Escape multi-line or special character strings
      if (obj.includes("\n") || obj.includes(":") || obj.includes("#") || obj.includes('"') || obj.includes("'")) {
        // Multi-line string literal block
        if (obj.includes("\n")) {
          const lines = obj.split("\n");
          return "|\n" + lines.map(line => " ".repeat(indent + 2) + line).join("\n") + "\n";
        }
        return `"${obj.replace(/"/g, '\\"')}"\n`;
      }
      return `${obj}\n`;
    }
    return `${obj}\n`;
  }

  if (Array.isArray(obj)) {
    if (obj.length === 0) return "[]\n";
    let yaml = "\n";
    for (const item of obj) {
      const itemStr = jsonToYaml(item, indent + 2);
      yaml += `${spaces}- ${itemStr.trimStart()}`;
    }
    return yaml;
  }

  let yaml = "\n";
  for (const key of Object.keys(obj)) {
    const val = obj[key];
    if (val === undefined) continue;
    const valStr = jsonToYaml(val, indent + 2);
    yaml += `${spaces}${key}:${valStr.startsWith("\n") ? "" : " "}${valStr.trimStart()}`;
  }
  return yaml;
}

export function getSimulatedConversion(script: string, preferredName?: string): {
  canvasYaml: string;
  analysis: AnalysisResult;
  canvasJson: CanvasDefinition;
} {
  const nameHint = preferredName
    ? preferredName.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-")
    : "workflow";

  const lower = script.toLowerCase();
  
  let intent = "Execute commands in a structured, schema-locked workflow pipeline.";
  let triggerType: "manual" | "schedule" | "webhook" = "manual";
  let cronExpression: string | undefined = undefined;
  let steps: any[] = [];
  let riskFlags: string[] = [];

  if (lower.includes("backup") || lower.includes("pg_dump") || lower.includes("dump") || lower.includes("s3")) {
    intent = "Perform automated daily relational database dump, gzip compression, and secure multi-region cloud backup storage.";
    triggerType = "schedule";
    cronExpression = "0 2 * * *";
    steps = [
      {
        id: "init",
        name: "Init Backup Directory",
        description: "Creates temporary local scratch paths for safe binary dumps",
        component: "superplane/bash-executor",
        inputs: { command: "mkdir -p /tmp/backups" },
        retry: { maxAttempts: 2, backoffSeconds: 10 }
      },
      {
        id: "dump",
        name: "Database Binary Dump",
        description: "Dumps and streams the compressed database snapshot to storage disk",
        component: "superplane/postgres-dump",
        dependsOn: ["init"],
        inputs: { database: "production_db", compress: "gzip" },
        retry: { maxAttempts: 3, backoffSeconds: 30 }
      },
      {
        id: "upload",
        name: "Cloud Storage Upload",
        description: "Transfers the compressed sql.gz file to secure cloud bucket",
        component: "superplane/s3-uploader",
        dependsOn: ["dump"],
        inputs: { bucket: "s3://mycompany-backups/postgres" },
        retry: { maxAttempts: 5, backoffSeconds: 60 }
      },
      {
        id: "cleanup",
        name: "Cleanup Scratch Directory",
        description: "Wipes local temporary directories to secure sensitive DB assets",
        component: "superplane/bash-executor",
        dependsOn: ["upload"],
        runWhen: "always",
        inputs: { command: "rm -rf /tmp/backups" }
      }
    ];
    riskFlags = ["no validation of s3 uploads", "temp storage directory could fill disk space", "unencrypted database backups"];
  } else if (lower.includes("health") || lower.includes("monitor") || lower.includes("pagerduty") || lower.includes("url") || lower.includes("curl")) {
    intent = "Proactively verify continuous HTTP health checks across cluster microservices, triggering PagerDuty/Slack routing on status failures.";
    triggerType = "schedule";
    cronExpression = "*/5 * * * *";
    steps = [
      {
        id: "check_api",
        name: "Verify API Service",
        description: "Checks endpoint status via HTTP GET ping request",
        component: "superplane/http-ping",
        inputs: { url: "https://api.mycompany.com/health", expectedStatus: 200 },
        retry: { maxAttempts: 3, backoffSeconds: 15 }
      },
      {
        id: "check_auth",
        name: "Verify Auth Service",
        description: "Checks authentication container heartbeat status",
        component: "superplane/http-ping",
        inputs: { url: "https://auth.mycompany.com/health", expectedStatus: 200 },
        retry: { maxAttempts: 3, backoffSeconds: 15 }
      },
      {
        id: "slack_notify",
        name: "Notify Microservice Status",
        description: "Dispatches payload message indicating health check results to Slack team",
        component: "superplane/slack-notifier",
        dependsOn: ["check_api", "check_auth"],
        runWhen: "always",
        inputs: { webhookUrl: "https://hooks.slack.com/services/..." }
      }
    ];
    riskFlags = ["no timeout protection on curl checks", "unhandled curl exception rates"];
  } else {
    intent = "Compile workspace assets, resolve nested dependencies, run database migrations, and hot-reload active daemon processes.";
    triggerType = "manual";
    steps = [
      {
        id: "git_pull",
        name: "Pull Target Codebase",
        description: "Synchronizes the repository workspace with remote branches",
        component: "superplane/git-clone",
        inputs: { repo: "git@github.com:superplane/production-service.git", branch: "main" },
        retry: { maxAttempts: 2, backoffSeconds: 10 }
      },
      {
        id: "dependency_install",
        name: "Install Production Packages",
        description: "Installs locked dependencies inside clean isolated runtimes",
        component: "superplane/npm-builder",
        dependsOn: ["git_pull"],
        inputs: { command: "npm ci --production" },
        retry: { maxAttempts: 3, backoffSeconds: 30 }
      },
      {
        id: "build_app",
        name: "Compile Workspace Assets",
        description: "Bundles high-density static resources and server bundles",
        component: "superplane/npm-builder",
        dependsOn: ["dependency_install"],
        inputs: { command: "npm run build" }
      },
      {
        id: "service_reload",
        name: "Graceful PM2 Service Reload",
        description: "Restarts pm2 daemon processes with zero downtime",
        component: "superplane/pm2-reloader",
        dependsOn: ["build_app"],
        inputs: { appName: "api-service" }
      }
    ];
    riskFlags = ["unlocked dependency trees can introduce breaking changes", "lack of pre-deploy smoke test verify steps", "hardcoded credentials in config"];
  }

  const canvasJson: CanvasDefinition = {
    version: 1,
    name: nameHint,
    trigger: {
      type: triggerType,
      ...(cronExpression ? { schedule: { cron: cronExpression } } : {})
    },
    steps
  };

  return {
    canvasYaml: jsonToYaml(canvasJson).trim(),
    analysis: {
      intent,
      triggerType,
      cronExpression,
      stepCount: steps.length,
      riskFlags
    },
    canvasJson
  };
}

export async function convertScript(script: string, preferredName?: string, dryRun?: boolean): Promise<{
  canvasYaml: string;
  analysis: AnalysisResult;
  canvasJson: CanvasDefinition;
  dryRun?: boolean;
}> {
  if (dryRun || !process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === "YOUR_API_KEY" || process.env.GEMINI_API_KEY.trim() === "") {
    console.log("[ScriptReaper] Utilizing Dry-Run conversion fallback.");
    const simulated = getSimulatedConversion(script, preferredName);
    return {
      ...simulated,
      dryRun: true,
    };
  }

  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });

  const nameHint = preferredName
    ? preferredName.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-")
    : "workflow";

  const systemPrompt = buildSystemPrompt();

  const userPrompt = `Convert this bash script into a unified JSON object containing BOTH the canvas definition and an analysis.
Preferred Name Hint: "${nameHint}"

Return a JSON with this exact structure:
{
  "canvas": {
    "version": 1,
    "name": "${nameHint}",
    "trigger": {
      "type": "manual" | "schedule" | "webhook",
      "schedule": { "cron": "..." } // only if type is schedule
    },
    "steps": [
      {
        "id": "...",
        "name": "...",
        "description": "...",
        "component": "...",
        "dependsOn": [...],
        "runWhen": "always" | "success" | "failure",
        "inputs": { ... },
        "retry": { "maxAttempts": 3, "backoffSeconds": 30 }
      }
    ]
  },
  "analysis": {
    "intent": "Brief description of script's purpose",
    "triggerType": "manual" | "schedule" | "webhook",
    "cronExpression": "...", // if any cron pattern was detected
    "stepCount": 4, // total count of steps in canvas
    "riskFlags": ["uses sleep", "no error handling", etc.] // list any hazards or improvements detected
  }
}

Here is the bash script:
\`\`\`bash
${script}
\`\`\`
`;

  let raw = "";
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: userPrompt,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
      },
    });

    raw = response.text || "";
    if (!raw.trim()) {
      throw new Error("Empty response received from Gemini");
    }

    const envelope = JSON.parse(raw);
    const canvas = envelope.canvas;
    const analysis = envelope.analysis;

    if (!canvas || !analysis) {
      throw new Error("Gemini response missing canvas or analysis root keys");
    }

    // Validate the canvas
    const errors = validateCanvas(canvas);
    if (errors) {
      console.warn("First attempt validation failed, retrying with error details...");
      // Retry once with error context
      const retryResponse = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: `${userPrompt}\n\nPrevious attempt had these schema validation errors:\n${errors.join("\n")}\nPlease correct them and return the exact same unified structure.`,
        config: {
          systemInstruction: systemPrompt,
          responseMimeType: "application/json",
        },
      });

      const retryRaw = retryResponse.text || "";
      const retryEnvelope = JSON.parse(retryRaw);
      const retryCanvas = retryEnvelope.canvas;
      const retryAnalysis = retryEnvelope.analysis;

      if (!retryCanvas || !retryAnalysis) {
        throw new Error("Gemini retry response missing canvas or analysis root keys");
      }

      const retryErrors = validateCanvas(retryCanvas);
      if (retryErrors) {
        throw new GeminiValidationError(retryRaw, retryErrors);
      }

      // Success on retry! Ensure name is clean
      if (preferredName) {
        retryCanvas.name = preferredName.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").substring(0, 50);
      }
      return {
        canvasYaml: jsonToYaml(retryCanvas).trim(),
        analysis: retryAnalysis,
        canvasJson: retryCanvas,
      };
    }

    // Success on first try! Ensure name is clean
    if (preferredName) {
      canvas.name = preferredName.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").substring(0, 50);
    }
    return {
      canvasYaml: jsonToYaml(canvas).trim(),
      analysis,
      canvasJson: canvas,
    };

  } catch (err: any) {
    if (err instanceof GeminiValidationError) {
      throw err;
    }
    console.error("Gemini Error:", err);
    throw new Error(err?.message || "Failed to convert script using Gemini");
  }
}

export function getSimulatedRefinement(
  script: string,
  currentCanvas: CanvasDefinition,
  prompt: string
): {
  canvasYaml: string;
  analysis: AnalysisResult;
  canvasJson: CanvasDefinition;
} {
  // Deep clone current canvas
  const canvasJson = JSON.parse(JSON.stringify(currentCanvas)) as CanvasDefinition;
  const lowerPrompt = prompt.toLowerCase();
  
  const analysis: AnalysisResult = {
    intent: `Refined workflow: ${prompt}`,
    triggerType: canvasJson.trigger.type,
    cronExpression: canvasJson.trigger.schedule?.cron,
    stepCount: canvasJson.steps.length,
    riskFlags: ["manual user refinement applied"]
  };

  // 1. Handle "slack" / "notification" / "alert" instruction
  if (lowerPrompt.includes("slack") || lowerPrompt.includes("alert") || lowerPrompt.includes("notify")) {
    const slackExists = canvasJson.steps.some(s => s.component.includes("slack"));
    if (!slackExists) {
      const lastStepId = canvasJson.steps[canvasJson.steps.length - 1]?.id || "init";
      canvasJson.steps.push({
        id: "slack-alert",
        name: "Slack Alert Refinement",
        description: "Dispatches Slack alert payloads on status changes per user instruction.",
        component: "superplane/slack-notifier",
        dependsOn: [lastStepId],
        runWhen: "always",
        inputs: {
          webhookUrl: "https://hooks.slack.com/services/refined-endpoint",
          message: `Refined alert: ${prompt}`
        }
      });
    } else {
      canvasJson.steps.forEach(s => {
        if (s.component.includes("slack")) {
          s.name = "Refined Slack Alert";
          if (s.inputs) {
            s.inputs.message = `Refined: ${prompt}`;
          }
        }
      });
    }
  }

  // 2. Handle "retry" / "attempts"
  if (lowerPrompt.includes("retry") || lowerPrompt.includes("attempt") || lowerPrompt.includes("backoff")) {
    let maxAttempts = 5;
    let backoff = 60;
    
    const attemptsMatch = lowerPrompt.match(/(\d+)\s*(attempt|retry|times)/);
    if (attemptsMatch) maxAttempts = parseInt(attemptsMatch[1], 10);
    
    const backoffMatch = lowerPrompt.match(/(\d+)\s*(s|second|delay|backoff)/);
    if (backoffMatch) backoff = parseInt(backoffMatch[1], 10);

    canvasJson.steps.forEach(step => {
      if (!step.component.includes("slack")) {
        step.retry = {
          maxAttempts,
          backoffSeconds: backoff
        };
      }
    });
  }

  // 3. Handle "cron" / "schedule"
  if (lowerPrompt.includes("cron") || lowerPrompt.includes("schedule")) {
    let cronStr = "0 0 * * *";
    const cronMatch = prompt.match(/\d+ \d+ [\d*]+ [\d*]+ [\d*]+/);
    if (cronMatch) {
      cronStr = cronMatch[0];
    } else if (lowerPrompt.includes("hourly")) {
      cronStr = "0 * * * *";
    } else if (lowerPrompt.includes("weekly")) {
      cronStr = "0 0 * * 0";
    }
    
    canvasJson.trigger = {
      type: "schedule",
      schedule: { cron: cronStr }
    };
    analysis.triggerType = "schedule";
    analysis.cronExpression = cronStr;
  }

  // 4. Default: Add a general refined step
  if (!lowerPrompt.includes("slack") && !lowerPrompt.includes("retry") && !lowerPrompt.includes("cron") && !lowerPrompt.includes("schedule")) {
    const refinedStepId = `refinement-${Math.floor(Math.random() * 1000)}`;
    const lastStepId = canvasJson.steps[canvasJson.steps.length - 1]?.id || "init";
    canvasJson.steps.push({
      id: refinedStepId,
      name: "Refined Step Addition",
      description: `Applied refinement: ${prompt}`,
      component: "superplane/bash-executor",
      dependsOn: [lastStepId],
      inputs: {
        command: `echo "Refinement executed: ${prompt.replace(/"/g, '\\"')}"`
      }
    });
  }

  analysis.stepCount = canvasJson.steps.length;

  return {
    canvasYaml: jsonToYaml(canvasJson).trim(),
    analysis,
    canvasJson
  };
}

export async function refineWorkflow(
  script: string,
  currentCanvas: CanvasDefinition,
  prompt: string,
  dryRun?: boolean
): Promise<{
  canvasYaml: string;
  analysis: AnalysisResult;
  canvasJson: CanvasDefinition;
  dryRun?: boolean;
}> {
  if (dryRun || !process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === "YOUR_API_KEY" || process.env.GEMINI_API_KEY.trim() === "") {
    console.log("[ScriptReaper] Utilizing Dry-Run refinement fallback.");
    const simulated = getSimulatedRefinement(script, currentCanvas, prompt);
    return {
      ...simulated,
      dryRun: true,
    };
  }

  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });

  const systemPrompt = `You are an expert workflow designer. You take an existing SuperPlane canvas definition (which has been converted from a bash script) and refine it based on a user's instruction.
Maintain consistency with the original script intent while adjusting, deleting, or adding steps/triggers as instructed.
The output MUST be a valid JSON object matching the SuperPlane Canvas Schema.

JSON Schema validation rules:
- Name must only contain lowercase alphanumeric characters and hyphens (e.g. ^[a-z0-9-]+$).
- Version must always be 1.
- Each step must have a unique id, name, and valid component.
- All dependencies in dependsOn must reference existing step ids in the canvas.
`;

  const userPrompt = `Refine the current SuperPlane canvas according to this user instruction.
Instruction: "${prompt}"

Current Canvas Definition:
\`\`\`json
${JSON.stringify(currentCanvas, null, 2)}
\`\`\`

Original Bash Script (for context):
\`\`\`bash
${script}
\`\`\`

Return a JSON with this exact structure:
{
  "canvas": {
    "version": 1,
    "name": "${currentCanvas.name}",
    "trigger": {
      "type": "manual" | "schedule" | "webhook",
      "schedule": { "cron": "..." } // only if type is schedule
    },
    "steps": [
      {
        "id": "...",
        "name": "...",
        "description": "...",
        "component": "...",
        "dependsOn": [...],
        "runWhen": "always" | "success" | "failure",
        "inputs": { ... },
        "retry": { "maxAttempts": 3, "backoffSeconds": 30 }
      }
    ]
  },
  "analysis": {
    "intent": "Updated intent description reflecting the refinement",
    "triggerType": "manual" | "schedule" | "webhook",
    "cronExpression": "...", // if any cron pattern is configured
    "stepCount": 4, // updated total count of steps
    "riskFlags": ["any updated risk flags"]
  }
}
`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: userPrompt,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
      },
    });

    const raw = response.text || "";
    if (!raw.trim()) {
      throw new Error("Empty response received from Gemini refinement");
    }

    const envelope = JSON.parse(raw);
    const canvas = envelope.canvas;
    const analysis = envelope.analysis;

    if (!canvas || !analysis) {
      throw new Error("Gemini response missing canvas or analysis root keys during refinement");
    }

    const errors = validateCanvas(canvas);
    if (errors) {
      throw new Error(`Refined canvas does not match schema: ${errors.join(", ")}`);
    }

    return {
      canvasYaml: jsonToYaml(canvas).trim(),
      analysis,
      canvasJson: canvas,
    };
  } catch (err: any) {
    console.error("Refinement error, falling back to simulated logic...", err);
    const simulated = getSimulatedRefinement(script, currentCanvas, prompt);
    return {
      ...simulated,
      dryRun: true,
    };
  }
}

export function getSimulatedReverse(canvasYaml: string): {
  script: string;
  analysis: {
    name: string;
    description: string;
    complexity: string;
    reaperRating: string;
  };
} {
  // Try to parse some step names from YAML to make the simulated script more realistic
  let stepsFound = "";
  try {
    const yamlLines = canvasYaml.split("\n");
    const foundNames: string[] = [];
    yamlLines.forEach(line => {
      if (line.trim().startsWith("name:") || line.trim().startsWith("- name:")) {
        const namePart = line.split("name:")[1]?.trim().replace(/['"]/g, "");
        if (namePart) foundNames.push(namePart);
      }
    });
    if (foundNames.length > 0) {
      stepsFound = foundNames.map(n => `# - ${n}`).join("\n");
    }
  } catch (e) {
    // Ignore YAML parse errors
  }

  const script = `#!/usr/bin/env bash
# ==============================================================================
# 💀 SCRIPTREAPER REVERSE-ENGINEERED BASH WORKFLOW
# Generated from SuperPlane Canvas Configuration
# Mode: Local Safe-Halt CLI Equivalent
# ==============================================================================

set -euo pipefail

# Configuration
LOG_FILE="superplane_run_$(date +%Y%m%d_%H%M%S).log"
exec 3>&1 4>&2
exec > >(tee -a "$LOG_FILE") 2>&1

echo "======================================================================"
echo " Starting Local Execution of SuperPlane Canvas"
echo " Date: $(date)"
echo " Log file: $LOG_FILE"
echo "======================================================================"

${stepsFound || "# No specific steps mapped."}

# Step 1: Initialize Local Execution
echo "==> [STEP 1/3] Initializing task workspace..."
mkdir -p .superplane_tmp
echo "Workspace ready."

# Step 2: Main Processing Block
echo "==> [STEP 2/3] Executing main workload node..."
echo "Simulating Superplane runner..."
sleep 1

# Step 3: Run Completion Webhook Simulation
echo "==> [STEP 3/3] Running reporting/alerts node..."
echo "Dispatched local status message. Code 0."

echo "======================================================================"
echo " 🛡️ LOCAL RUN COMPLETED SUCCESSFULLY!"
echo "======================================================================"
`;

  return {
    script,
    analysis: {
      name: "reverse-engineered-workflow",
      description: "Fallback portable shell script reverse-engineered from SuperPlane YAML definition.",
      complexity: "Medium",
      reaperRating: "Safely converted step execution flow",
    }
  };
}

export async function reverseConvertWorkflow(
  canvasYaml: string,
  dryRun?: boolean
): Promise<{
  script: string;
  analysis: {
    name: string;
    description: string;
    complexity: string;
    reaperRating: string;
  };
  dryRun?: boolean;
}> {
  if (dryRun || !process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === "YOUR_API_KEY" || process.env.GEMINI_API_KEY.trim() === "") {
    console.log("[ScriptReaper] Utilizing Dry-Run reverse translation fallback.");
    const simulated = getSimulatedReverse(canvasYaml);
    return {
      ...simulated,
      dryRun: true,
    };
  }

  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });

  const systemPrompt = `You are an expert systems developer and shell programmer. You are tasked with reverse-engineering a SuperPlane Canvas YAML definition back into a fully annotated, safe, portable Bash script.
The bash script MUST satisfy:
1. Use strict mode with 'set -euo pipefail' for ultimate safety.
2. Write clear, step-by-step progress logging using echo commands.
3. Incorporate proper logging structure and replicate the logical flow of dependencies from the YAML.
4. Output MUST be valid JSON matching the schema of reverse-engineering.
`;

  const userPrompt = `Convert this SuperPlane workflow canvas definition back into a highly readable, fully executable, robust local Bash script.

Canvas YAML Definition:
\`\`\`yaml
${canvasYaml}
\`\`\`

Return a JSON with this exact structure:
{
  "script": "#!/usr/bin/env bash\\n...",
  "analysis": {
    "name": "a-lowercase-slug-name",
    "description": "Short description of what this workflow does",
    "complexity": "Simple" | "Medium" | "High",
    "reaperRating": "Clear assessment of the converted script safety"
  }
}
`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: userPrompt,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
      },
    });

    const raw = response.text || "";
    if (!raw.trim()) {
      throw new Error("Empty response received from Gemini reverse conversion");
    }

    const envelope = JSON.parse(raw);
    if (!envelope.script || !envelope.analysis) {
      throw new Error("Gemini response missing script or analysis root keys");
    }

    return {
      script: envelope.script,
      analysis: envelope.analysis,
      dryRun: false,
    };
  } catch (err: any) {
    console.error("Reverse conversion error, falling back to simulated logic...", err);
    const simulated = getSimulatedReverse(canvasYaml);
    return {
      ...simulated,
      dryRun: true,
    };
  }
}

