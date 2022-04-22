import { BrowserWindow } from "electron";

export default class WindowStateHandler {
  /**
   * @param browserWindow {BrowserWindow}
   */
  constructor(browserWindow) {
    this.browserWindow = browserWindow;
  }

  bind() {
    this.browserWindow.on("leave-full-screen", () => this.send("normal"));
    this.browserWindow.on("maximize", () => this.send("maximized"));
    this.browserWindow.on("minimize", () => this.send("minimized"));
    this.browserWindow.on("unmaximize", () => this.send("normal"));
    this.browserWindow.on("restore", () => this.send("normal"));
    this.browserWindow.on("hide", () => this.send("hidden"));
    this.browserWindow.on("leave-full-screen", () => this.send("normal"));
    this.browserWindow.on("enter-full-screen", () => this.send("fullscreen"));
  }

  send(state) {
    if (this.browserWindow.webContents.isDestroyed()) {
      return;
    }

    this.browserWindow.webContents.send("window-state-changed", state);
  }
}
