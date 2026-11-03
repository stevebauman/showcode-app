import assert from "node:assert/strict";
import {mock, test} from "node:test";

const checkForUpdates = mock.fn();
let template;
const app = {name: "Showcode", whenReady: async () => {}, isEmojiPanelSupported: () => false};
mock.module("electron", {
    namedExports: {
        app,
        ipcMain: {on: () => {}, handle: () => {}},
        shell: {},
        Menu: {
            buildFromTemplate: (items) => {
                template = items;
                return {getMenuItemById: () => ({})};
            },
            setApplicationMenu: () => {},
        },
    },
});
mock.module("../main/platform.js", {namedExports: {__DARWIN__: false}});
mock.module("../main/updater.js", {namedExports: {checkForUpdates}});
mock.module("../main/mainWindow.js", {defaultExport: {}});
mock.module("../main/BrowserEventHandler.js", {defaultExport: {send: () => {}}});
mock.module("../main/desktop.js", {namedExports: {windowForEvent: () => {}}});
mock.module("../main/windowIntegrations.js", {namedExports: {setWindowAppearance: () => {}}});

test("Windows and Linux provide a manual update check in the Help menu", async () => {
    await import("../main/menu.js");
    const help = template.find((item) => item.role === "help");
    await help.submenu.find((item) => item.label === "Check for updates...").click();
    assert.equal(checkForUpdates.mock.callCount(), 1);
    assert.deepEqual(checkForUpdates.mock.calls[0].arguments, [{notifyIfCurrent: true}]);
});
