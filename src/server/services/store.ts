import dotenv from "dotenv";
dotenv.config();

import pg from "pg";
import { ConvertResult } from "./gemini.js";

const { Pool } = pg;

export interface RunRecord {
  runId: string;
  canvasId: string;
  status: "running" | "success" | "failure";
  startedAt: string;
  completedAt?: string;
}

export interface Store {
  conversions: {
    set(id: string, result: ConvertResult): Promise<void>;
    get(id: string): Promise<ConvertResult | undefined>;
    findByCanvasId(canvasId: string): Promise<ConvertResult | undefined>;
    list(): Promise<ConvertResult[]>;
  };
  runs: {
    set(id: string, record: RunRecord): Promise<void>;
    get(id: string): Promise<RunRecord | undefined>;
    findByCanvasId(canvasId: string): Promise<RunRecord | undefined>;
    list(): Promise<RunRecord[]>;
  };
}

class InMemoryStore implements Store {
  private conversionsMap = new Map<string, ConvertResult>();
  private runsMap = new Map<string, RunRecord>();

  conversions = {
    set: async (id: string, result: ConvertResult): Promise<void> => {
      this.conversionsMap.set(id, result);
    },
    get: async (id: string): Promise<ConvertResult | undefined> => {
      return this.conversionsMap.get(id);
    },
    findByCanvasId: async (canvasId: string): Promise<ConvertResult | undefined> => {
      return Array.from(this.conversionsMap.values()).find((c) => c.canvasId === canvasId);
    },
    list: async (): Promise<ConvertResult[]> => {
      return Array.from(this.conversionsMap.values());
    },
  };

  runs = {
    set: async (id: string, record: RunRecord): Promise<void> => {
      this.runsMap.set(id, record);
    },
    get: async (id: string): Promise<RunRecord | undefined> => {
      return this.runsMap.get(id);
    },
    findByCanvasId: async (canvasId: string): Promise<RunRecord | undefined> => {
      return Array.from(this.runsMap.values()).find((r) => r.canvasId === canvasId);
    },
    list: async (): Promise<RunRecord[]> => {
      return Array.from(this.runsMap.values());
    },
  };
}

class PostgresStore implements Store {
  private pool: pg.Pool;
  private initPromise: Promise<void>;

  constructor(connectionString: string) {
    this.pool = new Pool({
      connectionString,
      ssl: {
        rejectUnauthorized: false, // Required for secure Render PG connection
      },
    });

    this.initPromise = this.initDb();
  }

  private async initDb(): Promise<void> {
    try {
      const client = await this.pool.connect();
      try {
        await client.query(`
          CREATE TABLE IF NOT EXISTS conversions (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            script TEXT NOT NULL,
            canvas_yaml TEXT NOT NULL,
            analysis JSONB NOT NULL,
            canvas_id TEXT,
            created_at TIMESTAMP WITH TIME ZONE NOT NULL
          );
        `);
        await client.query(`
          CREATE TABLE IF NOT EXISTS runs (
            run_id TEXT PRIMARY KEY,
            canvas_id TEXT NOT NULL,
            status TEXT NOT NULL,
            started_at TIMESTAMP WITH TIME ZONE NOT NULL,
            completed_at TIMESTAMP WITH TIME ZONE
          );
        `);
        console.log("[PostgresStore] Tables verified or created successfully.");
      } finally {
        client.release();
      }
    } catch (err) {
      console.error("[PostgresStore] Database initialization failed:", err);
    }
  }

  private async ensureInitialized(): Promise<void> {
    await this.initPromise;
  }

