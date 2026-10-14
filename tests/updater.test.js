import assert from "node:assert/strict";
import {EventEmitter} from "node:events";
import {beforeEach, mock, test} from "node:test";

const app = new EventEmitter();
app.whenReady = async () => {};
const powerMonitor = new EventEmitter();
const autoUpdater = new EventEmitter();
autoUpdater.checkForUpdates = mock.fn();
autoUpdater.quitAndInstall = mock.fn();
const dialog = {showMessageBox: mock.fn()};
const log = {error: mock.fn(), transports: {file: {}}};
const winHandler = {browserWindow: {setProgressBar: mock.fn()}, quitting: false};

mock.module("electron", {namedExports: {app, dialog, powerMonitor}});
mock.module("electron-updater", {defaultExport: {autoUpdater}});
mock.module("electron-log", {defaultExport: log});
mock.module("../main/mainWindow.js", {defaultExport: winHandler});

beforeEach(() => {
    app.removeAllListeners();
    powerMonitor.removeAllListeners();
    autoUpdater.removeAllListeners();
    app.isPackaged = true;
    winHandler.quitting = false;
    autoUpdater.checkForUpdates.mock.resetCalls();
    autoUpdater.checkForUpdates.mock.mockImplementation(async () => {
        autoUpdater.emit("update-not-available");
        return {};
    });
    autoUpdater.quitAndInstall.mock.resetCalls();
    dialog.showMessageBox.mock.resetCalls();
    dialog.showMessageBox.mock.mockImplementation(async () => ({response: 1}));
    log.error.mock.resetCalls();
    winHandler.browserWindow.setProgressBar.mock.resetCalls();
});

test("packaged apps check after startup and every ten minutes without current-version dialogs", async (t) => {
    t.mock.timers.enable({apis: ["setTimeout"]});
    await import("../main/updater.js?startup");

    t.mock.timers.tick(9999);
    assert.equal(autoUpdater.checkForUpdates.mock.callCount(), 0);
    t.mock.timers.tick(1);
    await new Promise(setImmediate);
    assert.equal(autoUpdater.checkForUpdates.mock.callCount(), 1);

    t.mock.timers.tick(10 * 60 * 1000);
    await new Promise(setImmediate);
    assert.equal(autoUpdater.checkForUpdates.mock.callCount(), 2);
    assert.equal(dialog.showMessageBox.mock.callCount(), 0);
    assert.equal(autoUpdater.allowPrerelease, false);
    assert.equal(autoUpdater.autoDownload, true);
    assert.equal(autoUpdater.autoInstallOnAppQuit, true);
});

test("waking schedules a check after the network can reconnect and restarts the interval", async (t) => {
    t.mock.timers.enable({apis: ["setTimeout"]});
    await import("../main/updater.js?resume");
    t.mock.timers.tick(10 * 1000);
    await new Promise(setImmediate);
    t.mock.timers.tick(5 * 60 * 1000);
    powerMonitor.emit("resume");
    t.mock.timers.tick(9999);
    assert.equal(autoUpdater.checkForUpdates.mock.callCount(), 1);
    t.mock.timers.tick(1);
    await new Promise(setImmediate);
    assert.equal(autoUpdater.checkForUpdates.mock.callCount(), 2);

    t.mock.timers.tick(5 * 60 * 1000);
    assert.equal(autoUpdater.checkForUpdates.mock.callCount(), 2);
    t.mock.timers.tick(5 * 60 * 1000);
    await new Promise(setImmediate);
    assert.equal(autoUpdater.checkForUpdates.mock.callCount(), 3);
});

test("development sessions do not schedule automatic checks", async (t) => {
    t.mock.timers.enable({apis: ["setTimeout"]});
    app.isPackaged = false;
    await import("../main/updater.js?development");
    powerMonitor.emit("resume");
    t.mock.timers.tick(60 * 60 * 1000);
    assert.equal(autoUpdater.checkForUpdates.mock.callCount(), 0);
    assert.equal(powerMonitor.listenerCount("resume"), 0);
});

test("quitting cancels the startup check and wake listener", async (t) => {
    t.mock.timers.enable({apis: ["setTimeout"]});
    await import("../main/updater.js?quit");
    app.emit("before-quit");
    powerMonitor.emit("resume");
    t.mock.timers.tick(60 * 60 * 1000);
    assert.equal(autoUpdater.checkForUpdates.mock.callCount(), 0);
    assert.equal(powerMonitor.listenerCount("resume"), 0);
});

