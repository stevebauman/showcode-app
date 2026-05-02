import {app, globalShortcut} from "electron";
import {__DARWIN__, __LINUX__, __WINDOWS__} from "./platform.js";

// Quit when all windows are closed.
app.on("window-all-closed", function () {
    // On macOS it is common for applications and their menu bar
    // to stay active until the user quits explicitly with Cmd + Q.
    if (__DARWIN__) {
        return;
    }

    app.quit();
});

app.whenReady().then(() => {
    if (!app.isEmojiPanelSupported()) {
        return;
    }

    if (__DARWIN__) {
        globalShortcut.register("Super+Shift+Space", () => app.showEmojiPanel());
    }

    if (__LINUX__) {
        globalShortcut.register("Control+.", () => app.showEmojiPanel());
    }

    if (__WINDOWS__) {
        globalShortcut.register("Super+.", () => app.showEmojiPanel());
    }
});

import "./menu.js";
import "./mainWindow.js";
