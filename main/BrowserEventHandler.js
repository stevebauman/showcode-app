const {BrowserWindow} = require("electron");

module.exports = class BrowserEventHandler {
    /**
     * @param browserWindow {BrowserWindow}
     * @param {String} event
     * @param {*} state
     */
    static send(browserWindow, event, state) {
        if (browserWindow.webContents.isDestroyed()) {
            return;
        }

        browserWindow.webContents.send(event, state);
    }
}
