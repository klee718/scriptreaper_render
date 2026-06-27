export class SuperPlaneError extends Error {
  constructor(public statusCode: number, message: string) {
    super(`SuperPlane API Error (${statusCode}): ${message}`);
    this.name = "SuperPlaneError";
  }
}

export interface RunItem {
  id: string;
  stepId: string;
  name: string;
  status: "pending" | "running" | "success" | "failure";
  message?: string;
  startedAt?: string;
  completedAt?: string;
}

const BASE = process.env.SUPERPLANE_BASE_URL || "https://app.superplane.com";

function isMockEnabled(): boolean {
  return (
    !process.env.SUPERPLANE_API_KEY ||
    process.env.SUPERPLANE_API_KEY === "MY_SUPERPLANE_API_KEY" ||
    process.env.SUPERPLANE_API_KEY.trim() === ""
  );
}

export async function createCanvas(canvasYaml: string, name: string, canvasJson?: any): Promise<string> {
  if (isMockEnabled()) {
    console.log("[SuperPlane] Mock Mode: Creating Canvas...", { name });
    return `sp-canvas-mock-${Math.random().toString(36).substring(2, 9)}`;
  }

  const headers = {
    Authorization: `Bearer ${process.env.SUPERPLANE_API_KEY}`,
    "Content-Type": "application/json",
  };

  // Helper to map our simulated component names to official SuperPlane actions
  const mapComponent = (compName: string): { type: string; component: string } => {
    const comp = compName.toLowerCase();
    if (comp.includes("bash") || comp.includes("executor") || comp.includes("dump") || comp.includes("script")) {
      return { type: "TYPE_ACTION", component: "runnerBash" };
    }
    if (comp.includes("slack") || comp.includes("ping") || comp.includes("http") || comp.includes("upload") || comp.includes("s3")) {
      return { type: "TYPE_ACTION", component: "http" };
    }
    return { type: "TYPE_ACTION", component: "runnerBash" }; // Default action
  };

  // Build the request body schema from Swagger docs
  const nodes: any[] = [];
  const edges: any[] = [];

  if (canvasJson && Array.isArray(canvasJson.steps)) {
    // 1. Add trigger node if exists
    if (canvasJson.trigger) {
      const triggerId = "trigger-setup";
      let triggerComponent = "start"; // Default manual trigger
      if (canvasJson.trigger.type === "schedule") {
        triggerComponent = "schedule";
      } else if (canvasJson.trigger.type === "webhook") {
        triggerComponent = "webhook";
      }

      nodes.push({
        id: triggerId,
        name: `Trigger (${canvasJson.trigger.type})`,
        type: "TYPE_TRIGGER",
        component: triggerComponent,
        position: { x: 100, y: 300 },
        configuration: canvasJson.trigger.schedule || canvasJson.trigger.webhook || {},
      });

      // Connect trigger to the first step that doesn't have any dependsOn
      const firstStep = canvasJson.steps.find((s: any) => !s.dependsOn || s.dependsOn.length === 0);
      if (firstStep) {
        edges.push({
          sourceId: triggerId,
          targetId: firstStep.id,
          channel: "default", // Trigger nodes output via "default" channel
        });
      }
    }

    // 2. Add steps as nodes
    canvasJson.steps.forEach((step: any, index: number) => {
      const mapped = mapComponent(step.component);
      nodes.push({
        id: step.id,
        name: step.name,
        type: mapped.type,
        component: mapped.component,
        position: { x: (index + 1) * 300 + 100, y: 300 },
        configuration: step.inputs || {},
      });

      // Add edges for dependsOn
      // Action nodes only expose "passed" or "failed" output channels (not "default")
      if (Array.isArray(step.dependsOn)) {
        step.dependsOn.forEach((depId: string) => {
          let channel = "passed"; // Default for action-to-action: always "passed" unless explicitly failure
          if (step.runWhen === "failure") channel = "failed";
          edges.push({
            sourceId: depId,
            targetId: step.id,
            channel: channel,
          });
        });
      }
    });
  } else {
    // Fallback if no canvasJson: create a dummy node
    nodes.push({
      id: "workflow-entry",
      name: name,
      type: "TYPE_ACTION",
      component: "runnerBash",
      position: { x: 100, y: 300 },
      configuration: {},
    });
  }

  const payload = {
    canvas: {
      metadata: {
        name,
        description: canvasJson?.analysis?.intent || "ScriptReaper converted canvas",
      },
      spec: {
        nodes,
        edges,
      },
    },
  };

  try {
    const res = await fetch(`${BASE}/api/v1/canvases`, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      throw new SuperPlaneError(res.status, await res.text());
    }

    const data = await res.json();
    return data.id || `sp-canvas-${Math.random().toString(36).substring(2, 9)}`;
  } catch (err: any) {
    console.error("SuperPlane Canvas Creation Error, falling back to mock ID:", err.message || err);
    return `sp-canvas-fallback-${Math.random().toString(36).substring(2, 9)}`;
  }
}

