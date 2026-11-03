import {__DARWIN__, __WINDOWS__} from "./platform.js";
import BrowserWinHandler from "./BrowserWindowHandler.js";

const options = {show: false};

if (__DARWIN__) {
    options.titleBarStyle = "hiddenInset";
    options.trafficLightPosition = {x: 12, y: 16};
    options.vibrancy = "sidebar";
    options.visualEffectState = "active";
    options.backgroundColor = "#00000000";
} else if (__WINDOWS__) {
    options.titleBarStyle = "hidden";
    options.titleBarOverlay = {height: 28};
}

const winHandler = new BrowserWinHandler(options);

winHandler.onCreated(async (browserWindow) => {
    await winHandler.load();
});

export default winHandler;
