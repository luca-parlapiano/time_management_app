"use strict";

import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("plannerAI", {
  interpret(text: string) {
    return ipcRenderer.invoke("planner-ai:interpret", text);
  },
});

contextBridge.exposeInMainWorld("plannerDB", {
  read: () => ipcRenderer.invoke("planner-db:read"),
  readPalette: () => ipcRenderer.invoke("planner-db:read-palette"),
  writePalette: (value: unknown) => ipcRenderer.invoke("planner-db:write-palette", value),
  write: (input: unknown) => ipcRenderer.invoke("planner-db:write", input),
});
