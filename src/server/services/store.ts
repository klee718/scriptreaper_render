import { ConvertResult } from "./gemini";

interface RunRecord {
  runId: string;
  canvasId: string;
  status: "running" | "success" | "failure";
  startedAt: string;
  completedAt?: string;
}

const conversions = new Map<string, ConvertResult>();
const runs = new Map<string, RunRecord>();

export const store = {
  conversions,
  runs,
};
