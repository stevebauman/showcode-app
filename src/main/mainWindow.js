import BrowserWinHandler from "./BrowserWinHandler";
import { __DARWIN__ } from "./index";

const options = { show: false };

if (__DARWIN__) {
  options.titleBarStyle = "hidden";
}

const winHandler = new BrowserWinHandler(options);

winHandler.onCreated(async (browserWindow) => {
  await winHandler.loadPage("/");
});

export default winHandler;
