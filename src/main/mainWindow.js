import { __DARWIN__, __WINDOWS__ } from "./index";
import BrowserWinHandler from "./BrowserWinHandler";
import WindowStateHandler from "./WindowStateHandler";

const options = { show: false };

if (__DARWIN__) {
  options.titleBarStyle = "hidden";
} else if (__WINDOWS__) {
  options.frame = "hidden";
}

const winHandler = new BrowserWinHandler(options);

winHandler.onCreated(async (browserWindow) => {
  browserWindow.webContents.on("did-finish-load", () => {
    new WindowStateHandler(browserWindow).bind();
  });

  await winHandler.loadPage("/");
});

export default winHandler;
