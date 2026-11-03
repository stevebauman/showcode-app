import assert from "node:assert/strict";
import {EventEmitter} from "node:events";
import {readFileSync} from "node:fs";
import {test} from "node:test";
import vm from "node:vm";

const source = readFileSync(new URL("../main/preload.cjs", import.meta.url), "utf8");

test("the renderer cannot invoke arbitrary IPC channels", async () => {
    let bridge;
    const sent = [];
    vm.runInNewContext(source, {
        require: () => ({
            contextBridge: {exposeInMainWorld: (_name, api) => (bridge = api)},
            ipcRenderer: {send: (...args) => sent.push(args)},
        }),
    });

    bridge.send("arbitrary-channel", "payload");
    assert.equal(sent.length, 0);
    await assert.rejects(bridge.invoke("arbitrary-channel"), /Invalid invoke channel/);
});

test("IPC listeners never expose the privileged event and can be removed per channel", () => {
    let bridge;
    const ipcRenderer = new EventEmitter();
    vm.runInNewContext(source, {
        require: () => ({
            contextBridge: {exposeInMainWorld: (_name, api) => (bridge = api)},
            ipcRenderer,
        }),
    });

    const received = [];
    const listener = (...args) => received.push(args);
    bridge.addListener("desktop-command", listener);
    bridge.addListener("window-state-changed", listener);
    ipcRenderer.emit("desktop-command", {sender: "privileged"}, "save-project");
    assert.deepEqual(received, [[null, "save-project"]]);

    bridge.removeListener("desktop-command", listener);
    bridge.removeListener("window-state-changed", listener);
    assert.equal(ipcRenderer.listenerCount("desktop-command"), 0);
    assert.equal(ipcRenderer.listenerCount("window-state-changed"), 0);
});

test("listener return values stay in the renderer instead of crossing the context bridge", () => {
    let bridge;
    const ipcRenderer = new EventEmitter();
    vm.runInNewContext(source, {
        require: () => ({
            contextBridge: {exposeInMainWorld: (_name, api) => (bridge = api)},
            ipcRenderer,
        }),
    });

    bridge.addListener("desktop-command", () => new Proxy({}, {}));

    const [listener] = ipcRenderer.listeners("desktop-command");

    assert.equal(listener({}, "new-project"), undefined);
});
