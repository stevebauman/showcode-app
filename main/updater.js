import electronUpdater from "electron-updater";
import {app, dialog, powerMonitor} from "electron";
import log from "electron-log";
import winHandler from "./mainWindow.js";

const {autoUpdater} = electronUpdater;
const startupDelay = 10 * 1000;
const checkInterval = 10 * 60 * 1000;

let timer;
let checkingForUpdates = false;
let userInitiatedCheck = false;
let updateReady = false;

autoUpdater.logger = log;
autoUpdater.logger.transports.file.level = app.isPackaged ? "info" : "debug";
autoUpdater.allowPrerelease = false;
autoUpdater.autoDownload = true;
autoUpdater.autoInstallOnAppQuit = true;

if (!app.isPackaged) {
    autoUpdater.forceDevUpdateConfig = true;
}

async function promptToInstall() {
    const {response} = await dialog.showMessageBox({
        type: "info",
        buttons: ["Restart", "Later"],
        defaultId: 0,
        cancelId: 1,
        message: "Update ready to install. Restart now to finish updating?",
    });

    if (response === 0) {
        // Allow the updater to close the window instead of hiding it on macOS.
        winHandler.quitting = true;
        autoUpdater.quitAndInstall();
    }
}

export async function checkForUpdates({notifyIfCurrent = false} = {}) {
    if (updateReady) {
        if (notifyIfCurrent) await promptToInstall();
        return;
    }

    if (checkingForUpdates) {
        userInitiatedCheck ||= notifyIfCurrent;
        return;
    }

    checkingForUpdates = true;
    userInitiatedCheck = notifyIfCurrent;

    try {
        const result = await autoUpdater.checkForUpdates();
        await result?.downloadPromise;
    } catch (error) {
        log.error("Unable to update Showcode", error);

        if (userInitiatedCheck) {
            await dialog.showMessageBox({
                type: "error",
                message: "Showcode could not check for or download updates.",
                detail: "Please check your internet connection and try again.",
            });
        }
    } finally {
        checkingForUpdates = false;
        userInitiatedCheck = false;
    }
}

autoUpdater.on("update-not-available", () => {
    if (userInitiatedCheck) {
        void dialog.showMessageBox({message: "You are running the latest version."});
    }
});

autoUpdater.on("update-available", () => {
    if (userInitiatedCheck) {
        void dialog.showMessageBox({message: "A new update is available! Downloading now..."});
    }
});

autoUpdater.on("download-progress", ({percent}) => {
    winHandler.browserWindow?.setProgressBar(percent / 100);
});

autoUpdater.on("update-downloaded", () => {
    updateReady = true;
    winHandler.browserWindow?.setProgressBar(-1);
    void promptToInstall();
});

autoUpdater.on("error", () => {
    winHandler.browserWindow?.setProgressBar(-1);
});

function scheduleCheck(delay) {
    clearTimeout(timer);
    timer = setTimeout(() => {
        void checkForUpdates();
        scheduleCheck(checkInterval);
    }, delay);
}

function resumeChecks() {
    // Give the network time to reconnect after waking from sleep.
    scheduleCheck(startupDelay);
}

app.whenReady().then(() => {
    if (!app.isPackaged) return;

    scheduleCheck(startupDelay);
    powerMonitor.on("resume", resumeChecks);
});

app.on("before-quit", () => {
    clearTimeout(timer);
    powerMonitor.removeListener("resume", resumeChecks);
});
