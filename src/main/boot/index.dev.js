/* eslint-disable */
import { Menu, MenuItem, app } from "electron";
import { ELECTRON_RELAUNCH_CODE } from "../../../.electron-nuxt/config";
import installExtension, { VUEJS_DEVTOOLS } from "electron-devtools-installer";

process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = "true";

app.once("browser-window-created", (_, browserWindow) => {
  browserWindow.webContents.once("did-frame-finish-load", () => {
    browserWindow.webContents.openDevTools();
  });
});

app.on("ready", () => {
  const menu = Menu.getApplicationMenu();

  menu.append(
    new MenuItem({
      label: "Relaunch electron",
      accelerator: "CommandOrControl+E",
      click: () => {
        app.exit(ELECTRON_RELAUNCH_CODE);
      },
    }),
  );

  Menu.setApplicationMenu(menu);

  installExtension(VUEJS_DEVTOOLS);
});

const handleProcessExit = () => {
  app.exit(0);

  process.exit(0);
};

process.on("SIGINT", handleProcessExit);
process.on("SIGQUIT", handleProcessExit);
process.on("SIGTERM", handleProcessExit);

// Require `main` process to boot app
require("../index");
