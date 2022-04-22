import BrowserWinHandler from "./BrowserWinHandler";
import { __DARWIN__ } from "./index";

import WindowStateHandler from "./WindowStateHandler";

const options = { show: false };

if (__DARWIN__) {
  options.titleBarStyle = "hidden";
}

const winHandler = new BrowserWinHandler(options);

winHandler.onCreated(async (browserWindow) => {
  browserWindow.webContents.on("did-finish-load", () => {
    new WindowStateHandler(browserWindow).bind();
  });

  await winHandler.loadPage("/");
});

export default winHandler;
