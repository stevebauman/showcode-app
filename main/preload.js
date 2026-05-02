const {contextBridge, ipcRenderer} = require("electron");

const validSendChannels = [
    "minimize",
    "maximize",
    "unmaximize",
    "close",
    "double-click-title-bar",
];

const validInvokeChannels = [
    "get-system-fonts",
    "get-window-state",
];

const validReceiveChannels = [
    "window-state-changed",
];

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
            ipcRenderer.addListener(channel, listener);
        }
    },
    removeListener: (channel, listener) => {
        if (validReceiveChannels.includes(channel)) {
            ipcRenderer.removeListener(channel, listener);
        }
    },
});
