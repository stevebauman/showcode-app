import { app, BrowserWindow } from 'electron';

let mainWindow;

const isProd = process.env.NODE_ENV === 'production';

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            nodeIntegration: true,
        }
    });

    // Load the index.html of the app.
    const startUrl = isProd ? `file://${__dirname}/showcode/dist/index.html`: 'http://localhost:3000';

    mainWindow.loadURL(startUrl);

    mainWindow.on('closed', function () {
        mainWindow = null
    })
}

app.on('ready', createWindow)

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit()
    }
})

app.on('activate', () => {
    if (mainWindow === null) {
        createWindow()
    }
})
