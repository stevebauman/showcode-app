import assert from "node:assert/strict";
import {EventEmitter} from "node:events";
import {mkdtemp, readFile, rm, writeFile} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {after, beforeEach, mock, test} from "node:test";

const handlers = new Map();
const window = {};
const sender = {mainFrame: {}};
const event = {sender, senderFrame: sender.mainFrame};
const dialog = {showOpenDialog: mock.fn(), showSaveDialog: mock.fn(), showMessageBox: mock.fn()};
const clipboard = {writeImage: mock.fn()};
const shell = {openExternal: mock.fn()};
const menus = [];
const nativeTheme = new EventEmitter();

mock.module("electron", {
    namedExports: {
        app: {},
        BrowserWindow: {fromWebContents: (contents) => (contents === sender ? window : null)},
        ipcMain: {handle: (channel, callback) => handlers.set(channel, callback)},
        dialog,
        clipboard,
        nativeImage: {createFromBuffer: (buffer) => ({buffer, isEmpty: () => buffer.length === 0})},
        Menu: {
            buildFromTemplate: (items) => {
                const menu = {items, popup: mock.fn()};
                menus.push(menu);
                return menu;
            },
        },
        nativeTheme,
        shell,
        systemPreferences: {getUserDefault: () => "None"},
    },
});

const {windowForEvent} = await import("../main/desktop.js");
const {
    default: integrateWindow,
    openExternal,
    doubleClickTitleBar,
} = await import("../main/windowIntegrations.js");
const directory = await mkdtemp(path.join(os.tmpdir(), "showcode-desktop-test-"));

after(() => rm(directory, {recursive: true, force: true}));
beforeEach(() => {
    for (const method of Object.values(dialog)) method.mock.resetCalls();
    clipboard.writeImage.mock.resetCalls();
    shell.openExternal.mock.resetCalls();
    menus.length = 0;
});

test("file access rejects child frames and unknown windows", () => {
    assert.throws(() => windowForEvent({...event, senderFrame: {}}));
    assert.throws(() => windowForEvent({...event, sender: {}}));
    assert.equal(windowForEvent(event), window);
});

test("release note preferences reject requests outside the application frame", () => {
    assert.throws(() => handlers.get("get-release-notes-state")({...event, senderFrame: {}}));
    assert.throws(() =>
        handlers.get("acknowledge-release-notes")(
            {...event, sender: {}},
            {releaseIds: ["workspace-refresh"], showAfterUpdate: true},
        ),
    );
});

test("cancelling file dialogs does not read or overwrite files", async () => {
    dialog.showOpenDialog.mock.mockImplementation(async () => ({canceled: true, filePaths: []}));
    dialog.showSaveDialog.mock.mockImplementation(async () => ({canceled: true}));

    assert.equal(await handlers.get("open-file")(event, "project"), null);
    assert.equal(
        await handlers.get("save-file")(event, {
            name: "project.json",
            data: new Uint8Array([1]),
            extension: "json",
        }),
        false,
    );
});

test("exports write exact binary data only to the path selected in the save dialog", async () => {
    const filePath = path.join(directory, "export.png");
    const data = new Uint8Array([137, 80, 78, 71, 0, 255]);
    dialog.showSaveDialog.mock.mockImplementation(async () => ({canceled: false, filePath}));

    assert.equal(
        await handlers.get("save-file")(event, {name: "../../export.png", data, extension: "png"}),
        true,
    );
    assert.deepEqual(await readFile(filePath), Buffer.from(data));
    assert.equal(dialog.showSaveDialog.mock.calls[0].arguments[0], window);
    assert.equal(dialog.showSaveDialog.mock.calls[0].arguments[1].defaultPath, "export.png");
});

test("imports return the selected file contents without exposing filesystem paths", async () => {
    const filePath = path.join(directory, "project.json");
    await writeFile(filePath, '{"tab":{"name":"Example"}}');
    dialog.showOpenDialog.mock.mockImplementation(async () => ({
        canceled: false,
        filePaths: [filePath],
    }));

    const file = await handlers.get("open-file")(event, "project");

    assert.equal(file.name, "project.json");
    assert.equal(file.data.toString(), '{"tab":{"name":"Example"}}');
    assert.deepEqual(Object.keys(file), ["name", "data"]);
});

