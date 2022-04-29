import { BrowserWindow } from "electron";

export default class {
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
