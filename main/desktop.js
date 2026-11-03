import path from "node:path";
import {readFile, writeFile} from "node:fs/promises";
import {BrowserWindow, clipboard, dialog, ipcMain, Menu, nativeImage} from "electron";
import {acknowledgeReleaseNotes, getReleaseNotesState} from "./releaseNotes.js";

const fileTypes = {
    json: {name: "Showcode Configuration", extensions: ["json"]},
    png: {name: "PNG Image", extensions: ["png"]},
    jpg: {name: "JPEG Image", extensions: ["jpg", "jpeg"]},
    svg: {name: "SVG Image", extensions: ["svg"]},
};

export function windowForEvent(event) {
    const window = BrowserWindow.fromWebContents(event.sender);

    if (!window || event.senderFrame !== event.sender.mainFrame) {
        throw new Error("Desktop actions must originate from the application window.");
    }

    return window;
}

function popup(window, items) {
    return new Promise((resolve) => {
        const menu = Menu.buildFromTemplate(
            items.map((item) => ({...item, click: () => resolve(item.id)})),
        );

        menu.popup({window, callback: () => resolve(null)});
    });
}

ipcMain.handle("get-release-notes-state", (event) => {
    windowForEvent(event);

    return getReleaseNotesState();
});

ipcMain.handle("acknowledge-release-notes", (event, {releaseIds, showAfterUpdate}) => {
    windowForEvent(event);

    return acknowledgeReleaseNotes(releaseIds, showAfterUpdate);
});

ipcMain.handle("open-file", async (event, kind) => {
    const window = windowForEvent(event);
    const filters = {
        project: [fileTypes.json],
        background: [{name: "Images", extensions: ["png", "jpg", "jpeg", "gif", "webp"]}],
    }[kind];

    if (!filters) {
        throw new Error("Unsupported file type.");
    }

    const {canceled, filePaths} = await dialog.showOpenDialog(window, {
        title: kind === "project" ? "Import Showcode Configuration" : "Choose a Background Image",
        properties: ["openFile"],
        filters,
    });

    if (canceled) {
        return null;
    }

    return {name: path.basename(filePaths[0]), data: await readFile(filePaths[0])};
});

ipcMain.handle("save-file", async (event, {name, data, extension}) => {
    const window = windowForEvent(event);
    const filter = fileTypes[extension];

    if (!filter || !(data instanceof Uint8Array)) {
        throw new Error("Unsupported file export.");
    }

    const {canceled, filePath} = await dialog.showSaveDialog(window, {
        title: extension === "json" ? "Export Showcode Configuration" : "Export Image",
        defaultPath: path.basename(name.replaceAll("\\", "/")),
        filters: [filter],
        properties: ["createDirectory", "showOverwriteConfirmation"],
    });

    if (canceled) {
        return false;
    }

    await writeFile(filePath, data);

    return true;
});

ipcMain.handle("copy-image", (event, data) => {
    windowForEvent(event);

    if (!(data instanceof Uint8Array)) {
        throw new Error("An image is required.");
    }

    const image = nativeImage.createFromBuffer(Buffer.from(data));

    if (image.isEmpty()) {
        throw new Error("The image could not be copied.");
    }

    clipboard.writeImage(image);
});

ipcMain.handle("confirm-action", async (event, {message, detail, buttonLabel = "Delete"}) => {
    const {response} = await dialog.showMessageBox(windowForEvent(event), {
        type: "warning",
        message,
        detail,
        buttons: ["Cancel", buttonLabel],
        defaultId: 0,
        cancelId: 0,
        noLink: true,
    });

    return response === 1;
});

ipcMain.handle("confirm-close-project", async (event, name) => {
    const {response} = await dialog.showMessageBox(windowForEvent(event), {
        type: "question",
        message: `Save changes to “${name || "Untitled Project"}” before closing?`,
        detail: "Save it to your project library, or discard the changes and close this tab.",
        buttons: ["Save Project", "Cancel", "Discard"],
        defaultId: 0,
        cancelId: 1,
        noLink: true,
    });

    return ["save", "cancel", "discard"][response];
});

ipcMain.handle("show-tab-menu", (event, state) => {
    return popup(windowForEvent(event), [
        {id: "save", label: "Save", enabled: !state.starting},
        {id: "save-as", label: "Save As…", enabled: !state.starting},
        {type: "separator"},
        {id: "rename", label: "Rename…", enabled: !state.starting},
        {id: "duplicate", label: "Duplicate", enabled: !state.starting},
        {type: "separator"},
        {id: "close", label: "Close Tab"},
        {id: "close-others", label: "Close Other Projects", enabled: state.canCloseOthers},
        {
            id: "close-projects-to-left",
            label: "Close Projects to the Left",
            enabled: state.canCloseProjectsToLeft,
        },
        {
            id: "close-projects-to-right",
            label: "Close Projects to the Right",
            enabled: state.canCloseProjectsToRight,
        },
        {type: "separator"},
        {
            id: "reopen-closed",
            label: "Reopen Closed Project",
            enabled: state.canReopenClosedProject,
        },
    ]);
});

ipcMain.handle("show-export-menu", (event) => {
    return popup(windowForEvent(event), [
        {id: "toPng", label: "PNG"},
        {id: "toJpeg", label: "JPEG"},
        {id: "toSvg", label: "SVG"},
    ]);
});
