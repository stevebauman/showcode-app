import {BrowserWindow} from "electron";
import BrowserEventHandler from "./BrowserEventHandler.js";

export default class WindowStateHandler {
    /**
     * @param browserWindow {BrowserWindow}
     */
    constructor(browserWindow) {
        this.browserWindow = browserWindow;
    }

    /**
     * Bind the window state events.
     */
    bind() {
        this.browserWindow.on("enter-full-screen", () => this.send("fullscreen"));
        this.browserWindow.on("leave-full-screen", () => this.send("normal"));

        this.browserWindow.on("maximize", () => this.send("maximized"));
        this.browserWindow.on("minimize", () => this.send("minimized"));
        this.browserWindow.on("unmaximize", () => this.send("normal"));
        this.browserWindow.on("hide", () => this.send("hidden"));
        this.browserWindow.on("show", () => this.send(this.get()));
    }

    /**
     * Get the current window state.
     *
     * @returns {String}
     */
    get() {
        if (this.browserWindow.isFullScreen()) {
            return "fullscreen";
        } else if (this.browserWindow.isMaximized()) {
            return "maximized";
        } else if (this.browserWindow.isMinimized()) {
            return "minimized";
        } else if (!this.browserWindow.isVisible()) {
            return "hidden";
        } else {
            return "normal";
        }
    }

    /**
     * Send the state to the renderer.
     *
     * @param {*} state
     */
    send(state) {
        BrowserEventHandler.send(this.browserWindow, "window-state-changed", state);
    }
}
