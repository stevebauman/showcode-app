import {app, ipcMain, shell, Menu} from "electron";
import {__DARWIN__} from "./platform.js";
import {checkForUpdates} from "./updater.js";
import BrowserEventHandler from "./BrowserEventHandler.js";
import winHandler from "./mainWindow.js";
import {windowForEvent} from "./desktop.js";
import {setWindowAppearance} from "./windowIntegrations.js";

const updateMenuItem = {
    label: "Check for updates...",
    click: () => checkForUpdates({notifyIfCurrent: true}),
};

function command(id, label, accelerator) {
    return {
        id,
        label,
        accelerator,
        enabled: false,
        click: () => {
            const window = winHandler.browserWindow;

            if (window) {
                window.show();
                window.focus();
                BrowserEventHandler.send(window, "desktop-command", id);
            }
        },
    };
}

const template = [
    ...(__DARWIN__
        ? [
              {
                  label: app.name,
                  submenu: [
                      {role: "about", label: "About Showcode"},
                      updateMenuItem,
                      {type: "separator"},
                      command("preferences", "Preferences…", "CommandOrControl+,"),
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
        id: "file",
        label: "File",
        submenu: [
            command("new-project", "New Project", "CommandOrControl+T"),
            command("open-saved-projects-modal", "Open Saved Project…", "CommandOrControl+O"),
            {id: "recent-projects", label: "Open Recent", submenu: []},
            command("open-templates-modal", "Open Saved Templates…"),
            command("import-config", "Import Configuration…", "CommandOrControl+Shift+O"),
            {type: "separator"},
            command("save-project", "Save", "CommandOrControl+S"),
            command("save-project-as", "Save As…", "CommandOrControl+Shift+S"),
            command("save-as-template", "Save As Template"),
            {type: "separator"},
            {
                id: "export-image",
                label: "Export Image",
                submenu: [
                    command("export-png", "PNG…", "CommandOrControl+Shift+E"),
                    command("export-jpg", "JPEG…"),
                    command("export-svg", "SVG…"),
                ],
            },
            command("copy-image", "Copy Image", "CommandOrControl+Shift+C"),
            command("export-config", "Export JSON Configuration…"),
            command("export-json", "Export JSON (API Request)…"),
            {type: "separator"},
            command("close-project", "Close Tab", "CommandOrControl+W"),
            command("reopen-closed-project", "Reopen Closed Project", "CommandOrControl+Shift+T"),
            {type: "separator"},
            ...(__DARWIN__
                ? [{role: "close", accelerator: "CommandOrControl+Shift+W"}]
                : [
                      command("preferences", "Preferences…", "CommandOrControl+,"),
                      {type: "separator"},
                      {role: "quit"},
                  ]),
        ],
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
            {type: "separator"},
            {id: "emoji", label: "Emoji & Symbols", click: () => app.showEmojiPanel()},
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
            command("next-project", "Next Tab", "Control+Tab"),
            command("previous-project", "Previous Tab", "Control+Shift+Tab"),
            {type: "separator"},
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
            command("help", "Showcode Help"),
            command("updates", "What's New"),
            command("changelog", "Full Changelog"),
            {type: "separator"},
            ...(__DARWIN__ ? [] : [updateMenuItem, {type: "separator"}]),
            {
                label: "API Documentation",
                click: async () => {
                    await shell.openExternal("https://api.showcode.app/docs");
                },
            },
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

let menu;

const projectCommands = [
    "save-project",
    "save-project-as",
    "save-as-template",
    "export-image",
    "export-png",
    "export-jpg",
    "export-svg",
    "copy-image",
    "export-config",
    "export-json",
];

const applicationCommands = [
    "new-project",
    "open-saved-projects-modal",
    "open-templates-modal",
    "import-config",
    "preferences",
    "help",
    "updates",
    "changelog",
    "close-project",
];

ipcMain.on("set-menu-state", (event, state) => {
    const window = windowForEvent(event);
    const recent = template
        .find((item) => item.id === "file")
        .submenu.find((item) => item.id === "recent-projects");

    recent.enabled = state.recentProjects.length > 0;
    recent.submenu = state.recentProjects.map(({id, name}) => ({
        ...command(`open-recent-${id}`, name || "Untitled Project"),
        enabled: true,
    }));

    // Electron requires a new menu when its structure changes.
    menu = Menu.buildFromTemplate(template);

    for (const id of applicationCommands) {
        menu.getMenuItemById(id).enabled = true;
    }

    for (const id of projectCommands) {
        menu.getMenuItemById(id).enabled = state.hasProject;
    }

    menu.getMenuItemById("reopen-closed-project").enabled = state.canReopen;
    menu.getMenuItemById("next-project").enabled = state.canSwitch;
    menu.getMenuItemById("previous-project").enabled = state.canSwitch;

    menu.getMenuItemById("emoji").enabled = app.isEmojiPanelSupported();
    Menu.setApplicationMenu(menu);

    if (__DARWIN__) {
        window.setDocumentEdited(state.modified);
    }
});

ipcMain.handle("show-file-menu", (event) => {
    menu.getMenuItemById("file").submenu.popup({window: windowForEvent(event)});
});

ipcMain.on("set-window-appearance", (event, theme) => {
    setWindowAppearance(windowForEvent(event), theme === "dark");
});

app.whenReady().then(() => {
    menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
    menu.getMenuItemById("emoji").enabled = app.isEmojiPanelSupported();
});
