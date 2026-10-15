import { createWriteStream, existsSync, mkdirSync, openSync, closeSync, readSync, renameSync, statSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { fileURLToPath } from "node:url";

const fileName = "qwen3-4b-q4_k_m.gguf";
const sourceUrl = "https://huggingface.co/Qwen/Qwen3-4B-GGUF/resolve/main/Qwen3-4B-Q4_K_M.gguf?download=true";
const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const destination = resolve(projectRoot, "resources", "ai", "models", fileName);
const partial = `${destination}.part`;

mkdirSync(dirname(destination), { recursive: true });

if (existsSync(destination)) {
  assertGguf(destination);
  console.log(`Modello già disponibile: ${destination}`);
  process.exit(0);
}

const downloadedBytes = existsSync(partial) ? statSync(partial).size : 0;
const headers = downloadedBytes > 0 ? { range: `bytes=${downloadedBytes}-` } : undefined;
console.log(`Download di Qwen3-4B Q4_K_M in ${destination}`);
if (downloadedBytes > 0) console.log(`Ripresa da ${formatBytes(downloadedBytes)}`);

const response = await fetch(sourceUrl, { headers, redirect: "follow" });
if (!response.ok || !response.body) {
  throw new Error(`Hugging Face ha risposto HTTP ${response.status}`);
}

const canResume = response.status === 206 && downloadedBytes > 0;
const startingBytes = canResume ? downloadedBytes : 0;
const responseBytes = Number(response.headers.get("content-length") || 0);
const totalBytes = startingBytes + responseBytes;
let receivedBytes = startingBytes;
let lastUpdate = 0;

const input = Readable.fromWeb(response.body);
input.on("data", (chunk) => {
  receivedBytes += chunk.length;
  if (Date.now() - lastUpdate < 1_000) return;
  lastUpdate = Date.now();
  const progress = totalBytes > 0 ? ` (${Math.floor(receivedBytes / totalBytes * 100)}%)` : "";
  process.stdout.write(`\r${formatBytes(receivedBytes)}${progress}`);
});

await pipeline(input, createWriteStream(partial, { flags: canResume ? "a" : "w" }));
process.stdout.write("\n");
assertGguf(partial);
renameSync(partial, destination);
console.log(`Download completato: ${destination} (${formatBytes(statSync(destination).size)})`);

function assertGguf(path) {
  const descriptor = openSync(path, "r");
  try {
    const magic = Buffer.alloc(4);
    if (readSync(descriptor, magic, 0, magic.length, 0) !== 4 || magic.toString("ascii") !== "GGUF") {
      throw new Error(`Il file non è un GGUF valido: ${path}`);
    }
  } finally {
    closeSync(descriptor);
  }
}

function formatBytes(bytes) {
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(2)} GiB`;
  if (bytes >= 1024 ** 2) return `${(bytes / 1024 ** 2).toFixed(1)} MiB`;
  return `${Math.round(bytes / 1024)} KiB`;
}
