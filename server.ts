import express from "express";
import path from "path";
import crypto from "crypto";
import { createServer as createViteServer } from "vite";
import { convertScript, refineWorkflow, reverseConvertWorkflow, GeminiValidationError } from "./src/server/services/gemini.js";
import { validateCanvas } from "./src/server/services/validator.js";
import { createCanvas, triggerRun, getRunItems } from "./src/server/services/superplane.js";
import { listShellScripts } from "./src/server/services/github.js";
import { store } from "./src/server/services/store.js";
import { demoScripts } from "./src/server/constants/demoScripts.js";

// Load dotenv
import dotenv from "dotenv";
dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Log incoming requests
app.use((req, res, next) => {
  console.log(`[ScriptReaper API] ${req.method} ${req.path}`);
  next();
});

// GET /api/health - Render warm-up endpoint
app.get("/api/health", (req, res) => {
  res.json({ ok: true, ts: new Date().toISOString() });
});

// GET /api/demo-scripts - Retrieve the preloaded demo scripts
app.get("/api/demo-scripts", (req, res) => {
  res.json(demoScripts);
});

// GET /api/env-status - Retrieve status of required credentials
app.get("/api/env-status", (req, res) => {
  res.json({
    geminiConfigured: !!process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== "YOUR_API_KEY" && process.env.GEMINI_API_KEY.trim() !== "",
    superplaneConfigured: !!process.env.SUPERPLANE_API_KEY && process.env.SUPERPLANE_API_KEY !== "MY_SUPERPLANE_API_KEY" && process.env.SUPERPLANE_API_KEY.trim() !== "",
    githubConfigured: !!process.env.GITHUB_TOKEN && process.env.GITHUB_TOKEN !== "YOUR_GITHUB_TOKEN" && process.env.GITHUB_TOKEN.trim() !== "",
  });
});

// POST /api/convert - Translate a single bash script to SuperPlane canvas
app.post("/api/convert", async (req, res) => {
  const { script, name, dryRun } = req.body;

  if (!script || typeof script !== "string") {
    res.status(400).json({
      error: {
        code: "INVALID_REQUEST",
        message: "Script content is required and must be a string",
      },
    });
    return;
  }

  if (script.length > 50000) {
    res.status(400).json({
      error: {
        code: "SCRIPT_TOO_LONG",
        message: "Script exceeds maximum character limit of 50,000",
      },
    });
    return;
  }

  try {
    const { canvasYaml, analysis, canvasJson, dryRun: isDryRun } = await convertScript(script, name, dryRun);

    // Create canvas on SuperPlane Cloud (real or fallback mock ID)
    let canvasId: string | null = null;
    try {
      canvasId = await createCanvas(canvasYaml, canvasJson.name);
    } catch (spErr: any) {
      console.error("SuperPlane API unreachable during canvas creation:", spErr.message);
    }

    const conversionId = crypto.randomUUID();
    const result = {
      id: conversionId,
      name: canvasJson.name,
      script,
      canvasYaml,
      analysis,
      canvasJson,
      canvasId,
      createdAt: new Date().toISOString(),
      dryRun: !!isDryRun,
    };

    // Store in our database
    store.conversions.set(conversionId, result);

    res.json(result);
  } catch (err: any) {
    console.error("Conversion error:", err);
    if (err instanceof GeminiValidationError) {
      res.status(422).json({
        error: {
          code: "GEMINI_VALIDATION_FAILED",
          message: err.message,
          details: { errors: err.errors, rawResponse: err.rawResponse },
        },
      });
    } else {
      res.status(500).json({
        error: {
          code: "INTERNAL_ERROR",
          message: err?.message || "An unexpected error occurred during conversion",
        },
      });
    }
  }
});

