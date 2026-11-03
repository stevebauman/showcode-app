const {contextBridge, ipcRenderer} = require("electron");

const validSendChannels = [
    "minimize",
    "maximize",
    "unmaximize",
    "close",
    "double-click-title-bar",
    "set-menu-state",
    "set-window-appearance",
];

const validInvokeChannels = [
    "get-system-fonts",
    "get-window-state",
    "get-update-state",
    "get-release-notes-state",
    "acknowledge-release-notes",
    "install-update",
    "open-file",
    "save-file",
    "copy-image",
    "confirm-action",
    "confirm-close-project",
    "show-tab-menu",
    "show-export-menu",
    "show-file-menu",
];

const validReceiveChannels = ["window-state-changed", "update-state-changed", "desktop-command"];

const listeners = new Map();

contextBridge.exposeInMainWorld("electronIpc", {
    send: (channel, ...args) => {
        if (validSendChannels.includes(channel)) {
            ipcRenderer.send(channel, ...args);
        }
    },
    invoke: (channel, ...args) => {
        if (validInvokeChannels.includes(channel)) {
            return ipcRenderer.invoke(channel, ...args);
        }
        return Promise.reject(new Error(`Invalid invoke channel: ${channel}`));
    },
    addListener: (channel, listener) => {
        if (validReceiveChannels.includes(channel)) {
            const wrapped = (_event, ...args) => {
                listener(null, ...args);
            };

            if (!listeners.has(channel)) {
                listeners.set(channel, new Map());
            }

            listeners.get(channel).set(listener, wrapped);
            ipcRenderer.addListener(channel, wrapped);
        }
    },
    removeListener: (channel, listener) => {
        if (validReceiveChannels.includes(channel)) {
            const wrapped = listeners.get(channel)?.get(listener);

            if (wrapped) {
                ipcRenderer.removeListener(channel, wrapped);
                listeners.get(channel).delete(listener);
            }
        }
    },
});
