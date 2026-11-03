import {app} from "electron";
import {__DARWIN__} from "./platform.js";

// Quit when all windows are closed.
app.on("window-all-closed", function () {
    // On macOS it is common for applications and their menu bar
    // to stay active until the user quits explicitly with Cmd + Q.
    if (__DARWIN__) {
        return;
    }

    app.quit();
});

import "./desktop.js";
import "./menu.js";
import "./mainWindow.js";