// POST /api/refine - Iteratively refine a workflow canvas using natural language prompting
app.post("/api/refine", async (req, res) => {
  const { script, canvasJson, prompt, dryRun } = req.body;

  if (!script || !canvasJson || !prompt) {
    res.status(400).json({
      error: {
        code: "INVALID_REQUEST",
        message: "script, canvasJson, and prompt fields are required",
      },
    });
    return;
  }

  try {
    const refined = await refineWorkflow(script, canvasJson, prompt, dryRun);
    
    // Attempt to register or mock register the refined canvas on SuperPlane Cloud
    let canvasId = canvasJson.canvasId || `sp-canvas-refined-${Math.random().toString(36).substring(2, 9)}`;
    try {
      canvasId = await createCanvas(refined.canvasYaml, refined.canvasJson.name);
    } catch (spErr: any) {
      console.error("SuperPlane API unreachable during canvas refinement registration:", spErr.message);
    }

    const conversionId = crypto.randomUUID();
    const result = {
      id: conversionId,
      name: refined.canvasJson.name,
      script,
      canvasYaml: refined.canvasYaml,
      analysis: refined.analysis,
      canvasJson: refined.canvasJson,
      canvasId,
      createdAt: new Date().toISOString(),
      dryRun: !!refined.dryRun,
    };

    // Store in our database
    store.conversions.set(conversionId, result);

    res.json(result);
  } catch (err: any) {
    console.error("Refinement endpoint error:", err);
    res.status(500).json({
      error: {
        code: "REFINEMENT_FAILED",
        message: err?.message || "Failed to refine workflow canvas",
      },
    });
  }
});

// POST /api/reverse-convert - Reverse-engineer a Superplane Canvas YAML to portable Bash
app.post("/api/reverse-convert", async (req, res) => {
  const { canvasYaml, dryRun } = req.body;

  if (!canvasYaml || typeof canvasYaml !== "string") {
    res.status(400).json({
      error: {
        code: "INVALID_REQUEST",
        message: "canvasYaml is required and must be a string",
      },
    });
    return;
  }

  try {
    const result = await reverseConvertWorkflow(canvasYaml, dryRun);
    res.json(result);
  } catch (err: any) {
    console.error("Reverse conversion endpoint error:", err);
    res.status(500).json({
      error: {
        code: "REVERSE_CONVERSION_FAILED",
        message: err?.message || "Failed to reverse engineer workflow to Bash script",
      },
    });
  }
});


// POST /api/batch - Scan and sequentially convert scripts in a public github repo
app.post("/api/batch", async (req, res) => {
  const { repoUrl, branch, dryRun } = req.body;

  if (!repoUrl || typeof repoUrl !== "string") {
    res.status(400).json({
      error: {
        code: "INVALID_REQUEST",
        message: "repoUrl parameter is required and must be a string",
      },
    });
    return;
  }

  try {
    const scripts = await listShellScripts(repoUrl, branch || "main");
    const total = scripts.length;
    const results: any[] = [];
    const batchId = crypto.randomUUID();

    for (const file of scripts) {
      try {
        const scriptName = path.basename(file.path, ".sh");
        const { canvasYaml, analysis, canvasJson, dryRun: isDryRun } = await convertScript(file.content, scriptName, dryRun);

        let canvasId: string | null = null;
        try {
          canvasId = await createCanvas(canvasYaml, canvasJson.name);
        } catch (spErr: any) {
          console.warn(`SuperPlane call failed for file ${file.path}:`, spErr.message);
        }

        const conversionId = crypto.randomUUID();
        const conversionRecord = {
          id: conversionId,
          name: canvasJson.name,
          script: file.content,
          canvasYaml,
          analysis,
          canvasJson,
          canvasId,
          createdAt: new Date().toISOString(),
          dryRun: !!isDryRun,
        };

        store.conversions.set(conversionId, conversionRecord);

        results.push({
          file: file.path,
          status: "success",
          conversionId,
          canvasId,
          dryRun: !!isDryRun,
          canvasYaml,
          canvasJson,
        });
      } catch (fileErr: any) {
        console.error(`Error converting batch file ${file.path}:`, fileErr);
        results.push({
          file: file.path,
          status: "error",
          error: fileErr.message || "Schema validation failed after 2 retries",
        });
      }
    }

    res.json({
      batchId,
      repoUrl,
      total,
      results,
    });
  } catch (err: any) {
    console.error("Batch processing error:", err);
    res.status(500).json({
      error: {
        code: "BATCH_FAILED",
        message: err.message || "Failed to complete batch repository scan",
      },
    });
  }
});

