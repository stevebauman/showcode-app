import { app, globalShortcut } from "electron";

// Quit when all windows are closed.
app.on("window-all-closed", function () {
  // On macOS it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.whenReady().then(() => {
  if (!app.isEmojiPanelSupported()) {
    return;
  }

  if (process.platform === "darwin") {
    globalShortcut.register("CommandOrControl+Shift+Space", () =>
      app.showEmojiPanel()
    );
  }

  if (process.platform === "linux") {
    globalShortcut.register("Control+.", () => app.showEmojiPanel());
  }

  if (process.platform === "win32") {
    globalShortcut.register("MetaOrSuper+.", () => app.showEmojiPanel());
  }
});

require("./mainWindow");
