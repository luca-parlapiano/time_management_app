import { DEFAULT_SERVER_URL, DEFAULT_MODEL_REPOSITORY, STARTUP_TIMEOUT_MS, REQUEST_TIMEOUT_MS } from "../src/constants.js";
import type { PlanningIntentRuntimeResponse, ApplyTemplateResponse, CompletionResponse } from "../src/model/aiRuntime.js";
import { spawn, type ChildProcess } from "node:child_process";
import { randomUUID } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

export class LlamaPlanningRuntime {
  private server: ChildProcess | null = null;
  private ready: Promise<void> | null = null;
  private stopping = false;
  private readonly apiKey = process.env.PLANNER_LLAMA_API_KEY || randomUUID();

  constructor(private readonly resourceRoot: string) {}

  async request(text: string): Promise<PlanningIntentRuntimeResponse> {
    await this.ensureReady();

    const prompt = readFileSync(
      path.join(this.resourceRoot, "ai", "planning-intent.txt"),
      "utf8",
    ).trim();
    const rendered = await this.postJson<ApplyTemplateResponse>("/apply-template", {
      messages: [
        { role: "system", content: prompt },
        { role: "user", content: text },
      ],
    });
    if (typeof rendered.prompt !== "string" || !rendered.prompt) {
      throw new Error("llama.cpp non ha applicato il template chat del modello");
    }

    let completion = await this.postJson<CompletionResponse>("/completion", {
      prompt: rendered.prompt,
      n_predict: 384,
      temperature: 0,
      cache_prompt: true,
    });
    if (typeof completion.content !== "string") {
      const detail = completion.error?.message;
      throw new Error(typeof detail === "string" ? detail : "llama.cpp non ha prodotto una risposta");
    }

    let rawText = completion.content.trim();
    let intent: unknown;
    try {
      intent = extractJsonObject(rawText);
    } catch {
      const schema = JSON.parse(
        readFileSync(
          path.join(this.resourceRoot, "ai", "planning-intent.schema.json"),
          "utf8",
        ),
      ) as unknown;
      completion = await this.postJson<CompletionResponse>("/completion", {
        prompt: rendered.prompt,
        n_predict: 384,
        temperature: 0,
        cache_prompt: true,
        json_schema: schema,
      });
      if (typeof completion.content !== "string") {
        throw new Error("llama.cpp non ha prodotto una risposta JSON valida");
      }
      rawText = completion.content.trim();
      intent = extractJsonObject(rawText);
    }
    return {
      intent,
      rawText,
      runtime: this.runtimeLabel(),
    };
  }

  stop() {
    this.stopping = true;
    this.server?.kill();
    this.server = null;
    this.ready = null;
  }

  private ensureReady() {
    if (!this.ready) {
      this.ready = this.startOrConnect().catch((error) => {
        this.ready = null;
        throw error;
      });
    }
    return this.ready;
  }

  private async startOrConnect() {
    if (await this.isHealthy()) return;

    const configuredUrl = process.env.PLANNER_LLAMA_URL;
    if (configuredUrl) {
      throw new Error(`llama.cpp non risponde su ${configuredUrl}`);
    }

    const binary = process.env.PLANNER_LLAMA_SERVER || llamaServerBinary(this.resourceRoot);
    const localModel = process.env.PLANNER_AI_MODEL || path.join(
      this.resourceRoot,
      "ai",
      "models",
      "qwen3-4b-q4_k_m.gguf",
    );
    const adapter = process.env.PLANNER_AI_LORA || path.join(
      this.resourceRoot,
      "ai",
      "adapters",
      "planning-intent-qwen3-4b.gguf",
    );
    const args = existsSync(localModel)
      ? ["--model", localModel]
      : ["--hf-repo", DEFAULT_MODEL_REPOSITORY];
    args.push(
      "--host", "127.0.0.1",
      "--port", "39281",
      "--ctx-size", "2048",
      "--n-gpu-layers", "99",
      "--jinja",
      "--reasoning", "off",
      "--api-key", this.apiKey,
    );
    if (existsSync(adapter)) args.push("--lora", adapter);

    this.stopping = false;
    const server = spawn(binary, args, {
      cwd: this.resourceRoot,
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"],
    });
    this.server = server;
    let startupError: Error | null = null;
    server.stdout?.on("data", (chunk) => console.log(`[llama.cpp] ${String(chunk).trimEnd()}`));
    server.stderr?.on("data", (chunk) => console.log(`[llama.cpp] ${String(chunk).trimEnd()}`));
    server.on("error", (error) => {
      startupError = binaryFromPath(binary)
        ? new Error(
            "llama-server non è installato. macOS: brew install llama.cpp · Windows: winget install llama.cpp",
          )
        : error;
    });
    server.on("exit", (code, signal) => {
      this.server = null;
      this.ready = null;
      if (!this.stopping && !startupError) {
        startupError = new Error(`llama-server si è chiuso (${signal ?? code ?? "errore"})`);
      }
    });

    const deadline = Date.now() + STARTUP_TIMEOUT_MS;
    while (Date.now() < deadline) {
      if (startupError) throw startupError;
      if (await this.isHealthy()) return;
      await delay(250);
    }
    throw new Error("Qwen3-4B non è pronto dopo 5 minuti; controlla i log di llama.cpp");
  }

  private async isHealthy() {
    try {
      const response = await fetch(`${this.serverUrl()}/health`, {
        signal: AbortSignal.timeout(750),
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  private async postJson<T>(endpoint: string, body: unknown): Promise<T> {
    const response = await fetch(`${this.serverUrl()}${endpoint}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    const payload = await response.json() as T & { error?: { message?: unknown } };
    if (!response.ok) {
      const detail = payload.error?.message;
      throw new Error(typeof detail === "string" ? detail : `llama.cpp ha risposto HTTP ${response.status}`);
    }
    return payload;
  }

  private serverUrl() {
    return (process.env.PLANNER_LLAMA_URL || DEFAULT_SERVER_URL).replace(/\/$/, "");
  }

  private runtimeLabel() {
    const adapter = process.env.PLANNER_AI_LORA || path.join(
      this.resourceRoot,
      "ai",
      "adapters",
      "planning-intent-qwen3-4b.gguf",
    );
    return `Qwen3-4B Q4_K_M · llama.cpp${existsSync(adapter) ? " + LoRA" : ""}`;
  }
}

function llamaServerBinary(resourceRoot: string) {
  const executable = process.platform === "win32" ? "llama-server.exe" : "llama-server";
  const bundled = path.join(
    resourceRoot,
    "ai",
    "bin",
    `${process.platform}-${process.arch}`,
    executable,
  );
  return existsSync(bundled) ? bundled : executable;
}

function binaryFromPath(binary: string) {
  return path.basename(binary) === binary;
}

function extractJsonObject(text: string) {
  const candidate = text.startsWith("```")
    ? text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim()
    : text;
  try {
    const value = JSON.parse(candidate) as unknown;
    if (typeof value !== "object" || value === null || Array.isArray(value)) throw new Error();
    return value;
  } catch {
    const start = candidate.indexOf("{");
    const end = candidate.lastIndexOf("}");
    if (start < 0 || end <= start) {
      throw new Error("Il modello non ha restituito un oggetto JSON");
    }
    const value = JSON.parse(candidate.slice(start, end + 1)) as unknown;
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
      throw new Error("La risposta del modello non è un oggetto JSON");
    }
    return value;
  }
}

function delay(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