// POST /api/canvas/trigger - Trigger a workflow execution run
app.post("/api/canvas/trigger", async (req, res) => {
  const { canvasId } = req.body;

  if (!canvasId) {
    res.status(400).json({
      error: {
        code: "INVALID_REQUEST",
        message: "canvasId is required to trigger execution",
      },
    });
    return;
  }

  try {
    const runId = await triggerRun(canvasId);

    // Save run state
    store.runs.set(runId, {
      runId,
      canvasId,
      status: "running",
      startedAt: new Date().toISOString(),
    });

    res.json({ runId });
  } catch (err: any) {
    console.error("Trigger run error:", err);
    res.status(500).json({
      error: {
        code: "TRIGGER_FAILED",
        message: err.message || "Failed to trigger run on SuperPlane Cloud",
      },
    });
  }
});

// GET /api/canvas/:id - Fetch status/details of a canvas
app.get("/api/canvas/:id", (req, res) => {
  const id = req.params.id;

  // Search through converted logs for this canvasId
  const conversionsList = Array.from(store.conversions.values());
  const found = conversionsList.find((c) => c.canvasId === id);

  if (!found) {
    res.status(404).json({
      error: {
        code: "NOT_FOUND",
        message: "SuperPlane Canvas not found",
      },
    });
    return;
  }

  // Check if we have active runs
  const runsList = Array.from(store.runs.values());
  const canvasRun = runsList.find((r) => r.canvasId === id);

  res.json({
    id,
    name: found.name,
    status: "active",
    lastRun: canvasRun
      ? {
          status: canvasRun.status,
          completedAt: canvasRun.completedAt || null,
        }
      : null,
  });
});

// GET /api/run-log/:canvas_id - Stream live execution logs via Server-Sent Events (SSE)
app.get("/api/run-log/:canvas_id", async (req, res) => {
  const canvasId = req.params.canvas_id;

  // Setup SSE Headers
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    "Connection": "keep-alive",
  });

  console.log(`[SSE] Opened log stream for canvas: ${canvasId}`);

  // Retrieve the latest run for this canvas, or dynamically spawn a simulated run ID
  const runsList = Array.from(store.runs.values());
  let targetRun = runsList.find((r) => r.canvasId === canvasId);
  let runId = targetRun ? targetRun.runId : `sp-run-mock-${Math.random().toString(36).substring(2, 9)}`;

  if (!targetRun) {
    // Save state so we track it
    store.runs.set(runId, {
      runId,
      canvasId,
      status: "running",
      startedAt: new Date().toISOString(),
    });
  }

  let stepStatesSent: Record<string, string> = {};

  const interval = setInterval(async () => {
    try {
      const items = await getRunItems(runId);

      let allCompleted = true;
      let hasFailures = false;

      for (const item of items) {
        // Only stream updates or events that have message/status changes
        const uniqueKey = `${item.stepId}-${item.status}`;
        if (!stepStatesSent[uniqueKey]) {
          stepStatesSent[uniqueKey] = item.status;

          const dataPayload = {
            timestamp: item.completedAt || item.startedAt || new Date().toISOString(),
            step: item.stepId,
            name: item.name,
            status: item.status,
            message: item.message || "Processing...",
          };

          res.write(`data: ${JSON.stringify(dataPayload)}\n\n`);
        }

        if (item.status === "running" || item.status === "pending") {
          allCompleted = false;
        }
        if (item.status === "failure") {
          hasFailures = true;
        }
      }

      if (allCompleted && items.length > 0) {
        clearInterval(interval);
        const finalStatus = hasFailures ? "failure" : "success";

        // Update stored run record
        const runRecord = store.runs.get(runId);
        if (runRecord) {
          runRecord.status = finalStatus;
          runRecord.completedAt = new Date().toISOString();
          store.runs.set(runId, runRecord);
        }

        res.write(`data: ${JSON.stringify({ type: "done", status: finalStatus })}\n\n`);
        res.end();
      }
    } catch (pollErr: any) {
      console.error("[SSE] Log polling error:", pollErr.message);
      clearInterval(interval);
      res.write(`data: ${JSON.stringify({ type: "done", status: "failure", error: pollErr.message })}\n\n`);
      res.end();
    }
  }, 1500);

  // Connection terminated by client
  req.on("close", () => {
    clearInterval(interval);
    console.log(`[SSE] Closed log stream for canvas: ${canvasId}`);
    res.end();
  });
});

// Setup Vite middleware / static routing
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[ScriptReaper] Server running on http://localhost:${PORT}`);
  });
}

startServer();
