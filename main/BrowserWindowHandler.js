const {__DARWIN__} = require("./index.js");
const {EventEmitter} = require("events");
const Anystack = require("./Anystack");
const SystemFonts = require("system-font-families").default;
const {BrowserWindow, app, ipcMain} = require("electron");
const windowStateKeeper = require("electron-window-state");
const WindowStateHandler = require("./WindowStateHandler");

const isDev = process.env.NODE_ENV === "development";

const systemFonts = new SystemFonts();

const log = require("electron-log");

log.transports.file.level = "info";

module.exports = class BrowserWinHandler {
    /**
     * @param [options] {object} - browser window options
     * @param [allowRecreate] {boolean}
     */
    constructor(options, allowRecreate = true) {
        this._eventEmitter = new EventEmitter();
        this.allowRecreate = allowRecreate;
        this.browserWindow = null;
        this.options = options;

        this.createInstance();
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
            backgroundColor: "#fff",
            webPreferences: {
                ...this.options.webPreferences,
                disableBlinkFeatures: "Auxclick", // Disable auxclick event. See: https://developers.google.com/web/updates/2016/10/auxclick
                webSecurity: !isDev, // Disable on dev to allow loading local resources
                nodeIntegration: true, // Allow loading modules via the require () function
                contextIsolation: false, // https://github.com/electron/electron/issues/18037#issuecomment-806320028
            },
        });

        mainWindowState.manage(this.browserWindow);

        let quitting = false;

        app.on("before-quit", () => {
            quitting = true;
        });

        ipcMain.on("will-quit", (event) => {
            quitting = true;
            event.returnValue = true;
        });

        ipcMain.on("close", () => this.browserWindow.close());
        ipcMain.on("maximize", () => this.browserWindow.maximize());
        ipcMain.on("minimize", () => this.browserWindow.minimize());
        ipcMain.on("unmaximize", () => this.browserWindow.unmaximize());

        ipcMain.on("double-click-title-bar", () => {
            this.browserWindow.isMaximized()
                ? this.browserWindow.unmaximize()
                : this.browserWindow.maximize();
        });

        ipcMain.handle("get-window-state", async () => {
            return new WindowStateHandler(this.browserWindow).get();
        });

        ipcMain.handle("get-system-fonts", async () => {
            return await systemFonts.getFonts();
        });

        this.browserWindow.on("close", (e) => {
            // On macOS, when the user closes the window we really
            // just hide it. This lets us activate quickly and
            // keep all our interesting logic in the renderer.
            if (__DARWIN__ && !quitting) {
                e.preventDefault();

                if (this.browserWindow.isFullScreen()) {
                    this.browserWindow.setFullScreen(false);
                    this.browserWindow.once("leave-full-screen", () => app.hide());
                } else {
                    app.hide();
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
        }
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
            new Error("The page could not be loaded before win 'created' event")
          );
        }

        await this.browserWindow.loadURL(
          "app://./index.html"
        );

        Anystack.ifAuthorized(this.browserWindow);
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
