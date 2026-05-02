const {__DARWIN__, __WINDOWS__} = require("./index.js");
const BrowserWinHandler = require("./BrowserWindowHandler");
const WindowStateHandler = require("./WindowStateHandler");

const options = {show: false};

if (__DARWIN__) {
    options.titleBarStyle = "hidden";
} else if (__WINDOWS__) {
    options.frame = false;
}

const winHandler = new BrowserWinHandler(options);

winHandler.onCreated(async (browserWindow) => {
    browserWindow.webContents.on("did-finish-load", () => {
        new WindowStateHandler(browserWindow).bind();
    });

    await winHandler.load();
});

module.exports = winHandler;
