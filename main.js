const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path'); 

function createWindow() {
    const mainWindow = new BrowserWindow({
        width: 1230,
        height: 895,
        center: true,
        frame: false,
        transparent: true,
        backgroundColor: '#00000000',
        resizable: false,
        icon: path.join(__dirname, 'icon.ico'), 
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });
    
    mainWindow.loadFile('index.html');

    // Custom Window Control Handlers
    ipcMain.on('window-minimize', () => mainWindow.minimize());
    ipcMain.on('window-maximize', () => {
        if (mainWindow.isMaximized()) {
            mainWindow.unmaximize();
        } else {
            mainWindow.maximize();
        }
    });
    ipcMain.on('window-get-position-sync', (event) => {
        event.returnValue = mainWindow.getPosition();
    });
    ipcMain.on('window-set-position', (_event, x, y) => {
        if (!mainWindow.isMaximized()) {
            mainWindow.setPosition(Math.round(x), Math.round(y));
        }
    });
    ipcMain.on('window-close', () => mainWindow.close());
}

app.whenReady().then(createWindow);
