const {app, protocol, globalShortcut, net} = require("electron");
const path = require("path");
const {pathToFileURL} = require("url");

if (!app.isPackaged) {
    require("dotenv").config();
}
const __DARWIN__ = process.platform === "darwin";
const __LINUX__ = process.platform === "linux";
const __WINDOWS__ = process.platform === "win32";

protocol.registerSchemesAsPrivileged([
  {
    scheme: 'app',
    privileges: {
      secure: true,
      standard: true,
      supportFetchAPI: true,
    },
  },
]);

// Quit when all windows are closed.
app.on("window-all-closed", function () {
    // On macOS it is common for applications and their menu bar
    // to stay active until the user quits explicitly with Cmd + Q.
    if (__DARWIN__) {
        return;
    }

    app.quit();
});

app.on('ready', function () {
  protocol.handle('app', (request) => {
    // Strip 'app://' from the URL
    const url = request.url.slice('app://'.length);

    // Build the full path to the file
    const normalizedPath = path.normalize(`${__dirname}/../showcode/dist/${url}`);

    return net.fetch(pathToFileURL(normalizedPath).toString());
  });
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

module.exports = {
    __DARWIN__,
    __LINUX__,
    __WINDOWS__,
};

require("./menu.js");
require("./mainWindow.js");
