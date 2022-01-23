import { app } from 'electron'

const path = require('path');

// Quit when all windows are closed.
app.on('window-all-closed', function () {
  // On macOS it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') app.quit()
})

// if (process.platform === 'darwin') {
//   app.dock.setIcon(path.join(__dirname, '/../extraResources/icons/icon.png'));
// }

require('./mainWindow')
