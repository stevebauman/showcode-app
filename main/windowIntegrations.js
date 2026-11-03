import {Menu, nativeTheme, shell, systemPreferences} from "electron";
import {__DARWIN__, __WINDOWS__} from "./platform.js";

export function openExternal(url) {
    if (["https:", "http:", "mailto:"].includes(new URL(url).protocol)) {
        return shell.openExternal(url);
    }
}

export function doubleClickTitleBar(window) {
    const action = __DARWIN__
        ? systemPreferences.getUserDefault("AppleActionOnDoubleClick", "string")
        : "Maximize";

    if (action === "Minimize") {
        window.minimize();
    } else if (action !== "None") {
        window.isMaximized() ? window.unmaximize() : window.maximize();
    }
}

export function setWindowAppearance(window, dark) {
    if (__WINDOWS__) {
        window.setTitleBarOverlay({
            color: dark ? "#18181b" : "#f4f4f5",
            symbolColor: dark ? "#fafafa" : "#18181b",
            height: 28,
        });
    }
}

export default function (window) {
    const {webContents} = window;

    webContents.setWindowOpenHandler(({url}) => {
        void openExternal(url);

        return {action: "deny"};
    });

    webContents.on("will-navigate", (event, url) => {
        const current = new URL(webContents.getURL());
        const destination = new URL(url);

        if (current.protocol === destination.protocol && current.host === destination.host) {
            return;
        }

        event.preventDefault();
        void openExternal(url);
    });

    webContents.on("context-menu", (event, params) => {
        // Monaco supplies its own language-aware editor menu.
        if (!params.isEditable || params.formControlType === "input-password") {
            return;
        }

        const {editFlags} = params;

        Menu.buildFromTemplate([
            {role: "undo", enabled: editFlags.canUndo},
            {role: "redo", enabled: editFlags.canRedo},
            {type: "separator"},
            {role: "cut", enabled: editFlags.canCut},
            {role: "copy", enabled: editFlags.canCopy},
            {role: "paste", enabled: editFlags.canPaste},
            {type: "separator"},
            {role: "selectAll", enabled: editFlags.canSelectAll},
        ]).popup({window});
    });

    const updateAppearance = () => setWindowAppearance(window, nativeTheme.shouldUseDarkColors);

    updateAppearance();
    nativeTheme.on("updated", updateAppearance);
    window.once("closed", () => nativeTheme.removeListener("updated", updateAppearance));
}
