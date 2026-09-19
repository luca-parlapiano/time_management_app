import { app, BrowserWindow, ipcMain } from "electron";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { LlamaPlanningRuntime } from "./llamaPlanningRuntime.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, "..");
const resourceRoot = app.isPackaged ? process.resourcesPath : path.join(projectRoot, "resources");
const planningIntentRuntime = new LlamaPlanningRuntime(resourceRoot);

ipcMain.handle("planner-ai:interpret", async (_event, text: unknown) => {
  if (typeof text !== "string" || !text.trim()) {
    throw new Error("Inserisci un messaggio per il planner");
  }
  if (text.length > 4_000) {
    throw new Error("Il messaggio supera il limite di 4000 caratteri");
  }
  return planningIntentRuntime.request(text.trim());
});

function createMainWindow() {
  const mainWindow = new BrowserWindow({
    width: 1440,
    height: 940,
    minWidth: 1100,
    minHeight: 760,
    title: "Time Planner — Calendario",
    backgroundColor: "#f3efe6",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.webContents.on(
    "console-message",
    (_event, level, message, line, sourceId) => {
      console.log(`[renderer:${level}] ${message} (${sourceId}:${line})`);
    }
  );

  mainWindow.webContents.on(
    "did-fail-load",
    (_event, errorCode, errorDescription, validatedUrl) => {
      console.error(
        `Renderer load failed: ${errorCode} ${errorDescription} at ${validatedUrl}`
      );
    }
  );

  const devServerUrl =
    process.env.ELECTRON_RENDERER_URL ??
    process.env.VITE_DEV_SERVER_URL ??
    (app.isPackaged ? undefined : "http://127.0.0.1:5173");

  if (devServerUrl) {
    void mainWindow.loadURL(devServerUrl);
    mainWindow.webContents.openDevTools({ mode: "detach" });
    return;
  }

  void mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
}

app.whenReady().then(() => {
  createMainWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("before-quit", () => planningIntentRuntime.stop());
