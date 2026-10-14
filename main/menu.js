import {app, shell, Menu} from "electron";
import {__DARWIN__} from "./platform.js";
import {checkForUpdates} from "./updater.js";

const updateMenuItem = {
    label: "Check for updates...",
    click: () => checkForUpdates({notifyIfCurrent: true}),
};

const template = [
    ...(__DARWIN__
        ? [
              {
                  label: app.name,
                  submenu: [
                      {role: "about", label: "About Showcode"},
                      updateMenuItem,
                      {type: "separator"},
                      {role: "services"},
                      {type: "separator"},
                      {role: "hide"},
                      {role: "hideOthers"},
                      {role: "unhide"},
                      {type: "separator"},
                      {role: "quit", label: "Quit Showcode"},
                  ],
              },
          ]
        : []),
    {
        label: "File",
        submenu: [__DARWIN__ ? {role: "close"} : {role: "quit"}],
    },
    {
        label: "Edit",
        submenu: [
            {role: "undo"},
            {role: "redo"},
            {type: "separator"},
            {role: "cut"},
            {role: "copy"},
            {role: "paste"},
            ...(__DARWIN__
                ? [
                      {role: "pasteAndMatchStyle"},
                      {role: "delete"},
                      {role: "selectAll"},
                      {type: "separator"},
                      {
                          label: "Speech",
                          submenu: [{role: "startSpeaking"}, {role: "stopSpeaking"}],
                      },
                  ]
                : [{role: "delete"}, {type: "separator"}, {role: "selectAll"}]),
        ],
    },
    {
        label: "View",
        submenu: [
            {role: "reload"},
            {role: "forceReload"},
            {role: "toggleDevTools"},
            {type: "separator"},
            {role: "resetZoom"},
            {role: "zoomIn"},
            {role: "zoomOut"},
            {type: "separator"},
            {role: "togglefullscreen"},
        ],
    },
    {
        label: "Window",
        submenu: [
            {role: "minimize"},
            {role: "zoom"},
            ...(__DARWIN__
                ? [{type: "separator"}, {role: "front"}, {type: "separator"}, {role: "window"}]
                : [{role: "close"}]),
        ],
    },
    {
        role: "help",
        submenu: [
            ...(__DARWIN__ ? [] : [updateMenuItem, {type: "separator"}]),
            {
                label: "GitHub Issues",
                click: async () => {
                    await shell.openExternal("https://github.com/stevebauman/showcode-app/issues");
                },
            },
            {
                label: "Request Support",
                click: async () => {
                    await shell.openExternal("mailto:steven_bauman@outlook.com");
                },
            },
            {type: "separator"},
            {
                label: "Download Latest Version",
                click: async () => {
                    await shell.openExternal(
                        "https://github.com/stevebauman/showcode-app/releases/latest",
                    );
                },
            },
        ],
    },
];

const menu = Menu.buildFromTemplate(template);

Menu.setApplicationMenu(menu);
