import { __DARWIN__ } from "./index";
import { autoUpdater } from "electron-updater";
import { app, dialog, shell, Menu } from "electron";

const template = [
  ...(__DARWIN__
    ? [
        {
          label: app.name,
          submenu: [
            { role: "about" },
            {
              label: "Check for updates...",
              click: async () => {
                autoUpdater.once("update-not-available", () => {
                  dialog.showMessageBox({
                    message: "You are running the latest version.",
                  });
                });

                autoUpdater.once("update-available", () => {
                  dialog.showMessageBox({
                    message: "A new update is available! Downloading now...",
                  });
                });

                await autoUpdater.checkForUpdates();
              },
            },
            { type: "separator" },
            { role: "services" },
            { type: "separator" },
            { role: "hide" },
            { role: "hideOthers" },
            { role: "unhide" },
            { type: "separator" },
            { role: "quit" },
          ],
        },
      ]
    : []),
  {
    label: "File",
    submenu: [__DARWIN__ ? { role: "close" } : { role: "quit" }],
  },
  {
    label: "Edit",
    submenu: [
      { role: "undo" },
      { role: "redo" },
      { type: "separator" },
      { role: "cut" },
      { role: "copy" },
      { role: "paste" },
      ...(__DARWIN__
        ? [
            { role: "pasteAndMatchStyle" },
            { role: "delete" },
            { role: "selectAll" },
            { type: "separator" },
            {
              label: "Speech",
              submenu: [{ role: "startSpeaking" }, { role: "stopSpeaking" }],
            },
          ]
        : [{ role: "delete" }, { type: "separator" }, { role: "selectAll" }]),
    ],
  },
  {
    label: "View",
    submenu: [
      { role: "reload" },
      { role: "forceReload" },
      { role: "toggleDevTools" },
      { type: "separator" },
      { role: "resetZoom" },
      { role: "zoomIn" },
      { role: "zoomOut" },
      { type: "separator" },
      { role: "togglefullscreen" },
    ],
  },
  {
    label: "Window",
    submenu: [
      { role: "minimize" },
      { role: "zoom" },
      ...(__DARWIN__
        ? [
            { type: "separator" },
            { role: "front" },
            { type: "separator" },
            { role: "window" },
          ]
        : [{ role: "close" }]),
    ],
  },
  {
    role: "help",
    submenu: [
      {
        label: "GitHub Issues",
        click: async () => {
          await shell.openExternal(
            "https://github.com/stevebauman/showcode/issues",
          );
        },
      },
      {
        label: "Request Support",
        click: async () => {
          await shell.openExternal("mailto:steven_bauman@outlook.com");
        },
      },
      { type: "separator" },
      {
        label: "Download Latest Version",
        click: async () => {
          await shell.openExternal("https://unlock.sh/download/showcode");
        },
      },
    ],
  },
];

const menu = Menu.buildFromTemplate(template);

Menu.setApplicationMenu(menu);
