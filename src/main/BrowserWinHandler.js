/* eslint-disable */
import { __DARWIN__ } from ".";
import { EventEmitter } from "events";
import { autoUpdater } from "electron-updater";
import { BrowserWindow, app, ipcMain } from "electron";
import windowStateKeeper from "electron-window-state";
import WindowStateHandler from "./WindowStateHandler";

const DEV_SERVER_URL = process.env.DEV_SERVER_URL;
const isProduction = process.env.NODE_ENV === "production";
const isDev = process.env.NODE_ENV === "development";

const Unlock = new (require("@unlocksh/electron-license"))(
  {
    api: {
      key: "TG6bZak5SKKMix62JGUuJfhkuqcEHAqd",
      productId: "03a84e20-7d70-4f59-88bb-3c5bea5c6d13",
    },
    license: {
      requireEmail: true,
      encryptionKey: "jN6okKotbfz0wErG7e0ShczvtJXivTaB",
    },
    prompt: {
      title: "Showcode",
      logo: "http://showcode.app/app-icon.svg",
    },
  },
  autoUpdater
);

export default class BrowserWinHandler {
  /**
   * @param [options] {object} - browser window options
   * @param [allowRecreate] {boolean}
   */
  constructor(options, allowRecreate = true) {
    this._eventEmitter = new EventEmitter();
    this.allowRecreate = allowRecreate;
    this.options = options;
    this.browserWindow = null;

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
      defaultWidth: 1280,
      defaultHeight: 720,
    });

    this.browserWindow = new BrowserWindow({
      ...this.options,
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
        webSecurity: isProduction, // Disable on dev to allow loading local resources
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
    ipcMain.on("unmaximize", () => this.browserWindow.unmaximize());
    ipcMain.on("minimize", () => this.browserWindow.minimize());

    ipcMain.on("double-click-title-bar", () => {
      this.browserWindow.isMaximized()
        ? this.browserWindow.unmaximize()
        : this.browserWindow.maximize();
    });

    ipcMain.handle("get-window-state", async () => {
      return new WindowStateHandler(this.browserWindow).get();
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

  async loadPage(pagePath) {
    if (!this.browserWindow) {
      return Promise.reject(
        new Error("The page could not be loaded before win 'created' event")
      );
    }

    const serverUrl = isDev ? DEV_SERVER_URL : "app://./index.html";
    const fullPath = serverUrl + "#" + pagePath;
    await this.browserWindow.loadURL(fullPath);

    Unlock.ifAuthorized(this.browserWindow);
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
