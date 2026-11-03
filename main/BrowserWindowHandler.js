import path from "path";
import {fileURLToPath} from "url";
import {EventEmitter} from "events";
import {BrowserWindow, app, ipcMain} from "electron";
import windowStateKeeper from "electron-window-state";
import serve from "electron-serve";
import log from "electron-log";
import SystemFontsModule from "system-font-families";
import {__DARWIN__} from "./platform.js";
import WindowStateHandler from "./WindowStateHandler.js";
import integrateWindow, {doubleClickTitleBar} from "./windowIntegrations.js";
import {windowForEvent} from "./desktop.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const devServerUrl = process.env.DEV_SERVER_URL;

const SystemFonts = SystemFontsModule.default;
const systemFonts = new SystemFonts();

const loadURL = devServerUrl ? null : serve({directory: "showcode/.output/public"});

log.transports.file.level = "info";

export default class BrowserWinHandler {
    /**
     * @param [options] {object} - browser window options
     * @param [allowRecreate] {boolean}
     */
    constructor(options, allowRecreate = true) {
        this._eventEmitter = new EventEmitter();
        this.allowRecreate = allowRecreate;
        this.browserWindow = null;
        this.options = options;
        this.quitting = false;

        this.bindIpc();
        this.createInstance();

        app.on("before-quit", () => {
            this.quitting = true;
        });
    }

    createInstance() {
        // This method will be called when Electron has finished
        // initialization and is ready to create browser windows.
        // Some APIs can only be used after this event occurs.
        if (app.isReady()) {
            this.create();
        } else {
            app.once("ready", () => {
                this.create();
            });
        }

        // On macOS it's common to re-create a window in the app when the
        // dock icon is clicked and there are no other windows open.
        if (!this.allowRecreate) {
            return;
        }

        app.on("activate", () => {
            this.recreate();
        });
    }

    create() {
        const mainWindowState = windowStateKeeper({
            maximize: false,
            fullScreen: false,
            defaultWidth: 1280,
            defaultHeight: 720,
        });

        this.browserWindow = new BrowserWindow({
            ...this.options,
            show: false,
            x: mainWindowState.x,
            y: mainWindowState.y,
            width: mainWindowState.width,
            height: mainWindowState.height,
            // This fixes subpixel aliasing on Windows
            // See https://github.com/atom/atom/commit/683bef5b9d133cb194b476938c77cc07fd05b972
            backgroundColor: this.options.backgroundColor ?? "#fff",
            webPreferences: {
                ...this.options.webPreferences,
                disableBlinkFeatures: "Auxclick", // Disable auxclick event. See: https://developers.google.com/web/updates/2016/10/auxclick
                webSecurity: !devServerUrl, // Disable on dev to allow loading local resources
                preload: path.join(__dirname, "preload.cjs"),
                contextIsolation: true,
                nodeIntegration: false,
                sandbox: true,
                spellcheck: false,
            },
        });

        mainWindowState.manage(this.browserWindow);
        integrateWindow(this.browserWindow);
        new WindowStateHandler(this.browserWindow).bind();

        this.browserWindow.on("close", (e) => {
            // On macOS, when the user closes the window we really
            // just hide it. This lets us activate quickly and
            // keep all our interesting logic in the renderer.
            if (__DARWIN__ && !this.quitting) {
                e.preventDefault();

                if (this.browserWindow.isFullScreen()) {
                    this.browserWindow.setFullScreen(false);
                    this.browserWindow.once("leave-full-screen", () => this.browserWindow.hide());
                } else {
                    this.browserWindow.hide();
                }

                return;
            }
        });

        this.browserWindow.on("closed", () => {
            // Dereference the window object
            this.browserWindow = null;
        });

        this._eventEmitter.emit("created");
    }

    recreate() {
        if (this.browserWindow === null) {
            this.create();
        } else {
            this.browserWindow.show();
            this.browserWindow.focus();
        }
    }

    bindIpc() {
        for (const action of ["close", "maximize", "minimize", "unmaximize"]) {
            ipcMain.on(action, (event) => windowForEvent(event)[action]());
        }

        ipcMain.on("double-click-title-bar", (event) => doubleClickTitleBar(windowForEvent(event)));

        ipcMain.handle("get-window-state", (event) => {
            return new WindowStateHandler(windowForEvent(event)).get();
        });

        ipcMain.handle("get-system-fonts", (event) => {
            windowForEvent(event);

            return systemFonts.getFonts();
        });
    }

    /**
     * @callback onReadyCallback
     * @param {BrowserWindow}
     */

    /**
     * @param callback {onReadyCallback}
     */
    onCreated(callback) {
        if (this.browserWindow !== null) {
            return callback(this.browserWindow);
        }

        this._eventEmitter.on("created", () => {
            callback(this.browserWindow);
        });
    }

    async load() {
        if (!this.browserWindow) {
            return Promise.reject(
                new Error("The page could not be loaded before win 'created' event"),
            );
        }

        if (devServerUrl) {
            await this.browserWindow.loadURL(devServerUrl);
        } else {
            await loadURL(this.browserWindow);
        }

        this.browserWindow.show();
    }

    /**
     * @returns {Promise<BrowserWindow>}
     */
    created() {
        return new Promise((resolve) => {
            this.onCreated(() => resolve(this.browserWindow));
        });
    }
}