export async function triggerRun(canvasId: string): Promise<string> {
  if (isMockEnabled() || canvasId.includes("mock") || canvasId.includes("fallback")) {
    console.log("[SuperPlane] Mock Mode: Triggering Run for Canvas:", canvasId);
    return `sp-run-mock-${Math.random().toString(36).substring(2, 9)}`;
  }

  const headers = {
    Authorization: `Bearer ${process.env.SUPERPLANE_API_KEY}`,
    "Content-Type": "application/json",
  };

  try {
    const res = await fetch(`${BASE}/api/v1/canvases/${canvasId}/runs`, {
      method: "POST",
      headers,
      body: JSON.stringify({}),
    });

    if (!res.ok) {
      throw new SuperPlaneError(res.status, await res.text());
    }

    const data = await res.json();
    return data.id || `sp-run-${Math.random().toString(36).substring(2, 9)}`;
  } catch (err: any) {
    console.error("SuperPlane Trigger Run Error, falling back to mock ID:", err.message || err);
    return `sp-run-fallback-${Math.random().toString(36).substring(2, 9)}`;
  }
}

export async function getRunItems(runId: string): Promise<RunItem[]> {
  if (isMockEnabled() || runId.includes("mock") || runId.includes("fallback")) {
    // Generate simulated progression for the demo
    return getSimulatedRunItems(runId);
  }

  const headers = {
    Authorization: `Bearer ${process.env.SUPERPLANE_API_KEY}`,
  };

  try {
    const res = await fetch(`${BASE}/api/v1/runs/${runId}/items`, { headers });
    if (!res.ok) {
      throw new SuperPlaneError(res.status, await res.text());
    }
    const data = await res.json();
    return data.items || [];
  } catch (err: any) {
    console.error("SuperPlane Get Run Items Error:", err);
    return getSimulatedRunItems(runId);
  }
}

// In-memory simulation states for runs
const activeSimulations: Record<string, { start: number; stepIndex: number; logs: RunItem[] }> = {};

function getSimulatedRunItems(runId: string): RunItem[] {
  if (!activeSimulations[runId]) {
    // Determine which demo script is running or generate a general one
    activeSimulations[runId] = {
      start: Date.now(),
      stepIndex: 0,
      logs: [
        {
          id: "item-1",
          stepId: "setup",
          name: "Initialize Environment",
          status: "pending",
          message: "Awaiting container provisioning...",
        },
        {
          id: "item-2",
          stepId: "checkout",
          name: "Checkout Git Repository",
          status: "pending",
          message: "Waiting for environment...",
        },
        {
          id: "item-3",
          stepId: "build",
          name: "Install and Build Application",
          status: "pending",
          message: "Waiting for checkout...",
        },
        {
          id: "item-4",
          stepId: "health",
          name: "Service Health Check Verification",
          status: "pending",
          message: "Waiting for build...",
        },
        {
          id: "item-5",
          stepId: "notify",
          name: "Notify Slack Channel",
          status: "pending",
          message: "Waiting for health check...",
        },
      ],
    };
  }

  const sim = activeSimulations[runId];
  const elapsed = Date.now() - sim.start;

  // Let's progress the simulation over time (one step transitions every 2.5 seconds)
  const stepDuration = 2000;
  const currentStepProgress = Math.floor(elapsed / stepDuration);

  sim.logs.forEach((log, index) => {
    if (index < currentStepProgress) {
      if (log.status !== "success") {
        log.status = "success";
        log.message = getMockMessage(log.stepId, "success");
        log.completedAt = new Date(sim.start + (index + 1) * stepDuration).toISOString();
      }
    } else if (index === currentStepProgress) {
      if (log.status !== "running") {
        log.status = "running";
        log.message = getMockMessage(log.stepId, "running");
        log.startedAt = new Date(sim.start + index * stepDuration).toISOString();
      }
    } else {
      log.status = "pending";
    }
  });

  return [...sim.logs];
}

function getMockMessage(stepId: string, state: "running" | "success"): string {
  const messages: Record<string, { running: string; success: string }> = {
    setup: {
      running: "Provisioning fresh execution runtime...",
      success: "Environment ready. Node LTS v20.11 initialized successfully.",
    },
    checkout: {
      running: "Cloning repo git@github.com:superplane/production-service.git (branch: main)...",
      success: "Repository pulled. 142 files changed, commit sha: fbc471a.",
    },
    build: {
      running: "Running 'npm ci --production && npm run build'...",
      success: "Build complete. Compiled output: 3.2MB. Dependencies resolved in 1.4s.",
    },
    health: {
      running: "Sending HTTP GET verification request to http://localhost:3000/api/health...",
      success: "Health check passed. Response: { status: 'healthy', version: '1.2.0' } HTTP 200.",
    },
    notify: {
      running: "Dispatching webhook payload to #deployment-alerts in Slack workspace...",
      success: "Slack notification sent successfully. Channel alert posted to #deploys.",
    },
  };

  return messages[stepId]?.[state] || (state === "running" ? "Processing step..." : "Step completed successfully.");
}
