import {__DARWIN__, __WINDOWS__} from "./platform.js";
import BrowserWinHandler from "./BrowserWindowHandler.js";
import WindowStateHandler from "./WindowStateHandler.js";

const options = {show: false};

if (__DARWIN__) {
    options.titleBarStyle = "hiddenInset";
    options.trafficLightPosition = {x: 12, y: 8};
    options.vibrancy = "sidebar";
    options.visualEffectState = "active";
    options.backgroundColor = "#00000000";
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

export default winHandler;
