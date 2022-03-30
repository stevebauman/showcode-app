import BrowserWinHandler from "./BrowserWinHandler";

const winHandler = new BrowserWinHandler({
  show: false,
});

winHandler.onCreated(async (browserWindow) => {
  await winHandler.loadPage("/");
});

export default winHandler;