test("manual checks can join a pending background check without making a second request", async (t) => {
    t.mock.timers.enable({apis: ["setTimeout"]});
    let complete;
    autoUpdater.checkForUpdates.mock.mockImplementation(
        () =>
            new Promise((resolve) => {
                complete = resolve;
            }),
    );
    const {checkForUpdates} = await import("../main/updater.js?overlap");
    const pending = checkForUpdates();
    await checkForUpdates({notifyIfCurrent: true});
    assert.equal(autoUpdater.checkForUpdates.mock.callCount(), 1);

    autoUpdater.emit("update-not-available");
    complete({});
    await pending;
    assert.equal(dialog.showMessageBox.mock.callCount(), 1);
    assert.match(dialog.showMessageBox.mock.calls[0].arguments[0].message, /latest version/);
});

test("failed background checks stay quiet and retry at the next interval", async (t) => {
    t.mock.timers.enable({apis: ["setTimeout"]});
    autoUpdater.checkForUpdates.mock.mockImplementation(async () => {
        throw new Error("Network unavailable");
    });
    await import("../main/updater.js?retry");
    t.mock.timers.tick(10 * 1000);
    await new Promise(setImmediate);
    assert.equal(log.error.mock.callCount(), 1);
    assert.equal(dialog.showMessageBox.mock.callCount(), 0);

    autoUpdater.checkForUpdates.mock.mockImplementation(async () => {
        autoUpdater.emit("update-not-available");
        return {};
    });
    t.mock.timers.tick(10 * 60 * 1000);
    await new Promise(setImmediate);
    assert.equal(autoUpdater.checkForUpdates.mock.callCount(), 2);
});

test("downloads prevent overlapping checks and failures allow another attempt", async (t) => {
    t.mock.timers.enable({apis: ["setTimeout"]});
    let rejectDownload;
    const downloadPromise = new Promise((resolve, reject) => {
        rejectDownload = reject;
    });
    autoUpdater.checkForUpdates.mock.mockImplementation(async () => ({downloadPromise}));
    const {checkForUpdates} = await import("../main/updater.js?download-failure");
    const pending = checkForUpdates();
    await new Promise(setImmediate);
    await checkForUpdates();
    assert.equal(autoUpdater.checkForUpdates.mock.callCount(), 1);

    autoUpdater.emit("error", new Error("Download interrupted"));
    rejectDownload(new Error("Download interrupted"));
    await pending;
    assert.equal(dialog.showMessageBox.mock.callCount(), 0);
    assert.deepEqual(winHandler.browserWindow.setProgressBar.mock.calls[0].arguments, [-1]);

    autoUpdater.checkForUpdates.mock.mockImplementation(async () => {
        throw new Error("Still offline");
    });
    await checkForUpdates({notifyIfCurrent: true});
    assert.equal(autoUpdater.checkForUpdates.mock.callCount(), 2);
    assert.equal(dialog.showMessageBox.mock.calls[0].arguments[0].type, "error");
});

test("downloaded updates prompt once and only restart when requested", async (t) => {
    t.mock.timers.enable({apis: ["setTimeout"]});
    const {checkForUpdates} = await import("../main/updater.js?install");
    autoUpdater.emit("download-progress", {percent: 50});
    assert.deepEqual(winHandler.browserWindow.setProgressBar.mock.calls[0].arguments, [0.5]);
    autoUpdater.emit("update-downloaded");
    await new Promise(setImmediate);
    assert.equal(dialog.showMessageBox.mock.callCount(), 1);
    assert.equal(autoUpdater.quitAndInstall.mock.callCount(), 0);

    t.mock.timers.tick(10 * 1000);
    await checkForUpdates();
    assert.equal(autoUpdater.checkForUpdates.mock.callCount(), 0);
    assert.equal(dialog.showMessageBox.mock.callCount(), 1);

    dialog.showMessageBox.mock.mockImplementation(async () => ({response: 0}));
    await checkForUpdates({notifyIfCurrent: true});
    assert.equal(winHandler.quitting, true);
    assert.equal(autoUpdater.quitAndInstall.mock.callCount(), 1);
});