  conversions = {
    set: async (id: string, result: ConvertResult): Promise<void> => {
      await this.ensureInitialized();
      await this.pool.query(
        `INSERT INTO conversions (id, name, script, canvas_yaml, analysis, canvas_id, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (id) DO UPDATE SET
           name = EXCLUDED.name,
           script = EXCLUDED.script,
           canvas_yaml = EXCLUDED.canvas_yaml,
           analysis = EXCLUDED.analysis,
           canvas_id = EXCLUDED.canvas_id,
           created_at = EXCLUDED.created_at`,
        [
          result.id,
          result.name,
          result.script,
          result.canvasYaml,
          JSON.stringify(result.analysis),
          result.canvasId,
          result.createdAt,
        ]
      );
    },
    get: async (id: string): Promise<ConvertResult | undefined> => {
      await this.ensureInitialized();
      const res = await this.pool.query(`SELECT * FROM conversions WHERE id = $1`, [id]);
      if (res.rows.length === 0) return undefined;
      const row = res.rows[0];
      return {
        id: row.id,
        name: row.name,
        script: row.script,
        canvasYaml: row.canvas_yaml,
        analysis: row.analysis,
        canvasId: row.canvas_id,
        createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
      };
    },
    findByCanvasId: async (canvasId: string): Promise<ConvertResult | undefined> => {
      await this.ensureInitialized();
      const res = await this.pool.query(`SELECT * FROM conversions WHERE canvas_id = $1 LIMIT 1`, [canvasId]);
      if (res.rows.length === 0) return undefined;
      const row = res.rows[0];
      return {
        id: row.id,
        name: row.name,
        script: row.script,
        canvasYaml: row.canvas_yaml,
        analysis: row.analysis,
        canvasId: row.canvas_id,
        createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
      };
    },
    list: async (): Promise<ConvertResult[]> => {
      await this.ensureInitialized();
      const res = await this.pool.query(`SELECT * FROM conversions ORDER BY created_at DESC`);
      return res.rows.map((row) => ({
        id: row.id,
        name: row.name,
        script: row.script,
        canvasYaml: row.canvas_yaml,
        analysis: row.analysis,
        canvasId: row.canvas_id,
        createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
      }));
    },
  };

  runs = {
    set: async (id: string, record: RunRecord): Promise<void> => {
      await this.ensureInitialized();
      await this.pool.query(
        `INSERT INTO runs (run_id, canvas_id, status, started_at, completed_at)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (run_id) DO UPDATE SET
           canvas_id = EXCLUDED.canvas_id,
           status = EXCLUDED.status,
           started_at = EXCLUDED.started_at,
           completed_at = EXCLUDED.completed_at`,
        [
          record.runId,
          record.canvasId,
          record.status,
          record.startedAt,
          record.completedAt || null,
        ]
      );
    },
    get: async (id: string): Promise<RunRecord | undefined> => {
      await this.ensureInitialized();
      const res = await this.pool.query(`SELECT * FROM runs WHERE run_id = $1`, [id]);
      if (res.rows.length === 0) return undefined;
      const row = res.rows[0];
      return {
        runId: row.run_id,
        canvasId: row.canvas_id,
        status: row.status as "running" | "success" | "failure",
        startedAt: row.started_at instanceof Date ? row.started_at.toISOString() : row.started_at,
        completedAt: row.completed_at
          ? (row.completed_at instanceof Date ? row.completed_at.toISOString() : row.completed_at)
          : undefined,
      };
    },
    findByCanvasId: async (canvasId: string): Promise<RunRecord | undefined> => {
      await this.ensureInitialized();
      const res = await this.pool.query(`SELECT * FROM runs WHERE canvas_id = $1 ORDER BY started_at DESC LIMIT 1`, [canvasId]);
      if (res.rows.length === 0) return undefined;
      const row = res.rows[0];
      return {
        runId: row.run_id,
        canvasId: row.canvas_id,
        status: row.status as "running" | "success" | "failure",
        startedAt: row.started_at instanceof Date ? row.started_at.toISOString() : row.started_at,
        completedAt: row.completed_at
          ? (row.completed_at instanceof Date ? row.completed_at.toISOString() : row.completed_at)
          : undefined,
      };
    },
    list: async (): Promise<RunRecord[]> => {
      await this.ensureInitialized();
      const res = await this.pool.query(`SELECT * FROM runs ORDER BY started_at DESC`);
      return res.rows.map((row) => ({
        runId: row.run_id,
        canvasId: row.canvas_id,
        status: row.status as "running" | "success" | "failure",
        startedAt: row.started_at instanceof Date ? row.started_at.toISOString() : row.started_at,
        completedAt: row.completed_at
          ? (row.completed_at instanceof Date ? row.completed_at.toISOString() : row.completed_at)
          : undefined,
      }));
    },
  };
}

const dbUrl = process.env.DATABASE_URL;
export const store: Store = dbUrl && dbUrl.trim() !== "" ? new PostgresStore(dbUrl) : new InMemoryStore();
