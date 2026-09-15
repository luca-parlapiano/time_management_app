"use strict";

import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("plannerAI", {
  interpret(text: string) {
    return ipcRenderer.invoke("planner-ai:interpret", text);
  },
});