test("unsupported file operations are rejected before opening a dialog", async () => {
    await assert.rejects(handlers.get("open-file")(event, "directory"));
    await assert.rejects(
        handlers.get("save-file")(event, {
            name: "script.sh",
            data: new Uint8Array(),
            extension: "sh",
        }),
    );
    assert.equal(dialog.showOpenDialog.mock.callCount(), 0);
    assert.equal(dialog.showSaveDialog.mock.callCount(), 0);
});

test("clipboard writes reject empty image data", () => {
    assert.throws(() => handlers.get("copy-image")(event, new Uint8Array()));
    assert.equal(clipboard.writeImage.mock.callCount(), 0);

    handlers.get("copy-image")(event, new Uint8Array([1, 2, 3]));
    assert.deepEqual(
        clipboard.writeImage.mock.calls[0].arguments[0].buffer,
        Buffer.from([1, 2, 3]),
    );
});

test("destructive dialogs default to cancel and distinguish save, discard, and cancel", async () => {
    dialog.showMessageBox.mock.mockImplementation(async () => ({response: 0}));
    assert.equal(await handlers.get("confirm-action")(event, {message: "Delete?"}), false);
    assert.equal(dialog.showMessageBox.mock.calls[0].arguments[1].defaultId, 0);
    assert.equal(dialog.showMessageBox.mock.calls[0].arguments[1].cancelId, 0);

    for (const [response, action] of [
        [0, "save"],
        [1, "cancel"],
        [2, "discard"],
    ]) {
        dialog.showMessageBox.mock.mockImplementation(async () => ({response}));
        assert.equal(await handlers.get("confirm-close-project")(event, "Example"), action);
    }
});

test("dismissing a native popup returns no action", async () => {
    const result = handlers.get("show-export-menu")(event);
    menus[0].popup.mock.calls[0].arguments[0].callback();

    assert.equal(await result, null);
});

test("native popup selections resolve to the selected action", async () => {
    const result = handlers.get("show-export-menu")(event);
    menus[0].items[1].click();
    menus[0].popup.mock.calls[0].arguments[0].callback();

    assert.equal(await result, "toJpeg");
});

test("external links only launch the browser or mail client for supported protocols", () => {
    openExternal("https://showcode.app");
    openExternal("mailto:example@example.com");
    openExternal("file:///tmp/example");
    openExternal("javascript:alert(1)");

    assert.equal(shell.openExternal.mock.callCount(), 2);
});

test("navigation retains internal routes and opens external pages outside the app", () => {
    const webContents = new EventEmitter();
    webContents.getURL = () => "app://-/index.html";
    webContents.setWindowOpenHandler = mock.fn();
    const browserWindow = new EventEmitter();
    browserWindow.webContents = webContents;
    browserWindow.setTitleBarOverlay = mock.fn();
    integrateWindow(browserWindow);

    const internal = {preventDefault: mock.fn()};
    webContents.emit("will-navigate", internal, "app://-/generator");
    assert.equal(internal.preventDefault.mock.callCount(), 0);

    const external = {preventDefault: mock.fn()};
    webContents.emit("will-navigate", external, "https://showcode.app");
    assert.equal(external.preventDefault.mock.callCount(), 1);
    assert.equal(shell.openExternal.mock.callCount(), 1);

    assert.deepEqual(
        webContents.setWindowOpenHandler.mock.calls[0].arguments[0]({url: "https://showcode.app"}),
        {action: "deny"},
    );

    const listenerCount = nativeTheme.listenerCount("updated");
    browserWindow.emit("closed");
    assert.equal(nativeTheme.listenerCount("updated"), listenerCount - 1);
});

test(
    "macOS titlebar double-click respects the system's do-nothing preference",
    {
        skip: process.platform !== "darwin",
    },
    () => {
        doubleClickTitleBar({});
    },
);
